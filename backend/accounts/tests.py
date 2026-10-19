import base64
import json

from django.test import TestCase


def decode_claims(token):
    """Decode a JWT payload without verifying the signature."""
    payload = token.split('.')[1]
    padded = payload + '=' * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(padded))


class LoginRoleClaimTests(TestCase):
    """The role in the access token is what the client uses to decide
    whether to show the ATC navigation."""

    def test_normal_registration_gets_normal_role(self):
        res = self.client.post(
            '/api/accounts/register/',
            {'username': 'normalpilot', 'email': 'normal@example.com', 'password': 'Str0ngPass!23'},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.post(
            '/api/accounts/login/',
            {'username': 'normalpilot', 'password': 'Str0ngPass!23'},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        claims = decode_claims(res.json()['access'])
        self.assertEqual(claims['role'], 'normal')
        self.assertEqual(claims['username'], 'normalpilot')

    def test_atc_registration_gets_atc_role(self):
        res = self.client.post(
            '/api/accounts/register-atc/',
            {
                'username': 'atccontroller',
                'email': 'atc@example.com',
                'password': 'Str0ngPass!23',
                'atc_number': '9482-A',
            },
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.post(
            '/api/accounts/login/',
            {'username': 'atccontroller', 'password': 'Str0ngPass!23'},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        claims = decode_claims(res.json()['access'])
        self.assertEqual(claims['role'], 'atc')
        self.assertEqual(claims['username'], 'atccontroller')
