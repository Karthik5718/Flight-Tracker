from rest_framework.views import APIView
from rest_framework.response import Response

from .services import (
    flight_payload,
    flight_summary,
    predict_delay,
    predict_delay_for_flight,
    predict_congestion,
)

REQUIRED_PARAMS = ("airline", "origin", "destination")

EXAMPLE = "/api/ml/delay-prediction/?airline=6E&origin=DEL&destination=BOM"

MODEL_HINT = (
    "Send a flight number to use the trained arrival-delay model: "
    "POST {\"flight_number\": \"6E754\"}."
)


def _missing_params(source):
    return [name for name in REQUIRED_PARAMS if not source.get(name)]


class DelayPredictionView(APIView):
    """GET|POST /api/ml/delay-prediction/

    POST /api/ml/delay-prediction/  {"flight_number": "6E754"}
        Looks the flight up (AirLabs) and predicts its arrival delay with
        the trained model. The client only supplies the flight number.

    GET  /api/ml/delay-prediction/?airline=6E&origin=DEL&destination=BOM
        Route-only lookup, served by the demo table.
    """

    def get(self, request):
        airline = request.query_params.get("airline")
        origin = request.query_params.get("origin")
        destination = request.query_params.get("destination")

        missing = _missing_params(request.query_params)
        if missing:
            return Response(
                {"error": "Missing required query parameters: {}".format(", ".join(missing)),
                 "required": list(REQUIRED_PARAMS),
                 "example": EXAMPLE},
                status=400,
            )

        result = predict_delay(
            airline, origin, destination, flight_payload(request.query_params)
        )
        if result is None:
            return Response(
                {"error": "No delay prediction for airline '{}' on route {}-{}".format(
                    airline.strip().upper(), origin.strip().upper(), destination.strip().upper()),
                 "data_source": "demo",
                 "hint": MODEL_HINT},
                status=404,
            )
        return Response(result)

    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            return Response(
                {"error": "Request body must be a JSON object", "example": EXAMPLE},
                status=400,
            )

        flight_number = (data.get("flight_number") or "").strip().upper()
        if flight_number:
            flight, result = predict_delay_for_flight(flight_number)
            if result is None:
                if flight is None:
                    return Response(
                        {"error": "Flight '{}' not found".format(flight_number),
                         "hint": "Check the flight number, e.g. 6E754."},
                        status=404,
                    )
                return Response(
                    {"error": "No delay prediction for flight '{}'".format(flight_number),
                     "data_source": "demo",
                     "hint": MODEL_HINT},
                    status=404,
                )
            result["flight"] = flight_summary(flight)
            return Response(result)

        airline = data.get("airline")
        origin = data.get("origin")
        destination = data.get("destination")

        missing = _missing_params(data)
        if missing:
            return Response(
                {"error": "Missing required fields: {}".format(", ".join(missing)),
                 "required": list(REQUIRED_PARAMS),
                 "example": EXAMPLE},
                status=400,
            )

        result = predict_delay(
            airline, origin, destination, flight_payload(data)
        )
        if result is None:
            return Response(
                {"error": "Could not predict a delay for airline '{}' on route {}-{}".format(
                    str(airline).strip().upper(), str(origin).strip().upper(),
                    str(destination).strip().upper()),
                 "data_source": "demo",
                 "hint": MODEL_HINT},
                status=404,
            )
        return Response(result)


class CongestionPredictionView(APIView):
    """GET /api/ml/airport-congestion/?airport=DEL"""

    def get(self, request):
        airport = request.query_params.get("airport")
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
        result["note"] = (
            "Demo data: illustrative hardcoded averages for demonstration only, "
            "not verified historical statistics or a trained ML model."
        )
        return Response(result)
