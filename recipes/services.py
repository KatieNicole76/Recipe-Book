import base64
import json
import os
import tempfile
import requests
import anthropic
import yt_dlp
from urllib.parse import urlparse
from django.conf import settings
from bs4 import BeautifulSoup

from .models import IngredientCategory


client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

UNIT_OPTIONS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', '']
RECIPE_TYPE_OPTIONS = ['dinner', 'lunch', 'breakfast', 'dessert', 'snack', 'side', 'other']
SHOPPING_CATEGORY_OPTIONS = [
    'frozen', 'produce', 'dairy', 'meat_seafood', 'bakery',
    'pantry', 'beverages', 'cleaning', 'housewares', 'health_personal', 'other',
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}


def build_extraction_prompt(existing_tags=None):
    """
    Builds the extraction prompt, optionally including the user's existing
    tag vocabulary so Claude prefers reusing tags ("one-pot") instead of
    inventing near-duplicates ("one pot meal") on every new recipe.
    """
    existing_tags = existing_tags or []

    if existing_tags:
        tag_guidance = (
            f"This user already has these tags in their collection: {existing_tags}. "
            "Prefer reusing an existing tag over inventing a new, similar one "
            "(e.g. reuse \"one-pot\" rather than creating \"one pot meal\"). "
            "You may still add a genuinely new tag if nothing existing fits."
        )
    else:
        tag_guidance = (
            "This user has no existing tags yet, so choose sensible, common. " \
            "Do not make tags for specific ingredients EXCLUDING meats. (For example, " \
                "do not make a tag for carrots, but make one for chicken.) " \
            "Do not make tags for meal types (e.g. \"dinner\", \"lunch\", \"breakfast\"). " \
            "Do not make tags for dietary restrictions (e.g. \"gluten-free\", \"vegan\"). " \
        )

    return f"""You are extracting a recipe. Return ONLY valid JSON, no other text, no markdown code fences.

Use this exact schema:
{{
  "title": string,
  "recipe_type": one of {RECIPE_TYPE_OPTIONS},
  "steps": string (one per line, do not number the steps, when it mentions an ingredient,
    use the exact name and amount from the ingredients list. Show the amount as a fraction instead of a decimal.
    use the abbreviated unit from the ingredients list. If no amount is given, do not make one up.),
  "ingredients": [
    {{
      "name": string,
      "amount": number or null,
      "unit": one of {UNIT_OPTIONS},
      "notes": string (e.g. "chopped", "diced", or empty string)
    }}
  ],
  "tags": array of up to 5 short capitalized strings describing the recipe
    (e.g. cuisine, main ingredient)
}}

Rules:
- If a field is illegible or missing, use null (or empty string for text fields) rather than guessing.
- For amount, convert fractions to decimals (e.g. "1 1/2" becomes 1.5). If no clear number, use null.
- For unit, pick the closest match from the allowed list. If none fit, attempt to convert to one that will. If you cannot, use "".
- Preserve the original step wording as closely as possible rather than paraphrasing.
- {tag_guidance}
- Keep tags short (1-3 words each), capitalized, and genuinely useful for filtering, don't pad the list just to reach 5.
"""


# ---------- helpers ----------

def _call_claude_and_parse(content):
    """
    content: either a string (text-only prompt) or a list of content blocks
             (e.g. image + text) matching the Anthropic messages API format.
    Returns the parsed recipe dict.
    """
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": content}],
    )

    raw_text = response.content[0].text.strip()

    if raw_text.startswith('```'):
        raw_text = raw_text.split('```')[1]
        if raw_text.startswith('json'):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        # The model occasionally wraps the JSON in an explanation despite
        # being told not to (e.g. "There's no recipe here, but here's the
        # JSON anyway: {...}") — when it does, it reliably restates a clean
        # copy at the very end, so retry from the last '{' onward rather
        # than failing outright.
        last_brace = raw_text.rfind('{')
        if last_brace != -1:
            try:
                return json.loads(raw_text[last_brace:].rstrip('`').strip())
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Model did not return valid JSON: {e}\nRaw response: {raw_text}")


# ---------- shopping list categorization ----------
def categorize_shopping_item(name):
    """
    Guesses a grocery-store category for a shopping list item name.
    Falls back to 'other' if the model errors or returns something
    outside SHOPPING_CATEGORY_OPTIONS.
    """
    prompt = f"""Categorize this grocery shopping list item into exactly one of these
        categories: {SHOPPING_CATEGORY_OPTIONS}.

    Item: "{name}"

    Return ONLY valid JSON, no other text, no markdown code fences, matching this schema:
    {{"category": one of {SHOPPING_CATEGORY_OPTIONS}}}"""

    try:
        result = _call_claude_and_parse(prompt)
        category = result.get('category', 'other')
    except (ValueError, anthropic.APIError):
        return 'other'

    return category if category in SHOPPING_CATEGORY_OPTIONS else 'other'


def get_shopping_item_category(name):
    """
    Looks up a cached category for this item name (case/whitespace
    insensitive) before falling back to the AI call, so any given
    ingredient only ever needs categorizing once.
    """
    normalized = name.strip().lower()
    cached = IngredientCategory.objects.filter(name=normalized).first()
    if cached:
        return cached.category

    category = categorize_shopping_item(name)
    IngredientCategory.objects.get_or_create(name=normalized, defaults={'category': category})
    return category


def _capitalize_tags(result):
    """
    Ensures extracted tags are capitalized regardless of what the model
    actually returned, rather than relying solely on the prompt.
    """
    result['tags'] = [t.strip().capitalize() for t in result.get('tags') or [] if t.strip()]
    return result


# ---------- image extraction ----------
def extract_recipe_from_image(image_file, existing_tags=None):
    """
    image_file: a file-like object (e.g. from request.FILES) or raw bytes
    existing_tags: list of tag name strings already used by this user
    Returns a dict matching the Recipe/Ingredient schema, ready for review.
    """
    image_bytes = image_file.read() if hasattr(image_file, 'read') else image_file
    image_b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = getattr(image_file, 'content_type', 'image/jpeg')

    prompt = build_extraction_prompt(existing_tags)

    content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_b64,
            },
        },
        {
            "type": "text",
            "text": prompt,
        },
    ]

    return _capitalize_tags(_call_claude_and_parse(content))


# ---------- url fetching ----------
def extract_recipe_from_url(url, existing_tags=None):
    """
    Tries structured JSON-LD data first (cheaper, cleaner). Falls back to
    scraped visible text if no structured data is found.
    existing_tags: list of tag name strings already used by this user
    """
    recipe_json_ld = fetch_json_ld_recipe(url)
    image_url = None

    if recipe_json_ld:
        image_url = extract_image_url(recipe_json_ld)
        prompt_context = f"Here is structured recipe data from the page:\n\n{json.dumps(recipe_json_ld)}"
    else:
        page_text = fetch_page_text(url)[:15000]
        prompt_context = f"Here is the webpage content:\n\n{page_text}"

    prompt = build_extraction_prompt(existing_tags)
    content = f"{prompt}\n\n{prompt_context}"
    result = _call_claude_and_parse(content)
    result['image_url'] = image_url  # attach separately, not part of the LLM's job

    return _capitalize_tags(result)


# ---------- tiktok ----------
def is_tiktok_url(url):
    return 'tiktok.com' in urlparse(url).netloc.lower()


def fetch_tiktok_info(url):
    """
    Metadata only (caption, thumbnail URL, canonical webpage URL) — fast,
    no video download. Used at extraction/preview time.
    """
    with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True, 'noplaylist': True}) as ydl:
        return ydl.extract_info(url, download=False)


def download_tiktok_video(url):
    """
    Full video download via yt-dlp, returns the raw bytes. Only called at
    actual save time (not preview) — re-derives everything from the stable
    page URL rather than trying to carry a short-lived CDN URL across
    requests.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        outtmpl = os.path.join(tmp_dir, 'video.%(ext)s')
        ydl_opts = {'quiet': True, 'outtmpl': outtmpl, 'noplaylist': True, 'format': 'mp4/best'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)
            with open(video_path, 'rb') as f:
                return f.read()


def extract_recipe_from_tiktok(url, existing_tags=None):
    """
    Feeds the video's caption into the same extraction pipeline used for
    photos/URLs. If the caption doesn't actually contain a recipe, this
    just comes back mostly empty — the user types it up manually and the
    video/thumbnail/source still get attached normally.
    """
    info = fetch_tiktok_info(url)
    caption = info.get('description') or ''

    prompt = build_extraction_prompt(existing_tags)
    content = f"{prompt}\n\nHere is a TikTok video's caption:\n\n{caption}"
    try:
        result = _call_claude_and_parse(content)
    except ValueError:
        # A blank/near-empty/non-recipe caption occasionally makes the model
        # break format entirely (explaining itself instead of returning
        # JSON) rather than cleanly returning the empty-but-valid schema it
        # usually does — either way this just means "no recipe here", not a
        # real failure, so fall back to the same empty shape.
        result = {'title': None, 'recipe_type': 'other', 'steps': '', 'ingredients': [], 'tags': []}

    result['image_url'] = info.get('thumbnail')  # reuses the existing image-from-URL download path
    result['source_url'] = info.get('webpage_url') or url

    return _capitalize_tags(result)


def fetch_json_ld_recipe(url):
    """
    Fetches the page and looks ONLY for schema.org Recipe data embedded in
    JSON-LD script tags. Returns the raw recipe dict if found, else None.
    Does not attempt any text scraping.
    """
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')

    scripts = soup.find_all('script', type='application/ld+json')

    for script in scripts:
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, TypeError):
            continue

        candidates = data if isinstance(data, list) else [data]
        if isinstance(data, dict) and '@graph' in data:
            candidates = data['@graph']

        for item in candidates:
            if not isinstance(item, dict):
                continue
            item_type = item.get('@type', '')
            types = item_type if isinstance(item_type, list) else [item_type]
            if 'Recipe' in types:
                return item

    return None


def fetch_page_text(url):
    """
    Fetches the page and returns cleaned, visible text only.
    Does not look for JSON-LD data.
    """
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')

    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
        tag.decompose()

    noise_keywords = ['comment', 'sidebar', 'related', 'advertisement', 'social-share', 'newsletter']
    for tag in soup.find_all(class_=lambda c: c and any(kw in c.lower() for kw in noise_keywords)):
        tag.decompose()

    return soup.get_text(separator='\n', strip=True)


def extract_image_url(recipe_json_ld):
    """
    Pulls the image URL out of JSON-LD recipe data.
    The 'image' field varies in shape across sites: can be a plain string,
    a list of strings/objects, or a single object with a 'url' key.
    """
    image_field = recipe_json_ld.get('image')
    if not image_field:
        return None

    if isinstance(image_field, str):
        return image_field

    if isinstance(image_field, list) and image_field:
        first = image_field[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return first.get('url')

    if isinstance(image_field, dict):
        return image_field.get('url')

    return None