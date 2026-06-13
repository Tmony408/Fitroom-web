'use client';
import { use, useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import StageBar from '@/components/StageBar';
import { api, Order, naira } from '@/lib/api';

function Detail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setOrder(await api.getOrder(id)); }
    catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, [id]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(''); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  // Real payment flow: initialize → mock providers complete in-app, real
  // providers (Paystack) redirect to the hosted checkout.
  const pay = async () => {
    setError(''); setBusy(true);
    try {
      const init = await api.initializePayment(id);
      if (init.provider === 'mock') {
        await api.completeMockPayment(init.paymentId);
        await load();
      } else if (init.authorizationUrl) {
        window.location.href = init.authorizationUrl;
      } else {
        setError('Could not start payment.');
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (error && !order) return <div className="error">{error}</div>;
  if (!order) return <div className="muted">Loading…</div>;

  const sentQuote = order.quotes?.find((q) => q.status === 'SENT');
  const acceptedQuote = order.quotes?.find((q) => q.status === 'ACCEPTED');

  return (
    <div>
      <h1>{order.garment} · {order.fabric}</h1>
      <p className="sub">{order.id} · {order.style.neck} neck · {order.style.sleeve} sleeve · {order.style.length} length{order.addons.length ? ` · +${order.addons.join(', ')}` : ''}</p>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="spread">
          <div><span className="muted small">Status</span><div><b>{order.status.replace('_', ' ')}</b></div></div>
          {order.recommendedSize && <div><span className="muted small">Recommended size</span><div><b>{order.recommendedSize}</b> {order.fitConfidence ? `(${order.fitConfidence}%)` : ''}</div></div>}
        </div>
        <StageBar status={order.status} />
      </div>

      {/* Quote / payment */}
      {sentQuote && (
        <div className="card">
          <div className="spread"><div><span className="muted small">Quote</span><div className="big" style={{ fontSize: 22 }}>{naira(sentQuote.amountKobo)}</div>{sentQuote.leadTime && <div className="muted small">Lead time: {sentQuote.leadTime}</div>}</div>
            <button className="btn" disabled={busy} onClick={() => act(() => api.acceptQuote(order.id, sentQuote.id))}>Accept quote</button></div>
        </div>
      )}
      {acceptedQuote && order.status === 'QUOTED' && (
        <div className="card">
          <div className="spread"><div><span className="pill good">Quote accepted</span><div className="muted small" style={{ marginTop: 6 }}>Pay securely to start production.</div></div>
            <button className="btn alt" disabled={busy} onClick={pay}>Pay {naira(acceptedQuote.amountKobo)}</button></div>
        </div>
      )}

      {order.status === 'SHIPPED' && (
        <div className="card"><div className="spread"><span>Has your outfit arrived?</span>
          <button className="btn sm" disabled={busy} onClick={() => act(() => api.advance(order.id, 'Confirmed delivered'))}>Confirm delivery</button></div></div>
      )}
      {['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK', 'SHIPPED'].includes(order.status) && (
        <button className="btn ghost sm" disabled={busy} onClick={() => { const n = prompt('Alteration request:'); if (n) act(() => api.alteration(order.id, n)); }}>Request alteration</button>
      )}
      {['REQUESTED', 'QUOTED'].includes(order.status) && (
        <button className="btn ghost sm" style={{ marginLeft: 8 }} disabled={busy} onClick={() => act(() => api.cancelOrder(order.id))}>Cancel order</button>
      )}

      {/* Timeline */}
      <h2>Timeline</h2>
      <div className="card">
        <table><tbody>
          {(order.events ?? []).map((e) => (
            <tr key={e.id}><td className="muted">{new Date(e.createdAt).toLocaleString()}</td><td><b>{e.stage.replace('_', ' ')}</b>{e.note ? ` — ${e.note}` : ''}</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Protected role="CUSTOMER"><Detail id={id} /></Protected>;
}
