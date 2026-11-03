import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { SESSION_EXPIRED_EVENT } from '../api/client';

const AuthContext = createContext(null);

/** sessionStorage key holding the "why you were signed out" message shown once on the login page. */
export const SESSION_NOTICE_KEY = 'furnicraft_session_notice';

const getCachedUser = () => {
  try {
    const raw = localStorage.getItem('furnicraft_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(() => !getCachedUser());

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res?.data?.user || res?.user || res?.data;
      if (userData && userData.role !== 'WORKER') {
        setUser(userData);
        try {
          localStorage.setItem('furnicraft_user', JSON.stringify(userData));
        } catch {}
        api.post('/reports/track-visit').catch(() => {});
      } else {
        // Workers are managed entities and cannot maintain an application session
        if (userData?.role === 'WORKER') {
          api.post('/auth/logout').catch(() => {});
        }
        setUser(null);
        try {
          localStorage.removeItem('furnicraft_token');
          localStorage.removeItem('furnicraft_user');
        } catch {}
      }
    } catch (err) {
      if (err?.status === 401 || err?.kind === 'session') {
        setUser(null);
        try {
          localStorage.removeItem('furnicraft_token');
          localStorage.removeItem('furnicraft_user');
        } catch {}
      }
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
        localStorage.removeItem('furnicraft_token');
        localStorage.removeItem('furnicraft_user');
      } catch {
        // storage blocked: the redirect alone still happens
      }
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('furnicraft_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', {
      email: identifier,
      identifier,
      password,
    });
    const loggedUser = res?.data?.user || res?.user;
    const token = res?.data?.token || res?.token;
    if (loggedUser?.role === 'WORKER') {
      await api.post('/auth/logout').catch(() => {});
      throw new Error('Worker login is disabled. Worker profiles are managed directly by Thekedars.');
    }
    if (token) {
      try {
        localStorage.setItem('furnicraft_token', token);
      } catch {}
    }
    if (loggedUser) {
      try {
        localStorage.setItem('furnicraft_user', JSON.stringify(loggedUser));
      } catch {}
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
      try {
        localStorage.removeItem('furnicraft_token');
        localStorage.removeItem('furnicraft_user');
      } catch {}
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
