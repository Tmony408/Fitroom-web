'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await login(email, password);
      const raw = new URLSearchParams(window.location.search).get('next');
      const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
      router.replace(next ?? (u.role === 'ADMIN' ? '/admin' : u.role === 'DESIGNER' ? '/designer' : '/shop'));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to design, order, and track your bespoke fashion.">
      <form className="card glow-border" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <label style={{ marginTop: 14 }}>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        <button className="btn" style={{ marginTop: 18, width: '100%' }} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <div style={{ textAlign: 'right', marginTop: 10 }}><Link href="/forgot-password" className="muted small">Forgot password?</Link></div>
      </form>
      <p className="muted small">No account? <Link href="/register" className="gradtext" style={{ fontWeight: 700 }}>Sign up</Link></p>
    </AuthShell>
  );
}
