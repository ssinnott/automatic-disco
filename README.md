# automatic-disco

A **body-controlled minigame platform** for the browser. Your webcam tracks
several people at once, splits the frame into one **zone per player**, and turns
each player's body into gestures (`jump`, `duck`, `lean left/right`, `grab`). Those
gestures drive a set of **themed minigames**.

Each minigame is a **theme + 4 semi-procedurally generated phases**, ~1.5 minutes
total — so no two playthroughs are the same.

```
webcam → MediaPipe pose → zone assignment → per-player gestures → minigame phases
```

> Reimagined from an earlier Python/Pygame + YOLO rig. The gesture detection
> (One-Euro smoothing, zone-based player assignment, jump/lean math) is ported
> directly; pose now runs in-browser via MediaPipe.

## Tech stack

- **Vite + React + TypeScript**
- **`@mediapipe/tasks-vision`** `PoseLandmarker` for in-browser multi-person pose
- **Canvas 2D** for gameplay (simple geometric characters); React for menus/HUD
- **Zustand** for session state, **Vitest** for unit tests

## Setup

Requires Node 18+.

```sh
npm install
npm run dev          # http://localhost:5173
```

The MediaPipe model + wasm are loaded from a CDN on first run, so the first pose
session needs a network connection.

## Play

1. Pick a game (**Pirate's Plunder** or **Ninja Trials**), the player count
   (1–3), and an input mode.
2. **Webcam pose** — grant camera access, stand back so your whole body is in
   frame (one player per column for multiplayer), then start.
3. **Keyboard** — no camera needed; great for development. Distinct keysets per
   player so several people can share one keyboard:

   | Player | Lean | Jump | Duck | Grab |
   |--------|------|------|------|------|
   | P1 | `a` / `d` | `w` | `s` | `e` |
   | P2 | `j` / `l` | `i` | `k` | `o` |
   | P3 | `f` / `h` | `t` | `g` | `y` |

## How it's organized

```
src/
  pose/      One-Euro filter, MediaPipe-33 landmark helpers
  input/     gesture detection, zone-based PlayerManager, pose & keyboard backends
  game/      Phase/Theme/MiniGame model, seeded RNG, GameRunner (4-phase sequencer)
    phases/  dodge · grab · gesture-match archetypes (semi-procedural)
    themes/  pirates · ninjas (palette + background + geometric characters)
    games/   the two minigames built from a theme + phase pool
  ui/        MainMenu, GameCanvas, CameraPreview
```

**Adding a game:** make a `Theme` (palette + `drawBackground` + `drawCharacter`)
and register a `MiniGame` (theme + phase pool) in `src/game/games/index.ts`.

**Adding a phase archetype:** export a `PhaseFactory` from `src/game/phases/` and
add it to a game's pool. A factory rolls its own parameters from the seeded `rng`,
which is what makes runs semi-procedural.

**How players stay separate:** state is keyed by **screen zone**, not tracker id —
the person on the left is always P1, even if players cross over. Each zone keeps
its own One-Euro filters and gesture state.

## Scripts

```sh
npm run dev         # dev server
npm run build       # type-check + production build
npm run typecheck   # tsc --noEmit
npm test            # vitest run (gesture/filter/runner unit + smoke tests)
```

## Gesture tunables

Thresholds live at the top of `src/input/gestures.ts`
(`JUMP_VELOCITY`, `LEAN_RATIO`, `DUCK_LEG_RATIO`, `GRAB_RAISE`). They're expressed
in MediaPipe's normalized coordinate space; adjust to your camera distance.
