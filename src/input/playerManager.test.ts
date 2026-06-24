import { describe, expect, it } from "vitest";
import { makePose, shiftX } from "../test/makePose";
import { PlayerManager } from "./playerManager";
import { type Pose } from "../pose/landmarks";

/** Place a body's hips at a given centroid x (keeps it upright). */
function bodyAt(x: number): Pose {
  return makePose({ hipX: [x - 0.04, x + 0.04], shoulderX: [x - 0.05, x + 0.05] });
}
/** Dim every landmark's visibility, to simulate a barely-detected body. */
function dim(pose: Pose, visibility: number): Pose {
  return pose.map((l) => ({ ...l, visibility }));
}

let CLOCK = 0;
/** Feed several frames of a pose; returns the last action sets. */
function feed(mgr: PlayerManager, pose: Pose, frames = 8) {
  let actions = mgr.snapshot();
  for (let i = 0; i < frames; i++) actions = mgr.update([pose], (CLOCK += 1 / 30));
  return actions;
}
function settle(mgr: PlayerManager, pose: Pose, frames = 8) {
  feed(mgr, pose, frames);
  return CLOCK;
}

describe("PlayerManager", () => {
  it("assigns bodies to zones by horizontal position", () => {
    const mgr = new PlayerManager(3);
    expect(mgr.zoneOf(0.1)).toBe(0);
    expect(mgr.zoneOf(0.5)).toBe(1);
    expect(mgr.zoneOf(0.9)).toBe(2);
  });

  it("a still, upright player triggers no actions", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose());
    expect(mgr.update([makePose()], 1)[0].size).toBe(0);
  });

  it("detects lean direction per player", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose()); // upright neutral baseline first
    const leanRight = makePose({ shoulderX: [0.5, 0.6], hipX: [0.46, 0.54] });
    const actions = feed(mgr, leanRight, 5);
    expect(actions[0].has("right")).toBe(true);
  });

  it("treats a sustained lean as the new neutral (no permanent bias)", () => {
    const mgr = new PlayerManager(1);
    // A player whose resting posture is offset shouldn't read as leaning.
    const crooked = makePose({ shoulderX: [0.52, 0.62], hipX: [0.46, 0.54] });
    settle(mgr, crooked, 60); // hold the crooked stance until it's learned as rest
    expect(mgr.update([crooked], (CLOCK += 1 / 30))[0].size).toBe(0);
  });

  it("detects hips dropped from rest as a duck", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose({ hipY: 0.55 }));
    const actions = feed(mgr, makePose({ hipY: 0.7 }), 5); // hips down
    expect(actions[0].has("duck")).toBe(true);
  });

  it("keeps players separate, seeded left-to-right", () => {
    const mgr = new PlayerManager(2);
    const p1Up = makePose({ shoulderX: [0.2, 0.3], hipX: [0.21, 0.29] }); // left, upright
    const p2 = makePose({ hipX: [0.71, 0.79], shoulderX: [0.7, 0.8] }); // right, upright
    settle(mgr, p1Up); // p1 seeds into the left slot with a neutral baseline
    const p1Lean = makePose({ shoulderX: [0.27, 0.37], hipX: [0.21, 0.29] }); // left, lean right
    let actions = mgr.snapshot();
    for (let i = 0; i < 5; i++) actions = mgr.update([p1Lean, p2], (CLOCK += 1 / 30));
    expect(actions[0].has("right")).toBe(true);
    expect(actions[1].size).toBe(0);
  });

  it("keeps a player's identity as they move across the frame", () => {
    const mgr = new PlayerManager(2);
    // A starts left (P1), B starts right (P2).
    const a0 = bodyAt(0.3);
    const b0 = bodyAt(0.7);
    for (let i = 0; i < 6; i++) mgr.update([a0, b0], (CLOCK += 1 / 30));
    // A drifts right, past the screen midline, but should STAY P1 (not get
    // reassigned to the right column the way fixed zones would).
    let lastA = 0.3;
    for (let x = 0.3; x <= 0.62; x += 0.04) {
      mgr.update([bodyAt(x), bodyAt(0.8)], (CLOCK += 1 / 30));
      lastA = x;
    }
    const pos = mgr.positions();
    expect(pos[0].x).toBeCloseTo(lastA, 1); // P1 tracked A across the middle
    expect(pos[1].x).toBeCloseTo(0.8, 1); // P2 stayed with B
  });

  it("keeps both slots through a brief overlap that merges into one body", () => {
    const mgr = new PlayerManager(2);
    for (let i = 0; i < 6; i++) mgr.update([bodyAt(0.35), bodyAt(0.65)], (CLOCK += 1 / 30));
    // They cross: the detector reports a single merged body for a few frames.
    for (let i = 0; i < 3; i++) mgr.update([bodyAt(0.5)], (CLOCK += 1 / 30));
    // The momentarily-lost player keeps its slot (coasts, not released).
    const mid = mgr.positions();
    expect(mid[0].present || mid[1].present).toBe(true);
    // Once they separate, both are re-acquired with their identities intact.
    for (let i = 0; i < 5; i++) mgr.update([bodyAt(0.35), bodyAt(0.65)], (CLOCK += 1 / 30));
    const pos = mgr.positions();
    expect(pos[0].present).toBe(true);
    expect(pos[1].present).toBe(true);
    expect(pos[0].x).toBeCloseTo(0.35, 1);
    expect(pos[1].x).toBeCloseTo(0.65, 1);
  });

  it("ignores a barely-visible phantom body", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose()); // a real body seeds P1
    const ghost = dim(shiftX(makePose(), 0.2), 0.1); // low-visibility extra body
    mgr.update([makePose(), ghost], (CLOCK += 1 / 30));
    const pos = mgr.positions();
    expect(pos[0].present).toBe(true);
    expect(pos[0].x).toBeCloseTo(0.5, 1); // still tracking the real body, not the ghost
  });

  it("does not corrupt the baseline from an out-of-frame frame", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose({ hipY: 0.55 })); // clean standing baseline
    // A frame where the torso landmarks are low-visibility AND the hips read
    // lower (as if the legs left frame and the estimate dropped) must not drag
    // the rest baseline down — otherwise a later real duck would be missed.
    // Visibility 0.5 is tracked (>= VIS_MIN) but not trusted (< VIS_LEARN), so
    // the body still plays but can't move the resting baseline.
    const noisy = dim(makePose({ hipY: 0.65 }), 0.5);
    for (let i = 0; i < 5; i++) mgr.update([noisy], (CLOCK += 1 / 30));
    // Now a genuine duck from the original rest still fires.
    const actions = feed(mgr, makePose({ hipY: 0.72 }), 5);
    expect(actions[0].has("duck")).toBe(true);
  });
});
