from django.urls import path
from . import views

urlpatterns = [
    path('extract/', views.extract_recipe, name='extract-recipe'),
    path('extract-url/', views.extract_recipe_from_url_view, name='extract-recipe-url'),
    path('save/', views.save_recipe, name='save-recipe'),
] 