from rest_framework.views import APIView
from rest_framework.response import Response
from flights.services.airlabs import get_flight_details, get_schedules, get_airport_flights_airlabs
from core.cache import get_cached_or_fetch

class FlightSearchView(APIView):
    def get(self, request):
        flight_number = request.GET.get('flight')
        arr_iata = request.GET.get('arr_iata') or request.GET.get('destination') or request.GET.get('arrival')
        dep_iata = request.GET.get('dep_iata') or request.GET.get('origin') or request.GET.get('departure')

        # Search by destination/arrival airport via AirLabs schedules
        if arr_iata or dep_iata:
            code = (arr_iata or dep_iata).upper()
            cache_key = f"flight_schedules_{arr_iata}_{dep_iata}"
            data = get_cached_or_fetch(cache_key, lambda: get_airport_flights_airlabs(code) if not (arr_iata and dep_iata) else get_schedules(arr_iata=arr_iata, dep_iata=dep_iata), 120)
            if not data:
                return Response({"error": "No flights found for given airport"}, status=404)
            # If both arr and dep given, schedules returns list directly
            if isinstance(data, list):
                return Response({"departures": [], "arrivals": data})
            return Response(data)

        if not flight_number:
            return Response({"error": "flight parameter is required (or use ?arr_iata=DXB / ?dep_iata=DXB)"}, status=400)

        cache_key = f"flight_{flight_number.upper()}"
        data = get_cached_or_fetch(cache_key, lambda: get_flight_details(flight_number), 120)
        if not data:
            return Response({"error": "Flight not found or API error"}, status=404)
        return Response(data)
