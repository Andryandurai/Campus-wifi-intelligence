import unittest
import json
from app import app
from security import validate_privacy

class TestCampusWifiIntelligence(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_endpoint(self):
        res = self.client.get('/api/health/current')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("health_score", data)
        self.assertTrue(0 <= data["health_score"] <= 100)
        self.assertIn("factors", data)
        self.assertIn("status", data)

    def test_kpi_endpoint(self):
        res = self.client.get('/api/analytics/kpis')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("total_active_devices", data)
        self.assertIn("avg_utilization", data)

    def test_privacy_validation(self):
        # Clean aggregated dataset columns
        clean_cols = ["timestamp", "location", "access_point", "connected_devices", "bandwidth_util"]
        valid, msg = validate_privacy(clean_cols)
        self.assertTrue(valid)

        # Dataset with prohibited PII MAC address
        violation_cols = ["timestamp", "location", "mac_address", "client_ip"]
        valid, msg = validate_privacy(violation_cols)
        self.assertFalse(valid)
        self.assertIn("Privacy Violation", msg)

    def test_auth_workflow(self):
        # Login
        res = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'AdminPass2026!'})
        self.assertEqual(res.status_code, 200)
        token = res.get_json().get("token")
        self.assertIsNotNone(token)

        # /me
        res_me = self.client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.get_json()["user"]["username"], "admin")

    def test_campus_3d_layout(self):
        res = self.client.get('/api/campus/layout')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("blocks", data)
        self.assertGreaterEqual(len(data["blocks"]), 8)
        # Check 3D position fields
        block0 = data["blocks"][0]
        self.assertIn("position", block0)
        self.assertIn("x", block0["position"])
        self.assertIn("y", block0["position"])
        self.assertIn("z", block0["position"])

if __name__ == '__main__':
    unittest.main()

