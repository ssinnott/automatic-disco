/**
 * Gesture math in MediaPipe's normalized [0,1] space.
 *
 * Jump and duck are **baseline-relative**: the PlayerManager learns each
 * player's resting hip height while they stand still, then fires when the hips
 * rise/drop by a fraction of torso height. This is far more forgiving than the
 * old velocity/leg-compression model (which needed ankles in frame and big
 * movements) and is the signal the Gesture Lab records and tunes.
 *
 * These functions are pure; the stateful baseline + smoothing live in
 * PlayerManager. Thresholds live in the mutable `gestureConfig` singleton so the
 * Lab can tune them live and gameplay picks the tuned values up immediately.
 */
import { LM, mid, pt, type Pose } from "../pose/landmarks";

export interface GestureConfig {
  /** Hips risen above rest by this fraction of torso height → jump. */
  jumpRise: number;
  /** Hips dropped below rest by this fraction of torso height → duck. */
  duckDrop: number;
  /** |shoulder offset| / shoulder width past this → lean. */
  leanRatio: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  jumpRise: 0.15,
  duckDrop: 0.15,
  leanRatio: 0.18,
};

/** Live, mutable config shared by gameplay and the Gesture Lab. */
export const gestureConfig: GestureConfig = { ...DEFAULT_GESTURE_CONFIG };

export function resetGestureConfig() {
  Object.assign(gestureConfig, DEFAULT_GESTURE_CONFIG);
}

/** Signed lean: >0 leaning to the player's right (screen right). */
export function leanOffset(pose: Pose): number {
  const hip = mid(pose, LM.L_HIP, LM.R_HIP);
  const sho = mid(pose, LM.L_SHOULDER, LM.R_SHOULDER);
  const shoulderWidth = Math.abs(pt(pose, LM.L_SHOULDER).x - pt(pose, LM.R_SHOULDER).x) + 1e-3;
  return (sho.x - hip.x) / shoulderWidth;
}

/** Vertical position of the hip midpoint. */
export function hipY(pose: Pose): number {
  return mid(pose, LM.L_HIP, LM.R_HIP).y;
}
