'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, Order } from '@/lib/api';

const statusPill = (s: string) =>
  ['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED'].includes(s) ? 'good'
    : s === 'QUOTED' ? 'info' : s === 'CANCELLED' ? 'bad' : 'warn';

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setOrders(await api.listOrders()); }
      catch (e) { setError((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Your orders</span>
        <h1>My orders</h1>
        <p className="sub">Track each order from quote to delivery.</p>
      </FadeIn>
      {error && <div className="error">{error}</div>}
      {loading ? <div className="card"><div className="skeleton" style={{ height: 40 }} /></div> :
        orders.length === 0 ? <div className="card">No orders yet. <Link href="/shop" className="gradtext">Browse the shop</Link>.</div> :
        <Reveal>
          {orders.map((o) => (
            <Item key={o.id}>
              <Link href={`/orders/${o.id}`}>
                <Hover className="card">
                  <div className="spread">
                    <div><b>{o.garment}</b> · {o.fabric}<div className="muted small">{new Date(o.createdAt).toLocaleDateString()}{o.recommendedSize ? ` · size ${o.recommendedSize}` : ''}</div></div>
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
  return <Protected role="CUSTOMER"><Orders /></Protected>;
}
