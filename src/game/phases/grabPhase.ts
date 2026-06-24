/**
 * Catch phase, co-op. Targets fall in three shared lanes; each player slides
 * between lanes by leaning, and catches a target just by standing in its lane
 * as it crosses the catch line. A colored pointer over each avatar shows which
 * lane that player has chosen.
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
const POP_S = 0.28; // how long the "collected" pop lingers before vanishing

interface Target {
  lane: number;
  y: number;
  spin: number; // initial spin angle
  caught: boolean;
  pop: number; // seconds of collect-pop animation remaining (>0 once caught)
}

function avatarLane(actions: Set<Action>): number {
  if (actions.has("left")) return 0;
  if (actions.has("right")) return 2;
  return 1;
}

export function makeGrabPhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers } = ctx;
  const speed = rng.range(0.15, 0.22); // normalized heights / second (slower = easier)
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
      caught: false,
      pop: 0,
    });
    spawnTimer = rng.range(spawnMin, spawnMax);
  };

  return {
    name: "grab",
    instruction: `Lean into a lane to catch the ${ctx.theme.targetWord}!`,
    update(dtMs, actions, scores) {
      lastActions = actions;
      const dt = dtMs / 1000;
      clock += dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();

      for (const tg of targets) {
        // A caught target freezes in place and plays its vanish-pop.
        if (tg.caught) {
          tg.pop -= dt;
          continue;
        }
        tg.y += speed * dt;
        const inBand = tg.y >= CATCH_TOP && tg.y <= CATCH_BOTTOM;
        if (!inBand) continue;
        // Anyone standing in this lane collects it this frame.
        let collected = false;
        for (let p = 0; p < numPlayers; p++) {
          if (avatarLane(actions[p] ?? new Set()) === tg.lane) {
            scores[p] += CATCH_SCORE;
            flash[p] = clock + FLASH_S;
            collected = true;
          }
        }
        if (collected) {
          tg.caught = true;
          tg.pop = POP_S;
        }
      }
      for (let i = targets.length - 1; i >= 0; i--) {
        const tg = targets[i];
        // Caught → gone after its pop; uncaught → gone once it passes the catch
        // line (so it never falls through the floor and lingers).
        if ((tg.caught && tg.pop <= 0) || (!tg.caught && tg.y > CATCH_BOTTOM)) {
          targets.splice(i, 1);
        }
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

      // shared targets (themed shape, spinning as they fall). A collected one
      // briefly pops then disappears instead of continuing to fall.
      const r = field.w * 0.03;
      for (const tg of targets) {
        if (tg.y < -0.1) continue;
        const tx = px(field, LANE_X[tg.lane]);
        const ty = py(field, tg.y);
        if (tg.caught) {
          drawPop(c, tx, ty, r, 1 - tg.pop / POP_S, theme.palette.target);
        } else {
          theme.drawTarget(c, tx, ty, r, tg.spin + clock * SPIN_RATE);
        }
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

/** A quick expanding ring where a collected target vanished (t: 0→1). */
function drawPop(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, color: string) {
  c.save();
  c.globalAlpha = Math.max(0, 1 - t);
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, r * 0.4 * (1 - t));
  c.beginPath();
  c.arc(x, y, r * (1 + t * 1.6), 0, Math.PI * 2);
  c.stroke();
  c.restore();
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
