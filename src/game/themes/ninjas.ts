import { type CharacterState, type Theme } from "../types";
import { drawHumanoid } from "./draw";

export const ninjasTheme: Theme = {
  id: "ninjas",
  name: "Ninjas",
  obstacleWord: "shuriken",
  targetWord: "scroll",
  palette: {
    sky: "#1b1538",
    skyAccent: "#2d2356",
    ground: "#15324a",
    obstacle: "#cfd8e3",
    target: "#f4e1a0",
    text: "#e9e4ff",
    players: ["#e2574c", "#43b0c9", "#c9a227"],
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
  drawCharacter(ctx, cx, footY, size, state: CharacterState) {
    drawHumanoid(ctx, {
      cx,
      footY,
      size,
      bodyColor: state.color,
      skinColor: "#21304a",
      pose: state.pose,
      accessory: (c, hx, hy, hr) => {
        // headband with two trailing tails
        c.fillStyle = "#d8362a";
        c.fillRect(hx - hr * 1.1, hy - hr * 0.55, hr * 2.2, hr * 0.45);
        c.beginPath();
        c.moveTo(hx + hr * 1.0, hy - hr * 0.5);
        c.lineTo(hx + hr * 1.9, hy - hr * 0.1);
        c.lineTo(hx + hr * 1.0, hy - hr * 0.05);
        c.closePath();
        c.fill();
        // a slim eye visor stripe
        c.fillStyle = "#e9e4ff";
        c.fillRect(hx - hr * 0.7, hy - hr * 0.05, hr * 1.4, hr * 0.22);
      },
    });
  },
};
