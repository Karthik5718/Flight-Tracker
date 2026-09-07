from core.utils import safe_get

def aerodatabox_to_airport(raw_data):
    """
    Expected Input: AeroDataBox airport JSON
    """
    return {
        'iata': safe_get(raw_data, 'iata'),
        'icao': safe_get(raw_data, 'icao'),
        'name': safe_get(raw_data, 'shortName') or safe_get(raw_data, 'name'),
        'lat': safe_get(raw_data.get('location', {}), 'lat'),
        'lon': safe_get(raw_data.get('location', {}), 'lon')
    }

def aerodatabox_to_flight_list(raw_data):
    """
    Expected Input: AeroDataBox FIDS (arrivals/departures) array
    """
    flights = []
    for flight in raw_data:
        flights.append({
            'flight_number': safe_get(flight, 'number'),
            'status': safe_get(flight, 'status'),
            'scheduled_departure': safe_get(flight.get('departure', {}), 'scheduledTimeUtc'),
            'scheduled_arrival': safe_get(flight.get('arrival', {}), 'scheduledTimeUtc')
        })
    return flights
