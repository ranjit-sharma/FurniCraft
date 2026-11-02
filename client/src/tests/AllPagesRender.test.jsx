import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import api from '../api/client';

// Pages to verify
import { ToolsPage } from '../pages/ToolsPage';
import { AttendancePage } from '../pages/AttendancePage';
import { PayrollPage } from '../pages/PayrollPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { ThekedarsPage } from '../pages/ThekedarsPage';
import { WorkersPage } from '../pages/WorkersPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { FinancePage } from '../pages/FinancePage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { MembersOverviewPage } from '../pages/MembersOverviewPage';
import { DisputesPage } from '../pages/DisputesPage';
import { TransactionSearchPage } from '../pages/TransactionSearchPage';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user_123',
      name: 'Test Owner',
      role: 'OWNER',
      email: 'owner@test.com',
      preferredLanguage: 'en',
    },
    isOwner: true,
    isThekedar: false,
    isWorker: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

describe('All Pages Render Verification - Zero Blank Screen Test', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock responses for all endpoints
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.includes('/tools/issues')) {
        return Promise.resolve({ data: { issues: [] } });
      }
      if (url.includes('/tools')) {
        return Promise.resolve({
          data: {
            tools: [
              {
                _id: 'tool_1',
                toolCode: 'TL-001',
                name: 'Bosch Cordless Drill',
                category: 'DRILL',
                brand: 'Bosch',
                condition: 'EXCELLENT',
                status: 'AVAILABLE',
                thekedarId: { _id: 'th_1', name: 'Rajesh Contractor' },
              },
            ],
          },
        });
      }
      if (url.includes('/users/thekedars')) {
        return Promise.resolve({
          data: {
            thekedars: [
              {
                _id: 'th_1',
                name: 'Rajesh Thekedar',
                email: 'rajesh@thekedar.com',
                phone: '+91 98111 22334',
                role: 'THEKEDAR',
                status: 'ACTIVE',
              },
            ],
          },
        });
      }
      if (url.includes('/users/workers')) {
        return Promise.resolve({
          data: {
            workers: [
              {
                _id: 'wp_1',
                userId: {
                  _id: 'u_w1',
                  name: 'Ramesh Mistri',
                  email: 'ramesh@mistri.com',
                  phone: '+91 99222 33445',
                  status: 'ACTIVE',
                },
                workerCode: 'WRK-0001',
                defaultDailyWage: 800,
                skills: ['Cabinet Making'],
              },
            ],
          },
        });
      }
      if (url.includes('/projects/money-received/all')) {
        return Promise.resolve({ data: { payments: [] } });
      }
      if (url.includes('/projects')) {
        return Promise.resolve({
          data: {
            projects: [
              {
                _id: 'proj_1',
                name: 'Luxury Villa Modular Kitchen',
                projectCode: 'PRJ-001',
                status: 'IN_PROGRESS',
                priority: 'HIGH',
              },
            ],
          },
        });
      }
      if (url.includes('/payroll')) {
        return Promise.resolve({ data: { payrolls: [] } });
      }
      if (url.includes('/finance/transactions')) {
        return Promise.resolve({ data: { transactions: [] } });
      }
      if (url.includes('/finance/advance-requests')) {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (url.includes('/audit')) {
        return Promise.resolve({ data: { logs: [] } });
      }
      if (url.includes('/reports/members-overview')) {
        return Promise.resolve({
          data: {
            data: {
              summary: { totalMembers: 5 },
              members: [],
              recentVisits: [],
            },
          },
        });
      }
      if (url.includes('/disputes')) {
        return Promise.resolve({ data: { disputes: [] } });
      }
      if (url.includes('/attendance/calendar')) {
        return Promise.resolve({ data: { records: [], summary: {} } });
      }

      return Promise.resolve({ data: {} });
    });
  });

  const renderWithProviders = (Component) => {
    return render(
      <ErrorBoundary>
        <LanguageProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Component />
            </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </ErrorBoundary>
    );
  };

  it('renders ToolsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ToolsPage);
    expect(container).not.toBeEmptyDOMElement();
    expect(await screen.findByText(/Modern Furniture Tool Tracking/i)).toBeInTheDocument();
  });

  it('renders AttendancePage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(AttendancePage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders PayrollPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(PayrollPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders ProjectsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ProjectsPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders ThekedarsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ThekedarsPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders WorkersPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(WorkersPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders ExpensesPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ExpensesPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders FinancePage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(FinancePage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders AuditLogsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(AuditLogsPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders MembersOverviewPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(MembersOverviewPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders DisputesPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(DisputesPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders TransactionSearchPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(TransactionSearchPage);
    expect(container).not.toBeEmptyDOMElement();
  });
});
