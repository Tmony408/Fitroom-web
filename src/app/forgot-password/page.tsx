'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthShell from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.forgotPassword(email); setSent(true); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we’ll send a reset link.">
      {sent ? (
        <div className="card glow-border">
          <div className="row"><span className="pill good">Sent</span></div>
          <p className="small" style={{ marginTop: 10 }}>If an account exists for <b>{email}</b>, a reset link is on its way. The link expires in 1 hour.</p>
          <Link href="/login" className="btn ghost sm" style={{ marginTop: 12 }}>Back to login</Link>
        </div>
      ) : (
        <form className="card glow-border" onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="muted small" style={{ marginTop: 10 }}>Remembered it? <Link href="/login" className="gradtext" style={{ fontWeight: 700 }}>Log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
