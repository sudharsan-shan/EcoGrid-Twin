import React from 'react';
import { useEcoGridStore } from '../sim/store';
import { ChartCard } from '../components/common/ChartCard';
import { 
  Battery, 
  BatteryCharging, 
  Thermometer, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck 
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
  ReferenceLine
} from 'recharts';

export const BatteryPage: React.FC = () => {
  const { dayResult, pinn, config } = useEcoGridStore();
  const steps = dayResult.steps;
  const summary = dayResult.summary;
  const pinnMetrics = pinn.metrics;
  const pinnPoints = pinn.points;

  return (
    <div className="space-y-6">
      {/* ── BESS & PINN KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SoC Swing (Table 3)</span>
            <Battery className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-400 mt-2">
            {summary.socSwing}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Init: {summary.initialSoc}% → Final: {summary.finalSoc}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Peak Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {summary.peakBatteryTempC.toFixed(1)}°C
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Caution Limit: {config.cautionTempC}°C
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Max C-Rate / Cycles</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {summary.maxCrate.toFixed(3)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.equivalentCycles} Equiv Cycles ({summary.totalThroughputKwh} kWh)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mean Physics Residual</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
            {pinnMetrics.meanResidual}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Max Residual: {pinnMetrics.maxResidual}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>PINN Confidence Score</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {pinnMetrics.meanConfidence}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            &gt;95% Share: {pinnMetrics.above95Pct}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mean SoC Error</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {pinnMetrics.meanSocErr}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Anomalies Detected: {pinnMetrics.anomalyCount}
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Row 1) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SoC Trajectory with Safety Bounds */}
        <ChartCard
          title="BESS State of Charge (SoC) Trajectory vs PINN Estimate"
          subtitle={`Bound limits [${config.socMin}%, ${config.socMax}%] | Initial ${config.initialSoc}%`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pinnPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={config.socMin} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Min ${config.socMin}%`, fill: '#ef4444', fontSize: 10 }} />
              <ReferenceLine y={config.socMax} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Max ${config.socMax}%`, fill: '#ef4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="actualSoc"
                name="Physical SoC (%)"
                stroke="#14b8a6"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pinnSoc"
                name="PINN Estimated SoC (%)"
                stroke="#c084fc"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Battery Thermal Rise */}
        <ChartCard
          title="Battery Thermal Response vs Ambient Temperature"
          subtitle={`Peak Temp: ${summary.peakBatteryTempC.toFixed(1)}°C | Caution: ${config.cautionTempC}°C | Cutoff: ${config.cutoffTempC}°C`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pinnPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" domain={[15, 60]} tick={{ fontSize: 10 }} unit="°C" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={config.cautionTempC} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Caution ${config.cautionTempC}°C`, fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={config.cutoffTempC} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Cutoff ${config.cutoffTempC}°C`, fill: '#ef4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="tempC"
                name="Battery Internal Temp (°C)"
                stroke="#f97316"
                strokeWidth={2.2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Grid (Row 2) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Battery Power & Inverter Limits */}
        <ChartCard
          title="Battery Power & C-Rate Operating Profile"
          subtitle={`Max Inverter: ±${config.bessKw} kW | Max Discharge: ${summary.maxDischargeKw} kW | Max Charge: ${summary.maxChargeKw} kW`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={steps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis stroke="#64748b" domain={[-config.bessKw - 5, config.bessKw + 5]} tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={config.bessKw} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={-config.bessKw} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="batteryKw" name="Battery kW (+disch / -chg)" fill="#0d9488" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* PINN Physics Residual & Confidence */}
        <ChartCard
          title="PINN Physics Residual & Model Confidence"
          subtitle={`Mean Residual: ${pinnMetrics.meanResidual} | Confidence: ${pinnMetrics.meanConfidence} | Anomalies: ${pinnMetrics.anomalyCount}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pinnPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval={7} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" domain={[0.6, 1.05]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine yAxisId="left" y={0.5} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Anomaly Thresh (0.5)', fill: '#f43f5e', fontSize: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="residual" name="Physics Residual R(t)" stroke="#f43f5e" strokeWidth={1.8} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="confidence" name="Confidence C(t)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
