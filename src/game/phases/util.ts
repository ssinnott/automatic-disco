import { type Action } from "../../input/types";
import { type Zone } from "../types";

/** Map a normalized x within a zone (0..1) to a pixel x. */
export const px = (z: Zone, nx: number) => z.x + nx * z.w;
/** Map a normalized y within a zone (0..1) to a pixel y. */
export const py = (z: Zone, ny: number) => z.y + ny * z.h;

/**
 * Pixel x for each player's avatar when the team stands together, centered on
 * `centerX` and slightly overlapping (spacing < avatar width).
 */
export function teamXs(centerX: number, sizePx: number, numPlayers: number): number[] {
  const spacing = sizePx * 0.42; // < visual width → a little overlap
  const start = centerX - ((numPlayers - 1) * spacing) / 2;
  return Array.from({ length: numPlayers }, (_, i) => start + i * spacing);
}

/** Pick the dominant visual pose from a set of active actions. */
export function primaryPose(actions: Set<Action>): string {
  if (actions.has("duck")) return "duck";
  if (actions.has("left")) return "left";
  if (actions.has("right")) return "right";
  return "idle";
}

/** Icons/words for prompting each gesture. */
export const ACTION_LABEL: Record<Action, string> = {
  duck: "DUCK",
  left: "LEAN ◀",
  right: "LEAN ▶",
};
