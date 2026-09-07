import requests
from weather.adapters import open_meteo_to_weather

def get_weather(lat, lon):
    try:
        response = requests.get("https://api.open-meteo.com/v1/forecast", params={
            'latitude': lat,
            'longitude': lon,
            'current_weather': 'true'
        }, timeout=10)
        
        if response.status_code == 200:
            return open_meteo_to_weather(response.json())
    except Exception:
        pass
    return None
