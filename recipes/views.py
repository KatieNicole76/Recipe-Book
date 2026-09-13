import json
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

from .models import Recipe, Ingredient, Tag, ShoppingList, ShoppingListItem
from .serializers import RecipeSerializer, TagSerializer, ShoppingListSerializer, ShoppingListItemSerializer
from .services import extract_recipe_from_image, extract_recipe_from_url, get_shopping_item_category
from .unit_conversion import convert_amount


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

    try:
        recipe_data = extract_recipe_from_url(url, existing_tags=_user_tag_names(request.user))
    except requests.RequestException:
        return Response({'error': 'Could not fetch that URL'}, status=502)
    except ValueError as e:
        return Response({'error': str(e)}, status=502)

    return Response(recipe_data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_recipe(request):
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

    if uploaded_image:
        recipe.image = uploaded_image
        recipe.save()
    elif image_url:
        try:
            img_response = requests.get(image_url, timeout=10)
            img_response.raise_for_status()
            filename = image_url.split('/')[-1].split('?')[0] or 'recipe.jpg'
            if '.' not in filename:
                filename += '.jpg'
            recipe.image.save(filename, ContentFile(img_response.content), save=True)
        except requests.RequestException:
            pass

    return Response(RecipeSerializer(recipe).data, status=201)


class RecipeListView(ListAPIView):
    queryset = Recipe.objects.all().order_by('-created_at')
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]


class TagListView(ListAPIView):
    """
    Tags already used across the logged-in user's own recipes — powers the
    "pick an existing tag" suggestions on the recipe review form.
    """
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(recipes__owner=self.request.user).distinct().order_by('name')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_recipe_copy(request, recipe_id):
    original = get_object_or_404(Recipe, id=recipe_id)

    copy = Recipe.objects.create(
        owner=request.user,
        title=original.title,
        image=original.image,
        steps=original.steps,
        recipe_type=original.recipe_type,
        is_meal_preppable=original.is_meal_preppable,
        saved_from=original,
    )

    for ingredient in original.ingredients.all():
        Ingredient.objects.create(
            recipe=copy,
            name=ingredient.name,
            amount=ingredient.amount,
            unit=ingredient.unit,
            notes=ingredient.notes,
        )

    copy.tags.set(original.tags.all())

    return Response(RecipeSerializer(copy).data, status=201)


class RecipeDetailView(RetrieveAPIView):
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]


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
            tag, _ = Tag.objects.get_or_create(name=name)
            recipe.tags.add(tag)

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

    category = get_shopping_item_category(name)
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