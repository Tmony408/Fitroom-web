'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Protected from '@/components/Protected';
import SmartImage from '@/components/SmartImage';
import { FadeIn } from '@/components/motion';
import { api, Product, FitPreference, FitCheckResult, FitProfile } from '@/lib/api';
import { categoryImage } from '@/lib/images';

// Client-only: Three.js touches window, so never SSR it.
const Avatar3D = dynamic(() => import('@/components/Avatar3D'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ width: '100%', height: '100%' }} />,
});
const GARMENT_COLORS = ['#2e6b5e', '#7c3a52', '#1f3a6b', '#caa24a', '#3a3f4b', '#7a4a2b'];

function Builder() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get('productId') ?? undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [profiles, setProfiles] = useState<FitProfile[]>([]);
  const [profileId, setProfileId] = useState<string>('');
  const [neck, setNeck] = useState('Mandarin');
  const [sleeve, setSleeve] = useState('Long');
  const [length, setLength] = useState('Hip');
  const [addons, setAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [view, setView] = useState<'image' | '3d'>('image');
  const [garmentColor, setGarmentColor] = useState(GARMENT_COLORS[0]);
  const [clothSim, setClothSim] = useState(true);
  const [rec, setRec] = useState<FitCheckResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => profiles.find((p) => p.id === profileId) ?? null, [profiles, profileId]);

  useEffect(() => {
    (async () => {
      try {
        if (productId) setProduct(await api.getProduct(productId));
        const list = await api.listFitProfiles().catch(() => []);
        setProfiles(list);
        if (list.length) setProfileId(list[0].id);
      } catch (e) { setError((e as Error).message); }
    })();
  }, [productId]);

  // live recommendation from the chosen measurement set (guard against stale
  // responses overwriting a newer one)
  useEffect(() => {
    let active = true;
    (async () => {
      const m = selected?.measurements;
      if (!product || !m?.chest || !m?.waist) { setRec(null); return; }
      try {
        const r = await api.fitCheck({
          productId: product.id, chest: m.chest.val, waist: m.waist.val,
          chestConfidence: m.chest.conf, waistConfidence: m.waist.conf,
          fitPreference: selected!.fitPref,
        });
        if (active) setRec(r);
      } catch { if (active) setRec(null); }
    })();
    return () => { active = false; };
  }, [product, selected]);

  const toggle = (a: string) => setAddons((x) => x.includes(a) ? x.filter((y) => y !== a) : [...x, a]);

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      if (!product) { setError('No product selected.'); setBusy(false); return; }
      if (!selected) { setError('Choose a measurement set first.'); setBusy(false); return; }
      const order = await api.createOrder({
        designerId: product.designerId, productId: product.id, garment: product.category,
        fabric: product.fabric, style: { neck, sleeve, length }, addons, notes,
        fitPreference: selected.fitPref, measurements: selected.measurements,
      });
      router.replace(`/orders/${order.id}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!productId) return <div className="card">No product selected. Go to the <a href="/shop" className="gradtext">shop</a>.</div>;
  const confColor = (c: number) => c >= 85 ? 'var(--emerald)' : c >= 65 ? 'var(--gold)' : '#ff8bc4';

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Customise</span>
        <h1>{product ? product.title : 'Loading…'}</h1>
        <p className="sub">{product ? `${product.fabric} · tailor it to your taste, then send with your measurements.` : ''}</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}
      {profiles.length === 0 && <div className="hint">You have no measurement sets yet — <a href="/fit-profile" className="gradtext">create one first</a> so the designer gets your sheet.</div>}

      <div className="two">
        <FadeIn delay={0.05} className="card">
          {/* Measurement set picker */}
          <label>Measurement set</label>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={!profiles.length}>
            {profiles.length === 0 && <option>No sets yet</option>}
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.fitPref}</option>)}
          </select>
          {selected && <div className="hint" style={{ marginTop: 8 }}>Ordering with <b>{selected.label}</b> — chest {selected.measurements.chest?.val ?? '—'}cm, waist {selected.measurements.waist?.val ?? '—'}cm.</div>}

          <div className="grid2" style={{ marginTop: 8 }}>
            <div><label>Neckline</label><select value={neck} onChange={(e) => setNeck(e.target.value)}>{['Mandarin', 'Round', 'V-neck'].map((o) => <option key={o}>{o}</option>)}</select></div>
            <div><label>Sleeve</label><select value={sleeve} onChange={(e) => setSleeve(e.target.value)}>{['Long', 'Short', 'Sleeveless'].map((o) => <option key={o}>{o}</option>)}</select></div>
            <div><label>Length</label><select value={length} onChange={(e) => setLength(e.target.value)}>{['Hip', 'Knee', 'Short'].map((o) => <option key={o}>{o}</option>)}</select></div>
          </div>
          <label style={{ marginTop: 14 }}>Add-ons</label>
          <div className="row">
            {['Embroidery', 'Pocket square', 'Contrast buttons', 'Lining'].map((a) => (
              <motion.button type="button" key={a} whileTap={{ scale: 0.94 }} className="chip"
                style={{ cursor: 'pointer', borderColor: addons.includes(a) ? 'var(--magenta)' : 'var(--line)', color: addons.includes(a) ? '#fff' : 'var(--ink)' }}
                onClick={() => toggle(a)}>{addons.includes(a) ? '✓ ' : '+ '}{a}</motion.button>
            ))}
          </div>
          <label style={{ marginTop: 14 }}>Notes for the designer</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. slightly tapered trousers, hidden zip…" />
          <button className="btn" style={{ marginTop: 16, width: '100%' }} onClick={submit} disabled={busy || !product || !selected}>{busy ? 'Sending…' : 'Send request to designer →'}</button>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="row" style={{ gap: 6, marginBottom: 10 }}>
            <button className={view === 'image' ? 'btn sm' : 'btn ghost sm'} onClick={() => setView('image')}>🖼 Photo</button>
            <button className={view === '3d' ? 'btn sm' : 'btn ghost sm'} onClick={() => setView('3d')}>🧍 3D preview</button>
            {view === '3d' && (
              <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
                <button className={clothSim ? 'btn sm' : 'btn ghost sm'} onClick={() => setClothSim((v) => !v)} title="Toggle cloth simulation">🧵 Cloth</button>
                {GARMENT_COLORS.map((c) => (
                  <button key={c} onClick={() => setGarmentColor(c)} aria-label="colour"
                    style={{ width: 22, height: 22, borderRadius: 7, background: c, border: garmentColor === c ? '2px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer' }} />
                ))}
              </div>
            )}
          </div>
          <div className="hero-img" style={{ aspectRatio: '4/4.2', marginBottom: 16 }}>
            {view === '3d'
              ? <Avatar3D measurements={selected?.measurements ?? {}} garment={product?.category || 'Senator'} color={garmentColor} length={length} cloth={clothSim} />
              : <SmartImage src={product?.images?.[0] || categoryImage(product?.category || 'Senator')} alt={product?.title || 'style'} gradientIndex={2} />}
          </div>
          {view === '3d' && <div className="hint" style={{ marginTop: -6 }}>Drag to rotate. The silhouette is built from <b>{selected?.label ?? 'default'}</b> measurements — switch sets to compare fits.</div>}
          <div className="card glow-border">
            <h3>Live size recommendation</h3>
            <AnimatePresence mode="wait">
              {rec ? (
                <motion.div key={rec.recommendedSize + rec.fitConfidence}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
                    <div><div className="muted small">Recommended</div><div className="big">{rec.recommendedSize}</div></div>
                    <div><div className="muted small">Confidence</div><div className="big" style={{ color: confColor(rec.fitConfidence) }}>{rec.fitConfidence}%</div></div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {rec.warnings.length ? rec.warnings.map((w, i) => <div className="hint" key={i} style={{ borderColor: 'rgba(245,179,1,.5)' }}>⚠️ {w}</div>)
                      : <div className="hint" style={{ borderColor: 'rgba(19,192,138,.4)' }}>✓ No fit warnings.</div>}
                    {rec.alternativeSize && <span className="chip">Alt: {rec.alternativeSize} for a looser fit</span>}
                  </div>
                </motion.div>
              ) : <div className="muted small">Pick a measurement set with chest &amp; waist to see a live recommendation.</div>}
            </AnimatePresence>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Protected role="CUSTOMER">
      <Suspense fallback={<div className="muted">Loading…</div>}><Builder /></Suspense>
    </Protected>
  );
}
