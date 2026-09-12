from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Recipe(models.Model):
    RECIPE_TYPE_CHOICES = [
        ('dinner', 'Dinner'),
        ('lunch', 'Lunch'),
        ('breakfast', 'Breakfast'),
        ('dessert', 'Dessert'),
        ('snack', 'Snack'),
        ('side', 'Side Dish'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='recipe_photos/', null=True, blank=True)
    steps = models.TextField(help_text="Numbered steps")
    recipe_type = models.CharField(max_length=20, choices=RECIPE_TYPE_CHOICES, default='dinner')
    is_meal_preppable = models.BooleanField(default=False)
    tags = models.ManyToManyField(Tag, blank=True, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    saved_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_copies')

    def __str__(self):
        return self.title


class Ingredient(models.Model):
    UNIT_CHOICES = [
        ('tsp', 'Teaspoon'),
        ('tbsp', 'Tablespoon'),
        ('cup', 'Cup'),
        ('fl_oz', 'Fluid Ounce'),
        ('g', 'Gram'),
        ('oz', 'Ounce'),
        ('pinch', 'Pinch'),
        ('piece', 'Piece'),
        ('can', 'Can'),
        ('package', 'Package'),
        ('whole', 'Whole'),
        ('', 'N/A'),
    ]
      
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, blank=True)
    notes = models.CharField(max_length=200, blank=True)  #like "chopped", "diced"

    def __str__(self):
        return f"{self.amount} {self.unit} {self.name}".strip()


class ShoppingList(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shopping_lists')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ShoppingListItem(models.Model):
    CATEGORY_CHOICES = [
        ('frozen', 'Frozen'),
        ('produce', 'Produce'),
        ('dairy', 'Dairy'),
        ('meat_seafood', 'Meat/Seafood'),
        ('bakery', 'Bakery'),
        ('pantry', 'Pantry'),
        ('beverages', 'Beverages'),
        ('cleaning', 'Cleaning'),
        ('housewares', 'Housewares'),
        ('other', 'Other'),
    ]

    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    amount = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, choices=Ingredient.UNIT_CHOICES, blank=True)
    is_checked = models.BooleanField(default=False)
    checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class IngredientCategory(models.Model):
    """
    Cache of item name -> grocery category, keyed by a lowercased/trimmed
    name. Lets us skip the AI categorization call for any item we've
    already categorized once (for anyone, not just the user who added it
    first — categories are objective, not personal).
    """
    name = models.CharField(max_length=200, unique=True)
    category = models.CharField(max_length=20, choices=ShoppingListItem.CATEGORY_CHOICES)

    def __str__(self):
        return f"{self.name} -> {self.category}"
