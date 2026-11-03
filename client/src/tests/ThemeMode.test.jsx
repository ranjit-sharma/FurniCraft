import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Navbar } from '../components/layout/Navbar';
import { ThemeSelector } from '../components/common/ThemeSelector';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user_123',
      name: 'Ramesh Mistri',
      role: 'THEKEDAR',
      email: 'thekedar@test.com',
      phone: '+91 99887 76655',
    },
    logout: vi.fn(),
  }),
}));

const TestConsumer = () => {
  const { theme, resolvedTheme, isDark } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <span data-testid="isDark-val">{isDark ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('Light Mode Enforcement Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  it('permanently enforces light theme and strips dark class from root', () => {
    // Simulate leftover dark class on root and dark theme in localStorage
    document.documentElement.classList.add('dark');
    localStorage.setItem('furnicraft_theme', 'dark');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-val').textContent).toBe('light');
    expect(screen.getByTestId('resolved-val').textContent).toBe('light');
    expect(screen.getByTestId('isDark-val').textContent).toBe('no');
    // Dark class must be completely removed from root
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('furnicraft_theme')).toBeNull();
  });

  it('ThemeSelector renders null and does not mount theme toggle buttons', () => {
    const { container } = render(
      <LanguageProvider>
        <ThemeProvider>
          <ThemeSelector />
        </ThemeProvider>
      </LanguageProvider>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTitle('Dark Mode')).toBeNull();
    expect(screen.queryByTitle('Light Mode')).toBeNull();
  });

  it('profile dropdown in Navbar no longer renders any Theme Preference section', () => {
    render(
      <LanguageProvider>
        <ThemeProvider>
          <Navbar />
        </ThemeProvider>
      </LanguageProvider>
    );

    // Profile menu is initially closed
    expect(screen.queryByText(/Theme Preference/i)).toBeNull();

    // Click profile avatar button
    const toggler = screen.getByLabelText(/User profile toggler/i);
    act(() => {
      fireEvent.click(toggler);
    });

    // Profile menu is now open, but Theme Preference must NOT be present
    expect(screen.queryByText(/Theme Preference/i)).toBeNull();
    expect(screen.queryByTitle('Dark Mode')).toBeNull();
    expect(screen.queryByTitle('Light Mode')).toBeNull();
    // Language Preference remains present
    expect(screen.getByText(/Language Preference/i)).toBeDefined();
  });
});
