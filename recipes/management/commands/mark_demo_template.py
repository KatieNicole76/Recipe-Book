from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from recipes.models import DemoAccount


class Command(BaseCommand):
    """
    Flags (or unflags) an existing user as a permanent demo template
    account. Set up the account normally through the app first — real
    recipes, real photos, whatever you want recruiters to see — then run
    this once. Its recipes become part of every fresh demo visitor's
    Browse/family view (see recipes/demo.py), and it's never auto-deleted
    by the demo cleanup job.
    """
    help = 'Marks or unmarks an existing user as a permanent demo template account'

    def add_arguments(self, parser):
        parser.add_argument('username')
        parser.add_argument('--unmark', action='store_true', help='Remove demo-template status instead')

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username=options['username'])
        except User.DoesNotExist:
            raise CommandError(f"No user named '{options['username']}'")

        if options['unmark']:
            deleted, _ = DemoAccount.objects.filter(user=user, is_template=True).delete()
            if deleted:
                self.stdout.write(self.style.SUCCESS(f"'{user.username}' is no longer a demo template."))
            else:
                self.stdout.write(f"'{user.username}' wasn't a demo template.")
            return

        DemoAccount.objects.update_or_create(user=user, defaults={'is_template': True})
        self.stdout.write(self.style.SUCCESS(
            f"'{user.username}' is now a permanent demo template - its recipes will appear in every "
            "fresh demo visitor's Browse view."
        ))
