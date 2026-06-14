'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'DESIGNER'>('CUSTOMER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await register({ name, email, password, role });
      const raw = new URLSearchParams(window.location.search).get('next');
      const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
      router.replace(next ?? (u.role === 'DESIGNER' ? '/designer/onboard' : '/fit-profile'));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Customers design and order. Designers receive orders and run production.">
      <form className="card glow-border" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>I am a…</label>
        <div className="row" style={{ gap: 8 }}>
          {(['CUSTOMER', 'DESIGNER'] as const).map((r) => (
            <button type="button" key={r} className={role === r ? 'btn sm' : 'btn ghost sm'} onClick={() => setRole(r)}>
              {r === 'CUSTOMER' ? '🛍 Customer' : '✂️ Designer'}
            </button>
          ))}
        </div>
        <label style={{ marginTop: 14 }}>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunde Bakare" />
        <label style={{ marginTop: 14 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <label style={{ marginTop: 14 }}>Password (min 8 chars)</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        <button className="btn" style={{ marginTop: 18, width: '100%' }} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted small">Already have an account? <Link href="/login" className="gradtext" style={{ fontWeight: 700 }}>Log in</Link></p>
    </AuthShell>
  );
}
