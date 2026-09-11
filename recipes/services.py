import base64
import json
import requests
import anthropic
from django.conf import settings
from bs4 import BeautifulSoup


client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

UNIT_OPTIONS = ['tsp', 'tbsp', 'cup', 'fl_oz', 'g', 'oz', 'pinch', 'piece', 'can', 'package', 'whole', '']
RECIPE_TYPE_OPTIONS = ['dinner', 'lunch', 'breakfast', 'dessert', 'snack', 'side', 'other']

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

EXTRACTION_PROMPT = f"""You are extracting a recipe. Return ONLY valid JSON, no other text, no markdown code fences.


Use this exact schema:
{{
  "title": string,
  "recipe_type": one of {RECIPE_TYPE_OPTIONS},
  "steps": string (numbered steps, one per line, when it mentions an ingredient,
    use the exact name and amount from the ingredients list. Show the amount as a fraction instead of a decimal.
    use the abbreviated unit from the ingredients list. If no amount is given, do not make one up.),
  "ingredients": [
    {{
      "name": string,
      "amount": number or null,
      "unit": one of {UNIT_OPTIONS},
      "notes": string (e.g. "chopped", "diced", or empty string)
    }}
  ]
}}

Rules:
- If a field is illegible or missing, use null (or empty string for text fields) rather than guessing.
- For amount, convert fractions to decimals (e.g. "1 1/2" becomes 1.5). If no clear number, use null.
- For unit, pick the closest match from the allowed list. If none fit, attempt to convert to one that will. If you cannot, use "".
- Preserve the original step wording as closely as possible rather than paraphrasing.
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
        raise ValueError(f"Model did not return valid JSON: {e}\nRaw response: {raw_text}")


# ---------- image extraction ----------
def extract_recipe_from_image(image_file):
    """
    image_file: a file-like object (e.g. from request.FILES) or raw bytes
    Returns a dict matching the Recipe/Ingredient schema, ready for review.
    """
    image_bytes = image_file.read() if hasattr(image_file, 'read') else image_file
    image_b64 = base64.standard_b64encode(image_bytes).decode('utf-8')
    media_type = getattr(image_file, 'content_type', 'image/jpeg')

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
            "text": EXTRACTION_PROMPT,
        },
    ]

    return _call_claude_and_parse(content)


# ---------- url fetching ----------
def extract_recipe_from_url(url):
    """
    Tries structured JSON-LD data first (cheaper, cleaner). Falls back to
    scraped visible text if no structured data is found.
    """
    recipe_json_ld = fetch_json_ld_recipe(url)
    image_url = None

    if recipe_json_ld:
        image_url = extract_image_url(recipe_json_ld)
        prompt_context = f"Here is structured recipe data from the page:\n\n{json.dumps(recipe_json_ld)}"
    else:
        page_text = fetch_page_text(url)[:15000]
        prompt_context = f"Here is the webpage content:\n\n{page_text}"

    content = f"{EXTRACTION_PROMPT}\n\n{prompt_context}"
    result = _call_claude_and_parse(content)
    result['image_url'] = image_url  # attach separately, not part of the LLM's job

    return result

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
