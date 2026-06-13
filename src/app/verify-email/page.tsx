'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FadeIn } from '@/components/motion';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) { setState('error'); setMsg('Missing verification token.'); return; }
      try { await api.verifyEmail(token); setState('ok'); }
      catch (e) { setState('error'); setMsg((e as Error).message); }
    })();
  }, [token]);

  return (
    <FadeIn>
      <div className="card glow-border" style={{ maxWidth: 460, textAlign: 'center', padding: 40 }}>
        {state === 'working' && <><div className="skeleton" style={{ height: 22, width: 180, margin: '0 auto' }} /><p className="muted small" style={{ marginTop: 14 }}>Verifying your email…</p></>}
        {state === 'ok' && <><div style={{ fontSize: 40 }}>✅</div><h1 style={{ marginTop: 8 }}>Email verified</h1><p className="sub" style={{ margin: '0 auto 16px' }}>Your account is all set.</p><Link href="/" className="btn">Continue</Link></>}
        {state === 'error' && <><div style={{ fontSize: 40 }}>⚠️</div><h1 style={{ marginTop: 8 }}>Couldn’t verify</h1><p className="sub" style={{ margin: '0 auto 16px' }}>{msg || 'This link may be invalid or expired.'}</p><Link href="/login" className="btn ghost">Back to login</Link></>}
      </div>
    </FadeIn>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="muted">Loading…</div>}><Verify /></Suspense>;
}
