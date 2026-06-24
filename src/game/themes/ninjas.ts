import { type CharacterState, type Theme } from "../types";
import { drawHumanoid } from "./draw";

// All turtles share a green body; the per-player color is the headband/mask.
const TURTLE_BODY = "#3f9b46";
const TURTLE_SKIN = "#5cb85c";
const SHELL = "#7a4a21";
const PLASTRON = "#d8b870";

export const ninjasTheme: Theme = {
  id: "ninjas",
  name: "Turtle Ninjas",
  obstacleWord: "shuriken",
  targetWord: "pizza",
  // Positive pickups for the runner: a pizza slice plus each turtle's signature
  // weapon (Leo's katanas, Donnie's bō, Raph's sai, Mikey's nunchaku).
  collectibles: [
    { name: "Pizza", draw: drawPizzaSlice },
    { name: "Katana", draw: drawKatana },
    { name: "Bō staff", draw: drawBoStaff },
    { name: "Sai", draw: drawSai },
    { name: "Nunchaku", draw: drawNunchaku },
  ],
  music: ["/audio/ninja-1.mp3"],
  palette: {
    sky: "#1b1538",
    skyAccent: "#2d2356",
    ground: "#15324a",
    obstacle: "#cfd8e3",
    target: "#f4e1a0",
    text: "#e9e4ff",
    // Each turtle's headband/mask color → also the per-player avatar/HUD color.
    players: ["#2f6fd0", "#d83a3a", "#e0871e"],
  },
  drawBackground(ctx, x, y, w, h) {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, "#1b1538");
    sky.addColorStop(1, "#2d2356");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // moon
    ctx.fillStyle = "#f4f0d0";
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * 0.2, Math.min(w, h) * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // rooftop ground
    ctx.fillStyle = "#0f2233";
    ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  },
  drawTarget(ctx, cx, cy, r, angle) {
    drawPizzaSlice(ctx, cx, cy, r, angle);
  },
  drawObstacle(ctx, cx, cy, r, angle) {
    drawShuriken(ctx, cx, cy, r, angle);
  },
  drawCharacter(ctx, cx, footY, size, state: CharacterState) {
    drawHumanoid(ctx, {
      cx,
      footY,
      size,
      bodyColor: TURTLE_BODY,
      skinColor: TURTLE_SKIN,
      pose: state.pose,
      phase: state.phase,
      lean: state.lean,
      crouch: state.crouch,
      bodyDecor: (c, bx, by, bw, bh) => {
        // shell rim (a touch wider than the torso, peeking at the sides)
        const cyShell = by + bh * 0.52;
        c.fillStyle = SHELL;
        c.beginPath();
        c.ellipse(bx, cyShell, bw * 0.66, bh * 0.5, 0, 0, Math.PI * 2);
        c.fill();
        // tan plastron with belly segments
        c.fillStyle = PLASTRON;
        c.beginPath();
        c.ellipse(bx, cyShell, bw * 0.42, bh * 0.4, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "rgba(120,74,33,0.45)";
        c.lineWidth = Math.max(1, bw * 0.04);
        for (let s = 1; s <= 2; s++) {
          const yy = cyShell - bh * 0.4 + (bh * 0.8 * s) / 3;
          c.beginPath();
          c.moveTo(bx - bw * 0.34, yy);
          c.lineTo(bx + bw * 0.34, yy);
          c.stroke();
        }
      },
      accessory: (c, hx, hy, hr) => {
        // colored eye-mask band with two trailing tails (the player's color)
        c.fillStyle = state.color;
        c.fillRect(hx - hr * 1.05, hy - hr * 0.3, hr * 2.1, hr * 0.62);
        for (const dy of [-hr * 0.28, hr * 0.05]) {
          c.beginPath();
          c.moveTo(hx + hr * 1.0, hy + dy);
          c.lineTo(hx + hr * 2.0, hy + dy + hr * 0.4);
          c.lineTo(hx + hr * 1.0, hy + dy + hr * 0.3);
          c.closePath();
          c.fill();
        }
        // white eye holes (over the mask) with pupils
        const ex = hr * 0.42;
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(hx - ex, hy, hr * 0.22, 0, Math.PI * 2);
        c.arc(hx + ex, hy, hr * 0.22, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#1c1c1c";
        c.beginPath();
        c.arc(hx - ex, hy, hr * 0.1, 0, Math.PI * 2);
        c.arc(hx + ex, hy, hr * 0.1, 0, Math.PI * 2);
        c.fill();
      },
    });
  },
};

/** A spinning four-point shuriken (steel throwing star) — the "bad" object. */
function drawShuriken(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  // four-pointed star: alternate outer/inner radius around 8 vertices
  c.fillStyle = "#c2ccd6";
  c.strokeStyle = "#6b7682";
  c.lineWidth = Math.max(1, r * 0.05);
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.4;
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
  c.stroke();
  // center hole
  c.fillStyle = "#15324a";
  c.beginPath();
  c.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A spinning pizza slice: golden cheese wedge, browned crust, pepperoni. */
function drawPizzaSlice(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  const R = r * 1.3;
  const half = 0.42; // half-angle of the wedge (~24°)
  const top = -Math.PI / 2;
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  c.translate(0, R * 0.42); // spin about the slice's centroid, not its apex

  // cheese wedge
  c.fillStyle = "#f3c64a";
  c.beginPath();
  c.moveTo(0, 0);
  c.arc(0, 0, R, top - half, top + half);
  c.closePath();
  c.fill();

  // browned crust along the outer rim
  c.strokeStyle = "#c0813a";
  c.lineWidth = R * 0.18;
  c.lineCap = "round";
  c.beginPath();
  c.arc(0, 0, R - c.lineWidth / 2, top - half, top + half);
  c.stroke();

  // pepperoni
  c.fillStyle = "#c0392b";
  for (const [px2, py2] of [
    [0, -R * 0.45],
    [-R * 0.2, -R * 0.72],
    [R * 0.2, -R * 0.72],
  ] as const) {
    c.beginPath();
    c.arc(px2, py2, R * 0.12, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

// ── Turtle weapons (the runner's bonus pickups) ──────────────────────────────
// Each is drawn within roughly a circle of radius `r` about (cx, cy), spun by
// `angle` so it tumbles in the air like the pizza does.

/** Leonardo's katana: a steel blade with a guard and wrapped grip. */
function drawKatana(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle - Math.PI / 4); // rest diagonally
  // blade
  c.fillStyle = "#dfe6ee";
  c.strokeStyle = "#9aa6b2";
  c.lineWidth = Math.max(1, r * 0.04);
  c.beginPath();
  c.moveTo(-r * 0.1, r * 0.95);
  c.lineTo(-r * 0.1, -r * 0.6);
  c.lineTo(0, -r * 0.95); // pointed tip
  c.lineTo(r * 0.1, -r * 0.6);
  c.lineTo(r * 0.1, r * 0.95);
  c.closePath();
  c.fill();
  c.stroke();
  // guard (tsuba)
  c.fillStyle = "#3a3a3a";
  c.fillRect(-r * 0.32, r * 0.92, r * 0.64, r * 0.12);
  // wrapped grip
  c.fillStyle = "#1f1f1f";
  c.fillRect(-r * 0.09, r * 1.04, r * 0.18, r * 0.5);
  c.restore();
}

/** Donatello's bō: a long brown staff with banded ends. */
function drawBoStaff(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle + Math.PI / 5);
  c.fillStyle = "#9a6b3f";
  c.strokeStyle = "#6e4a28";
  c.lineWidth = Math.max(1, r * 0.04);
  c.beginPath();
  // rounded-end staff
  if (c.roundRect) c.roundRect(-r * 0.12, -r * 1.05, r * 0.24, r * 2.1, r * 0.12);
  else c.rect(-r * 0.12, -r * 1.05, r * 0.24, r * 2.1);
  c.fill();
  c.stroke();
  // darker grip bands near each end
  c.fillStyle = "#5e3f24";
  for (const yy of [-r * 0.74, r * 0.62]) c.fillRect(-r * 0.12, yy, r * 0.24, r * 0.12);
  c.restore();
}

/** Raphael's sai: a central prong flanked by two curved guards. */
function drawSai(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  c.strokeStyle = "#c8d0d8";
  c.fillStyle = "#c8d0d8";
  c.lineWidth = Math.max(1.5, r * 0.12);
  c.lineCap = "round";
  // central prong
  c.beginPath();
  c.moveTo(0, r * 0.5);
  c.lineTo(0, -r * 0.95);
  c.stroke();
  // two side prongs curving up from the cross-guard
  c.lineWidth = Math.max(1, r * 0.09);
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, r * 0.32);
    c.quadraticCurveTo(s * r * 0.5, r * 0.18, s * r * 0.42, -r * 0.4);
    c.stroke();
  }
  // handle + pommel
  c.lineWidth = Math.max(1.5, r * 0.14);
  c.strokeStyle = "#3a3a3a";
  c.beginPath();
  c.moveTo(0, r * 0.5);
  c.lineTo(0, r * 0.95);
  c.stroke();
  c.fillStyle = "#3a3a3a";
  c.beginPath();
  c.arc(0, r * 0.98, r * 0.12, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Michelangelo's nunchaku: two short batons joined by a chain. */
function drawNunchaku(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  // chain
  c.strokeStyle = "#8a8f96";
  c.lineWidth = Math.max(1, r * 0.05);
  c.beginPath();
  c.moveTo(-r * 0.45, -r * 0.5);
  c.lineTo(r * 0.45, r * 0.5);
  c.stroke();
  // two batons at each end of the chain
  c.fillStyle = "#5e3f24";
  c.strokeStyle = "#3a2716";
  c.lineWidth = Math.max(1, r * 0.04);
  for (const [bx, by, rot] of [
    [-r * 0.55, -r * 0.6, -Math.PI / 4],
    [r * 0.55, r * 0.6, -Math.PI / 4],
  ] as const) {
    c.save();
    c.translate(bx, by);
    c.rotate(rot);
    c.beginPath();
    if (c.roundRect) c.roundRect(-r * 0.1, -r * 0.42, r * 0.2, r * 0.84, r * 0.1);
    else c.rect(-r * 0.1, -r * 0.42, r * 0.2, r * 0.84);
    c.fill();
    c.stroke();
    c.restore();
  }
  c.restore();
}
