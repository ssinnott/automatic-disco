import { describe, expect, it } from "vitest";
import { makePose } from "../test/makePose";
import { leanOffset } from "./gestures";

describe("gesture math", () => {
  it("standing pose has ~zero lean", () => {
    const p = makePose();
    expect(Math.abs(leanOffset(p))).toBeLessThan(0.28);
  });

  it("leanOffset is positive leaning right, negative leaning left", () => {
    const right = makePose({ shoulderX: [0.5, 0.6], hipX: [0.46, 0.54] });
    const left = makePose({ shoulderX: [0.4, 0.5], hipX: [0.46, 0.54] });
    expect(leanOffset(right)).toBeGreaterThan(0.28);
    expect(leanOffset(left)).toBeLessThan(-0.28);
  });
});
