from django.urls import path
from . import views

urlpatterns = [
    path('extract/', views.extract_recipe, name='extract-recipe'),
    path('extract-url/', views.extract_recipe_from_url_view, name='extract-recipe-url'),
    path('save/', views.save_recipe, name='save-recipe'),
    path('', views.RecipeListView.as_view(), name='recipe-list'),
    path('<int:recipe_id>/save-copy/', views.save_recipe_copy, name='save-recipe-copy'),
    path('<int:pk>/', views.RecipeDetailView.as_view(), name='recipe-detail'),
]