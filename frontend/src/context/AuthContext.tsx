import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../utils/api';

export interface User {
  user_id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  auth_provider: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, company: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Verify authentication session on load
  const checkSession = async () => {
    try {
      setLoading(true);
      const userData = await apiFetch('/api/v1/auth/me');
      setUser(userData);
    } catch (err: any) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Listen for global auth failure events (e.g., refresh token expired)
    const handleAuthFailed = () => {
      setUser(null);
      setError('Session expired. Please log in again.');
    };

    window.addEventListener('auth-failed', handleAuthFailed);
    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        bodyData: { email, password },
      });
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, company: string, email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        bodyData: { name, company, email, password },
      });
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (credential: string) => {
    try {
      setError(null);
      setLoading(true);
      const res = await apiFetch('/api/v1/auth/google', {
        method: 'POST',
        bodyData: { credential },
      });
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error on backend:', err);
    } finally {
      setUser(null);
      setLoading(false);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        googleLogin,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
