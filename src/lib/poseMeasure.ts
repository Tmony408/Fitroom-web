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
 * Capture quality gate. Produces a 0..1 coverage score from how well the body
 * is seen (visibility), whether the whole body is in frame, and whether the
 * person is upright/square. We require >= 0.75 — below that the caller asks
 * the user to retake rather than produce an unreliable estimate.
 */
export const MIN_CAPTURE_SCORE = 0.75;

export function assessPose(p: PoseInput): { ok: boolean; reason: string; score: number } {
  const L = p.landmarks;
  const v = (i: number) => L[i]?.visibility ?? 0;

  const key = [I.L_SHO, I.R_SHO, I.L_HIP, I.R_HIP, I.L_KNEE, I.R_KNEE, I.L_ANK, I.R_ANK];
  const vis = key.reduce((s, i) => s + v(i), 0) / key.length; // 0..1

  const headY = Math.min(L[I.L_EYE].y, L[I.R_EYE].y);
  const footY = Math.max(L[I.L_ANK].y, L[I.R_ANK].y, L[I.L_HEEL].y, L[I.R_HEEL].y);
  const spanFrac = (footY - headY) / p.height;        // how much of the frame the body fills
  const fullBody = Math.max(0, Math.min(1, spanFrac / 0.7));

  const shoulderTilt = Math.abs(L[I.L_SHO].y - L[I.R_SHO].y) / p.height;
  const upright = Math.max(0, Math.min(1, 1 - shoulderTilt / 0.08));

  const score = 0.5 * vis + 0.3 * fullBody + 0.2 * upright;
  // hard component gates so high visibility alone can't pass a bad framing/posture
  const ok = score >= MIN_CAPTURE_SCORE && vis >= 0.6 && fullBody >= 0.6 && upright >= 0.4;

  let reason = '';
  if (!ok) {
    if (vis < 0.6) reason = 'We couldn’t clearly see your full body. Stand in full view, plain background, good lighting, then retake.';
    else if (fullBody < 0.6) reason = 'Make sure your whole body — head to feet — is in the frame, then retake.';
    else if (upright < 0.4) reason = 'Stand straight and face the camera squarely, then retake.';
    else reason = 'We couldn’t capture a clear enough view. Improve lighting and framing, then retake.';
  }
  return { ok, reason, score };
}

export interface Guidance { ok: boolean; score: number; message: string }

/**
 * Real-time positioning feedback for the live camera (normalized 0..1 coords).
 * Returns a single actionable instruction; `ok` means hold still to auto-capture.
 */
export function liveGuidance(
  lm: { x: number; y: number; visibility?: number }[],
  step: 'front' | 'side' = 'front',
): Guidance {
  const v = (i: number) => lm[i]?.visibility ?? 0;
  const feetSeen = v(I.L_ANK) > 0.5 || v(I.R_ANK) > 0.5;
  const shouldersSeen = (v(I.L_SHO) + v(I.R_SHO)) / 2 > 0.5;
  if (!feetSeen || !shouldersSeen) return { ok: false, score: 0.2, message: 'Step back so your whole body is visible' };

  const headY = Math.min(lm[I.L_EYE].y, lm[I.R_EYE].y);
  const footY = Math.max(lm[I.L_ANK].y, lm[I.R_ANK].y);
  const span = footY - headY;
  if (span < 0.55) return { ok: false, score: 0.4, message: 'Move closer — fill the frame head to toe' };
  if (footY > 0.99 || headY < 0.02) return { ok: false, score: 0.5, message: 'Step back a little — keep head and feet in view' };

  const midX = (lm[I.L_HIP].x + lm[I.R_HIP].x) / 2;
  if (Math.abs(midX - 0.5) > 0.14) {
    return { ok: false, score: 0.55, message: midX < 0.5 ? 'Move right to center yourself' : 'Move left to center yourself' };
  }
  if (step === 'front') {
    const tilt = Math.abs(lm[I.L_SHO].y - lm[I.R_SHO].y);
    if (tilt > 0.06) return { ok: false, score: 0.6, message: 'Stand straight and square to the camera' };
  }
  return { ok: true, score: 0.95, message: 'Perfect — hold still' };
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
