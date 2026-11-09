import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, AVAILABLE_LANGUAGES } from '../locales/translations';
import { useAuth } from './AuthContext';
import api from '../api/client';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'furnicraft_lang';

export const LanguageProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth?.user;

  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fc_language');
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'hinglish')) {
        return saved;
      }
    } catch {
      // ignore localStorage read failure
    }
    return 'en';
  });

  // Sync language across open tabs/windows
  useEffect(() => {
    const handleStorage = (e) => {
      if ((e.key === STORAGE_KEY || e.key === 'fc_language') && e.newValue) {
        if (['en', 'hi', 'hinglish'].includes(e.newValue)) {
          setLanguageState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Whenever the authenticated user ID / profile loads, sync their preferred language if no explicit local setting exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fc_language');
      if (!saved && user?.preferredLanguage && ['en', 'hi', 'hinglish'].includes(user.preferredLanguage)) {
        setLanguageState(user.preferredLanguage);
        localStorage.setItem(STORAGE_KEY, user.preferredLanguage);
        localStorage.setItem('fc_language', user.preferredLanguage);
        document.documentElement.lang = user.preferredLanguage === 'hi' ? 'hi' : 'en';
      }
    } catch {
      // ignore localStorage read/write failure
    }
  }, [user?._id, user?.preferredLanguage]);

  const changeLanguage = useCallback(async (newLang, syncWithBackend = true) => {
    if (!['en', 'hi', 'hinglish'].includes(newLang)) return;
    
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      localStorage.setItem('fc_language', newLang);
      document.documentElement.lang = newLang === 'hi' ? 'hi' : 'en';
    } catch {
      // ignore localStorage write failure
    }

    if (auth?.updateUser) {
      auth.updateUser({ preferredLanguage: newLang });
    } else if (user) {
      user.preferredLanguage = newLang;
    }

    if (syncWithBackend) {
      try {
        await api.patch('/users/profile/language', { preferredLanguage: newLang });
      } catch {
        // Silently catch if unauthenticated or endpoint unavailable
      }
    }
  }, [user, auth]);

  // Update HTML lang attribute on mount/change
  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
  }, [language]);

  /**
   * Helper function to retrieve translated string using dot-notation.
   * Supports:
   *  t('key.path')
   *  t('key.path', 'Fallback text')
   *  t('key.path', { param: 'value' })
   *  t('key.path', 'Fallback text', { param: 'value' })
   */
  const t = useCallback((keyPath, fallback = '', params = {}) => {
    if (!keyPath) return '';

    let actualFallback = fallback;
    let actualParams = params;
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      actualParams = fallback;
      actualFallback = '';
    }

    const keys = keyPath.split('.');
    
    // 1. Try selected language
    let current = translations[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    // 2. Fallback to English if not found
    if (current === undefined || current === null) {
      current = translations['en'];
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }
    }

    const isInvalidObject = current !== null && typeof current === 'object' && !Array.isArray(current);
    let result = (current !== undefined && current !== null && !isInvalidObject) ? current : (actualFallback || keyPath);

    // 3. Replace param interpolation {paramName}
    if (typeof result === 'string' && actualParams && typeof actualParams === 'object') {
      Object.entries(actualParams).forEach(([paramKey, paramValue]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return typeof result === 'string' || typeof result === 'number' || Array.isArray(result) ? result : (actualFallback || keyPath);
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        changeLanguage,
        availableLanguages: AVAILABLE_LANGUAGES,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful default fallback for isolated components or unit tests
    return {
      language: 'en',
      setLanguage: () => {},
      changeLanguage: () => {},
      availableLanguages: AVAILABLE_LANGUAGES,
      t: (keyPath, fallback = '', params = {}) => {
        if (!keyPath) return '';
        let actualFallback = fallback;
        let actualParams = params;
        if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
          actualParams = fallback;
          actualFallback = '';
        }
        const keys = keyPath.split('.');
        let current = translations['en'];
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            current = undefined;
            break;
          }
        }
        const isInvalidObject = current !== null && typeof current === 'object' && !Array.isArray(current);
        let result = (current !== undefined && current !== null && !isInvalidObject) ? current : (actualFallback || keyPath);
        if (typeof result === 'string' && actualParams && typeof actualParams === 'object') {
          Object.entries(actualParams).forEach(([paramKey, paramValue]) => {
            result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
          });
        }
        return typeof result === 'string' || typeof result === 'number' || Array.isArray(result) ? result : (actualFallback || keyPath);
      },
    };
  }
  return context;
};

