from datetime import datetime

from core.utils import safe_get

TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M"


def _minutes_between(later, earlier):
    """Difference in minutes between two 'YYYY-MM-DD HH:MM' timestamps."""
    if not later or not earlier:
        return None
    try:
        end = datetime.strptime(str(later).strip(), TIMESTAMP_FORMAT)
        start = datetime.strptime(str(earlier).strip(), TIMESTAMP_FORMAT)
    except (TypeError, ValueError):
        return None
    return round((end - start).total_seconds() / 60.0)


def airlabs_to_flight(raw_data):
    """
    Transforms AirLabs raw JSON into the normalized Flight/FlightPosition shape.
    Expected Input: AirLabs /flight response object (response field)
    Output: Dictionary matching the internal schema. Missing fields -> None.
    Handles both /flight and /schedules item shapes (they share field names).
    """
    if not isinstance(raw_data, dict):
        return None
    departure_delay = safe_get(raw_data, 'dep_delayed')
    if departure_delay is None:
        departure_delay = _minutes_between(
            safe_get(raw_data, 'dep_actual_utc') or safe_get(raw_data, 'dep_actual'),
            safe_get(raw_data, 'dep_time_utc') or safe_get(raw_data, 'dep_time'),
        )
    arrival_delay = safe_get(raw_data, 'arr_delayed')
    if arrival_delay is None:
        arrival_delay = _minutes_between(
            safe_get(raw_data, 'arr_actual_utc') or safe_get(raw_data, 'arr_actual'),
            safe_get(raw_data, 'arr_time_utc') or safe_get(raw_data, 'arr_time'),
        )
    return {
        'flight_number': safe_get(raw_data, 'flight_iata') or safe_get(raw_data, 'flight_icao'),
        'airline': safe_get(raw_data, 'airline_iata'),
        'aircraft': safe_get(raw_data, 'aircraft_icao'),
        'status': safe_get(raw_data, 'status'),
        'origin': safe_get(raw_data, 'dep_iata'),
        'destination': safe_get(raw_data, 'arr_iata'),
        'scheduled_departure': safe_get(raw_data, 'dep_time_utc') or safe_get(raw_data, 'dep_time'),
        'estimated_departure': safe_get(raw_data, 'dep_estimated_utc') or safe_get(raw_data, 'dep_estimated'),
        'actual_departure': safe_get(raw_data, 'dep_actual_utc') or safe_get(raw_data, 'dep_actual'),
        'scheduled_arrival': safe_get(raw_data, 'arr_time_utc') or safe_get(raw_data, 'arr_time'),
        'estimated_arrival': safe_get(raw_data, 'arr_estimated_utc') or safe_get(raw_data, 'arr_estimated'),
        'actual_arrival': safe_get(raw_data, 'arr_actual_utc') or safe_get(raw_data, 'arr_actual'),
        # Local clock times / durations / delays feed the arrival-delay model
        'scheduled_departure_local': safe_get(raw_data, 'dep_time'),
        'scheduled_arrival_local': safe_get(raw_data, 'arr_time'),
        'scheduled_duration_minutes': safe_get(raw_data, 'duration'),
        'departure_delay_minutes': departure_delay,
        'arrival_delay_minutes': arrival_delay,
        'flight_delay_minutes': safe_get(raw_data, 'delayed'),
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
        'cs_airline': safe_get(raw_data, 'cs_airline_iata'),
        'cs_flight_number': safe_get(raw_data, 'cs_flight_iata') or safe_get(raw_data, 'cs_flight_number'),
        'cs_flight_iata': safe_get(raw_data, 'cs_flight_iata'),
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
