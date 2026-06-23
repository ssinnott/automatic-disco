import { describe, expect, it } from "vitest";
import { OneEuroFilter } from "./oneEuro";

describe("OneEuroFilter", () => {
  it("returns the first sample unchanged", () => {
    const f = new OneEuroFilter();
    expect(f.filter(0.5, 0)).toBe(0.5);
  });

  it("converges toward a held constant input", () => {
    const f = new OneEuroFilter();
    let out = 0;
    for (let i = 0; i < 60; i++) out = f.filter(1.0, i / 30);
    expect(out).toBeGreaterThan(0.99);
    expect(out).toBeLessThanOrEqual(1.0);
  });

  it("lags a step input (smoothing), staying within bounds", () => {
    const f = new OneEuroFilter();
    f.filter(0, 0);
    const firstStep = f.filter(1, 1 / 30);
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(1); // did not jump straight to the target
  });

  it("reset() forgets history", () => {
    const f = new OneEuroFilter();
    f.filter(0, 0);
    f.filter(0, 1 / 30);
    f.reset();
    expect(f.filter(0.42, 0)).toBe(0.42);
  });
});
