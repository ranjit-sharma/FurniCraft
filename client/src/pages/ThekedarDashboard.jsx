import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { localToday } from '../utils/date';
import { downloadPdf } from '../utils/download';
import {
  UserPlus,
  IndianRupee,
  FolderKanban,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  CalendarOff,
  Clock,
  AlertTriangle,
} from 'lucide-react';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Short labels so five codes fit on one row of a phone screen.
const QUICK_CODES = [
  { code: 'P', label: 'P', title: 'Full day (1.0x)' },
  { code: 'HALF', label: 'Half', title: 'Half day (0.5x)' },
  { code: 'P1/5', label: '1.5x', title: 'Till 9 PM (1.5x)' },
  { code: 'PP', label: '2x', title: 'Till midnight (2.0x)' },
  { code: 'ABSENT', label: 'Absent', title: 'Absent (no wage)' },
];

const TXN_LABELS = { SALARY_PAYMENT: 'Wage payment', ADVANCE_DISBURSEMENT: 'Advance given' };
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

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().slice(0, 10);
    if (nextStr <= localToday()) {
      setSelectedDate(nextStr);
    }
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

  const projects = data?.activeProjects || [];

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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
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
  const transactions = data?.recentTransactions || [];
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
              <div className="text-[11px] text-amber-100/80">{t('thekedarDash.unpaidWages', 'Unpaid wages')}</div>
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

      {/* Attendance Pending Alert Banner */}
      {isAttendancePending && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-100/60 dark:from-amber-950/50 dark:via-orange-950/30 dark:to-amber-900/30 p-2.5 sm:p-3 shadow-xs text-amber-950 dark:text-amber-100"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-white leading-tight">
                    {t('thekedarDash.attendanceAlertTitle', 'Attendance Action Required Today!')}
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap shrink-0">
                    {unmarkedWorkersCount} {t('thekedarDash.pending', 'Pending')}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-amber-900/80 dark:text-amber-200/90 leading-tight">
                  {t(
                    'thekedarDash.attendanceAlertDesc',
                    `You have ${unmarkedWorkersCount} craftsman/craftsmen with unrecorded attendance today (${markedTodayCount}/${workers.length} marked).`
                  )
                    .replace('{count}', unmarkedWorkersCount)
                    .replace('{marked}', markedTodayCount)
                    .replace('{total}', workers.length)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('attendance-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer shrink-0 transition self-start sm:self-center ml-10.5 sm:ml-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t('thekedarDash.markNowBtn', 'Take Attendance Now')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Attendance Completed Banner */}
      {isAttendanceComplete && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-emerald-950 dark:text-emerald-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-black text-emerald-900 dark:text-emerald-100 block">
                {t('thekedarDash.attendanceAllMarkedTitle', 'All Attendance Marked!')}
              </span>
              <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300">
                {t('thekedarDash.attendanceAllMarkedDesc', `All ${workers.length} active craftsmen have their attendance recorded for today.`).replace('{count}', workers.length)}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-2 py-0.5 text-[10px]">
            100% Done
          </span>
        </div>
      )}

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                max={localToday()}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={handleNextDay}
                disabled={isToday}
                title="Next Day"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(localToday())}
                  className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-900 transition cursor-pointer"
                >
                  Today
                </button>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        <span className="truncate">{w.name}</span>
                        {w.today && !locked && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Marked" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {w.workerCode} · {inr(w.defaultDailyWage)}/day · <span className="font-medium text-slate-700 dark:text-slate-300">{w.trade || (Array.isArray(w.skills) && w.skills[0]) || 'Mistry'}</span>
                        {w.today && <> · {isToday ? t('thekedarDash.earnedToday', 'today') : 'earned'} {inr(w.today.calculatedEarnings)}</>}
                      </div>
                    </div>
                    {locked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Lock className="h-3.5 w-3.5" /> {t('thekedarDash.paidLocked', 'Paid')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={`Attendance for ${w.name}`}>
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
                          className={`min-h-10 px-1 truncate rounded-xl border text-[11px] sm:text-xs font-black transition disabled:opacity-60 ${
                            active
                              ? code === 'ABSENT'
                                ? 'border-rose-500 bg-rose-500 text-white'
                                : 'border-amber-600 bg-amber-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Active projects */}
        <Card
          title={t('thekedarDash.projects', 'Active projects')}
          action={
            <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              {t('thekedarDash.all', 'All')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {projects.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">{t('thekedarDash.noProjects', 'No active projects.')}</p>
              <Link to="/projects" className="mt-2 inline-block text-sm font-bold text-amber-700 dark:text-amber-400">
                {t('thekedarDash.newProject', 'Create a project')}
              </Link>
            </div>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
              {projects.slice(0, 4).map((p) => (
                <li key={p._id}>
                  <Link to={`/projects/${p._id}`} className="flex items-center gap-3 px-1 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {p.projectCode} · {inr(p.totalMoneyReceived)} {t('thekedarDash.received', 'received')}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent payments & advances */}
        <Card
          title={t('thekedarDash.recentMoney', 'Recent payments & advances')}
          action={
            <Link to="/transactions/search" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              {t('thekedarDash.all', 'All')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">{t('thekedarDash.noPayments', 'No payments yet. Pay workers from the Workers tab.')}</p>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 4).map((tx) => {
                const isAdvance = tx.category === 'ADVANCE_DISBURSEMENT';
                return (
                  <li key={tx._id} className="flex items-center gap-3 px-1 py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isAdvance ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'}`}>
                      <IndianRupee className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{tx.workerId?.name || 'Worker'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {TXN_LABELS[tx.category] || tx.category} · {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span className={`text-sm font-black ${isAdvance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{inr(tx.amount)}</span>
                    <button
                      type="button"
                      onClick={() => downloadPdf(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, `Bill_${tx.transactionId || tx._id}.pdf`)}
                      aria-label={`Download bill ${tx.transactionId}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily Wage Rate (₹/day)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={newWorkerWage}
                onChange={(e) => setNewWorkerWage(e.target.value)}
                placeholder="Custom rate e.g. 754"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setAddWorkerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={addWorkerSubmitting}>
              {addWorkerSubmitting ? 'Registering...' : 'Add Worker to Roster'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
