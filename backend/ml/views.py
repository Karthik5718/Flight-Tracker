from rest_framework.views import APIView
from rest_framework.response import Response

from .services import predict_delay, predict_congestion

DEMO_NOTE = (
    "Demo data: illustrative hardcoded averages for demonstration only, "
    "not verified historical statistics or a trained ML model."
)


class DelayPredictionView(APIView):
    """GET /api/ml/delay-prediction/?airline=6E&origin=DEL&destination=BOM"""

    def get(self, request):
        airline = request.GET.get("airline")
        origin = request.GET.get("origin")
        destination = request.GET.get("destination")

        missing = [p for p, v in (("airline", airline), ("origin", origin), ("destination", destination)) if not v]
        if missing:
            return Response(
                {"error": "Missing required query parameters: {}".format(", ".join(missing)),
                 "required": ["airline", "origin", "destination"],
                 "example": "/api/ml/delay-prediction/?airline=6E&origin=DEL&destination=BOM"},
                status=400,
            )

        result = predict_delay(airline, origin, destination)
        if result is None:
            return Response(
                {"error": "No demo delay data for airline '{}' on route {}-{}".format(
                    airline.strip().upper(), origin.strip().upper(), destination.strip().upper()),
                 "data_source": "demo",
                 "hint": "Try a configured combination, e.g. airline=6E&origin=DEL&destination=BOM. See ML_DEMO_DATA.md."},
                status=404,
            )

        result["data_source"] = "demo"
        result["note"] = DEMO_NOTE
        return Response(result)


class CongestionPredictionView(APIView):
    """GET /api/ml/airport-congestion/?airport=DEL"""

    def get(self, request):
        airport = request.GET.get("airport")
        if not airport:
            return Response(
                {"error": "Missing required query parameter: airport",
                 "required": ["airport"],
                 "example": "/api/ml/airport-congestion/?airport=DEL"},
                status=400,
            )

        result = predict_congestion(airport)
        if result is None:
            return Response(
                {"error": "No demo congestion data for airport '{}'".format(airport.strip().upper()),
                 "data_source": "demo",
                 "hint": "Try a configured airport, e.g. ?airport=DEL. See ML_DEMO_DATA.md."},
                status=404,
            )

        result["data_source"] = "demo"
        result["note"] = DEMO_NOTE
        return Response(result)
