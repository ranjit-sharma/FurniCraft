import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
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
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Archive,
  Flame,
  Zap,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
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
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [typeFilter, setTypeFilter] = useState('ALL');
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

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
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

        // Priority Filter
        if (priorityFilter !== 'ALL' && (p.priority || 'MEDIUM') !== priorityFilter) {
          return false;
        }

        // Type Filter
        if (typeFilter !== 'ALL' && p.projectType !== typeFilter) {
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
  }, [projects, statusFilter, priorityFilter, typeFilter, searchQuery]);

  // Filtered Archived Projects for Archive Section
  const filteredArchivedProjects = useMemo(() => {
    return sortByPriorityAndDate(
      projects.filter((p) => {
        if (p.status !== 'ARCHIVED') return false;

        // If specific active status filter is active, skip archive display unless statusFilter is ARCHIVED or ALL or ALL_ACTIVE
        if (statusFilter !== 'ARCHIVED' && statusFilter !== 'ALL' && statusFilter !== 'ALL_ACTIVE') {
          return false;
        }

        // Priority Filter
        if (priorityFilter !== 'ALL' && (p.priority || 'MEDIUM') !== priorityFilter) {
          return false;
        }

        // Type Filter
        if (typeFilter !== 'ALL' && p.projectType !== typeFilter) {
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
  }, [projects, statusFilter, priorityFilter, typeFilter, searchQuery]);

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

  const hasActiveFilters = statusFilter !== 'ALL_ACTIVE' || priorityFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setStatusFilter('ALL_ACTIVE');
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('projects.allProjects', 'Modern Furniture Projects')}</h2>
          <p className="text-xs text-slate-700 dark:text-slate-300">{t('projects.furnitureScope', 'Scope of modern furniture works with priority & archive controls.')}</p>
        </div>

        {isThekedar && (
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} icon={Plus} className="w-full sm:w-auto justify-center">
            {t('projects.createNew', 'New Furniture Project')}
          </Button>
        )}
        {isOwner && (
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-900 dark:text-purple-300 w-full sm:w-auto">
            <span>{t('projects.executiveView', 'Read-Only Executive Visibility')}</span>
          </div>
        )}
      </div>

      {/* Filtration & Search Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        {/* Row 1: Status Filtration Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> {t('projects.status', 'Status')}:
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL_ACTIVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL_ACTIVE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{t('projects.allActive', 'All Active')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'ALL_ACTIVE' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>{t('projects.inProgress', 'In Progress')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'IN_PROGRESS' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.inProgress}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PLANNED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'PLANNED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span>{t('projects.planned', 'Planned')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'PLANNED' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.planned}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ON_HOLD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ON_HOLD'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span>{t('projects.onHold', 'On Hold')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'ON_HOLD' ? 'bg-orange-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.onHold}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{t('projects.completed', 'Completed')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('ARCHIVED');
              setArchiveExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ARCHIVED'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Archive className="h-3 w-3" />
            <span>{t('projects.archived', 'Archived')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'ARCHIVED' ? 'bg-slate-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.archived}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{t('projects.allTotal', 'All Total')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {counts.total}
            </span>
          </button>
        </div>

        {/* Row 2: Search Query, Priority Filter & Furniture Type */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('projects.searchPlaceholder', 'Search title, client, site address, or code...')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-white shadow-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Priority / Importance Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">{t('projects.importance', 'Importance')}:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-slate-800 dark:text-slate-200 shadow-xs focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">{t('projects.allPriorities', 'All Importance')}</option>
              <option value="CRITICAL">🔥 {t('projects.critical', 'Critical')}</option>
              <option value="HIGH">⚡ {t('projects.high', 'High')}</option>
              <option value="MEDIUM">🔷 {t('projects.medium', 'Medium')}</option>
              <option value="LOW">🟢 {t('projects.low', 'Low')}</option>
            </select>
          </div>

          {/* Furniture Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">{t('projects.type', 'Type')}:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-slate-800 dark:text-slate-200 shadow-xs focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">{t('projects.allTypes', 'All Types')}</option>
              <option value="MODULAR_KITCHEN">Modular Kitchen</option>
              <option value="WARDROBE_SLIDING">Wardrobe & Sliding</option>
              <option value="TV_UNIT_PANEL">TV Unit & Panel</option>
              <option value="BED_HEADBOARD">Bed & Headboard</option>
              <option value="OFFICE_WORKSTATION">Workstations</option>
              <option value="CABINET_STORAGE">Cabinets & Storage</option>
              <option value="CUSTOM_FURNITURE">Custom Furniture</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <X className="h-3.5 w-3.5" /> {t('projects.resetFilters', 'Reset Filters')}
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
                    <span>{t('projects.prioritizedActive', 'Prioritized Active Projects')}</span>
                    <span className="text-xs font-black bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {filteredActiveProjects.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t('projects.orderedStrictly', 'Ordered strictly by importance level: Critical (highest) → High → Medium → Low.')}
                  </p>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t('projects.importance', 'Priority')}: Active
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
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredActiveProjects.map((p, idx) => (
                    <Card
                      key={p._id}
                      className={`flex flex-col justify-between transition-all hover:border-amber-400 hover:shadow-md ${
                        p.priority === 'CRITICAL'
                          ? 'border-rose-300/80 dark:border-rose-800/80 bg-gradient-to-b from-rose-50/20 to-white dark:from-rose-950/20 dark:to-slate-900'
                          : p.priority === 'HIGH'
                          ? 'border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/20 to-white dark:from-amber-950/20 dark:to-slate-900'
                          : ''
                      }`}
                    >
                      <div>
                        {/* Header: Code, Priority & Status */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold">#{idx + 1}</span>
                            {p.projectCode}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {renderPriorityBadge(p.priority || 'MEDIUM')}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 line-clamp-1">{p.name}</h3>

                        {/* Quick Status / Priority Dropdowns for Thekedar */}
                        {isThekedar ? (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{t('projects.status', 'Status')}:</span>
                              <select
                                value={p.status}
                                onChange={(e) => handleProjectStatusChange(p._id, e.target.value)}
                                className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-slate-900 dark:text-white shadow-xs focus:border-amber-500 cursor-pointer"
                              >
                                <option value="PLANNED">PLANNED</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="ON_HOLD">ON_HOLD</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="ARCHIVED">ARCHIVED 📁</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{t('projects.importance', 'Priority')}:</span>
                              <select
                                value={p.priority || 'MEDIUM'}
                                onChange={(e) => handleProjectPriorityChange(p._id, e.target.value)}
                                className="text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-white shadow-xs focus:border-amber-500 cursor-pointer"
                              >
                                <option value="CRITICAL">🔥 CRITICAL</option>
                                <option value="HIGH">⚡ HIGH</option>
                                <option value="MEDIUM">🔷 MEDIUM</option>
                                <option value="LOW">🟢 LOW</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant={p.status} size="sm">{p.status}</Badge>
                            <Badge variant="default" size="sm">{p.projectType?.replace('_', ' ')}</Badge>
                          </div>
                        )}

                        {/* Project Details */}
                        <div className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('projects.client', 'Client')}: <strong className="text-slate-900 dark:text-white">{p.clientName}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.siteAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('projects.type', 'Type')}: <strong className="text-amber-900 dark:text-amber-400">{p.projectType?.replace('_', ' ')}</strong></span>
                          </div>
                        </div>

                        {/* Financial Card (Non-worker) */}
                        {!isWorker && (
                          p.totalMoneyReceived > 0 ? (
                            <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">{t('projects.clientMoneyReceived', 'Client Money Received')}</span>
                                {p.paymentsCount > 0 && (
                                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
                                    {p.paymentsCount} {p.paymentsCount === 1 ? 'receipt' : 'receipts'}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-base font-black text-emerald-950 dark:text-emerald-200">
                                ₹{p.totalMoneyReceived.toLocaleString('en-IN')}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 p-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                              <span className="font-medium">{t('projects.noPaymentReceived', 'No client payment received yet')}</span>
                              <span className="text-[10px] text-slate-400 italic">₹0</span>
                            </div>
                          )
                        )}

                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          Thekedar: {p.thekedarId?.name || 'Assigned'}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {isThekedar && (
                            <button
                              type="button"
                              onClick={() => handleProjectStatusChange(p._id, 'ARCHIVED')}
                              className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition"
                              title="Archive project"
                            >
                              {t('projects.archive', 'Archive')}
                            </button>
                          )}
                          <Link to={`/projects/${p._id}`}>
                            <Button size="sm" variant="outline" className="text-xs font-bold">
                              {t('common.view', 'View')} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
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
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredArchivedProjects.map((p) => (
                    <Card
                      key={p._id}
                      className="flex flex-col justify-between border-slate-300/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <div>
                        {/* Header: Project Code & Badges */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-600">{p.projectCode}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              <Archive className="h-2.5 w-2.5" /> ARCHIVED
                            </span>
                            {renderPriorityBadge(p.priority || 'MEDIUM')}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-2 line-clamp-1">{p.name}</h3>

                        {/* Details */}
                        <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('projects.client', 'Client')}: <strong className="text-slate-800 dark:text-slate-200">{p.clientName}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.siteAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{t('projects.type', 'Type')}: <strong className="text-slate-700 dark:text-slate-300">{p.projectType?.replace('_', ' ')}</strong></span>
                          </div>
                        </div>

                        {/* Status Change / Re-activate */}
                        {isThekedar && (
                          <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600 dark:text-slate-400">{t('projects.status', 'Status')}:</span>
                              <select
                                value={p.status}
                                onChange={(e) => handleProjectStatusChange(p._id, e.target.value)}
                                className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-white shadow-xs focus:border-amber-500 cursor-pointer"
                              >
                                <option value="ARCHIVED">ARCHIVED 📁</option>
                                <option value="IN_PROGRESS">Restore: IN_PROGRESS</option>
                                <option value="PLANNED">Restore: PLANNED</option>
                                <option value="COMPLETED">COMPLETED</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-5 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                        {isThekedar ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1 shadow-xs"
                            onClick={() => handleProjectStatusChange(p._id, 'IN_PROGRESS')}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore to Active
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Archived Record</span>
                        )}

                        <Link to={`/projects/${p._id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            {t('projects.viewDetails', 'View Details')} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
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
              placeholder="e.g. DLF Magnolias - Acrylic Modular Kitchen & Island Bar"
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
                placeholder="e.g. Aarav Singhania"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('projects.clientPhone', 'Client Phone')}</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 98100 11223"
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
              placeholder="e.g. Villa 14, Magnolias, Golf Course Road, Gurugram"
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
              placeholder="e.g. Hafele hardware, Merino high-gloss laminate, Blum servo-drive drawers"
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
