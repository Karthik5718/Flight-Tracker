from core.utils import safe_get

def airlabs_to_flight(raw_data):
    """
    Transforms AirLabs raw JSON into the normalized Flight/FlightPosition shape.
    Expected Input: AirLabs /flight response object (response field)
    Output: Dictionary matching the internal schema. Missing fields -> None.
    Handles both /flight and /schedules item shapes (they share field names).
    """
    if not isinstance(raw_data, dict):
        return None
    return {
        'flight_number': safe_get(raw_data, 'flight_iata') or safe_get(raw_data, 'flight_icao'),
        'airline': safe_get(raw_data, 'airline_iata'),
        'aircraft': safe_get(raw_data, 'aircraft_icao'),
        'status': safe_get(raw_data, 'status'),
        'origin': safe_get(raw_data, 'dep_iata'),
        'destination': safe_get(raw_data, 'arr_iata'),
        'scheduled_departure': safe_get(raw_data, 'dep_time_utc'),
        'estimated_departure': safe_get(raw_data, 'dep_estimated_utc'),
        'actual_departure': safe_get(raw_data, 'dep_actual_utc'),
        'scheduled_arrival': safe_get(raw_data, 'arr_time_utc'),
        'estimated_arrival': safe_get(raw_data, 'arr_estimated_utc'),
        'actual_arrival': safe_get(raw_data, 'arr_actual_utc'),
        'gate': safe_get(raw_data, 'dep_gate'),
        'terminal': safe_get(raw_data, 'dep_terminal'),
        'arr_gate': safe_get(raw_data, 'arr_gate'),
        'arr_terminal': safe_get(raw_data, 'arr_terminal'),
        'lat': safe_get(raw_data, 'lat'),
        'lon': safe_get(raw_data, 'lng'),
        'altitude': safe_get(raw_data, 'alt'),
        'speed': safe_get(raw_data, 'speed'),
        'heading': safe_get(raw_data, 'dir'),
        'delayed': safe_get(raw_data, 'delayed'),
        'dep_delayed': safe_get(raw_data, 'dep_delayed'),
        'arr_delayed': safe_get(raw_data, 'arr_delayed'),
    }

def airlabs_schedules_to_list(raw_list):
    """Convert AirLabs /schedules response array to normalized flight list"""
    out = []
    if not isinstance(raw_list, list):
        return out
    for item in raw_list:
        normalized = airlabs_to_flight(item)
        if normalized:
            out.append(normalized)
    return out
