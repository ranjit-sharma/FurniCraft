import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      if (res.data.user) {
        api.post('/reports/track-visit').catch(() => {});
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', {
      email: identifier,
      identifier,
      password,
    });
    const loggedUser = res?.data?.user || res?.user;
    if (loggedUser) {
      const savedLang = localStorage.getItem('furnicraft_lang') || localStorage.getItem('fc_language');
      if (savedLang && ['en', 'hi', 'hinglish'].includes(savedLang)) {
        if (loggedUser.preferredLanguage !== savedLang) {
          loggedUser.preferredLanguage = savedLang;
          api.patch('/users/profile/language', { preferredLanguage: savedLang }).catch(() => {});
        }
      }
    }
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const isOwner = user?.role === 'OWNER';
  const isThekedar = user?.role === 'THEKEDAR';
  const isWorker = user?.role === 'WORKER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        refreshUser: fetchCurrentUser,
        isOwner,
        isThekedar,
        isWorker,
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
