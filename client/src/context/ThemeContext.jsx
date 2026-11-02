import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'furnicraft_theme';

export const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  isDark: false,
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // fallback to system if localStorage throws (e.g. incognito/disabled)
    }
    return 'system';
  });

  const getSystemTheme = useCallback(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      if (typeof window.matchMedia === 'function') {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        return mql && mql.matches ? 'dark' : 'light';
      }
    } catch {
      // ignore errors in restrictive environments
    }
    return 'light';
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'system') return getSystemTheme();
    return theme;
  });

  // Apply theme to DOM and meta tags
  const applyTheme = useCallback((activeTheme) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isDark = activeTheme === 'dark';

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update browser address bar meta color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#1e5ac0');
    }
  }, []);

  // Update resolvedTheme and apply when theme changes or system changes
  useEffect(() => {
    const active = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(active);
    applyTheme(active);

    if (theme === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery) {
          const handleChange = (e) => {
            const nextTheme = e && e.matches ? 'dark' : 'light';
            setResolvedTheme(nextTheme);
            applyTheme(nextTheme);
          };

          if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
          } else if (typeof mediaQuery.addListener === 'function') {
            // Fallback for older Safari
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
          }
        }
      } catch {
        // ignore errors
      }
    }
  }, [theme, getSystemTheme, applyTheme]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'system') return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
