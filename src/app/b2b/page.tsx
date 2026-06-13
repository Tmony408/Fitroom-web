'use client';
import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import { FadeIn } from '@/components/motion';
import { api, B2BPartner } from '@/lib/api';

type Key = Awaited<ReturnType<typeof api.listApiKeys>>[number];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

function Portal() {
  const [partner, setPartner] = useState<B2BPartner | null>(null);
  const [keys, setKeys] = useState<Key[]>([]);
  const [usage, setUsage] = useState<{ totalEvents: number; last30Days: number } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // create-partner form
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const load = async () => {
    try {
      const p = await api.getPartner();
      setPartner(p);
      const [k, u] = await Promise.all([api.listApiKeys(), api.b2bUsage()]);
      setKeys(k); setUsage(u);
    } catch { setPartner(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setError('');
    try { await api.createPartner({ company, domain, webhookUrl: webhookUrl || undefined }); await load(); }
    catch (e) { setError((e as Error).message); }
  };
  const mintKey = async (type: 'PUBLISHABLE' | 'SECRET') => {
    setError('');
    try { const r = await api.createApiKey(type); setNewKey(r.key); await load(); }
    catch (e) { setError((e as Error).message); }
  };
  const revoke = async (id: string) => {
    if (!confirm('Revoke this key? Apps using it will stop working.')) return;
    try { await api.revokeApiKey(id); await load(); } catch (e) { setError((e as Error).message); }
  };

  if (loading) return <div className="muted">Loading…</div>;

  if (!partner) {
    return (
      <div style={{ maxWidth: 520 }}>
        <FadeIn>
          <span className="eyebrow">✦ For brands</span>
          <h1>Embed FitRoom on your store</h1>
          <p className="sub">Create a partner account to get API keys and the “Get my size” widget for your own website.</p>
        </FadeIn>
        {error && <div className="error">{error}</div>}
        <div className="card glow-border">
          <label>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Aso Diaspora Store" />
          <label style={{ marginTop: 12 }}>Website domain (allowlist)</label>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="shop.asodiaspora.co.uk" />
          <label style={{ marginTop: 12 }}>Webhook URL (optional)</label>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://shop.example.com/fitroom/webhook" />
          <button className="btn" style={{ marginTop: 16 }} onClick={create} disabled={!company || !domain}>Create partner account</button>
        </div>
      </div>
    );
  }

  const pk = keys.find((k) => k.type === 'PUBLISHABLE' && !k.revokedAt);
  const snippet = `<script src="${API_BASE}/widget.js" data-key="${pk?.prefix ?? 'pk_test_…'}…"></script>
<button class="fitroom-btn"
  data-category="Senator" data-stretch="LOW"
  data-chart='{"sizes":["S","M","L","XL"],"chest":[96,100,104,108],"waist":[84,88,92,96]}'>
  Get my size
</button>`;

  return (
    <div>
      <FadeIn>
        <span className="eyebrow">✦ Partner portal</span>
        <h1>{partner.company}</h1>
        <p className="sub">Domain <b>{partner.domain}</b> · plan {partner.plan} · <span className="pill good">{partner.status}</span></p>
      </FadeIn>
      {error && <div className="error">{error}</div>}

      <div className="kpi">
        <div className="card"><div className="muted small">Fit checks (all time)</div><div className="big" style={{ fontSize: 26 }}>{usage?.totalEvents ?? 0}</div></div>
        <div className="card"><div className="muted small">Last 30 days</div><div className="big" style={{ fontSize: 26 }}>{usage?.last30Days ?? 0}</div></div>
      </div>

      {newKey && (
        <div className="card glow-border" style={{ borderColor: 'var(--gold)' }}>
          <div className="spread"><b>Your new key — copy it now</b><button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(newKey); }}>Copy</button></div>
          <code style={{ display: 'block', marginTop: 8, wordBreak: 'break-all', fontSize: 13 }}>{newKey}</code>
          <div className="hint">This is the only time the full key is shown. Store it securely.</div>
        </div>
      )}

      <h2>API keys</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={() => mintKey('PUBLISHABLE')}>+ Publishable key (widget)</button>
        <button className="btn ghost sm" onClick={() => mintKey('SECRET')}>+ Secret key (server)</button>
      </div>
      <div className="card">
        {keys.length === 0 ? <div className="muted small">No keys yet.</div> :
          <table><tbody>
            <tr><th>Key</th><th>Type</th><th>Last used</th><th></th></tr>
            {keys.map((k) => (
              <tr key={k.id}>
                <td><code>{k.prefix}…</code></td>
                <td>{k.type === 'PUBLISHABLE' ? 'Publishable' : 'Secret'}</td>
                <td className="muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</td>
                <td>{k.revokedAt ? <span className="pill bad">revoked</span> : <button className="btn ghost sm" onClick={() => revoke(k.id)}>Revoke</button>}</td>
              </tr>
            ))}
          </tbody></table>}
      </div>

      <h2>Embed the widget</h2>
      <div className="card">
        <p className="muted small">Paste this on your product page (replace the key with a full publishable key, and the chart with your garment’s sizes):</p>
        <pre style={{ background: '#0c0e12', border: '1px solid var(--line)', borderRadius: 10, padding: 14, overflow: 'auto', fontSize: 12, color: '#9fd2c0' }}><code>{snippet}</code></pre>
        <div className="hint">Publishable keys only work from your allowlisted domain (<b>{partner.domain}</b>) — safe to ship in the browser.</div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Protected><Portal /></Protected>;
}
