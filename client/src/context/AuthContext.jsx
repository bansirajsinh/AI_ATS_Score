import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token && !!user;

  async function signup(email, password) {
    setLoading(true);
    try {
      const res = await authAPI.signup({ email, password });
      const { user: userData, token: newToken } = res.data.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Signup failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { user: userData, token: newToken } = res.data.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}