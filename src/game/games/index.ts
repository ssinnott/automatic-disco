import { type MiniGame } from "../types";
import { piratesTheme } from "../themes/pirates";
import { ninjasTheme } from "../themes/ninjas";
import { makeGrabPhase } from "../phases/grabPhase";
import { makeGestureMatchPhase } from "../phases/gestureMatchPhase";
import { makeRunnerPhase } from "../phases/runnerPhase";

// Every game shares the same phase archetypes; the theme + flavor differ. A run
// draws phases from this pool (semi-procedurally) so no two playthroughs are
// identical.
const SHARED_POOL = [makeGrabPhase, makeGestureMatchPhase, makeRunnerPhase];

export const piratesGame: MiniGame = {
  id: "pirates",
  title: "Pirate's Plunder",
  theme: piratesTheme,
  phasePool: SHARED_POOL,
};

export const ninjasGame: MiniGame = {
  id: "ninjas",
  title: "Ninja Trials",
  theme: ninjasTheme,
  phasePool: SHARED_POOL,
};

export const GAMES: MiniGame[] = [piratesGame, ninjasGame];

export function gameById(id: string): MiniGame {
  return GAMES.find((g) => g.id === id) ?? piratesGame;
}
