import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
import { downloadPdf } from '../utils/download';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  HardHat,
  Users,
  FolderKanban,
  IndianRupee,
  FileText,
  Activity,
  Database,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const TXN_LABELS = {
  SALARY_PAYMENT: 'Earnings payment',
  ADVANCE_DISBURSEMENT: 'Advance given',
  ADVANCE_RECOVERY: 'Advance recovered',
  REFUND_OR_REVERSAL: 'Reversal',
};

// "WORKER_NET_PAYMENT_PROCESSED" -> "Worker net payment processed"
const humanize = (code = '') => code.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const timeAgo = (date) => {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const StatTile = ({ to, icon: Icon, label, value, sub }) => (
  <Link
    to={to}
    className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-sm active:scale-[0.98] transition hover:border-purple-300 dark:hover:border-purple-700 min-w-0"
  >
    <div className="flex items-center justify-between">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700 dark:text-purple-400 shrink-0" />
      <ArrowUpRight className="h-3 w-3 text-slate-300 dark:text-slate-600 sm:hidden" />
    </div>
    <div className="mt-1.5 sm:mt-2 min-w-0">
      <span className="block text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">{value}</span>
      <span className="block text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{label}</span>
      {sub ? (
        <span className="block text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub}</span>
      ) : (
        <span className="block text-[10px] sm:text-[11px] text-transparent select-none sm:hidden">—</span>
      )}
    </div>
  </Link>
);

export const OwnerDashboard = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [dbHealth, setDbHealth] = useState(null);
  const [dbChecking, setDbChecking] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoadError(null);
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDbHealth = async () => {
    setDbChecking(true);
    try {
      const res = await api.get('/system/db-health');
      setDbHealth(res?.data || res);
    } catch {
      setDbHealth({ isConnected: false });
    } finally {
      setDbChecking(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchDbHealth();
    const interval = setInterval(fetchDbHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  const m = data?.metrics || {};
  const thekedars = [...(data?.thekedars || [])].sort((a, b) => b.workers - a.workers || a.name.localeCompare(b.name));
  const transactions = data?.recentTransactions || [];
  const audits = data?.recentAudits || [];
  const dbOk = dbHealth?.isConnected;

  return (
    <div className="space-y-5">
      <LoadError message={loadError} onRetry={fetchDashboard} />

      {/* Header + database status */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4 sm:p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <span className="inline-block rounded-md bg-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
              {t('profile.ownerDesc', 'Executive Business Owner')}
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-black">{t('ownerDashboard.overviewTitle', 'Business Overview')}</h2>
            <p className="text-xs text-purple-200/80">
              {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchDbHealth}
              aria-label="Check database connection"
              className={`inline-flex min-h-8 sm:min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] font-bold border transition ${
                dbHealth === null
                  ? 'border-white/20 text-white/70'
                  : dbOk
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-400/50 bg-rose-500/20 text-rose-100'
              }`}
            >
              {dbChecking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {dbHealth === null ? 'Checking…' : dbOk ? `Online${dbHealth.latencyMs != null ? ` · ${dbHealth.latencyMs}ms` : ''}` : 'Database offline'}
            </button>
          </div>
        </div>

        {/* Money owed across all Thekedars */}
        <div className="mt-4 rounded-2xl bg-white/10 p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-200">{t('ownerDashboard.netPayable', 'Net payable to workers')}</div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight">{inr(m.netPayable)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="min-w-0">
              <div className="text-[11px] text-purple-200/80 truncate">{t('ownerDashboard.unpaidWages', 'Unpaid earnings')}</div>
              <div className="font-bold text-sm sm:text-base truncate">{inr(m.unpaidWages)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-purple-200/80 truncate">{t('ownerDashboard.advancesOut', 'Advances outstanding')}</div>
              <div className="font-bold text-rose-200 text-sm sm:text-base truncate">− {inr(m.outstandingAdvances)}</div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2.5 sm:pt-3 text-[11px] text-purple-200/90 leading-relaxed">
            {t('ownerDashboard.thisMonth', 'This month')}: {inr(m.paidThisMonth)} {t('ownerDashboard.paid', 'paid')} · {inr(m.advancesThisMonth)} {t('ownerDashboard.advanced', 'given as advance')}
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatTile to="/thekedars" icon={HardHat} label={t('navShort.thekedars', 'Thekedars')} value={m.totalThekedars || 0} sub={`${m.activeThekedars || 0} active`} />
        <StatTile to="/members" icon={Users} label={t('navShort.workers', 'Workers')} value={m.totalWorkers || 0} sub={`${m.activeWorkers || 0} active`} />
        <StatTile to="/projects" icon={FolderKanban} label={t('navShort.projects', 'Projects')} value={m.totalProjects || 0} sub={`${m.activeProjects || 0} active`} />
      </div>

      {/* Per-Thekedar money */}
      <Card
        title={t('ownerDashboard.byThekedar', 'By Thekedar')}
        subtitle={t('ownerDashboard.byThekedarSub', 'Workers, open projects and what each Thekedar owes')}
        action={
          <Link to="/thekedars" className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline">
            {t('ownerDashboard.viewAll', 'View all')} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {thekedars.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t('ownerDashboard.noThekedars', 'No Thekedars registered yet.')}</p>
        ) : (
          <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
            {thekedars.map((th) => (
              <li key={th._id} className="flex items-center gap-2.5 sm:gap-3 px-1 py-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-xs sm:text-sm">
                  {th.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{th.name}</span>
                    {th.status !== 'ACTIVE' && <Badge variant="danger" size="sm">{th.status}</Badge>}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {th.workers} {t('navShort.workers', 'workers')} · {th.activeProjects} {t('ownerDashboard.openProjects', 'open projects')}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{inr(th.netPayable)}</div>
                  {th.outstandingAdvances > 0 && <div className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400">adv {inr(th.outstandingAdvances)}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent payments & advances */}
        <Card title={t('ownerDashboard.recentMoney', 'Recent payments & advances')}>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">{t('transactionSearch.noFound', 'No transactions recorded yet.')}</p>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 4).map((tx) => {
                const isAdvance = tx.category === 'ADVANCE_DISBURSEMENT';
                return (
                  <li key={tx._id} className="flex items-center gap-2.5 sm:gap-3 px-1 py-3">
                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl ${isAdvance ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'}`}>
                      <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="truncate max-w-[120px] sm:max-w-none">{tx.workerId?.name || 'Worker'}</span>
                        {tx.workerWage ? (
                          <span className="inline-flex shrink-0 items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ₹{tx.workerWage}/day
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {TXN_LABELS[tx.category] || humanize(tx.category)} · {tx.thekedarId?.name || '—'} · {timeAgo(tx.transactionDate)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`text-xs sm:text-sm font-black ${isAdvance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{inr(tx.amount)}</span>
                      <button
                        type="button"
                        onClick={() => downloadPdf(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, `Bill_${tx.transactionId || tx._id}.pdf`)}
                        aria-label={`Download bill ${tx.transactionId}`}
                        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer shrink-0"
                      >
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card
          title={t('ownerDashboard.recentActivity', 'Recent activity')}
          action={
            <Link to="/audit" className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline">
              {t('ownerDashboard.auditLog', 'Audit log')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {audits.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">{t('audit.noAudits', 'No activity yet.')}</p>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
              {audits.map((log) => (
                <li key={log._id} className="flex items-start gap-2.5 sm:gap-3 px-1 py-3">
                  <Activity className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">{humanize(log.action)}</div>
                    <div className="truncate text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      {log.actorName || 'System'} · {timeAgo(log.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
