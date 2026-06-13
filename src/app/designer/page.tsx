'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Counter from '@/components/Counter';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Order, DesignerDashboard, naira } from '@/lib/api';

const statusPill = (s: string) =>
  ['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED'].includes(s) ? 'good'
    : s === 'QUOTED' ? 'info' : s === 'CANCELLED' ? 'bad' : 'warn';

function Dashboard() {
  const [kpi, setKpi] = useState<DesignerDashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payout, setPayout] = useState<{ netKobo: number; grossKobo: number; commissionBps: number } | null>(null);
  const [error, setError] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [k, o, p] = await Promise.all([api.designerDashboard(), api.listOrders(), api.designerPayouts()]);
        setKpi(k); setOrders(o); setPayout(p);
      } catch (e) {
        const msg = (e as Error).message;
        if (/designer profile/i.test(msg)) setNeedsProfile(true); else setError(msg);
      }
    })();
  }, []);

  if (needsProfile) return <div className="card">You don’t have a designer profile yet. <Link href="/designer/onboard" className="gradtext">Set one up</Link>.</div>;

  const cards: { label: string; value: number; prefix?: string }[] = kpi ? [
    { label: 'Open requests', value: kpi.openRequests },
    { label: 'Active orders', value: kpi.activeOrders },
    { label: 'Paid revenue', value: Math.round(kpi.paidRevenueKobo / 100), prefix: '₦' },
    { label: 'Products', value: kpi.productCount },
  ] : [];

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Studio</span>
        <h1>{kpi?.brand ?? 'Designer dashboard'}</h1>
        <p className="sub">Incoming custom orders, quotes, and production — no more WhatsApp threads.</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}

      <Reveal className="kpi">
        {cards.map((c) => (
          <Item key={c.label}>
            <Hover className="card glow-border" style={{ height: '100%' }}>
              <div className="muted small">{c.label}</div>
              <div className="big" style={{ fontSize: 28, marginTop: 4 }}><Counter value={c.value} prefix={c.prefix} /></div>
            </Hover>
          </Item>
        ))}
      </Reveal>

      {payout && payout.grossKobo > 0 && (
        <FadeIn>
          <div className="card glow-border">
            <div className="spread">
              <div><div className="muted small">Net payout (after {(payout.commissionBps / 100).toFixed(0)}% commission)</div>
                <div className="big gradtext" style={{ fontSize: 26 }}>{naira(payout.netKobo)}</div></div>
              <div className="muted small" style={{ textAlign: 'right' }}>Gross {naira(payout.grossKobo)}<br />Commission {naira(payout.grossKobo - payout.netKobo)}</div>
            </div>
          </div>
        </FadeIn>
      )}

      <h2>Orders</h2>
      {orders.length === 0 ? <div className="card">No orders yet.</div> :
        <Reveal>
          {orders.map((o) => (
            <Item key={o.id}>
              <Link href={`/designer/orders/${o.id}`}>
                <Hover className="card">
                  <div className="spread">
                    <div><b>{o.garment}</b> · {o.fabric}<div className="muted small">{o.id.slice(0, 12)}… · rec {o.recommendedSize ?? '—'} · fit {o.fitConfidence ?? '—'}%</div></div>
                    <span className={'pill ' + statusPill(o.status)}>{o.status.replace('_', ' ')}</span>
                  </div>
                </Hover>
              </Link>
            </Item>
          ))}
        </Reveal>}
    </div>
  );
}

export default function Page() {
  return <Protected role="DESIGNER"><Dashboard /></Protected>;
}
