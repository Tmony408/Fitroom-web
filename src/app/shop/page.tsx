'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import SmartImage from '@/components/SmartImage';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Product, FitProfile, FitCheckResult, naira } from '@/lib/api';
import { categoryImage } from '@/lib/images';

const confColor = (c: number) => c >= 85 ? 'good' : c >= 65 ? 'warn' : 'bad';

function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [fits, setFits] = useState<Record<string, FitCheckResult>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [prods, profiles] = await Promise.all([api.listProducts(), api.listFitProfiles().catch(() => [])]);
        setProducts(prods);
        const p = profiles[0] ?? null;
        setProfile(p);
        // ready-made fit: compute a size + confidence per product for this profile
        if (p?.measurements.chest && p.measurements.waist) {
          const entries = await Promise.all(prods.map(async (prod) => {
            try {
              const r = await api.fitCheck({
                productId: prod.id, chest: p.measurements.chest.val, waist: p.measurements.waist.val,
                chestConfidence: p.measurements.chest.conf, waistConfidence: p.measurements.waist.conf,
                fitPreference: p.fitPref,
              });
              return [prod.id, r] as const;
            } catch { return [prod.id, null] as const; }
          }));
          setFits(Object.fromEntries(entries.filter(([, r]) => r) as [string, FitCheckResult][]));
        }
      } catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ The collection</span>
        <h1>Shop bespoke styles</h1>
        <p className="sub">{profile
          ? <>Sizes below are matched to your <b>{profile.label}</b> measurements. Pick a style to customise and order.</>
          : <>Pick a base style to customise. <Link href="/fit-profile" className="gradtext">Add measurements</Link> to see your size on every item.</>}</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="cards">{[0, 1, 2, 3].map((i) => <div key={i} className="card pcard"><div className="ph skeleton" /><div className="body"><div className="skeleton" style={{ height: 16, width: '70%' }} /></div></div>)}</div>
      ) : products.length === 0 ? (
        <div className="card">No products yet. Seed the API, or add products as a designer.</div>
      ) : (
        <Reveal className="cards">
          {products.map((p, i) => {
            const fit = fits[p.id];
            return (
              <Item key={p.id}>
                <Hover className="card pcard glow-border">
                  <div className="ph">
                    <SmartImage src={p.images?.[0] || categoryImage(p.category, i)} alt={p.title} gradientIndex={i} />
                    {fit && (
                      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 3 }}>
                        <span className={'pill ' + confColor(fit.fitConfidence)}>Your fit: {fit.recommendedSize} · {fit.fitConfidence}%</span>
                      </div>
                    )}
                    <div className="meta">
                      <span className="chip">{p.category}</span>
                      <h3 style={{ margin: '8px 0 2px', fontSize: 18 }}>{p.title}</h3>
                      <div className="muted small">{p.fabric} · stretch {p.stretch}</div>
                    </div>
                  </div>
                  <div className="body">
                    {fit?.warnings.length ? <div className="hint" style={{ marginTop: 0, marginBottom: 10, borderColor: 'rgba(245,179,1,.5)' }}>⚠️ {fit.warnings[0]}</div> : null}
                    <div className="spread">
                      <span className="big" style={{ fontSize: 19 }}>{naira(p.priceKobo)}</span>
                      <Link href={`/order/new?productId=${p.id}`} className="btn sm">Customise →</Link>
                    </div>
                  </div>
                </Hover>
              </Item>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}

export default function Page() {
  return <Protected role="CUSTOMER"><Shop /></Protected>;
}
