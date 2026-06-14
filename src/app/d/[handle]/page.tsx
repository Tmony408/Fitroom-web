'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { FadeIn, ScrollIn } from '@/components/motion';
import { api, Designer, naira } from '@/lib/api';
import { categoryImage } from '@/lib/images';
import { useAuth } from '@/lib/auth';

function Store({ handle }: { handle: string }) {
  const { user } = useAuth();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setDesigner(await api.getDesignerByHandle(handle)); }
      catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [handle]);

  // a logged-out shopper should return to the order after signing in
  const orderHref = (productId: string) => {
    const target = `/order/new?productId=${productId}`;
    return user ? target : `/register?next=${encodeURIComponent(target)}`;
  };

  if (loading) return <div className="center"><div className="skeleton" style={{ width: 220, height: 22 }} /></div>;
  if (error || !designer) return <div className="card" style={{ marginTop: 30 }}>This store isn’t available. <Link href="/" className="gradtext">Go home</Link>.</div>;

  const products = designer.products ?? [];

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Bespoke storefront</span>
        <h1>{designer.brand}</h1>
        <p className="sub">{designer.location} · {designer.specialties.join(' · ')} · lead time {designer.leadTime}</p>
        <div className="hint">Order custom pieces directly from {designer.brand}. Your measurements are captured once and confirmed before you pay.</div>
      </FadeIn>

      {products.length === 0 ? (
        <div className="card">This designer hasn’t listed any styles yet.</div>
      ) : (
        <div className="cards">
          {products.map((p, i) => (
            <ScrollIn key={p.id} delay={(i % 4) * 0.07}>
              <div className="card pcard" style={{ height: '100%' }}>
                <div className="ph">
                  <SmartImage src={p.images?.[0] || categoryImage(p.category, i)} alt={p.title} gradientIndex={i} />
                  <div className="meta">
                    <span className="chip">{p.category}</span>
                    <h3 style={{ margin: '8px 0 2px', fontSize: 18 }}>{p.title}</h3>
                    <div className="muted small">{p.fabric}</div>
                  </div>
                </div>
                <div className="body spread">
                  <span className="big" style={{ fontSize: 19 }}>{naira(p.priceKobo)}</span>
                  <Link href={orderHref(p.id)} className="btn sm">Order →</Link>
                </div>
              </div>
            </ScrollIn>
          ))}
        </div>
      )}

      <FadeIn>
        <div className="hint" style={{ marginTop: 20 }}>Powered by <Link href="/" className="gradtext">FitRoom</Link> — fit-perfect custom fashion.</div>
      </FadeIn>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  return <Store handle={handle} />;
}
