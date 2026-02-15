import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthContext } from '@/hooks/useAuth';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * Guest route component - only allows access to unauthenticated users.
 * Redirects authenticated users to dashboard or their intended destination.
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to the intended page or dashboard
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

export default GuestRoute;
