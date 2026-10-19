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

    def test_schedule_fields_are_exposed_for_the_delay_model(self):
        raw = {
            "flight_iata": "6E754",
            "dep_iata": "DEL",
            "arr_iata": "COK",
            "dep_time": "2026-10-19 17:10",
            "dep_time_utc": "2026-10-19 11:40",
            "arr_time": "2026-10-19 20:20",
            "arr_time_utc": "2026-10-19 14:50",
            "duration": 190,
        }
        result = airlabs_to_flight(raw)
        self.assertEqual(result['scheduled_departure_local'], "2026-10-19 17:10")
        self.assertEqual(result['scheduled_arrival_local'], "2026-10-19 20:20")
        self.assertEqual(result['scheduled_duration_minutes'], 190)

    def test_departure_delay_is_derived_from_actual_and_scheduled(self):
        raw = {
            "flight_iata": "6E754",
            "dep_time_utc": "2026-10-19 11:40",
            "dep_actual_utc": "2026-10-19 11:30",
        }
        self.assertEqual(airlabs_to_flight(raw)['departure_delay_minutes'], -10)

    def test_provider_delay_wins_over_the_derived_one(self):
        raw = {
            "flight_iata": "6E754",
            "dep_time_utc": "2026-10-19 11:40",
            "dep_actual_utc": "2026-10-19 11:30",
            "dep_delayed": 25,
        }
        self.assertEqual(airlabs_to_flight(raw)['departure_delay_minutes'], 25)
