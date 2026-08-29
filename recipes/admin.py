from django.contrib import admin
from .models import Recipe, Ingredient, Tag


class IngredientInline(admin.TabularInline):
    model = Ingredient
    extra = 1  # how many blank ingredient rows show by default


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipe_type', 'is_meal_preppable', 'created_at')
    list_filter = ('recipe_type', 'is_meal_preppable', 'tags')
    search_fields = ('title',)
    inlines = [IngredientInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    search_fields = ('name',)