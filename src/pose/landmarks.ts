/**
 * MediaPipe BlazePose uses 33 landmarks (the original YOLO rig used COCO-17).
 * A landmark's x/y are normalized to [0, 1] of the image; y grows downward.
 *
 * We only need a handful of joints for gesture detection. Indices below are the
 * standard MediaPipe Pose ordering.
 */
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const;

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** One detected body: the 33 MediaPipe landmarks in normalized image coords. */
export type Pose = Landmark[];

export function pt(pose: Pose, idx: number): Landmark {
  return pose[idx];
}

export function mid(pose: Pose, a: number, b: number): { x: number; y: number } {
  return { x: (pose[a].x + pose[b].x) / 2, y: (pose[a].y + pose[b].y) / 2 };
}

/** Hips are the most stable horizontal anchor for player tracking. */
export function centroidX(pose: Pose): number {
  return (pose[LM.L_HIP].x + pose[LM.R_HIP].x) / 2;
}

/** Hip-midpoint height — paired with centroidX to place a player's label. */
export function centroidY(pose: Pose): number {
  return (pose[LM.L_HIP].y + pose[LM.R_HIP].y) / 2;
}

/**
 * Landmark visibility in [0,1]. MediaPipe drops this toward 0 when a joint
 * leaves the frame or is occluded. Synthetic test poses omit it; treat a
 * missing value as fully visible so tests and non-MediaPipe sources still work.
 */
export function vis(pose: Pose, idx: number): number {
  const v = pose[idx]?.visibility;
  return v === undefined ? 1 : v;
}

/**
 * Mean visibility of the four torso anchors (shoulders + hips) that jump, duck
 * and lean rely on. When the head or legs leave the frame these stay high, so
 * we can keep detecting from the torso while ignoring the out-of-frame noise.
 */
export function torsoVisibility(pose: Pose): number {
  return (
    (vis(pose, LM.L_SHOULDER) + vis(pose, LM.R_SHOULDER) + vis(pose, LM.L_HIP) + vis(pose, LM.R_HIP)) / 4
  );
}

/** Vertical torso span (shoulder→hip); used to score "closest" body per zone. */
export function torsoHeight(pose: Pose): number {
  return Math.abs(mid(pose, LM.L_SHOULDER, LM.R_SHOULDER).y - mid(pose, LM.L_HIP, LM.R_HIP).y);
}

/** Mirror a pose horizontally (x → 1 - x) so the camera feels like a mirror. */
export function mirrorPose(pose: Pose): Pose {
  return pose.map((l) => ({ ...l, x: 1 - l.x }));
}
