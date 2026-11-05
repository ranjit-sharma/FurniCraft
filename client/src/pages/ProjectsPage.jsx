import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  ArrowRight,
  MapPin,
  Phone,
  User,
  Calendar,
  Search,
  Filter,
  Archive,
  Flame,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  HardHat,
} from 'lucide-react';

const PRIORITY_ORDER = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const ProjectsPage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filtration & Sorting State
  const [statusFilter, setStatusFilter] = useState('ALL_ACTIVE'); // ALL_ACTIVE, ALL, IN_PROGRESS, PLANNED, ON_HOLD, COMPLETED, ARCHIVED
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveExpanded, setArchiveExpanded] = useState(true);

  // New Project Form State
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [projectType, setProjectType] = useState('MODULAR_KITCHEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [loadError, setLoadError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoadError(null);
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectStatusChange = async (projectId, newStatus) => {
    try {
      await api.put(`/projects/${projectId}`, { status: newStatus });
      setMessage({ type: 'success', text: `Project status successfully updated to ${newStatus}` });
      fetchProjects();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update project status' });
    }
  };

  const handleProjectPriorityChange = async (projectId, newPriority) => {
    try {
      await api.put(`/projects/${projectId}`, { priority: newPriority });
      setMessage({ type: 'success', text: `Project priority successfully updated to ${newPriority}` });
      fetchProjects();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update priority' });
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/projects', {
        name,
        clientName,
        clientPhone,
        siteAddress,
        projectType,
        priority,
        notes,
      });
      setMessage({ type: 'success', text: 'Furniture project created successfully!' });
      setCreateModalOpen(false);
      setName('');
      setClientName('');
      setClientPhone('');
      setSiteAddress('');
      setProjectType('MODULAR_KITCHEN');
      setPriority('MEDIUM');
      setNotes('');
      fetchProjects();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Counts & Statistics
  const counts = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status !== 'ARCHIVED');
    const archived = projects.filter((p) => p.status === 'ARCHIVED');
    const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length;
    const planned = projects.filter((p) => p.status === 'PLANNED').length;
    const onHold = projects.filter((p) => p.status === 'ON_HOLD').length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const critical = active.filter((p) => p.priority === 'CRITICAL').length;
    const high = active.filter((p) => p.priority === 'HIGH').length;

    return {
      total,
      active: active.length,
      archived: archived.length,
      inProgress,
      planned,
      onHold,
      completed,
      critical,
      high,
    };
  }, [projects]);

  // Sorting helper: CRITICAL -> HIGH -> MEDIUM -> LOW, then newest
  const sortByPriorityAndDate = (list) => {
    return [...list].sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] || 2;
      const pB = PRIORITY_ORDER[b.priority] || 2;
      if (pB !== pA) return pB - pA;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  };

  // Filter application
  const filteredActiveProjects = useMemo(() => {
    return sortByPriorityAndDate(
      projects.filter((p) => {
        // Must NOT be archived for the main active section
        if (p.status === 'ARCHIVED') return false;

        // Status Filter
        if (statusFilter !== 'ALL_ACTIVE' && statusFilter !== 'ALL') {
          if (p.status !== statusFilter) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchCode = p.projectCode?.toLowerCase().includes(q);
          const matchClient = p.clientName?.toLowerCase().includes(q);
          const matchAddress = p.siteAddress?.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchClient && !matchAddress) return false;
        }

        return true;
      })
    );
  }, [projects, statusFilter, searchQuery]);

  // Filtered Archived Projects for Archive Section
  const filteredArchivedProjects = useMemo(() => {
    return sortByPriorityAndDate(
      projects.filter((p) => {
        if (p.status !== 'ARCHIVED') return false;

        // If specific active status filter is active, skip archive display unless statusFilter is ARCHIVED or ALL or ALL_ACTIVE
        if (statusFilter !== 'ARCHIVED' && statusFilter !== 'ALL' && statusFilter !== 'ALL_ACTIVE') {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchCode = p.projectCode?.toLowerCase().includes(q);
          const matchClient = p.clientName?.toLowerCase().includes(q);
          const matchAddress = p.siteAddress?.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchClient && !matchAddress) return false;
        }

        return true;
      })
    );
  }, [projects, statusFilter, searchQuery]);

  const renderPriorityBadge = (pPriority) => {
    switch (pPriority) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-black text-rose-800 border border-rose-300 shadow-xs">
            <Flame className="h-3 w-3 text-rose-600 fill-rose-500 animate-pulse" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300 shadow-xs">
            <Zap className="h-3 w-3 text-amber-600 fill-amber-500" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800 border border-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            LOW
          </span>
        );
    }
  };

  const hasActiveFilters = statusFilter !== 'ALL_ACTIVE' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setStatusFilter('ALL_ACTIVE');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <LoadError message={loadError} onRetry={fetchProjects} />
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      <PageHeader
        title={t('projects.pageTitle', 'Projects')}
        subtitle={`${counts.active} ${t('projects.activeLower', 'active')} · ${counts.total} ${t('projects.totalLower', 'total')} · ${t('projects.sortedHint', 'sorted by importance')}`}
        badge={isOwner && (
          <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 dark:text-purple-300">
            {t('projects.readOnly', 'View only')}
          </span>
        )}
        actions={isThekedar && (
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} icon={Plus}>
            {t('projects.createNew', 'New Project')}
          </Button>
        )}
      />

      {/* Filters: status chips kept in single line across all devices with smooth swipe/scroll */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 touch-pan-x" role="tablist" aria-label="Project status">
          {[
            { id: 'ALL_ACTIVE', label: t('projects.allActive', 'Active'), count: counts.active },
            { id: 'IN_PROGRESS', label: t('projects.inProgress', 'In Progress'), count: counts.inProgress, dot: 'bg-amber-400' },
            { id: 'PLANNED', label: t('projects.planned', 'Planned'), count: counts.planned, dot: 'bg-indigo-400' },
            { id: 'ON_HOLD', label: t('projects.onHold', 'On Hold'), count: counts.onHold, dot: 'bg-orange-400' },
            { id: 'COMPLETED', label: t('projects.completed', 'Completed'), count: counts.completed, dot: 'bg-emerald-400' },
            { id: 'ARCHIVED', label: t('projects.archived', 'Archived'), count: counts.archived, icon: Archive },
            { id: 'ALL', label: t('projects.allTotal', 'All'), count: counts.total },
          ].map(({ id, label, count, dot, icon: Icon }) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(id);
                  if (id === 'ARCHIVED') setArchiveExpanded(true);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
                <span className={`rounded-full px-1.5 text-[11px] font-black ${active ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('projects.searchPlaceholder', 'Search name, client, site or code')}
              aria-label="Search projects"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-9 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <X className="h-4 w-4" /> {t('projects.resetFilters', 'Clear')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ======================================================== */}
          {/* SECTION 1: Prioritized Active Projects                  */}
          {/* ======================================================== */}
          {statusFilter !== 'ARCHIVED' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span>{t('projects.activeHeading', 'Active projects')}</span>
                    <span className="text-xs font-black bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {filteredActiveProjects.length}
                    </span>
                  </h3>

                </div>


              </div>

              {filteredActiveProjects.length === 0 ? (
                <Card className="text-center py-10 border-dashed">
                  <FolderKanban className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">{t('projects.noActiveMatch', 'No active projects match your filters')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('projects.trySwitching', 'Try switching status tabs, resetting filters, or adding a new project.')}</p>
                  {hasActiveFilters && (
                    <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={clearAllFilters}>
                      {t('projects.resetFilters', 'Reset Filters')}
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredActiveProjects.map((p) => (
                    <Link
                      key={p._id}
                      to={`/projects/${p._id}`}
                      className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:border-amber-400 active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-400">{p.projectCode}</span>
                        {renderPriorityBadge(p.priority || 'MEDIUM')}
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-base font-black text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{p.clientName}</p>
                      {/* Only owner can see the thekedar name on the project card */}
                      {isOwner && p.thekedarId && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-1 rounded-lg w-fit">
                          <HardHat className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            <span className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 mr-1">{t('thekedars.thekedarSupervisor', 'Thekedar')}:</span>
                            {p.thekedarId?.name || p.thekedarId}
                          </span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge variant={p.status} size="sm">{p.status?.replace('_', ' ')}</Badge>
                        {!isWorker && <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">₹{(p.totalMoneyReceived || 0).toLocaleString('en-IN')}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: Dedicated Archive Section at the End         */}
          {/* ======================================================== */}
          <div id="archive-section" className="pt-6 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Archive className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  <span>{t('projects.archivedProjects', 'Archived Projects')}</span>
                  <span className="text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full">
                    {filteredArchivedProjects.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('projects.archivedDesc', 'Decommissioned or archived furniture projects preserved for permanent record.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setArchiveExpanded(!archiveExpanded)}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {archiveExpanded ? (
                    <>
                      {t('projects.collapseArchive', 'Collapse Archive')} <ChevronUp className="h-3.5 w-3.5 ml-1" />
                    </>
                  ) : (
                    <>
                      {t('projects.expandArchive', 'Expand Archive')} <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {archiveExpanded && (
              filteredArchivedProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-8 text-center">
                  <Archive className="mx-auto h-10 w-10 text-slate-400" />
                  <h4 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">{t('projects.noArchivedFound', 'No archived projects found')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {t('projects.archiveHelp', 'Projects can be archived anytime by Thekedars using the status dropdown on any project card. They will appear here safely archived.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredArchivedProjects.map((p) => (
                    <Link
                      key={p._id}
                      to={`/projects/${p._id}`}
                      className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 shadow-sm transition hover:border-amber-400 active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-900 dark:text-amber-400">{p.projectCode}</span>
                        {renderPriorityBadge(p.priority || 'MEDIUM')}
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-base font-black text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{p.clientName}</p>
                      {/* Only owner can see the thekedar name on the project card */}
                      {isOwner && p.thekedarId && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-1 rounded-lg w-fit">
                          <HardHat className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            <span className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 mr-1">{t('thekedars.thekedarSupervisor', 'Thekedar')}:</span>
                            {p.thekedarId?.name || p.thekedarId}
                          </span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge variant={p.status} size="sm">{p.status?.replace('_', ' ')}</Badge>
                        {!isWorker && <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">₹{(p.totalMoneyReceived || 0).toLocaleString('en-IN')}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('projects.createModalTitle', 'Create Modern Furniture Project')}>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projects.projectName', 'Project Title')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project title"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projects.clientName', 'Client Name')}</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client full name"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projects.clientPhone', 'Client Phone')}</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Client phone number"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projects.siteAddress', 'Site Address')}</label>
            <input
              type="text"
              required
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Site address"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projects.type', 'Furniture Type')}</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="MODULAR_KITCHEN">Modular Kitchen</option>
                <option value="WARDROBE_SLIDING">Wardrobe & Sliding Door</option>
                <option value="TV_UNIT_PANEL">TV Unit & Panel</option>
                <option value="BED_HEADBOARD">Bed & Headboard</option>
                <option value="OFFICE_WORKSTATION">Office Workstations</option>
                <option value="CABINET_STORAGE">Cabinets & Storage</option>
                <option value="CUSTOM_FURNITURE">Custom Furniture</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('projects.importance', 'Project Importance / Priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="CRITICAL">🔥 CRITICAL</option>
                <option value="HIGH">⚡ HIGH</option>
                <option value="MEDIUM">🔷 MEDIUM</option>
                <option value="LOW">🟢 LOW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('projects.projectNotes', 'Project Notes & Specifications')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope of work & material specifications"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit" loading={submitting}>{t('projects.createNew', 'Create Project')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
