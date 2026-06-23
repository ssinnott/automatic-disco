import { type CharacterState, type Theme } from "../types";
import { drawHumanoid } from "./draw";

export const piratesTheme: Theme = {
  id: "pirates",
  name: "Pirates",
  obstacleWord: "barrel",
  targetWord: "coin",
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
  drawCharacter(ctx, cx, footY, size, state: CharacterState) {
    drawHumanoid(ctx, {
      cx,
      footY,
      size,
      bodyColor: state.color,
      skinColor: "#f1c9a5",
      pose: state.pose,
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
