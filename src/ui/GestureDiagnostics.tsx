import { useEffect, useRef, useState } from "react";
import { PoseInput } from "../input/poseInput";
import { gestureConfig } from "../input/gestures";
import { type PlayerSignals } from "../input/playerManager";
import { type Action } from "../input/types";

/** One live signal row: a bar with the firing threshold marked, lit when on. */
function Meter({
  label,
  value,
  threshold,
  on,
  /** Full-scale value for the bar (so the threshold sits sensibly inside it). */
  scale,
  /** Signed bars (lean) center at zero. */
  signed = false,
}: {
  label: string;
  value: number;
  threshold: number;
  on: boolean;
  scale: number;
  signed?: boolean;
}) {
  const frac = (v: number) => Math.max(0, Math.min(1, (signed ? Math.abs(v) : v) / scale));
  const tFrac = Math.max(0, Math.min(1, threshold / scale));
  return (
    <div className="diag-row">
      <span className={`diag-label${on ? " on" : ""}`}>{label}</span>
      <div className="diag-bar">
        <div className={`diag-fill${on ? " on" : ""}`} style={{ width: `${frac(value) * 100}%` }} />
        <div className="diag-thresh" style={{ left: `${tFrac * 100}%` }} />
      </div>
      <span className="diag-num">{value.toFixed(2)}</span>
    </div>
  );
}

/**
 * In-game gesture diagnostics. Same live signals the Gesture Lab tunes, but
 * overlaid during play so you can see whether a jump / lean is actually crossing
 * its threshold and firing. Toggle with the button or the `d` key.
 */
export function GestureDiagnostics({ pose, numPlayers }: { pose: PoseInput; numPlayers: number }) {
  const [open, setOpen] = useState(true);
  const [sig, setSig] = useState<PlayerSignals[]>(() => pose.signals());
  const [acts, setActs] = useState<Set<Action>[]>(() => pose.snapshot());
  const [dbg, setDbg] = useState(() => pose.debug());
  const rafRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      setSig(pose.signals());
      setActs(pose.snapshot());
      setDbg(pose.debug());
    };
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [pose, open]);

  if (!open) {
    return (
      <button className="diag-toggle" onClick={() => setOpen(true)}>
        🔍 diagnostics (d)
      </button>
    );
  }

  return (
    <div className="diag-panel">
      <div className="diag-head">
        <span>gesture diagnostics</span>
        <button className="diag-close" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <div className={`diag-status${dbg.error ? " err" : dbg.poseCount ? " ok" : " warn"}`}>
        {dbg.error
          ? `error: ${dbg.error}`
          : `bodies: ${dbg.poseCount} · frames: ${dbg.detections}`}
      </div>
      {Array.from({ length: numPlayers }, (_, i) => {
        const s = sig[i] ?? { jumpAmt: 0, duckAmt: 0, lean: 0, ready: false };
        const a = acts[i] ?? new Set<Action>();
        return (
          <div key={i} className="diag-player">
            <div className="diag-ptitle">
              P{i + 1}
              {!s.ready && <span className="diag-cal"> · calibrating…</span>}
            </div>
            <Meter label="JUMP" value={s.jumpAmt} threshold={gestureConfig.jumpRise} on={a.has("jump")} scale={0.5} />
            <Meter label="DUCK" value={s.duckAmt} threshold={gestureConfig.duckDrop} on={a.has("duck")} scale={0.5} />
            <Meter
              label={s.lean > 0.04 ? "LEAN ▶" : s.lean < -0.04 ? "◀ LEAN" : "LEAN"}
              value={s.lean}
              threshold={gestureConfig.leanRatio}
              on={a.has("left") || a.has("right")}
              scale={0.6}
              signed
            />
          </div>
        );
      })}
    </div>
  );
}
