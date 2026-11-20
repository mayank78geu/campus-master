import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res?.data) {
        const u = res.data;
        const mapped = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          studentId: u.studentId,
          course: u.course,
          section: u.section,
          classRollNo: u.classRollNo,
          phoneNumber: u.phoneNumber,
          isProfileCompleted: Boolean(u.role === 'FACULTY' || u.isProfileCompleted),
        };
        localStorage.setItem('cm_user', JSON.stringify(mapped));
        setUser(mapped);
        return mapped;
      }
    } catch (_e) {
      // ignore
    }
    return null;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('cm_user');
    const token = localStorage.getItem('cm_token');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Refresh in background to stay in sync with database profile
        syncUserProfile();
      } catch (_e) {
        localStorage.removeItem('cm_user');
        localStorage.removeItem('cm_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const authData = res.data;
    const userData = {
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
      studentId: authData.studentId,
      course: authData.course,
      section: authData.section,
      classRollNo: authData.classRollNo,
      phoneNumber: authData.phoneNumber,
      isProfileCompleted: Boolean(authData.role === 'FACULTY' || authData.isProfileCompleted),
    };
    localStorage.setItem('cm_token', authData.token);
    localStorage.setItem('cm_user', JSON.stringify(userData));
    setUser(userData);
    return authData;
  };

  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const authData = res.data;
    const userData = {
      id: authData.id,
      name: authData.name,
      email: authData.email,
      role: authData.role,
      studentId: authData.studentId,
      course: authData.course,
      section: authData.section,
      classRollNo: authData.classRollNo,
      phoneNumber: authData.phoneNumber,
      isProfileCompleted: Boolean(authData.role === 'FACULTY' || authData.isProfileCompleted),
    };
    localStorage.setItem('cm_token', authData.token);
    localStorage.setItem('cm_user', JSON.stringify(userData));
    setUser(userData);
    return authData;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('cm_user', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, syncUserProfile }}>
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
