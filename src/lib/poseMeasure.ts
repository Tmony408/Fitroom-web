// Pose → body measurements (free, on-device). Pure & deterministic so the math
// is unit-tested without the model. MediaPipe gives 33 landmarks; we scale them
// to centimetres using the declared height, read LINEAR measurements straight
// from joint distances (these reflect the real person), and APPROXIMATE
// circumferences from front widths + an anthropometric depth ratio via an
// ellipse. Circumferences are estimates — the customer confirms before saving.

import { Measurements } from './api';

export interface Landmark { x: number; y: number; visibility?: number } // PIXEL coords
export interface PoseInput { landmarks: Landmark[]; width: number; height: number }

// MediaPipe Pose landmark indices
const I = {
  NOSE: 0, L_EYE: 2, R_EYE: 5,
  L_SHO: 11, R_SHO: 12, L_ELB: 13, R_ELB: 14, L_WRI: 15, R_WRI: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANK: 27, R_ANK: 28,
  L_HEEL: 29, R_HEEL: 30, L_FOOT: 31, R_FOOT: 32,
} as const;

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Landmark, b: Landmark): Landmark => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const vis = (...l: Landmark[]) => l.reduce((s, p) => s + (p.visibility ?? 0.5), 0) / l.length;

/** Ramanujan ellipse circumference from full width & depth. */
export function ellipseCirc(width: number, depth: number): number {
  const a = width / 2, b = depth / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

// Depth-to-width ratios at each girth level (anthropometric averages).
const DEPTH_RATIO = { chest: 0.68, waist: 0.78, hip: 0.72 };
// Fallbacks (fraction of height) for fields pose can't measure well.
const HEIGHT_RATIO = { neck: 0.205, bicep: 0.18, wrist: 0.095, thigh: 0.31 };

const conf = (v: number, base = 60, span = 32) =>
  Math.max(45, Math.min(92, Math.round(base + v * span)));

export interface PoseMeasureResult { measurements: Measurements; modelVersion: string; staturePx: number }

/**
 * Capture quality gate: is the whole body clearly visible? If not, the caller
 * should ask the user to retake rather than produce a poor estimate.
 */
export function assessPose(p: PoseInput): { ok: boolean; reason: string } {
  const L = p.landmarks;
  const v = (i: number) => L[i]?.visibility ?? 0;
  // shoulders, hips, ankles must be reasonably visible
  const key = [I.L_SHO, I.R_SHO, I.L_HIP, I.R_HIP, I.L_ANK, I.R_ANK];
  const avgVis = key.reduce((s, i) => s + v(i), 0) / key.length;
  if (avgVis < 0.5) {
    return { ok: false, reason: 'We couldn’t clearly see your shoulders, hips and legs. Stand in full view with a plain background and good lighting, then retake.' };
  }
  // the body should fill a good portion of the frame vertically
  const headY = Math.min(L[I.L_EYE].y, L[I.R_EYE].y);
  const footY = Math.max(L[I.L_ANK].y, L[I.R_ANK].y, L[I.L_HEEL].y, L[I.R_HEEL].y);
  if ((footY - headY) < p.height * 0.45) {
    return { ok: false, reason: 'Your body fills too little of the photo. Step back so your whole body (head to feet) is in frame, then retake.' };
  }
  return { ok: true, reason: '' };
}

export function measurementsFromPose(
  front: PoseInput,
  heightCm: number,
  opts: { sideAvailable?: boolean } = {},
): PoseMeasureResult {
  const L = front.landmarks;
  const eyeMid = mid(L[I.L_EYE], L[I.R_EYE]);
  // lowest foot point as "floor"
  const footY = Math.max(L[I.L_HEEL].y, L[I.R_HEEL].y, L[I.L_FOOT].y, L[I.R_FOOT].y, L[I.L_ANK].y, L[I.R_ANK].y);
  // crown sits a little above the eyes
  const crownY = eyeMid.y - 0.10 * (footY - eyeMid.y);
  const staturePx = Math.max(1, footY - crownY);
  const s = heightCm / staturePx; // cm per pixel

  const shoMid = mid(L[I.L_SHO], L[I.R_SHO]);
  const hipMid = mid(L[I.L_HIP], L[I.R_HIP]);
  const shoulderPx = dist(L[I.L_SHO], L[I.R_SHO]);
  const hipPx = dist(L[I.L_HIP], L[I.R_HIP]);

  // linear (cm) — straight from the person's joints
  const armCm = (dist(L[I.L_SHO], L[I.L_ELB]) + dist(L[I.L_ELB], L[I.L_WRI])) * s;
  const inseamCm = (dist(L[I.L_HIP], L[I.L_KNEE]) + dist(L[I.L_KNEE], L[I.L_ANK])) * s;
  const topLenCm = dist(shoMid, hipMid) * s;
  const shoulderCm = shoulderPx * s;
  const trouserCm = dist(L[I.L_HIP], L[I.L_ANK]) * s + 6;

  // widths → circumferences (width from front, depth via ratio)
  const chestWidth = shoulderPx * s * 0.92;
  const waistWidth = hipPx * s * 0.85;
  const hipWidth = hipPx * s * 1.05;
  const sideBoost = opts.sideAvailable ? 1 : 0.95; // a side photo slightly tightens depth assumptions
  const chestCirc = ellipseCirc(chestWidth, chestWidth * DEPTH_RATIO.chest * sideBoost);
  const waistCirc = ellipseCirc(waistWidth, waistWidth * DEPTH_RATIO.waist * sideBoost);
  const hipCirc = ellipseCirc(hipWidth, hipWidth * DEPTH_RATIO.hip * sideBoost);

  const cSide = opts.sideAvailable ? 0.12 : 0;
  const vShoulder = vis(L[I.L_SHO], L[I.R_SHO]);
  const vHip = vis(L[I.L_HIP], L[I.R_HIP]);
  const vArm = vis(L[I.L_SHO], L[I.L_ELB], L[I.L_WRI]);
  const vLeg = vis(L[I.L_HIP], L[I.L_KNEE], L[I.L_ANK]);

  const r = (n: number) => Math.round(n);
  const measurements: Measurements = {
    height: { val: heightCm, conf: 99 },
    shoulder: { val: r(shoulderCm), conf: conf(vShoulder + cSide) },
    chest: { val: r(chestCirc), conf: conf(vShoulder * 0.7 + cSide) },
    waist: { val: r(waistCirc), conf: conf(vHip * 0.7 + cSide) },
    hip: { val: r(hipCirc), conf: conf(vHip * 0.8 + cSide) },
    armLength: { val: r(armCm), conf: conf(vArm + cSide) },
    sleeve: { val: r(armCm * 0.98), conf: conf(vArm + cSide) },
    inseam: { val: r(inseamCm), conf: conf(vLeg + cSide) },
    trouser: { val: r(trouserCm), conf: conf(vLeg + cSide) },
    topLength: { val: r(topLenCm), conf: conf((vShoulder + vHip) / 2 + cSide) },
    // pose-weak fields → height-ratio fallback, lower confidence
    neck: { val: r(heightCm * HEIGHT_RATIO.neck), conf: 55 },
    bicep: { val: r(heightCm * HEIGHT_RATIO.bicep), conf: 52 },
    wrist: { val: r(heightCm * HEIGHT_RATIO.wrist), conf: 52 },
    thigh: { val: r(heightCm * HEIGHT_RATIO.thigh), conf: 54 },
  };

  return { measurements, modelVersion: 'mediapipe-pose-v1', staturePx };
}
