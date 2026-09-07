from rest_framework.views import APIView
from rest_framework.response import Response
from flights.services.airlabs import get_flight_position
from core.cache import get_cached_or_fetch

class FlightPositionView(APIView):
    def get(self, request):
        flights_param = request.GET.get('flights', '')
        if not flights_param:
            return Response({"error": "flights parameter is required"}, status=400)
            
        flight_numbers = flights_param.split(',')
        results = []
        
        for fn in flight_numbers:
            fn = fn.strip()
            if not fn: continue
            
            cache_key = f"position_{fn}"
            # Phase 9: latest flight position ~15-30s (30 seconds)
            data = get_cached_or_fetch(cache_key, lambda fn=fn: get_flight_position(fn), 30)
            if data:
                results.append(data)
                
        return Response({"positions": results})
