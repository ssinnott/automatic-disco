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
    const leanRight = makePose({ shoulderX: [0.5, 0.6], hipX: [0.46, 0.54] });
    settle(mgr, leanRight);
    expect(mgr.update([leanRight], 1)[0].has("right")).toBe(true);
  });

  it("detects hips raised from rest as a jump", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose({ hipY: 0.55 })); // learn standing baseline
    const actions = feed(mgr, makePose({ hipY: 0.4 }), 5); // hips up for a few frames
    expect(actions[0].has("jump")).toBe(true);
  });

  it("detects hips dropped from rest as a duck", () => {
    const mgr = new PlayerManager(1);
    settle(mgr, makePose({ hipY: 0.55 }));
    const actions = feed(mgr, makePose({ hipY: 0.7 }), 5); // hips down
    expect(actions[0].has("duck")).toBe(true);
  });

  it("detects a raised hand as grab", () => {
    const mgr = new PlayerManager(1);
    const grab = makePose({ wristY: [0.12, 0.55] });
    settle(mgr, makePose());
    expect(mgr.update([grab], 1)[0].has("grab")).toBe(true);
  });

  it("keeps players separate, seeded left-to-right", () => {
    const mgr = new PlayerManager(2);
    const p1 = makePose({ shoulderX: [0.27, 0.37], hipX: [0.21, 0.29] }); // left, lean right
    const p2 = makePose({ hipX: [0.71, 0.79], shoulderX: [0.7, 0.8] }); // right, upright
    settle(mgr, p1); // p1 seeds into the left slot
    const actions = mgr.update([p1, p2], 1);
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
    // higher (as if the head left frame and the estimate jumped) must not drag
    // the rest baseline up — otherwise a later real jump would be missed.
    // Visibility 0.5 is tracked (>= VIS_MIN) but not trusted (< VIS_LEARN), so
    // the body still plays but can't move the resting baseline.
    const noisy = dim(makePose({ hipY: 0.45 }), 0.5);
    for (let i = 0; i < 5; i++) mgr.update([noisy], (CLOCK += 1 / 30));
    // Now a genuine jump from the original rest still fires.
    const actions = feed(mgr, makePose({ hipY: 0.42 }), 5);
    expect(actions[0].has("jump")).toBe(true);
  });
});
