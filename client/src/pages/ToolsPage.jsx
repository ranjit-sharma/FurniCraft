import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  Wrench,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Tag,
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  Clock,
  User,
  FolderKanban,
  Calendar,
  X,
  ShieldAlert,
  AlertCircle,
  Layers,
  ArrowRight,
  Check,
  ChevronRight,
  Sparkles,
  Briefcase,
} from 'lucide-react';

const TOOL_CATEGORIES_LIST = [
  'Cutting Tools',
  'Drilling Tools',
  'Power Tools',
  'Measuring Tools',
  'Assembly Tools',
  'Installation Tools',
  'Hand Tools',
  'Electrical Tools',
  'Safety Equipment',
  'Other',
];

const DAMAGE_TYPES = [
  'Wear and Tear',
  'Dropped',
  'Burnt Motor',
  'Blade Broken',
  'Housing Cracked',
  'Water Damage',
  'Other',
];

export const ToolsPage = () => {
  const { user, isOwner, isThekedar } = useAuth();
  const { t } = useLanguage();

  const [tools, setTools] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    issued: 0,
    transferred: 0,
    returned: 0,
    missing: 0,
    damaged: 0,
  });
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Tool Detail Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTool, setDrawerTool] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 1. Register Tool Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regCategory, setRegCategory] = useState('Power Tools');
  const [regCondition, setRegCondition] = useState('NEW');
  const [regQuantity, setRegQuantity] = useState('1');
  const [regBrand, setRegBrand] = useState('Bosch');
  const [regModel, setRegModel] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regCost, setRegCost] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // 2. Edit Tool Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Power Tools');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 3. Issue Tool Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueTargetTool, setIssueTargetTool] = useState(null);
  const [issueWorkerId, setIssueWorkerId] = useState('');
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [issueQuantity, setIssueQuantity] = useState('1');
  const [issueCondition, setIssueCondition] = useState('GOOD');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // 4. Transfer Tool Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetTool, setTransferTargetTool] = useState(null);
  const [transferToProjectId, setTransferToProjectId] = useState('');
  const [transferToWorkerId, setTransferToWorkerId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // 5. Return Tool Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTargetTool, setReturnTargetTool] = useState(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnQuantity, setReturnQuantity] = useState('1');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnDamageNotes, setReturnDamageNotes] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // 6. Report Missing Modal
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [missingTargetTool, setMissingTargetTool] = useState(null);
  const [missingReason, setMissingReason] = useState('');
  const [missingDate, setMissingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [missingConditionLastSeen, setMissingConditionLastSeen] = useState('GOOD');
  const [missingSubmitting, setMissingSubmitting] = useState(false);

  // 7. Resolve Missing Modal
  const [resolveMissingModalOpen, setResolveMissingModalOpen] = useState(false);
  const [resolveMissingTargetTool, setResolveMissingTargetTool] = useState(null);
  const [resolveMissingStatus, setResolveMissingStatus] = useState('FOUND');
  const [resolveMissingCondition, setResolveMissingCondition] = useState('GOOD');
  const [resolveMissingNotes, setResolveMissingNotes] = useState('');
  const [resolveMissingSubmitting, setResolveMissingSubmitting] = useState(false);

  // 8. Report Damage Modal
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [damageTargetTool, setDamageTargetTool] = useState(null);
  const [damageType, setDamageType] = useState('Wear and Tear');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageDate, setDamageDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [damageSubmitting, setDamageSubmitting] = useState(false);

  // 9. Resolve Damage Modal
  const [resolveDamageModalOpen, setResolveDamageModalOpen] = useState(false);
  const [resolveDamageTargetTool, setResolveDamageTargetTool] = useState(null);
  const [resolveDamageStatus, setResolveDamageStatus] = useState('USABLE_AGAIN');
  const [resolveDamageNotes, setResolveDamageNotes] = useState('');
  const [resolveDamageSubmitting, setResolveDamageSubmitting] = useState(false);

  // Load tools & dependencies
  const fetchTools = async () => {
    try {
      const [toolsRes, statsRes, projectsRes, workersRes] = await Promise.all([
        api.get('/tools'),
        api.get('/tools/stats'),
        api.get('/projects'),
        api.get('/users/workers'),
      ]);

      setTools(toolsRes.data?.data?.tools || toolsRes.data?.tools || []);
      if (statsRes.data?.data?.stats) {
        setStats(statsRes.data.data.stats);
      }
      const rawProjects = projectsRes.data?.data?.projects || projectsRes.data?.projects || [];
      setProjects(rawProjects);
      const rawWorkers = workersRes.data?.data?.workers || workersRes.data?.workers || [];
      setWorkers(rawWorkers);

      if (rawProjects.length > 0 && !issueProjectId) {
        setIssueProjectId(rawProjects[0]._id);
        setTransferToProjectId(rawProjects[0]._id);
      }
      if (rawWorkers.length > 0 && !issueWorkerId) {
        const firstWorkerId = rawWorkers[0].userId?._id || rawWorkers[0]._id;
        setIssueWorkerId(firstWorkerId);
        setTransferToWorkerId(firstWorkerId);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to load tools' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Filtered Tools
  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = t.toolCode?.toLowerCase().includes(q);
        const nameMatch = t.name?.toLowerCase().includes(q);
        const brandMatch = t.brand?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !brandMatch) return false;
      }
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterProject && t.currentAssignment?.projectId?._id !== filterProject && t.currentAssignment?.projectId !== filterProject) return false;
      if (filterWorker && t.currentAssignment?.workerId?._id !== filterWorker && t.currentAssignment?.workerId !== filterWorker) return false;
      return true;
    });
  }, [tools, searchQuery, filterCategory, filterStatus, filterProject, filterWorker]);

  // Open Drawer and fetch complete tool timeline
  const handleOpenDrawer = async (tool) => {
    setDrawerTool(tool);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await api.get(`/tools/${tool._id}`);
      if (res.data?.data?.tool) {
        setDrawerTool(res.data.data.tool);
      }
    } catch (err) {
      console.error('Failed to load tool detail', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 1. Submit Registration
  const handleRegisterTool = async (e) => {
    e.preventDefault();
    try {
      setRegSubmitting(true);
      await api.post('/tools', {
        name: regName.trim(),
        category: regCategory,
        initialCondition: regCondition,
        condition: regCondition,
        quantity: parseInt(regQuantity, 10) || 1,
        brand: regBrand.trim(),
        modelNumber: regModel.trim(),
        description: regDescription.trim(),
        purchaseCost: parseFloat(regCost) || 0,
      });
      setMessage({ type: 'success', text: `Tool "${regName}" registered successfully!` });
      setRegisterModalOpen(false);
      setRegName('');
      setRegModel('');
      setRegDescription('');
      setRegCost('');
      setRegQuantity('1');
      fetchTools();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to register tool' });
    } finally {
      setRegSubmitting(false);
    }
  };

  // 2. Open Edit
  const handleOpenEdit = (tool) => {
    setEditingTool(tool);
    setEditName(tool.name || '');
    setEditCategory(tool.category || 'Power Tools');
    setEditBrand(tool.brand || '');
    setEditModel(tool.modelNumber || '');
    setEditDescription(tool.description || '');
    setEditIsActive(tool.isActive !== false);
    setEditModalOpen(true);
  };

  const handleUpdateTool = async (e) => {
    e.preventDefault();
    if (!editingTool) return;
    try {
      setEditSubmitting(true);
      await api.put(`/tools/${editingTool._id}`, {
        name: editName.trim(),
        category: editCategory,
        brand: editBrand.trim(),
        modelNumber: editModel.trim(),
        description: editDescription.trim(),
        isActive: editIsActive,
      });
      setMessage({ type: 'success', text: `Tool "${editName}" updated successfully!` });
      setEditModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === editingTool._id) {
        handleOpenDrawer(editingTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update tool' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // 3. Open Issue
  const handleOpenIssue = (tool) => {
    setIssueTargetTool(tool);
    const availableQty = Math.max(1, (tool.quantity || 1) - (tool.issuedQuantity || 0));
    setIssueQuantity(String(availableQty));
    setIssueCondition(tool.condition || 'GOOD');
    setIssueNotes('');
    setIssueModalOpen(true);
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!issueTargetTool) return;
    try {
      setIssueSubmitting(true);
      await api.post(`/tools/${issueTargetTool._id}/issue`, {
        projectId: issueProjectId,
        workerId: issueWorkerId,
        issueDate,
        expectedReturnDate: expectedReturnDate || undefined,
        quantity: parseInt(issueQuantity, 10) || 1,
        conditionAtIssue: issueCondition,
        notes: issueNotes.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Tool "${issueTargetTool.name}" issued successfully!` });
      setIssueModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === issueTargetTool._id) {
        handleOpenDrawer(issueTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to issue tool' });
    } finally {
      setIssueSubmitting(false);
    }
  };

  // 4. Open Transfer
  const handleOpenTransfer = (tool) => {
    setTransferTargetTool(tool);
    setTransferReason('');
    setTransferNotes('');
    // prefill default destination to a different project if available
    const curProjId = tool.currentAssignment?.projectId?._id || tool.currentAssignment?.projectId;
    const otherProj = projects.find((p) => p._id !== curProjId);
    if (otherProj) setTransferToProjectId(otherProj._id);
    setTransferModalOpen(true);
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!transferTargetTool) return;
    try {
      setTransferSubmitting(true);
      await api.post(`/tools/${transferTargetTool._id}/transfer`, {
        toProjectId: transferToProjectId,
        toWorkerId: transferToWorkerId || undefined,
        transferDate,
        reason: transferReason.trim(),
        notes: transferNotes.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Tool "${transferTargetTool.name}" transferred to new project!` });
      setTransferModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === transferTargetTool._id) {
        handleOpenDrawer(transferTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to transfer tool' });
    } finally {
      setTransferSubmitting(false);
    }
  };

  // 5. Open Return
  const handleOpenReturn = (tool) => {
    setReturnTargetTool(tool);
    setReturnCondition('GOOD');
    setReturnQuantity(String(tool.currentAssignment?.quantity || 1));
    setReturnDamageNotes('');
    setReturnNotes('');
    setReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnTargetTool) return;
    try {
      setReturnSubmitting(true);
      await api.post(`/tools/${returnTargetTool._id}/return`, {
        conditionAtReturn: returnCondition,
        quantity: parseInt(returnQuantity, 10) || 1,
        returnDate,
        damageNotes: returnCondition === 'DAMAGED' || returnCondition === 'MISSING' ? returnDamageNotes : undefined,
        notes: returnNotes.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Tool return recorded for "${returnTargetTool.name}"!` });
      setReturnModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === returnTargetTool._id) {
        handleOpenDrawer(returnTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record tool return' });
    } finally {
      setReturnSubmitting(false);
    }
  };

  // 6. Report Missing
  const handleOpenMissing = (tool) => {
    setMissingTargetTool(tool);
    setMissingReason('');
    setMissingConditionLastSeen(tool.condition || 'GOOD');
    setMissingModalOpen(true);
  };

  const handleSubmitMissing = async (e) => {
    e.preventDefault();
    if (!missingTargetTool) return;
    try {
      setMissingSubmitting(true);
      await api.post(`/tools/${missingTargetTool._id}/report-missing`, {
        reason: missingReason.trim(),
        missingDate,
        conditionLastSeen: missingConditionLastSeen,
      });
      setMessage({ type: 'success', text: `Tool "${missingTargetTool.name}" marked as Missing.` });
      setMissingModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === missingTargetTool._id) {
        handleOpenDrawer(missingTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to report missing tool' });
    } finally {
      setMissingSubmitting(false);
    }
  };

  // 7. Resolve Missing
  const handleOpenResolveMissing = (tool) => {
    setResolveMissingTargetTool(tool);
    setResolveMissingStatus('FOUND');
    setResolveMissingCondition('GOOD');
    setResolveMissingNotes('');
    setResolveMissingModalOpen(true);
  };

  const handleSubmitResolveMissing = async (e) => {
    e.preventDefault();
    if (!resolveMissingTargetTool) return;
    try {
      setResolveMissingSubmitting(true);
      await api.patch(`/tools/${resolveMissingTargetTool._id}/resolve-missing`, {
        resolutionStatus: resolveMissingStatus,
        verifiedCondition: resolveMissingCondition,
        notes: resolveMissingNotes.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Missing tool report resolved for "${resolveMissingTargetTool.name}".` });
      setResolveMissingModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === resolveMissingTargetTool._id) {
        handleOpenDrawer(resolveMissingTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to resolve missing tool' });
    } finally {
      setResolveMissingSubmitting(false);
    }
  };

  // 8. Report Damage
  const handleOpenDamage = (tool) => {
    setDamageTargetTool(tool);
    setDamageType('Wear and Tear');
    setDamageDescription('');
    setDamageModalOpen(true);
  };

  const handleSubmitDamage = async (e) => {
    e.preventDefault();
    if (!damageTargetTool) return;
    try {
      setDamageSubmitting(true);
      await api.post(`/tools/${damageTargetTool._id}/report-damage`, {
        damageType,
        description: damageDescription.trim(),
        damageDate,
      });
      setMessage({ type: 'success', text: `Damage reported for "${damageTargetTool.name}".` });
      setDamageModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === damageTargetTool._id) {
        handleOpenDrawer(damageTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to report tool damage' });
    } finally {
      setDamageSubmitting(false);
    }
  };

  // 9. Resolve Damage
  const handleOpenResolveDamage = (tool) => {
    setResolveDamageTargetTool(tool);
    setResolveDamageStatus('USABLE_AGAIN');
    setResolveDamageNotes('');
    setResolveDamageModalOpen(true);
  };

  const handleSubmitResolveDamage = async (e) => {
    e.preventDefault();
    if (!resolveDamageTargetTool) return;
    try {
      setResolveDamageSubmitting(true);
      await api.patch(`/tools/${resolveDamageTargetTool._id}/resolve-damage`, {
        resolutionStatus: resolveDamageStatus,
        notes: resolveDamageNotes.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Tool damage status resolved for "${resolveDamageTargetTool.name}".` });
      setResolveDamageModalOpen(false);
      fetchTools();
      if (drawerOpen && drawerTool?._id === resolveDamageTargetTool._id) {
        handleOpenDrawer(resolveDamageTargetTool);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to resolve tool damage' });
    } finally {
      setResolveDamageSubmitting(false);
    }
  };

  // Helpers for Status Badges
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">Available</Badge>;
      case 'ISSUED':
        return <Badge variant="primary">Issued</Badge>;
      case 'PARTIALLY_ISSUED':
        return <Badge variant="info">Partially Issued</Badge>;
      case 'TRANSFERRED':
        return <Badge variant="warning">Transferred</Badge>;
      case 'RETURNED':
        return <Badge variant="default">Returned</Badge>;
      case 'MISSING':
      case 'LOST':
        return <Badge variant="danger">Missing</Badge>;
      case 'DAMAGED':
        return <Badge variant="danger">Damaged</Badge>;
      case 'UNDER_INSPECTION':
      case 'MAINTENANCE':
        return <Badge variant="warning">Under Inspection</Badge>;
      case 'RETIRED':
        return <Badge variant="default">Retired</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Modern Furniture Tool Tracking & Issues
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Track machinery, issue custody to site craftsmen, transfer between projects, and record maintenance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setRegisterModalOpen(true)}
            variant="primary"
            icon={Plus}
            className="shadow-sm shadow-amber-500/20"
          >
            Register New Tool
          </Button>
        </div>
      </div>

      {/* Summary Cards: 7 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Tools */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Tools</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total || tools.length}</div>
          <span className="text-[10px] text-slate-400">Registered inventory</span>
        </div>

        {/* 2. Available Tools */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Available</span>
          <div className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">{stats.available}</div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Ready to issue</span>
        </div>

        {/* 3. Currently Issued */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Issued</span>
          <div className="mt-1 text-2xl font-black text-blue-900 dark:text-blue-200">{stats.issued}</div>
          <span className="text-[10px] text-blue-700/80 dark:text-blue-400">In worker custody</span>
        </div>

        {/* 4. Transferred */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Transferred</span>
          <div className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-200">{stats.transferred}</div>
          <span className="text-[10px] text-indigo-700/80 dark:text-indigo-400">Site movements</span>
        </div>

        {/* 5. Returned */}
        <div className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">Returned</span>
          <div className="mt-1 text-2xl font-black text-teal-900 dark:text-teal-200">{stats.returned}</div>
          <span className="text-[10px] text-teal-700/80 dark:text-teal-400">Checked back in</span>
        </div>

        {/* 6. Missing */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Missing</span>
          <div className="mt-1 text-2xl font-black text-rose-900 dark:text-rose-200">{stats.missing}</div>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-400">Under inquiry</span>
        </div>

        {/* 7. Damaged */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Damaged</span>
          <div className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">{stats.damaged}</div>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-400">Inspection / Repair</span>
        </div>
      </div>

      {/* Toolbar: Search & Filtering Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID or Tool Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {TOOL_CATEGORIES_LIST.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_ISSUED">Partially Issued</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="MISSING">Missing</option>
              <option value="DAMAGED">Damaged</option>
              <option value="UNDER_INSPECTION">Under Inspection</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>

          {/* Worker Filter */}
          <div>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">Filter by Worker</option>
              {workers.map((w) => {
                const id = w.userId?._id || w._id;
                const name = w.userId?.name || w.name;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">Filter by Project Site</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.projectCode || 'SITE'} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || filterCategory || filterStatus || filterWorker || filterProject) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {filteredTools.length} of {tools.length} tools
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('');
                setFilterStatus('');
                setFilterWorker('');
                setFilterProject('');
              }}
              className="text-amber-700 dark:text-amber-400 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No tools found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tools.length === 0
                ? 'Your inventory is currently empty. Register your power tools, cutters, and machinery to start tracking them.'
                : 'No tools match your active filter criteria. Try adjusting or clearing your search filters.'}
            </p>
            {tools.length === 0 && (
              <div className="mt-4">
                <Button onClick={() => setRegisterModalOpen(true)} variant="primary" icon={Plus}>
                  Register First Tool
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Tool ID</th>
                  <th className="p-3.5">Tool Name & Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned Worker</th>
                  <th className="p-3.5">Current Site</th>
                  <th className="p-3.5">Available / Units</th>
                  <th className="p-3.5">Last Movement</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTools.map((t) => {
                  const assignedWorkerName = t.currentAssignment?.workerName || t.currentAssignment?.workerId?.name;
                  const currentSiteName = t.currentAssignment?.projectName || t.currentAssignment?.projectId?.name;
                  const availableUnits = Math.max(0, (t.quantity || 1) - (t.issuedQuantity || 0));
                  const lastMovement = t.movementHistory?.[t.movementHistory.length - 1];

                  return (
                    <tr
                      key={t._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tool ID */}
                      <td className="p-3.5">
                        <button
                          onClick={() => handleOpenDrawer(t)}
                          className="font-mono text-[11px] font-black text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 hover:border-amber-400 cursor-pointer"
                          title="Click to view full movement timeline"
                        >
                          {t.toolCode}
                        </button>
                      </td>

                      {/* Tool Name & Category */}
                      <td className="p-3.5">
                        <button
                          onClick={() => handleOpenDrawer(t)}
                          className="text-left font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 block"
                        >
                          {t.name}
                        </button>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.category}</span>
                          {t.brand && (
                            <>
                              <span>•</span>
                              <span>{t.brand}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">{renderStatusBadge(t.status)}</td>

                      {/* Assigned Worker */}
                      <td className="p-3.5">
                        {assignedWorkerName ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{assignedWorkerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None (In Workshop)</span>
                        )}
                      </td>

                      {/* Current Site */}
                      <td className="p-3.5">
                        {currentSiteName ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300">{currentSiteName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Main Workshop</span>
                        )}
                      </td>

                      {/* Available / Units */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {availableUnits} / {t.quantity || 1}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {t.issuedQuantity || 0} issued
                        </span>
                      </td>

                      {/* Last Movement */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {lastMovement ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                              {lastMovement.action.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(lastMovement.timestamp)}
                            </span>
                          </div>
                        ) : (
                          formatDate(t.registrationDate || t.createdAt)
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Details Drawer Button */}
                          <button
                            onClick={() => handleOpenDrawer(t)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="View Full Movement History"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Issue Button */}
                          {(t.status === 'AVAILABLE' || t.status === 'PARTIALLY_ISSUED') && availableUnits > 0 && (
                            <button
                              onClick={() => handleOpenIssue(t)}
                              className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors text-[10px]"
                              title="Issue to Worker"
                            >
                              Issue
                            </button>
                          )}

                          {/* Transfer Button */}
                          {(t.status === 'ISSUED' || t.status === 'PARTIALLY_ISSUED') && (
                            <button
                              onClick={() => handleOpenTransfer(t)}
                              className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-[10px]"
                              title="Transfer to Another Project"
                            >
                              Transfer
                            </button>
                          )}

                          {/* Return Button */}
                          {(t.status === 'ISSUED' || t.status === 'PARTIALLY_ISSUED') && (
                            <button
                              onClick={() => handleOpenReturn(t)}
                              className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors text-[10px]"
                              title="Record Return from Site"
                            >
                              Return
                            </button>
                          )}

                          {/* Missing Button */}
                          {t.status !== 'MISSING' && t.status !== 'LOST' && t.status !== 'RETIRED' && (
                            <button
                              onClick={() => handleOpenMissing(t)}
                              className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors text-[10px]"
                              title="Report Tool Missing"
                            >
                              Missing
                            </button>
                          )}

                          {/* Damage Button */}
                          {t.status !== 'DAMAGED' && t.status !== 'UNDER_INSPECTION' && t.status !== 'RETIRED' && (
                            <button
                              onClick={() => handleOpenDamage(t)}
                              className="px-2 py-1 rounded bg-amber-100/70 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-bold hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors text-[10px]"
                              title="Report Tool Defect or Damage"
                            >
                              Damage
                            </button>
                          )}

                          {/* Resolve Missing Button */}
                          {(t.status === 'MISSING' || t.status === 'LOST') && (
                            <button
                              onClick={() => handleOpenResolveMissing(t)}
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-[10px]"
                              title="Mark Missing Tool as Found & Verified"
                            >
                              Mark Found
                            </button>
                          )}

                          {/* Resolve Damage Button */}
                          {(t.status === 'DAMAGED' || t.status === 'UNDER_INSPECTION') && (
                            <button
                              onClick={() => handleOpenResolveDamage(t)}
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-[10px]"
                              title="Mark Repaired & Usable Again"
                            >
                              Mark Usable
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            title="Edit Tool Details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          SLIDE-OVER DRAWER: COMPLETE MOVEMENT TIMELINE & TOOL DETAILS
      ========================================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {drawerTool?.toolCode}
                    </span>
                    {drawerTool && renderStatusBadge(drawerTool.status)}
                  </div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {drawerTool?.name}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              </div>
            ) : drawerTool ? (
              <div className="p-4 sm:p-6 space-y-6 flex-1">
                {/* Section 1: Overview & Specifications */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    Tool Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Category</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{drawerTool.category}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Initial Condition</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{drawerTool.initialCondition || drawerTool.condition || 'GOOD'}</strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Units</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{drawerTool.quantity || 1} pcs</strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Available Units</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {Math.max(0, (drawerTool.quantity || 1) - (drawerTool.issuedQuantity || 0))} pcs
                      </strong>
                    </div>
                  </div>

                  {drawerTool.description && (
                    <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Description</span>
                      <p className="mt-0.5 text-slate-800 dark:text-slate-200">{drawerTool.description}</p>
                    </div>
                  )}
                </div>

                {/* Section 2: Current Assignment */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    Current Custody & Deployment
                  </h4>
                  {drawerTool.currentAssignment?.projectId || drawerTool.currentAssignment?.workerId ? (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/30 p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 dark:text-blue-300">Responsible Worker:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {drawerTool.currentAssignment.workerName || drawerTool.currentAssignment.workerId?.name || 'Worker'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 dark:text-blue-300">Project / Site:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {drawerTool.currentAssignment.projectName || drawerTool.currentAssignment.projectId?.name || 'Site'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 dark:text-blue-300">Issue Date:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatDate(drawerTool.currentAssignment.issueDate)}
                        </span>
                      </div>
                      {drawerTool.currentAssignment.expectedReturnDate && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-900 dark:text-blue-300">Expected Return:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {formatDate(drawerTool.currentAssignment.expectedReturnDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                      Tool is currently in the workshop and not checked out to any worker.
                    </div>
                  )}
                </div>

                {/* Section 3: Missing or Damage Incident Status */}
                {drawerTool.missingReport?.isMissing && (
                  <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/40 p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span>Tool Reported Missing</span>
                      </div>
                      <Badge variant="danger">{drawerTool.missingReport.resolutionStatus || 'REPORTED'}</Badge>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Circumstances:</strong> {drawerTool.missingReport.reason}
                    </p>
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleOpenResolveMissing(drawerTool)}
                      >
                        Resolve / Mark Found
                      </Button>
                    </div>
                  </div>
                )}

                {drawerTool.damageReport?.isDamaged && (
                  <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Tool Damage Reported ({drawerTool.damageReport.damageType})</span>
                      </div>
                      <Badge variant="warning">{drawerTool.damageReport.resolutionStatus || 'REPORTED'}</Badge>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong>Defect Description:</strong> {drawerTool.damageReport.description}
                    </p>
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleOpenResolveDamage(drawerTool)}
                      >
                        Inspect & Mark Usable
                      </Button>
                    </div>
                  </div>
                )}

                {/* Section 4: Complete Movement Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between">
                    <span>Complete Movement Timeline</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {drawerTool.movementHistory?.length || 0} events
                    </span>
                  </h4>

                  {(!drawerTool.movementHistory || drawerTool.movementHistory.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No movement recorded yet.</p>
                  ) : (
                    <div className="relative pl-6 space-y-5 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                      {drawerTool.movementHistory.map((m, idx) => (
                        <div key={idx} className="relative">
                          {/* Dot Icon */}
                          <div
                            className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900 ${
                              m.action === 'REGISTERED'
                                ? 'border-emerald-500 text-emerald-500'
                                : m.action === 'ISSUED'
                                ? 'border-blue-500 text-blue-500'
                                : m.action === 'TRANSFERRED'
                                ? 'border-indigo-500 text-indigo-500'
                                : m.action === 'RETURNED' || m.action === 'PARTIALLY_RETURNED'
                                ? 'border-teal-500 text-teal-500'
                                : m.action === 'REPORTED_MISSING' || m.action === 'REPORTED_DAMAGED'
                                ? 'border-rose-500 text-rose-500'
                                : 'border-amber-500 text-amber-500'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          </div>

                          {/* Event content */}
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs text-xs space-y-1">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                {m.action.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDateTime(m.timestamp)}
                              </span>
                            </div>

                            {/* Details by action */}
                            {m.action === 'ISSUED' && (
                              <div className="text-slate-600 dark:text-slate-300">
                                Issued to <strong className="text-slate-900 dark:text-white">{m.workerName || 'Worker'}</strong> for site{' '}
                                <strong className="text-slate-900 dark:text-white">{m.projectName || 'Site'}</strong> ({m.quantity || 1} unit)
                              </div>
                            )}

                            {m.action === 'TRANSFERRED' && (
                              <div className="text-slate-600 dark:text-slate-300">
                                Transferred from <strong className="text-slate-900 dark:text-white">{m.fromProjectName || 'Previous Site'}</strong> to{' '}
                                <strong className="text-slate-900 dark:text-white">{m.toProjectName || 'New Site'}</strong>.
                                {m.workerName && <span> (Worker: {m.workerName})</span>}
                              </div>
                            )}

                            {(m.action === 'RETURNED' || m.action === 'PARTIALLY_RETURNED') && (
                              <div className="text-slate-600 dark:text-slate-300">
                                Returned by <strong className="text-slate-900 dark:text-white">{m.workerName || 'Worker'}</strong>. Condition:{' '}
                                <strong className="text-slate-900 dark:text-white">{m.condition || 'GOOD'}</strong>
                              </div>
                            )}

                            {m.action === 'REPORTED_MISSING' && (
                              <div className="text-rose-700 dark:text-rose-300">
                                <strong>Reason:</strong> {m.reason || m.notes}
                              </div>
                            )}

                            {m.action === 'REPORTED_DAMAGED' && (
                              <div className="text-amber-700 dark:text-amber-300">
                                <strong>Damage ({m.damageType}):</strong> {m.notes}
                              </div>
                            )}

                            {m.notes && m.action !== 'REPORTED_MISSING' && m.action !== 'REPORTED_DAMAGED' && (
                              <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                                {m.notes}
                              </p>
                            )}

                            {m.actorName && (
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                                Recorded by {m.actorName}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: REGISTER NEW TOOL (NO PHOTOS / IMAGE UPLOADS)
      ========================================================================== */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register New Tool / Machinery in Inventory"
      >
        <form onSubmit={handleRegisterTool} className="space-y-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
            A unique Tool ID (e.g. <strong>FC-TOOL-XXXX</strong>) will be generated automatically upon registration.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tool Name *
            </label>
            <input
              type="text"
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Bosch Heavy Duty Rotary Hammer Drill 26mm"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={regCategory}
                onChange={(e) => setRegCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                {TOOL_CATEGORIES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Initial Condition *
              </label>
              <select
                value={regCondition}
                onChange={(e) => setRegCondition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="NEW">New (Brand New / Factory Packed)</option>
                <option value="GOOD">Good (Operational & Clean)</option>
                <option value="FAIR">Fair (Visible Wear / Operational)</option>
                <option value="DAMAGED">Damaged (Requires Repair)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quantity (pcs) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={regQuantity}
                onChange={(e) => setRegQuantity(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Brand / Make
              </label>
              <input
                type="text"
                value={regBrand}
                onChange={(e) => setRegBrand(e.target.value)}
                placeholder="e.g. Bosch, Makita, Dewalt"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                value={regCost}
                onChange={(e) => setRegCost(e.target.value)}
                placeholder="0"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tool Description / Serial Number (Optional)
            </label>
            <textarea
              rows={2}
              value={regDescription}
              onChange={(e) => setRegDescription(e.target.value)}
              placeholder="e.g. Serial #SN-98219. Includes hard carrying case, 3 SDS drill bits, and side handle."
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={regSubmitting}>
              {regSubmitting ? 'Registering...' : 'Register Tool'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL 2: ISSUE TOOL TO WORKER & PROJECT
      ========================================================================== */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Tool to Worker & Project"
      >
        {issueTargetTool && (
          <form onSubmit={handleSubmitIssue} className="space-y-4">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/40 p-3 text-xs space-y-1">
              <div>
                Tool: <strong className="text-slate-900 dark:text-white">{issueTargetTool.name}</strong> ({issueTargetTool.toolCode})
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Available to Issue:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {Math.max(1, (issueTargetTool.quantity || 1) - (issueTargetTool.issuedQuantity || 0))} unit(s)
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Worker *
                </label>
                <select
                  required
                  value={issueWorkerId}
                  onChange={(e) => setIssueWorkerId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {workers.map((w) => {
                    const id = w.userId?._id || w._id;
                    const name = w.userId?.name || w.name;
                    return (
                      <option key={id} value={id}>
                        {name} ({w.workerCode || 'WRK'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project / Site *
                </label>
                <select
                  required
                  value={issueProjectId}
                  onChange={(e) => setIssueProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.projectCode || 'PROJ'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Issue Date *
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Expected Return
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quantity (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, (issueTargetTool.quantity || 1) - (issueTargetTool.issuedQuantity || 0))}
                  required
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Condition at Issue
              </label>
              <select
                value={issueCondition}
                onChange={(e) => setIssueCondition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="GOOD">Good (Fully Operational)</option>
                <option value="NEW">New (Brand New)</option>
                <option value="FAIR">Fair (Operational with Cosmetic Scratches)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custody Notes (Optional)
              </label>
              <input
                type="text"
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="e.g. Issued for Wardrobe modular carcass fixing"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setIssueModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={issueSubmitting}>
                {issueSubmitting ? 'Issuing...' : 'Confirm Issue'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 3: TRANSFER TOOL BETWEEN SITES
      ========================================================================== */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Tool to Another Project / Site"
      >
        {transferTargetTool && (
          <form onSubmit={handleSubmitTransfer} className="space-y-4">
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 p-3.5 text-xs space-y-1.5">
              <div>
                Tool: <strong className="text-slate-900 dark:text-white">{transferTargetTool.name}</strong> ({transferTargetTool.toolCode})
              </div>
              <div>
                Current Site: <strong className="text-indigo-900 dark:text-indigo-300">{transferTargetTool.currentAssignment?.projectName || 'Site'}</strong>
              </div>
              <div>
                Current Worker: <strong className="text-slate-800 dark:text-slate-200">{transferTargetTool.currentAssignment?.workerName || 'Worker'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Project Site *
                </label>
                <select
                  required
                  value={transferToProjectId}
                  onChange={(e) => setTransferToProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.projectCode || 'SITE'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Assigned Worker (Optional)
                </label>
                <select
                  value={transferToWorkerId}
                  onChange={(e) => setTransferToWorkerId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Keep Current Worker</option>
                  {workers.map((w) => {
                    const id = w.userId?._id || w._id;
                    const name = w.userId?.name || w.name;
                    return (
                      <option key={id} value={id}>
                        {name} ({w.workerCode || 'WRK'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transfer Date *
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transfer Reason *
              </label>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Wardrobe installation completed; urgently needed for kitchen assembly at site B"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Handed over directly at Site B"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={transferSubmitting}>
                {transferSubmitting ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 4: RETURN TOOL
      ========================================================================== */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Record Tool Return"
      >
        {returnTargetTool && (
          <form onSubmit={handleSubmitReturn} className="space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/40 p-3.5 text-xs space-y-1">
              <div>
                Tool: <strong className="text-slate-900 dark:text-white">{returnTargetTool.name}</strong> ({returnTargetTool.toolCode})
              </div>
              <div>
                Returning Worker:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {returnTargetTool.currentAssignment?.workerName || 'Worker'}
                </strong>
              </div>
              <div>
                From Site:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {returnTargetTool.currentAssignment?.projectName || 'Site'}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tool Condition on Return *
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="GOOD">Good (Operational & Clean)</option>
                  <option value="DAMAGED">Damaged (Requires Repair / Defective)</option>
                  <option value="MISSING">Missing (Lost on Site)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Units Returning *
                </label>
                <input
                  type="number"
                  min="1"
                  max={returnTargetTool.currentAssignment?.quantity || 1}
                  required
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Return Date *
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            {(returnCondition === 'DAMAGED' || returnCondition === 'MISSING') && (
              <div>
                <label className="block text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Damage / Defect Notes *
                </label>
                <textarea
                  required
                  rows={2}
                  value={returnDamageNotes}
                  onChange={(e) => setReturnDamageNotes(e.target.value)}
                  placeholder="Describe damage observed upon return (e.g. cracked base plate, motor smoking, broken switch)..."
                  className="mt-1 block w-full rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                General Notes (Optional)
              </label>
              <input
                type="text"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. Checked in workshop rack A2"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={returnSubmitting}>
                {returnSubmitting ? 'Recording...' : 'Confirm Return'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 5: REPORT MISSING TOOL
      ========================================================================== */}
      <Modal
        isOpen={missingModalOpen}
        onClose={() => setMissingModalOpen(false)}
        title="Report Tool Missing / Lost"
      >
        {missingTargetTool && (
          <form onSubmit={handleSubmitMissing} className="space-y-4">
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/40 p-3.5 text-xs space-y-1">
              <div>
                Tool: <strong className="text-slate-900 dark:text-white">{missingTargetTool.name}</strong> ({missingTargetTool.toolCode})
              </div>
              <div>
                Last Assigned Worker:{' '}
                <strong>{missingTargetTool.currentAssignment?.workerName || 'None'}</strong>
              </div>
              <div>
                Last Known Site:{' '}
                <strong>{missingTargetTool.currentAssignment?.projectName || 'Workshop'}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date Missing Noticed *
              </label>
              <input
                type="date"
                required
                value={missingDate}
                onChange={(e) => setMissingDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tool Condition When Last Seen
              </label>
              <select
                value={missingConditionLastSeen}
                onChange={(e) => setMissingConditionLastSeen(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason / Circumstances (Mandatory) *
              </label>
              <textarea
                required
                rows={3}
                value={missingReason}
                onChange={(e) => setMissingReason(e.target.value)}
                placeholder="Describe what occurred, who had possession last, site location searched..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setMissingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={missingSubmitting}>
                {missingSubmitting ? 'Reporting...' : 'Submit Missing Report'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 6: RESOLVE MISSING TOOL (MARK FOUND)
      ========================================================================== */}
      <Modal
        isOpen={resolveMissingModalOpen}
        onClose={() => setResolveMissingModalOpen(false)}
        title="Resolve Missing Tool Report"
      >
        {resolveMissingTargetTool && (
          <form onSubmit={handleSubmitResolveMissing} className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
              Resolving missing report for{' '}
              <strong className="text-slate-900 dark:text-white">{resolveMissingTargetTool.name}</strong> ({resolveMissingTargetTool.toolCode})
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resolution Status *
              </label>
              <select
                value={resolveMissingStatus}
                onChange={(e) => setResolveMissingStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="FOUND">Found (Recovered & Verified)</option>
                <option value="CLOSED">Closed (Unrecovered / Permanently Written Off)</option>
              </select>
            </div>

            {resolveMissingStatus === 'FOUND' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verified Physical Condition *
                </label>
                <select
                  value={resolveMissingCondition}
                  onChange={(e) => setResolveMissingCondition(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="GOOD">Good (Restore to Available)</option>
                  <option value="DAMAGED">Damaged (Move to Damaged / Repair Required)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resolution Notes
              </label>
              <textarea
                rows={2}
                value={resolveMissingNotes}
                onChange={(e) => setResolveMissingNotes(e.target.value)}
                placeholder="Where was it found, who recovered it, condition notes..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setResolveMissingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={resolveMissingSubmitting}>
                {resolveMissingSubmitting ? 'Saving...' : 'Confirm Resolution'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 7: REPORT TOOL DAMAGE
      ========================================================================== */}
      <Modal
        isOpen={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        title="Report Tool Damage / Defect"
      >
        {damageTargetTool && (
          <form onSubmit={handleSubmitDamage} className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/40 p-3 text-xs space-y-1">
              <div>
                Tool: <strong className="text-slate-900 dark:text-white">{damageTargetTool.name}</strong> ({damageTargetTool.toolCode})
              </div>
              <div>
                Responsible Worker:{' '}
                <strong>{damageTargetTool.currentAssignment?.workerName || 'Workshop'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Damage Type *
                </label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {DAMAGE_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date Damaged *
                </label>
                <input
                  type="date"
                  required
                  value={damageDate}
                  onChange={(e) => setDamageDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Detailed Damage Description (Mandatory) *
              </label>
              <textarea
                required
                rows={3}
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="e.g. Motor overheated during edge trimming and started sparking; requires armature rewinding or replacement."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDamageModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={damageSubmitting}>
                {damageSubmitting ? 'Reporting...' : 'Submit Damage Report'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 8: RESOLVE DAMAGE (MARK USABLE AGAIN OR RETIRE)
      ========================================================================== */}
      <Modal
        isOpen={resolveDamageModalOpen}
        onClose={() => setResolveDamageModalOpen(false)}
        title="Resolve Tool Damage / Confirm Repaired"
      >
        {resolveDamageTargetTool && (
          <form onSubmit={handleSubmitResolveDamage} className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
              Resolving damage for <strong className="text-slate-900 dark:text-white">{resolveDamageTargetTool.name}</strong> ({resolveDamageTargetTool.toolCode})
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resolution Action *
              </label>
              <select
                value={resolveDamageStatus}
                onChange={(e) => setResolveDamageStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="USABLE_AGAIN">Usable Again (Repaired / Serviced - Restore to Available)</option>
                <option value="RETIRED">Decommission & Retire (Irreparable - Deactivate Permanently)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resolution / Repair Notes
              </label>
              <textarea
                rows={2}
                value={resolveDamageNotes}
                onChange={(e) => setResolveDamageNotes(e.target.value)}
                placeholder="Details of repair done, parts replaced, technician invoice ref..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setResolveDamageModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={resolveDamageSubmitting}>
                {resolveDamageSubmitting ? 'Saving...' : 'Confirm Resolution'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL 9: EDIT TOOL DETAILS
      ========================================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Tool Details"
      >
        {editingTool && (
          <form onSubmit={handleUpdateTool} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tool Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {TOOL_CATEGORIES_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Brand / Make
                </label>
                <input
                  type="text"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Model Number
              </label>
              <input
                type="text"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="editIsActive" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Active in Inventory (Uncheck to decommission / retire this tool)
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={editSubmitting}>
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
