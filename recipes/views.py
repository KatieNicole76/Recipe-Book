import json
import logging
import requests
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Recipe, Ingredient, Tag, ShoppingList, ShoppingListItem, get_or_create_tag
from .serializers import RecipeSerializer, TagSerializer, ShoppingListSerializer, ShoppingListItemSerializer
from .services import (
    extract_recipe_from_image,
    extract_recipe_from_url,
    extract_recipe_from_tiktok,
    is_tiktok_url,
    fetch_tiktok_info,
    apply_tiktok_media,
    copy_recipe_for_user,
    get_shopping_item_category,
    HEADERS,
)
from .demo import is_demo_user, same_demo_partition, check_and_increment_demo_limit, DEMO_EXTRACTION_LIMIT, DEMO_CATEGORIZATION_LIMIT
from .unit_conversion import convert_amount

logger = logging.getLogger(__name__)


def _user_tag_names(user):
    """Distinct tag names already used across this user's own recipes."""
    return list(
        Tag.objects.filter(recipes__owner=user).distinct().values_list('name', flat=True)
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_recipe(request):
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    if not check_and_increment_demo_limit(request.user, 'extraction_count', DEMO_EXTRACTION_LIMIT):
        return Response({'error': "You've reached the demo's extraction limit. Thanks for trying it out!"}, status=429)

    try:
        recipe_data = extract_recipe_from_image(image_file, existing_tags=_user_tag_names(request.user))
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(recipe_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_recipe_from_url_view(request):
    url = request.data.get('url')
    if not url:
        return Response({'error': 'No URL provided'}, status=400)

    if not check_and_increment_demo_limit(request.user, 'extraction_count', DEMO_EXTRACTION_LIMIT):
        return Response({'error': "You've reached the demo's extraction limit. Thanks for trying it out!"}, status=429)

    try:
        if is_tiktok_url(url):
            recipe_data = extract_recipe_from_tiktok(url, existing_tags=_user_tag_names(request.user))
        else:
            recipe_data = extract_recipe_from_url(url, existing_tags=_user_tag_names(request.user))
    except requests.RequestException:
        return Response({'error': 'Could not fetch that URL'}, status=502)
    except ValueError as e:
        logger.warning('Recipe extraction failed to parse a response: %s', e)
        return Response({'error': 'Could not extract a recipe from that page'}, status=502)
    except Exception as e:
        logger.warning('TikTok extraction failed: %s', e)
        return Response({'error': 'Could not fetch that TikTok video'}, status=502)

    return Response(recipe_data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_recipe(request):
    uploaded_image = request.FILES.get('image_file')

    # Set when this save is "edit first" on a recipe saved from Browse — the
    # new recipe is a fork of saved_from, not a from-scratch creation, so a
    # photo/video the user didn't touch should still carry over from it.
    saved_from = Recipe.objects.filter(pk=request.data.get('saved_from')).first()
    if saved_from and not same_demo_partition(request.user, saved_from.owner):
        saved_from = None  # cross-partition fork attempt — silently ignore, not a real fork

    if uploaded_image:
        # multipart form data — rebuild a plain dict, parsing JSON-in-a-string
        # fields (ingredients, tag_names) back into real lists
        data = {
            'title': request.data.get('title', ''),
            'recipe_type': request.data.get('recipe_type', 'other'),
            'is_meal_preppable': request.data.get('is_meal_preppable') in ('true', 'True', True),
            'steps': request.data.get('steps', ''),
            'ingredients': json.loads(request.data.get('ingredients', '[]')),
            'tag_names': json.loads(request.data.get('tag_names', '[]')),
            'source_url': request.data.get('source_url', ''),
        }
        image_url = None
    else:
        data = request.data.copy()
        image_url = data.pop('image_url', None)
        if isinstance(image_url, list):
            image_url = image_url[0] if image_url else None

    serializer = RecipeSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    recipe = serializer.save(owner=request.user)

    if saved_from:
        recipe.saved_from = saved_from

    # A linked TikTok's thumbnail/video wins as the recipe's photo — even
    # over an uploaded/extracted photo — since linking one is the user
    # saying "use this video's thumbnail instead". If the fetch fails
    # (network issue, dead link), fall back to whatever photo was already
    # provided rather than leaving the recipe with no photo at all.
    if recipe.source_url and is_tiktok_url(recipe.source_url):
        apply_tiktok_media(recipe, recipe.source_url)

    if not recipe.image and uploaded_image:
        recipe.image = uploaded_image
    elif not recipe.image and image_url:
        try:
            img_response = requests.get(image_url, headers=HEADERS, timeout=10)
            img_response.raise_for_status()
            filename = image_url.split('/')[-1].split('?')[0] or 'recipe.jpg'
            if '.' not in filename:
                filename += '.jpg'
            recipe.image.save(filename, ContentFile(img_response.content), save=False)
        except requests.RequestException as e:
            logger.warning('Could not download recipe image from %s: %s', image_url, e)
    elif not recipe.image and saved_from and saved_from.image:
        # "Edit first" from Browse, photo left untouched — keep the original's.
        recipe.image = saved_from.image

    if not recipe.video and saved_from and saved_from.video:
        recipe.video = saved_from.video

    recipe.save()
    return Response(RecipeSerializer(recipe).data, status=201)


class RecipeListView(ListAPIView):
    """The logged-in user's own cookbook — recipes they wrote or saved."""
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(owner=self.request.user).order_by('-created_at')


class BrowseRecipeListView(ListAPIView):
    """
    The combined family cookbook — every original recipe anyone on the same
    side of the demo/real wall has added. Excludes saved copies (saved_from
    is set) so a recipe someone else already saved into their own cookbook
    doesn't show up a second time. Demo accounts only ever see other demo
    accounts' recipes here, never real family recipes, and vice versa.
    """
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(
            saved_from__isnull=True,
            owner__demo_account__isnull=not is_demo_user(self.request.user),
        ).order_by('-created_at')


class TagListView(ListAPIView):
    """
    Tags already used across the logged-in user's own recipes — powers the
    "pick an existing tag" suggestions on the recipe review form.
    """
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(recipes__owner=self.request.user).distinct().order_by('name')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_tag(request, pk):
    tag = get_object_or_404(Tag, pk=pk)
    tag.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_recipe_copy(request, recipe_id):
    """
    Saves another user's recipe into the current user's own cookbook
    verbatim (the "Save to your cookbook" option from Browse). saved_from
    marks it as a copy so it's excluded from the combined Browse list —
    otherwise it'd show up twice, once for each owner.
    """
    original = get_object_or_404(Recipe, id=recipe_id)
    if not same_demo_partition(request.user, original.owner):
        # 404, not 403 — a demo account (or real user) probing recipe IDs
        # across the wall shouldn't even learn that the ID exists.
        return Response(status=404)

    copy = copy_recipe_for_user(original, request.user)
    return Response(RecipeSerializer(copy).data, status=201)


class RecipeDetailView(RetrieveAPIView):
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Recipe IDs are sequential and guessable — without this, a demo
        # account could fetch a real family recipe's full detail directly
        # by ID even though it never appears in their Browse list.
        return Recipe.objects.filter(owner__demo_account__isnull=not is_demo_user(self.request.user))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_recipe(request, pk):
    recipe = get_object_or_404(Recipe, pk=pk, owner=request.user)
    uploaded_image = request.FILES.get('image_file')

    if uploaded_image:
        # multipart form data — rebuild a plain dict, parsing JSON-in-a-string
        # fields (ingredients, tag_names) back into real lists
        data = {
            'title': request.data.get('title', ''),
            'recipe_type': request.data.get('recipe_type', 'other'),
            'is_meal_preppable': request.data.get('is_meal_preppable') in ('true', 'True', True),
            'steps': request.data.get('steps', ''),
            'ingredients': json.loads(request.data.get('ingredients', '[]')),
            'tag_names': json.loads(request.data.get('tag_names', '[]')),
        }
    else:
        data = request.data.copy()
        data.pop('image', None)      # never accept the existing image URL back as a write
        data.pop('image_url', None)  # editing has no "fetch from URL" step — only a fresh upload changes the photo

    serializer = RecipeSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    validated = serializer.validated_data

    recipe.title = validated['title']
    recipe.recipe_type = validated['recipe_type']
    recipe.is_meal_preppable = validated['is_meal_preppable']
    recipe.steps = validated['steps']
    recipe.save()

    recipe.ingredients.all().delete()
    for ingredient_data in validated['ingredients']:
        Ingredient.objects.create(recipe=recipe, **ingredient_data)

    recipe.tags.clear()
    for name in validated.get('tag_names', []):
        name = name.strip()
        if name:
            recipe.tags.add(get_or_create_tag(name))

    if uploaded_image:
        recipe.image = uploaded_image
        recipe.save()

    return Response(RecipeSerializer(recipe).data, status=200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_recipe(request, pk):
    recipe = get_object_or_404(Recipe, pk=pk, owner=request.user)
    recipe.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_source(request, pk):
    """
    Attaches a reference link to an existing recipe — for a recipe the user
    already typed up (or extracted from a photo) and now wants to tie back
    to where it came from. Unlike creation, this never re-extracts the
    recipe's title/ingredients/steps — it only saves the link, and for a
    TikTok link, also fetches the thumbnail and video.
    """
    recipe = get_object_or_404(Recipe, pk=pk, owner=request.user)
    url = (request.data.get('url') or '').strip()
    if not url:
        return Response({'error': 'URL is required'}, status=400)

    recipe.source_url = url

    if is_tiktok_url(url):
        apply_tiktok_media(recipe, url)

    recipe.save()
    return Response(RecipeSerializer(recipe).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def tiktok_preview(request):
    """
    Metadata-only lookup for a TikTok link before a recipe exists yet (e.g.
    linking a source while reviewing a fresh photo extraction, before the
    first save). Returns just the thumbnail and canonical URL so the review
    form can preview it — the actual video download happens at save time.
    """
    url = (request.data.get('url') or '').strip()
    if not url or not is_tiktok_url(url):
        return Response({'error': 'Not a TikTok URL'}, status=400)

    try:
        info = fetch_tiktok_info(url)
    except Exception:
        return Response({'error': 'Could not fetch that TikTok video'}, status=502)

    return Response({
        'source_url': info.get('webpage_url') or url,
        'thumbnail_url': info.get('thumbnail'),
    })


class ShoppingListListCreateView(ListAPIView):
    """
    GET: all of the logged-in user's shopping lists, with items nested.
    POST: create a new (empty) shopping list, {"name": "..."}.
    """
    serializer_class = ShoppingListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ShoppingList.objects.filter(owner=self.request.user).order_by('created_at')

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=400)

        shopping_list = ShoppingList.objects.create(owner=request.user, name=name)
        return Response(ShoppingListSerializer(shopping_list).data, status=201)


def _get_owned_list(request, pk):
    return get_object_or_404(ShoppingList, pk=pk, owner=request.user)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def shopping_list_delete(request, pk):
    shopping_list = _get_owned_list(request, pk)
    shopping_list.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shopping_list_clear_all(request, pk):
    shopping_list = _get_owned_list(request, pk)
    shopping_list.items.all().delete()
    return Response(ShoppingListSerializer(shopping_list).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shopping_list_clear_checked(request, pk):
    shopping_list = _get_owned_list(request, pk)
    shopping_list.items.filter(is_checked=True).delete()
    return Response(ShoppingListSerializer(shopping_list).data, status=200)


def _merge_or_create_item(shopping_list, name, amount, unit):
    """
    Finds an existing item on this list with a matching name (case
    insensitive) and adds `amount` into it if the units are compatible
    (identical, or convertible within the same volume/weight group).
    Otherwise creates a new item — including when no match exists, or the
    match can't be merged (e.g. incompatible units, or either side has no
    amount at all).
    """
    unit = unit or ''
    existing = shopping_list.items.filter(name__iexact=name).first()

    if existing and existing.amount is not None and amount is not None:
        converted = convert_amount(Decimal(str(amount)), unit, existing.unit)
        if converted is not None:
            existing.amount += converted
            existing.save()
            return existing

    # Categorization is a background nicety, not the action the user asked
    # for — once a demo account hits its cap, degrade to 'other' silently
    # rather than blocking the add.
    if check_and_increment_demo_limit(shopping_list.owner, 'categorization_count', DEMO_CATEGORIZATION_LIMIT):
        category = get_shopping_item_category(name)
    else:
        category = 'other'
    return ShoppingListItem.objects.create(
        shopping_list=shopping_list, name=name, category=category, amount=amount, unit=unit,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shopping_list_add_item(request, pk):
    shopping_list = _get_owned_list(request, pk)
    name = (request.data.get('name') or '').strip()
    if not name:
        return Response({'error': 'name is required'}, status=400)

    item = _merge_or_create_item(shopping_list, name, None, '')
    return Response(ShoppingListItemSerializer(item).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shopping_list_add_ingredients(request, pk):
    """
    Bulk-adds a recipe's ingredients to this list, merging quantities into
    any matching existing items. Body: {"ingredients": [{"name", "amount",
    "unit"}, ...]}.
    """
    shopping_list = _get_owned_list(request, pk)
    for ingredient in request.data.get('ingredients', []):
        name = (ingredient.get('name') or '').strip()
        if not name:
            continue
        _merge_or_create_item(shopping_list, name, ingredient.get('amount'), ingredient.get('unit') or '')

    return Response(ShoppingListSerializer(shopping_list).data, status=200)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def shopping_list_item_toggle(request, item_pk):
    item = get_object_or_404(ShoppingListItem, pk=item_pk, shopping_list__owner=request.user)
    is_checked = request.data.get('is_checked')
    if is_checked is None:
        return Response({'error': 'is_checked is required'}, status=400)

    item.is_checked = bool(is_checked)
    item.checked_at = timezone.now() if item.is_checked else None
    item.save()
    return Response(ShoppingListItemSerializer(item).data, status=200)