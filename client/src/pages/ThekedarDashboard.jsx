import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ThekedarDashboardSkeleton } from '../components/common/Skeleton';
import { localToday } from '../utils/date';
import {
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle2,
  CalendarOff,
  FileText,
} from 'lucide-react';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Short labels so shift codes fit nicely on phone screens: 0.5, 1, 1.5, 2, 2.5, 3, A
const QUICK_CODES = [
  { code: 'HALF', label: '0.5', title: 'Half day (0.5)' },
  { code: 'P', label: '1', title: 'Full day (1)' },
  { code: 'P1/5', label: '1.5', title: 'Till 9 PM (1.5)' },
  { code: 'PP', label: '2', title: 'Till midnight (2)' },
  { code: 'P2/5', label: '2.5', title: '2.5 Shifts (2.5)' },
  { code: 'PPP', label: '3', title: '3 Shifts (3)' },
  { code: 'ABSENT', label: 'A', title: 'Absent (no earning)' },
];

const PROJECT_KEY = 'furnicraft_attendance_project';

export const ThekedarDashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [savingWorkerId, setSavingWorkerId] = useState(null);
  const isToday = selectedDate === localToday();

  // Surrounding 3 days centered on the selected day [day - 1, selected day (center), day + 1]
  const surroundingDays = React.useMemo(() => {
    const base = new Date(selectedDate + 'T12:00:00');
    const todayStr = localToday();
    const days = [];
    for (let offset = -1; offset <= 1; offset++) {
      const d = new Date(base);
      d.setDate(d.getDate() + offset);
      const dStr = d.toISOString().slice(0, 10);
      days.push({
        dateStr: dStr,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        isSelected: offset === 0,
        isFuture: dStr > todayStr,
      });
    }
    return days;
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().slice(0, 10);
    if (nextStr <= localToday()) {
      setSelectedDate(nextStr);
    }
  };

  const touchStartXRef = React.useRef(null);
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 35) {
      handleNextDay();
    } else if (diff < -35) {
      handlePrevDay();
    }
    touchStartXRef.current = null;
  };

  // Add New Craftsman Modal State
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerTrade, setNewWorkerTrade] = useState('Mistry');
  const [newWorkerWage, setNewWorkerWage] = useState('750');
  const [addWorkerSubmitting, setAddWorkerSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoadError(null);
      const res = await api.get(`/reports/dashboard?date=${selectedDate}`);
      setData(res.data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);


  // One tap marks today's shift; tapping again with another code edits it (server updates the same entry).
  const handleMark = async (worker, code) => {
    if (worker.today?.code === code) return;
    setSavingWorkerId(worker.userId);
    setMessage(null);
    try {
      const res = await api.post('/attendance/submit', {
        workerId: worker.userId,
        date: selectedDate,
        shift: 'GENERAL',
        code,
      });
      setMessage({ type: 'success', text: `${worker.name}: ${res.data?.updated ? 'changed to' : 'marked'} ${code}` });
      await fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingWorkerId(null);
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerPhone.trim()) {
      setMessage({ type: 'error', text: 'Please provide worker name and phone number.' });
      return;
    }
    try {
      setAddWorkerSubmitting(true);
      const res = await api.post('/users/workers', {
        name: newWorkerName.trim(),
        phone: newWorkerPhone.trim(),
        trade: newWorkerTrade || 'Mistry',
        defaultDailyWage: newWorkerWage !== '' && !isNaN(Number(newWorkerWage)) ? Number(newWorkerWage) : 750,
      });
      const generatedCode = res.data?.data?.worker?.profile?.workerCode || 'FC-WRK';
      setMessage({ type: 'success', text: `Craftsman ${newWorkerName} added with ID ${generatedCode}!` });
      setAddWorkerModalOpen(false);
      setNewWorkerName('');
      setNewWorkerPhone('');
      setNewWorkerTrade('Mistry');
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create worker' });
    } finally {
      setAddWorkerSubmitting(false);
    }
  };

  if (loading) {
    return <ThekedarDashboardSkeleton />;
  }

  const m = data?.metrics || {};
  const allActiveWorkers = (data?.workers || []).filter((w) => w.status === 'ACTIVE');
  // Workers marked on leave are excluded from today's attendance marking list
  const onLeaveWorkers = allActiveWorkers.filter((w) => w.isOnLeave || w.today?.code === 'LEAVE');
  const workers = allActiveWorkers.filter((w) => !w.isOnLeave && w.today?.code !== 'LEAVE');
  const markedTodayCount = workers.filter((w) => w.today).length;
  const unmarkedWorkersCount = workers.length - markedTodayCount;
  const isAttendancePending = isToday && workers.length > 0 && unmarkedWorkersCount > 0;
  const isAttendanceComplete = isToday && workers.length > 0 && unmarkedWorkersCount === 0;
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="space-y-5">
      <LoadError message={loadError} onRetry={fetchDashboard} />
      {message && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-medium animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline">
            {t('common.dismiss', 'OK')}
          </button>
        </div>
      )}

      {/* Greeting + money owed */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 p-4 sm:p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black">{t('thekedarDash.greeting', 'Namaste')}, {firstName}</h2>
            <p className="text-xs text-amber-100/80">
              {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/quotations">
              <Button variant="outline-white" size="sm" icon={FileText}>
                {t('nav.quotations', 'Quotations')}
              </Button>
            </Link>
            <Button variant="outline-white" size="sm" icon={UserPlus} onClick={() => setAddWorkerModalOpen(true)}>
              {t('thekedarDash.addWorker', 'Add Worker')}
            </Button>
          </div>
        </div>

        <Link to="/workers" className="mt-4 block rounded-2xl bg-white/10 p-4 active:scale-[0.99] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">{t('thekedarDash.netPayable', 'Net payable to workers')}</span>
            <ChevronRight className="h-4 w-4 text-amber-100/70" />
          </div>
          <div className="text-3xl font-black">{inr(m.netPayable)}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-amber-100/80">{t('thekedarDash.unpaidWages', 'Unpaid earnings')}</div>
              <div className="font-bold">{inr(m.unpaidWages)}</div>
            </div>
            <div>
              <div className="text-[11px] text-amber-100/80">{t('thekedarDash.advances', 'Advances to recover')}</div>
              <div className="font-bold text-rose-100">− {inr(m.outstandingAdvances)}</div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-amber-100/90">
            {t('thekedarDash.thisMonth', 'This month')}: {inr(m.paidThisMonth)} {t('thekedarDash.paid', 'paid')} · {inr(m.advancesThisMonth)} {t('thekedarDash.advanced', 'given as advance')}
          </div>
        </Link>
      </div>



      {/* Today's attendance: one tap per worker */}
      <div id="attendance-card">
        <Card
          title={
            isToday
              ? t('thekedarDash.todayAttendance', "Today's attendance")
              : `Attendance for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })}`
          }
          subtitle={
            workers.length === 0
              ? allActiveWorkers.length === 0
                ? 'No active craftsmen registered yet'
                : 'All craftsmen are on leave'
              : `${markedTodayCount} / ${workers.length} ${t('thekedarDash.marked', 'marked')} · ${t('thekedarDash.tapToChange', 'tap another code to change')}${onLeaveWorkers.length > 0 ? ` · ${onLeaveWorkers.length} ${t('thekedarDash.onLeave', 'on leave')}` : ''}`
          }
          action={
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 select-none w-full sm:w-auto mt-2 sm:mt-0">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                aria-label="Previous Day"
                className="p-1.5 sm:p-1 text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 transition active:scale-90 cursor-pointer shrink-0 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
              </button>

              {/* Exact 3-column day style matching reference */}
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex items-center justify-center gap-3.5 sm:gap-7 px-1 select-none"
              >
                {surroundingDays.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    disabled={d.isFuture}
                    onClick={() => !d.isFuture && setSelectedDate(d.dateStr)}
                    className={`flex flex-col items-center justify-center text-center transition min-w-[34px] sm:min-w-[42px] min-h-[44px] active:scale-95 ${
                      d.isSelected
                        ? 'text-amber-800 dark:text-amber-300 scale-105 cursor-default'
                        : d.isFuture
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-40'
                        : 'text-amber-700/80 hover:text-amber-900 dark:text-amber-400/80 dark:hover:text-amber-200 cursor-pointer'
                    }`}
                  >
                    <span
                      className={`text-[11px] sm:text-[13px] leading-tight ${
                        d.isSelected ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {d.weekday}
                    </span>
                    <span
                      className={`leading-none my-0.5 ${
                        d.isSelected
                          ? 'text-xl sm:text-3xl font-black'
                          : 'text-base sm:text-xl font-bold'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                    <span
                      className={`text-[11px] sm:text-[13px] leading-tight ${
                        d.isSelected ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {d.month}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                disabled={isToday}
                title={isToday ? 'No future dates' : 'Next Day'}
                aria-label="Next Day"
                className={`p-1.5 sm:p-1 transition active:scale-90 shrink-0 rounded-lg ${
                  isToday
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer'
                }`}
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
              </button>

              {/* Today's attendance count badge (Red when pending, Green when all taken) */}
              {isToday && workers.length > 0 && (
                isAttendancePending ? (
                  <span
                    title={`${unmarkedWorkersCount} attendance to take today`}
                    className="relative flex h-7 min-w-[28px] sm:h-8 sm:min-w-[32px] px-1.5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-xs sm:text-sm font-black shadow-xs ring-2 ring-rose-200 dark:ring-rose-950 ml-1 sm:ml-3 select-none animate-fade-in cursor-default"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-50" />
                    <span className="relative">{unmarkedWorkersCount}</span>
                  </span>
                ) : isAttendanceComplete ? (
                  <span
                    title={`All ${markedTodayCount} attendance taken today`}
                    className="relative flex h-7 min-w-[28px] sm:h-8 sm:min-w-[32px] px-1.5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-950 ml-1 sm:ml-3 select-none animate-fade-in cursor-default"
                  >
                    <span className="relative">{markedTodayCount}</span>
                  </span>
                ) : null
              )}
            </div>
          }
        >
        {onLeaveWorkers.length > 0 && (
          <div className="mb-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium min-w-0">
              <CalendarOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>{onLeaveWorkers.length} {onLeaveWorkers.length === 1 ? 'craftsman' : 'craftsmen'} on leave:</strong>{' '}
                {onLeaveWorkers.map((w) => w.name).join(', ')}
              </span>
            </div>
            <Link to="/workers" className="text-amber-700 dark:text-amber-400 font-bold hover:underline shrink-0 text-[11px]">
              Manage in Workers →
            </Link>
          </div>
        )}

        {workers.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {allActiveWorkers.length > 0 && onLeaveWorkers.length === allActiveWorkers.length
                ? 'All active craftsmen are marked on leave.'
                : t('thekedarDash.noWorkers', 'No active workers yet.')}
            </p>
            {allActiveWorkers.length === 0 && (
              <Button className="mt-3" icon={UserPlus} onClick={() => setAddWorkerModalOpen(true)}>
                {t('thekedarDash.addWorker', 'Add Worker')}
              </Button>
            )}
          </div>
        ) : (
          <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
            {workers.map((w) => {
              const locked = w.today?.isPayrollProcessed;
              const saving = savingWorkerId === w.userId;
              return (
                <li key={w.userId} className="px-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        <span className="truncate">{w.name}</span>
                        {w.today && !locked && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Marked" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                        <span className="font-mono">{w.workerCode}</span>
                        <span>·</span>
                        <span>{inr(w.defaultDailyWage)}/shift</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{w.trade || (Array.isArray(w.skills) && w.skills[0]) || 'Mistry'}</span>
                        {w.today && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{isToday ? t('thekedarDash.earnedToday', 'today') : 'earned'} {inr(w.today.calculatedEarnings)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {locked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0">
                        <Lock className="h-3.5 w-3.5" /> {t('thekedarDash.paidLocked', 'Paid')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-7 gap-1 sm:gap-1.5" role="radiogroup" aria-label={`Attendance for ${w.name}`}>
                    {QUICK_CODES.map(({ code, label, title }) => {
                      const active = w.today?.code === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          title={title}
                          disabled={saving || locked}
                          onClick={() => handleMark(w, code)}
                          className={`min-h-[42px] px-0.5 sm:px-1 truncate rounded-xl border text-[10px] sm:text-xs font-black transition active:scale-95 disabled:opacity-60 cursor-pointer ${
                            active
                              ? code === 'ABSENT'
                                ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                                : 'border-amber-600 bg-amber-600 text-white shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-700'
                          }`}
                        >
                          {saving && !active ? '·' : label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      </div>


      {/* Modal: Add New Craftsman / Worker (Managed Record) */}
      <Modal
        isOpen={addWorkerModalOpen}
        onClose={() => setAddWorkerModalOpen(false)}
        title="Add New Craftsman to Workforce"
      >
        <form onSubmit={handleAddWorker} className="space-y-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
            Workers are managed business entities under your supervisory contract. A unique Worker ID will be automatically generated.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              placeholder="Craftsman name"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                placeholder="10-digit number"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Trade / Skill
              </label>
              <select
                value={newWorkerTrade}
                onChange={(e) => setNewWorkerTrade(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="Mistry">Mistry</option>
                <option value="Helper">Helper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Daily Earning Rate (₹/shift) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={newWorkerWage}
              onChange={(e) => setNewWorkerWage(e.target.value)}
              placeholder="Custom rate e.g. 750"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setAddWorkerModalOpen(false)} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={addWorkerSubmitting} className="w-full sm:w-auto justify-center min-h-[42px]">
              {addWorkerSubmitting ? 'Registering...' : 'Add Worker to Roster'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
