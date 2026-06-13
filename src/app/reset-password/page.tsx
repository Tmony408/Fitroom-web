'use client';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthShell from '@/components/AuthShell';

function Reset() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!token) { setError('Missing or invalid reset link.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try { await api.resetPassword(token, password); setDone(true); setTimeout(() => router.replace('/login'), 1600); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you don’t use elsewhere.">
      {done ? (
        <div className="card glow-border"><span className="pill good">Done</span><p className="small" style={{ marginTop: 10 }}>Password updated — redirecting to login…</p></div>
      ) : (
        <form className="card glow-border" onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <label>New password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <label style={{ marginTop: 14 }}>Confirm password</label>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" />
          <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
          <p className="muted small" style={{ marginTop: 10 }}><Link href="/login" className="gradtext" style={{ fontWeight: 700 }}>Back to login</Link></p>
        </form>
      )}
    </AuthShell>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="muted">Loading…</div>}><Reset /></Suspense>;
}
