import { type CharacterState, type Theme } from "../types";
import { drawHumanoid } from "./draw";

export const piratesTheme: Theme = {
  id: "pirates",
  name: "Pirates",
  obstacleWord: "cannonball",
  targetWord: "hat",
  // Runner pickups: the captain's hat plus a gold doubloon.
  collectibles: [
    { name: "Hat", draw: (c, cx, cy, r, a) => piratesTheme.drawTarget(c, cx, cy, r, a) },
    { name: "Doubloon", draw: drawDoubloon },
  ],
  music: ["/audio/pirate-1.mp3", "/audio/pirate-2.mp3", "/audio/pirate-3.mp3"],
  palette: {
    sky: "#7ec8e3",
    skyAccent: "#bfe9f5",
    ground: "#e3c79a",
    obstacle: "#7a4a21",
    target: "#ffd23f",
    text: "#15324a",
    players: ["#1f7a4d", "#1d5fa8", "#9c3fb0"],
  },
  drawBackground(ctx, x, y, w, h) {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, "#7ec8e3");
    sky.addColorStop(1, "#bfe9f5");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // sea band
    ctx.fillStyle = "#2a7fb8";
    ctx.fillRect(x, y + h * 0.62, w, h * 0.18);
    // sand
    ctx.fillStyle = "#e3c79a";
    ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  },
  drawTarget(ctx, cx, cy, r, angle) {
    // captain's tricorne hat, gently rocking as it falls (the "good" pickup)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(angle) * 0.35);
    // brim
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 1.25, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // tricorne crown (rounded triangle)
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, r * 0.3);
    ctx.quadraticCurveTo(-r * 0.5, -r * 1.0, 0, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.0, r * 1.0, r * 0.3);
    ctx.closePath();
    ctx.fill();
    // gold trim along the brim
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 1.05, r * 0.34, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
    // skull emblem
    ctx.fillStyle = "#f4f0e6";
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b2b";
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.13, r * 0.06, 0, Math.PI * 2);
    ctx.arc(r * 0.1, -r * 0.13, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  drawObstacle(ctx, cx, cy, r, _angle) {
    // an iron cannonball (the "bad" object)
    ctx.fillStyle = "#26262b";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // sheen
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.32, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  },
  drawCharacter(ctx, cx, footY, size, state: CharacterState) {
    drawHumanoid(ctx, {
      cx,
      footY,
      size,
      bodyColor: state.color,
      skinColor: "#f1c9a5",
      pose: state.pose,
      phase: state.phase,
      lean: state.lean,
      crouch: state.crouch,
      accessory: (c, hx, hy, hr) => {
        // tricorne hat: dark triangle band above the head
        c.fillStyle = "#2b2b2b";
        c.beginPath();
        c.moveTo(hx - hr * 1.3, hy - hr * 0.5);
        c.lineTo(hx + hr * 1.3, hy - hr * 0.5);
        c.lineTo(hx, hy - hr * 1.7);
        c.closePath();
        c.fill();
        // eye patch
        c.fillStyle = "#1c1c1c";
        c.fillRect(hx + hr * 0.1, hy - hr * 0.15, hr * 0.6, hr * 0.3);
      },
    });
  },
};

/** A spinning gold doubloon (foreshortened as it tumbles) with a star stamp. */
function drawDoubloon(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number) {
  c.save();
  c.translate(cx, cy);
  const squash = Math.abs(Math.cos(angle)); // edge-on at the extremes → a flip
  c.scale(Math.max(0.18, squash), 1);
  c.fillStyle = "#f0c33c";
  c.strokeStyle = "#b8902a";
  c.lineWidth = Math.max(1.5, r * 0.12);
  c.beginPath();
  c.arc(0, 0, r * 0.95, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // star stamp
  c.fillStyle = "#d9a92e";
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r * 0.5 : r * 0.22;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
  c.restore();
}
