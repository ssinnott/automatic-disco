/**
 * Pose backend — webcam + MediaPipe PoseLandmarker (multi-person), feeding the
 * zone-based PlayerManager. This is the real product input; KeyboardInput is the
 * camera-less stand-in. Replaces the Python PoseEngine (camera + YOLO thread).
 *
 * Coordinates are mirrored (x → 1 - x) so the camera behaves like a mirror and
 * the person on the left is P1, matching the displayed (mirrored) preview.
 *
 * The <video> is attached to the document (hidden, but rendered) for the whole
 * lifetime of the input so it keeps decoding frames even when no preview is on
 * screen — a detached/undisplayed video can stop advancing, which would freeze
 * detection while the rest of the game keeps animating.
 */
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { mirrorPose, type Pose } from "../pose/landmarks";
import { PlayerManager, type PlayerPosition, type PlayerSignals } from "./playerManager";
import { type InputSource, type PlayerActions, emptyActions } from "./types";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDebug {
  poseCount: number;
  detections: number;
  error: string | null;
}

export class PoseInput implements InputSource {
  readonly kind = "pose" as const;
  readonly video: HTMLVideoElement;
  private numPlayers: number;
  private mgr: PlayerManager;
  private landmarker: PoseLandmarker | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private running = false;
  private ts = 0; // strictly-increasing timestamp for detectForVideo
  private detections = 0;
  private error: string | null = null;
  private actions: PlayerActions;
  private poses: Pose[] = [];

  constructor(numPlayers: number) {
    this.numPlayers = numPlayers;
    this.mgr = new PlayerManager(numPlayers);
    this.actions = emptyActions(numPlayers);
    this.video = document.createElement("video");
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    // Hidden, but still rendered/decoding (not display:none).
    Object.assign(this.video.style, {
      position: "fixed",
      width: "2px",
      height: "2px",
      opacity: "0.01",
      bottom: "0",
      right: "0",
      pointerEvents: "none",
      zIndex: "-1",
    } satisfies Partial<CSSStyleDeclaration>);
  }

  async start(): Promise<void> {
    document.body.appendChild(this.video);
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: this.numPlayers,
    });

    this.running = true;
    // Prefer frame-accurate scheduling; fall back to rAF.
    if (typeof this.video.requestVideoFrameCallback === "function") {
      const onFrame = () => {
        if (!this.running) return;
        this.detect();
        this.video.requestVideoFrameCallback(onFrame);
      };
      this.video.requestVideoFrameCallback(onFrame);
    } else {
      this.loop();
    }
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    this.detect();
  };

  private detect() {
    const lm = this.landmarker;
    if (!lm || this.video.readyState < 2) return;
    this.ts = Math.max(this.ts + 1, performance.now());
    try {
      const result = lm.detectForVideo(this.video, this.ts);
      const poses: Pose[] = (result.landmarks ?? []).map((p) => mirrorPose(p as unknown as Pose));
      this.poses = poses;
      this.actions = this.mgr.update(poses, this.ts / 1000);
      this.detections++;
      this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }

  snapshot(): PlayerActions {
    return this.actions.map((a) => new Set(a));
  }

  /** Latest mirrored poses (coords align with the mirrored preview). */
  latestPoses(): Pose[] {
    return this.poses;
  }

  debug(): PoseDebug {
    return { poseCount: this.poses.length, detections: this.detections, error: this.error };
  }

  /** Raw per-player gesture signals, for the debug / tuning UI. */
  signals(): PlayerSignals[] {
    return this.mgr.signals();
  }

  /** Where each tracked player is, for drawing labels that follow them. */
  positions(): PlayerPosition[] {
    return this.mgr.positions();
  }

  /** Forget learned baselines + tracking so they re-seed from the current pose. */
  recalibrate(): void {
    this.mgr.resetAll();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.video.remove();
  }
}
