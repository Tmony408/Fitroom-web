'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Protected from '@/components/Protected';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Measurements, FitPreference, FitProfile } from '@/lib/api';
import { MEASUREMENT_FIELDS } from '@/lib/fields';
import { downscaleImage } from '@/lib/image';
import { useAuth } from '@/lib/auth';
import dynamic from 'next/dynamic';

const LiveCapture = dynamic(() => import('@/components/LiveCapture'), { ssr: false });

type Mode = 'manual' | 'photo';
const confColor = (c: number) => c >= 85 ? 'var(--emerald)' : c >= 65 ? 'var(--gold)' : '#ff8bc4';
const confLabel = (c: number) => c >= 85 ? 'High' : c >= 65 ? 'Medium' : 'Low';

// Suggested named sets — a customer keeps several (tight, regular, relaxed…).
const PRESETS: { label: string; fitPref: FitPreference }[] = [
  { label: 'Tight fit', fitPref: 'tight' },
  { label: 'Regular', fitPref: 'regular' },
  { label: 'Relaxed', fitPref: 'relaxed' },
  { label: 'Oversized', fitPref: 'oversized' },
];

function defaults(): Measurements {
  const m: Measurements = {};
  MEASUREMENT_FIELDS.forEach((f) => { m[f.key] = { val: f.base, conf: 70 }; });
  return m;
}

function Manager() {
  const { user, refresh } = useAuth();
  const [profiles, setProfiles] = useState<FitProfile[]>([]);
  const [consent, setConsent] = useState(user?.consentBodyData ?? false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // editor
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<Mode>('manual');
  const [meas, setMeas] = useState<Measurements>(defaults());
  const [fitPref, setFitPref] = useState<FitPreference>('regular');
  const [estimated, setEstimated] = useState(false);

  // photo (base64 data URLs so we can preview AND upload)
  const [front, setFront] = useState<string | null>(null);
  const [side, setSide] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState(175);
  const [estimating, setEstimating] = useState(false);
  const [retakeReason, setRetakeReason] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async () => {
    try { setProfiles(await api.listFitProfiles()); } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { loadProfiles(); }, []);
  // sync the consent checkbox once auth resolves (user may load after mount)
  useEffect(() => { if (user?.consentBodyData) setConsent(true); }, [user]);

  const setVal = (k: string, v: number) => setMeas((m) => ({ ...m, [k]: { val: v, conf: 99 } }));

  const applyPreset = (p: { label: string; fitPref: FitPreference }) => { setLabel(p.label); setFitPref(p.fitPref); };

  const duplicate = (p: FitProfile) => {
    setLabel(p.label + ' copy'); setFitPref(p.fitPref); setMeas(p.measurements); setEstimated(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Downscale in the browser before upload — phone photos are several MB, which
  // blows past the API's per-image/body limits. ~1280px JPEG is plenty for an
  // estimate and keeps the request small and reliable.
  const onPick = (which: 'front' | 'side') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await downscaleImage(file);
      if (which === 'front') setFront(url); else setSide(url);
    } catch { setError('Could not read that image — please try a different photo.'); }
  };

  // Last-resort: server height-based estimate (used only if the model itself
  // can't load/run — not for "body not clearly visible", which asks to retake).
  const runHeightFallback = async (fArg?: string, sArg?: string) => {
    const f = fArg ?? front; const s = sArg ?? side;
    setError(''); setRetakeReason(null); setEstimating(true);
    try {
      if (!user?.consentBodyData) { await api.setConsent(true); await refresh(); }
      const session = await api.createScan({ declaredHeightCm: heightCm });
      await api.uploadScanAssets(session.id, { front: f!, side: s!, qualityScore: 0.5 });
      const result = await api.generateScan(session.id, { declaredHeightCm: heightCm });
      if (result.measurements) setMeas(result.measurements);
      await api.deleteScan(session.id).catch(() => {});
      setEstimated(true); setMode('manual');
      setMsg('Estimated from your height — review each value before saving.');
    } catch (e) { setError((e as Error).message); }
    finally { setEstimating(false); }
  };

  // Estimate from photos. On-device MediaPipe pose detection → measurements in
  // the browser (photos never leave the device). If the body isn't clearly
  // visible, ask the user to RETAKE rather than guessing.
  const estimate = async (fArg?: string, sArg?: string) => {
    const f = fArg ?? front; const s = sArg ?? side;
    if (!f || !s) { setError('Add both a front and a side photo first.'); return; }
    if (!consent) { setError('Please accept body-data consent before scanning.'); return; }
    setError(''); setRetakeReason(null); setEstimating(true);
    try {
      if (!user?.consentBodyData) { await api.setConsent(true); await refresh(); }

      type Outcome =
        | { kind: 'ok'; measurements: Measurements }
        | { kind: 'retake'; reason: string }
        | { kind: 'timeout' };
      let outcome: Outcome = { kind: 'timeout' };
      try {
        const pose: Promise<Outcome> = (async () => {
          const { detectPose } = await import('@/lib/poseDetect');
          const { measurementsFromPose, assessPose } = await import('@/lib/poseMeasure');
          const fp = await detectPose(f);
          if (!fp) return { kind: 'retake', reason: 'We couldn’t detect a body in your front photo. Stand in full view, plain background, good lighting, then retake.' };
          const q = assessPose(fp);
          if (!q.ok) return { kind: 'retake', reason: q.reason };
          const sp = await detectPose(s).catch(() => null);
          const sideOk = !!sp && assessPose(sp).ok;
          return { kind: 'ok', measurements: measurementsFromPose(fp, heightCm, { sideAvailable: sideOk }).measurements };
        })();
        outcome = await Promise.race<Outcome>([
          pose,
          new Promise<Outcome>((resolve) => setTimeout(() => resolve({ kind: 'timeout' }), 20000)),
        ]);
      } catch { outcome = { kind: 'timeout' }; }

      if (outcome.kind === 'ok') {
        setMeas(outcome.measurements); setEstimated(true); setMode('manual');
        setMsg('Estimated from your photos on your device — review each value, then save.');
      } else if (outcome.kind === 'retake') {
        setRetakeReason(outcome.reason); // stay in photo mode and prompt a retake
      } else {
        await runHeightFallback(f, s); // model couldn't load/run → height estimate
      }
    } catch (e) { setError((e as Error).message); }
    finally { setEstimating(false); }
  };

  const save = async () => {
    setError(''); setMsg(''); setBusy(true);
    try {
      if (!consent) { setError('Please accept body-data consent to save.'); setBusy(false); return; }
      if (!label.trim()) { setError('Give this measurement set a name (e.g. Tight fit).'); setBusy(false); return; }
      if (!user?.consentBodyData) { await api.setConsent(true); await refresh(); }
      await api.createFitProfile({ measurements: meas, label: label.trim(), fitPref });
      setMsg(`Saved “${label.trim()}”.`);
      setLabel(''); setMeas(defaults()); setFitPref('regular'); setEstimated(false); setFront(null); setSide(null);
      await loadProfiles();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async (p: FitProfile) => {
    if (!confirm(`Delete measurement set “${p.label}”?`)) return;
    try { await api.deleteFitProfile(p.id); await loadProfiles(); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Your fit profiles</span>
        <h1>My measurement sets</h1>
        <p className="sub">Keep several named sets — a tight fit, a relaxed cut, wedding measurements — and choose the right one when you order. Numbers only; no photos are shared.</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}
      {msg && <div className="card tight" style={{ borderColor: 'var(--emerald)' }}><span className="pill good">OK</span> {msg}</div>}

      {/* Saved sets */}
      {profiles.length > 0 && (
        <Reveal className="cards">
          {profiles.map((p) => (
            <Item key={p.id}>
              <Hover className="card glow-border" style={{ height: '100%' }}>
                <div className="spread">
                  <b style={{ fontSize: 16 }}>{p.label}</b>
                  <span className="pill info">{p.fitPref}</span>
                </div>
                <div className="muted small" style={{ marginTop: 8 }}>
                  Chest {p.measurements.chest?.val ?? '—'}cm · Waist {p.measurements.waist?.val ?? '—'}cm · Height {p.measurements.height?.val ?? '—'}cm
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn ghost sm" onClick={() => duplicate(p)}>Duplicate &amp; edit</button>
                  <button className="btn ghost sm" onClick={() => remove(p)}>Delete</button>
                </div>
              </Hover>
            </Item>
          ))}
        </Reveal>
      )}

      {/* Editor */}
      <h2>{profiles.length ? 'Add another set' : 'Create your first set'}</h2>

      <div className="card">
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="small">I consent to FitRoom storing my measurements and sharing a measurement-only sheet with the designer I order from. I can delete my profile anytime.</span>
        </label>
      </div>

      <div className="card">
        <label>Name this set</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Tight fit, Wedding, Everyday" />
        <div className="row" style={{ marginTop: 10 }}>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>

        <div className="row" style={{ gap: 8, margin: '16px 0 4px' }}>
          {(['manual', 'photo'] as const).map((m) => (
            <button key={m} type="button" className={mode === m ? 'btn sm' : 'btn ghost sm'} onClick={() => setMode(m)}>
              {m === 'manual' ? '⌨️ Enter manually' : '📷 Estimate from photos'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'photo' ? (
            <motion.div key="photo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="muted small">Tell us your height, then add a front and side photo — upload them, or use the live camera that lines you up and snaps automatically. We estimate on your device; you review before saving.</p>
              <div style={{ maxWidth: 220, marginTop: 10 }}>
                <label>Your height (cm)</label>
                <input type="number" min={120} max={230} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button type="button" className={!useCamera ? 'btn sm' : 'btn ghost sm'} onClick={() => setUseCamera(false)}>📁 Upload photos</button>
                <button type="button" className={useCamera ? 'btn sm' : 'btn ghost sm'} onClick={() => setUseCamera(true)}>📷 Live camera</button>
              </div>

              {useCamera ? (
                <div style={{ marginTop: 12 }}>
                  <LiveCapture
                    onComplete={(f, s) => { setFront(f); setSide(s); setUseCamera(false); estimate(f, s); }}
                    onCancel={() => setUseCamera(false)}
                  />
                </div>
              ) : (
                <>
                  <div className="grid2" style={{ marginTop: 12 }}>
                    {([['front', front, frontRef, onPick('front')], ['side', side, sideRef, onPick('side')]] as const).map(([key, url, ref, handler]) => (
                      <div key={key} className="hero-img" style={{ aspectRatio: '3/4', cursor: 'pointer', background: 'rgba(255,255,255,.04)' }} onClick={() => ref.current?.click()}>
                        {url
                          ? <img src={url} alt={`${key} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ display: 'grid', placeItems: 'center', height: '100%', textAlign: 'center' }}><div><div style={{ fontSize: 34 }}>{key === 'front' ? '🧍' : '🚶'}</div><div className="muted small" style={{ marginTop: 6 }}>Tap to add {key} photo</div></div></div>}
                        <input ref={ref} type="file" accept="image/*" onChange={handler} style={{ display: 'none' }} />
                      </div>
                    ))}
                  </div>
                  <button className="btn alt" style={{ marginTop: 14, width: '100%' }} onClick={() => estimate()} disabled={estimating || !front || !side}>{estimating ? 'Analysing photos…' : '⚡ Estimate my measurements'}</button>
                </>
              )}

              {retakeReason && (
                <div className="card tight" style={{ borderColor: 'rgba(245,179,1,.6)', marginTop: 12 }}>
                  <div className="small">📷 {retakeReason}</div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn sm" onClick={() => { setFront(null); setSide(null); setRetakeReason(null); }}>Retake</button>
                    <button className="btn ghost sm" onClick={() => runHeightFallback()}>Use height estimate instead</button>
                  </div>
                </div>
              )}
              <div className="hint">Analysed <b>on your device</b> — photos never leave your phone/computer. First run downloads a small model. If a clear full-body view can’t be captured (~75% quality), you’ll be asked to retake.</div>
            </motion.div>
          ) : (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {estimated && <div className="hint" style={{ borderColor: 'rgba(245,179,1,.5)' }}>Estimated from your photos — check anything flagged Medium/Low.</div>}
              <div className="meas-grid" style={{ marginTop: 12 }}>
                {MEASUREMENT_FIELDS.map((f) => {
                  const o = meas[f.key];
                  return (
                    <div className="meas" key={f.key}>
                      <label>{f.label} (cm)</label>
                      <input type="number" value={o?.val ?? f.base} onChange={(e) => setVal(f.key, Number(e.target.value))} style={{ fontSize: 16, fontWeight: 700 }} />
                      {o && estimated && (
                        <div className="small" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: confColor(o.conf), display: 'inline-block' }} />{confLabel(o.conf)} · {o.conf}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ maxWidth: 240, marginTop: 14 }}>
                <label>Fit preference</label>
                <select value={fitPref} onChange={(e) => setFitPref(e.target.value as FitPreference)}>
                  {['tight', 'regular', 'relaxed', 'oversized'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button className="btn" style={{ marginTop: 16 }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save measurement set'}</button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Protected role="CUSTOMER"><Manager /></Protected>;
}
