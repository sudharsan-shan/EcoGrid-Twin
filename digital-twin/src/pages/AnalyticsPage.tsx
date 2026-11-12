import React from 'react';
import { useEcoGridStore } from '../sim/store';
import { ChartCard } from '../components/common/ChartCard';
import { 
  DollarSign, 
  Leaf, 
  Sun, 
  TrendingUp, 
  PieChart as PieIcon, 
  Clock, 
  Award 
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
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { dayResult, config } = useEcoGridStore();
  const steps = dayResult.steps;
  const summary = dayResult.summary;

  // Energy mix donut data
  const energyMixData = [
    { name: 'Direct Solar PV', value: summary.totalSolarKwh - summary.totalBatteryChargeKwh, color: '#f59e0b' },
    { name: 'BESS Battery Discharge', value: summary.totalBatteryDischargeKwh, color: '#14b8a6' },
    { name: 'Grid EB Import', value: summary.totalGridImportKwh, color: '#6366f1' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Metric Highlights ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Electricity Cost Saving</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{summary.costSaving.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.costSavingPct}% reduction vs ₹{summary.baselineCost.toFixed(0)} baseline
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Carbon Emission Avoided</span>
            <Leaf className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-400 mt-2">
            {summary.co2Avoided.toFixed(1)} kg
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.co2AvoidedPct}% avoided vs {summary.baselineCo2.toFixed(0)} kg baseline
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Renewable Self-Sufficiency</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {summary.avgSelfSufficiency.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Average facility renewable autonomy
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Peak Solar Irradiance</span>
            <Sun className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {summary.peakGhi} W/m²
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Daily integral: {summary.ghiIntegral} Wh/m² ({summary.tempMin}°C - {summary.tempMax}°C)
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Row 1) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative Cost Comparison */}
        <ChartCard
          title="Cumulative Electricity Cost (Baseline vs EcoGrid AI)"
          subtitle={`Final Cost: ₹${summary.optimizedCost.toFixed(0)} vs Baseline ₹${summary.baselineCost.toFixed(0)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={steps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" ₹" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="baselineCost"
                name="Baseline Cost (No BESS)"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="#f43f5e"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="EcoGrid AI Optimized"
                stroke="#10b981"
                strokeWidth={2}
                fill="#10b981"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Time-of-Use Tariff Bands */}
        <ChartCard
          title="Time-of-Use (ToU) Tariff Schedule & Grid Load"
          subtitle={`${config.tariff.category}: Peak ₹${config.tariff.peak}/u | Standard ₹${config.tariff.standard}/u | Off-Peak ₹${config.tariff.offpeak}/u`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={steps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} unit=" ₹" />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="tariffRate" name="Tariff (₹/kWh)" fill="#8b5cf6" opacity={0.6} />
              <Line yAxisId="right" type="monotone" dataKey="gridImportKw" name="Grid Import kW" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Grid (Row 2) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative Carbon Avoidance */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Cumulative CO₂ Emissions vs Baseline"
            subtitle={`Avoided: ${summary.co2Avoided} kg CO₂ (${summary.co2AvoidedPct}% reduction)`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={steps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" kg" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="baselineCo2"
                  name="Baseline CO₂"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="#ef4444"
                  fillOpacity={0.08}
                />
                <Area
                  type="monotone"
                  dataKey="co2"
                  name="EcoGrid Actual CO₂"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="#22c55e"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Energy Mix Donut */}
        <ChartCard
          title="Daily Energy Mix"
          subtitle="Breakdown of energy consumed by building"
        >
          <div className="h-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={energyMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {energyMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => `${val.toFixed(1)} kWh`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-300 w-full px-2">
              {energyMixData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span className="font-mono">{item.value.toFixed(1)} kWh</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
