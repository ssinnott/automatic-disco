/**
 * Player slots keyed by screen ZONE, not by a tracker id. That is what makes
 * multiplayer robust to players crossing over: the person on the left is always
 * P1. Each zone keeps its own smoothing + a learned resting-pose baseline.
 *
 * Jump/duck are detected as hip displacement from that baseline (in torso
 * heights); lean and grab are instantaneous. Thresholds come from the live
 * `gestureConfig` so the Gesture Lab can tune them on the fly.
 */
import { OneEuroFilter } from "../pose/oneEuro";
import { centroidX, torsoHeight, type Pose } from "../pose/landmarks";
import { gestureConfig, hipY, leanOffset, wristRaise } from "./gestures";
import { type Action, type PlayerActions } from "./types";

/** Raw per-player signals, surfaced for the debug / tuning UI. */
export interface PlayerSignals {
  /** Hips risen above rest, in torso heights (drives jump). */
  jumpAmt: number;
  /** Hips dropped below rest, in torso heights (drives duck). */
  duckAmt: number;
  /** Signed lean offset (drives left/right). */
  lean: number;
  /** Higher wrist above shoulders, in torso heights (drives grab). */
  grab: number;
  /** Whether a baseline has been learned yet. */
  ready: boolean;
}

const BASELINE_ALPHA = 0.05; // how fast the resting baseline tracks (near rest)
const REST_BAND = 0.15; // only re-learn baseline when within this of rest (torso)
const HOLD_S = 0.4; // a fired gesture lingers this long, for forgiving timing

class PlayerState {
  hipYFilter = new OneEuroFilter();
  leanFilter = new OneEuroFilter();
  restHipY: number | null = null;
  restTorso = 0.2;
  actions = new Set<Action>();
  signals: PlayerSignals = { jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false };
  /** Per-action "stay active until" time (s) — makes gestures linger. */
  holdUntil: Partial<Record<Action, number>> = {};

  reset() {
    this.hipYFilter.reset();
    this.leanFilter.reset();
    this.restHipY = null;
    this.restTorso = 0.2;
    this.actions = new Set<Action>();
    this.signals = { jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false };
    this.holdUntil = {};
  }
}

export class PlayerManager {
  readonly numPlayers: number;
  private players: PlayerState[];

  constructor(numPlayers: number) {
    this.numPlayers = numPlayers;
    this.players = Array.from({ length: numPlayers }, () => new PlayerState());
  }

  zoneOf(x: number): number {
    const z = Math.floor(x * this.numPlayers);
    return Math.max(0, Math.min(this.numPlayers - 1, z));
  }

  update(poses: Pose[], t: number): PlayerActions {
    const byZone = new Map<number, Pose>();
    for (const p of poses) {
      const z = this.zoneOf(centroidX(p));
      const existing = byZone.get(z);
      if (!existing || torsoHeight(p) > torsoHeight(existing)) byZone.set(z, p);
    }

    for (let i = 0; i < this.numPlayers; i++) {
      const ps = this.players[i];
      ps.actions = new Set<Action>();
      const pose = byZone.get(i);
      if (!pose) {
        ps.signals = { ...ps.signals, jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0 };
        continue;
      }
      this.detect(ps, pose, t);
    }
    return this.snapshot();
  }

  private detect(ps: PlayerState, pose: Pose, t: number) {
    const cfg = gestureConfig;
    const rawHip = hipY(pose);
    const torso = Math.max(torsoHeight(pose), 1e-3);

    if (ps.restHipY === null) {
      ps.restHipY = rawHip;
      ps.restTorso = torso;
    }
    const torsoRef = Math.max(ps.restTorso, 1e-3);

    // Re-learn the resting baseline only while near rest, so a held jump/duck
    // doesn't drag the baseline toward itself.
    if (Math.abs(rawHip - ps.restHipY) < REST_BAND * torsoRef) {
      ps.restHipY += (rawHip - ps.restHipY) * BASELINE_ALPHA;
      ps.restTorso += (torso - ps.restTorso) * BASELINE_ALPHA;
    }

    const smHip = ps.hipYFilter.filter(rawHip, t);
    const dy = smHip - ps.restHipY; // + = lower (duck), - = higher (jump)
    const jumpAmt = -dy / torsoRef;
    const duckAmt = dy / torsoRef;
    const offset = ps.leanFilter.filter(leanOffset(pose), t);
    const grab = wristRaise(pose);

    // Raw (instantaneous) gesture flags. jump/duck are mutually exclusive.
    const rawJump = jumpAmt > cfg.jumpRise;
    const raw: Array<[Action, boolean]> = [
      ["jump", rawJump],
      ["duck", !rawJump && duckAmt > cfg.duckDrop],
      ["right", offset > cfg.leanRatio],
      ["left", -offset > cfg.leanRatio],
      ["grab", grab > cfg.grabRaise],
    ];

    // Persist each gesture for HOLD_S after it stops, so brief motions (a jump!)
    // stay "on" long enough to land inside a game's hit window.
    for (const [action, on] of raw) {
      if (on) ps.holdUntil[action] = t + HOLD_S;
      if (on || t < (ps.holdUntil[action] ?? 0)) ps.actions.add(action);
    }

    ps.signals = { jumpAmt, duckAmt, lean: offset, grab, ready: true };
  }

  snapshot(): PlayerActions {
    return this.players.map((p) => new Set(p.actions));
  }

  signals(): PlayerSignals[] {
    return this.players.map((p) => ({ ...p.signals }));
  }

  resetAll() {
    this.players.forEach((p) => p.reset());
  }
}
