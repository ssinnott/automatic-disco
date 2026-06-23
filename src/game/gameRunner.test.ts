import { describe, expect, it } from "vitest";
import { GameRunner } from "./gameRunner";
import { piratesGame, ninjasGame } from "./games";
import { ALL_ACTIONS, type Action, type PlayerActions } from "../input/types";

/** A no-op 2D context so render() exercises its full code path headlessly. */
function mockCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
        if (prop === "measureText") return () => ({ width: 0 });
        return () => {};
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

/** Scripted "keyboard": player p cycles through every gesture over time. */
function scriptedActions(numPlayers: number, step: number): PlayerActions {
  const action = ALL_ACTIONS[step % ALL_ACTIONS.length] as Action;
  return Array.from({ length: numPlayers }, () => new Set<Action>([action]));
}

describe("GameRunner smoke", () => {
  for (const game of [piratesGame, ninjasGame]) {
    for (const numPlayers of [1, 2, 3]) {
      it(`${game.id} runs all 4 phases to completion with ${numPlayers} player(s)`, () => {
        const runner = new GameRunner(game, { numPlayers, seed: 42, phaseDurationMs: 120 });
        const ctx = mockCtx();
        let steps = 0;
        while (!runner.isDone && steps < 4000) {
          runner.update(50, scriptedActions(numPlayers, steps));
          runner.render(ctx, 960, 540);
          steps++;
        }
        expect(runner.isDone).toBe(true);
        expect(runner.scores).toHaveLength(numPlayers);
        expect(runner.state.phaseCount).toBe(4);
      });
    }
  }

  it("is reproducible for a fixed seed", () => {
    const run = () => {
      const r = new GameRunner(piratesGame, { numPlayers: 2, seed: 7, phaseDurationMs: 120 });
      let steps = 0;
      while (!r.isDone && steps < 4000) {
        r.update(50, scriptedActions(2, steps));
        steps++;
      }
      return r.scores;
    };
    expect(run()).toEqual(run());
  });
});
