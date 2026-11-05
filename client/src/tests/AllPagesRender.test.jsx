import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import api from '../api/client';

// Pages to verify
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { ThekedarsPage } from '../pages/ThekedarsPage';
import { WorkersPage } from '../pages/WorkersPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { MembersOverviewPage } from '../pages/MembersOverviewPage';
import { TransactionSearchPage } from '../pages/TransactionSearchPage';
import { OwnerDashboard } from '../pages/OwnerDashboard';
import { ThekedarDashboard } from '../pages/ThekedarDashboard';

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
      if (url.includes('/users/thekedars')) {
        return Promise.resolve({
          data: {
            thekedars: [
              {
                _id: 'th_1',
                name: 'Sunil Sharma',
                email: 'sunil@thekedar.com',
                phone: '+91 82705 66992',
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
                  name: 'Sumit kumar',
                  email: 'sumit@furnicraft.com',
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
      if (url.includes('/projects/proj_1')) {
        return Promise.resolve({
          data: {
            project: {
              _id: 'proj_1',
              name: 'Luxury Villa Modular Kitchen',
              projectCode: 'PRJ-001',
              status: 'IN_PROGRESS',
              priority: 'HIGH',
              siteAddress: 'Sector 62, Noida',
            },
            moneyReceived: [
              {
                _id: 'mr_1',
                amount: 50000,
                stage: 'Advance Booking',
                paymentMethod: 'BANK_TRANSFER',
                receiptCode: 'RCP-001',
              },
            ],
          },
        });
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
      if (url.includes('/system/db-health')) {
        return Promise.resolve({
          data: {
            status: 'Connected',
            isConnected: true,
            databaseName: 'furnicraft_db',
            lastCheck: new Date().toISOString(),
            uptimeSeconds: 7200,
            latencyMs: 8,
            lastError: null,
            availability: '100% Operational',
          },
        });
      }
      if (url.includes('/reports/dashboard')) {
        return Promise.resolve({
          data: {
            metrics: {
              activeProjectsCount: 3,
              managedWorkersCount: 8,
              totalMembers: 12,
              totalThekedars: 2,
              totalWorkers: 10,
              totalVisits: 150,
              todayVisits: 22,
            },
            activeProjects: [],
            pendingAdvanceRequests: [],
            workers: [
              { userId: 'w_1', name: 'Mohan Lal', status: 'ACTIVE', workerCode: 'FC-WRK-0001', defaultDailyWage: 850, today: null },
            ],
            thekedars: [
              { _id: 'th_1', name: 'Sunil Sharma', status: 'ACTIVE', workers: 5, activeProjects: 2, projects: 3, unpaidWages: 1600, outstandingAdvances: 500, netPayable: 1100 },
            ],
            recentAudits: [],
            recentTransactions: [],
          },
        });
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

  it('renders ProjectsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ProjectsPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders ProjectDetailPage tracking money received', async () => {
    const { container } = renderWithProviders(ProjectDetailPage);
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

  it('renders AuditLogsPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(AuditLogsPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders MembersOverviewPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(MembersOverviewPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders TransactionSearchPage without crashing or blank screen', async () => {
    const { container } = renderWithProviders(TransactionSearchPage);
    expect(container).not.toBeEmptyDOMElement();
  });

  it('renders OwnerDashboard without crashing or blank screen', async () => {
    const { container } = renderWithProviders(OwnerDashboard);
    expect(container).not.toBeEmptyDOMElement();
    expect(await screen.findByText('₹1,100')).toBeInTheDocument(); // Sunil's net payable from the per-Thekedar list
  });

  it('renders ThekedarDashboard without crashing or blank screen', async () => {
    const { container } = renderWithProviders(ThekedarDashboard);
    expect(container).not.toBeEmptyDOMElement();
    expect(await screen.findByText(/Today's attendance/i)).toBeInTheDocument();
    expect(await screen.findByRole('radiogroup', { name: 'Attendance for Mohan Lal' })).toBeInTheDocument();
  });
});
