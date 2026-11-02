import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';

describe('AttendanceCalendar Component', () => {
  it('renders monthly calendar header and days grid', () => {
    const records = [
      {
        date: '2026-10-01',
        code: 'P',
        wageMultiplier: 1.0,
        calculatedEarnings: 850,
        approvalStatus: 'APPROVED',
      },
      {
        date: '2026-10-02',
        code: 'HALF',
        wageMultiplier: 0.5,
        calculatedEarnings: 425,
        approvalStatus: 'APPROVED',
      },
    ];

    const summary = {
      approvedDaysCount: 2,
      totalApprovedEarnings: 1275,
      codeCounts: { P: 1, HALF: 1, 'P1/5': 0, PP: 0 },
    };

    render(
      <AttendanceCalendar
        records={records}
        payments={[]}
        year={2026}
        month={10}
        summary={summary}
        onMonthChange={vi.fn()}
        onDayClick={vi.fn()}
        isWorker={true}
      />
    );

    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('2 Days')).toBeInTheDocument();
    expect(screen.getByText('₹1,275')).toBeInTheDocument();
    expect(screen.getByText('1 Full / 1 Half')).toBeInTheDocument();
  });

  it('allows switching to agenda/list view for mobile responsiveness', async () => {
    const records = [
      {
        _id: 'att-1',
        date: '2026-10-01',
        code: 'P',
        wageMultiplier: 1.0,
        calculatedEarnings: 850,
        approvalStatus: 'APPROVED',
      },
    ];

    const onDayClickMock = vi.fn();

    const { getByText } = render(
      <AttendanceCalendar
        records={records}
        payments={[]}
        year={2026}
        month={10}
        onMonthChange={vi.fn()}
        onDayClick={onDayClickMock}
        isWorker={true}
      />
    );

    const agendaBtn = getByText('Agenda');
    expect(agendaBtn).toBeInTheDocument();
    fireEvent.click(agendaBtn);

    expect(screen.getByText('Oct 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('₹850 earned')).toBeInTheDocument();
  });

  it('renders advance taken on the calendar date cell and agenda view', () => {
    const records = [
      {
        _id: 'att-1',
        date: '2026-10-05',
        code: 'P',
        wageMultiplier: 1.0,
        calculatedEarnings: 800,
        approvalStatus: 'APPROVED',
      },
    ];

    const payments = [
      {
        _id: 'pay-1',
        transactionDate: '2026-10-05T10:00:00.000Z',
        category: 'ADVANCE_DISBURSEMENT',
        amount: 2500,
        paymentMethod: 'CASH',
      },
    ];

    const summary = {
      approvedDaysCount: 1,
      totalApprovedEarnings: 800,
      totalAdvancesTaken: 2500,
      codeCounts: { P: 1, HALF: 0, 'P1/5': 0, PP: 0 },
    };

    render(
      <AttendanceCalendar
        records={records}
        payments={payments}
        year={2026}
        month={10}
        summary={summary}
        onMonthChange={vi.fn()}
        onDayClick={vi.fn()}
        isWorker={false}
      />
    );

    // Verify summary card
    expect(screen.getByText('Total Advance Taken')).toBeInTheDocument();
    expect(screen.getByText('₹2,500')).toBeInTheDocument();

    // Verify calendar date cell shows Advance Taken
    expect(screen.getByText('Adv Taken:')).toBeInTheDocument();
    expect(screen.getByText('₹2500')).toBeInTheDocument();

    // Switch to Agenda view
    fireEvent.click(screen.getByText('Agenda'));
    expect(screen.getByText('₹2500 adv taken')).toBeInTheDocument();
    expect(screen.getAllByText(/Advance Taken/i).length).toBeGreaterThan(0);
  });

  it('renders Export PDF button in calendar navigation header when onExportPDF is provided', () => {
    const onExportMock = vi.fn();
    render(
      <AttendanceCalendar
        records={[]}
        payments={[]}
        year={2026}
        month={10}
        onMonthChange={vi.fn()}
        onDayClick={vi.fn()}
        onExportPDF={onExportMock}
        isWorker={true}
      />
    );

    const exportBtn = screen.getByTitle('Export October 2026 Attendance (PDF)');
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    expect(onExportMock).toHaveBeenCalledTimes(1);
  });
});

