/**
 * The minigame data model.
 *
 *   MiniGame  = a Theme + a pool of phase factories.
 *   A run     = 4 phases the GameRunner picks/seeds from that pool, ~22.5s each
 *               (~1.5 min total), scored per player.
 *   Phase     = one self-contained challenge (dodge / grab / gesture-match…).
 *   Theme     = palette + background + simple geometric character drawing, so
 *               the same phase looks like pirates or ninjas.
 */
import { type PlayerActions } from "../input/types";
import { type Rng } from "./rng";

export interface Palette {
  sky: string;
  skyAccent: string;
  ground: string;
  obstacle: string;
  target: string;
  text: string;
  players: string[]; // one color per player zone
}

export interface CharacterState {
  /** "idle" | "jump" | "duck" | "left" | "right" | "grab" | "hit" */
  pose: string;
  color: string;
}

export interface Theme {
  id: string;
  name: string;
  palette: Palette;
  /** Fill the backdrop for one zone rect. */
  drawBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tMs: number): void;
  /** Draw a simple geometric character centered at (cx, footY). */
  drawCharacter(ctx: CanvasRenderingContext2D, cx: number, footY: number, size: number, state: CharacterState): void;
  /** Draw a collectible target (grab phase) at (cx, cy), spun by `angle` rad. */
  drawTarget(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number): void;
  /** Draw a dodge obstacle (the "bad" object) at (cx, cy), spun by `angle` rad. */
  drawObstacle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number): void;
  /** Word for obstacles ("cannonball", "shuriken") used in instructions. */
  obstacleWord: string;
  /** Word for collectible targets ("coin", "scroll"). */
  targetWord: string;
  /** Background-music file paths (served from public/); one is picked per run. */
  music: string[];
}

/** Logical, per-player play area handed to a phase each frame. */
export interface Zone {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhaseContext {
  rng: Rng;
  theme: Theme;
  numPlayers: number;
}

export interface Phase {
  readonly name: string;
  /** Short imperative shown to players, e.g. "Jump the barrels!". */
  readonly instruction: string;
  /** Advance simulation. `actions` is per player; mutate `scores` in place. */
  update(dtMs: number, actions: PlayerActions, scores: number[]): void;
  /**
   * Draw the shared play field. All players' avatars share one stage (drawn
   * clustered, slightly overlapping) and react to the same hazards.
   */
  render(ctx: CanvasRenderingContext2D, field: Zone, theme: Theme): void;
}

export type PhaseFactory = (ctx: PhaseContext) => Phase;

export interface MiniGame {
  id: string;
  title: string;
  theme: Theme;
  /** Pool of phase archetypes; a run draws 4 (with repeats allowed). */
  phasePool: PhaseFactory[];
}
