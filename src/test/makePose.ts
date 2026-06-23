import { LM, type Pose } from "../pose/landmarks";

/**
 * Build a synthetic 33-landmark pose for tests. Defaults describe a person
 * standing upright, facing the camera, arms at their sides. Override individual
 * joints to simulate gestures.
 */
export interface PoseParts {
  shoulderY?: number;
  shoulderX?: [number, number]; // [left, right]
  hipY?: number;
  hipX?: [number, number];
  ankleY?: number;
  wristY?: [number, number]; // [left, right]
}

export function makePose(parts: PoseParts = {}): Pose {
  const {
    shoulderY = 0.3,
    shoulderX = [0.45, 0.55],
    hipY = 0.55,
    hipX = [0.46, 0.54],
    ankleY = 0.9,
    wristY = [0.55, 0.55],
  } = parts;

  const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
  pose[LM.NOSE] = { x: 0.5, y: shoulderY - 0.12 };
  pose[LM.L_SHOULDER] = { x: shoulderX[0], y: shoulderY };
  pose[LM.R_SHOULDER] = { x: shoulderX[1], y: shoulderY };
  pose[LM.L_WRIST] = { x: shoulderX[0] - 0.02, y: wristY[0] };
  pose[LM.R_WRIST] = { x: shoulderX[1] + 0.02, y: wristY[1] };
  pose[LM.L_HIP] = { x: hipX[0], y: hipY };
  pose[LM.R_HIP] = { x: hipX[1], y: hipY };
  pose[LM.L_ANKLE] = { x: hipX[0], y: ankleY };
  pose[LM.R_ANKLE] = { x: hipX[1], y: ankleY };
  return pose;
}

/** Shift an entire pose horizontally (e.g. to place it in a zone). */
export function shiftX(pose: Pose, dx: number): Pose {
  return pose.map((l) => ({ ...l, x: l.x + dx }));
}
