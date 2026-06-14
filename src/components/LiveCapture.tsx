'use client';
import { useEffect, useRef, useState } from 'react';
import { liveGuidance } from '@/lib/poseMeasure';

const HOLD_MS = 1200; // how long the pose must stay good before auto-capture

/**
 * Live camera capture: streams the camera, runs MediaPipe pose each frame,
 * shows positioning guidance, and AUTO-CAPTURES once the posture is right and
 * held steady. Captures a front then a side photo, returns both as data URLs.
 * Falls back gracefully (onCancel) if the camera or model is unavailable.
 */
export default function LiveCapture({
  onComplete, onCancel,
}: { onComplete: (front: string, side: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<'front' | 'side'>('front');
  const [message, setMessage] = useState('Starting camera…');
  const [ok, setOk] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState(false); // brief flash after a shot
  const [ready, setReady] = useState(false);

  // refs for the loop (avoid stale closures)
  const stepRef = useRef<'front' | 'side'>('front');
  const frontShot = useRef<string | null>(null);
  const goodSince = useRef<number | null>(null);
  const busy = useRef(false);
  const stop = useRef(false);
  const manualRef = useRef<(() => void) | null>(null); // manual shutter

  useEffect(() => {
    stop.current = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    const capture = (): string => {
      const video = videoRef.current!;
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, w, h); // un-mirrored frame for accurate pose
      return canvas.toDataURL('image/jpeg', 0.82);
    };

    // commit a shot (auto OR manual): flash, advance front→side, then complete
    const commitShot = (shot: string) => {
      setCaptured(true); setTimeout(() => setCaptured(false), 350);
      goodSince.current = null; setHoldPct(0);
      if (stepRef.current === 'front') {
        frontShot.current = shot;
        stepRef.current = 'side'; setStep('side');
        setMessage('Now turn to your side');
      } else {
        stop.current = true;
        cancelAnimationFrame(raf);
        stream?.getTracks().forEach((t) => t.stop());
        onComplete(frontShot.current!, shot);
      }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
        if (stop.current) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        // manual shutter — grab the current frame and advance, overriding auto
        manualRef.current = () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || stop.current) return;
          commitShot(capture());
        };

        const { getVideoLandmarker } = await import('@/lib/poseLive');
        const landmarker = await getVideoLandmarker();
        if (stop.current) return;
        setMessage('Position yourself in frame');

        let lastTs = -1;
        const loop = () => {
          if (stop.current) return;
          raf = requestAnimationFrame(loop);
          const video = videoRef.current;
          if (!video || video.readyState < 2 || busy.current) return;
          const ts = performance.now();
          if (ts === lastTs) return; lastTs = ts;
          busy.current = true;
          try {
            const res = landmarker.detectForVideo(video, ts);
            const lm = res?.landmarks?.[0];
            if (!lm) { setOk(false); setMessage('Stand in view of the camera'); goodSince.current = null; setHoldPct(0); busy.current = false; return; }
            const g = liveGuidance(lm, stepRef.current);
            setOk(g.ok); setMessage(g.message);
            if (g.ok) {
              if (goodSince.current == null) goodSince.current = ts;
              const held = ts - goodSince.current;
              setHoldPct(Math.min(100, (held / HOLD_MS) * 100));
              if (held >= HOLD_MS) {
                const done = stepRef.current === 'side';
                commitShot(capture()); // auto-capture
                if (done) return;
              }
            } else {
              goodSince.current = null; setHoldPct(0);
            }
          } catch { /* skip frame */ }
          finally { busy.current = false; }
        };
        loop();
      } catch (e) {
        setError((e as Error).name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access, or upload photos instead.'
          : 'Could not start the camera. Upload photos instead.');
      }
    })();

    return () => {
      stop.current = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onComplete]);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '3/4', background: '#000' }}>
        <video
          ref={videoRef}
          playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: captured ? 0.4 : 1, transition: 'opacity .2s' }}
        />
        {/* body guide outline */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '34%', height: '88%', border: `2px dashed ${ok ? 'var(--emerald)' : 'rgba(255,255,255,.5)'}`, borderRadius: 120, transition: 'border-color .2s' }} />
        </div>
        {/* step badge */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span className="pill info">{step === 'front' ? '1 · Front' : '2 · Side'}</span>
        </div>
        {/* guidance banner */}
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, background: 'rgba(12,8,19,.7)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 14px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: ok ? 'var(--emerald)' : '#fff' }}>{error || message}</span>
            {ok && !error && <span className="small muted">auto-capturing…</span>}
          </div>
          {ok && !error && (
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.15)', marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${holdPct}%`, height: '100%', background: 'var(--grad)', transition: 'width .1s linear' }} />
            </div>
          )}
        </div>
      </div>
      <div className="row" style={{ padding: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span className="muted small" style={{ flex: 1, minWidth: 160 }}>Stand back so your whole body fits the dashed guide. It snaps automatically — or tap Capture now.</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" onClick={() => manualRef.current?.()} disabled={!ready || !!error}>📸 Capture now</button>
          <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
