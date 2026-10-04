import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { AUTH_EXPIRED_EVENT } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEstimator: boolean;
  isLoading: boolean;
  sessionMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('gov_valuation_token');
    const storedUser = localStorage.getItem('gov_valuation_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('gov_valuation_token');
        localStorage.removeItem('gov_valuation_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const onExpired = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setToken(null);
      setUser(null);
      setSessionMessage(detail?.message || 'Your session expired. Please sign in again.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.post<{ token: string; user: User }>('/v1/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    setSessionMessage(null);

    localStorage.setItem('gov_valuation_token', receivedToken);
    localStorage.setItem('gov_valuation_user', JSON.stringify(receivedUser));
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gov_valuation_token');
    localStorage.removeItem('gov_valuation_user');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isEstimator = user?.role === 'ESTIMATOR' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isEstimator,
        isLoading,
        sessionMessage,
        login,
        logout,
        clearSessionMessage: () => setSessionMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
