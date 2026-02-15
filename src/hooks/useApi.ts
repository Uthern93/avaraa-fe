// =============================================================================
// AVARAA WAREHOUSE MANAGEMENT - API HOOK
// =============================================================================
// Custom hook for handling API requests using Axios
// =============================================================================

import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  status: number | null;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: <T>(data: T) => void;
  onError?: (error: ApiError) => void;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

// -----------------------------------------------------------------------------
// INTERCEPTORS
// -----------------------------------------------------------------------------

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers?.['skipAuth']) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function parseError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return {
      message: axiosError.response?.data?.message || 
               axiosError.response?.data?.error || 
               axiosError.message || 
               'An unexpected error occurred',
      code: axiosError.code,
      status: axiosError.response?.status,
      details: axiosError.response?.data as Record<string, unknown>,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  
  return {
    message: 'An unexpected error occurred',
  };
}

// -----------------------------------------------------------------------------
// MAIN HOOK
// -----------------------------------------------------------------------------

export function useApi<T = unknown>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);

  // GET request
  const get = useCallback(async (
    url: string, 
    config?: ApiRequestConfig
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AxiosResponse<T> = await apiClient.get(url, config);
      setData(response.data);
      setStatus(response.status);
      return response.data;
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
      setStatus(parsedError.status || null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // POST request
  const post = useCallback(async (
    url: string, 
    payload?: unknown, 
    config?: ApiRequestConfig
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AxiosResponse<T> = await apiClient.post(url, payload, config);
      setData(response.data);
      setStatus(response.status);
      return response.data;
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
      setStatus(parsedError.status || null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // PUT request
  const put = useCallback(async (
    url: string, 
    payload?: unknown, 
    config?: ApiRequestConfig
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AxiosResponse<T> = await apiClient.put(url, payload, config);
      setData(response.data);
      setStatus(response.status);
      return response.data;
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
      setStatus(parsedError.status || null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // PATCH request
  const patch = useCallback(async (
    url: string, 
    payload?: unknown, 
    config?: ApiRequestConfig
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AxiosResponse<T> = await apiClient.patch(url, payload, config);
      setData(response.data);
      setStatus(response.status);
      return response.data;
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
      setStatus(parsedError.status || null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // DELETE request
  const del = useCallback(async (
    url: string, 
    config?: ApiRequestConfig
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AxiosResponse<T> = await apiClient.delete(url, config);
      setData(response.data);
      setStatus(response.status);
      return response.data;
    } catch (err) {
      const parsedError = parseError(err);
      setError(parsedError);
      setStatus(parsedError.status || null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setStatus(null);
  }, []);

  return {
    data,
    error,
    loading,
    status,
    get,
    post,
    put,
    patch,
    del,
    reset,
  };
}

// -----------------------------------------------------------------------------
// STANDALONE API FUNCTIONS
// -----------------------------------------------------------------------------

export const api = {
  get: <T>(url: string, config?: ApiRequestConfig) => 
    apiClient.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: ApiRequestConfig) => 
    apiClient.delete<T>(url, config).then(res => res.data),
};

export default useApi;
