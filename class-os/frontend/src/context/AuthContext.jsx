import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getCurrentUser } from '../api/auth.js';

const AuthContext = createContext(null);

// Use sessionStorage so each browser tab has its own independent session.
// This lets teacher and student be logged in simultaneously in different windows.
function getInitialUser() {
  try {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      sessionStorage.removeItem('token');
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));

  const login = useCallback((tokenStr, userData) => {
    sessionStorage.setItem('token', tokenStr);
    setToken(tokenStr);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('teacherActiveClassId');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  // JWT only carries id + role; load profile so name/email are available after refresh.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getCurrentUser()
      .then((profile) => {
        if (!cancelled) setUser((prev) => (prev ? { ...prev, ...profile } : profile));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
