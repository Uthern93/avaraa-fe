// =============================================================================
// AVARAA WAREHOUSE MANAGEMENT - AUTH HOOK
// =============================================================================
// Custom hook for handling authentication using Axios
// =============================================================================

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { apiClient } from './useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  role_id: number | null;
  name: string;
  username: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  role?: Role;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface AuthResponseData {
  user: User;
  token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: AuthCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  hasRole: (roleSlug: string | string[]) => boolean;
}

// -----------------------------------------------------------------------------
// STORAGE KEYS
// -----------------------------------------------------------------------------

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
} as const;

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function getStoredAuth(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

function setStoredAuth(user: User, token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// -----------------------------------------------------------------------------
// MAIN HOOK
// -----------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(() => {
    const { user, token } = getStoredAuth();
    return {
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: false,
      error: null,
    };
  });

  // Check token validity on mount
  useEffect(() => {
    const { token } = getStoredAuth();
    if (token) {
      refreshUser();
    }
  }, []);

  const login = useCallback(async (credentials: AuthCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', credentials);
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setStoredAuth(user, token);
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: message,
        isAuthenticated: false,
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', data);
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        setStoredAuth(user, token);
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: message,
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.post('/auth/logout').catch(() => {});
    clearStoredAuth();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
      
      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        setState(prev => ({
          ...prev,
          user,
          isLoading: false,
        }));
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch {
      clearStoredAuth();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const hasRole = useCallback((roleSlug: string | string[]): boolean => {
    if (!state.user?.role) return false;
    const slugs = Array.isArray(roleSlug) ? roleSlug : [roleSlug];
    return slugs.includes(state.user.role.slug);
  }, [state.user]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    hasRole,
  };
}

// -----------------------------------------------------------------------------
// AUTH CONTEXT
// -----------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = AuthContext.Provider;

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
