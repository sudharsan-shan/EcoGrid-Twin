import React from 'react';
import { Eye, Layers, Sparkles } from 'lucide-react';
import { useEcoGridStore, ViewPreset } from '../sim/store';

export const FloatingControls: React.FC = () => {
  const roofOpen = useEcoGridStore((s) => s.roofOpen);
  const toggleRoof = useEcoGridStore((s) => s.toggleRoof);
  const viewPreset = useEcoGridStore((s) => s.viewPreset);
  const setViewPreset = useEcoGridStore((s) => s.setViewPreset);
  const scenario = useEcoGridStore((s) => s.scenario);
  const hoveredId = useEcoGridStore((s) => s.hoveredId);

  return (
    <>
      {/* Top Banner & Preset Controls */}
      <div className="floating-overlay-top">
        <div className="scenario-banner">
          <Sparkles size={14} color="var(--color-teal)" />
          <span>Scenario:</span>
          <strong style={{ textTransform: 'capitalize' }}>{scenario.replace('_', ' ')}</strong>
        </div>

        <div className="scene-tools">
          <div className="tool-group">
            <button
              className={`btn-tool ${roofOpen ? 'active' : ''}`}
              onClick={toggleRoof}
              title="Toggle roof cutaway view"
              aria-label="Toggle roof"
            >
              <Layers size={14} />
              <span>{roofOpen ? 'Roof open' : 'Roof closed'}</span>
            </button>
          </div>

          <div className="tool-group" role="group" aria-label="Camera presets">
            {(['free', 'top', 'front'] as ViewPreset[]).map((preset) => (
              <button
                key={preset}
                className={`btn-tool ${viewPreset === preset ? 'active' : ''}`}
                onClick={() => setViewPreset(preset)}
                title={`Set camera to ${preset} preset`}
              >
                <Eye size={13} />
                <span style={{ textTransform: 'capitalize' }}>{preset}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Tooltip in 3D Scene */}
      {hoveredId && (
        <div className="scene-tooltip" style={{ top: '35%', left: '45%' }}>
          <strong>{hoveredId.toUpperCase()}</strong> selected
        </div>
      )}

      {/* Floating Energy-Flow Legend */}
      <div className="floating-legend" role="region" aria-label="Energy flow legend">
        <div className="legend-item">
          <span className="legend-dot dot-teal" />
          <span>Supply & Storage</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-purple" />
          <span>Building Load</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-amber" />
          <span>Grid Import</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-green" />
          <span>Grid Export</span>
        </div>
      </div>
    </>
  );
};
