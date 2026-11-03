import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
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
  SALARY_PAYMENT: 'Wage payment',
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
    className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm active:scale-[0.98] transition"
  >
    <Icon className="h-5 w-5 text-purple-700 dark:text-purple-400" />
    <span className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</span>
    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    {sub && <span className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</span>}
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-md bg-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-200">
              {t('profile.ownerDesc', 'Executive Business Owner')}
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-black">{t('ownerDashboard.overviewTitle', 'Business Overview')}</h2>
            <p className="text-xs text-purple-200/80">
              {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDbHealth}
            aria-label="Check database connection"
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold border ${
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

        {/* Money owed across all Thekedars */}
        <div className="mt-4 rounded-2xl bg-white/10 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-200">{t('ownerDashboard.netPayable', 'Net payable to workers')}</div>
          <div className="text-3xl font-black">{inr(m.netPayable)}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-purple-200/80">{t('ownerDashboard.unpaidWages', 'Unpaid wages')}</div>
              <div className="font-bold">{inr(m.unpaidWages)}</div>
            </div>
            <div>
              <div className="text-[11px] text-purple-200/80">{t('ownerDashboard.advancesOut', 'Advances outstanding')}</div>
              <div className="font-bold text-rose-200">− {inr(m.outstandingAdvances)}</div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 text-[11px] text-purple-200/90">
            {t('ownerDashboard.thisMonth', 'This month')}: {inr(m.paidThisMonth)} {t('ownerDashboard.paid', 'paid')} · {inr(m.advancesThisMonth)} {t('ownerDashboard.advanced', 'given as advance')}
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatTile to="/thekedars" icon={HardHat} label={t('navShort.thekedars', 'Thekedars')} value={m.totalThekedars || 0} sub={`${m.activeThekedars || 0} active`} />
        <StatTile to="/members" icon={Users} label={t('navShort.workers', 'Workers')} value={m.totalWorkers || 0} />
        <StatTile to="/projects" icon={FolderKanban} label={t('navShort.projects', 'Projects')} value={m.totalProjects || 0} sub={`${m.activeProjects || 0} active`} />
      </div>

      {/* Per-Thekedar money */}
      <Card
        title={t('ownerDashboard.byThekedar', 'By Thekedar')}
        subtitle={t('ownerDashboard.byThekedarSub', 'Workers, open projects and what each Thekedar owes')}
        action={
          <Link to="/thekedars" className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-400">
            {t('ownerDashboard.viewAll', 'View all')} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {thekedars.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t('ownerDashboard.noThekedars', 'No Thekedars registered yet.')}</p>
        ) : (
          <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
            {thekedars.map((th) => (
              <li key={th._id} className="flex items-center gap-3 px-1 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black">
                  {th.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{th.name}</span>
                    {th.status !== 'ACTIVE' && <Badge variant="danger" size="sm">{th.status}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {th.workers} {t('navShort.workers', 'workers')} · {th.activeProjects} {t('ownerDashboard.openProjects', 'open projects')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900 dark:text-white">{inr(th.netPayable)}</div>
                  {th.outstandingAdvances > 0 && <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">adv {inr(th.outstandingAdvances)}</div>}
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
              {transactions.map((tx) => {
                const isAdvance = tx.category === 'ADVANCE_DISBURSEMENT';
                return (
                  <li key={tx._id} className="flex items-center gap-3 px-1 py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isAdvance ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'}`}>
                      <IndianRupee className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{tx.workerId?.name || 'Worker'}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {TXN_LABELS[tx.category] || humanize(tx.category)} · {tx.thekedarId?.name || '—'} · {timeAgo(tx.transactionDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-black ${isAdvance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{inr(tx.amount)}</span>
                      <button
                        type="button"
                        onClick={() => window.open(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, '_blank')}
                        aria-label={`Download bill ${tx.transactionId}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4" />
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
            <Link to="/audit" className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-400">
              {t('ownerDashboard.auditLog', 'Audit log')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {audits.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">{t('audit.noAudits', 'No activity yet.')}</p>
          ) : (
            <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
              {audits.map((log) => (
                <li key={log._id} className="flex items-start gap-3 px-1 py-3">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{humanize(log.action)}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
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
