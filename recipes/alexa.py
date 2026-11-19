"""
Alexa skill endpoint: "Alexa, ask Recipe Book to add milk and eggs."

Amazon POSTs every request for the skill here. We check that it really came
from Amazon (signed with Amazon's certificate, recent, and for our skill ID)
before touching any data, then add to / read back the shopping list of one
configured user.

Settings (environment variables):
- ALEXA_SKILL_ID: the skill's ID from the Alexa developer console. Required —
  every request is refused until it's set.
- ALEXA_USERNAME: which Recipe Book user the skill acts as.
- ALEXA_LIST_NAME: optional; the shopping list to use. Defaults to the user's
  oldest list (one called "Grocery List" is created if they have none).
"""
import base64
import json
import logging
import os
import re
import time
import warnings
from datetime import datetime, timezone as dt_timezone
from urllib.parse import urlparse

import certifi
import requests
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.x509.verification import PolicyBuilder, Store
from django.contrib.auth.models import User
from django.http import HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import ShoppingList

logger = logging.getLogger(__name__)

MAX_REQUEST_AGE_SECONDS = 150  # Amazon's limit for replayed requests
_cert_cache = {}  # cert URL -> (leaf certificate, intermediates)
_trust_store = None


# ---------------------------------------------------------------------------
# Request verification (https://developer.amazon.com/docs/custom-skills/host-a-custom-skill-as-a-web-service.html)
# ---------------------------------------------------------------------------

class VerificationError(Exception):
    pass


def _check_cert_url(url):
    parsed = urlparse(url or '')
    path = re.sub(r'/+', '/', parsed.path or '')
    if (parsed.scheme.lower() != 'https'
            or (parsed.hostname or '').lower() != 's3.amazonaws.com'
            or not path.startswith('/echo.api/')
            or '/../' in path
            or parsed.port not in (None, 443)):
        raise VerificationError('bad certificate URL')


def _get_trust_store():
    global _trust_store
    if _trust_store is None:
        with open(certifi.where(), 'rb') as f:
            blocks = re.findall(rb'-----BEGIN CERTIFICATE-----.+?-----END CERTIFICATE-----', f.read(), re.DOTALL)
        roots = []
        for block in blocks:
            # Load one at a time: a single malformed root in the bundle (newer
            # cryptography versions reject some) shouldn't break all requests.
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore')
                    roots.append(x509.load_pem_x509_certificate(block))
            except ValueError:
                continue
        _trust_store = Store(roots)
    return _trust_store


def _load_cert_chain(url):
    """Downloads Amazon's signing certificate and checks it chains to a trusted CA."""
    _check_cert_url(url)
    if url not in _cert_cache:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        certs = x509.load_pem_x509_certificates(resp.content)
        _cert_cache[url] = (certs[0], certs[1:])
    leaf, intermediates = _cert_cache[url]

    # Checks the chain, that it's in date right now, and that it was issued for
    # echo-api.amazon.com.
    verifier = (PolicyBuilder()
                .store(_get_trust_store())
                .time(datetime.now(dt_timezone.utc))
                .build_server_verifier(x509.DNSName('echo-api.amazon.com')))
    try:
        verifier.verify(leaf, intermediates)
    except Exception as exc:  # cryptography raises VerificationError subclasses
        _cert_cache.pop(url, None)
        raise VerificationError(f'untrusted certificate: {exc}')
    return leaf


def verify_alexa_request(request, body, skill_id):
    if not skill_id:
        raise VerificationError('ALEXA_SKILL_ID is not set')

    leaf = _load_cert_chain(request.headers.get('SignatureCertChainUrl'))
    signature = request.headers.get('Signature-256')
    if not signature:
        raise VerificationError('missing signature')
    try:
        leaf.public_key().verify(base64.b64decode(signature), request.body, padding.PKCS1v15(), hashes.SHA256())
    except (InvalidSignature, ValueError):
        raise VerificationError('bad signature')

    timestamp = body.get('request', {}).get('timestamp', '')
    try:
        sent = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp()
    except ValueError:
        raise VerificationError('bad timestamp')
    if abs(time.time() - sent) > MAX_REQUEST_AGE_SECONDS:
        raise VerificationError('stale request')

    app_id = (body.get('context', {}).get('System', {}).get('application', {}).get('applicationId')
              or body.get('session', {}).get('application', {}).get('applicationId'))
    if app_id != skill_id:
        raise VerificationError('wrong skill ID')


# ---------------------------------------------------------------------------
# Skill behaviour
# ---------------------------------------------------------------------------

def speak(text, end_session=True, reprompt=None):
    response = {
        'outputSpeech': {'type': 'PlainText', 'text': text},
        'shouldEndSession': end_session,
    }
    if reprompt:
        response['reprompt'] = {'outputSpeech': {'type': 'PlainText', 'text': reprompt}}
    return {'version': '1.0', 'response': response}


def split_items(phrase):
    """"milk, eggs and a loaf of bread" -> ["milk", "eggs", "a loaf of bread"]."""
    parts = re.split(r',|\band\b|\bplus\b', phrase or '', flags=re.IGNORECASE)
    items = []
    for part in parts:
        part = re.sub(r'^\s*(some|also)\s+', '', part.strip(), flags=re.IGNORECASE).strip(' .')
        if part:
            items.append(part[0].upper() + part[1:])
    return items


def join_spoken(words):
    if len(words) <= 1:
        return ''.join(words)
    return ', '.join(words[:-1]) + ' and ' + words[-1]


def get_alexa_list(user):
    name = os.getenv('ALEXA_LIST_NAME', '').strip()
    lists = ShoppingList.objects.filter(owner=user).order_by('created_at')
    if name:
        match = lists.filter(name__iexact=name).first()
        if match:
            return match
    return lists.first() or ShoppingList.objects.create(owner=user, name='Grocery List')


def handle_add(user, intent):
    # Imported here so this module doesn't depend on views at import time.
    from .views import _merge_or_create_item

    phrase = intent.get('slots', {}).get('item', {}).get('value')
    items = split_items(phrase)
    if not items:
        return speak('What should I add?', end_session=False, reprompt='Say something like, add milk and eggs.')

    shopping_list = get_alexa_list(user)
    for name in items:
        _merge_or_create_item(shopping_list, name, None, '')
    return speak(f'Added {join_spoken([i.lower() for i in items])} to your {shopping_list.name}.')


def handle_read(user):
    shopping_list = get_alexa_list(user)
    names = list(shopping_list.items.filter(is_checked=False).order_by('category', 'created_at')
                 .values_list('name', flat=True))
    if not names:
        return speak(f'Your {shopping_list.name} is empty.')
    count = f'{len(names)} item' + ('' if len(names) == 1 else 's')
    return speak(f'You have {count} on your {shopping_list.name}: {join_spoken([n.lower() for n in names])}.')


HELP = 'You can say, add milk and eggs, or, what\'s on my list.'


def handle(body, user):
    req = body.get('request', {})
    kind = req.get('type')

    if kind == 'LaunchRequest':
        return speak('Recipe Book here. What should I add to your list?', end_session=False, reprompt=HELP)
    if kind == 'SessionEndedRequest':
        return {'version': '1.0', 'response': {}}
    if kind != 'IntentRequest':
        return speak('Sorry, I can\'t do that yet.')

    intent = req.get('intent', {})
    name = intent.get('name')
    if name == 'AddItemIntent':
        return handle_add(user, intent)
    if name == 'ReadListIntent':
        return handle_read(user)
    if name == 'AMAZON.HelpIntent':
        return speak(HELP, end_session=False, reprompt=HELP)
    if name in ('AMAZON.StopIntent', 'AMAZON.CancelIntent', 'AMAZON.NavigateHomeIntent'):
        return speak('Okay.')
    return speak('Sorry, I didn\'t catch that. ' + HELP, end_session=False, reprompt=HELP)


@csrf_exempt
@require_POST
def alexa_endpoint(request):
    try:
        body = json.loads(request.body)
        verify_alexa_request(request, body, os.getenv('ALEXA_SKILL_ID', '').strip())
    except (ValueError, VerificationError, requests.RequestException) as exc:
        logger.warning('Rejected Alexa request: %s', exc)
        return HttpResponseForbidden('invalid request')

    user = User.objects.filter(username=os.getenv('ALEXA_USERNAME', '').strip()).first()
    if not user:
        logger.error('ALEXA_USERNAME is not set or does not match a user')
        return JsonResponse(speak('Recipe Book isn\'t connected to an account yet.'))

    try:
        return JsonResponse(handle(body, user))
    except Exception:
        logger.exception('Alexa request failed')
        return JsonResponse(speak('Sorry, something went wrong with Recipe Book.'))
