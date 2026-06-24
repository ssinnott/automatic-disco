import { describe, expect, it } from "vitest";
import { makeRunnerPhase } from "./runnerPhase";
import { ninjasTheme } from "../themes/ninjas";
import { type PhaseContext, type Phase } from "../types";
import { type Action } from "../../input/types";
import { Rng } from "../rng";

function makePhase(seed: number, numPlayers = 1): Phase {
  const ctx: PhaseContext = { rng: new Rng(seed), theme: ninjasTheme, numPlayers };
  return makeRunnerPhase(ctx);
}

/** Drive the phase for ~20s, with `act(i)` choosing player 0's actions each frame. */
function play(p: Phase, numPlayers: number, act: (i: number) => Set<Action>, frames = 600) {
  const scores = Array.from({ length: numPlayers }, () => 0);
  for (let i = 0; i < frames; i++) {
    p.update(33, [act(i), ...Array.from({ length: numPlayers - 1 }, () => new Set<Action>())], scores);
  }
  return scores;
}

describe("runner phase", () => {
  it("rewards jumping for treats and ducking past hazards", () => {
    const p = makePhase(11);
    // Striking both poses every frame resolves every item that comes through.
    const scores = play(p, 1, () => new Set<Action>(["jump", "duck"]));
    expect(scores[0]).toBeGreaterThan(0);
  });

  it("scores nothing — and never penalizes — when the player does nothing", () => {
    const p = makePhase(11);
    const scores = play(p, 1, () => new Set<Action>());
    expect(scores[0]).toBe(0);
  });

  it("scores each player independently", () => {
    const p = makePhase(5, 2);
    // Only P1 acts; P2 stands still.
    const scores = play(p, 2, () => new Set<Action>(["jump", "duck"]));
    expect(scores[0]).toBeGreaterThan(0);
    expect(scores[1]).toBe(0);
  });

  it("offers pizza plus every turtle's weapon as treats", () => {
    const names = (ninjasTheme.collectibles ?? []).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["Pizza", "Katana", "Bō staff", "Sai", "Nunchaku"]));
  });
});
