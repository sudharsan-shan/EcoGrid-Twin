<template>
  <div class="home-view">
    <!-- Simulation Clock, 96-Step Scrubber & Preset Controls -->
    <SimulationClockBar />

    <!-- 1. Real-time KPI Metric Cards -->
    <KpiCards />

    <!-- 2. Flagship Animated Microgrid Topology Schematic -->
    <MicrogridTopology />

    <!-- 3. Real-time Charts Grid (Power Telemetry + 24h AI Forecast) -->
    <div class="charts-grid">
      <PowerFlowChart />
      <ForecastChart />
    </div>

    <!-- 4. Dispatch Mode Selector & Smart Optimizer -->
    <DispatchControlPanel />

    <!-- 5. "What-If" Scenario Stress Testing -->
    <ScenarioRunner />
  </div>
</template>

<script setup>
import SimulationClockBar from '../components/SimulationClockBar.vue'
import KpiCards from '../components/KpiCards.vue'
import MicrogridTopology from '../components/MicrogridTopology.vue'
import PowerFlowChart from '../components/PowerFlowChart.vue'
import ForecastChart from '../components/ForecastChart.vue'
import DispatchControlPanel from '../components/DispatchControlPanel.vue'
import ScenarioRunner from '../components/ScenarioRunner.vue'
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
</style>
