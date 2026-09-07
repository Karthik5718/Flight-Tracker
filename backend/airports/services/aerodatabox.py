import os
import requests
from airports.adapters import aerodatabox_to_airport, aerodatabox_to_flight_list
from datetime import datetime, timedelta

AERODATABOX_API_KEY = os.environ.get('AERODATABOX_API_KEY')
BASE_URL = 'https://aerodatabox.p.rapidapi.com'

def get_headers():
    return {
        'X-RapidAPI-Key': AERODATABOX_API_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
    }

def get_airport_info(iata):
    if not AERODATABOX_API_KEY:
        return None
        
    try:
        response = requests.get(f"{BASE_URL}/airports/iata/{iata}", headers=get_headers(), timeout=10)
        if response.status_code == 200:
            return aerodatabox_to_airport(response.json())
    except Exception:
        pass
    return None

def get_airport_flights(iata):
    if not AERODATABOX_API_KEY:
        return None
        
    # AeroDataBox FIDS requires a time range (max 12 hours)
    now = datetime.utcnow()
    start_time = now.strftime('%Y-%m-%dT%H:%M')
    end_time = (now + timedelta(hours=6)).strftime('%Y-%m-%dT%H:%M')
    
    try:
        response = requests.get(f"{BASE_URL}/flights/airports/iata/{iata}/{start_time}/{end_time}", params={
            'withLeg': 'true',
            'direction': 'Both',
            'withCancelled': 'true',
            'withCodeshared': 'true',
            'withLocation': 'false'
        }, headers=get_headers(), timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            departures = aerodatabox_to_flight_list(data.get('departures', []))
            arrivals = aerodatabox_to_flight_list(data.get('arrivals', []))
            return {"departures": departures, "arrivals": arrivals}
    except Exception:
        pass
    return None
