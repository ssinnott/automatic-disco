import { useEffect, useRef } from "react";
import { LM, type Pose } from "../pose/landmarks";
import { PoseInput } from "../input/poseInput";

const JOINTS = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_WRIST, LM.R_WRIST, LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE];
const ZONE_COLORS = ["#50c878", "#5aa0ff", "#c878ff"];

/**
 * Mirrored webcam feed with a zone-line + detected-action overlay — the web
 * equivalent of the old cv2 debug window, so you can confirm gestures fire. The
 * video element itself lives on PoseInput (hidden); we just draw it here.
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

      // zone divider lines
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      for (let i = 1; i < numPlayers; i++) {
        const x = (i / numPlayers) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const poses: Pose[] = pose.latestPoses();
      const actions = pose.snapshot();

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

      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textBaseline = "top";
      for (let i = 0; i < numPlayers; i++) {
        const x0 = (i / numPlayers) * w;
        ctx.fillStyle = ZONE_COLORS[i % ZONE_COLORS.length];
        const list = [...actions[i]].sort().join(", ") || "—";
        ctx.fillText(`P${i + 1}: ${list}`, x0 + 8, 8);
      }

      // detection debug line
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
