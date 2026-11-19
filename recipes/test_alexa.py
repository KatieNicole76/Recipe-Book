"""
Tests for the Alexa endpoint. They sign requests with a throwaway CA and
certificate that stand in for Amazon's, so the real verification code runs.
"""
import base64
import json
from datetime import datetime, timedelta, timezone
from unittest import mock

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID
from cryptography.x509.verification import Store
from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from . import alexa
from .models import ShoppingList

SKILL_ID = 'amzn1.ask.skill.test'
CERT_URL = 'https://s3.amazonaws.com/echo.api/echo-api-cert.pem'


def _make_certs(host='echo-api.amazon.com'):
    now = datetime.now(timezone.utc)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'Test CA')])
    ca = (x509.CertificateBuilder()
          .subject_name(ca_name).issuer_name(ca_name)
          .public_key(ca_key.public_key()).serial_number(1)
          .not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=30))
          .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
          .add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=True, crl_sign=True,
                                       content_commitment=False, key_encipherment=False, data_encipherment=False,
                                       key_agreement=False, encipher_only=False, decipher_only=False), critical=True)
          .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
          .sign(ca_key, hashes.SHA256()))

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    leaf = (x509.CertificateBuilder()
            .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, host)]))
            .issuer_name(ca_name)
            .public_key(key.public_key()).serial_number(2)
            .not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=30))
            .add_extension(x509.SubjectAlternativeName([x509.DNSName(host)]), critical=False)
            .add_extension(x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
            .sign(ca_key, hashes.SHA256()))
    return ca, leaf, key


@override_settings(ALLOWED_HOSTS=['testserver'])
class AlexaEndpointTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.ca, cls.leaf, cls.key = _make_certs()

    def setUp(self):
        alexa._cert_cache.clear()
        self.user = User.objects.create_user('katie', password='x')
        self.list = ShoppingList.objects.create(owner=self.user, name='Groceries')

        pem = self.leaf.public_bytes(serialization.Encoding.PEM)
        patches = [
            mock.patch.dict('os.environ', {'ALEXA_SKILL_ID': SKILL_ID, 'ALEXA_USERNAME': 'katie'}),
            mock.patch.object(alexa, '_get_trust_store', return_value=Store([self.ca])),
            mock.patch.object(alexa.requests, 'get', return_value=mock.Mock(content=pem, raise_for_status=lambda: None)),
            # Skip the AI categorization call.
            mock.patch('recipes.views.get_shopping_item_category', return_value='other'),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def envelope(self, request, skill_id=SKILL_ID, timestamp=None):
        request.setdefault('timestamp', (timestamp or datetime.now(timezone.utc)).strftime('%Y-%m-%dT%H:%M:%SZ'))
        return {
            'version': '1.0',
            'session': {'application': {'applicationId': skill_id}},
            'context': {'System': {'application': {'applicationId': skill_id}}},
            'request': request,
        }

    def post(self, body, sign_with=None, cert_url=CERT_URL):
        raw = json.dumps(body).encode()
        sig = (sign_with or self.key).sign(raw, padding.PKCS1v15(), hashes.SHA256())
        return self.client.post('/api/alexa/', raw, content_type='application/json',
                                HTTP_SIGNATURECERTCHAINURL=cert_url,
                                HTTP_SIGNATURE_256=base64.b64encode(sig).decode())

    def add(self, phrase):
        return self.envelope({'type': 'IntentRequest',
                              'intent': {'name': 'AddItemIntent', 'slots': {'item': {'name': 'item', 'value': phrase}}}})

    def speech(self, resp):
        self.assertEqual(resp.status_code, 200, resp.content)
        return resp.json()['response']['outputSpeech']['text']

    def test_adds_several_items(self):
        text = self.speech(self.post(self.add('milk, eggs and some bread')))
        self.assertEqual(text, 'Added milk, eggs and bread to your Groceries.')
        self.assertEqual(sorted(self.list.items.values_list('name', flat=True)), ['Bread', 'Eggs', 'Milk'])

    def test_reads_unchecked_items(self):
        self.post(self.add('milk and eggs'))
        self.list.items.filter(name='Eggs').update(is_checked=True)
        text = self.speech(self.post(self.envelope({'type': 'IntentRequest', 'intent': {'name': 'ReadListIntent'}})))
        self.assertEqual(text, 'You have 1 item on your Groceries: milk.')

    def test_launch_keeps_session_open(self):
        resp = self.post(self.envelope({'type': 'LaunchRequest'}))
        self.assertFalse(resp.json()['response']['shouldEndSession'])

    def test_rejects_wrong_skill(self):
        self.assertEqual(self.post(self.envelope({'type': 'LaunchRequest'}, skill_id='amzn1.other')).status_code, 403)

    def test_rejects_bad_signature(self):
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.assertEqual(self.post(self.add('milk'), sign_with=other_key).status_code, 403)
        self.assertFalse(self.list.items.exists())

    def test_rejects_old_request(self):
        old = datetime.now(timezone.utc) - timedelta(minutes=5)
        self.assertEqual(self.post(self.envelope({'type': 'LaunchRequest'}, timestamp=old)).status_code, 403)

    def test_rejects_non_amazon_cert_url(self):
        resp = self.post(self.add('milk'), cert_url='https://evil.example.com/echo.api/cert.pem')
        self.assertEqual(resp.status_code, 403)

    def test_rejects_cert_for_other_host(self):
        ca, leaf, key = _make_certs(host='evil.example.com')
        pem = leaf.public_bytes(serialization.Encoding.PEM)
        with mock.patch.object(alexa, '_get_trust_store', return_value=Store([ca])), \
                mock.patch.object(alexa.requests, 'get', return_value=mock.Mock(content=pem, raise_for_status=lambda: None)):
            self.assertEqual(self.post(self.add('milk'), sign_with=key).status_code, 403)

    def test_refuses_everything_without_skill_id(self):
        with mock.patch.dict('os.environ', {'ALEXA_SKILL_ID': ''}):
            self.assertEqual(self.post(self.add('milk')).status_code, 403)

    def test_split_items(self):
        self.assertEqual(alexa.split_items('also a dozen eggs, milk plus butter.'), ['A dozen eggs', 'Milk', 'Butter'])
