import React from 'react';
import { useEcoGridStore } from '../sim/store';
import { ChartCard } from '../components/common/ChartCard';
import { 
  Sun, 
  Zap, 
  BatteryCharging, 
  Activity, 
  DollarSign, 
  Leaf, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const {
    dayResult,
    stepIndex,
    forecast,
    dispatchPlan,
    telemetryBuffer,
    interventions,
    config,
  } = useEcoGridStore();

  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];
  const summary = dayResult.summary;

  // Recent 60 samples from ring buffer for live streaming chart
  const liveStreamData = telemetryBuffer.slice(-60);

  // Forecast data with current step marker
  const forecastData = forecast.series;

  // Lookahead schedule data
  const scheduleData = dispatchPlan.schedule;

  return (
    <div className="space-y-6">
      {/* ── 6 KPI Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Solar PV */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Solar Generation</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-amber-400">
              {currentStep.solarKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">kW</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Peak: {summary.peakSolarKw} kW
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Today:</span>
            <span className="font-mono text-slate-200">{summary.totalSolarKwh} kWh</span>
          </div>
        </div>

        {/* 2. Building Load */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Building Demand</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {currentStep.loadKw.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">kW</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Peak: {summary.peakLoadKw} kW
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Today:</span>
            <span className="font-mono text-slate-200">{summary.totalLoadKwh} kWh</span>
          </div>
        </div>

        {/* 3. Battery BESS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">BESS Storage</span>
            <BatteryCharging className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-teal-400">
                {currentStep.soc.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-slate-400">
                {currentStep.batteryKw > 0
                  ? `+${currentStep.batteryKw.toFixed(1)} kW`
                  : currentStep.batteryKw < 0
                  ? `${currentStep.batteryKw.toFixed(1)} kW`
                  : 'Idle'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Temp: {currentStep.batteryTempC.toFixed(1)}°C | C-rate: {currentStep.cRate.toFixed(3)}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Throughput:</span>
            <span className="font-mono text-slate-200">{summary.totalThroughputKwh} kWh</span>
          </div>
        </div>

        {/* 4. Grid Exchange */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Grid Exchange</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-indigo-400">
              {currentStep.gridImportKw > 0
                ? `${currentStep.gridImportKw.toFixed(1)}`
                : `-${currentStep.gridExportKw.toFixed(1)}`}{' '}
              <span className="text-xs font-normal text-slate-400">kW</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {currentStep.gridImportKw > 0 ? 'Importing from EB' : 'Exporting to EB'}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Import:</span>
            <span className="font-mono text-slate-200">{summary.totalGridImportKwh} kWh</span>
          </div>
        </div>

        {/* 5. Electricity Cost */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tariff & Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ₹{summary.optimizedCost.toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Saving: ₹{summary.costSaving.toFixed(0)} ({summary.costSavingPct}%)
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>Rate ({currentStep.tariffBand}):</span>
            <span className="font-mono text-slate-200">₹{currentStep.tariffRate.toFixed(2)}/u</span>
          </div>
        </div>

        {/* 6. Carbon & Self-Sufficiency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Green Metrics</span>
            <Leaf className="w-4 h-4 text-green-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-green-400">
              {summary.avgSelfSufficiency.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Self-Sufficiency Ratio
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
            <span>CO₂ Avoided:</span>
            <span className="font-mono text-slate-200">{summary.co2Avoided.toFixed(0)} kg</span>
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Row 1) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Ring Buffer Telemetry Chart */}
        <ChartCard
          title="High-Frequency Telemetry Stream (Filtered vs Raw)"
          subtitle="Rolling median filter & linear interpolation (last 60 samples)"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liveStreamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="cleanSolarKw"
                name="Solar (Filtered)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cleanLoadKw"
                name="Load (Filtered)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cleanBatteryKw"
                name="Battery kW"
                stroke="#14b8a6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cleanGridKw"
                name="Grid Import kW"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 24-Hour LSTM Forecast Chart */}
        <ChartCard
          title="24-Hour LSTM Forecast (P10 / P50 / P90 Quantiles)"
          subtitle={`Solar MAPE: ${forecast.solarMetrics.mape}% | Load MAPE: ${forecast.loadMetrics.mape}%`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine
                x={currentStep.time}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{ value: 'NOW', fill: '#f43f5e', fontSize: 10, position: 'top' }}
              />
              <Area
                type="monotone"
                dataKey="predSolarP90"
                name="Solar P90"
                stroke="transparent"
                fill="#f59e0b"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="predSolarP50"
                name="Solar P50"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="actualSolar"
                name="Solar Actual"
                stroke="#eab308"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="predLoadP50"
                name="Load P50"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="actualLoad"
                name="Load Actual"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Grid (Row 2) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 24-Hour Lookahead Schedule */}
        <ChartCard
          title={`24-Hour Lookahead Dispatch Schedule (${dispatchPlan.mode})`}
          subtitle="Coordinated Solar, Battery, and Grid dispatch across ToU bands"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scheduleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine
                x={currentStep.time}
                stroke="#f43f5e"
                strokeDasharray="4 4"
              />
              <Bar dataKey="solarKw" name="Solar kW" fill="#f59e0b" stackId="gen" />
              <Bar dataKey="batteryKw" name="Battery (+disch / -chg)" fill="#14b8a6" />
              <Bar dataKey="gridKw" name="Grid Net kW" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Safety Guardrails & Intervention Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md h-[360px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Safety Guardrails & Physics Enforcement
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-3 text-xs">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">SoC Constraint</div>
                <div className="font-mono font-bold text-teal-400 mt-0.5">
                  [{config.socMin}%, {config.socMax}%]
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Inverter Limit</div>
                <div className="font-mono font-bold text-teal-400 mt-0.5">
                  ±{config.bessKw} kW
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Thermal Cutoff</div>
                <div className="font-mono font-bold text-amber-400 mt-0.5">
                  {config.cautionTempC}°C / {config.cutoffTempC}°C
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-300 mb-2">
              Recent Guardrail Interventions:
            </div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {interventions.length === 0 ? (
                <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>All setpoints within safe physical limits. Zero clamp interventions required.</span>
                </div>
              ) : (
                interventions.slice(-4).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>[{item.timeStr}] {item.details}</span>
                    </div>
                    <span className="font-mono text-amber-300">
                      {item.requestedKw.toFixed(1)} → {item.appliedKw.toFixed(1)} kW
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>Deterministic Seed: <code className="text-slate-300 font-mono">{config.seed}</code></span>
            <span>Location: <span className="text-slate-300">{config.site}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
