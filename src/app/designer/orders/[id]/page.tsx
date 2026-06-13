'use client';
import { use, useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import StageBar from '@/components/StageBar';
import { api, Order, naira, PRODUCTION_STAGES } from '@/lib/api';

function Detail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [sheet, setSheet] = useState<Record<string, string> | null>(null);
  const [amount, setAmount] = useState('');
  const [leadTime, setLeadTime] = useState('10-14 days');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const o = await api.getOrder(id);
      setOrder(o);
      if (!amount && o.basePriceKobo) setAmount(String(Math.round(o.basePriceKobo / 100)));
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, [id]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(''); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const viewSheet = async () => {
    try { const s = await api.measurementSheet(id); setSheet(s.measurements); }
    catch (e) { setError((e as Error).message); }
  };

  if (error && !order) return <div className="error">{error}</div>;
  if (!order) return <div className="muted">Loading…</div>;

  const nextStage = PRODUCTION_STAGES[PRODUCTION_STAGES.indexOf(order.status) + 1];

  return (
    <div>
      <h1>{order.garment} · {order.fabric}</h1>
      <p className="sub">{order.id} · {order.style.neck} neck · {order.style.sleeve} sleeve · {order.style.length} length{order.addons.length ? ` · +${order.addons.join(', ')}` : ''}</p>
      {error && <div className="error">{error}</div>}
      {order.notes && <div className="hint">📝 {order.notes}</div>}

      <div className="card">
        <div className="spread">
          <div><span className="muted small">Status</span><div><b>{order.status.replace('_', ' ')}</b></div></div>
          {order.recommendedSize && <div><span className="muted small">Recommended</span><div><b>{order.recommendedSize}</b> ({order.fitConfidence}%)</div></div>}
        </div>
        <StageBar status={order.status} />
      </div>

      {order.status === 'REQUESTED' && (
        <div className="card">
          <h3>Send a quote</h3>
          <div className="grid2">
            <div><label>Amount (₦)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label>Lead time</label><input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} /></div>
          </div>
          <button className="btn" style={{ marginTop: 14 }} disabled={busy || !amount}
            onClick={() => act(() => api.sendQuote(order.id, { amountKobo: Number(amount) * 100, leadTime }))}>Send quote</button>
        </div>
      )}
      {order.status === 'QUOTED' && <div className="card muted small">Quote sent — waiting for the customer to accept &amp; pay.</div>}

      {nextStage && ['PAID', 'CUTTING', 'SEWING', 'QUALITY_CHECK'].includes(order.status) && (
        <div className="card"><div className="spread"><span>Advance production</span>
          <button className="btn" disabled={busy} onClick={() => act(() => api.advance(order.id))}>Mark → {nextStage.replace('_', ' ')}</button></div></div>
      )}

      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn ghost sm" onClick={viewSheet}>View measurement sheet</button>
        <button className="btn ghost sm" onClick={() => { const n = prompt('Clarification message to customer:'); if (n) act(() => api.clarification(order.id, n)); }}>Ask for clarification</button>
      </div>

      {sheet && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="spread"><h3 style={{ margin: 0 }}>Measurement sheet</h3><button className="btn ghost sm" onClick={() => window.print()}>🖨 Print</button></div>
          <div className="meas-grid" style={{ marginTop: 10 }}>
            {Object.entries(sheet).map(([k, v]) => <div className="meas" key={k}><label>{k}</label><div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div></div>)}
          </div>
        </div>
      )}

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
  return <Protected role="DESIGNER"><Detail id={id} /></Protected>;
}
