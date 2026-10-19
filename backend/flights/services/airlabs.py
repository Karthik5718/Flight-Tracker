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

def get_schedules(arr_iata=None, dep_iata=None, max_pages=3, return_meta=False):
    api_key = _get_key()
    if not api_key:
        return None
    if not arr_iata and not dep_iata:
        return None

    params = {'api_key': api_key}
    if arr_iata:
        params['arr_iata'] = arr_iata.upper()
    if dep_iata:
        params['dep_iata'] = dep_iata.upper()

    all_raw = []
    total_items = None
    has_more = False
    limit = 100
    offset = 0

    for _ in range(max_pages):
        page_params = dict(params)
        page_params['limit'] = limit
        page_params['offset'] = offset
        try:
            response = requests.get(f"{BASE_URL}/schedules", params=page_params, timeout=10)
            if response.status_code != 200:
                break
            json_body = response.json()
            raw_list = json_body.get('response', [])
            req_meta = json_body.get('request', {})

            if isinstance(req_meta, dict):
                raw_total = req_meta.get('total_items')
                if raw_total is not None:
                    try:
                        total_items = int(raw_total)
                    except (ValueError, TypeError):
                        pass

                if 'has_more' in req_meta and req_meta.get('has_more') is not None:
                    has_more = bool(req_meta.get('has_more'))
                elif total_items is not None and isinstance(raw_list, list):
                    has_more = (offset + len(raw_list)) < total_items
                elif isinstance(raw_list, list):
                    has_more = len(raw_list) >= limit
                else:
                    has_more = False

            if isinstance(raw_list, list) and raw_list:
                all_raw.extend(raw_list)
                if not has_more or len(raw_list) < limit:
                    break
                offset += len(raw_list)
            else:
                break
        except Exception:
            break

    if not all_raw and total_items is None:
        return None

    flights = airlabs_schedules_to_list(all_raw)
    is_partial = bool(has_more or (total_items is not None and len(all_raw) < total_items))

    if return_meta:
        return {
            'records': flights,
            'total_items': total_items,
            'records_fetched': len(all_raw),
            'has_more': has_more,
            'is_partial': is_partial,
        }
    return flights

def get_airport_flights_airlabs(code, max_pages=3):
    # Return {"departures": [...], "arrivals": [...], "metadata": {...}} using AirLabs schedules
    code = code.upper()
    dep_data = get_schedules(dep_iata=code, max_pages=max_pages, return_meta=True)
    arr_data = get_schedules(arr_iata=code, max_pages=max_pages, return_meta=True)

    departures = dep_data['records'] if dep_data else []
    arrivals = arr_data['records'] if arr_data else []

    if not departures and not arrivals:
        return None

    dep_total = dep_data.get('total_items') if dep_data else None
    arr_total = arr_data.get('total_items') if arr_data else None
    dep_fetched = dep_data.get('records_fetched', len(departures)) if dep_data else 0
    arr_fetched = arr_data.get('records_fetched', len(arrivals)) if arr_data else 0
    is_partial = bool((dep_data and dep_data.get('is_partial')) or (arr_data and arr_data.get('is_partial')))

    return {
        "departures": departures,
        "arrivals": arrivals,
        "metadata": {
            "departures_total_reported": dep_total,
            "arrivals_total_reported": arr_total,
            "departures_fetched": dep_fetched,
            "arrivals_fetched": arr_fetched,
            "is_partial": is_partial,
            "provider": "airlabs"
        }
    }

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
