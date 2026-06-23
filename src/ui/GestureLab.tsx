import { useEffect, useRef, useState } from "react";
import { PoseInput } from "../input/poseInput";
import { type PlayerSignals } from "../input/playerManager";
import { gestureConfig, resetGestureConfig, type GestureConfig } from "../input/gestures";
import { CameraPreview } from "./CameraPreview";

interface Row {
  key: keyof GestureConfig;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: (s: PlayerSignals) => number;
}

const ROWS: Row[] = [
  { key: "jumpRise", label: "Jump", hint: "hips rise above rest", min: 0.05, max: 0.8, value: (s) => s.jumpAmt },
  { key: "duckDrop", label: "Duck", hint: "hips drop below rest", min: 0.05, max: 0.8, value: (s) => s.duckAmt },
  { key: "leanRatio", label: "Lean", hint: "torso tilt", min: 0.1, max: 0.7, value: (s) => Math.abs(s.lean) },
  { key: "grabRaise", label: "Grab", hint: "hand above shoulders", min: -0.1, max: 0.8, value: (s) => s.grab },
];

const SCALE = 0.9; // bar full-scale in signal units

export function GestureLab({ pose, onExit }: { pose: PoseInput; onExit: () => void }) {
  const [, force] = useState(0);
  const [sig, setSig] = useState<PlayerSignals>({ jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false });
  const [recording, setRecording] = useState(false);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const recRef = useRef<{ until: number; max: Record<string, number> } | null>(null);

  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const s = pose.signals()[0];
      if (!s) return;
      const rec = recRef.current;
      if (rec) {
        for (const r of ROWS) rec.max[r.key] = Math.max(rec.max[r.key] ?? 0, r.value(s));
        if (now >= rec.until) {
          setSummary({ ...rec.max });
          recRef.current = null;
          setRecording(false);
        }
      }
      if (now - lastUi > 60) {
        lastUi = now;
        setSig(s);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pose]);

  const setCfg = (key: keyof GestureConfig, v: number) => {
    gestureConfig[key] = v;
    force((n) => n + 1);
  };

  const startRecording = () => {
    setSummary(null);
    recRef.current = { until: performance.now() + 6000, max: {} };
    setRecording(true);
  };

  const applySuggested = () => {
    if (!summary) return;
    for (const r of ROWS) {
      const peak = summary[r.key] ?? 0;
      // Fire at ~55% of your observed peak, clamped to the slider range.
      const v = Math.min(r.max, Math.max(r.min, peak * 0.55));
      gestureConfig[r.key] = v;
    }
    force((n) => n + 1);
  };

  return (
    <div className="lab">
      <div className="lab-head">
        <h2>Gesture Lab</h2>
        <button className="btn-secondary" onClick={onExit}>
          Back to menu
        </button>
      </div>
      <p className="lab-sub">
        Stand still for a second to set your resting pose, then try each move. Drag a slider to change
        its sensitivity (lower = easier), or record yourself and auto-suggest thresholds.
      </p>

      <div className="lab-grid">
        <CameraPreview pose={pose} numPlayers={1} />

        <div className="lab-panel">
          {!sig.ready && <div className="lab-note">Waiting for a body in frame…</div>}
          {ROWS.map((r) => {
            const v = r.value(sig);
            const thr = gestureConfig[r.key];
            const active = v > thr;
            // Lean always shows which way you're tilting (even below threshold),
            // so you can confirm direction; it turns green when it actually fires.
            const chip =
              r.key === "leanRatio"
                ? Math.abs(sig.lean) < 0.04
                  ? "—"
                  : sig.lean > 0
                    ? "RIGHT ▶"
                    : "◀ LEFT"
                : active
                  ? "ON"
                  : "—";
            return (
              <div key={r.key} className={`lab-row${active ? " active" : ""}`}>
                <div className="lab-row-top">
                  <span className="lab-row-label">
                    {r.label} <em>{r.hint}</em>
                  </span>
                  <span className={`lab-chip${active ? " on" : ""}`}>{chip}</span>
                </div>
                <div className="lab-bar">
                  <div className="lab-bar-fill" style={{ width: `${clampPct(v / SCALE)}%` }} />
                  <div className="lab-bar-threshold" style={{ left: `${clampPct(thr / SCALE)}%` }} />
                </div>
                <div className="lab-controls">
                  <input
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={0.01}
                    value={thr}
                    onChange={(e) => setCfg(r.key, Number(e.target.value))}
                  />
                  <span className="lab-val">{thr.toFixed(2)}</span>
                  {summary && <span className="lab-peak">peak {(summary[r.key] ?? 0).toFixed(2)}</span>}
                </div>
              </div>
            );
          })}

          <div className="lab-actions">
            <button className="btn-secondary" onClick={() => pose.recalibrate()}>
              Recalibrate rest
            </button>
            <button className="btn-primary" onClick={startRecording} disabled={recording}>
              {recording ? "Recording… move now!" : "Record 6s"}
            </button>
            <button className="btn-secondary" onClick={applySuggested} disabled={!summary}>
              Apply suggested
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                resetGestureConfig();
                force((n) => n + 1);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clampPct(x: number): number {
  return Math.max(0, Math.min(100, x * 100));
}
