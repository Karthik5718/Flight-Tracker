import os
import requests
from flights.adapters import airlabs_to_flight, airlabs_schedules_to_list

def _get_key():
    return os.environ.get('AIRLABS_API_KEY')

BASE_URL = 'https://airlabs.co/api/v9'

def get_flight_details(flight_iata):
    api_key = _get_key()

    if not api_key:
        return None

    try:
        response = requests.get(
            f"{BASE_URL}/flights",
            params={
                "flight_iata": flight_iata.upper(),
                "api_key": api_key,
            },
            timeout=10,
        )

        if response.status_code != 200:
            return None

        data = response.json().get("response", [])

        if not isinstance(data, list) or not data:
            return None

        # Find the exact requested flight
        flight = next(
            (
                item
                for item in data
                if (item.get("flight_iata") or "").upper() == flight_iata.upper()
            ),
            None,
        )

        if not flight:
            return None

        return airlabs_to_flight(flight)

    except Exception:
        return None

def get_flight_position(flight_iata):
    # AirLabs /flight endpoint returns live lat/lon as well when available
    return get_flight_details(flight_iata)

def get_schedules(arr_iata=None, dep_iata=None):
    api_key = _get_key()
    if not api_key:
        return None
    params = {'api_key': api_key}
    if arr_iata:
        params['arr_iata'] = arr_iata
    if dep_iata:
        params['dep_iata'] = dep_iata
    if not params.get('arr_iata') and not params.get('dep_iata'):
        return None
    try:
        response = requests.get(f"{BASE_URL}/schedules", params=params, timeout=10)
        if response.status_code == 200:
            data = response.json().get('response', [])
            if isinstance(data, list):
                return airlabs_schedules_to_list(data)
    except Exception:
        pass
    return None

def get_airport_flights_airlabs(code):
    # Return {"departures": [...], "arrivals": [...]} using AirLabs schedules
    code = code.upper()
    arrivals = get_schedules(arr_iata=code) or []
    departures = get_schedules(dep_iata=code) or []
    if not arrivals and not departures:
        return None
    return {"departures": departures, "arrivals": arrivals}

def suggest_airport(query):
    api_key = _get_key()
    if not api_key or not query:
        return None
    try:
        response = requests.get(f"{BASE_URL}/suggest", params={'q': query, 'api_key': api_key}, timeout=10)
        if response.status_code == 200:
            return response.json().get('response', {})
    except Exception:
        pass
    return None

def get_airport_coords(iata):
    # Helper to get lat/lon for an IATA via suggest
    data = suggest_airport(iata)
    if not data:
        return None
    for a in data.get('airports', []):
        if (a.get('iata_code') or '').upper() == iata.upper():
            return {'lat': a.get('lat'), 'lon': a.get('lng'), 'name': a.get('name')}
    # fallback: first airport result
    if data.get('airports'):
        a = data['airports'][0]
        return {'lat': a.get('lat'), 'lon': a.get('lng'), 'name': a.get('name')}
    return None
