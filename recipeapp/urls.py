"""
URL configuration for recipeapp project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from recipes import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/recipes/', include('recipes.urls')),
    path('api/users/', include('recipes.user_urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('<int:pk>/', views.RecipeDetailView.as_view(), name='recipe-detail'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)