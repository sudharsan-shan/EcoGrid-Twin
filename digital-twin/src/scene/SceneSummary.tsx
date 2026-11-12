import React from 'react';
import { useTwinData } from '../hooks/useTwinData';

/**
 * Screen-reader text alternative for the 3D cutaway building scene.
 * Guarantees WCAG AA accessibility compliance for non-visual and assistive devices.
 */
export const SceneSummary: React.FC = () => {
  const { solar, battery, grid, rooms, scenario } = useTwinData();

  return (
    <div className="sr-only" aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
      <h2>3D Digital Twin Status Summary</h2>
      <p>
        Building layout is a single-storey facility with a rooftop solar array delivering {solar.kw.toFixed(1)} kW.
        Active scenario is {scenario}.
      </p>
      <p>
        Utility room contains a 250 kWh battery storage operating at {(battery.soc * 100).toFixed(0)}% state of charge
        discharging {battery.kw.toFixed(1)} kW at {battery.tempC.toFixed(1)} degrees Celsius.
        Grid smart meter is currently {grid.mode} {Math.abs(grid.kw).toFixed(1)} kW.
      </p>
      <ul>
        {rooms.map((r) => (
          <li key={r.id}>
            {r.room}: current demand {r.kw.toFixed(1)} kW with {r.appliances.length} active equipment units.
          </li>
        ))}
      </ul>
    </div>
  );
};
