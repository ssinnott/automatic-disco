/**
 * Player slots that TRACK each body across frames, rather than re-deciding by
 * fixed screen column every frame. Players are seeded left-to-right the first
 * time they're seen (so the person on the left starts as P1), then each slot
 * follows its body by nearest-previous-position — so when two players move into
 * each other's space, or cross over entirely, they keep their identity instead
 * of swapping. A slot is released only after its player has been gone for a
 * moment, freeing it for someone new.
 *
 * Jump/duck are detected as hip displacement from a learned resting baseline
 * (in torso heights); lean and grab are instantaneous. Baseline learning is
 * gated on torso visibility, so a head or legs leaving the frame can't drag the
 * baseline around. Thresholds come from the live `gestureConfig` so the Gesture
 * Lab can tune them on the fly.
 */
import { OneEuroFilter } from "../pose/oneEuro";
import { centroidX, centroidY, torsoHeight, torsoVisibility, type Pose } from "../pose/landmarks";
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

/** Where a tracked player currently is, for drawing their label/overlay. */
export interface PlayerPosition {
  /** Assigned to a body this frame. */
  present: boolean;
  /** Last known hip-midpoint, normalized image coords. */
  x: number;
  y: number;
}

const BASELINE_ALPHA = 0.05; // how fast the resting baseline tracks (near rest)
const REST_BAND = 0.15; // only re-learn baseline when within this of rest (torso)
const HOLD_S = 0.4; // a fired gesture lingers this long, for forgiving timing
const VIS_MIN = 0.4; // ignore bodies whose torso is less visible than this
const VIS_LEARN = 0.6; // only learn/seed the baseline from torsos this visible
const MATCH_DIST = 0.3; // max per-frame hip travel (norm. x) to stay the same player
const RELEASE_S = 1.5; // free a slot after its player is gone this long

class PlayerState {
  hipYFilter = new OneEuroFilter();
  leanFilter = new OneEuroFilter();
  restHipY: number | null = null;
  restTorso = 0.2;
  actions = new Set<Action>();
  signals: PlayerSignals = { jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false };
  /** Per-action "stay active until" time (s) — makes gestures linger. */
  holdUntil: Partial<Record<Action, number>> = {};
  /** Tracking state: last known hip position + when we last saw this player. */
  lastX: number | null = null;
  lastY: number | null = null;
  lastSeen: number | null = null;
  present = false;

  reset() {
    this.hipYFilter.reset();
    this.leanFilter.reset();
    this.restHipY = null;
    this.restTorso = 0.2;
    this.actions = new Set<Action>();
    this.signals = { jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false };
    this.holdUntil = {};
    this.lastX = null;
    this.lastY = null;
    this.lastSeen = null;
    this.present = false;
  }

  /** Forget tracking + baseline so a fresh player can take this slot cleanly. */
  release() {
    this.reset();
  }
}

interface Candidate {
  pose: Pose;
  x: number;
  y: number;
}

export class PlayerManager {
  readonly numPlayers: number;
  private players: PlayerState[];

  constructor(numPlayers: number) {
    this.numPlayers = numPlayers;
    this.players = Array.from({ length: numPlayers }, () => new PlayerState());
  }

  /**
   * Which screen column an x falls in. No longer drives assignment (we track
   * identity instead) — kept for tests and as the tie-break order for seeding
   * brand-new players left-to-right.
   */
  zoneOf(x: number): number {
    const z = Math.floor(x * this.numPlayers);
    return Math.max(0, Math.min(this.numPlayers - 1, z));
  }

  /** Where an unseeded slot "belongs" so new players seed left-to-right. */
  private slotPos(i: number): number {
    const p = this.players[i];
    return p.lastX ?? (i + 0.5) / this.numPlayers;
  }

  update(poses: Pose[], t: number): PlayerActions {
    // Only consider bodies whose torso is visible enough to trust; this drops
    // phantom / half-detected poses before they can claim a slot.
    const cands: Candidate[] = poses
      .filter((p) => torsoVisibility(p) >= VIS_MIN)
      .map((pose) => ({ pose, x: centroidX(pose), y: centroidY(pose) }));

    const assigned: (Candidate | null)[] = Array.from({ length: this.numPlayers }, () => null);
    const usedCand = new Set<number>();

    // 1. Match already-tracked slots to their nearest candidate (greedy by
    //    distance). This is what keeps identity stable as players move/cross.
    const pairs: { slot: number; ci: number; d: number }[] = [];
    for (let i = 0; i < this.numPlayers; i++) {
      const last = this.players[i].lastX;
      if (last === null) continue;
      cands.forEach((c, ci) => pairs.push({ slot: i, ci, d: Math.abs(c.x - last) }));
    }
    pairs.sort((a, b) => a.d - b.d);
    for (const { slot, ci, d } of pairs) {
      if (assigned[slot] || usedCand.has(ci) || d > MATCH_DIST) continue;
      assigned[slot] = cands[ci];
      usedCand.add(ci);
    }

    // 2. Seed any leftover bodies into empty slots, left-to-right, so a new
    //    player joining on the left becomes the lowest free P#.
    const leftover = cands
      .map((c, ci) => ({ c, ci }))
      .filter((o) => !usedCand.has(o.ci))
      .sort((a, b) => a.c.x - b.c.x);
    const empty: number[] = [];
    for (let i = 0; i < this.numPlayers; i++) if (!assigned[i]) empty.push(i);
    empty.sort((a, b) => this.slotPos(a) - this.slotPos(b));
    for (let k = 0; k < empty.length && k < leftover.length; k++) {
      assigned[empty[k]] = leftover[k].c;
      usedCand.add(leftover[k].ci);
    }

    // 3. Drive each slot from its assignment (or coast / release if missing).
    for (let i = 0; i < this.numPlayers; i++) {
      const ps = this.players[i];
      ps.actions = new Set<Action>();
      const c = assigned[i];
      if (!c) {
        ps.present = false;
        ps.signals = { ...ps.signals, jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0 };
        if (ps.lastSeen !== null && t - ps.lastSeen > RELEASE_S) ps.release();
        continue;
      }
      ps.present = true;
      ps.lastX = c.x;
      ps.lastY = c.y;
      ps.lastSeen = t;
      this.detect(ps, c.pose, t);
    }
    return this.snapshot();
  }

  private detect(ps: PlayerState, pose: Pose, t: number) {
    const cfg = gestureConfig;
    const rawHip = hipY(pose);
    const torso = Math.max(torsoHeight(pose), 1e-3);
    // Trust this frame for baseline purposes only when the torso is clearly in
    // view — a partly out-of-frame body still plays, it just can't move the rest.
    const trusted = torsoVisibility(pose) >= VIS_LEARN;

    if (ps.restHipY === null) {
      if (!trusted) {
        // Wait for one clean frame before seeding rest, so we don't anchor the
        // baseline to a head-/legs-out-of-frame guess.
        ps.signals = { ...ps.signals, jumpAmt: 0, duckAmt: 0, lean: 0, grab: 0, ready: false };
        return;
      }
      ps.restHipY = rawHip;
      ps.restTorso = torso;
    }
    const torsoRef = Math.max(ps.restTorso, 1e-3);

    // Re-learn the resting baseline only while near rest AND clearly visible, so
    // neither a held jump/duck nor an out-of-frame frame drags it around.
    if (trusted && Math.abs(rawHip - ps.restHipY) < REST_BAND * torsoRef) {
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

  /** Per-player tracked position, for drawing labels that follow each body. */
  positions(): PlayerPosition[] {
    return this.players.map((p) => ({
      present: p.present,
      x: p.lastX ?? (this.numPlayers === 1 ? 0.5 : NaN),
      y: p.lastY ?? NaN,
    }));
  }

  resetAll() {
    this.players.forEach((p) => p.reset());
  }
}
