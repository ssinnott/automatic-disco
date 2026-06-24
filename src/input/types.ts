/**
 * The whole game only needs one thing from the world: "what is each player
 * doing right now?" — a per-player set of active actions. Two backends provide
 * that behind the same tiny interface (start / snapshot / stop):
 *
 *   - PoseInput     — real camera + MediaPipe pose (the actual product).
 *   - KeyboardInput — same action sets from the keyboard, so every game is
 *                     testable with no camera and no model.
 *
 * This mirrors the original Python `PoseEngine` / `KeyboardInput` split.
 */

export type Action = "duck" | "left" | "right";

export const ALL_ACTIONS: readonly Action[] = ["duck", "left", "right"];

/** One action set per player, indexed by player number (0 = P1). */
export type PlayerActions = Set<Action>[];

export interface InputSource {
  readonly kind: "pose" | "keyboard";
  /** Acquire resources (camera, model, key listeners). May be async for pose. */
  start(): Promise<void>;
  /** Most recent action set per player. Never blocks the game loop. */
  snapshot(): PlayerActions;
  stop(): void;
}

export function emptyActions(numPlayers: number): PlayerActions {
  return Array.from({ length: numPlayers }, () => new Set<Action>());
}
