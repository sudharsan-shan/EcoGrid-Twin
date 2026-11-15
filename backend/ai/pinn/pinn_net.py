"""
Physics-Informed Neural Network (PINN) architecture for Battery State Estimation.
Keras MLP predicting next SOC and cell temperature from:
(soc_prev, temp_prev, actual_power_kw, ambient_temp_c, dt_hours).

Enforces:
1. Electrochemical energy conservation (Coulombic efficiency).
2. Lumped thermal dynamics (Joule heating + Newton convective cooling).
3. Safe operational boundary limits [15%, 95%] on state of charge.
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from backend.config import Config

class BatteryPINNNet(keras.Model):
    """
    MLP that estimates next State of Charge (SoC) and cell temperature.
    Includes physics loss methods for electrochemical conservation, thermal dynamics,
    and operational boundaries.
    """
    def __init__(
        self,
        capacity_kwh: float = Config.BATTERY_CAPACITY_KWH,
        efficiency: float = Config.BATTERY_EFFICIENCY,
        min_soc: float = Config.BATTERY_MIN_SOC,
        max_soc: float = Config.BATTERY_MAX_SOC,
        name: str = "battery_pinn",
        **kwargs
    ):
        super().__init__(name=name, **kwargs)
        self.capacity_kwh = float(capacity_kwh)
        self.efficiency = float(efficiency)
        self.one_way_eff = float(efficiency ** 0.5)
        self.min_soc = float(min_soc)
        self.max_soc = float(max_soc)

        # Multi-layer perceptron with Swish activations for smooth physical gradients
        self.dense1 = layers.Dense(64, activation="swish", name="dense_1")
        self.dense2 = layers.Dense(64, activation="swish", name="dense_2")
        self.dense3 = layers.Dense(32, activation="swish", name="dense_3")
        # Output 2 values: delta_soc and delta_temp
        self.head = layers.Dense(2, activation="linear", name="output_deltas")

    def _normalize_inputs(self, inputs):
        """Handle 5-feature inputs (or 4-feature legacy inputs with temp_prev = ambient)."""
        shape = tf.shape(inputs)
        if shape[1] == 4:
            # Legacy [soc_prev, actual_power_kw, ambient_temp_c, dt_hours]
            soc_prev = inputs[:, 0:1]
            temp_prev = inputs[:, 2:3]  # use ambient as fallback
            pwr = inputs[:, 1:2]
            amb = inputs[:, 2:3]
            dt = inputs[:, 3:4]
        else:
            # 5-feature [soc_prev, temp_prev, actual_power_kw, ambient_temp_c, dt_hours]
            soc_prev = inputs[:, 0:1]
            temp_prev = inputs[:, 1:2]
            pwr = inputs[:, 2:3]
            amb = inputs[:, 3:4]
            dt = inputs[:, 4:5]

        soc_norm = (soc_prev - 50.0) / 50.0
        temp_norm = (temp_prev - 25.0) / 25.0
        pwr_norm = pwr / 60.0
        amb_norm = (amb - 25.0) / 25.0
        dt_norm = (dt - 0.25) / 0.5
        norm_x = tf.concat([soc_norm, temp_norm, pwr_norm, amb_norm, dt_norm], axis=-1)
        return norm_x, soc_prev, temp_prev, pwr, amb, dt

    def call(self, inputs, training=False):
        """
        inputs: tensor of shape (batch, 5) with columns:
        [soc_prev, temp_prev, actual_power_kw, ambient_temp_c, dt_hours]
        """
        norm_x, soc_prev, temp_prev, _, _, _ = self._normalize_inputs(inputs)

        x = self.dense1(norm_x)
        x = self.dense2(x)
        x = self.dense3(x)
        deltas = self.head(x)

        delta_soc = deltas[:, 0:1]
        delta_temp = deltas[:, 1:2]

        # Predicted next states = prev + delta
        soc_next = tf.clip_by_value(soc_prev + delta_soc, 0.0, 100.0)
        temp_next = temp_prev + delta_temp

        return tf.concat([soc_next, temp_next], axis=-1)

    def compute_soc_physics_residual(self, inputs, preds):
        """
        Computes electrochemical energy conservation residual:
        (soc_next - soc_prev) - Delta_SoC_physics
        """
        _, soc_prev, _, power_kw, _, dt_hours = self._normalize_inputs(inputs)
        soc_next = preds[:, 0:1]

        # Discharge (power > 0): eff_pwr = power / one_way_eff
        # Charge (power < 0): eff_pwr = power * one_way_eff
        effective_power = tf.where(
            power_kw > 0.0,
            power_kw / self.one_way_eff,
            power_kw * self.one_way_eff
        )
        expected_delta = -(effective_power * dt_hours / self.capacity_kwh) * 100.0
        expected_soc = tf.clip_by_value(soc_prev + expected_delta, self.min_soc, self.max_soc)

        residual = tf.reduce_mean(tf.square(soc_next - expected_soc))
        return residual

    def compute_thermal_physics_residual(self, inputs, preds):
        """
        Computes lumped thermal dynamics residual:
        heating = (|power_kw| / capacity_kwh) * 3.5
        cooling = 0.15 * (temp_prev - ambient_temp)
        expected_delta = (heating - cooling) * (dt_hours * 4.0)
        """
        _, _, temp_prev, power_kw, ambient_temp, dt_hours = self._normalize_inputs(inputs)
        temp_next = preds[:, 1:2]

        current_c_rate = tf.abs(power_kw) / self.capacity_kwh
        heating = current_c_rate * 3.5
        cooling = 0.15 * (temp_prev - ambient_temp)
        expected_delta = (heating - cooling) * (dt_hours * 4.0)
        expected_temp = tf.clip_by_value(temp_prev + expected_delta, 10.0, 65.0)

        residual = tf.reduce_mean(tf.square(temp_next - expected_temp))
        return residual

    def compute_physics_residual(self, inputs, preds):
        """Total physics residual combining electrochemical and thermal residuals."""
        res_soc = self.compute_soc_physics_residual(inputs, preds)
        res_thermal = self.compute_thermal_physics_residual(inputs, preds)
        return 0.5 * res_soc + 0.5 * res_thermal

    def compute_boundary_penalty(self, preds):
        """Penalizes SOC excursions outside safe operating bounds [15%, 95%]."""
        soc_next = preds[:, 0:1]
        under_penalty = tf.square(tf.maximum(0.0, self.min_soc - soc_next))
        over_penalty = tf.square(tf.maximum(0.0, soc_next - self.max_soc))
        return tf.reduce_mean(under_penalty + over_penalty)

def create_pinn_model() -> BatteryPINNNet:
    model = BatteryPINNNet()
    dummy_input = tf.zeros((1, 5), dtype=tf.float32)
    _ = model(dummy_input)
    return model
