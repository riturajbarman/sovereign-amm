'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Dashboard Layout — (dashboard) route group
 *
 * Client-side authentication guard for all dashboard routes.
 * Checks whether the user is authenticated via authStore.checkAuth().
 * Redirects to /login if the session is missing or invalid.
 *
 * All pages inside (dashboard)/ — /dashboard, /grid, /battery, /pricing —
 * inherit this layout and are therefore protected.
 *
 * Requirements: 1.3, 1.5, 24.2, 24.3
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Validate the current session against the backend.
    // checkAuth() returns false (and clears auth state) when the token is
    // missing or expired, triggering the redirect below (Requirement 24.3).
    checkAuth().then((valid) => {
      if (!valid) {
        router.replace('/login');
      }
    });
  }, [checkAuth, router]);

  // While the auth check is in-flight, render nothing to avoid a flash
  // of protected content before the redirect fires.
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
