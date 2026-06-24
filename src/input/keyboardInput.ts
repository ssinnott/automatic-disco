/**
 * Keyboard backend — a drop-in InputSource so every game is playable and
 * testable with no camera and no model. Distinct keysets per player so several
 * people can share one keyboard without colliding (extends the original Python
 * DEFAULT_KEYMAPS with duck).
 *
 *   P1  a/d lean   w jump   s duck
 *   P2  j/l lean   i jump   k duck
 *   P3  f/h lean   t jump   g duck
 */
import { type Action, type InputSource, type PlayerActions, emptyActions } from "./types";

type KeyMap = Record<string, [number, Action]>; // key code -> [player, action]

const PLAYER_KEYS: Record<Action, string>[] = [
  { left: "KeyA", right: "KeyD", jump: "KeyW", duck: "KeyS" },
  { left: "KeyJ", right: "KeyL", jump: "KeyI", duck: "KeyK" },
  { left: "KeyF", right: "KeyH", jump: "KeyT", duck: "KeyG" },
];

export const KEYBOARD_HELP = PLAYER_KEYS;

export class KeyboardInput implements InputSource {
  readonly kind = "keyboard" as const;
  private numPlayers: number;
  private map: KeyMap = {};
  private pressed = new Set<string>();

  constructor(numPlayers: number) {
    this.numPlayers = Math.min(numPlayers, PLAYER_KEYS.length);
    for (let i = 0; i < this.numPlayers; i++) {
      for (const [action, code] of Object.entries(PLAYER_KEYS[i])) {
        this.map[code] = [i, action as Action];
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.map[e.code]) {
      this.pressed.add(e.code);
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.pressed.delete(e.code);
  };

  async start(): Promise<void> {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  snapshot(): PlayerActions {
    const out = emptyActions(this.numPlayers);
    for (const code of this.pressed) {
      const entry = this.map[code];
      if (entry) out[entry[0]].add(entry[1]);
    }
    return out;
  }

  stop(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.pressed.clear();
  }
}
