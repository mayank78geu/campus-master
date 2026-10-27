import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('cm_user');
    const token = localStorage.getItem('cm_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('cm_user');
        localStorage.removeItem('cm_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const authData = res.data;
    localStorage.setItem('cm_token', authData.token);
    localStorage.setItem('cm_user', JSON.stringify({
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
    }));
    setUser({
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
    });
    return authData;
  };

  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const authData = res.data;
    localStorage.setItem('cm_token', authData.token);
    localStorage.setItem('cm_user', JSON.stringify({
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
    }));
    setUser({
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
    });
    return authData;
  };

  const logout = () => {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
