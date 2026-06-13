// On-device pose detection with MediaPipe (free, no key, photos never leave the
// browser). Lazily loads the WASM runtime + model from CDN on first use.
// Returns landmarks in PIXEL coordinates for poseMeasure.

import type { PoseInput } from './poseMeasure';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
// "lite" model: ~half the size of "full" → faster first-load and detection,
// accuracy is fine for our coarse measurement estimate.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Loaded once, reused.
let landmarkerPromise: Promise<{ detect: (img: HTMLImageElement) => unknown }> | null = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
      // If the WASM/model download fails, don't cache the rejection — allow a retry.
    })().catch((e) => { landmarkerPromise = null; throw e; });
  }
  return landmarkerPromise as Promise<{
    detect: (img: HTMLImageElement) => { landmarks: { x: number; y: number; visibility?: number }[][] };
  }>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image load failed'));
    img.src = src;
  });
}

/** Detect a single pose; returns pixel-space landmarks or null if none found. */
export async function detectPose(dataUrl: string): Promise<PoseInput | null> {
  const img = await loadImage(dataUrl);
  const landmarker = await getLandmarker();
  const result = landmarker.detect(img);
  const first = result?.landmarks?.[0];
  if (!first || first.length < 33) return null;
  const w = img.naturalWidth, h = img.naturalHeight;
  return {
    width: w,
    height: h,
    landmarks: first.map((p) => ({ x: p.x * w, y: p.y * h, visibility: p.visibility })),
  };
}
