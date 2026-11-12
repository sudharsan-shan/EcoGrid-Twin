import { useSimStore } from '../../store/simStore';

const SPEEDS: Array<1 | 10 | 60> = [1, 10, 60];

function padZ(n: number) { return String(Math.floor(n)).padStart(2, '0'); }

export default function SimControls() {
  const state = useSimStore(s => s.state);
  const setPlaying = useSimStore(s => s.setPlaying);
  const setSpeed = useSimStore(s => s.setSpeed);
  const scrubTo = useSimStore(s => s.scrubTo);
  const reset = useSimStore(s => s.reset);

  const hours = Math.floor(state.timeMs / 3600000);
  const mins = Math.floor((state.timeMs % 3600000) / 60000);
  const timeStr = `${padZ(hours)}:${padZ(mins)}`;

  return (
    <div className="sim-controls">
      <div className="sim-time">{timeStr}</div>

      <button
        className="ctrl-btn"
        onClick={reset}
        title="Reset to midnight"
        aria-label="Reset simulation"
      >⏮</button>

      <button
        className={`ctrl-btn play-btn ${state.playing ? 'playing' : ''}`}
        onClick={() => setPlaying(!state.playing)}
        aria-label={state.playing ? 'Pause' : 'Play'}
      >
        {state.playing ? '⏸' : '▶'}
      </button>

      <div className="speed-btns">
        {SPEEDS.map(s => (
          <button
            key={s}
            className={`ctrl-btn speed-btn ${state.speedMultiplier === s ? 'active' : ''}`}
            onClick={() => setSpeed(s)}
            aria-label={`Speed x${s}`}
          >
            ×{s}
          </button>
        ))}
      </div>

      <div className="scrubber-wrap">
        <span className="scrub-label">Step {state.stepIndex + 1}/96</span>
        <input
          type="range"
          min={0}
          max={95}
          value={state.stepIndex}
          onChange={e => scrubTo(Number(e.target.value))}
          className="scrubber"
          aria-label="Time scrubber"
          style={{
            background: `linear-gradient(90deg, var(--accent-cyan) ${(state.stepIndex / 95) * 100}%, var(--border) ${(state.stepIndex / 95) * 100}%)`
          }}
        />
      </div>
    </div>
  );
}
