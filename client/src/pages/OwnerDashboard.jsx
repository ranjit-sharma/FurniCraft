import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  ShieldAlert,
  Building2,
  Users,
  IndianRupee,
  Download,
  FileSpreadsheet,
  FileText,
  Activity,
  CheckCircle,
  CheckCircle2,
  Eye,
  Search,
  HardHat,
  Shield,
  ArrowUpRight,
  Database,
  Server,
  RefreshCw,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';

export const OwnerDashboard = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');
  const [memberSearch, setMemberSearch] = useState('');

  // Database Connection & Infrastructure Health State
  const [dbHealth, setDbHealth] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const fetchDbHealth = async () => {
    try {
      setDbLoading(true);
      const res = await api.get('/system/db-health');
      const healthData = res?.data || res;
      if (healthData && typeof healthData === 'object' && healthData.status) {
        setDbHealth(healthData);
        setDbError(null);
      } else {
        setDbHealth(healthData);
      }
    } catch (err) {
      setDbError(err.message || 'Failed to ping database');
      setDbHealth((prev) => prev ? { ...prev, isConnected: false, status: 'Disconnected' } : { isConnected: false, status: 'Disconnected' });
    } finally {
      setDbLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchDbHealth();
    const interval = setInterval(fetchDbHealth, 30000); // 30s background health ping
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentAudits = data?.recentAudits || [];
  const recentTransactions = data?.recentTransactions || [];
  const allMembers = data?.allMembers || [];
  const recentVisits = data?.recentVisits || [];

  const filteredMembers = allMembers.filter((m) => {
    const matchesRole = memberRoleFilter === 'ALL' || m.role === memberRoleFilter;
    const q = memberSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.workerCode?.toLowerCase().includes(q) ||
      m.assignedThekedar?.name?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'OWNER':
        return 'primary';
      case 'THEKEDAR':
        return 'warning';
      case 'WORKER':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xl shadow-inner">
            <i className="fa-solid fa-user"></i>
          </div>
          <div>
            <span className="inline-block rounded-md bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
              {t('profile.ownerDesc') || 'Executive Owner & Admin View'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">{t('ownerDashboard.executiveTitle') || 'Enterprise Operations & Governance'}</h2>
            <p className="text-xs text-purple-200/80">{t('common.tagline') || 'Organization-wide liabilities, central tool asset tracking, and audit logs.'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Link to="/members" className="w-full sm:w-auto">
            <Button
              variant="outline-purple"
              size="sm"
              icon={Users}
              className="w-full sm:w-auto justify-center"
            >
              {t('dashboard.totalWorkforce') || 'All Members'} ({metrics.totalMembers || 0})
            </Button>
          </Link>
          <Link to="/thekedars" className="w-full sm:w-auto">
            <Button
              variant="outline-purple"
              size="sm"
              icon={Users}
              className="w-full sm:w-auto justify-center"
            >
              {t('dashboard.activeContractors') || 'Thekedars'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Database Connection & Infrastructure Health Monitor (Owner Exclusive) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              dbHealth?.isConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : (dbLoading && !dbHealth
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800')
            }`}>
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Database Infrastructure Health
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  dbHealth?.isConnected
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                    : (dbLoading && !dbHealth
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700')
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    dbHealth?.isConnected
                      ? 'bg-emerald-500 animate-pulse'
                      : (dbLoading && !dbHealth ? 'bg-amber-500 animate-ping' : 'bg-rose-500')
                  }`} />
                  {dbHealth?.status || (dbLoading ? 'Checking...' : 'Disconnected')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time MongoDB connection state, query response latency, and cluster availability.
              </p>
            </div>
          </div>

          <button
            onClick={fetchDbHealth}
            disabled={dbLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
            Refresh Check
          </button>
        </div>

        {/* Disconnection Warning Alert: Only show when an actual confirmed disconnection or check error occurred */}
        {((dbHealth && !dbHealth.isConnected) || dbError) && !dbLoading && (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-900 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <strong className="font-bold">Database Disconnected / Unavailable:</strong>{' '}
              {dbHealth?.lastError || dbError || 'The database cluster is currently unreachable. Write operations will be rejected until reconnected.'}
            </div>
          </div>
        )}

        {/* Health Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-3.5 pt-1">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Database Name</span>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
              {dbHealth?.databaseName || 'furnicraft_db'}
            </div>
            <span className="text-[10px] text-slate-400">Target Database</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ping Latency</span>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {dbHealth?.latencyMs !== null && dbHealth?.latencyMs !== undefined ? `${dbHealth.latencyMs} ms` : 'N/A'}
            </div>
            <span className="text-[10px] text-slate-400">Round-trip response time</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Connection Uptime</span>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              {formatUptime(dbHealth?.uptimeSeconds)}
            </div>
            <span className="text-[10px] text-slate-400">Since last connect</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Availability</span>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {dbHealth?.availability || 'Operational'}
            </div>
            <span className="text-[10px] text-slate-400 truncate block">
              Checked: {dbHealth?.lastCheck ? new Date(dbHealth.lastCheck).toLocaleTimeString('en-IN') : 'Just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Total App Visits */}
        <Card className="col-span-2 sm:col-span-1 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/40 dark:to-purple-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">{t('ownerDashboard.appVisits') || 'App Visits'}</span>
            <Activity className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-950 dark:text-indigo-100 mt-2">
            {(metrics.totalVisits || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-indigo-800 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {metrics.todayVisits || 0} {t('ownerDashboard.today') || t('calendar.today') || 'today'}
          </span>
        </Card>

        {/* Workforce & Members */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">{t('dashboard.totalWorkforce') || 'Total Members'}</span>
            <Users className="h-4 w-4 text-blue-700 dark:text-blue-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-100 mt-2">{metrics.totalMembers || 0}</div>
          <span className="text-[11px] text-blue-800 dark:text-blue-400 font-semibold mt-1 block truncate">
            {metrics.totalThekedars || 0} {t('ownerDashboard.thekedarsFilter') || 'Thekedars'} • {metrics.totalWorkers || 0} {t('ownerDashboard.workersFilter') || 'Workers'}
          </span>
        </Card>

        {/* Total Projects */}
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">{t('dashboard.systemProjects') || 'Total Projects'}</span>
            <Building2 className="h-4 w-4 text-purple-700 dark:text-purple-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950 dark:text-purple-100 mt-2">{metrics.totalProjects || 0}</div>
          <span className="text-[11px] text-purple-800 dark:text-purple-400 font-semibold mt-1 block">
            {metrics.activeProjects || 0} {t('projects.active') || 'active'}
          </span>
        </Card>

        {/* Financial Liabilities */}
        <Card className="border-rose-200 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">{t('dashboard.financialTurnover') || 'Liabilities'}</span>
            <IndianRupee className="h-4 w-4 text-rose-700 dark:text-rose-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-100 mt-2">₹{metrics.totalLiabilities?.toLocaleString('en-IN') || 0}</div>
          <span className="text-[11px] text-rose-800 dark:text-rose-400 font-semibold mt-1 block truncate">
            {t('dashboard.approvedWages')}: ₹{metrics.totalSalaryLiability?.toLocaleString('en-IN')} | Adv: ₹{metrics.totalAdvanceLiability?.toLocaleString('en-IN')}
          </span>
        </Card>
      </div>

      {/* Section: Whole Application Members & Platform Usage */}
      <Card
        title={t('ownerDashboard.wholeMembersTitle') || 'Whole Application Members & Platform Activity'}
        subtitle={t('ownerDashboard.wholeMembersSubtitle') || `Audit of all ${allMembers.length} registered members, role counts (${metrics.totalThekedars || 0} Thekedars, ${metrics.totalWorkers || 0} Workers, ${metrics.totalOwners || 0} Owners), and total system visits (${(metrics.totalVisits || 0).toLocaleString('en-IN')})`}
        action={
          <Link to="/members">
            <Button size="xs" variant="outline-purple" icon={ArrowUpRight}>
              {t('ownerDashboard.openDirectory') || 'Open Full Directory & Analytics'}
            </Button>
          </Link>
        }
      >
        {/* Search & Role Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={t('ownerDashboard.searchMembersPlaceholder') || 'Filter members by name, email, or worker code...'}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-8 pr-3 py-1.5 text-xs focus:border-purple-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `${t('ownerDashboard.allFilter') || 'All'} (${metrics.totalMembers || 0})` },
              { id: 'THEKEDAR', label: `${t('ownerDashboard.thekedarsFilter') || 'Thekedars'} (${metrics.totalThekedars || 0})` },
              { id: 'WORKER', label: `${t('ownerDashboard.workersFilter') || 'Workers'} (${metrics.totalWorkers || 0})` },
              { id: 'OWNER', label: `${t('ownerDashboard.ownersFilter') || 'Owners'} (${metrics.totalOwners || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMemberRoleFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  memberRoleFilter === tab.id
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member Table */}
        {filteredMembers.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4 text-center">{t('ownerDashboard.noMembersMatch') || 'No members found matching your search.'}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5">{t('ownerDashboard.tableMember') || 'Member'}</th>
                  <th className="px-3.5 py-2.5">{t('ownerDashboard.tableRole') || 'Role'}</th>
                  <th className="px-3.5 py-2.5">{t('ownerDashboard.tableThekedar') || 'Assigned Thekedar'}</th>
                  <th className="px-3.5 py-2.5">{t('ownerDashboard.tablePhone') || 'Phone'}</th>
                  <th className="px-3.5 py-2.5 text-center">{t('ownerDashboard.tableAppVisits') || 'App Visits'}</th>
                  <th className="px-3.5 py-2.5">{t('ownerDashboard.tableLastActive') || 'Last Active'}</th>
                  <th className="px-3.5 py-2.5 text-right">{t('ownerDashboard.tableStatus') || 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredMembers.slice(0, 8).map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-black text-[11px] ${
                            m.role === 'OWNER'
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300'
                              : m.role === 'THEKEDAR'
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300'
                          }`}
                        >
                          {m.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[140px] sm:max-w-[200px]">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[140px] sm:max-w-[200px]">
                            {m.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
                        {m.role === 'OWNER' ? 'Owner' : m.role === 'THEKEDAR' ? 'Thekedar' : 'Worker'}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                      {m.role === 'WORKER' ? (
                        m.assignedThekedar ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{m.assignedThekedar.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300">{m.phone}</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-black text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        {m.visitCount || 0}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">{formatDateTime(m.lastLoginAt)}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {m.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredMembers.length > 8 && (
          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>{(t('ownerDashboard.showingMembers') || 'Showing top 8 of {count} filtered members').replace('{count}', filteredMembers.length)}</span>
            <Link to="/members" className="font-bold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 inline-flex items-center gap-1">
              {(t('ownerDashboard.viewAllMembers') || 'View all {count} members & full details').replace('{count}', allMembers.length)} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </Card>

      {/* Grid: Audit Logs Feed & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Real-time System Audit Trail */}
        <Card
          title={t('audit.title') || 'Append-Only Audit Log Stream'}
          subtitle={t('audit.subtitle') || 'All security, wage, payroll finalization, and attendance events'}
        >
          {recentAudits.length === 0 ? (
            <p className="text-xs text-slate-700 dark:text-slate-400 py-4 italic">{t('audit.noAudits') || 'No audit records found.'}</p>
          ) : (
            <div className="space-y-3">
              {recentAudits.map((log) => (
                <div key={log._id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-400 mt-0.5 truncate">
                      By <span className="font-semibold text-slate-800 dark:text-slate-200">{log.actorName}</span> ({log.actorRole}) • Target: {log.targetType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Financial Transactions */}
        <Card
          title={t('transactionSearch.title') || 'Recent Financial Transactions'}
          subtitle={t('transactionSearch.subtitle') || 'Real disbursements, payroll allocations, and recoveries'}
        >
          {recentTransactions.length === 0 ? (
            <p className="text-xs text-slate-700 dark:text-slate-400 py-4 italic">{t('transactionSearch.noFound') || 'No transactions recorded.'}</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{tx.transactionId}</span>
                    <p className="text-slate-700 dark:text-slate-400">{tx.category.replace('_', ' ')} • {tx.paymentMethod}</p>
                    <span className="text-[11px] text-slate-700 dark:text-slate-400">{t('thekedarDashboard.tableWorker') || 'Worker'}: {tx.workerId?.name || 'N/A'}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-slate-950 dark:text-slate-100">₹{tx.amount.toLocaleString('en-IN')}</div>
                    <span className="text-[10px] text-slate-700 dark:text-slate-400">{new Date(tx.transactionDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
