from django.test import TestCase
from ml.services import classify_delay, classify_congestion, predict_delay, predict_congestion
from ml.delay_data import DELAY_DATA
from ml.congestion_data import CONGESTION_DATA


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
