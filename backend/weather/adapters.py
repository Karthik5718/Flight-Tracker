from core.utils import safe_get

def open_meteo_to_weather(raw_data):
    """
    Expected Input: Open-Meteo current_weather JSON
    """
    current = safe_get(raw_data, 'current_weather', {})
    return {
        'temperature': safe_get(current, 'temperature'),
        'wind_speed': safe_get(current, 'windspeed'),
        'wind_direction': safe_get(current, 'winddirection'),
        'timestamp': safe_get(current, 'time'),
        'precipitation': None,
        'visibility': None,
        'pressure': None
    }
