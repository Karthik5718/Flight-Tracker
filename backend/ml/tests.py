import unittest
from datetime import datetime
from unittest.mock import patch

from django.test import TestCase
from ml import delay_model
from ml.services import (
    build_flight_features,
    classify_delay,
    classify_congestion,
    predict_delay,
    predict_congestion,
)
from ml.delay_data import DELAY_DATA
from ml.congestion_data import CONGESTION_DATA

MODEL_AVAILABLE = delay_model.model_status()["available"]

FLIGHT_PAYLOAD = {
    "flight_number": "6E216",
    "scheduled_departure": "2026-10-19T04:35:00Z",
    "scheduled_arrival": "2026-10-19T07:05:00Z",
    "scheduled_departure_local": "10:05",
    "scheduled_arrival_local": "12:35",
    "scheduled_duration_minutes": 150,
    "departure_delay_minutes": 12,
    "distance_miles": 1179,
    "flight_date": "2026-10-19",
}


class DelayDatasetTests(TestCase):
    def test_minimum_combinations(self):
        self.assertGreaterEqual(len(DELAY_DATA), 10)

    def test_keys_uppercase_iata(self):
        for (airline, origin, dest), entry in DELAY_DATA.items():
            self.assertEqual(airline, airline.upper())
            self.assertEqual(origin, origin.upper())
            self.assertEqual(dest, dest.upper())
            self.assertGreaterEqual(entry["avg_departure_delay"], 0)
            self.assertGreaterEqual(entry["avg_arrival_delay"], 0)

    def test_categories_cover_all_bands(self):
        cats = {classify_delay(e["avg_departure_delay"]) for e in DELAY_DATA.values()}
        self.assertEqual(cats, {"On Time", "Minor Delay", "Major Delay"})


class CongestionDatasetTests(TestCase):
    def test_minimum_airports(self):
        self.assertGreaterEqual(len(CONGESTION_DATA), 10)

    def test_scores_in_range(self):
        for code, entry in CONGESTION_DATA.items():
            self.assertEqual(code, code.upper())
            for field in ("congestion_score", "forecast_1h", "forecast_3h", "forecast_6h"):
                self.assertGreaterEqual(entry[field], 0)
                self.assertLessEqual(entry[field], 100)

    def test_categories_cover_all_bands(self):
        cats = {classify_congestion(e["congestion_score"]) for e in CONGESTION_DATA.values()}
        self.assertEqual(cats, {"Low", "Moderate", "High", "Severe"})


class ClassificationRuleTests(TestCase):
    def test_delay_boundaries(self):
        self.assertEqual(classify_delay(0), "On Time")
        self.assertEqual(classify_delay(5), "On Time")
        self.assertEqual(classify_delay(6), "Minor Delay")
        self.assertEqual(classify_delay(30), "Minor Delay")
        self.assertEqual(classify_delay(31), "Major Delay")

    def test_congestion_boundaries(self):
        self.assertEqual(classify_congestion(0), "Low")
        self.assertEqual(classify_congestion(39), "Low")
        self.assertEqual(classify_congestion(40), "Moderate")
        self.assertEqual(classify_congestion(64), "Moderate")
        self.assertEqual(classify_congestion(65), "High")
        self.assertEqual(classify_congestion(84), "High")
        self.assertEqual(classify_congestion(85), "Severe")
        self.assertEqual(classify_congestion(100), "Severe")


class DelayEndpointTests(TestCase):
    def test_valid_combination(self):
        res = self.client.get("/api/ml/delay-prediction/", {"airline": "6e", "origin": "del", "destination": "bom"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["airline"], "6E")
        self.assertEqual(data["origin"], "DEL")
        self.assertEqual(data["destination"], "BOM")
        self.assertEqual(data["avg_departure_delay_minutes"], 12)
        self.assertEqual(data["delay_category"], "Minor Delay")
        self.assertEqual(data["data_source"], "demo")

    def test_missing_parameters(self):
        res = self.client.get("/api/ml/delay-prediction/", {"airline": "6E"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_unsupported_combination(self):
        res = self.client.get("/api/ml/delay-prediction/", {"airline": "XX", "origin": "AAA", "destination": "BBB"})
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertIn("error", data)
        self.assertEqual(data["data_source"], "demo")


class FlightFeatureTests(TestCase):
    def test_clock_parsing(self):
        self.assertEqual(delay_model.parse_clock("10:05"), 605)
        self.assertEqual(delay_model.parse_clock("2026-10-19 17:10"), 1030)
        self.assertEqual(delay_model.parse_clock("2026-10-19T17:10:00"), 1030)
        self.assertEqual(delay_model.parse_clock("2026-10-19T17:10:00Z"), 1030)
        self.assertEqual(delay_model.parse_clock(1710), 1030)
        self.assertIsNone(delay_model.parse_clock(""))
        self.assertIsNone(delay_model.parse_clock(None))

    def test_elapsed_time_from_timestamps(self):
        payload = dict(FLIGHT_PAYLOAD)
        payload.pop("scheduled_duration_minutes")
        numeric, _month, _dow, meta = build_flight_features(payload, "DEL", "BOM")
        self.assertEqual(numeric["crs_elapsed_time"], 150)
        self.assertIn("crs_elapsed_time", meta["sources"])

    def test_calendar_features_from_flight_date(self):
        _numeric, month, dow, meta = build_flight_features(FLIGHT_PAYLOAD, "DEL", "BOM")
        self.assertEqual(month, 10)
        self.assertEqual(dow, 1)  # 2026-10-19 is a Monday
        self.assertEqual(meta["flight_date"], "2026-10-19")

    def test_local_date_crossing_midnight_utc(self):
        payload = dict(FLIGHT_PAYLOAD)
        payload.pop("flight_date")
        payload["scheduled_departure"] = "2026-10-19T19:00:00Z"
        payload["scheduled_departure_local"] = "00:30"
        _numeric, _month, dow, meta = build_flight_features(payload, "DEL", "BOM")
        self.assertEqual(meta["flight_date"], "2026-10-20")
        self.assertEqual(dow, 2)  # Tuesday

    def test_missing_clock_times_are_reported(self):
        numeric, _month, _dow, meta = build_flight_features({"distance_miles": 100}, "DEL", "BOM")
        self.assertIn("dep_sin", meta["missing"])
        self.assertIn("arr_sin", meta["missing"])
        self.assertIsNone(numeric["dep_sin"])

    def test_departure_delay_defaults_to_zero(self):
        payload = dict(FLIGHT_PAYLOAD)
        payload.pop("departure_delay_minutes")
        numeric, _month, _dow, meta = build_flight_features(payload, "DEL", "BOM")
        self.assertEqual(numeric["dep_delay"], 0)
        self.assertTrue(any("departure delay" in note for note in meta["assumptions"]))

    def test_incomplete_flight_falls_back_to_demo(self):
        result = predict_delay("6E", "DEL", "BOM", {"distance_miles": 1179})
        self.assertIsNotNone(result)
        self.assertEqual(result["data_source"], "demo")


@unittest.skipUnless(MODEL_AVAILABLE, "trained model artifact is not available")
class ModelPredictionTests(TestCase):
    def test_model_status_reports_the_artifact(self):
        status = delay_model.model_status()
        self.assertTrue(status["available"])
        self.assertEqual(status["target"], "arr_delay")
        self.assertIn("test_mae", status["metrics"])

    def test_post_uses_the_trained_model(self):
        payload = dict(FLIGHT_PAYLOAD, airline="6E", origin="DEL", destination="BOM")
        payload.pop("flight_number")  # a flight number would trigger a live lookup
        res = self.client.post(
            "/api/ml/delay-prediction/",
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["data_source"], "model")
        self.assertEqual(data["features"]["distance_miles"], 1179)
        self.assertEqual(data["predicted_departure_delay_minutes"], 12)
        self.assertIn(data["delay_category"], ("On Time", "Minor Delay", "Major Delay"))

    def test_get_with_flight_details_uses_the_trained_model(self):
        params = dict(FLIGHT_PAYLOAD, airline="6E", origin="DEL", destination="BOM")
        res = self.client.get("/api/ml/delay-prediction/", params)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data_source"], "model")

    def test_model_predicts_a_route_outside_the_demo_table(self):
        res = self.client.post(
            "/api/ml/delay-prediction/",
            data=dict(FLIGHT_PAYLOAD, airline="XX", origin="AAA", destination="BBB"),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data_source"], "model")

    def test_later_departure_predicts_a_later_arrival(self):
        def arrival_for(departure_delay):
            payload = dict(FLIGHT_PAYLOAD, departure_delay_minutes=departure_delay)
            numeric, month, dow, _meta = build_flight_features(payload, "DEL", "BOM")
            return delay_model.predict_arrival_delay(numeric, month, dow)

        self.assertGreater(arrival_for(90), arrival_for(0))

    def test_post_requires_the_route_fields(self):
        res = self.client.post(
            "/api/ml/delay-prediction/",
            data={"airline": "6E"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.json())

    def test_post_with_a_flight_number_looks_the_flight_up(self):
        flight = {
            "flight_number": "6E754", "airline": "6E", "origin": "DEL", "destination": "COK",
            "status": "en-route",
            "scheduled_departure": "2026-10-19 11:40",
            "scheduled_arrival": "2026-10-19 14:50",
            "scheduled_departure_local": "2026-10-19 17:10",
            "scheduled_arrival_local": "2026-10-19 20:20",
            "scheduled_duration_minutes": 190,
            "departure_delay_minutes": -10,
        }
        with patch("flights.services.airlabs.get_flight_details", return_value=flight), \
                patch("ml.services.route_distance_miles", return_value=1272.8):
            res = self.client.post(
                "/api/ml/delay-prediction/",
                data={"flight_number": "6E754"},
                content_type="application/json",
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["data_source"], "model")
        self.assertEqual(data["flight"]["flight_number"], "6E754")
        self.assertEqual(data["flight"]["status"], "en-route")
        self.assertEqual(data["features"]["departure_delay_minutes"], -10)
        self.assertEqual(data["features"]["distance_miles"], 1272.8)
        self.assertEqual(data["features"]["flight_date"], "2026-10-19")

    def test_post_with_an_unknown_flight_number(self):
        with patch("flights.services.airlabs.get_flight_details", return_value=None):
            res = self.client.post(
                "/api/ml/delay-prediction/",
                data={"flight_number": "ZZ999"},
                content_type="application/json",
            )
        self.assertEqual(res.status_code, 404)
        self.assertIn("error", res.json())


class CongestionEndpointTests(TestCase):
    def test_valid_airport(self):
        res = self.client.get("/api/ml/airport-congestion/", {"airport": "del"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["airport"], "DEL")
        self.assertEqual(data["congestion_score"], 78)
        self.assertEqual(data["congestion_category"], "High")
        self.assertEqual(data["forecast_1h"], 82)
        self.assertEqual(data["data_source"], "demo")

    def test_each_airport_differs_or_matches_dataset(self):
        for code, entry in CONGESTION_DATA.items():
            res = self.client.get("/api/ml/airport-congestion/", {"airport": code})
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()["congestion_score"], entry["congestion_score"])

    def test_missing_parameter(self):
        res = self.client.get("/api/ml/airport-congestion/")
        self.assertEqual(res.status_code, 400)

    def test_unsupported_airport(self):
        res = self.client.get("/api/ml/airport-congestion/", {"airport": "XXX"})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["data_source"], "demo")
