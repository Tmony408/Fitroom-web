'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Protected from '@/components/Protected';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function Onboard() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [brand, setBrand] = useState('');
  const [location, setLocation] = useState('');
  const [leadTime, setLeadTime] = useState('10-14 days');
  const [specialties, setSpecialties] = useState('Senator, Kaftan');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      await api.createDesigner({ brand, location, leadTime, specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean) });
      await refresh();
      router.replace('/designer');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Set up your designer profile</h1>
      <p className="sub">This is what diaspora customers see when they order from you.</p>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <label>Brand name</label>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Lagos Royale Couture" />
        <label style={{ marginTop: 12 }}>Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos, NG" />
        <div className="grid2" style={{ marginTop: 12 }}>
          <div><label>Lead time</label><input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} /></div>
          <div><label>Specialties (comma-separated)</label><input value={specialties} onChange={(e) => setSpecialties(e.target.value)} /></div>
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Create profile'}</button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Protected role="DESIGNER"><Onboard /></Protected>;
}
