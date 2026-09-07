from rest_framework.views import APIView
from rest_framework.response import Response
from weather.services.open_meteo import get_weather
from core.cache import get_cached_or_fetch

class WeatherView(APIView):
    def get(self, request):
        lat = request.GET.get('lat')
        lon = request.GET.get('lon')
        
        if not lat or not lon:
            return Response({"error": "lat and lon are required"}, status=400)
            
        # Rounding to 2 decimal places to increase cache hits
        try:
            rlat = round(float(lat), 2)
            rlon = round(float(lon), 2)
        except ValueError:
            return Response({"error": "Invalid lat/lon"}, status=400)
            
        cache_key = f"weather_{rlat}_{rlon}"
        
        # Phase 9: weather ~10-15min (600s)
        data = get_cached_or_fetch(cache_key, lambda: get_weather(rlat, rlon), 600)
        
        if not data:
            return Response({"error": "Weather not found"}, status=404)
        return Response(data)
