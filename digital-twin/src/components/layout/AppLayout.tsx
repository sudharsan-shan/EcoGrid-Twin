import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useEcoGridStore, SimScenario } from '../../sim/store';
import { DispatchMode } from '../../sim/dispatch';
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  Cpu, 
  Layers, 
  BarChart3, 
  BatteryCharging, 
  CheckCircle2, 
  Settings as SettingsIcon,
  Zap,
  Activity
} from 'lucide-react';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const {
    config,
    scenario,
    dispatchMode,
    dayResult,
    stepIndex,
    playing,
    speedMultiplier,
    tick,
    setPlaying,
    setSpeed,
    scrubTo,
    setScenario,
    setDispatchMode,
    resetToPaperPreset,
    toastMessage,
    setToastMessage,
  } = useEcoGridStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (playing) {
      const ms = Math.max(100, Math.floor(1000 / speedMultiplier));
      intervalRef.current = setInterval(tick, ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speedMultiplier, tick]);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage, setToastMessage]);

  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];

  const navLinks = [
    { to: '/', label: 'Overview', icon: BarChart3 },
    { to: '/twin', label: 'Digital Twin (3D)', icon: Layers },
    { to: '/analytics', label: 'Analytics', icon: Activity },
    { to: '/battery', label: 'PINN Battery', icon: BatteryCharging },
    { to: '/validation', label: 'System Evaluation', icon: CheckCircle2 },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-6">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                  EcoGrid-Twin
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
                  v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-teal-300 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right Status Badges & Simulated Time */}
        <div className="flex items-center gap-3">
          {/* Simulation Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              playing
                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                : 'bg-amber-950/80 border-amber-700/60 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                playing ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{playing ? 'SIMULATION (LIVE)' : 'PAUSED'}</span>
          </div>

          {/* Seed Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>Seed: {config.seed}</span>
          </div>

          {/* Simulated Clock (Never real time) */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-teal-500/30 text-teal-300 font-mono text-sm shadow-inner">
            <span className="text-xs text-slate-500">IST</span>
            <span className="font-bold tracking-wider">{currentStep.time}</span>
            <span className="text-[11px] text-slate-400">
              [Step {stepIndex + 1}/96]
            </span>
          </div>
        </div>
      </header>

      {/* ── Playback & Scenario Control Bar ──────────────────────── */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs z-20">
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying(!playing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition shadow-sm ${
              playing
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-teal-600 hover:bg-teal-500 text-white'
            }`}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center bg-slate-800 rounded border border-slate-700 p-0.5">
            {([1, 2, 5, 10] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2 py-1 rounded text-xs font-mono transition ${
                  speedMultiplier === spd
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="font-mono text-slate-400 text-[11px]">00:00</span>
            <input
              type="range"
              min={0}
              max={95}
              value={stepIndex}
              onChange={(e) => scrubTo(Number(e.target.value))}
              className="w-full accent-teal-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-slate-400 text-[11px]">23:45</span>
          </div>
        </div>

        {/* Scenario & Dispatch Selectors */}
        <div className="flex items-center gap-3">
          {/* Scenario Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Scenario:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as SimScenario)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="normal">Baseline Normal Day</option>
              <option value="heavy_cloud">Heavy Cloud Cover (90%)</option>
              <option value="load_surge">Industrial Load Surge (1.9x)</option>
              <option value="battery_failure">BESS Inverter Failure</option>
            </select>
          </div>

          {/* Dispatch Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Optimization:</span>
            <select
              value={dispatchMode}
              onChange={(e) => setDispatchMode(e.target.value as DispatchMode)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="AUTO_AI">AUTO AI (ToU Arbitrage)</option>
              <option value="PEAK_SHAVING">Peak Shaving</option>
              <option value="MAX_RENEWABLE">Max Renewable Self-Use</option>
              <option value="ISLANDED">Islanded Microgrid</option>
            </select>
          </div>

          {/* Paper Preset Quick Button */}
          <button
            onClick={resetToPaperPreset}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Reset to Chennai Paper Presets"
          >
            <RotateCcw className="w-3 h-3 text-teal-400" />
            <span>Preset</span>
          </button>
        </div>
      </div>

      {/* ── Main Body with Error Boundary ─────────────────────────── */}
      <main className="flex-1 flex flex-col p-4 overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ── Toast Notification ────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-teal-500/60 text-slate-100 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs animate-bounce font-medium">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
