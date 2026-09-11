import json
import requests

from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Recipe, Ingredient
from .serializers import RecipeSerializer
from .services import extract_recipe_from_image, extract_recipe_from_url

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_recipe(request):
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        recipe_data = extract_recipe_from_image(image_file)
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
        recipe_data = extract_recipe_from_url(url)
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
        data = {
            'title': request.data.get('title', ''),
            'recipe_type': request.data.get('recipe_type', 'other'),
            'is_meal_preppable': request.data.get('is_meal_preppable') in ('true', 'True', True),
            'steps': request.data.get('steps', ''),
            'ingredients': json.loads(request.data.get('ingredients', '[]')),
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

    return Response(RecipeSerializer(copy).data, status=201)

class RecipeDetailView(RetrieveAPIView):
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]