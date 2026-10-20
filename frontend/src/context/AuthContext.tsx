import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; password: string; full_name: string; department?: string; role?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('wifi_intel_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wifi_intel_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const u = await authApi.getCurrentUser();
          setUser(u);
          localStorage.setItem('wifi_intel_user', JSON.stringify(u));
        } catch (e) {
          console.error("Token verification failed, clearing auth state", e);
          logout();
        }
      }
      setIsLoading(false);
    };
    verifyUser();
  }, [token]);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await authApi.login(credentials);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('wifi_intel_token', res.token);
    localStorage.setItem('wifi_intel_user', JSON.stringify(res.user));
  };

  const register = async (data: { username: string; password: string; full_name: string; department?: string; role?: string }) => {
    const res = await authApi.register(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('wifi_intel_token', res.token);
    localStorage.setItem('wifi_intel_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wifi_intel_token');
    localStorage.removeItem('wifi_intel_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin' || user?.role === 'network_engineer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

