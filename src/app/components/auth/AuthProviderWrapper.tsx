import React from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

interface AuthProviderWrapperProps {
  children: React.ReactNode;
}

export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const authValue = useAuth();

  return (
    <AuthProvider value={authValue}>
      {children}
    </AuthProvider>
  );
}

export default AuthProviderWrapper;
