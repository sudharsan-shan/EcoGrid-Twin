/**
 * EcoGrid-Twin Shared Configuration
 * Master configuration source for Overview, Digital Twin, Analytics, Battery, Validation, and Settings.
 */

export const PAPER_PRESET = {
  preset_name: 'Paper Preset (Tamil Nadu Microgrid)',
  site_name: 'Chennai Industrial Microgrid',
  city: 'Chennai',
  latitude: 13.0827,
  longitude: 80.2707,
  timezone: 'Asia/Kolkata',

  // Generation & Storage Specifications
  solar_capacity_kw: 120.0,
  has_battery: true,
  battery_capacity_kwh: 250.0,
  battery_max_power_kw: 60.0,
  battery_min_soc: 15.0,
  battery_max_soc: 95.0,
  initial_soc: 65.0,
  battery_efficiency: 0.94, // Round-trip efficiency (94%)

  // TNPDCL Electricity Tariff (INR / kWh)
  tnpdcl_category: 'HT-I-A Industrial',
  grid_peak_price: 9.50,      // 06:00-09:00 & 18:00-21:00 IST
  grid_standard_price: 7.50,  // Daytime standard
  grid_offpeak_price: 5.80,   // 22:00-06:00 Night
  grid_feed_in_tariff: 3.50,  // Net-metering export remuneration
  grid_fixed_charge: 1200.0,  // Monthly fixed charge
  grid_demand_charge: 350.0,  // Demand charge per kVA

  // Emissions & Physics Constants
  grid_carbon_intensity: 0.72, // kg CO2 / kWh (Tamil Nadu grid average)
  inverter_efficiency: 0.96,
  pv_temp_coeff: 0.004,        // -0.4% / °C above 25°C
  ambient_base_temp: 32.0,     // °C typical Chennai summer/monsoon
  sim_seed: 42,

  // Time & Discretization Model
  steps_per_day: 96,
  step_minutes: 15,
  step_hours: 0.25,
};

export const CITIES_CONFIG = {
  Chennai: { lat: 13.0827, lon: 80.2707, baseTemp: 32.5, peakGhi: 940 },
  Coimbatore: { lat: 11.0168, lon: 76.9558, baseTemp: 29.0, peakGhi: 960 },
  Madurai: { lat: 9.9252, lon: 78.1198, baseTemp: 34.0, peakGhi: 970 },
  Tiruchirappalli: { lat: 10.7905, lon: 78.7047, baseTemp: 33.5, peakGhi: 965 },
  Salem: { lat: 11.6643, lon: 78.1460, baseTemp: 31.0, peakGhi: 955 },
  Tirunelveli: { lat: 8.7139, lon: 77.7567, baseTemp: 33.0, peakGhi: 980 },
  Erode: { lat: 11.3410, lon: 77.7172, baseTemp: 32.0, peakGhi: 950 },
  Vellore: { lat: 12.9165, lon: 79.1325, baseTemp: 33.0, peakGhi: 945 },
};

/**
 * Returns TNPDCL tariff band & price for a given hour [0 - 24)
 */
export function getTariffForHour(hour, config = PAPER_PRESET) {
  const h = Math.floor(hour) % 24;
  if ((h >= 6 && h < 9) || (h >= 18 && h < 21)) {
    return { band: 'PEAK', rate: config.grid_peak_price, label: 'Peak ToU (06-09, 18-21)' };
  }
  if (h >= 22 || h < 6) {
    return { band: 'OFFPEAK', rate: config.grid_offpeak_price, label: 'Off-Peak Night (22-06)' };
  }
  return { band: 'STANDARD', rate: config.grid_standard_price, label: 'Standard Normal' };
}
