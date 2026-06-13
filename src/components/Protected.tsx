'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Role } from '@/lib/api';

export default function Protected({ role, children }: { role?: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (role && user.role !== role) router.replace('/');
  }, [user, loading, role, router]);

  if (loading || !user || (role && user.role !== role)) {
    return <div className="center muted">Loading…</div>;
  }
  return <>{children}</>;
}
