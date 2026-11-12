"""
Unit and integration tests for EcoGrid-Twin simulation, AI, and optimization.
"""

import unittest
from datetime import datetime
from backend.simulation.solar import SolarModel
from backend.simulation.battery import BatteryModel
from backend.simulation.load import LoadModel
from backend.simulation.weather import WeatherModel
from backend.simulation.simulator import Simulator
from backend.ai.lstm.predict import generate_forecast
from backend.ai.pinn.model import BatteryPINN
from backend.optimization.optimizer import MicrogridOptimizer
from backend.scenario.cloudy_weather import CloudyWeatherScenario
from backend.scenario.peak_load import PeakLoadScenario
from backend.scenario.battery_failure import BatteryFailureScenario
from backend.digital_twin.twin import DigitalTwin

class TestEcoGridTwin(unittest.TestCase):
    def setUp(self):
        self.simulator = Simulator()

    def test_solar_model(self):
        solar = SolarModel(capacity_kw=100.0)
        dt_noon = datetime(2026, 8, 15, 12, 0)
        p_noon = solar.calculate_power(dt_noon, irradiance=950.0, ambient_temp=28.0)
        self.assertGreater(p_noon, 50.0)
        
        dt_night = datetime(2026, 8, 15, 23, 0)
        p_night = solar.calculate_power(dt_night, irradiance=0.0, ambient_temp=20.0)
        self.assertEqual(p_night, 0.0)

    def test_battery_dynamics(self):
        bat = BatteryModel(capacity_kwh=200.0, initial_soc=50.0)
        # Charge
        actual = bat.step(-30.0, dt_hours=0.25)
        self.assertLess(actual, 0.0)
        self.assertGreater(bat.soc, 50.0)

        # Discharge
        bat.step(40.0, dt_hours=0.25)
        self.assertLess(bat.soc, 55.0)

    def test_simulator_step(self):
        state = self.simulator.step()
        self.assertIn("solar_kw", state)
        self.assertIn("load_kw", state)
        self.assertIn("soc", state)
        self.assertIn("grid_import_kw", state)

    def test_lstm_forecast(self):
        forecast = generate_forecast()
        self.assertEqual(len(forecast), 24)
        self.assertIn("solar_p50", forecast[0])
        self.assertIn("load_p50", forecast[0])

    def test_pinn_evaluation(self):
        pinn = BatteryPINN()
        res = pinn.estimate_state(current_soc=60.0, target_power_kw=20.0, dt_hours=0.25, ambient_temp=25.0)
        self.assertGreater(res["physics_confidence"], 0.80)

    def test_optimizer(self):
        optimizer = MicrogridOptimizer()
        forecast = generate_forecast()
        result = optimizer.optimize_24h(datetime.now(), forecast, current_soc=70.0)
        self.assertIn("cost_saving", result)
        self.assertEqual(len(result["schedule"]), 24)

    def test_scenarios(self):
        CloudyWeatherScenario.apply(self.simulator, 95.0)
        self.assertEqual(self.simulator.weather_model.override_cloud_cover, 95.0)
        CloudyWeatherScenario.remove(self.simulator)
        self.assertIsNone(self.simulator.weather_model.override_cloud_cover)

        PeakLoadScenario.apply(self.simulator, 2.0)
        self.assertEqual(self.simulator.load_model.surge_multiplier, 2.0)
        PeakLoadScenario.remove(self.simulator)
        self.assertEqual(self.simulator.load_model.surge_multiplier, 1.0)

        BatteryFailureScenario.apply(self.simulator)
        self.assertTrue(self.simulator.battery_model.is_failed)
        BatteryFailureScenario.remove(self.simulator)
        self.assertFalse(self.simulator.battery_model.is_failed)

if __name__ == "__main__":
    unittest.main()
