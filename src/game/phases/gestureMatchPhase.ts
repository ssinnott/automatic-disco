/**
 * Dance / Simon-says phase, co-op. One shared prompt cycles through gestures to
 * a tempo; the whole team performs it together and each player scores by
 * striking the prompted pose before the beat ends.
 *
 * Semi-procedural: the gesture sequence and tempo are rolled from the rng.
 */
import { ALL_ACTIONS, type Action, type PlayerActions } from "../../input/types";
import { type Phase, type PhaseContext, type Theme } from "../types";
import { ACTION_LABEL, primaryPose, px, py, teamXs } from "./util";

const HIT_SCORE = 10;

export function makeGestureMatchPhase(ctx: PhaseContext): Phase {
  const { rng, numPlayers } = ctx;
  const beatMs = rng.range(2200, 3000);
  const seqLen = rng.int(4, 6);
  const sequence: Action[] = Array.from({ length: seqLen }, () => rng.pick(ALL_ACTIONS));

  let beatIndex = 0;
  let beatElapsed = 0;
  let hit: boolean[] = Array.from({ length: numPlayers }, () => false);
  let lastActions: PlayerActions = Array.from({ length: numPlayers }, () => new Set<Action>());

  const target = () => sequence[beatIndex % sequence.length];

  return {
    name: "dance",
    instruction: "Follow the dance — strike each pose!",
    update(dtMs, actions, scores) {
      lastActions = actions;
      beatElapsed += dtMs;
      const t = target();
      for (let p = 0; p < numPlayers; p++) {
        if (!hit[p] && actions[p]?.has(t)) {
          hit[p] = true;
          scores[p] += HIT_SCORE;
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

      // the team, clustered
      const size = field.h * 0.26;
      const groundY = py(field, 0.9);
      const xs = teamXs(px(field, 0.5), size, numPlayers);
      for (let p = 0; p < numPlayers; p++) {
        const color = theme.palette.players[p % theme.palette.players.length];
        theme.drawCharacter(c, xs[p], groundY, size, {
          pose: primaryPose(lastActions[p] ?? new Set()),
          color,
        });
        if (hit[p]) {
          c.fillStyle = "#3fbf6f";
          c.font = "bold 22px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText("✓", xs[p], groundY - size - 10);
        }
      }
    },
  };
}
