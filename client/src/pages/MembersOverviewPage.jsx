import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { MembersOverviewSkeleton } from '../components/common/Skeleton';
import {
  Users,
  UserCheck2,
  HardHat,
  Shield,
  Eye,
  Search,
  Filter,
  Activity,
  CheckCircle2,
  User,
} from 'lucide-react';

export const MembersOverviewPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('THEKEDAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [loadError, setLoadError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const res = await api.get('/reports/members-overview');
      const overviewData = res?.data?.summary
        ? res.data
        : res?.data?.data
        ? res.data.data
        : res?.summary
        ? res
        : res?.data;
      setData(overviewData);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleThekedarStatus = async (member) => {
    if (member.role !== 'THEKEDAR') return;
    const newStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmed = window.confirm(
      newStatus === 'ACTIVE'
        ? `Are you sure you want to ACTIVATE the account for Thekedar "${member.name}"?`
        : `Are you sure you want to DEACTIVATE / SUSPEND the account for Thekedar "${member.name}"? Active sessions will be terminated immediately.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(member._id);
      await api.patch(`/users/thekedars/${member._id}/status`, { status: newStatus });
      await fetchOverview();
    } catch (err) {
      alert(err.message || 'Failed to update Thekedar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const summary = data?.summary || {
    totalMembers: 0,
    totalThekedars: 0,
    activeThekedars: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalOwners: 0,
    activeOwners: 0,
    totalVisits: 0,
    todayVisits: 0,
    visitsByRole: { WORKER: 0, THEKEDAR: 0, OWNER: 0 },
  };

  const members = data?.members || [];
  const recentVisits = data?.recentVisits || [];

  const filteredMembers = members.filter((m) => {
    const matchesRole = selectedRole === 'ALL' || m.role === selectedRole;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.workerCode?.toLowerCase().includes(q) ||
      m.assignedThekedar?.name?.toLowerCase().includes(q);

    return matchesRole && matchesStatus && matchesSearch;
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
    if (!dateStr) return 'Never logged in';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <LoadError message={loadError} onRetry={fetchOverview} />
      <PageHeader
        title={t('members.pageTitle', 'Members')}
        subtitle={t('members.pageSub', 'Everyone registered in the app, by role, with sign-in activity')}
      />

      {/* KPI Cards Grid: Whole Members & Visits Breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Total Members */}
        <Card className="border-purple-200 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/20 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">{t('members.allMembers', 'Total Members')}</span>
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-950 dark:text-purple-100 mt-2">{summary.totalMembers}</div>
          <div className="text-[11px] text-purple-800 dark:text-purple-400 font-semibold mt-1">
            {t('members.registeredPlatform', 'Registered on Platform')}
          </div>
        </Card>

        {/* Total Thekedars */}
        <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">{t('members.thekedarsCount', 'Thekedars')}</span>
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <HardHat className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-950 dark:text-amber-100 mt-2">{summary.totalThekedars}</div>
          <div className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {summary.activeThekedars} {t('thekedars.activeContractors', 'Active Contractors')}
          </div>
        </Card>

        {/* Total Workers */}
        <Card className="border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">{t('members.workersCount', 'Workers')}</span>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300">
              <UserCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-950 dark:text-blue-100 mt-2">{summary.totalWorkers}</div>
          <div className="text-[11px] text-blue-800 dark:text-blue-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {summary.activeWorkers} {t('worker.activeCraftsmen', 'Active Craftsmen')}
          </div>
        </Card>

        {/* Total Owners */}
        <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">{t('members.ownersCount', 'Administrators')}</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-2">{summary.totalOwners}</div>
          <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold mt-1">
            {t('members.executiveOwners', 'Executive Owner Accounts')}
          </div>
        </Card>

        {/* Total Visits to Application */}
        <Card className="col-span-2 lg:col-span-1 border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/30 dark:to-blue-950/20 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">{t('members.totalVisits', 'Total App Visits')}</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-950 dark:text-indigo-100 mt-2">{summary.totalVisits.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-indigo-800 dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {summary.todayVisits} {t('members.todayVisits', 'Visits Today')}
          </div>
        </Card>
      </div>

      {/* Role-wise Visit Breakdown Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {t('members.visitsDistribution', 'Application Visits Distribution by Member Role')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('members.sessionsBreakdown', 'Breakdown of total system sessions and login activity across workforce ranks.')}</p>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {t('members.totalSessions', 'Total Sessions')}: {summary.totalVisits}
          </span>
        </div>

        {/* Workers cannot sign in, so only Thekedar and Owner sessions are counted */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 p-3 sm:p-3.5 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-amber-900 dark:text-amber-300 truncate">{t('members.thekedarsCount', 'Thekedar')} {t('members.visits', 'Visits')}</span>
              <span className="text-[11px] sm:text-xs font-black text-amber-800 dark:text-amber-400 shrink-0">
                {summary.totalVisits ? Math.round(((summary.visitsByRole?.THEKEDAR || 0) / summary.totalVisits) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100 mt-1 truncate">
              {(summary.visitsByRole?.THEKEDAR || 0).toLocaleString('en-IN')}
            </div>
            <div className="w-full bg-amber-200 dark:bg-amber-900/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full"
                style={{
                  width: `${summary.totalVisits ? Math.min(100, ((summary.visitsByRole?.THEKEDAR || 0) / summary.totalVisits) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/30 p-3 sm:p-3.5 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-purple-900 dark:text-purple-300 truncate">{t('members.ownersCount', 'Owner')} {t('members.visits', 'Visits')}</span>
              <span className="text-[11px] sm:text-xs font-black text-purple-800 dark:text-purple-400 shrink-0">
                {summary.totalVisits ? Math.round(((summary.visitsByRole?.OWNER || 0) / summary.totalVisits) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-100 mt-1 truncate">
              {(summary.visitsByRole?.OWNER || 0).toLocaleString('en-IN')}
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full"
                style={{
                  width: `${summary.totalVisits ? Math.min(100, ((summary.visitsByRole?.OWNER || 0) / summary.totalVisits) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Members Directory */}
      <Card
        title={t('members.allMembers', 'Whole Application Members Directory')}
        subtitle={`${t('members.allMembers', 'Complete listing of all')} ${members.length} registered system users`}
      >
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('members.searchPlaceholder', 'Search by name, email, phone, or worker code...')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-4 py-2 text-base sm:text-xs focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>

          {/* Role Filter Pills & Status Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
              {[
                { id: 'ALL', label: `${t('common.all', 'All')} (${summary.totalMembers})` },
                { id: 'THEKEDAR', label: `${t('members.thekedarsCount', 'Contractors / Thekedars')} (${summary.totalThekedars})` },
                { id: 'WORKER', label: `${t('members.workersCount', 'Workers & Craftsmen')} (${summary.totalWorkers})` },
                { id: 'OWNER', label: `${t('members.ownersCount', 'Admin & Owners')} (${summary.totalOwners})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRole(tab.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedRole === tab.id
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">{t('members.status', 'Status:')}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">{t('common.active', 'Active Only')}</option>
                <option value="SUSPENDED">{t('members.suspendedAccount', 'Suspended Only')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <MembersOverviewSkeleton />
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">No members match your search or filter.</p>
            <Button size="xs" variant="secondary" onClick={() => { setSearchQuery(''); setSelectedRole('ALL'); setStatusFilter('ALL'); }} className="mt-3">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div>
            {/* Mobile / Tablet Cards View: Single View, Zero Side Scroll */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-4 space-y-3">
              {filteredMembers.map((m) => (
                <div key={m._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                          m.role === 'OWNER'
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : m.role === 'THEKEDAR'
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{m.name}</span>
                          {m.workerCode && (
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                              {m.workerCode}
                            </span>
                          )}
                          {m.role === 'WORKER' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ₹{m.defaultDailyWage || 750}/shift
                            </span>
                          )}
                        </div>
                        {m.email && <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.email}</div>}
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
                      {m.role === 'OWNER' ? 'Owner' : m.role === 'THEKEDAR' ? 'Thekedar' : 'Worker'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg gap-2">
                    <div>Phone: <strong className="text-slate-800 dark:text-slate-200">{m.phone || 'N/A'}</strong></div>
                    {m.role === 'WORKER' ? (
                      <span className="text-slate-400 text-[11px] font-medium">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 dark:text-indigo-400">
                        <Eye className="h-3 w-3" /> {m.visitCount || 0} visits
                      </span>
                    )}
                  </div>

                  {m.role === 'WORKER' && m.assignedThekedar && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Thekedar: <strong className="text-slate-800 dark:text-slate-200">{m.assignedThekedar.name}</strong> ({m.assignedThekedar.phone})
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <span className="text-[11px] text-slate-500">
                      Active: {m.role === 'WORKER' ? '—' : formatDateTime(m.lastLoginAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {m.status}
                      </Badge>
                      {m.role === 'THEKEDAR' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === m._id}
                          onClick={() => handleToggleThekedarStatus(m)}
                          className={`min-h-[1.75rem] px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-50 active:scale-95 ${
                            m.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {actionLoadingId === m._id ? '...' : m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t('profile.accountDetails', 'Member Details')}</th>
                  <th className="px-4 py-3">{t('profile.role', 'Role')}</th>
                  <th className="px-4 py-3">{t('members.thekedarCol', 'Thekedar')}</th>
                  <th className="px-4 py-3">{t('profile.phone', 'Contact')}</th>
                  <th className="px-4 py-3 text-center">{t('members.totalVisits', 'App Visits')}</th>
                  <th className="px-4 py-3">{t('members.lastVisit', 'Last Active')}</th>
                  <th className="px-4 py-3 text-right">{t('common.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredMembers.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                    {/* Member Details */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                            m.role === 'OWNER'
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : m.role === 'THEKEDAR'
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{m.name}</span>
                            {m.workerCode && (
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                                {m.workerCode}
                              </span>
                            )}
                            {m.role === 'WORKER' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ₹{m.defaultDailyWage || 750}/shift
                              </span>
                            )}
                          </div>
                          {m.email && <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.email}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
                        {m.role === 'OWNER' ? 'Owner / Admin' : m.role === 'THEKEDAR' ? 'Thekedar (Contractor)' : 'Worker (Craftsman)'}
                      </Badge>
                    </td>

                    {/* Assigned Thekedar */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {m.role === 'WORKER' ? (
                        m.assignedThekedar ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 dark:text-white block">{m.assignedThekedar.name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{m.assignedThekedar.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">— (Self Managed)</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="text-slate-800 dark:text-slate-200 font-mono text-xs">{m.phone}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Joined: {new Date(m.createdAt).toLocaleDateString()}</div>
                    </td>

                    {/* App Visits */}
                    <td className="px-4 py-3 text-center">
                      {m.role === 'WORKER' ? (
                        <span className="text-slate-400 text-xs font-medium">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-xs font-black text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          {m.visitCount || 0}
                        </span>
                      )}
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">
                      {m.role === 'WORKER' ? (
                        <span className="text-slate-400 text-xs font-medium">—</span>
                      ) : (
                        formatDateTime(m.lastLoginAt)
                      )}
                    </td>

                    {/* Status & Management */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant={m.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                          {m.status}
                        </Badge>
                        {m.role === 'THEKEDAR' ? (
                          <button
                            type="button"
                            disabled={actionLoadingId === m._id}
                            onClick={() => handleToggleThekedarStatus(m)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                              m.status === 'ACTIVE'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            }`}
                            title={m.status === 'ACTIVE' ? 'Deactivate Thekedar' : 'Activate Thekedar'}
                          >
                            {actionLoadingId === m._id ? '...' : m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : m.role === 'WORKER' ? (
                          <span className="text-[10px] text-slate-400 italic">Managed by Thekedar</span>
                        ) : (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>

      {/* Live Application Visits Log */}
      <Card
        title="Live System Visits & Login Stream"
        subtitle="Chronological audit stream of members visiting and authenticating into the application"
      >
        {recentVisits.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-4">No recent visits recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {recentVisits.map((v) => (
              <div
                key={v._id}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{v.actorName || 'User'}</span>
                      <Badge variant={getRoleBadgeVariant(v.actorRole)} size="sm">
                        {v.actorRole}
                      </Badge>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">• {v.action}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Session recorded from IP: {v.ipAddress || '127.0.0.1'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">{new Date(v.createdAt).toLocaleTimeString()}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
