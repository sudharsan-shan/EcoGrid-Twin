import React from 'react';
import { useEcoGridStore } from '../sim/store';
import { 
  Settings as SettingsIcon, 
  RotateCcw, 
  BatteryCharging, 
  Sun, 
  DollarSign, 
  Leaf, 
  CheckCircle2, 
  Shield 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { config, updateConfig, resetToPaperPreset, setToastMessage } = useEcoGridStore();

  const handleToggleBattery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    updateConfig({ hasBattery: checked });
    setToastMessage(checked ? 'BESS Battery enabled in simulation' : 'BESS Battery disabled in simulation');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Microgrid System Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Adjust site parameters, equipment sizing, ToU tariffs, and safety thresholds.
          </p>
        </div>

        <button
          onClick={resetToPaperPreset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Chennai Paper Preset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── 1. Solar PV & Site ───────────────────────────────────── */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sun className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Site & Rooftop Solar PV
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Site Location & Coordinates</label>
              <input
                type="text"
                value={config.site}
                onChange={(e) => updateConfig({ site: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={config.latitude}
                  onChange={(e) => updateConfig({ latitude: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={config.longitude}
                  onChange={(e) => updateConfig({ longitude: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">PV Rated Capacity (kWp)</label>
              <input
                type="number"
                step="1.0"
                value={config.pvKwp}
                onChange={(e) => updateConfig({ pvKwp: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-amber-300 font-mono font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">Benchmark: 120.0 kWp monocrystalline array</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Simulation Seed (Deterministic PRNG)</label>
              <input
                type="number"
                value={config.seed}
                onChange={(e) => updateConfig({ seed: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── 2. Battery Storage (BESS) ────────────────────────────── */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Battery Storage (BESS)
              </h3>
            </div>

            {/* BESS Installed Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
              <input
                type="checkbox"
                checked={config.hasBattery}
                onChange={handleToggleBattery}
                className="w-4 h-4 rounded text-teal-600 bg-slate-950 border-slate-700 accent-teal-500 focus:ring-0"
              />
              <span className={config.hasBattery ? 'text-teal-400' : 'text-slate-500'}>
                BESS Installed
              </span>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Capacity (kWh)</label>
                <input
                  type="number"
                  disabled={!config.hasBattery}
                  value={config.bessKwh}
                  onChange={(e) => updateConfig({ bessKwh: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-teal-300 font-mono font-bold disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Inverter Limit (kW)</label>
                <input
                  type="number"
                  disabled={!config.hasBattery}
                  value={config.bessKw}
                  onChange={(e) => updateConfig({ bessKw: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-teal-300 font-mono font-bold disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Min SoC (%)</label>
                <input
                  type="number"
                  disabled={!config.hasBattery}
                  value={config.socMin}
                  onChange={(e) => updateConfig({ socMin: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Max SoC (%)</label>
                <input
                  type="number"
                  disabled={!config.hasBattery}
                  value={config.socMax}
                  onChange={(e) => updateConfig({ socMax: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Initial SoC (%)</label>
                <input
                  type="number"
                  disabled={!config.hasBattery}
                  value={config.initialSoc}
                  onChange={(e) => updateConfig({ initialSoc: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Thermal Caution (°C)</label>
                <input
                  type="number"
                  value={config.cautionTempC}
                  onChange={(e) => updateConfig({ cautionTempC: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-amber-300 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Thermal Cutoff (°C)</label>
                <input
                  type="number"
                  value={config.cutoffTempC}
                  onChange={(e) => updateConfig({ cutoffTempC: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-rose-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Tariff & Commercial Schedule ──────────────────────── */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Electricity Tariff (LT-III-B Commercial)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Peak Rate (₹/u)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.tariff.peak}
                  onChange={(e) =>
                    updateConfig({
                      tariff: { ...config.tariff, peak: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-rose-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">06-09, 18-21</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Standard (₹/u)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.tariff.standard}
                  onChange={(e) =>
                    updateConfig({
                      tariff: { ...config.tariff, standard: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">Daytime normal</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Off-Peak (₹/u)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.tariff.offpeak}
                  onChange={(e) =>
                    updateConfig({
                      tariff: { ...config.tariff, offpeak: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-teal-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">22-05 night</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Feed-In Solar Export Tariff (₹/kWh)</label>
              <input
                type="number"
                step="0.1"
                value={config.tariff.feedin}
                onChange={(e) =>
                  updateConfig({
                    tariff: { ...config.tariff, feedin: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-emerald-300 font-mono"
              />
            </div>
          </div>
        </div>

        {/* ── 4. Environmental & Grid Decarbonization ───────────────── */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Leaf className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Grid Emissions & Decarbonization
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Regional Grid CO₂ Intensity Factor</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={config.co2Factor}
                  onChange={(e) => updateConfig({ co2Factor: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-green-300 font-mono font-bold"
                />
                <span className="text-slate-400 whitespace-nowrap">kg CO₂ / kWh</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Southern Regional Grid baseline: 0.72 kg CO₂/kWh
              </span>
            </div>

            <div className="p-3 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Preset Summary:</div>
              <div>• Location: Chennai (13.08°N, 80.27°E)</div>
              <div>• PV: 120 kWp monocrystalline with NOCT thermal derating</div>
              <div>• BESS: 250 kWh / 60 kW Thevenin equivalent circuit</div>
              <div>• Safety: SoC [15%, 95%], Caution 45°C, Cutoff 55°C</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
