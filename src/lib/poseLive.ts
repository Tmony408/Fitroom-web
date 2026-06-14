// MediaPipe pose landmarker in VIDEO mode for the live camera. Separate from
// the IMAGE-mode one in poseDetect.ts (a landmarker is created per running mode).

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export interface VideoLandmarker {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
    landmarks: { x: number; y: number; visibility?: number }[][];
  };
  close?: () => void;
}

let promise: Promise<VideoLandmarker> | null = null;

export async function getVideoLandmarker(): Promise<VideoLandmarker> {
  if (!promise) {
    promise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numPoses: 1,
      }) as unknown as VideoLandmarker;
    })().catch((e) => { promise = null; throw e; });
  }
  return promise;
}
