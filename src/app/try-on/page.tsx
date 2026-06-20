'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Protected from '@/components/Protected';
import SmartImage from '@/components/SmartImage';
import { FadeIn } from '@/components/motion';
import { api, Product } from '@/lib/api';
import { downscaleImage } from '@/lib/image';
import { GARMENTS } from '@/lib/images';

function TryOn() {
  const params = useSearchParams();
  const [person, setPerson] = useState<string>('');
  const [garment, setGarment] = useState<string>('');
  const [garmentLabel, setGarmentLabel] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preselect a garment if a productId is passed (?productId=...)
  useEffect(() => {
    (async () => {
      try {
        const list = await api.listProducts();
        setProducts(list);
        const pid = params.get('productId');
        const chosen = pid ? list.find((p) => p.id === pid) : undefined;
        if (chosen?.images?.[0]) { setGarment(chosen.images[0]); setGarmentLabel(chosen.title); }
      } catch { /* fall back to default garments below */ }
    })();
  }, [params]);

  const onPerson = async (f?: File) => { if (f) setPerson(await downscaleImage(f, 1024, 0.85)); };
  const onGarmentFile = async (f?: File) => { if (f) { setGarment(await downscaleImage(f, 1024, 0.9)); setGarmentLabel('Your upload'); } };

  const run = async () => {
    setError(''); setResult(''); setNote('');
    if (!person) { setError('Add a photo of yourself first.'); return; }
    if (!garment) { setError('Pick or upload a garment.'); return; }
    setLoading(true);
    try {
      const r = await api.tryOn({ personImage: person, garmentImage: garment, category: garmentLabel });
      setResult(r.imageDataUrl || r.imageUrl || '');
      if (r.note) setNote(r.note);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const garmentChoices = products.length
    ? products.filter((p) => p.images?.[0]).slice(0, 8).map((p) => ({ src: p.images[0], label: p.title }))
    : GARMENTS.map((g) => ({ src: g.src, label: g.label }));

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ AI try-on</span>
        <h1>See it on you</h1>
        <p className="sub">Add a photo of yourself, pick the style, and our AI shows you wearing it. Best with a clear, full-body, front-facing photo on a plain background.</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}

      <div className="two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* INPUTS */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="label" style={{ fontWeight: 700, marginBottom: 8 }}>1 · Your photo</div>
          <label className="btn ghost" style={{ display: 'inline-block', cursor: 'pointer' }}>
            {person ? 'Change photo' : 'Upload your photo'}
            <input type="file" accept="image/*" hidden onChange={(e) => onPerson(e.target.files?.[0])} />
          </label>
          {person && (
            <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', maxWidth: 240 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person} alt="you" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <div className="label" style={{ fontWeight: 700, margin: '18px 0 8px' }}>2 · Garment</div>
          <div className="cards" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {garmentChoices.map((g, i) => (
              <button key={g.src + i} onClick={() => { setGarment(g.src); setGarmentLabel(g.label); }}
                className="card pcard" style={{ padding: 0, border: garment === g.src ? '2px solid var(--accent,#ec4899)' : undefined, cursor: 'pointer' }}>
                <div className="ph" style={{ aspectRatio: '3/4' }}><SmartImage src={g.src} alt={g.label} gradientIndex={i} /></div>
              </button>
            ))}
          </div>
          <label className="btn ghost" style={{ display: 'inline-block', cursor: 'pointer', marginTop: 10 }}>
            …or upload a garment image
            <input type="file" accept="image/*" hidden onChange={(e) => onGarmentFile(e.target.files?.[0])} />
          </label>

          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={run} disabled={loading}>
              {loading ? 'Generating…' : '✨ Try it on'}
            </button>
          </div>
        </div>

        {/* RESULT */}
        <div className="card" style={{ minWidth: 0 }}>
          <div className="label" style={{ fontWeight: 700, marginBottom: 8 }}>Result</div>
          {loading ? (
            <div className="center muted" style={{ minHeight: 280 }}>
              <div>
                <div className="skeleton" style={{ width: 220, height: 280, borderRadius: 12 }} />
                <p className="small muted" style={{ marginTop: 10 }}>This can take 20–60s on the free tier…</p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="try-on result" style={{ width: '100%', borderRadius: 12, display: 'block' }} />
              <div className="row" style={{ marginTop: 10, gap: 8 }}>
                <a className="btn ghost sm" href={result} download="fitroom-tryon.png">Download</a>
              </div>
            </>
          ) : (
            <div className="center muted" style={{ minHeight: 280, textAlign: 'center' }}>
              <p>Your try-on appears here.<br />Add a photo and a garment, then press “Try it on”.</p>
            </div>
          )}
          {note && <p className="small muted" style={{ marginTop: 10 }}>ℹ️ {note}</p>}
          <p className="small muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
            This is an AI-generated preview to help visualise the style — colours and details may differ from the final tailored garment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Protected>
      <Suspense fallback={<div className="center muted">Loading…</div>}>
        <TryOn />
      </Suspense>
    </Protected>
  );
}
