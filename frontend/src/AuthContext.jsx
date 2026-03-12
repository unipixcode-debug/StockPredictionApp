import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await api.get('/auth/current_user');
      setUser(userData || null);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    console.log('AuthContext: Attempting Login...');
    // For development/debugging, we can add a mock login toggle if the backend is not ready
    const useMock = true; // Set to true to bypass real Google OAuth

    const getBaseUrl = () => {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      return url.replace('/api', '');
    };

    if (useMock) {
      console.log('AuthContext: Using Mock Login');
      setUser({
        id: 'mock-user-123',
        name: 'Geliştirici Hesabı',
        email: 'dev@predictpro.com',
        picture: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
      });
      return;
    }
    
    window.location.href = `${getBaseUrl()}/api/auth/google`;
  };

  const logout = async () => {
    setUser(null);
    const getBaseUrl = () => {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      return url.replace('/api', '');
    };
    if (window.location.href.includes('google')) {
        window.location.href = `${getBaseUrl()}/api/auth/logout`;
    }
  };

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
