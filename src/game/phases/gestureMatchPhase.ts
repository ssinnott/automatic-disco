/**
 * Dance / Simon-says phase, co-op. One shared prompt cycles through gestures to
 * a tempo; the whole team performs it together and each player scores by
 * striking the prompted pose before the beat ends.
 *
 * Semi-procedural: the gesture sequence and tempo are rolled from the rng.
 */
import { type Action, type PlayerActions } from "../../input/types";
import { type Phase, type PhaseContext, type Theme } from "../types";
import { ACTION_LABEL, primaryPose, px, py, teamXs } from "./util";

const HIT_SCORE = 10;
const BURST_S = 1.5; // duration of the success burst
// Dance uses whole-body poses only — no grab.
const DANCE_ACTIONS: Action[] = ["jump", "duck", "left", "right"];
const RAINBOW = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#5ac8fa", "#007aff", "#af52de"];

export function makeGestureMatchPhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers } = ctx;
  const beatMs = rng.range(2200, 3000);
  const seqLen = rng.int(4, 6);
  const sequence: Action[] = Array.from({ length: seqLen }, () => rng.pick(DANCE_ACTIONS));

  let beatIndex = 0;
  let beatElapsed = 0;
  let clock = 0; // seconds, for burst timing
  let hit: boolean[] = Array.from({ length: numPlayers }, () => false);
  const burstAt = Array.from({ length: numPlayers }, () => -1); // clock time of last success
  let lastActions: PlayerActions = Array.from({ length: numPlayers }, () => new Set<Action>());

  const target = () => sequence[beatIndex % sequence.length];

  return {
    name: "dance",
    instruction: "Follow the dance — strike each pose!",
    update(dtMs, actions, scores) {
      lastActions = actions;
      clock += dtMs / 1000;
      beatElapsed += dtMs;
      const t = target();
      for (let p = 0; p < numPlayers; p++) {
        if (!hit[p] && actions[p]?.has(t)) {
          hit[p] = true;
          scores[p] += HIT_SCORE;
          burstAt[p] = clock; // fire the success burst
        }
      }
      if (beatElapsed >= beatMs) {
        beatElapsed = 0;
        beatIndex++;
        hit = hit.map(() => false);
      }
    },
    render(c, field, theme: Theme) {
      const t = target();
      const progress = beatElapsed / beatMs;

      // shared prompt
      c.fillStyle = theme.palette.text;
      c.font = "bold 44px system-ui, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(ACTION_LABEL[t], px(field, 0.5), py(field, 0.22));

      // beat timer bar
      const barW = field.w * 0.4;
      const barX = px(field, 0.5) - barW / 2;
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.fillRect(barX, py(field, 0.3), barW, 10);
      c.fillStyle = theme.palette.target;
      c.fillRect(barX, py(field, 0.3), barW * (1 - progress), 10);

      // the team, clustered. A success fires an expanding, fading rainbow halo
      // around that dancer (drawn behind them).
      const size = field.h * 0.26;
      const groundY = py(field, 0.9);
      const xs = teamXs(px(field, 0.5), size, numPlayers);
      for (let p = 0; p < numPlayers; p++) {
        const bt = burstAt[p] >= 0 ? (clock - burstAt[p]) / BURST_S : Infinity;
        if (bt < 1) {
          drawRainbowBurst(c, xs[p], groundY, size, bt);
        }
        const color = theme.palette.players[p % theme.palette.players.length];
        theme.drawCharacter(c, xs[p], groundY, size, {
          pose: primaryPose(lastActions[p] ?? new Set()),
          color,
        });
      }
    },
  };
}

/**
 * Success burst: the dancer's silhouette (head + torso + hips circles) radiating
 * outward as nested rainbow outlines that expand and fade (t: 0→1).
 */
function drawRainbowBurst(c: CanvasRenderingContext2D, cx: number, footY: number, size: number, t: number) {
  // Circle "blobs" approximating the humanoid, relative to the foot line.
  const blobs = [
    { y: footY - size * 0.84, r: size * 0.2 }, // head
    { y: footY - size * 0.52, r: size * 0.3 }, // torso
    { y: footY - size * 0.2, r: size * 0.24 }, // hips / legs
  ];
  const center = footY - size * 0.5;
  c.save();
  c.lineCap = "round";
  // One outline per hue, each a little larger → a rainbow aura rippling out.
  for (let k = 0; k < RAINBOW.length; k++) {
    const rt = t + k * 0.06; // stagger so hues nest outward
    if (rt >= 1) continue;
    const scale = 1 + rt * 1.6;
    c.globalAlpha = Math.max(0, 1 - rt) * 0.9;
    c.lineWidth = Math.max(1.5, size * 0.05 * (1 - t * 0.6));
    c.strokeStyle = RAINBOW[k];
    for (const b of blobs) {
      const yy = center + (b.y - center) * scale;
      c.beginPath();
      c.arc(cx, yy, b.r * scale, 0, Math.PI * 2);
      c.stroke();
    }
  }
  c.restore();
}
