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

/**
 * Continuous per-player body pose, for animating each avatar in line with the
 * body instead of snapping between discrete poses. Both backends can provide it
 * (smoothed analog from the camera, or binary from held keys).
 */
export interface PlayerPose {
  /** Signed lean, ~-1..1 (negative = leaning to screen-left). */
  lean: number;
  /** Crouch amount, 0 (standing) .. 1 (full duck). */
  crouch: number;
}

export interface InputSource {
  readonly kind: "pose" | "keyboard";
  /** Acquire resources (camera, model, key listeners). May be async for pose. */
  start(): Promise<void>;
  /** Most recent action set per player. Never blocks the game loop. */
  snapshot(): PlayerActions;
  /** Continuous lean/crouch per player, for analog avatar motion. */
  poses(): PlayerPose[];
  stop(): void;
}

export function emptyActions(numPlayers: number): PlayerActions {
  return Array.from({ length: numPlayers }, () => new Set<Action>());
}
