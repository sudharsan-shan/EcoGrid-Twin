"""
Unit and integration tests for EcoGrid-Twin Tamil Nadu telemetry adapters, weather service, and persistence.
"""

import unittest
from datetime import datetime
from backend.adapters.mock_adapter import MockAdapter
from backend.adapters.modbus_adapter import ModbusAdapter
from backend.adapters.mqtt_adapter import MqttAdapter
from backend.adapters.collector import TelemetryCollector
from backend.services.weather_service import weather_service
from backend.config import Config

class TestTamilNaduAdapters(unittest.TestCase):
    def test_mock_adapter_reading(self):
        adapter = MockAdapter()
        adapter.connect()
        data = adapter.read_telemetry()
        
        self.assertIsNotNone(data)
        self.assertIn("solar_kw", data)
        self.assertIn("voltage_v", data)
        self.assertIn("current_a", data)
        self.assertIn("frequency_hz", data)
        self.assertIn("currency", data)
        self.assertEqual(data["currency"], "₹")
        self.assertEqual(data["timezone"], "Asia/Kolkata")
        self.assertEqual(data["source_mode"], "SIMULATION")
        self.assertIn("Simulation", data["data_sources"]["solar"])

    def test_modbus_register_decoding(self):
        adapter = ModbusAdapter()
        # Test IEEE 754 float32 decoding (e.g. 240.5 V)
        import struct
        test_val = 240.5
        raw_bytes = struct.pack(">f", test_val)
        decoded = adapter._decode_registers(raw_bytes, "float32", "BIG_ENDIAN", "BIG_ENDIAN")
        self.assertAlmostEqual(decoded, test_val, places=2)

    def test_weather_service(self):
        forecast = weather_service.get_24h_forecast(Config.LATITUDE, Config.LONGITUDE)
        self.assertIsNotNone(forecast)
        self.assertEqual(len(forecast["forecast"]), 24)
        self.assertIn("Weather Forecast", forecast["source"])
        self.assertIn("temperature_c", forecast["forecast"][0])

    def test_telemetry_collector_source_switching(self):
        collector = TelemetryCollector.get_instance()
        
        # Test switching to Simulation
        res1 = collector.set_source("SIMULATION")
        self.assertEqual(collector.active_source, "SIMULATION")
        current = collector.get_current()
        self.assertTrue(current["is_live"])

        # Test switching to Modbus RTU (Disconnected hardware)
        res2 = collector.set_source("MODBUS_RTU")
        self.assertEqual(collector.active_source, "MODBUS_RTU")

        # Switch back to Simulation for nominal operation
        collector.set_source("SIMULATION")
        self.assertEqual(collector.active_source, "SIMULATION")

if __name__ == "__main__":
    unittest.main()
