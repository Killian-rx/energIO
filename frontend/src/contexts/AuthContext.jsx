import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('energio_user')); }
    catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('energio_token', data.token);
    localStorage.setItem('energio_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('energio_token');
    localStorage.removeItem('energio_user');
    setUser(null);
  }, []);

  const isAdmin      = user?.role === 'admin';
  const isGestionnaire = user?.role === 'admin' || user?.role === 'gestionnaire';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isGestionnaire }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
