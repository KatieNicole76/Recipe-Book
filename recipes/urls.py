from django.urls import path
from . import views

urlpatterns = [
    path('extract/', views.extract_recipe, name='extract-recipe'),
    path('extract-url/', views.extract_recipe_from_url_view, name='extract-recipe-url'),
    path('save/', views.save_recipe, name='save-recipe'),
    path('tags/', views.TagListView.as_view(), name='tag-list'),
    path('tags/<int:pk>/', views.delete_tag, name='delete-tag'),
    path('', views.RecipeListView.as_view(), name='recipe-list'),
    path('<int:recipe_id>/save-copy/', views.save_recipe_copy, name='save-recipe-copy'),
    path('shopping-lists/', views.ShoppingListListCreateView.as_view(), name='shopping-list-list-create'),
    path('shopping-lists/<int:pk>/', views.shopping_list_delete, name='shopping-list-delete'),
    path('shopping-lists/<int:pk>/clear-all/', views.shopping_list_clear_all, name='shopping-list-clear-all'),
    path('shopping-lists/<int:pk>/clear-checked/', views.shopping_list_clear_checked, name='shopping-list-clear-checked'),
    path('shopping-lists/<int:pk>/items/', views.shopping_list_add_item, name='shopping-list-add-item'),
    path('shopping-lists/<int:pk>/add-ingredients/', views.shopping_list_add_ingredients, name='shopping-list-add-ingredients'),
    path('shopping-list-items/<int:item_pk>/', views.shopping_list_item_toggle, name='shopping-list-item-toggle'),
    path('<int:pk>/', views.RecipeDetailView.as_view(), name='recipe-detail'),
    path('<int:pk>/update/', views.update_recipe, name='update-recipe'),
    path('<int:pk>/delete/', views.delete_recipe, name='delete-recipe'),
]