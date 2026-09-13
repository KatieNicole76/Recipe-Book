from django.urls import path
from . import user_views

urlpatterns = [
    path('me/', user_views.current_user, name='current-user'),
    path('', user_views.UserListCreateView.as_view(), name='user-list-create'),
    path('<int:pk>/', user_views.get_user, name='user-detail'),
    path('<int:pk>/update/', user_views.update_user, name='user-update'),
    path('<int:pk>/delete/', user_views.delete_user, name='user-delete'),
]
