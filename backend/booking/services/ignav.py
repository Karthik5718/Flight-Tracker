import os
import requests

BASE_URL = 'https://ignav.com/api'


def _get_key():
    return os.environ.get('IGNAV_API_KEY')


def _headers():
    return {
        'X-Api-Key': _get_key() or '',
        'Content-Type': 'application/json',
    }


def _post(path, payload):
    api_key = _get_key()
    if not api_key:
        return None, 'IGNAV_API_KEY is not configured on the server', 500
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=payload, headers=_headers(), timeout=20)
    except requests.RequestException:
        return None, 'Upstream fares service unavailable', 502
    if resp.status_code == 200:
        try:
            return resp.json(), None, 200
        except ValueError:
            return None, 'Invalid response from fares service', 502
    try:
        detail = resp.json()
    except ValueError:
        detail = {'detail': resp.text[:500]}
    if isinstance(detail, dict):
        msg = detail.get('detail') or detail.get('message') or detail.get('error') or 'Fares search failed'
    else:
        msg = 'Fares search failed'
    status = resp.status_code if 400 <= resp.status_code < 600 else 502
    return None, msg, status


def search_one_way(payload):
    return _post('/fares/one-way', payload)


def search_round_trip(payload):
    return _post('/fares/round-trip', payload)


def get_booking_links(payload):
    return _post('/fares/booking-links', payload)


def search_airports(query, limit=10):
    api_key = _get_key()
    if not api_key:
        return None, 'IGNAV_API_KEY is not configured on the server', 500
    try:
        resp = requests.get(
            f"{BASE_URL}/airports",
            params={'q': query, 'limit': limit},
            headers={'X-Api-Key': api_key},
            timeout=15,
        )
    except requests.RequestException:
        return None, 'Upstream fares service unavailable', 502
    if resp.status_code == 200:
        try:
            return resp.json(), None, 200
        except ValueError:
            return None, 'Invalid response from fares service', 502
    return None, 'Airport search failed', resp.status_code
