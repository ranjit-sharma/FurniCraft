import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BottomNav } from '../components/layout/BottomNav';
import { ExpensesPage } from '../pages/ExpensesPage';
import api from '../api/client';

// Mock AuthContext as Thekedar
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'thekedar_123',
      name: 'Test Thekedar',
      role: 'THEKEDAR',
      email: 'thekedar@test.com',
      preferredLanguage: 'en',
    },
    isOwner: false,
    isThekedar: true,
    isWorker: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

describe('Mobile Bottom Navigation — FurniCraft ERP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.includes('/projects')) {
        return Promise.resolve({ data: { projects: [] } });
      }
      if (url.includes('/expenses')) {
        return Promise.resolve({ data: { payments: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders all 5 bottom navigation tabs with exact required labels (Home, Projects, Workers, Income, History)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LanguageProvider>
          <ThemeProvider>
            <BottomNav />
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>
    );

    // Verify all 5 labels exist
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Workers')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();

    // Verify "Money" is replaced by "Income"
    expect(screen.queryByText('Money')).not.toBeInTheDocument();
  });

  it('highlights the Income tab as active when on /expenses', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <LanguageProvider>
          <ThemeProvider>
            <BottomNav />
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>
    );

    const incomeLink = screen.getByText('Income').closest('a');
    expect(incomeLink).toHaveAttribute('href', '/expenses');
    // Active class verification: contains text-amber-700
    expect(incomeLink.className).toContain('text-amber-700');
  });

  it('displays "Project Income" as the page heading on ExpensesPage', async () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <LanguageProvider>
          <ThemeProvider>
            <ExpensesPage />
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>
    );

    // Heading must be "Project Income" (rendered by PageHeader as h2)
    const heading = await screen.findByRole('heading', { level: 2, name: /Project Income/i });
    expect(heading).toBeInTheDocument();
  });
});
