/**
 * Side-scrolling infinite runner, co-op. The team runs in place on the left
 * while the world scrolls past from the right. Two kinds of things come at them,
 * both at head height so a single DUCK resolves either:
 *
 *   - an overhead hazard → DUCK under it (+5)
 *   - a floating treat   → DUCK to snag it (+10)
 *
 * The treats are the theme's positive pickups — for the turtles that's a pizza
 * slice plus each turtle's signature weapon (katana, bō, sai, nunchaku). Hitting
 * a hazard just flashes "ouch", no penalty, so it stays friendly and additive.
 *
 * Semi-procedural: scroll speed, spawn cadence and the hazard/treat mix are all
 * rolled from the seeded rng.
 */
import { type Action, type PlayerActions, type PlayerPose } from "../../input/types";
import { type Collectible, type Phase, type PhaseContext, type Theme } from "../types";
import { ACTION_LABEL, px, py, teamXs } from "./util";

const AVATAR_X = 0.24;
const GROUND_Y = 0.84;
const HIT_WINDOW = 0.13; // normalized x band around the team that counts
const TREAT_SCORE = 10;
const DODGE_SCORE = 5;
const FLASH_S = 0.6;
const SPIN_RATE = 2.4; // radians / second, for tumbling treats
const RUN_CADENCE = 2.2; // stride cycles / second

type Kind = "duck" | "treat";
type Status = "live" | "got" | "miss";

interface Item {
  x: number;
  kind: Kind;
  spin: number;
  /** Only for treats: which collectible this is (pizza, katana, …). */
  treat?: Collectible;
  status: Status[]; // per player
}

/** Fallback treat list for themes that don't define their own collectibles. */
function treatPool(theme: Theme): Collectible[] {
  return theme.collectibles ?? [{ name: theme.targetWord, draw: theme.drawTarget }];
}

export function makeRunnerPhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers, theme } = ctx;
  const treats = treatPool(theme);
  const speed = rng.range(0.26, 0.36); // normalized widths / second
  const spawnMin = rng.range(0.9, 1.2);
  const spawnMax = spawnMin + rng.range(0.5, 0.9);
  const treatBias = rng.range(0.45, 0.6); // share of spawns that are treats

  const items: Item[] = [];
  const flash = Array.from({ length: numPlayers }, () => ({ text: "", color: "", until: 0 }));
  let lastActions: PlayerActions = Array.from({ length: numPlayers }, () => new Set<Action>());
  let lastPoses: PlayerPose[] | undefined;
  let spawnTimer = 0.6;
  let clock = 0;
  let scroll = 0; // ground-tick offset, for the running-past illusion

  const spawn = () => {
    const kind: Kind = rng.next() < treatBias ? "treat" : "duck";
    items.push({
      x: 1.12,
      kind,
      spin: rng.range(0, Math.PI * 2),
      treat: kind === "treat" ? rng.pick(treats) : undefined,
      status: Array.from({ length: numPlayers }, () => "live" as Status),
    });
    spawnTimer = rng.range(spawnMin, spawnMax);
  };

  return {
    name: "runner",
    instruction: `Run & DUCK — grab ${theme.targetWord} & gear, dodge the ${theme.obstacleWord}`,
    update(dtMs, actions, scores, poses) {
      lastActions = actions;
      lastPoses = poses;
      const dt = dtMs / 1000;
      clock += dt;
      scroll += speed * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();

      for (const it of items) {
        it.x -= speed * dt;
        for (let p = 0; p < numPlayers; p++) {
          if (it.status[p] !== "live") continue;
          if (Math.abs(it.x - AVATAR_X) <= HIT_WINDOW) {
            if (actions[p]?.has("duck")) {
              it.status[p] = "got";
              if (it.kind === "treat") {
                scores[p] += TREAT_SCORE;
                flash[p] = { text: `+${TREAT_SCORE} ${it.treat!.name}!`, color: "#3fbf6f", until: clock + FLASH_S };
              } else {
                scores[p] += DODGE_SCORE;
                flash[p] = { text: `+${DODGE_SCORE}`, color: "#7fd0ff", until: clock + FLASH_S };
              }
            }
          } else if (it.x < AVATAR_X - HIT_WINDOW) {
            it.status[p] = "miss";
            // Missing a treat is silent; clipping a hazard gives a gentle "ouch".
            if (it.kind !== "treat") flash[p] = { text: "ouch", color: "#e24b4b", until: clock + FLASH_S };
          }
        }
      }
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].x < -0.15) items.splice(i, 1);
      }
    },
    render(c, field, theme: Theme) {
      const groundY = py(field, GROUND_Y);

      // ground line + ticks scrolling left to sell the running motion
      c.strokeStyle = "rgba(0,0,0,0.3)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(field.x, groundY);
      c.lineTo(field.x + field.w, groundY);
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.18)";
      c.lineWidth = 3;
      const gap = field.w * 0.08;
      const off = (scroll * field.w) % gap;
      for (let x = field.x - off; x < field.x + field.w; x += gap) {
        c.beginPath();
        c.moveTo(x, groundY + 6);
        c.lineTo(x + gap * 0.4, groundY + 6);
        c.stroke();
      }

      // scrolling hazards (themed) and treats (the positive pickups)
      const r = field.h * 0.055;
      for (const it of items) {
        if (it.status.every((s) => s === "got")) continue; // whole team cleared it
        const ix = px(field, it.x);
        if (it.kind === "treat") {
          const ty = groundY - field.h * 0.3;
          it.treat!.draw(c, ix, ty, r * 1.05, it.spin + clock * SPIN_RATE);
        } else {
          const oy = groundY - field.h * 0.3;
          theme.drawObstacle(c, ix, oy, r, it.spin + clock * SPIN_RATE);
          c.fillStyle = theme.palette.text;
          c.font = "bold 13px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText(ACTION_LABEL.duck, ix, oy - r - 6);
        }
      }

      // the running team, clustered and slightly overlapping
      const size = field.h * 0.2;
      const xs = teamXs(px(field, AVATAR_X), size, numPlayers);
      for (let p = 0; p < numPlayers; p++) {
        const act = lastActions[p] ?? new Set<Action>();
        // Always "run" so the legs keep pumping; a continuous crouch (from the
        // body) squats them down smoothly when they duck a hazard or treat.
        const crouch = lastPoses?.[p]?.crouch ?? (act.has("duck") ? 1 : 0);
        theme.drawCharacter(c, xs[p], groundY, size, {
          pose: "run",
          color: theme.palette.players[p % theme.palette.players.length],
          // each avatar pumps on its own slightly-offset stride cycle
          phase: (clock * RUN_CADENCE + p * 0.3) % 1,
          crouch,
        });
        const f = flash[p];
        if (clock < f.until && f.text) {
          c.fillStyle = f.color;
          c.font = "bold 16px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText(f.text, xs[p], groundY - size - 10);
        }
      }
    },
  };
}
