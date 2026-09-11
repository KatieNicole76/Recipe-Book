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