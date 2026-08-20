import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  has_face_registered?: boolean;
  has_webauthn_registered?: boolean;
  last_login?: string;
  last_device?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshTokenStr: string, userData: User) => void;
  loginWithToken: (accessToken: string, refreshTokenStr: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token') || null;
  });

  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refresh_token'));
  const navigate = useNavigate();

  const refreshUserProfile = async () => {
    if (!token || token === 'demo-token') return;
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      const updated: User = {
        id: data.user_id,
        name: data.full_name,
        email: data.email,
        role: data.role || 'admin',
        has_face_registered: data.has_face_registered,
        has_webauthn_registered: data.has_webauthn_registered,
        last_login: data.last_login,
        last_device: data.last_device
      };
      setUser(updated);
      localStorage.setItem('user_data', JSON.stringify(updated));
    } catch (err) {
      console.warn('Profile refresh skipped, using current session.');
    }
  };

  useEffect(() => {
    if (token && token !== 'demo-token') {
      refreshUserProfile();
    }
  }, [token]);

  const login = (accessToken: string, refreshTokenStr: string, userData: User) => {
    localStorage.removeItem('logged_out');
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refresh_token', refreshTokenStr);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setToken(accessToken);
    setRefreshToken(refreshTokenStr);
    setUser(userData);
    // Route based on role — admin goes to admin portal, others to clinical dashboard
    if (userData.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const logout = () => {
    localStorage.setItem('logged_out', 'true');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, loginWithToken: login, logout, isAuthenticated: !!token, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
