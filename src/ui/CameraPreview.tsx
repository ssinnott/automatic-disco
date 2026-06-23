import { useEffect, useRef } from "react";
import { LM, type Pose } from "../pose/landmarks";
import { PoseInput } from "../input/poseInput";

const JOINTS = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_WRIST, LM.R_WRIST, LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE];
const ZONE_COLORS = ["#50c878", "#5aa0ff", "#c878ff"];

/**
 * Mirrored webcam feed with a per-player tag + detected-action overlay — the web
 * equivalent of the old cv2 debug window, so you can confirm gestures fire. The
 * video element itself lives on PoseInput (hidden); we just draw it here.
 *
 * Players are tracked, not zoned, so the P# tag follows each body around the
 * frame (and the action list is colored to match), making it obvious who is who
 * even when players move past each other.
 */
export function CameraPreview({ pose, numPlayers }: { pose: PoseInput; numPlayers: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const w = (canvas.width = wrap.clientWidth);
      const h = (canvas.height = wrap.clientHeight);
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);

      // mirrored video frame
      const video = pose.video;
      if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      }

      const poses: Pose[] = pose.latestPoses();
      const actions = pose.snapshot();
      const positions = pose.positions();

      ctx.fillStyle = "#ffd166";
      for (const p of poses) {
        for (const j of JOINTS) {
          const lm = p[j];
          if (!lm) continue;
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A colored "P#: actions" tag pinned to each tracked player, drawn just
      // above their hips so it follows them around the frame.
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textBaseline = "bottom";
      for (let i = 0; i < numPlayers; i++) {
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        const list = [...actions[i]].sort().join(", ") || "—";
        const label = `P${i + 1}: ${list}`;
        const pos = positions[i];
        if (pos?.present && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
          const tx = Math.min(Math.max(pos.x * w, 4), w - 4 - ctx.measureText(label).width);
          const ty = Math.max(pos.y * h - 12, 18);
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(tx - 4, ty - 18, ctx.measureText(label).width + 8, 20);
          ctx.fillStyle = color;
          ctx.fillText(label, tx, ty);
        } else {
          // Not on camera yet — show their status stacked in the corner.
          ctx.fillStyle = color;
          ctx.textBaseline = "top";
          ctx.fillText(`P${i + 1}: (waiting)`, 8, 8 + i * 22);
          ctx.textBaseline = "bottom";
        }
      }

      // detection debug line
      ctx.textBaseline = "top";
      const dbg = pose.debug();
      ctx.fillStyle = dbg.error ? "#ff6b6b" : poses.length ? "#7CFC00" : "#ffae42";
      ctx.fillText(
        dbg.error ? `error: ${dbg.error}` : `bodies: ${poses.length} · frames: ${dbg.detections}`,
        8,
        h - 24,
      );
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [pose, numPlayers]);

  return (
    <div ref={wrapRef} className="camera-preview">
      <canvas ref={canvasRef} className="camera-preview-overlay" />
    </div>
  );
}
