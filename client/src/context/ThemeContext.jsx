import React, { createContext, useContext, useEffect } from 'react';

const THEME_STORAGE_KEY = 'furnicraft_theme';

export const ThemeContext = createContext({
  theme: 'light',
  resolvedTheme: 'light',
  isDark: false,
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#ffffff');
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        resolvedTheme: 'light',
        isDark: false,
        setTheme: () => {},
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
