from django.test import TestCase
from flights.adapters import airlabs_to_flight

class AdapterTests(TestCase):
    def test_airlabs_adapter_missing_fields(self):
        raw = {"flight_iata": "AA100", "lat": 40.0}
        result = airlabs_to_flight(raw)
        self.assertEqual(result['flight_number'], "AA100")
        self.assertEqual(result['lat'], 40.0)
        self.assertIsNone(result['gate'])
        self.assertIsNone(result['altitude'])
