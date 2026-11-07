import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutGrid,
  List,
  ArrowRight,
  Download,
} from 'lucide-react';

export const AttendanceCalendar = ({
  records = [],
  payments = [],
  advances = [],
  year,
  month,
  summary,
  onMonthChange,
  onDayClick,
  isWorker,
  onExportPDF,
  exportingPdf = false,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedDate, setSelectedDate] = useState(null);

  // Compute days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday

  // Group records by day string YYYY-MM-DD
  const recordMap = {};
  records.forEach((r) => {
    if (!recordMap[r.date]) {
      recordMap[r.date] = [];
    }
    recordMap[r.date].push(r);
  });

  // Group payments by date
  const paymentMap = {};
  payments.forEach((p) => {
    const dStr = new Date(p.transactionDate).toISOString().split('T')[0];
    if (!paymentMap[dStr]) paymentMap[dStr] = [];
    paymentMap[dStr].push(p);
  });

  // Group advance requests by date
  const advanceMap = {};
  (advances || []).forEach((adv) => {
    const rawDate = adv.requestedAt || adv.createdAt || adv.reviewedAt;
    if (rawDate) {
      const dStr = new Date(rawDate).toISOString().split('T')[0];
      if (!advanceMap[dStr]) advanceMap[dStr] = [];
      advanceMap[dStr].push(adv);
    }
  });

  const rawMonths = t('calendar.months');
  const monthNames = Array.isArray(rawMonths) ? rawMonths : [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const rawWeekdays = t('calendar.weekdays');
  const weekDays = Array.isArray(rawWeekdays) ? rawWeekdays : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const handleCellClick = (dateStr, dayRecords) => {
    setSelectedDate(dateStr);
    if (onDayClick) {
      onDayClick(dateStr, dayRecords);
    }
  };

  // Build Grid day cells
  const dayCells = [];
  // Empty cells before first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push(
      <div
        key={`empty-${i}`}
        className="min-h-[54px] sm:min-h-[90px] border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 rounded-lg sm:rounded-xl"
      />
    );
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayRecords = recordMap[dateStr] || [];
    const dayPayments = paymentMap[dateStr] || [];
    const dayAdvances = advanceMap[dateStr] || [];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const isSelected = selectedDate === dateStr;
    const singleRecord = dayRecords.length === 1 ? dayRecords[0] : null;
    const pendingRecords = dayRecords.filter(
      (r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'CORRECTION_REQUESTED'
    );
    const dayEarnings = dayRecords.reduce((acc, r) => acc + (r.calculatedEarnings || 0), 0);

    // Differentiate advances taken vs salary payouts
    const advanceTransactions = dayPayments.filter(
      (p) => p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST'
    );
    const salaryTransactions = dayPayments.filter(
      (p) => p.category !== 'ADVANCE_DISBURSEMENT' && p.category !== 'ADVANCE_REQUEST'
    );

    let totalAdvanceOnDay = advanceTransactions.reduce((acc, p) => acc + (p.amount || 0), 0);
    const unlinkedDisbursedAdvances = dayAdvances.filter(
      (a) => a.status === 'DISBURSED' && (!a.disbursedTransactionId || !advanceTransactions.some((t) => String(t._id) === String(a.disbursedTransactionId?._id || a.disbursedTransactionId)))
    );
    totalAdvanceOnDay += unlinkedDisbursedAdvances.reduce((acc, a) => acc + (a.amount || 0), 0);

    const pendingAdvancesOnDay = dayAdvances.filter(
      (a) => a.status === 'PENDING' || a.status === 'APPROVED'
    );
    const totalSalaryOnDay = salaryTransactions.reduce((acc, p) => acc + (p.amount || 0), 0);

    dayCells.push(
      <div
        key={dateStr}
        onClick={() => handleCellClick(dateStr, dayRecords)}
        className={`group relative flex flex-col justify-between min-h-[54px] sm:min-h-[95px] p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer overflow-hidden ${
          isSelected
            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40 dark:bg-amber-950/40 shadow-sm'
            : isToday
            ? 'border-amber-400 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/30 shadow-sm'
            : pendingRecords.length > 0
            ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/15 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md'
            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md'
        }`}
      >
        {/* Day Number & Header Badges */}
        <div className="flex items-center justify-between gap-0.5">
          <span
            className={`text-[10px] sm:text-xs font-bold leading-none ${
              isToday
                ? 'h-4 w-4 sm:h-6 sm:w-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {d}
          </span>

          {singleRecord ? (
            <>
              {/* Desktop Badge */}
              <div className="hidden sm:block">
                <Badge variant={singleRecord.code} size="sm">
                  {singleRecord.code}
                </Badge>
              </div>
              {/* Mobile Badge */}
              <span className="sm:hidden px-1 py-0.2 text-[8px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-200 leading-tight">
                {singleRecord.code}
              </span>
            </>
          ) : dayRecords.length > 1 ? (
            <>
              {/* Desktop Badge */}
              <span className="hidden sm:inline-block rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                {dayRecords.length} Workers
              </span>
              {/* Mobile Badge */}
              <span className="sm:hidden rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1 py-0.2 text-[8px] font-bold border border-slate-200 dark:border-slate-700 leading-tight">
                {dayRecords.length}w
              </span>
            </>
          ) : null}
        </div>

        {/* Middle: Earnings & Status Indicator */}
        <div className="my-0.5 sm:my-1 flex-1 flex flex-col justify-center overflow-hidden">
          {singleRecord ? (
            <div className="space-y-0.5">
              <div className="text-[9px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                ₹{singleRecord.calculatedEarnings}
                <span className="hidden sm:inline text-[10px] text-slate-700 dark:text-slate-400 font-normal ml-1">
                  ({singleRecord.wageMultiplier}x)
                </span>
              </div>

              {/* Desktop Status Badge */}
              <div className="hidden sm:block text-[10px]">
                <Badge variant={singleRecord.approvalStatus} size="sm" className="px-1.5 py-0 text-[9px]">
                  {singleRecord.approvalStatus}
                </Badge>
              </div>

              {/* Mobile Status Micro-Indicator */}
              <div className="sm:hidden flex items-center gap-1">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                    singleRecord.approvalStatus === 'APPROVED'
                      ? 'bg-emerald-600'
                      : singleRecord.approvalStatus === 'REJECTED'
                      ? 'bg-rose-600'
                      : singleRecord.approvalStatus === 'CORRECTION_REQUESTED'
                      ? 'bg-blue-600'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-[7.5px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                  {singleRecord.approvalStatus === 'APPROVED'
                    ? 'Appr'
                    : singleRecord.approvalStatus === 'REJECTED'
                    ? 'Rej'
                    : singleRecord.approvalStatus === 'CORRECTION_REQUESTED'
                    ? 'Req'
                    : 'Sub'}
                </span>
              </div>
            </div>
          ) : dayRecords.length > 1 ? (
            <div className="space-y-0.5">
              <div className="text-[9px] sm:text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                ₹{dayEarnings}
                <span className="hidden sm:inline text-[10px] text-slate-700 dark:text-slate-400 font-normal ml-1">tot</span>
              </div>

              {/* Desktop Status Badge */}
              <div className="hidden sm:block">
                {pendingRecords.length > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-300">
                    ⚠️ {pendingRecords.length} Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                    ✓ All Approved
                  </span>
                )}
              </div>

              {/* Mobile Status Micro-Indicator */}
              <div className="sm:hidden">
                {pendingRecords.length > 0 ? (
                  <span className="inline-flex items-center text-[7.5px] font-bold text-amber-800 bg-amber-50 px-1 rounded border border-amber-200">
                    ⚠️{pendingRecords.length}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[7.5px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded border border-emerald-200">
                    ✓All
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="hidden sm:inline text-[10px] text-slate-700 dark:text-slate-400 italic group-hover:text-amber-700 dark:group-hover:text-amber-400">
              No entry
            </span>
          )}
        </div>

        {/* Bottom: Advance Taken & Salary Payments */}
        {(totalAdvanceOnDay > 0 || totalSalaryOnDay > 0 || pendingAdvancesOnDay.length > 0) && (
          <div className="mt-0.5 pt-0.5 border-t border-slate-100/90 dark:border-slate-800 space-y-0.5">
            {totalAdvanceOnDay > 0 && (
              <div
                className="flex items-center justify-between text-[7.5px] sm:text-[9.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-950/70 px-1 py-0.5 rounded border border-rose-200/80 dark:border-rose-900 leading-tight truncate shadow-2xs"
                title={`Advance Taken: ₹${totalAdvanceOnDay.toLocaleString('en-IN')}`}
              >
                <span className="truncate flex items-center gap-0.5">
                  <span className="hidden sm:inline">Adv Taken:</span>
                  <span className="sm:hidden">Adv:</span>
                </span>
                <span className="font-extrabold truncate ml-0.5">₹{totalAdvanceOnDay}</span>
              </div>
            )}

            {pendingAdvancesOnDay.length > 0 && totalAdvanceOnDay === 0 && (
              <div
                className="flex items-center justify-between text-[7px] sm:text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-900 leading-tight truncate"
                title={`Advance Request Pending: ₹${pendingAdvancesOnDay.reduce((a, b) => a + b.amount, 0)}`}
              >
                <span className="truncate">Adv Req:</span>
                <span className="font-extrabold ml-0.5">₹{pendingAdvancesOnDay.reduce((a, b) => a + b.amount, 0)}</span>
              </div>
            )}

            {totalSalaryOnDay > 0 && (
              <div
                className="flex items-center justify-between text-[7.5px] sm:text-[9.5px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/80 dark:bg-emerald-950/70 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 leading-tight truncate"
                title={`Salary Paid: ₹${totalSalaryOnDay.toLocaleString('en-IN')}`}
              >
                <span className="hidden sm:inline truncate">Paid:</span>
                <span className="sm:hidden truncate">Pd:</span>
                <span className="truncate ml-0.5">₹{totalSalaryOnDay}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Build List View / Agenda View entries (chronological)
  const activeDaysList = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayRecords = recordMap[dateStr] || [];
    const dayPayments = paymentMap[dateStr] || [];
    const dayAdvances = advanceMap[dateStr] || [];
    if (dayRecords.length > 0 || dayPayments.length > 0 || dayAdvances.length > 0) {
      const dateObj = new Date(year, month - 1, d);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      activeDaysList.push({
        dateStr,
        dayNumber: d,
        dayName,
        records: dayRecords,
        payments: dayPayments,
        advances: dayAdvances,
        isToday: new Date().toISOString().split('T')[0] === dateStr,
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {monthNames[month - 1]} {year}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Calendar Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              <span className="text-xs">{t('calendar.grid') || 'Grid'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Agenda / List View"
            >
              <List className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
              <span className="text-xs">{t('calendar.agenda') || 'Agenda'}</span>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button variant="outline" size="xs" onClick={handlePrevMonth} icon={ChevronLeft} className="sm:text-xs">
              <span className="hidden sm:inline">{t('calendar.prev') || 'Prev'}</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                const now = new Date();
                onMonthChange(now.getFullYear(), now.getMonth() + 1);
              }}
              className="sm:text-xs"
            >
              {t('calendar.today') || 'Today'}
            </Button>
            <Button variant="outline" size="xs" onClick={handleNextMonth} className="sm:text-xs">
              <span className="hidden sm:inline">{t('calendar.next') || 'Next'}</span>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:ml-1" />
            </Button>
            {onExportPDF && (
              <Button
                variant="outline"
                size="xs"
                loading={exportingPdf}
                onClick={onExportPDF}
                icon={Download}
                className="sm:text-xs font-bold text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 shadow-2xs ml-1"
                title={`Export ${monthNames[month - 1]} ${year} Attendance (PDF)`}
              >
                <span className="hidden sm:inline">{t('calendar.exportPdf') || 'Export PDF'}</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-sm">
            <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-400 font-medium truncate">
              {summary.totalDehadi !== undefined ? (t('calendar.totalDehadiTitle', 'Total Shifts')) : (t('calendar.approvedDays', 'Approved Present Days'))}
            </div>
            <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {summary.totalDehadi !== undefined ? (
                <>
                  {summary.totalDehadi} {t('calendar.dehadiUnit', 'Shifts')}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block sm:inline sm:ml-1">
                    ({summary.approvedDaysCount} {t('calendar.shiftsWorked', 'shifts')})
                  </span>
                </>
              ) : (
                `${summary.approvedDaysCount} ${t('common.days', 'Days')}`
              )}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 sm:p-3.5 shadow-sm">
            <div className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">{t('dashboard.approvedWages', 'Approved Gross Wages')}</div>
            <div className="text-base sm:text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              ₹{summary.totalApprovedEarnings?.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 p-2.5 sm:p-3.5 shadow-sm">
            <div className="text-[11px] sm:text-xs text-rose-700 dark:text-rose-400 font-medium truncate">{t('calendar.totalAdvanceTaken', 'Total Advance Taken')}</div>
            <div className="text-base sm:text-xl font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              ₹{(summary.totalAdvancesTaken || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-sm">
            <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-400 font-medium truncate">Full (P) / Half (HALF)</div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
              {summary.codeCounts?.P || 0} Full / {summary.codeCounts?.HALF || 0} Half
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 p-2.5 sm:p-3.5 shadow-sm">
            <div className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400 font-medium truncate">Overtime & Multi-Shifts</div>
            <div className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 mt-1 truncate">
              {summary.codeCounts?.['P1/5'] || 0} OT / {summary.codeCounts?.PP || 0} 2x / {(summary.codeCounts?.['P2/5'] || 0) + (summary.codeCounts?.PPP || 0)} Multi
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: GRID */}
      {viewMode === 'grid' && (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-400 py-1">
            {weekDays.map((day, idx) => (
              <div key={idx}>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">{dayCells}</div>

          {/* Mobile Tap Quick Details Banner */}
          {selectedDate && (recordMap[selectedDate]?.length > 0 || paymentMap[selectedDate]?.length > 0 || advanceMap[selectedDate]?.length > 0) && (
            <div className="sm:hidden rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
                  <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Selected: {selectedDate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCellClick(selectedDate, recordMap[selectedDate] || [])}
                  className="text-[11px] font-bold text-amber-800 dark:text-amber-300 underline flex items-center gap-0.5 cursor-pointer"
                >
                  {t('thekedar.viewDetails') || t('common.view') || 'View Details'} <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1">
                {(recordMap[selectedDate] || []).map((r) => (
                  <div key={r._id} className="flex items-center justify-between bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-amber-200/60 dark:border-slate-700 text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{r.workerId?.name || (isWorker ? (t('nav.myDashboard') || 'My Shift') : (t('thekedarDashboard.tableWorker') || 'Worker'))}</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-400 ml-1.5">({r.code} • {r.wageMultiplier}x)</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">₹{r.calculatedEarnings}</span>
                      <Badge variant={r.approvalStatus} size="sm" className="text-[8px] px-1 py-0">{r.approvalStatus}</Badge>
                    </div>
                  </div>
                ))}

                {(paymentMap[selectedDate] || []).map((p) => {
                  const isAdv = p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST';
                  return (
                    <div
                      key={p._id}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-semibold ${
                        isAdv
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`inline-block h-2 w-2 rounded-full ${isAdv ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                        <span>
                          {isAdv ? (t('calendar.advanceTaken') || 'Advance Taken:') : (t('attendancePage.salaryPayout') || 'Salary Paid:')}{' '}
                          <strong className="font-bold">{p.workerId?.name ? `(${p.workerId.name})` : ''}</strong>
                        </span>
                      </div>
                      <span className="font-black shrink-0">
                        {isAdv ? '-' : ''}₹{p.amount} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({p.paymentMethod})</span>
                      </span>
                    </div>
                  );
                })}

                {(advanceMap[selectedDate] || []).filter((a) => a.status !== 'DISBURSED').map((adv) => (
                  <div key={adv._id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/70 px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 font-semibold">
                    <span>{t('worker.requestAdvance') || 'Advance Request'} ({adv.status}): {adv.workerId?.name ? `(${adv.workerId.name})` : ''}</span>
                    <span className="font-black shrink-0">₹{adv.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE: AGENDA / LIST VIEW (Mobile-friendly stacked list) */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {activeDaysList.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-700 dark:text-slate-400 italic">
              No attendance logs or disbursements recorded for {monthNames[month - 1]} {year}.
            </div>
          ) : (
            activeDaysList.map((item) => (
              <div
                key={item.dateStr}
                onClick={() => handleCellClick(item.dateStr, item.records)}
                className={`rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-md ${
                  item.isToday
                    ? 'border-amber-400 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                {/* Header: Date + Day Name + Quick Totals */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-7 w-7 rounded-lg text-xs font-black flex items-center justify-center ${
                        item.isToday
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.dayNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {`${monthNames[month - 1].slice(0, 3)} ${item.dayNumber}, ${year}`}
                      </h4>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-400">{item.dayName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        ₹{item.records.reduce((acc, r) => acc + (r.calculatedEarnings || 0), 0)} earned
                      </div>
                      {item.payments.filter((p) => p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST').length > 0 && (
                        <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400">
                          ₹{item.payments.filter((p) => p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST').reduce((acc, p) => acc + p.amount, 0)} adv taken
                        </div>
                      )}
                      {item.payments.filter((p) => p.category !== 'ADVANCE_DISBURSEMENT' && p.category !== 'ADVANCE_REQUEST').length > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                          ₹{item.payments.filter((p) => p.category !== 'ADVANCE_DISBURSEMENT' && p.category !== 'ADVANCE_REQUEST').reduce((acc, p) => acc + p.amount, 0)} paid
                        </span>
                      )}
                    </div>
                    <Button size="xs" variant="outline" className="text-xs">
                      Details <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Records list */}
                <div className="mt-2.5 space-y-2">
                  {item.records.map((r) => (
                    <div
                      key={r._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 p-2 text-xs border border-slate-100 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={r.code} size="sm">
                          {r.code} ({r.wageMultiplier}x)
                        </Badge>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{r.workerId?.name || (isWorker ? 'My Shift' : 'Worker')}</span>
                          {r.projectId?.name && (
                            <span className="text-[11px] text-slate-700 dark:text-slate-400 ml-1.5">• {r.projectId.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-xs">₹{r.calculatedEarnings}</span>
                        <Badge variant={r.approvalStatus} size="sm">
                          {r.approvalStatus}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Payments list */}
                  {item.payments.map((p) => {
                    const isAdv = p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST';
                    return (
                      <div
                        key={p._id}
                        className={`flex items-center justify-between rounded-lg p-2 text-xs border font-semibold ${
                          isAdv
                            ? 'bg-rose-50/90 dark:bg-rose-950/70 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
                            : 'bg-emerald-50/80 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div>
                          <span>
                            {isAdv ? (t('calendar.advanceTaken') || '💸 Advance Taken') : (t('thekedar.disbursed') || 'Payment Disbursed')} via <strong>{p.paymentMethod}</strong>
                            {p.workerId?.name && ` to ${p.workerId.name}`}
                            {p.receiptReference || p.referenceNumber ? ` (Ref: ${p.receiptReference || p.referenceNumber})` : ''}
                          </span>
                          {p.notes && <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">{p.notes}</div>}
                        </div>
                        <span className={`font-black shrink-0 ${isAdv ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-950 dark:text-emerald-300'}`}>
                          {isAdv ? '-' : ''}₹{p.amount}
                        </span>
                      </div>
                    );
                  })}

                  {/* Advance requests if pending or approved */}
                  {(item.advances || []).filter((a) => a.status !== 'DISBURSED').map((adv) => (
                    <div
                      key={adv._id}
                      className="flex items-center justify-between rounded-lg bg-amber-50/80 dark:bg-amber-950/70 p-2 text-xs border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-semibold"
                    >
                      <span>
                        {t('worker.requestAdvance') || 'Advance Request'} ({adv.status})
                        {adv.workerId?.name ? ` for ${adv.workerId.name}` : ''}
                        {adv.reason ? `: "${adv.reason}"` : ''}
                      </span>
                      <span className="font-black text-amber-950 dark:text-amber-200">₹{adv.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 text-[10px] sm:text-xs text-slate-700 dark:text-slate-400">
        <span className="font-bold text-slate-700 dark:text-slate-300">{t('calendar.legend') || 'Multiplier Legend:'}</span>
        <span className="flex items-center gap-1">
          <Badge variant="P" size="sm">P</Badge> Full (1.0x)
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="HALF" size="sm">0.5</Badge> Half (0.5x)
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="P1/5" size="sm">P1/5</Badge> 9 PM (1.5x)
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="PP" size="sm">PP</Badge> 2 Shifts (2.0x)
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="P2/5" size="sm">2.5x</Badge> 2.5 Shifts (2.5x)
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="PPP" size="sm">3x</Badge> 3 Shifts (3.0x)
        </span>
        <div className="flex items-center gap-2 sm:border-l sm:border-slate-300 dark:sm:border-slate-700 sm:pl-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> {t('common.approved') || 'Approved'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> {t('common.pending') || 'Pending'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-600" /> {t('common.rejected') || 'Rejected'}
          </span>
          <span className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-2">
            <span className="h-2 w-2 rounded-full bg-rose-700" /> {t('calendar.advanceTaken') || 'Advance Taken'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-700" /> {t('calendar.paidBadge') ? t('calendar.paidBadge').replace(': ₹{amt}', '') : 'Salary Paid'}
          </span>
        </div>
      </div>
    </div>
  );
};
