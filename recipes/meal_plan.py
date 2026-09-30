from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Recipe, MealPlanEntry
from .serializers import MealPlanEntrySerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meal_plan_list(request):
    """
    Every one of the user's meal plan entries — unplanned (date is null)
    and dated. The frontend buckets these by date/unplanned itself and
    decides which week to display, so there's no server-side date
    filtering to keep in sync with the client's week navigation.
    """
    entries = MealPlanEntry.objects.filter(owner=request.user).select_related('recipe')
    return Response(MealPlanEntrySerializer(entries, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def meal_plan_add(request):
    """
    Adds one or more of the user's own recipes to the meal plan, unplanned
    (no date) — the "+" picker on the Meal Planning page, and the "Add to
    meal plan" checkbox on the shopping-list modal, both land here.
    Body: {"recipe_ids": [1, 2, 3]}.
    """
    recipe_ids = request.data.get('recipe_ids') or []
    recipes = Recipe.objects.filter(id__in=recipe_ids, owner=request.user)
    created = [MealPlanEntry.objects.create(owner=request.user, recipe=recipe) for recipe in recipes]
    return Response(MealPlanEntrySerializer(created, many=True, context={'request': request}).data, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def meal_plan_update(request, pk):
    """Moves an entry to a different day (or back to unplanned with date: null)."""
    entry = get_object_or_404(MealPlanEntry, pk=pk, owner=request.user)
    if 'date' in request.data:
        raw_date = request.data['date']
        entry.date = parse_date(raw_date) if raw_date else None
        entry.save()
    return Response(MealPlanEntrySerializer(entry, context={'request': request}).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def meal_plan_delete(request, pk):
    entry = get_object_or_404(MealPlanEntry, pk=pk, owner=request.user)
    entry.delete()
    return Response(status=204)
