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
    if (!user) {
      // One portal login for every org; come back here afterwards.
      const here = window.location.pathname + window.location.search;
      router.replace(`/PortalLoginPage?next=${encodeURIComponent(here)}`);
      return;
    }
    if (!profile) {
      // Signed in, but not a NOBE member (profile comes from memberships).
      router.replace('/Layer3');
      return;
    }
    if (requireAdmin && profile.role !== 'ADMIN') {
      router.replace('/users/member');
    }
  }, [loading, profile, user, requireAdmin, router]);

  if (loading) {
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
