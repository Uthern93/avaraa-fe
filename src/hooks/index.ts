// =============================================================================
// AVARAA WAREHOUSE MANAGEMENT - HOOKS INDEX
// =============================================================================

export { useApi, api, apiClient } from './useApi';
export type { ApiResponse, ApiError, UseApiOptions, ApiRequestConfig } from './useApi';

export { 
  useAuth, 
  useAuthContext, 
  AuthProvider 
} from './useAuth';
export type { 
  User, 
  Role, 
  AuthCredentials, 
  RegisterData, 
  AuthResponseData, 
  AuthState, 
  AuthContextValue 
} from './useAuth';
