'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './authprovider';

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export default function RequireAuth({ children, requireAdmin = false }: Props) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && !profile) return; // Still resolving profile from People table
    if (!user && !profile) {
      router.replace('/users/login');
      return;
    }
    if (requireAdmin && profile?.role !== 'ADMIN') {
      router.replace('/users/member');
    }
  }, [loading, profile, user, requireAdmin, router]);

  if (loading || (user && !profile)) {
    return (
      <div className="app-shell">
        <div className="page-frame">
          <div className="panel">
            <p className="section-copy">Loading your access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;
  if (requireAdmin && profile.role !== 'ADMIN') return null;

  return <>{children}</>;
}
