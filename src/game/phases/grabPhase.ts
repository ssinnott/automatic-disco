/**
 * Catch phase, co-op. Targets fall in three shared lanes; each player slides
 * between lanes by leaning, then GRABs to catch the target in their lane. A
 * colored pointer over each avatar shows which lane that player has chosen.
 *
 * Semi-procedural: fall speed, spawn cadence, lane choice.
 */
import { type Action, type PlayerActions } from "../../input/types";
import { type Phase, type PhaseContext, type Theme } from "../types";
import { primaryPose, px, py, teamXs } from "./util";

const LANE_X = [0.22, 0.5, 0.78];
const CATCH_TOP = 0.64;
const CATCH_BOTTOM = 0.9;
const GROUND_Y = 0.84;
const CATCH_SCORE = 10;
const FLASH_S = 0.5;
const SPIN_RATE = 2.6; // radians / second

type Status = "live" | "caught" | "missed";

interface Target {
  lane: number;
  y: number;
  spin: number; // initial spin angle
  status: Status[];
}

function avatarLane(actions: Set<Action>): number {
  if (actions.has("left")) return 0;
  if (actions.has("right")) return 2;
  return 1;
}

export function makeGrabPhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers } = ctx;
  const speed = rng.range(0.22, 0.32); // normalized heights / second (slower = easier)
  const spawnMin = rng.range(1.2, 1.6);
  const spawnMax = spawnMin + rng.range(0.5, 0.9);

  const targets: Target[] = [];
  const flash = Array.from({ length: numPlayers }, () => 0);
  let lastActions: PlayerActions = Array.from({ length: numPlayers }, () => new Set<Action>());
  let spawnTimer = 0.6;
  let clock = 0;

  const spawn = () => {
    targets.push({
      lane: rng.int(0, 2),
      y: -0.05,
      spin: rng.range(0, Math.PI * 2),
      status: Array.from({ length: numPlayers }, () => "live" as Status),
    });
    spawnTimer = rng.range(spawnMin, spawnMax);
  };

  return {
    name: "grab",
    instruction: `Lean to a lane, then GRAB the ${ctx.theme.targetWord}!`,
    update(dtMs, actions, scores) {
      lastActions = actions;
      const dt = dtMs / 1000;
      clock += dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();

      for (const tg of targets) {
        tg.y += speed * dt;
        for (let p = 0; p < numPlayers; p++) {
          if (tg.status[p] !== "live") continue;
          const inBand = tg.y >= CATCH_TOP && tg.y <= CATCH_BOTTOM;
          if (inBand && avatarLane(actions[p] ?? new Set()) === tg.lane && actions[p]?.has("grab")) {
            tg.status[p] = "caught";
            scores[p] += CATCH_SCORE;
            flash[p] = clock + FLASH_S;
          } else if (tg.y > CATCH_BOTTOM) {
            tg.status[p] = "missed";
          }
        }
      }
      for (let i = targets.length - 1; i >= 0; i--) {
        if (targets[i].y > 1.1) targets.splice(i, 1);
      }
    },
    render(c, field, theme: Theme) {
      // lane guides + catch line
      c.strokeStyle = "rgba(255,255,255,0.12)";
      c.lineWidth = 1;
      for (let l = 1; l < 3; l++) {
        const x = px(field, (LANE_X[l - 1] + LANE_X[l]) / 2);
        c.beginPath();
        c.moveTo(x, field.y);
        c.lineTo(x, field.y + field.h);
        c.stroke();
      }
      c.strokeStyle = "rgba(255,255,255,0.5)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(field.x, py(field, GROUND_Y));
      c.lineTo(field.x + field.w, py(field, GROUND_Y));
      c.stroke();

      // shared targets (themed shape, spinning as they fall)
      const r = field.w * 0.03;
      for (const tg of targets) {
        if (tg.y < -0.1) continue;
        theme.drawTarget(c, px(field, LANE_X[tg.lane]), py(field, tg.y), r, tg.spin + clock * SPIN_RATE);
      }

      // avatars grouped by chosen lane, with a colored pointer each
      const size = field.h * 0.18;
      const groundY = py(field, GROUND_Y);
      const byLane: number[][] = [[], [], []];
      for (let p = 0; p < numPlayers; p++) byLane[avatarLane(lastActions[p] ?? new Set())].push(p);
      for (let l = 0; l < 3; l++) {
        const xs = teamXs(px(field, LANE_X[l]), size, byLane[l].length);
        byLane[l].forEach((p, i) => {
          const color = theme.palette.players[p % theme.palette.players.length];
          theme.drawCharacter(c, xs[i], groundY, size, {
            pose: primaryPose(lastActions[p] ?? new Set()),
            color,
          });
          drawPointer(c, xs[i], groundY - size - 14, color, p + 1, clock < flash[p]);
        });
      }
    },
  };
}

/** A colored down-pointing marker (with the player number) over an avatar. */
function drawPointer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  player: number,
  caught: boolean,
) {
  c.fillStyle = caught ? "#3fbf6f" : color;
  c.beginPath();
  c.moveTo(x, y + 12);
  c.lineTo(x - 9, y);
  c.lineTo(x + 9, y);
  c.closePath();
  c.fill();
  c.fillStyle = "#fff";
  c.font = "bold 11px system-ui, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(String(player), x, y - 6);
}
