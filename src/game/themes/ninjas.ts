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
  drawCharacter(ctx, cx, footY, size, state: CharacterState) {
    drawHumanoid(ctx, {
      cx,
      footY,
      size,
      bodyColor: TURTLE_BODY,
      skinColor: TURTLE_SKIN,
      pose: state.pose,
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
