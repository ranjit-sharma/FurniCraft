import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  FolderKanban,
  CheckCircle,
  RefreshCw,
  Trash2,
  Eye,
  User,
} from 'lucide-react';

export const ThekedarsPage = () => {
  const { t } = useLanguage();
  const [thekedars, setThekedars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [statusActionLoadingId, setStatusActionLoadingId] = useState(null);

  // Register Thekedar Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Thekedar@2026');
  const [submitting, setSubmitting] = useState(false);

  // Details Modal
  const [selectedThekedar, setSelectedThekedar] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const fetchThekedars = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/thekedars');
      setThekedars(res.data.thekedars || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load Thekedar records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThekedars();
  }, []);

  const handleRegisterThekedar = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post('/auth/register', {
        name,
        email,
        phone,
        password,
        role: 'THEKEDAR',
      });
      setMessage({ type: 'success', text: `Thekedar ${name} onboarded successfully!` });
      setRegisterModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('Thekedar@2026');
      fetchThekedars();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to onboard Thekedar' });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Thekedar account status (Activate vs Deactivate / Suspend)
  const handleToggleStatus = async (thekedar, e) => {
    if (e) e.stopPropagation();
    const newStatus = thekedar.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionVerb = newStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE / SUSPEND';

    const confirmed = window.confirm(
      newStatus === 'ACTIVE'
        ? `Are you sure you want to ACTIVATE the account for Thekedar "${thekedar.name}"?\n\nThey will regain full access to their contractor dashboard, attendance, and worker management.`
        : `Are you sure you want to DEACTIVATE / SUSPEND the account for Thekedar "${thekedar.name}"?\n\nTheir active sessions will be terminated immediately and they will be blocked from logging in.`
    );
    if (!confirmed) return;

    try {
      setStatusActionLoadingId(thekedar._id);
      setMessage(null);
      await api.patch(`/users/thekedars/${thekedar._id}/status`, { status: newStatus });
      
      setMessage({
        type: 'success',
        text: `Thekedar "${thekedar.name}" has been ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated/suspended'} successfully.`,
      });

      // Update state locally
      setThekedars((prev) =>
        prev.map((th) => (th._id === thekedar._id ? { ...th, status: newStatus } : th))
      );
      if (selectedThekedar && selectedThekedar._id === thekedar._id) {
        setSelectedThekedar((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || `Failed to update status for Thekedar "${thekedar.name}".`,
      });
    } finally {
      setStatusActionLoadingId(null);
    }
  };

  // Permanently delete Thekedar account (only when 0 projects and 0 workers)
  const handleDeleteThekedar = async (thekedar, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to permanently DELETE the account for Thekedar "${thekedar.name}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setStatusActionLoadingId(thekedar._id);
      setMessage(null);
      await api.delete(`/users/thekedars/${thekedar._id}`);
      setMessage({
        type: 'success',
        text: `Thekedar account for "${thekedar.name}" deleted successfully.`,
      });
      setThekedars((prev) => prev.filter((t) => t._id !== thekedar._id));
      if (selectedThekedar && selectedThekedar._id === thekedar._id) {
        setDetailsModalOpen(false);
        setSelectedThekedar(null);
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || `Failed to delete Thekedar account.`,
      });
    } finally {
      setStatusActionLoadingId(null);
    }
  };

  const totalThekedars = thekedars.length;
  const activeThekedars = thekedars.filter((t) => t.status === 'ACTIVE').length;
  const suspendedThekedars = thekedars.filter((t) => t.status === 'SUSPENDED').length;
  const totalProjectsManaged = thekedars.reduce((sum, t) => sum + (t.totalProjects || 0), 0);
  const totalWorkersSupervised = thekedars.reduce((sum, t) => sum + (t.workerCount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('thekedars.pageTitle', 'Thekedars')}
        subtitle={t('thekedars.pageSub', 'Contractor accounts, their projects and workers')}
        actions={
          <Button onClick={() => setRegisterModalOpen(true)} icon={UserPlus}>
            {t('thekedars.onboardNew', 'Add Thekedar')}
          </Button>
        }
      />

      {/* Alerts */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
              : 'border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">{t('thekedars.totalThekedars', 'Total Thekedars')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalThekedars}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">{t('thekedars.activeContractors', 'Active Contractors')}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{activeThekedars}</p>
                {suspendedThekedars > 0 && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {t('thekedars.suspendedNotice', '({count} suspended)').replace('{count}', suspendedThekedars)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">{t('thekedars.assignedProjects', 'Assigned Projects')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalProjectsManaged}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">{t('thekedars.supervisedWorkers', 'Supervised Workers')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalWorkersSupervised}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Thekedar Records Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Contractor Accounts & Status Controls</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              As the Owner, you have exclusive control to activate or suspend Thekedar accounts.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 text-xs font-bold text-purple-900 dark:text-purple-300">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" /> Owner Authorization Enforced
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : thekedars.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">No Thekedars Registered</h3>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">Get started by onboarding the first furniture contractor.</p>
            <Button size="sm" className="mt-4" onClick={() => setRegisterModalOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Onboard Thekedar
            </Button>
          </div>
        ) : (
          <div>
            {/* Mobile / Tablet Responsive Cards: Single View, Zero Side Scroll */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-4 space-y-3">
              {thekedars.map((th) => (
                <div key={th._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3 shadow-xs">
                  {/* Top: Name, Avatar, Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 font-bold text-xs shadow-xs">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{th.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Joined: {new Date(th.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        th.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${th.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {th.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{th.email}</span>
                    </div>
                    {th.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{th.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Projects & Workforce stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-2">
                      <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">Projects</span>
                      <strong className="text-sm font-black text-slate-900 dark:text-white">{th.totalProjects || 0}</strong>
                    </div>
                    <div className="rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 p-2">
                      <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-400 block">Workforce</span>
                      <strong className="text-sm font-black text-slate-900 dark:text-white">{th.workerCount || th.workers?.length || 0} Workers</strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    {th.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        disabled={statusActionLoadingId === th._id}
                        onClick={(e) => handleToggleStatus(th, e)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer"
                      >
                        <UserX className="h-3 w-3" /> Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={statusActionLoadingId === th._id}
                        onClick={(e) => handleToggleStatus(th, e)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                      >
                        <UserCheck className="h-3 w-3" /> Activate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThekedar(th);
                        setDetailsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" /> View Scope
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(th)}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Thekedar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-5 py-3.5">Thekedar Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Assigned Projects</th>
                  <th className="px-5 py-3.5">Workforce Scope</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Account Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {thekedars.map((th) => (
                  <tr key={th._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Thekedar Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-xs shadow-xs">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{th.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Joined: {new Date(th.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                        <Mail className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{th.email}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                        <Phone className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{th.phone || 'Not provided'}</span>
                      </div>
                    </td>

                    {/* Assigned Projects */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{th.totalProjects || 0}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">projects</span>
                      </div>
                      {th.assignedProjects && th.assignedProjects.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {th.assignedProjects.slice(0, 2).map((p) => (
                            <span
                              key={p._id}
                              className="inline-block rounded bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                            >
                              {p.name}
                            </span>
                          ))}
                          {th.assignedProjects.length > 2 && (
                            <button
                              onClick={() => {
                                setSelectedThekedar(th);
                                setDetailsModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              +{th.assignedProjects.length - 2} more
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Workforce Scope with Worker Names & Phone Numbers */}
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-xs font-bold text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          <Users className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />
                          <span>{th.workerCount || th.workers?.length || 0} Workers</span>
                        </div>
                        {th.workers && th.workers.length > 0 ? (
                          <div className="space-y-1 min-w-[200px] max-w-xs">
                            {th.workers.slice(0, 3).map((w) => (
                              <div
                                key={w._id}
                                className="flex items-center justify-between gap-2 rounded-md bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700 px-2 py-1 text-xs"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-slate-900 dark:text-white truncate" title={w.name}>
                                    {w.name}
                                  </span>
                                  <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    ₹{w.defaultDailyWage || 750}/day
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium shrink-0 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500" />
                                  {w.phone}
                                </span>
                              </div>
                            ))}
                            {th.workers.length > 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThekedar(th);
                                  setDetailsModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer block mt-0.5"
                              >
                                +{th.workers.length - 3} more craftsmen
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">No workers assigned</div>
                        )}
                      </div>
                    </td>

                    {/* Account Status Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          th.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            th.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        {th.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    {/* Actions: Activate / Deactivate Toggle, View Scope, Delete */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {th.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            disabled={statusActionLoadingId === th._id}
                            onClick={(e) => handleToggleStatus(th, e)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 disabled:opacity-50 transition cursor-pointer"
                            title="Deactivate / Suspend contractor login access"
                          >
                            {statusActionLoadingId === th._id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserX className="h-3 w-3" />
                            )}
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={statusActionLoadingId === th._id}
                            onClick={(e) => handleToggleStatus(th, e)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-700 disabled:opacity-50 transition cursor-pointer"
                            title="Activate contractor login access"
                          >
                            {statusActionLoadingId === th._id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                            <span>Activate</span>
                          </button>
                        )}

                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setSelectedThekedar(th);
                            setDetailsModalOpen(true);
                          }}
                        >
                          View Scope
                        </Button>

                        {th.totalProjects === 0 && th.workerCount === 0 && (
                          <button
                            type="button"
                            disabled={statusActionLoadingId === th._id}
                            onClick={(e) => handleDeleteThekedar(th, e)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete contractor account (only available when 0 projects and 0 workers)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Onboard New Thekedar Modal */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title={t('thekedars.onboardModalTitle', 'Onboard New Furniture Thekedar')}
      >
        <form onSubmit={handleRegisterThekedar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('thekedars.fullName', 'Full Name')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Sunil Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('thekedars.emailAddress', 'Email Address')} *
            </label>
            <input
              type="email"
              required
              placeholder="thekedar@furnicraft.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('thekedars.mobileNumber', 'Phone Number')} *
            </label>
            <input
              type="text"
              required
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('thekedars.password', 'Initial Password')} *
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('thekedars.passwordNote', 'The Thekedar can change this password after logging in.')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRegisterModalOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t('common.loading', 'Loading...') : t('thekedars.submitOnboard', 'Onboard Thekedar')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Scope & Profile Details Modal */}
      {selectedThekedar && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedThekedar(null);
          }}
          title={`${selectedThekedar.name} — Contractor Profile & Authorization`}
        >
          <div className="space-y-4">
            {/* Account Authorization Card */}
            <div
              className={`rounded-xl p-4 border ${
                selectedThekedar.status === 'ACTIVE'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                    Account Authorization State
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                        selectedThekedar.status === 'ACTIVE'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          selectedThekedar.status === 'ACTIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                        }`}
                      />
                      {selectedThekedar.status === 'ACTIVE' ? 'ACTIVE CONTRACTOR' : 'SUSPENDED / DEACTIVATED'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                    {selectedThekedar.status === 'ACTIVE'
                      ? 'Thekedar is fully authorized to log in, supervise crafts, record attendance, and manage workers.'
                      : 'Account is deactivated. Login tokens are revoked and access to contractor dashboard is blocked.'}
                  </p>
                </div>

                <div>
                  {selectedThekedar.status === 'ACTIVE' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={statusActionLoadingId === selectedThekedar._id}
                      onClick={(e) => handleToggleStatus(selectedThekedar, e)}
                    >
                      <UserX className="mr-1.5 h-3.5 w-3.5" />
                      Deactivate Account
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={statusActionLoadingId === selectedThekedar._id}
                      onClick={(e) => handleToggleStatus(selectedThekedar, e)}
                    >
                      <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                      Activate Account
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* General Info Card */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Email Address:</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedThekedar.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Mobile Phone:</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedThekedar.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Workers Supervised:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedThekedar.workerCount || 0} Craftsmen</span>
              </div>
            </div>

            {/* Assigned Projects */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Assigned Furniture Projects ({selectedThekedar.assignedProjects?.length || 0})
              </h4>
              {selectedThekedar.assignedProjects && selectedThekedar.assignedProjects.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedThekedar.assignedProjects.map((p) => (
                    <div
                      key={p._id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-800/80 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-slate-500 dark:text-slate-400">{p.siteAddress}</div>
                      </div>
                      <Badge variant="info">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No projects assigned yet.</p>
              )}
            </div>

            {/* Supervised Workers: Name & Phone Number */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Supervised Workers & Craftsmen ({selectedThekedar.workers?.length || selectedThekedar.workerCount || 0})
              </h4>
              {selectedThekedar.workers && selectedThekedar.workers.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selectedThekedar.workers.map((w) => (
                    <div
                      key={w._id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-800/80 text-xs flex justify-between items-center hover:border-purple-300 dark:hover:border-purple-600 transition"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{w.name}</span>
                          <span className="text-[10px] font-mono text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            {w.workerCode}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ₹{w.defaultDailyWage || 750}/day
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                          <Phone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{w.phone}</span>
                          {w.email && <span className="text-slate-400 dark:text-slate-500 text-[11px]">({w.email})</span>}
                        </div>
                      </div>
                      <Badge variant={w.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {w.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No workers registered under this contractor.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              {selectedThekedar.totalProjects === 0 && selectedThekedar.workerCount === 0 ? (
                <button
                  type="button"
                  disabled={statusActionLoadingId === selectedThekedar._id}
                  onClick={(e) => handleDeleteThekedar(selectedThekedar, e)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Thekedar Account</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Cannot delete while projects or workers are assigned
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailsModalOpen(false);
                  setSelectedThekedar(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ThekedarsPage;
