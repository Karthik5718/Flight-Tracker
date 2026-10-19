from rest_framework.views import APIView
from rest_framework.response import Response
from airports.services.aerodatabox import get_airport_info, get_airport_flights
from flights.services.airlabs import get_airport_flights_airlabs, suggest_airport
from core.cache import get_cached_or_fetch
from core.utils import safe_get
from airports.history import get_airport_history
from airports.models import Airport

def _get_airport_info_with_fallback(code):
    # Try AeroDataBox first, then AirLabs suggest as fallback (since AeroDataBox may be down)
    data = get_airport_info(code)
    if data:
        return data
    # Fallback via AirLabs suggest
    try:
        suggest = suggest_airport(code)
        if suggest and suggest.get('airports'):
            for a in suggest['airports']:
                if (a.get('iata_code') or '').upper() == code.upper():
                    return {
                        'iata': a.get('iata_code'),
                        'icao': a.get('icao_code'),
                        'name': a.get('name'),
                        'lat': a.get('lat'),
                        'lon': a.get('lng'),
                    }
            # fallback to first
            a = suggest['airports'][0]
            return {
                'iata': a.get('iata_code'),
                'icao': a.get('icao_code'),
                'name': a.get('name'),
                'lat': a.get('lat'),
                'lon': a.get('lng'),
            }
    except Exception:
        pass
    return None

def _get_airport_flights_with_fallback(code):
    # Try AeroDataBox first, then AirLabs schedules
    data = get_airport_flights(code)
    if data and (data.get('departures') or data.get('arrivals')):
        return data
    # Fallback to AirLabs schedules (dep_iata + arr_iata)
    try:
        airlabs = get_airport_flights_airlabs(code)
        if airlabs:
            return airlabs
    except Exception:
        pass
    return data  # may be None or empty

class AirportInfoView(APIView):
    def get(self, request, code):
        cache_key = f"airport_{code}"
        data = get_cached_or_fetch(cache_key, lambda: _get_airport_info_with_fallback(code), 3600)
        if not data:
            return Response({"error": "Airport not found"}, status=404)
        return Response(data)

class AirportFlightsView(APIView):
    def get(self, request, code):
        source = request.GET.get('source', '').lower()
        cache_key = f"airport_flights_{code}_{source}" if source else f"airport_flights_{code}"
        if source == 'airlabs':
            fetcher = lambda: get_airport_flights_airlabs(code)
        else:
            fetcher = lambda: _get_airport_flights_with_fallback(code)
        data = get_cached_or_fetch(cache_key, fetcher, 120)
        if not data:
            return Response({"error": "Flights not found"}, status=404)
        # Ensure shape always has departures/arrivals
        if isinstance(data, dict) and 'departures' not in data:
            return Response({"departures": [], "arrivals": data if isinstance(data, list) else []})
        return Response(data)


class AirportHistoryView(APIView):
    """GET /api/airports/<code>/history/ - Returns historical monthly traffic data from CSV"""
    def get(self, request, code):
        cache_key = f"airport_history_{code}"
        data = get_cached_or_fetch(cache_key, lambda: get_airport_history(code), 3600)
        if not data:
            return Response({"error": "No historical data for this airport"}, status=404)
        return Response(data)


class AirportSearchView(APIView):
    """GET /api/airports/search/?q=<query> - Search airports by IATA code or name"""
    def get(self, request):
        query = request.GET.get('q', '').strip()
        if not query:
            return Response({"error": "Missing query parameter 'q'"}, status=400)
        
        results = []
        query_upper = query.upper()
        
        # First try exact IATA code match
        if len(query_upper) == 3 and query_upper.isalpha():
            # Check local DB first
            try:
                airport = Airport.objects.filter(iata__iexact=query_upper).first()
                if airport:
                    results.append({
                        'iata': airport.iata,
                        'icao': airport.icao,
                        'name': airport.name,
                    })
            except Exception:
                pass
            
            # Fallback to AirLabs suggest
            if not results:
                try:
                    suggest = suggest_airport(query_upper)
                    if suggest and suggest.get('airports'):
                        for a in suggest['airports']:
                            if (a.get('iata_code') or '').upper() == query_upper:
                                results.append({
                                    'iata': a.get('iata_code'),
                                    'icao': a.get('icao_code'),
                                    'name': a.get('name'),
                                })
                                break
                except Exception:
                    pass
        
        # If no exact match or name search, try name search
        if not results or len(query) > 3:
            # Search local DB by name
            try:
                airports = Airport.objects.filter(name__icontains=query)[:10]
                for airport in airports:
                    results.append({
                        'iata': airport.iata,
                        'icao': airport.icao,
                        'name': airport.name,
                    })
            except Exception:
                pass
            
            # Fallback to AirLabs suggest for name search
            if not results:
                try:
                    suggest = suggest_airport(query)
                    if suggest and suggest.get('airports'):
                        for a in suggest['airports'][:10]:
                            results.append({
                                'iata': a.get('iata_code'),
                                'icao': a.get('icao_code'),
                                'name': a.get('name'),
                            })
                except Exception:
                    pass
        
        return Response({"query": query, "results": results})
