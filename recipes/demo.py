import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DemoAccount, Recipe, ShoppingList, ShoppingListItem
from .services import copy_recipe_for_user

DEMO_ACCOUNT_MAX_AGE = timedelta(hours=24)
DEMO_EXTRACTION_LIMIT = 8
DEMO_CATEGORIZATION_LIMIT = 30
TEMPLATE_RECIPES_TO_COPY = 2

# A small starter shopping list so a fresh demo account isn't empty
# everywhere at once — no AI call needed, categories are just hardcoded.
STARTER_SHOPPING_ITEMS = [
    ('Milk', 'dairy'),
    ('Eggs', 'dairy'),
    ('Bread', 'bakery'),
]


def is_demo_user(user):
    return hasattr(user, 'demo_account')


def same_demo_partition(user_a, user_b):
    """
    True if both users are on the same side of the demo/real wall — either
    both demo accounts, or both real accounts. Used to stop a demo account
    from viewing or copying a real family recipe (or vice versa) by
    guessing/enumerating recipe IDs directly, since the ID-based endpoints
    (detail, save-copy) aren't filtered by the Browse queryset's demo scope.
    """
    return is_demo_user(user_a) == is_demo_user(user_b)


def check_and_increment_demo_limit(user, field, limit):
    """
    For a demo account, atomically checks `field` (an extraction/
    categorization counter) against `limit` and increments it if still
    under. Returns True if the caller may proceed, False if the demo
    account has hit its cap. Always True for real (non-demo) users.
    """
    if not is_demo_user(user):
        return True

    demo_account = user.demo_account
    if getattr(demo_account, field) >= limit:
        return False

    setattr(demo_account, field, getattr(demo_account, field) + 1)
    demo_account.save(update_fields=[field])
    return True


def cleanup_stale_demo_accounts():
    """
    Deletes ephemeral (non-template) demo accounts older than
    DEMO_ACCOUNT_MAX_AGE — cascades to their recipes/shopping lists via FK
    CASCADE. Run opportunistically on every demo login rather than needing
    a separate cron job.
    """
    cutoff = timezone.now() - DEMO_ACCOUNT_MAX_AGE
    stale_user_ids = DemoAccount.objects.filter(
        is_template=False, created_at__lt=cutoff
    ).values_list('user_id', flat=True)
    User.objects.filter(id__in=list(stale_user_ids)).delete()


def provision_demo_account():
    """
    Creates a fresh, isolated guest account for a new demo visitor, seeded
    with a couple of copied template recipes and a starter shopping list so
    the home page isn't empty on first look.
    """
    cleanup_stale_demo_accounts()

    username = f'demo_{secrets.token_hex(4)}'
    user = User.objects.create_user(username=username)
    user.set_unusable_password()
    user.save()
    DemoAccount.objects.create(user=user)

    template_recipes = Recipe.objects.filter(
        owner__demo_account__is_template=True, saved_from__isnull=True
    ).order_by('?')[:TEMPLATE_RECIPES_TO_COPY]
    for original in template_recipes:
        copy_recipe_for_user(original, user)

    shopping_list = ShoppingList.objects.create(owner=user, name='Groceries')
    for name, category in STARTER_SHOPPING_ITEMS:
        ShoppingListItem.objects.create(shopping_list=shopping_list, name=name, category=category)

    return user


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def demo_login(request):
    """
    No credentials needed — creates a brand-new isolated guest account on
    the spot and logs straight into it, same as a normal token response.
    """
    user = provision_demo_account()
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'username': user.username,
        'is_demo': True,
    }, status=201)


demo_login.cls.throttle_scope = 'demo_login'
