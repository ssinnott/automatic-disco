# automatic-disco

A **body-controlled minigame platform** for the browser. Your webcam tracks
several people at once, **follows each player around the frame**, and turns
each player's body into gestures (`jump`, `duck`, `lean left/right`, `grab`). Those
gestures drive a set of **themed minigames**.

Each minigame is a **theme + 4 semi-procedurally generated phases**, ~1.5 minutes
total — so no two playthroughs are the same.

```
webcam → MediaPipe pose → player tracking → per-player gestures → minigame phases
```

> Reimagined from an earlier Python/Pygame + YOLO rig. The gesture detection
> (One-Euro smoothing, baseline-relative jump/lean math) is ported directly;
> pose now runs in-browser via MediaPipe, and player assignment now tracks each
> body across frames instead of binning by a fixed screen column.

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
2. **Webcam pose** — grant camera access, stand so your torso (shoulders→hips)
   is in frame, then start. Jump/duck are read from the torso, so your head or
   legs leaving frame when you're close is fine. For multiplayer, line up
   left-to-right to begin (the leftmost player is P1); after that the game
   **follows each of you around** — your colored `P#` tag sticks with you even
   if you cross past each other.
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
    phases/  dodge · grab · gesture-match · runner archetypes (semi-procedural)
    themes/  pirates · ninjas (palette + background + geometric characters)
    games/   the two minigames built from a theme + phase pool
  ui/        MainMenu, GameCanvas, CameraPreview
```

**Adding a game:** make a `Theme` (palette + `drawBackground` + `drawCharacter`)
and register a `MiniGame` (theme + phase pool) in `src/game/games/index.ts`.

**Adding a phase archetype:** export a `PhaseFactory` from `src/game/phases/` and
add it to a game's pool. A factory rolls its own parameters from the seeded `rng`,
which is what makes runs semi-procedural.

**The runner phase** (`runnerPhase.ts`) is a side-scrolling infinite runner: the
team runs in place (animated stride) while the world scrolls past — JUMP to clear
ground hazards and snag floating treats, DUCK under overhead ones. Treats are the
theme's positive pickups (`Theme.collectibles`); for the turtles that's a pizza
slice **plus each turtle's signature weapon** — katana, bō, sai, and nunchaku.
Themes that don't define `collectibles` fall back to their single `drawTarget`.

**How players stay separate:** each player slot **tracks a body across frames**
by nearest-previous-position. Slots are seeded left-to-right on first sight (the
leftmost player is P1), then follow their body as it moves — so two players
moving into each other's space, or crossing over, keep their identity instead of
swapping. A slot is freed once its player has been off-camera for ~1.5s. Each
slot keeps its own One-Euro filters and a learned resting baseline.

**Robust to partial framing:** jump/duck come from hip displacement off a learned
resting baseline, normalized by torso height — so only your shoulders and hips
need to be visible. Baseline learning is gated on torso **visibility**, so a head
or legs leaving the frame can't drag your "rest" pose around and break jumps.

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
