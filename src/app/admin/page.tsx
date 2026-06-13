'use client';
import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import Counter from '@/components/Counter';
import { FadeIn, Reveal, Item, Hover } from '@/components/motion';
import { api, naira } from '@/lib/api';

type Overview = Awaited<ReturnType<typeof api.adminOverview>>;
type Designer = Awaited<ReturnType<typeof api.adminDesigners>>[number];
type Order = Awaited<ReturnType<typeof api.adminOrders>>[number];
type Issue = Awaited<ReturnType<typeof api.adminFitIssues>>[number];

const statusPill = (s: string) =>
  s === 'VERIFIED' ? 'good' : s === 'SUSPENDED' ? 'bad' : 'warn';
const orderPill = (s: string) =>
  ['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED'].includes(s) ? 'good'
    : s === 'QUOTED' ? 'info' : s === 'CANCELLED' ? 'bad' : 'warn';

function AdminDash() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const [o, d, ord, fi] = await Promise.all([
        api.adminOverview(), api.adminDesigners(), api.adminOrders(), api.adminFitIssues(),
      ]);
      setOv(o); setDesigners(d); setOrders(ord); setIssues(fi);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: 'VERIFIED' | 'SUSPENDED' | 'PENDING') => {
    setBusy(id);
    try { await api.adminSetDesignerStatus(id, status); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  };

  if (error) return <div className="error">{error}</div>;
  if (!ov) return <div className="muted">Loading…</div>;

  const kpis: { label: string; value: number; prefix?: string }[] = [
    { label: 'Customers', value: ov.acquisition.customers },
    { label: 'Designers', value: ov.acquisition.designers },
    { label: 'Orders paid', value: ov.commerce.ordersPaid },
    { label: 'GMV', value: Math.round(ov.commerce.gmvKobo / 100), prefix: '₦' },
    { label: 'Conversion %', value: ov.commerce.conversionPct },
    { label: 'B2B partners', value: ov.partners },
  ];

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Platform admin</span>
        <h1>Admin dashboard</h1>
        <p className="sub">Oversee designers, orders, and fit quality across the marketplace.</p>
      </FadeIn>

      <Reveal className="kpi">
        {kpis.map((k) => (
          <Item key={k.label}>
            <Hover className="card glow-border" style={{ height: '100%' }}>
              <div className="muted small">{k.label}</div>
              <div className="big" style={{ fontSize: 24, marginTop: 4 }}><Counter value={k.value} prefix={k.prefix} /></div>
            </Hover>
          </Item>
        ))}
      </Reveal>

      <div className="hint">
        Activation: {ov.activation.profileRatePct}% of customers have a fit profile · scan completion {ov.activation.scanCompletionPct}% ·
        fit quality: {ov.fitQuality.alterationRequests} alteration requests ({ov.fitQuality.alterationRatePct}% of paid).
      </div>

      <h2>Designers {ov.pendingDesigners > 0 && <span className="pill warn">{ov.pendingDesigners} pending</span>}</h2>
      <div className="card">
        <table><tbody>
          <tr><th>Brand</th><th>Owner</th><th>Orders</th><th>Status</th><th>Actions</th></tr>
          {designers.length === 0 ? <tr><td colSpan={5} className="muted">No designers yet.</td></tr> :
            designers.map((d) => (
              <tr key={d.id}>
                <td><b>{d.brand}</b><div className="muted small">{d.location}</div></td>
                <td className="muted small">{d.user.name}<br />{d.user.email}</td>
                <td>{d._count.orders}</td>
                <td><span className={'pill ' + statusPill(d.verificationStatus)}>{d.verificationStatus}</span></td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    {d.verificationStatus !== 'VERIFIED' && <button className="btn sm" disabled={busy === d.id} onClick={() => setStatus(d.id, 'VERIFIED')}>Verify</button>}
                    {d.verificationStatus !== 'SUSPENDED'
                      ? <button className="btn ghost sm" disabled={busy === d.id} onClick={() => setStatus(d.id, 'SUSPENDED')}>Suspend</button>
                      : <button className="btn sm" disabled={busy === d.id} onClick={() => setStatus(d.id, 'VERIFIED')}>Reinstate</button>}
                  </div>
                </td>
              </tr>
            ))}
        </tbody></table>
      </div>

      <div className="two">
        <div>
          <h2>Recent orders</h2>
          <div className="card">
            <table><tbody>
              <tr><th>Order</th><th>Designer</th><th>Status</th></tr>
              {orders.length === 0 ? <tr><td colSpan={3} className="muted">None yet.</td></tr> :
                orders.slice(0, 12).map((o) => (
                  <tr key={o.id}>
                    <td>{o.garment}<div className="muted small">{o.customer.name}</div></td>
                    <td className="small">{o.designer.brand}</td>
                    <td><span className={'pill ' + orderPill(o.status)}>{o.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
            </tbody></table>
          </div>
        </div>
        <div>
          <h2>Fit issues / alterations</h2>
          <div className="card">
            {issues.length === 0 ? <div className="muted small">No alteration requests — good fit quality.</div> :
              issues.map((i) => (
                <div key={i.id} style={{ borderBottom: '1px solid var(--line)', padding: '8px 0' }}>
                  <div className="small"><b>{i.garment}</b> · {i.customer} → {i.brand}</div>
                  {i.note && <div className="muted small">“{i.note}”</div>}
                  <div className="muted small">{new Date(i.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Protected role="ADMIN"><AdminDash /></Protected>;
}
