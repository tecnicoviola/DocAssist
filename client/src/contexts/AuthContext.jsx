import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

// Decode JWT payload (without library)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('docassist_token');
    if (storedToken) {
      const decoded = decodeToken(storedToken);
      if (decoded) {
        setToken(storedToken);
        // Try to get user from localStorage first
        const storedUser = localStorage.getItem('docassist_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser({ id: decoded.id || decoded.userId, email: decoded.email, name: decoded.name });
          }
        } else {
          setUser({ id: decoded.id || decoded.userId, email: decoded.email, name: decoded.name });
        }
      } else {
        // Token expired
        localStorage.removeItem('docassist_token');
        localStorage.removeItem('docassist_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    const { token: newToken, user: userData } = data;
    localStorage.setItem('docassist_token', newToken);
    localStorage.setItem('docassist_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return data;
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const data = await api.signup(email, password, name);
    const { token: newToken, user: userData } = data;
    localStorage.setItem('docassist_token', newToken);
    localStorage.setItem('docassist_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('docassist_token');
    localStorage.removeItem('docassist_user');
    localStorage.removeItem('docassist_active_workspace');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
