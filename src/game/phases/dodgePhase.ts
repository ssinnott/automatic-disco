/**
 * Runner-style dodge phase, co-op. The whole team stands together and one shared
 * stream of obstacles scrolls in from the right; each player must JUMP (over a
 * low obstacle) or DUCK (under a high one) as it reaches the group. Everyone
 * "dodges the same object", but scores on their own.
 *
 * Semi-procedural: jump/duck mix, spawn cadence, and scroll speed are rolled
 * from the seeded rng.
 */
import { type Action, type PlayerActions } from "../../input/types";
import { type Phase, type PhaseContext, type Theme } from "../types";
import { ACTION_LABEL, primaryPose, px, py, teamXs } from "./util";

// Only jump/duck make sense for an oncoming-obstacle runner.
const DODGE_ACTIONS: Action[] = ["jump", "duck"];
const AVATAR_X = 0.3;
const GROUND_Y = 0.84;
const HIT_WINDOW = 0.16; // normalized x band around the team that counts
const HIT_SCORE = 10;
const FLASH_S = 0.5;
const SPIN_RATE = 3.0; // radians / second (for spinning obstacles like shuriken)

type Status = "live" | "hit" | "miss";

interface Obstacle {
  x: number;
  action: Action;
  spin: number;
  status: Status[]; // per player
}

export function makeDodgePhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers } = ctx;
  const allowed = rng.shuffle([...DODGE_ACTIONS]);
  const speed = rng.range(0.18, 0.27); // normalized widths / second (slower = easier)
  const spawnMin = rng.range(1.7, 2.1);
  const spawnMax = spawnMin + rng.range(0.6, 1.0);

  const obstacles: Obstacle[] = [];
  const flash = Array.from({ length: numPlayers }, () => ({ type: "" as "" | "hit" | "miss", until: 0 }));
  let lastActions: PlayerActions = Array.from({ length: numPlayers }, () => new Set<Action>());
  let spawnTimer = 0.8;
  let clock = 0;

  const spawn = () => {
    obstacles.push({
      x: 1.12,
      action: rng.pick(allowed),
      spin: rng.range(0, Math.PI * 2),
      status: Array.from({ length: numPlayers }, () => "live" as Status),
    });
    spawnTimer = rng.range(spawnMin, spawnMax);
  };

  return {
    name: "dodge",
    instruction: `Dodge together: ${allowed.map((a) => ACTION_LABEL[a]).join(" / ")}`,
    update(dtMs, actions, scores) {
      lastActions = actions;
      const dt = dtMs / 1000;
      clock += dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();

      for (const ob of obstacles) {
        ob.x -= speed * dt;
        for (let p = 0; p < numPlayers; p++) {
          if (ob.status[p] !== "live") continue;
          if (Math.abs(ob.x - AVATAR_X) <= HIT_WINDOW) {
            if (actions[p]?.has(ob.action)) {
              ob.status[p] = "hit";
              scores[p] += HIT_SCORE;
              flash[p] = { type: "hit", until: clock + FLASH_S };
            }
          } else if (ob.x < AVATAR_X - HIT_WINDOW) {
            ob.status[p] = "miss";
            flash[p] = { type: "miss", until: clock + FLASH_S };
          }
        }
      }
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].x < -0.15) obstacles.splice(i, 1);
      }
    },
    render(c, field, theme: Theme) {
      const groundY = py(field, GROUND_Y);
      c.strokeStyle = "rgba(0,0,0,0.3)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(field.x, groundY);
      c.lineTo(field.x + field.w, groundY);
      c.stroke();

      // shared themed obstacles: low ones you JUMP, high ones you DUCK under
      const r = field.h * 0.06;
      for (const ob of obstacles) {
        const ox = px(field, ob.x);
        const oy = ob.action === "duck" ? groundY - field.h * 0.28 : groundY - r * 1.05;
        theme.drawObstacle(c, ox, oy, r, ob.spin + clock * SPIN_RATE);
        c.fillStyle = theme.palette.text;
        c.font = "bold 13px system-ui, sans-serif";
        c.textAlign = "center";
        c.fillText(ACTION_LABEL[ob.action], ox, oy - r - 6);
      }

      // the team, clustered and slightly overlapping
      const size = field.h * 0.2;
      const xs = teamXs(px(field, AVATAR_X), size, numPlayers);
      for (let p = 0; p < numPlayers; p++) {
        theme.drawCharacter(c, xs[p], groundY, size, {
          pose: primaryPose(lastActions[p] ?? new Set()),
          color: theme.palette.players[p % theme.palette.players.length],
        });
        const f = flash[p];
        if (clock < f.until && f.type) {
          c.fillStyle = f.type === "hit" ? "#3fbf6f" : "#e24b4b";
          c.font = "bold 18px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText(f.type === "hit" ? "+10" : "miss", xs[p], groundY - size - 8);
        }
      }
    },
  };
}
