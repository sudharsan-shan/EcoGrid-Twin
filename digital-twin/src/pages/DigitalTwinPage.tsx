import React from 'react';
import { useEcoGridStore, ViewPreset } from '../sim/store';
import { CanvasContainer } from '../components/common/CanvasContainer';
import { SceneRoot } from '../scene/SceneRoot';
import { BUILDING_ROOMS } from '../sim/model';
import { 
  Layers, 
  Eye, 
  Home, 
  Activity, 
  Zap, 
  Sun, 
  BatteryCharging, 
  CheckCircle2, 
  Info,
  Maximize2
} from 'lucide-react';

export const DigitalTwinPage: React.FC = () => {
  const {
    dayResult,
    stepIndex,
    selectedId,
    selectItem,
    roofOpen,
    toggleRoof,
    viewPreset,
    setViewPreset,
    scenario,
  } = useEcoGridStore();

  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];
  const roomLoads = currentStep.roomLoads || {};

  // Find selected room definition if any
  const selectedRoomDef = BUILDING_ROOMS.find((r) => r.id === selectedId);
  const selectedRoomKw = selectedRoomDef
    ? roomLoads[selectedRoomDef.id] || (currentStep.loadKw * selectedRoomDef.weight)
    : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)] min-h-[550px]">
      {/* ── Left 3D Viewport ──────────────────────────────────────── */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col shadow-lg">
        {/* Floating Top Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          {/* Active Scenario Tag */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-slate-400">Scenario:</span>
            <span className="font-semibold text-slate-200 capitalize">
              {scenario.replace('_', ' ')}
            </span>
          </div>

          {/* Camera & Roof Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1 rounded-lg text-xs shadow-md">
            <button
              onClick={toggleRoof}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                roofOpen
                  ? 'bg-teal-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{roofOpen ? 'Roof Open' : 'Roof Closed'}</span>
            </button>

            {(['free', 'top', 'front'] as ViewPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setViewPreset(p)}
                className={`px-2 py-1 rounded capitalize transition ${
                  viewPreset === p
                    ? 'bg-slate-700 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div className="flex-1 w-full h-full">
          <CanvasContainer>
            <SceneRoot />
          </CanvasContainer>
        </div>

        {/* Floating Bottom Legend */}
        <div className="absolute bottom-3 left-3 pointer-events-none bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-2 rounded-lg text-[11px] flex items-center gap-4 text-slate-300 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Solar PV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span>BESS Battery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span>EB Grid Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Zone Loads</span>
          </div>
        </div>
      </div>

      {/* ── Right Inspector Panel ─────────────────────────────────── */}
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg overflow-y-auto">
        {selectedRoomDef ? (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">
                  {selectedRoomDef.floor.toUpperCase()} FLOOR
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-1">
                  {selectedRoomDef.name}
                </h3>
              </div>
              <button
                onClick={() => selectItem(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
              >
                Clear
              </button>
            </div>

            {/* Live Load Metric */}
            <div className="grid grid-cols-2 gap-2 my-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Current Load</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {selectedRoomKw.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">kW</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Facility Share</div>
                <div className="text-xl font-bold font-mono text-teal-400 mt-0.5">
                  {((selectedRoomKw / Math.max(1, currentStep.loadKw)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Attached Appliances List */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Room Appliances & Schedules</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {selectedRoomDef.appliances.length} items
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {selectedRoomDef.appliances.map((app) => (
                  <div
                    key={app.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div>
                        <div className="font-medium text-slate-200">{app.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          Type: {app.type} | Duty: {(app.dutyCycle * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-slate-300">
                      {app.nominalKw.toFixed(2)} kW
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Home className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Two-Floor Facility Hierarchy
              </h3>
            </div>
            <p className="text-xs text-slate-400 my-3 leading-relaxed">
              Click any room in the 3D model or choose from the list below to inspect live appliance schedules, floor loads, and attached bathrooms.
            </p>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ground Floor Zones
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {BUILDING_ROOMS.filter((r) => r.floor === 'ground').map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectItem(r.id)}
                      className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs transition flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate">{r.name}</span>
                      <span className="font-mono text-[11px] text-teal-400">
                        {((roomLoads[r.id] || (currentStep.loadKw * r.weight))).toFixed(1)}k
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  First Floor Zones
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {BUILDING_ROOMS.filter((r) => r.floor === 'first').map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectItem(r.id)}
                      className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs transition flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate">{r.name}</span>
                      <span className="font-mono text-[11px] text-teal-400">
                        {((roomLoads[r.id] || (currentStep.loadKw * r.weight))).toFixed(1)}k
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Facility Summary */}
        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex justify-between">
            <span>Total Building Demand:</span>
            <span className="font-mono font-bold text-cyan-400">{currentStep.loadKw.toFixed(1)} kW</span>
          </div>
          <div className="flex justify-between">
            <span>Rooftop Solar PV:</span>
            <span className="font-mono font-bold text-amber-400">{currentStep.solarKw.toFixed(1)} kW</span>
          </div>
          <div className="flex justify-between">
            <span>Utility BESS Power:</span>
            <span className="font-mono font-bold text-teal-400">{currentStep.batteryKw.toFixed(1)} kW</span>
          </div>
        </div>
      </div>
    </div>
  );
};
