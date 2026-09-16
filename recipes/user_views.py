from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'is_superuser': user.is_superuser,
        'is_demo': hasattr(user, 'demo_account'),
    }


def _forbidden():
    return Response({'error': 'Superuser access required'}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response(_serialize_user(request.user))


class UserListCreateView(ListAPIView):
    """
    GET: every user in the system (superuser only).
    POST: create a new user, {"username", "password", "is_superuser"}.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.objects.all().order_by('username')

    def list(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return _forbidden()
        return Response([_serialize_user(u) for u in self.get_queryset()])

    def post(self, request):
        if not request.user.is_superuser:
            return _forbidden()

        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        is_superuser = bool(request.data.get('is_superuser'))

        if not username:
            return Response({'error': 'Username is required'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'That username is already taken'}, status=400)

        try:
            validate_password(password)
        except ValidationError as e:
            return Response({'password': e.messages}, status=400)

        user = User.objects.create_user(username=username, password=password)
        if is_superuser:
            user.is_superuser = True
            user.is_staff = True
            user.save()

        return Response(_serialize_user(user), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request, pk):
    if not request.user.is_superuser:
        return _forbidden()

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(status=404)

    return Response(_serialize_user(user))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user(request, pk):
    if not request.user.is_superuser:
        return _forbidden()

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(status=404)

    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''

    if not username:
        return Response({'error': 'Username is required'}, status=400)
    if User.objects.filter(username=username).exclude(pk=pk).exists():
        return Response({'error': 'That username is already taken'}, status=400)

    if password:
        try:
            validate_password(password, user=user)
        except ValidationError as e:
            return Response({'password': e.messages}, status=400)
        user.set_password(password)

    user.username = username
    is_superuser = bool(request.data.get('is_superuser'))
    user.is_superuser = is_superuser
    user.is_staff = is_superuser
    user.save()

    return Response(_serialize_user(user))


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, pk):
    if not request.user.is_superuser:
        return _forbidden()

    if int(pk) == request.user.id:
        return Response({'error': "You can't delete your own account"}, status=400)

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(status=404)

    user.delete()
    return Response(status=204)
