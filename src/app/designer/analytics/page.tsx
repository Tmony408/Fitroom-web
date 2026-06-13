'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api } from '@/lib/api';

type Analytics = Awaited<ReturnType<typeof api.designerAnalytics>>;

function Bars({ data }: { data: { key: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) return <div className="muted small">No data yet.</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {data.map((d) => (
        <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 30px', alignItems: 'center', gap: 10 }}>
          <span className="small">{d.key}</span>
          <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{ width: `${(d.count / max) * 100}%`, height: '100%', background: 'var(--grad)' }} />
          </div>
          <span className="small muted" style={{ textAlign: 'right' }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function Analytics() {
  const [a, setA] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try { setA(await api.designerAnalytics()); } catch (e) { setError((e as Error).message); }
    })();
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!a) return <div className="muted">Loading…</div>;

  const cards = [
    { label: 'Orders requested', value: String(a.ordersRequested) },
    { label: 'Orders paid', value: String(a.ordersPaid) },
    { label: 'Conversion', value: `${a.conversionPct}%` },
    { label: 'Alteration rate', value: `${a.alterationRatePct}%` },
  ];

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Insights</span>
        <h1>Analytics</h1>
        <p className="sub">{a.brand} · how your orders convert and where fit issues show up.</p>
        <Link href="/designer" className="btn ghost sm">← Dashboard</Link>
      </FadeIn>

      <Reveal className="kpi" style={{ marginTop: 18 }}>
        {cards.map((c) => (
          <Item key={c.label}>
            <Hover className="card glow-border" style={{ height: '100%' }}>
              <div className="muted small">{c.label}</div>
              <div className="big" style={{ fontSize: 26, marginTop: 4 }}>{c.value}</div>
            </Hover>
          </Item>
        ))}
      </Reveal>

      <div className="two" style={{ marginTop: 8 }}>
        <FadeIn className="card"><h3>Most-ordered sizes</h3><Bars data={a.commonSizes} /></FadeIn>
        <FadeIn className="card"><h3>Most-ordered garments</h3><Bars data={a.commonGarments} /></FadeIn>
      </div>

      <div className="hint">Alteration requests are your clearest fit-quality signal — {a.alterationRequests} so far ({a.alterationRatePct}% of paid orders). A rising rate on a size is a cue to revisit that garment’s measurements.</div>
    </div>
  );
}

export default function Page() {
  return <Protected role="DESIGNER"><Analytics /></Protected>;
}
