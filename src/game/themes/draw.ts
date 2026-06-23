/**
 * Shared geometric-character drawing. Both themes are just colored primitives
 * (circle head + capsule body + line limbs) plus a small headgear accessory, so
 * the same character reads as a pirate or a ninja with one extra shape.
 */

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Draws headgear given the head center and radius (in the current transform). */
export type Accessory = (ctx: CanvasRenderingContext2D, hx: number, hy: number, hr: number) => void;

export interface HumanoidOpts {
  cx: number;
  footY: number;
  /** Full standing height in px (foot → top of head). */
  size: number;
  bodyColor: string;
  skinColor: string;
  /** "idle" | "jump" | "duck" | "left" | "right" | "grab" | "hit" */
  pose: string;
  accessory?: Accessory;
}

export function drawHumanoid(ctx: CanvasRenderingContext2D, o: HumanoidOpts) {
  const { pose } = o;
  const lift = pose === "jump" ? o.size * 0.18 : 0;
  const h = pose === "duck" ? o.size * 0.62 : o.size;
  const footY = o.footY - lift;
  const top = footY - h;

  ctx.save();
  if (pose === "left" || pose === "right") {
    ctx.translate(o.cx, footY);
    ctx.rotate((pose === "left" ? -1 : 1) * 0.2);
    ctx.translate(-o.cx, -footY);
  }

  const headR = h * 0.17;
  const headCx = o.cx;
  const headCy = top + headR;
  const bodyTop = headCy + headR * 0.6;
  const bodyW = h * 0.26;
  const bodyColor = pose === "hit" ? "#e24b4b" : o.bodyColor;

  // legs
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = h * 0.07;
  ctx.lineCap = "round";
  const hipY = footY - h * 0.32;
  ctx.beginPath();
  ctx.moveTo(o.cx - bodyW * 0.3, hipY);
  ctx.lineTo(o.cx - bodyW * 0.5, footY);
  ctx.moveTo(o.cx + bodyW * 0.3, hipY);
  ctx.lineTo(o.cx + bodyW * 0.5, footY);
  ctx.stroke();

  // body
  ctx.fillStyle = bodyColor;
  roundRect(ctx, o.cx - bodyW / 2, bodyTop, bodyW, hipY - bodyTop, bodyW * 0.4);
  ctx.fill();

  // arms
  const shoulderY = bodyTop + h * 0.06;
  ctx.beginPath();
  ctx.moveTo(o.cx - bodyW * 0.5, shoulderY);
  if (pose === "grab") {
    ctx.lineTo(o.cx - bodyW * 0.9, shoulderY - h * 0.22); // left arm raised
  } else {
    ctx.lineTo(o.cx - bodyW * 0.8, shoulderY + h * 0.18);
  }
  ctx.moveTo(o.cx + bodyW * 0.5, shoulderY);
  if (pose === "grab") {
    ctx.lineTo(o.cx + bodyW * 0.9, shoulderY - h * 0.22); // right arm raised
  } else {
    ctx.lineTo(o.cx + bodyW * 0.8, shoulderY + h * 0.18);
  }
  ctx.stroke();

  // head
  ctx.fillStyle = o.skinColor;
  ctx.beginPath();
  ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#1c1c1c";
  const eyeDx = headR * 0.4;
  const eyeR = Math.max(1.5, headR * 0.12);
  ctx.beginPath();
  ctx.arc(headCx - eyeDx, headCy, eyeR, 0, Math.PI * 2);
  ctx.arc(headCx + eyeDx, headCy, eyeR, 0, Math.PI * 2);
  ctx.fill();

  o.accessory?.(ctx, headCx, headCy, headR);
  ctx.restore();
}
