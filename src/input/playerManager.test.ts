import { describe, expect, it } from "vitest";
import { makePose } from "../test/makePose";
import { PlayerManager } from "./playerManager";
import { type Pose } from "../pose/landmarks";

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

  it("keeps players separate by zone", () => {
    const mgr = new PlayerManager(2);
    const p1 = makePose({ shoulderX: [0.27, 0.37], hipX: [0.21, 0.29] }); // left zone, lean right
    const p2 = makePose({ hipX: [0.71, 0.79], shoulderX: [0.7, 0.8] }); // right zone, upright
    settle(mgr, p1); // baselines settle for both? only p1 present; p2 added below
    const actions = mgr.update([p1, p2], 1);
    expect(actions[0].has("right")).toBe(true);
    expect(actions[1].size).toBe(0);
  });
});
