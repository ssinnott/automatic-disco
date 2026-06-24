/**
 * Drives one minigame: a 3-2-1 countdown, then 4 phases (~22.5s each) with a
 * short banner between them, then an end card. Owns the per-player scores and
 * renders everything (gameplay + HUD) to a canvas, so React doesn't re-render
 * per frame. The host just calls update() then render() each animation frame
 * and watches `status`.
 */
import { type PlayerActions, type PlayerPose } from "../input/types";
import { Rng } from "./rng";
import { type MiniGame, type Phase, type Zone } from "./types";

export type RunnerStatus = "countdown" | "playing" | "transition" | "done";

const DEFAULT_COUNTDOWN_MS = 3000;
const TRANSITION_MS = 2200;
export const PHASE_COUNT = 4;
export const DEFAULT_PHASE_MS = 22500;

export interface RunnerOptions {
  numPlayers: number;
  seed?: number;
  phaseDurationMs?: number;
  /** Length of the get-ready countdown before the first phase. */
  countdownMs?: number;
  /**
   * Called once during the countdown, ~1.5s before "go", when the player should
   * be standing in their neutral pose — the moment to lock the pose baseline.
   */
  onCalibrate?: () => void;
}

export class GameRunner {
  readonly game: MiniGame;
  readonly numPlayers: number;
  readonly scores: number[];
  private phases: Phase[];
  private phaseIndex = 0;
  private status: RunnerStatus = "countdown";
  private stateElapsed = 0;
  private stateDuration: number;
  private readonly phaseDurationMs: number;
  private readonly onCalibrate?: () => void;
  private calibrated = false;

  constructor(game: MiniGame, opts: RunnerOptions) {
    this.game = game;
    this.numPlayers = opts.numPlayers;
    this.scores = Array.from({ length: opts.numPlayers }, () => 0);
    this.phaseDurationMs = opts.phaseDurationMs ?? DEFAULT_PHASE_MS;
    this.stateDuration = opts.countdownMs ?? DEFAULT_COUNTDOWN_MS;
    this.onCalibrate = opts.onCalibrate;

    const rng = new Rng(opts.seed ?? (Math.random() * 2 ** 32) >>> 0);
    // Semi-procedural: shuffle the pool and take 4 (cycling if the pool is
    // smaller). Each factory re-rolls its own internal parameters from `rng`.
    const shuffled = rng.shuffle(game.phasePool);
    this.phases = Array.from({ length: PHASE_COUNT }, (_, i) => {
      const factory = shuffled[i % shuffled.length];
      return factory({ rng, theme: game.theme, numPlayers: opts.numPlayers });
    });
  }

  get state() {
    return {
      status: this.status,
      phaseIndex: this.phaseIndex,
      phaseCount: PHASE_COUNT,
      instruction: this.phases[this.phaseIndex]?.instruction ?? "",
      phaseName: this.phases[this.phaseIndex]?.name ?? "",
      timeLeftMs: Math.max(0, this.stateDuration - this.stateElapsed),
      scores: this.scores.slice(),
    };
  }

  get isDone() {
    return this.status === "done";
  }

  update(dtMs: number, actions: PlayerActions, poses?: PlayerPose[]) {
    this.stateElapsed += dtMs;

    // Lock the pose baseline near the end of the countdown, when the player is
    // (hopefully) back in a neutral standing pose rather than reaching for a key.
    if (this.status === "countdown" && !this.calibrated) {
      const left = this.stateDuration - this.stateElapsed;
      if (left <= 1500) {
        this.onCalibrate?.();
        this.calibrated = true;
      }
    }

    if (this.status === "playing") {
      this.phases[this.phaseIndex].update(dtMs, actions, this.scores, poses);
      if (this.stateElapsed >= this.stateDuration) this.advance();
      return;
    }
    if (this.stateElapsed < this.stateDuration) return;

    if (this.status === "countdown") {
      this.enter("playing", this.phaseDurationMs);
    } else if (this.status === "transition") {
      this.enter("playing", this.phaseDurationMs);
    }
  }

  private advance() {
    if (this.phaseIndex >= PHASE_COUNT - 1) {
      this.enter("done", Infinity);
    } else {
      this.phaseIndex++;
      this.enter("transition", TRANSITION_MS);
    }
  }

  private enter(status: RunnerStatus, duration: number) {
    this.status = status;
    this.stateElapsed = 0;
    this.stateDuration = duration;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const field: Zone = { index: 0, x: 0, y: 0, w, h };
    ctx.clearRect(0, 0, w, h);

    // One shared stage: background once, all avatars + hazards together.
    const phase = this.phases[this.phaseIndex];
    this.game.theme.drawBackground(ctx, 0, 0, w, h, performance.now());
    phase.render(ctx, field, this.game.theme);

    this.drawHud(ctx, w);

    if (this.status === "countdown") this.drawCountdown(ctx, w, h);
    else if (this.status === "transition") this.drawTransition(ctx, w, h);
    else if (this.status === "done") this.drawEndCard(ctx, w, h);
  }

  private drawHud(ctx: CanvasRenderingContext2D, w: number) {
    const { palette } = this.game.theme;
    // top instruction strip
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const secs = Math.ceil(this.state.timeLeftMs / 1000);
    const label = this.status === "playing" ? `${this.phases[this.phaseIndex].instruction}  ·  ${secs}s` : this.game.title;
    ctx.fillText(label, w / 2, 22);

    // per-player score badges spread across the top
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let i = 0; i < this.numPlayers; i++) {
      ctx.fillStyle = palette.players[i % palette.players.length];
      ctx.textAlign = "center";
      ctx.fillText(`P${i + 1}  ${this.scores[i]}`, ((i + 0.5) / this.numPlayers) * w, 64);
    }
  }

  private drawCountdown(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const n = Math.ceil((this.stateDuration - this.stateElapsed) / 1000);
    this.dim(ctx, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.fillText("Stand back in a neutral pose", w / 2, h / 2 - 110);
    ctx.font = "bold 120px system-ui, sans-serif";
    ctx.fillText(String(Math.max(1, n)), w / 2, h / 2);
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(`First up — ${this.phases[0].instruction}`, w / 2, h / 2 + 95);
  }

  private drawTransition(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.dim(ctx, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(`Phase ${this.phaseIndex + 1} of ${PHASE_COUNT}`, w / 2, h / 2 - 30);
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(this.phases[this.phaseIndex].instruction, w / 2, h / 2 + 20);
  }

  private drawEndCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.dim(ctx, w, h, 0.7);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("Final scores", w / 2, h / 2 - 80);
    ctx.font = "bold 30px system-ui, sans-serif";
    const ranked = this.scores
      .map((s, i) => ({ s, i }))
      .sort((a, b) => b.s - a.s);
    ranked.forEach((r, rank) => {
      const tag = this.numPlayers > 1 ? `#${rank + 1}  ` : "";
      ctx.fillStyle = this.game.theme.palette.players[r.i % this.game.theme.palette.players.length];
      ctx.fillText(`${tag}P${r.i + 1}: ${r.s}`, w / 2, h / 2 - 20 + rank * 44);
    });
  }

  private dim(ctx: CanvasRenderingContext2D, w: number, h: number, a = 0.5) {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(0, 0, w, h);
  }
}
