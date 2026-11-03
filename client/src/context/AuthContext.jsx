import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { SESSION_EXPIRED_EVENT } from '../api/client';

const AuthContext = createContext(null);

/** sessionStorage key holding the "why you were signed out" message shown once on the login page. */
export const SESSION_NOTICE_KEY = 'furnicraft_session_notice';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res?.data?.user || res?.user || res?.data;
      if (userData && userData.role !== 'WORKER') {
        setUser(userData);
        api.post('/reports/track-visit').catch(() => {});
      } else {
        // Workers are managed entities and cannot maintain an application session
        if (userData?.role === 'WORKER') {
          api.post('/auth/logout').catch(() => {});
        }
        setUser(null);
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

  // Any API call that gets a 401 mid-session: drop the user (ProtectedRoute sends them to /login) and tell them why.
  useEffect(() => {
    const onSessionExpired = (e) => {
      try {
        sessionStorage.setItem(SESSION_NOTICE_KEY, e.detail);
      } catch {
        // storage blocked: the redirect alone still happens
      }
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
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
    if (loggedUser?.role === 'WORKER') {
      await api.post('/auth/logout').catch(() => {});
      throw new Error('Worker login is disabled. Worker profiles are managed directly by Thekedars.');
    }
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
