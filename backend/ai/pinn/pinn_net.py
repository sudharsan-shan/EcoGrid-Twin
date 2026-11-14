"""
Physics-Informed Neural Network (PINN) architecture for Battery State Estimation.
Keras MLP predicting next SOC and temperature from (soc, power_kw, ambient_temp, dt_hours).
Enforces differential electrochemical energy balance and SOC boundary constraints.
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from backend.config import Config

class BatteryPINNNet(keras.Model):
    """
    MLP that estimates next State of Charge (SoC) and cell temperature.
    Includes physics loss methods for energy balance and operational bounds.
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

        # Multi-layer perceptron with softplus / swish activations for smooth gradients
        self.dense1 = layers.Dense(64, activation="swish", name="dense_1")
        self.dense2 = layers.Dense(64, activation="swish", name="dense_2")
        self.dense3 = layers.Dense(32, activation="swish", name="dense_3")
        # Output 2 values: delta_soc and delta_temp
        self.head = layers.Dense(2, activation="linear", name="output_deltas")

    def call(self, inputs, training=False):
        """
        inputs: tensor of shape (batch, 4) with columns:
        [soc_prev, power_kw, ambient_temp_c, dt_hours]
        """
        # Normalization layer
        soc_norm = (inputs[:, 0:1] - 50.0) / 50.0
        pwr_norm = inputs[:, 1:2] / 60.0
        amb_norm = (inputs[:, 2:3] - 25.0) / 25.0
        dt_norm  = (inputs[:, 3:4] - 0.25) / 0.5
        x = tf.concat([soc_norm, pwr_norm, amb_norm, dt_norm], axis=-1)

        x = self.dense1(x)
        x = self.dense2(x)
        x = self.dense3(x)
        deltas = self.head(x)

        delta_soc = deltas[:, 0:1]
        delta_temp = deltas[:, 1:2]

        # Predicted next states = prev + delta
        soc_next = inputs[:, 0:1] + delta_soc
        # Clip predicted SOC to physical range [0, 100]
        soc_next = tf.clip_by_value(soc_next, 0.0, 100.0)
        temp_next = inputs[:, 2:3] + delta_temp

        return tf.concat([soc_next, temp_next], axis=-1)

    def compute_physics_residual(self, inputs, preds):
        """
        Computes energy conservation residual:
        (soc_next - soc_prev) - Delta_SoC_physics
        """
        soc_prev = inputs[:, 0:1]
        power_kw = inputs[:, 1:2]
        dt_hours = inputs[:, 3:4]
        soc_next = preds[:, 0:1]

        # Discharge (power > 0): effective power = power / one_way_eff
        # Charge (power < 0): effective power = power * one_way_eff
        effective_power = tf.where(
            power_kw > 0.0,
            power_kw / self.one_way_eff,
            power_kw * self.one_way_eff
        )
        expected_delta = -(effective_power * dt_hours / self.capacity_kwh) * 100.0
        # Target SOC without boundary violation
        expected_soc = tf.clip_by_value(soc_prev + expected_delta, self.min_soc, self.max_soc)

        # L1/L2 residual
        residual = tf.reduce_mean(tf.square(soc_next - expected_soc))
        return residual

    def compute_boundary_penalty(self, preds):
        """
        Penalizes SOC excursions outside safe operating bounds [15%, 95%].
        """
        soc_next = preds[:, 0:1]
        under_penalty = tf.square(tf.maximum(0.0, self.min_soc - soc_next))
        over_penalty = tf.square(tf.maximum(0.0, soc_next - self.max_soc))
        return tf.reduce_mean(under_penalty + over_penalty)

def create_pinn_model() -> BatteryPINNNet:
    model = BatteryPINNNet()
    # Build model by passing a dummy tensor
    dummy_input = tf.zeros((1, 4), dtype=tf.float32)
    _ = model(dummy_input)
    return model

