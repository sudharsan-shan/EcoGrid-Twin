import React from 'react';
import { useEcoGridStore } from '../sim/store';
import { PAPER_REFERENCE } from '../sim/config';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Download, 
  FileSpreadsheet, 
  Award,
  Layers,
  BarChart2
} from 'lucide-react';

interface RowComparison {
  metric: string;
  paper: number;
  sim: number;
  unit: string;
}

export const ValidationPage: React.FC = () => {
  const { dayResult, forecast, pinn, config } = useEcoGridStore();
  const summary = dayResult.summary;

  function calcDelta(sim: number, paper: number): { deltaPct: number; status: 'PASS' | 'WARN' | 'FAIL' } {
    if (paper === 0) {
      return { deltaPct: 0, status: 'PASS' };
    }
    const deltaPct = Number((((sim - paper) / Math.abs(paper)) * 100).toFixed(2));
    const abs = Math.abs(deltaPct);
    if (abs <= 5.0) return { deltaPct, status: 'PASS' };
    if (abs <= 15.0) return { deltaPct, status: 'WARN' };
    return { deltaPct, status: 'FAIL' };
  }

  // Table 2: Daily Energy Balance
  const table2Rows: RowComparison[] = [
    { metric: 'Total Solar Generation', paper: PAPER_REFERENCE.table2.solar, sim: summary.totalSolarKwh, unit: 'kWh' },
    { metric: 'Total Facility Load', paper: PAPER_REFERENCE.table2.load, sim: summary.totalLoadKwh, unit: 'kWh' },
    { metric: 'Peak Solar Output', paper: PAPER_REFERENCE.table2.peakSolar, sim: summary.peakSolarKw, unit: 'kW' },
    { metric: 'Peak Facility Demand', paper: PAPER_REFERENCE.table2.peakLoad, sim: summary.peakLoadKw, unit: 'kW' },
    { metric: 'EB Grid Import', paper: PAPER_REFERENCE.table2.gridImport, sim: summary.totalGridImportKwh, unit: 'kWh' },
    { metric: 'Battery Discharge', paper: PAPER_REFERENCE.table2.batteryDischarge, sim: summary.totalBatteryDischargeKwh, unit: 'kWh' },
  ];

  // Table 3: Battery Profile
  const table3Rows: RowComparison[] = [
    { metric: 'Initial SoC', paper: PAPER_REFERENCE.table3.initialSoc, sim: summary.initialSoc, unit: '%' },
    { metric: 'Final SoC', paper: PAPER_REFERENCE.table3.finalSoc, sim: summary.finalSoc, unit: '%' },
    { metric: 'SoC Swing (Max - Min)', paper: PAPER_REFERENCE.table3.swing, sim: summary.socSwing, unit: '%' },
    { metric: 'Peak Temperature', paper: PAPER_REFERENCE.table3.peakTemp, sim: summary.peakBatteryTempC, unit: '°C' },
    { metric: 'Max C-rate', paper: PAPER_REFERENCE.table3.maxCrate, sim: summary.maxCrate, unit: '' },
    { metric: 'Daily Throughput', paper: PAPER_REFERENCE.table3.throughput, sim: summary.totalThroughputKwh, unit: 'kWh' },
    { metric: 'Equivalent Full Cycles', paper: PAPER_REFERENCE.table3.cycles, sim: summary.equivalentCycles, unit: 'cyc' },
  ];

  // Table 4: Economic Dispatch
  const table4Rows: RowComparison[] = [
    { metric: 'Baseline Cost (No BESS)', paper: PAPER_REFERENCE.table4.baseline, sim: summary.baselineCost, unit: '₹' },
    { metric: 'EcoGrid AI Cost', paper: PAPER_REFERENCE.table4.optimized, sim: summary.optimizedCost, unit: '₹' },
    { metric: 'Cost Savings', paper: PAPER_REFERENCE.table4.saving, sim: summary.costSaving, unit: '₹' },
    { metric: 'Savings Percentage', paper: PAPER_REFERENCE.table4.savingPct, sim: summary.costSavingPct, unit: '%' },
    { metric: 'Peak Tariff Import', paper: PAPER_REFERENCE.table4.peakImport, sim: summary.peakImportKwh, unit: 'kWh' },
    { metric: 'Off-Peak Tariff Import', paper: PAPER_REFERENCE.table4.offpeakImport, sim: summary.offpeakImportKwh, unit: 'kWh' },
  ];

  // Table 5: Forecast Accuracy
  const table5Rows: RowComparison[] = [
    { metric: 'Solar Forecast MAPE', paper: PAPER_REFERENCE.table5.solar.mape, sim: forecast.solarMetrics.mape, unit: '%' },
    { metric: 'Solar Forecast RMSE', paper: PAPER_REFERENCE.table5.solar.rmse, sim: forecast.solarMetrics.rmse, unit: 'kW' },
    { metric: 'Solar R² Accuracy', paper: PAPER_REFERENCE.table5.solar.r2, sim: forecast.solarMetrics.r2, unit: '' },
    { metric: 'Load Forecast MAPE', paper: PAPER_REFERENCE.table5.load.mape, sim: forecast.loadMetrics.mape, unit: '%' },
    { metric: 'Load Forecast RMSE', paper: PAPER_REFERENCE.table5.load.rmse, sim: forecast.loadMetrics.rmse, unit: 'kW' },
    { metric: 'Load R² Accuracy', paper: PAPER_REFERENCE.table5.load.r2, sim: forecast.loadMetrics.r2, unit: '' },
  ];

  // Table 6: PINN State Estimation
  const table6Rows: RowComparison[] = [
    { metric: 'Mean Physics Residual', paper: PAPER_REFERENCE.table6.meanResidual, sim: pinn.metrics.meanResidual, unit: '' },
    { metric: 'Mean Confidence Score', paper: PAPER_REFERENCE.table6.meanConfidence, sim: pinn.metrics.meanConfidence, unit: '' },
    { metric: 'Confidence >0.95 Share', paper: PAPER_REFERENCE.table6.above95, sim: pinn.metrics.above95Pct, unit: '%' },
    { metric: 'Mean SoC Estimation Error', paper: PAPER_REFERENCE.table6.meanSocErr, sim: pinn.metrics.meanSocErr, unit: '%' },
    { metric: 'Physics Anomalies Detected', paper: PAPER_REFERENCE.table6.anomalies, sim: pinn.metrics.anomalyCount, unit: 'events' },
  ];

  // Table 10: Environmental & Autonomy
  const table10Rows: RowComparison[] = [
    { metric: 'Baseline CO₂ Emissions', paper: PAPER_REFERENCE.table10.baselineCo2, sim: summary.baselineCo2, unit: 'kg' },
    { metric: 'Actual CO₂ Emissions', paper: PAPER_REFERENCE.table10.actualCo2, sim: summary.actualCo2, unit: 'kg' },
    { metric: 'Avoided CO₂ Emissions', paper: PAPER_REFERENCE.table10.avoided, sim: summary.co2Avoided, unit: 'kg' },
    { metric: 'Avoided CO₂ Percentage', paper: PAPER_REFERENCE.table10.avoidedPct, sim: summary.co2AvoidedPct, unit: '%' },
    { metric: 'Facility Self-Sufficiency', paper: PAPER_REFERENCE.table10.selfSuffAvg, sim: summary.avgSelfSufficiency, unit: '%' },
  ];

  const allSections = [
    { id: 't2', title: 'Table 2: Canonical Daily Energy Balance', rows: table2Rows },
    { id: 't3', title: 'Table 3: Battery (BESS) Operating Characteristics', rows: table3Rows },
    { id: 't4', title: 'Table 4: Economic Dispatch & Tariff Arbitrage', rows: table4Rows },
    { id: 't5', title: 'Table 5: 24-Hour LSTM Forecast Accuracy Metrics', rows: table5Rows },
    { id: 't6', title: 'Table 6: PINN Physics-Loss Residuals & Confidence', rows: table6Rows },
    { id: 't10', title: 'Table 10: Environmental Decarbonization & Autonomy', rows: table10Rows },
  ];

  // Overall Pass count
  let totalMetrics = 0;
  let passCount = 0;
  allSections.forEach((sec) => {
    sec.rows.forEach((r) => {
      totalMetrics++;
      if (calcDelta(r.sim, r.paper).status === 'PASS') passCount++;
    });
  });

  // Export 96-step CSV
  const handleExportCsv = () => {
    const headers = [
      'Step',
      'Time',
      'Solar_kW',
      'Load_kW',
      'Battery_kW',
      'Grid_Import_kW',
      'Grid_Export_kW',
      'SoC_pct',
      'Battery_Temp_C',
      'Tariff_Band',
      'Tariff_Rate',
      'Cost_INR',
      'CO2_kg',
    ];
    const rows = dayResult.steps.map((s) => [
      s.step,
      s.time,
      s.solarKw,
      s.loadKw,
      s.batteryKw,
      s.gridImportKw,
      s.gridExportKw,
      s.soc,
      s.batteryTempC,
      s.tariffBand,
      s.tariffRate,
      s.cost,
      s.co2,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecogrid_twin_simulation_seed_${config.seed}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Export Actions ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-slate-100">
              System Evaluation & Paper Calibration
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic verification of simulation outputs against benchmark paper references (Tables 2–10).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Pass Rate: {passCount} / {totalMetrics} ({((passCount / totalMetrics) * 100).toFixed(0)}%)</span>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export 96-Step CSV</span>
          </button>
        </div>
      </div>

      {/* ── Verification Tables ────────────────────────────────────── */}
      <div className="space-y-6">
        {allSections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md"
          >
            <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                {section.title}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Tolerance: PASS ≤5% | WARN ≤15% | FAIL &gt;15%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/40 text-slate-400 border-b border-slate-800/80 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Metric / Parameter</th>
                    <th className="py-2.5 px-4">Paper Reference</th>
                    <th className="py-2.5 px-4">Simulated Output</th>
                    <th className="py-2.5 px-4">Unit</th>
                    <th className="py-2.5 px-4">Calculated Delta %</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {section.rows.map((row, idx) => {
                    const { deltaPct, status } = calcDelta(row.sim, row.paper);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-300">
                          {row.metric}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {row.paper.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-teal-300 font-bold">
                          {row.sim.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-sans">
                          {row.unit || '—'}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-bold ${
                            status === 'PASS'
                              ? 'text-emerald-400'
                              : status === 'WARN'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              status === 'PASS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : status === 'WARN'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {status === 'PASS' && <CheckCircle2 className="w-3 h-3" />}
                            {status === 'WARN' && <AlertCircle className="w-3 h-3" />}
                            {status === 'FAIL' && <XCircle className="w-3 h-3" />}
                            <span>{status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
