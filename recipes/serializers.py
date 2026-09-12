from rest_framework import serializers
from .models import Recipe, Ingredient, Tag, ShoppingList, ShoppingListItem


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'amount', 'unit', 'notes']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = IngredientSerializer(many=True)
    owner = serializers.ReadOnlyField(source='owner.username')

    # Read side: plain list of tag name strings, e.g. ["spicy", "one-pot"]
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    # Write side: accept a plain list of tag name strings from the client.
    # Not required — a recipe can be saved with no tags at all.
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'image', 'steps', 'recipe_type', 'is_meal_preppable',
            'ingredients', 'owner', 'tags', 'tag_names', 'created_at',
        ]

    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients')
        tag_names = validated_data.pop('tag_names', [])

        recipe = Recipe.objects.create(**validated_data)

        for ingredient_data in ingredients_data:
            Ingredient.objects.create(recipe=recipe, **ingredient_data)

        for name in tag_names:
            name = name.strip()
            if not name:
                continue
            tag, _ = Tag.objects.get_or_create(name=name)
            recipe.tags.add(tag)

        return recipe


class ShoppingListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShoppingListItem
        fields = ['id', 'name', 'category', 'amount', 'unit', 'is_checked', 'checked_at', 'created_at']
        read_only_fields = ['category', 'checked_at']


class ShoppingListSerializer(serializers.ModelSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)

    class Meta:
        model = ShoppingList
        fields = ['id', 'name', 'created_at', 'items']