import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await API.get('/api/auth/me');
        if (res.data.success) {
          setUser(res.data.data);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to load user info', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await API.post('/api/auth/login', { email, password });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Login failed';
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password, avatarUrl) => {
    setLoading(true);
    try {
      const res = await API.post('/api/auth/register', { name, email, password, avatarUrl });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed';
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
