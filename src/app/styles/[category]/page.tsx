'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { FadeIn, ScrollIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Product, naira } from '@/lib/api';
import { labelFromSlug, categorySeed, slugify, GARMENTS } from '@/lib/images';
import { useAuth } from '@/lib/auth';

function Collection({ slug }: { slug: string }) {
  const { user } = useAuth();
  const label = labelFromSlug(slug) ?? slug.replace(/-/g, ' ');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const list = await api.listProducts({ category: label });
        if (live) setProducts(list);
      } catch { /* fall back to curated seed only */ }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [label]);

  // logged-out shoppers return to the order/store after signing in
  const orderHref = (p: Product) => {
    const target = p.designer?.handle ? `/d/${p.designer.handle}` : `/order/new?productId=${p.id}`;
    return user ? target : `/register?next=${encodeURIComponent(target)}`;
  };

  const seed = categorySeed(label, 8);
  const other = GARMENTS.filter((g) => slugify(g.label) !== slug).slice(0, 6);

  return (
    <div>
      <FadeIn>
        <Link href="/" className="muted small">← All styles</Link>
        <span className="eyebrow" style={{ display: 'block', marginTop: 10 }}>✦ Collection</span>
        <h1 style={{ marginBottom: 4 }}>{label}</h1>
        <p className="sub">
          {loading ? 'Loading designs…'
            : products.length
              ? `${products.length} design${products.length > 1 ? 's' : ''} from our designers — plus inspiration to spark your next custom ${label.toLowerCase()}.`
              : `Inspiration for your custom ${label.toLowerCase()}. New designer pieces appear here as they’re uploaded.`}
        </p>
      </FadeIn>

      {/* Designer uploads — real, orderable pieces, auto-categorized here */}
      {products.length > 0 && (
        <>
          <ScrollIn><h2>From our designers</h2></ScrollIn>
          <div className="cards" style={{ marginTop: 8 }}>
            {products.map((p, i) => (
              <Item key={p.id}>
                <Link href={orderHref(p)}>
                  <Hover className="card pcard" style={{ height: '100%' }}>
                    <div className="ph">
                      <SmartImage src={p.images?.[0] || seed[i % seed.length]} alt={p.title} gradientIndex={i} />
                    </div>
                    <div className="meta" style={{ display: 'block' }}>
                      <b>{p.title}</b>
                      <div className="muted small" style={{ marginTop: 2 }}>
                        {p.designer?.brand ? `${p.designer.brand} · ` : ''}{p.fabric}
                      </div>
                      <div className="gradtext" style={{ fontWeight: 700, marginTop: 4 }}>{naira(p.priceKobo)}</div>
                    </div>
                  </Hover>
                </Link>
              </Item>
            ))}
          </div>
        </>
      )}

      {/* Curated inspiration so the collection is always rich */}
      <ScrollIn><h2>{products.length > 0 ? 'Style inspiration' : `${label} inspiration`}</h2></ScrollIn>
      <div className="cards" style={{ marginTop: 8 }}>
        {seed.map((src, i) => (
          <ScrollIn key={src + i} delay={(i % 4) * 0.06}>
            <div className="card pcard" style={{ height: '100%' }}>
              <div className="ph"><SmartImage src={src} alt={`${label} inspiration`} gradientIndex={i} /></div>
              <div className="meta"><span className="chip">{label}</span></div>
            </div>
          </ScrollIn>
        ))}
      </div>

      {/* CTA */}
      <ScrollIn>
        <div className="card glow-border" style={{ textAlign: 'center', padding: 36, marginTop: 26 }}>
          <h2 style={{ marginTop: 0 }}>Want a {label.toLowerCase()} cut to your measurements?</h2>
          <p className="sub" style={{ margin: '0 auto 18px' }}>Save your fit once, then order this style from designers back home.</p>
          <Link href={user ? '/shop' : `/register?next=${encodeURIComponent('/shop')}`} className="btn">
            {user ? 'Browse designers →' : 'Start your fit profile →'}
          </Link>
        </div>
      </ScrollIn>

      {/* Explore other styles */}
      <ScrollIn><h2>Explore other styles</h2></ScrollIn>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {other.map((g) => (
          <Link key={g.label} href={`/styles/${slugify(g.label)}`} className="chip">{g.label}</Link>
        ))}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  return <Collection slug={category} />;
}
