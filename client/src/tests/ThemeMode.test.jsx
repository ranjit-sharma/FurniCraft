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
  const { theme, resolvedTheme, isDark, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <span data-testid="isDark-val">{isDark ? 'yes' : 'no'}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
};

describe('Dark Mode & Theme System Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  it('defaults to system theme and respects light/dark methods', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-val').textContent).toBe('system');

    // Click Set Dark
    act(() => {
      fireEvent.click(screen.getByText('Set Dark'));
    });
    expect(screen.getByTestId('theme-val').textContent).toBe('dark');
    expect(screen.getByTestId('resolved-val').textContent).toBe('dark');
    expect(screen.getByTestId('isDark-val').textContent).toBe('yes');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('furnicraft_theme')).toBe('dark');

    // Click Set Light
    act(() => {
      fireEvent.click(screen.getByText('Set Light'));
    });
    expect(screen.getByTestId('theme-val').textContent).toBe('light');
    expect(screen.getByTestId('resolved-val').textContent).toBe('light');
    expect(screen.getByTestId('isDark-val').textContent).toBe('no');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('furnicraft_theme')).toBe('light');
  });

  it('renders ThemeSelector with Light, Dark, System buttons and switches themes', () => {
    render(
      <LanguageProvider>
        <ThemeProvider>
          <ThemeSelector variant="buttons" />
        </ThemeProvider>
      </LanguageProvider>
    );

    const darkBtn = screen.getByTitle('Dark Mode');
    const lightBtn = screen.getByTitle('Light Mode');
    const systemBtn = screen.getByTitle('System Mode');

    expect(darkBtn).toBeDefined();
    expect(lightBtn).toBeDefined();
    expect(systemBtn).toBeDefined();

    // Click Dark
    act(() => {
      fireEvent.click(darkBtn);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('furnicraft_theme')).toBe('dark');

    // Click Light
    act(() => {
      fireEvent.click(lightBtn);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('furnicraft_theme')).toBe('light');

    // Click System
    act(() => {
      fireEvent.click(systemBtn);
    });
    expect(localStorage.getItem('furnicraft_theme')).toBe('system');
  });

  it('renders theme toggler inside the profile dropdown in Navbar', () => {
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

    // Profile menu is now open with theme preference
    expect(screen.getByText(/Theme Preference/i)).toBeDefined();
    expect(screen.getByTitle('Light Mode')).toBeDefined();
    expect(screen.getByTitle('Dark Mode')).toBeDefined();
    expect(screen.getByTitle('System Mode')).toBeDefined();

    // Switch theme from dropdown
    act(() => {
      fireEvent.click(screen.getByTitle('Dark Mode'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
