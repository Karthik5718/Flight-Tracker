from django.test import TestCase
from airports.adapters import aerodatabox_to_airport

class AdapterTests(TestCase):
    def test_airport_adapter(self):
        raw = {"iata": "JFK", "location": {"lat": 40.64, "lon": -73.77}}
        result = aerodatabox_to_airport(raw)
        self.assertEqual(result['iata'], "JFK")
        self.assertEqual(result['lat'], 40.64)
        self.assertIsNone(result['name'])
