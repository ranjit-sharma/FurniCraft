import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  CheckCircle,
  XCircle,
  IndianRupee,
  Wrench,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Download,
  FileText,
  Clock,
  Plus,
  UserPlus,
  Edit,
  Calendar,
  Search,
  Briefcase,
  Phone,
  Shield,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const ThekedarDashboard = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [approvingTaskId, setApprovingTaskId] = useState(null);
  const [taskReworkModalOpen, setTaskReworkModalOpen] = useState(false);
  const [selectedTaskToRework, setSelectedTaskToRework] = useState(null);
  const [taskReworkNotes, setTaskReworkNotes] = useState('');
  const [message, setMessage] = useState(null);
  const [approvalCodes, setApprovalCodes] = useState({});

  // Disburse Modal State
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [receiptReference, setReceiptReference] = useState('');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectAttendanceId, setRejectAttendanceId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Dedicated Workforce Management State
  const [workersList, setWorkersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('ALL');

  // Add Worker Modal State
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerTrade, setNewWorkerTrade] = useState('Mistry');
  const [newWorkerWage, setNewWorkerWage] = useState('750');
  const [newWorkerProjectId, setNewWorkerProjectId] = useState('');
  const [addWorkerSubmitting, setAddWorkerSubmitting] = useState(false);

  // Edit Worker Modal State
  const [editWorkerModalOpen, setEditWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerPhone, setEditWorkerPhone] = useState('');
  const [editWorkerTrade, setEditWorkerTrade] = useState('Mistry');
  const [editWorkerWage, setEditWorkerWage] = useState('');
  const [editWorkerAddress, setEditWorkerAddress] = useState('');
  const [editWorkerSubmitting, setEditWorkerSubmitting] = useState(false);

  // Mark Daily Attendance Modal State
  const [markAttendanceModalOpen, setMarkAttendanceModalOpen] = useState(false);
  const [attendanceWorkerId, setAttendanceWorkerId] = useState('');
  const [attendanceProjectId, setAttendanceProjectId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceShift, setAttendanceShift] = useState('GENERAL');
  const [attendanceCode, setAttendanceCode] = useState('P');
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [markAttendanceSubmitting, setMarkAttendanceSubmitting] = useState(false);

  const fetchWorkforceData = async () => {
    try {
      const [wRes, pRes] = await Promise.all([
        api.get('/users/workers'),
        api.get('/projects'),
      ]);
      const wList = wRes.data?.workers || [];
      const pList = pRes.data?.projects || [];
      setWorkersList(wList);
      setProjectsList(pList);
      if (wList.length > 0) {
        setAttendanceWorkerId((prev) => prev || wList[0].userId?._id || wList[0]._id);
      }
      if (pList.length > 0) {
        setAttendanceProjectId((prev) => prev || pList[0]._id);
      }
    } catch (err) {
      console.error('Workforce fetch error:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setData(res.data);
      if (res.data?.pendingTaskApprovals) {
        setPendingTasks(res.data.pendingTaskApprovals);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingAttendance = async () => {
    try {
      const now = new Date();
      const res = await api.get(`/attendance/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      const unapproved = res.data?.records?.filter(
        (r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'CORRECTION_REQUESTED'
      ) || [];
      setPendingAttendance(unapproved);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchPendingAttendance(), fetchWorkforceData()]).finally(() => setLoading(false));
  }, []);

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
        defaultDailyWage: parseFloat(newWorkerWage) || 750,
        projectId: newWorkerProjectId || undefined,
      });
      const generatedCode = res.data?.data?.worker?.profile?.workerCode || 'FC-WRK';
      setMessage({ type: 'success', text: `Craftsman ${newWorkerName} added with ID ${generatedCode}!` });
      setAddWorkerModalOpen(false);
      setNewWorkerName('');
      setNewWorkerPhone('');
      setNewWorkerTrade('Mistry');
      fetchWorkforceData();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create worker' });
    } finally {
      setAddWorkerSubmitting(false);
    }
  };

  const handleOpenEditWorker = (worker) => {
    const userId = worker.userId?._id || worker._id;
    setEditingWorkerId(userId);
    setEditWorkerName(worker.userId?.name || worker.name || '');
    setEditWorkerPhone(worker.userId?.phone || worker.phone || '');
    setEditWorkerTrade(worker.skills?.[0] || 'Mistry');
    setEditWorkerWage(worker.defaultDailyWage || '750');
    setEditWorkerAddress(worker.address || '');
    setEditWorkerModalOpen(true);
  };

  const handleUpdateWorker = async (e) => {
    e.preventDefault();
    if (!editingWorkerId) return;
    try {
      setEditWorkerSubmitting(true);
      await api.put(`/users/workers/${editingWorkerId}`, {
        name: editWorkerName.trim(),
        phone: editWorkerPhone.trim(),
        trade: editWorkerTrade,
        defaultDailyWage: parseFloat(editWorkerWage) || undefined,
        address: editWorkerAddress,
      });
      setMessage({ type: 'success', text: `Worker details for ${editWorkerName} updated successfully!` });
      setEditWorkerModalOpen(false);
      fetchWorkforceData();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update worker' });
    } finally {
      setEditWorkerSubmitting(false);
    }
  };

  const handleToggleWorkerStatus = async (worker) => {
    const userId = worker.userId?._id || worker._id;
    const currentStatus = worker.userId?.status || worker.status;
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/users/workers/${userId}/status`, { status: nextStatus });
      setMessage({ type: 'success', text: `Worker ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully!` });
      fetchWorkforceData();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update worker status' });
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceWorkerId || !attendanceProjectId) {
      setMessage({ type: 'error', text: 'Please select both worker and project.' });
      return;
    }
    try {
      setMarkAttendanceSubmitting(true);
      await api.post('/attendance', {
        workerId: attendanceWorkerId,
        projectId: attendanceProjectId,
        date: attendanceDate,
        shift: attendanceShift,
        code: attendanceCode,
        notes: attendanceNotes,
      });
      setMessage({ type: 'success', text: `Attendance saved & authorized for ${attendanceDate} (${attendanceCode})!` });
      setMarkAttendanceModalOpen(false);
      setAttendanceNotes('');
      fetchWorkforceData();
      fetchPendingAttendance();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to mark attendance' });
    } finally {
      setMarkAttendanceSubmitting(false);
    }
  };

  const handleApproveAttendance = async (id) => {
    try {
      const codeToApprove = approvalCodes[id] || pendingAttendance.find((a) => a._id === id)?.code || 'P';
      setPendingAttendance((prev) => prev.filter((a) => a._id !== id));
      await api.patch(`/attendance/${id}/approve`, { code: codeToApprove });
      setMessage({ type: 'success', text: `Attendance approved successfully as ${codeToApprove}!` });
      fetchPendingAttendance();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      fetchPendingAttendance();
    }
  };

  const handleRejectAttendance = async (e) => {
    e.preventDefault();
    try {
      const id = rejectAttendanceId;
      setPendingAttendance((prev) => prev.filter((a) => a._id !== id));
      await api.patch(`/attendance/${id}/reject`, { reason: rejectionReason });
      setMessage({ type: 'success', text: 'Attendance rejected.' });
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchPendingAttendance();
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      fetchPendingAttendance();
    }
  };

  const handleReviewAdvance = async (requestId, status) => {
    try {
      await api.patch(`/finance/advance-requests/${requestId}/review`, { status });
      setMessage({ type: 'success', text: `Advance request marked as ${status}!` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDisburseAdvance = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/finance/advance-requests/${selectedRequest._id}/disburse`, {
        paymentMethod,
        receiptReference,
      });
      setMessage({ type: 'success', text: 'Advance disbursed and transaction recorded!' });
      setDisburseModalOpen(false);
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleApproveTask = async (taskId, itemName) => {
    try {
      setApprovingTaskId(taskId);
      setPendingTasks((prev) => prev.filter((t) => t._id !== taskId));
      await api.patch(`/furniture-tasks/${taskId}/verify`);
      setMessage({ type: 'success', text: `Task "${itemName || 'item'}" successfully checked and approved!` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve task' });
      fetchDashboard();
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleOpenReworkModal = (task) => {
    setSelectedTaskToRework(task);
    setTaskReworkNotes('');
    setTaskReworkModalOpen(true);
  };

  const handleSubmitTaskRework = async (e) => {
    e.preventDefault();
    if (!selectedTaskToRework) return;
    try {
      const taskId = selectedTaskToRework._id;
      setPendingTasks((prev) => prev.filter((t) => t._id !== taskId));
      await api.patch(`/furniture-tasks/${taskId}/verify`, {
        status: 'REWORK_NEEDED',
        defectNotes: taskReworkNotes || 'Rework requested by Thekedar',
      });
      setMessage({ type: 'success', text: `Rework feedback sent to worker for "${selectedTaskToRework.furnitureItemName}".` });
      setTaskReworkModalOpen(false);
      setSelectedTaskToRework(null);
      setTaskReworkNotes('');
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to request rework' });
      fetchDashboard();
    }
  };

  const handleExportAttendancePDF = () => {
    window.open(`/api/v1/reports/export/attendance?lang=${language}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const activeProjects = data?.activeProjects || [];
  const pendingAdvances = data?.pendingAdvanceRequests || [];
  const issuedTools = data?.issuedTools || [];
  const recentDisputes = data?.recentDisputes || [];

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Thekedar Management Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-900/30 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xl shadow-inner">
            <i className="fa-solid fa-user"></i>
          </div>
          <div>
            <span className="inline-block rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30">
              {t('profile.thekedarDesc') || 'Contractor Command Center'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5">{t('nav.dashboard') || 'Thekedar Dashboard'}</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">{t('common.tagline') || 'Manage modern furniture projects, workforce assignments, and net settlements.'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline-amber"
            size="sm"
            onClick={() => setMarkAttendanceModalOpen(true)}
            icon={Calendar}
            className="w-full sm:w-auto justify-center bg-amber-500/10 border-amber-400/40 text-amber-300 hover:bg-amber-500/20"
          >
            Mark Daily Attendance
          </Button>
          <Button
            variant="outline-amber"
            size="sm"
            onClick={() => setAddWorkerModalOpen(true)}
            icon={UserPlus}
            className="w-full sm:w-auto justify-center bg-amber-500/10 border-amber-400/40 text-amber-300 hover:bg-amber-500/20"
          >
            Add Craftsman
          </Button>
          <Button
            variant="outline-amber"
            size="sm"
            onClick={handleExportAttendancePDF}
            icon={FileText}
            className="w-full sm:w-auto justify-center"
          >
            {t('calendar.exportPdf') || 'Export Attendance (PDF)'}
          </Button>
          <Link to="/workers" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              icon={IndianRupee}
              className="w-full sm:w-auto justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md hover:shadow-lg transition-all"
            >
              {t('thekedar.managedWorkers') || 'Workers'} & {t('dashboard.settleNet') || 'Net Pay'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.activeProjects') || 'Active Projects'}</span>
            <FolderKanban className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.activeProjectsCount || 0}</div>
          <span className="text-[11px] text-slate-700 dark:text-slate-400">{t('projects.furnitureScope') || 'Kitchens, wardrobes & panels'}</span>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('thekedar.managedWorkers') || 'Managed Workers'}</span>
            <Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.managedWorkersCount || 0}</div>
          <span className="text-[11px] text-slate-700 dark:text-slate-400">{t('dashboard.totalWorkforce') || 'Carpenters, fitters, polishers'}</span>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">{t('projects.tasksAwaitingReview') || 'Pending Task Reviews'}</span>
            <CheckCircle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-2">
            {pendingTasks.length}
          </div>
          <span className="text-[11px] text-amber-800 dark:text-amber-400">
            {pendingTasks.length} {t('nav.tasks') || 'Quality checks & tasks'}
          </span>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">{t('dashboard.netBalance') || 'Total Unpaid Salary'}</span>
            <IndianRupee className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-950 dark:text-blue-200 mt-2">₹{metrics.totalOutstandingSalary?.toLocaleString('en-IN') || 0}</div>
          <span className="text-[11px] text-blue-800 dark:text-blue-400">{t('dashboard.outstandingAdvance') || 'Advances'}: ₹{metrics.totalOutstandingAdvances?.toLocaleString('en-IN') || 0}</span>
        </Card>
      </div>

      {/* Dedicated Thekedar-Managed Workforce Hub */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Workforce & Craftsmen Management
              </h3>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                {workersList.length} Managed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Workers are managed data records under your contract. Add workers, assign projects, configure wages, and log daily shifts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline-amber"
              icon={Calendar}
              onClick={() => setMarkAttendanceModalOpen(true)}
              className="text-xs"
            >
              Mark Attendance
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={UserPlus}
              onClick={() => setAddWorkerModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs"
            >
              Add New Worker
            </Button>
            <Link to="/workers">
              <Button size="sm" variant="secondary" className="text-xs">
                Full Workforce Page &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              placeholder="Search by name, ID, phone, skill..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setWorkerStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  workerStatusFilter === st
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL' ? 'All Workers' : (st === 'ACTIVE' ? 'Active Only' : 'Inactive')}
              </button>
            ))}
          </div>
        </div>

        {/* Managed Workers Table */}
        {workersList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No Workers Added Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start building your workforce roster by adding your carpenters, polishers, and site craftsmen.
            </p>
            <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setAddWorkerModalOpen(true)}>
              Add First Craftsman
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 font-bold">Worker ID</th>
                  <th className="p-3 font-bold">Craftsman</th>
                  <th className="p-3 font-bold">Trade / Skill</th>
                  <th className="p-3 font-bold">Daily Wage</th>
                  <th className="p-3 font-bold">Unpaid Earned</th>
                  <th className="p-3 font-bold">Advance</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workersList
                  .filter((w) => {
                    const status = w.userId?.status || w.status || 'ACTIVE';
                    const matchesStatus = workerStatusFilter === 'ALL' || status === workerStatusFilter;
                    const q = workerSearch.toLowerCase().trim();
                    const matchesSearch =
                      !q ||
                      w.userId?.name?.toLowerCase().includes(q) ||
                      w.name?.toLowerCase().includes(q) ||
                      w.workerCode?.toLowerCase().includes(q) ||
                      w.userId?.phone?.toLowerCase().includes(q) ||
                      w.skills?.some((s) => s.toLowerCase().includes(q));
                    return matchesStatus && matchesSearch;
                  })
                  .slice(0, 10)
                  .map((w) => {
                    const userId = w.userId?._id || w._id;
                    const name = w.userId?.name || w.name || 'Unnamed';
                    const phone = w.userId?.phone || w.phone || 'No phone';
                    const status = w.userId?.status || w.status || 'ACTIVE';
                    const code = w.workerCode || 'FC-WRK';
                    const wage = w.defaultDailyWage || 750;
                    const earned = w.unpaidEarnings || 0;
                    const advance = w.outstandingAdvanceBalance || 0;
                    const primarySkill = w.skills?.[0] || 'Mistry';

                    return (
                      <tr key={w._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {code}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <div>{name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{phone}</div>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px] border border-slate-200 dark:border-slate-700">
                            {primarySkill}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                          ₹{wage}/day
                        </td>
                        <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{earned.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-bold text-rose-700 dark:text-rose-400">
                          ₹{advance.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleWorkerStatus(w)}
                            title="Click to toggle status"
                            className="cursor-pointer"
                          >
                            <Badge variant={status === 'ACTIVE' ? 'success' : 'danger'}>
                              {status === 'ACTIVE' ? 'Active' : 'Suspended'}
                            </Badge>
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setAttendanceWorkerId(userId);
                                setMarkAttendanceModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 transition-colors cursor-pointer text-[10px]"
                              title="Mark Daily Attendance"
                            >
                              Attendance
                            </button>
                            <button
                              onClick={() => handleOpenEditWorker(w)}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors cursor-pointer text-[10px]"
                              title="Edit Worker Details"
                            >
                              Edit
                            </button>
                            <Link
                              to={`/workers`}
                              className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 transition-colors text-[10px]"
                              title="360° History & Pay Net"
                            >
                              Pay / View
                            </Link>
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

      {/* Pending Task Approvals & Quality Inspection Card */}
      <Card
        title={`${t('projects.tasksAwaitingReview') || 'Pending Task Approvals & Quality Checks'} (${pendingTasks.length})`}
        subtitle={t('projects.awaitingApproval') || 'Review finished furniture craft tasks submitted by workers for supervisor inspection and approval'}
      >
        {pendingTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-700 dark:text-slate-400 italic">
            {t('projects.noTasks') || 'No completed tasks awaiting approval. All worker task submissions are verified!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t('thekedarDashboard.tableWorker') || 'Worker Craftsman'}</th>
                  <th className="p-3">{t('projectDetail.tasks') || 'Furniture Item / Task'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableProject') || 'Project Site'}</th>
                  <th className="p-3">{t('expenses.stage') || 'Stage'}</th>
                  <th className="p-3">{t('thekedarDashboard.unitsCompleted', 'Units Completed')}</th>
                  <th className="p-3">{t('thekedarDashboard.tableStatus') || 'Status'}</th>
                  <th className="p-3 text-right">{t('thekedarDashboard.tableActions') || 'Inspection & Approval'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{task.assignedWorkerId?.name || (t('thekedarDashboard.tableWorker') || 'Assigned Worker')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{task.assignedWorkerId?.phone}</span>
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-900 dark:text-white block font-semibold">{task.furnitureItemName}</strong>
                      {task.notes && <span className="text-[10px] text-slate-500 dark:text-slate-400 italic block">{task.notes}</span>}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-amber-800 dark:text-amber-400 block text-[11px]">{task.projectId?.projectCode}</span>
                      <span>{task.projectId?.name}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="default" size="sm">{task.taskType}</Badge>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {task.completedUnits || task.plannedUnits} / {task.plannedUnits} {task.unitMetric || 'pcs'}
                    </td>
                    <td className="p-3">
                      <Badge variant="warning" size="sm">COMPLETED</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="success"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        loading={approvingTaskId === task._id}
                        onClick={() => handleApproveTask(task._id, task.furnitureItemName)}
                        icon={CheckCircle}
                      >
                        {t('projects.qualityChecked') || 'Approve & Verify ✓'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleOpenReworkModal(task)}
                      >
                        {t('thekedarDashboard.reworkModalTitle') || 'Request Rework'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Grid: Pending Advance Requests & Active Modern Furniture Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Advance Requests */}
        <Card
          title={`${t('dashboard.pendingAdvance') || 'Pending Advance Requests'} (${pendingAdvances.length})`}
          subtitle={t('workerModals.advanceModalTitle') || 'Cash or UPI advance requests from site workers'}
        >
          {pendingAdvances.length === 0 ? (
            <p className="text-xs text-slate-700 dark:text-slate-400 py-4 italic">{t('dashboard.pendingAdvance')}: 0</p>
          ) : (
            <div className="space-y-3">
              {pendingAdvances.map((adv) => (
                <div key={adv._id} className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                  adv.exceedsLimit
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{adv.workerId?.name}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <IndianRupee className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                        <span>{t('worker.reqAdvBadge') || 'Req Adv'}: ₹{adv.amount?.toLocaleString('en-IN')}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{t('common.reason') || 'Reason'}: {adv.reason}</p>
                    <span className="text-[11px] text-slate-700 dark:text-slate-400">{t('thekedarDashboard.tableProject') || 'Project'}: {adv.projectId?.name || 'General Workshop'}</span>

                    {/* Flashing Alert if worker has reached/exceeded ₹10,000 advance limit */}
                    {adv.exceedsLimit ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-100/80 dark:bg-rose-950/60 px-2.5 py-1.5 text-xs font-bold text-rose-800 dark:text-rose-200 animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span>{t('workerModals.advanceLimitReached') || '⚠️ Max Advance Limit Exceeded (₹10,000)!'}</span>
                          <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300 mt-0.5">
                            {t('worker.maxAdvanceNote') || 'Worker cannot take more than ₹10,000 advance'}.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {t('workerModals.currentAdvance') || 'Current Advance'}: ₹{(adv.currentAdvanceBalance || 0).toLocaleString('en-IN')} ({t('worker.remainingLimit') || 'Under ₹10,000 limit'})
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
                    {adv.status === 'PENDING' ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={adv.exceedsLimit}
                          title={adv.exceedsLimit ? "Worker advance exceeds ₹10,000 limit - Cannot Approve" : "Approve advance request"}
                          className={adv.exceedsLimit ? "opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 hover:bg-slate-300" : ""}
                          onClick={() => !adv.exceedsLimit && handleReviewAdvance(adv._id, 'APPROVED')}
                        >
                          {t('common.approve') || 'Approve'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleReviewAdvance(adv._id, 'REJECTED')}>
                          {t('common.reject') || 'Reject'}
                        </Button>
                      </div>
                    ) : adv.status === 'APPROVED' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={adv.exceedsLimit}
                        className={adv.exceedsLimit ? "opacity-40 cursor-not-allowed" : ""}
                        onClick={() => {
                          if (!adv.exceedsLimit) {
                            setSelectedRequest(adv);
                            setDisburseModalOpen(true);
                          }
                        }}
                      >
                        {t('thekedar.disburse') || 'Record Disbursal'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Furniture Projects */}
        <Card title={t('projects.allProjects') || 'Active Furniture Projects'} subtitle={t('projects.furnitureScope') || 'Modular kitchens, wardrobes, and paneling sites'}>
          <div className="space-y-3">
            {activeProjects.map((p) => (
              <div key={p._id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 hover:border-amber-300 dark:hover:border-amber-600 transition-colors">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">{p.projectCode}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-400">{p.projectType.replace('_', ' ')} • {p.clientName}</p>
                </div>
                <Link to={`/projects/${p._id}`}>
                  <Button size="sm" variant="outline">
                    {t('thekedar.viewDetails') || 'View Details'} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Disburse Modal */}
      <Modal isOpen={disburseModalOpen} onClose={() => setDisburseModalOpen(false)} title={t('thekedarDashboard.disburseModalTitle') || 'Record Advance Disbursement'}>
        {selectedRequest && (
          <form onSubmit={handleDisburseAdvance} className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 p-3 text-xs text-amber-900 dark:text-amber-300">
              <div>{t('thekedarDashboard.tableWorker') || 'Worker'}: <span className="font-bold text-slate-900 dark:text-white">{selectedRequest.workerId?.name}</span></div>
              <div>{t('common.amount') || 'Amount'}: <span className="font-bold text-base text-slate-900 dark:text-white">₹{selectedRequest.amount}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.paymentMethod') || 'Disbursement Payment Method'}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.receiptRef') || 'UTR / Receipt Reference Number'}</label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder="e.g. UPI-UTR-298382910"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDisburseModalOpen(false)}>{t('common.cancel') || 'Cancel'}</Button>
              <Button type="submit">{t('thekedarDashboard.confirmDisburse') || 'Confirm Disbursement'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title={t('thekedarDashboard.rejectionModalTitle') || 'Reject Attendance Submission'}>
        <form onSubmit={handleRejectAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('thekedarDashboard.rejectionReason') || 'Reason for Rejection'}</label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Worker was absent from site on afternoon shift, or overtime not authorized..."
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>{t('common.cancel') || 'Cancel'}</Button>
            <Button type="submit" variant="danger">{t('thekedarDashboard.confirmReject') || 'Confirm Rejection'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Request Task Rework */}
      <Modal
        isOpen={taskReworkModalOpen}
        onClose={() => {
          setTaskReworkModalOpen(false);
          setSelectedTaskToRework(null);
          setTaskReworkNotes('');
        }}
        title={t('thekedarDashboard.reworkModalTitle') || 'Request Task Rework / Defect Correction'}
      >
        {selectedTaskToRework && (
          <form onSubmit={handleSubmitTaskRework} className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/50 p-3.5 text-xs text-amber-900 dark:text-amber-300 space-y-1">
              <div>{t('projectDetail.tasks') || 'Furniture Item'}: <strong className="text-slate-900 dark:text-white">{selectedTaskToRework.furnitureItemName}</strong></div>
              <div>{t('thekedarDashboard.tableWorker') || 'Craftsman'}: <strong className="text-slate-900 dark:text-white">{selectedTaskToRework.assignedWorkerId?.name}</strong></div>
              <div>{t('thekedarDashboard.tableProject') || 'Project Site'}: <strong className="text-slate-900 dark:text-white">{selectedTaskToRework.projectId?.name} ({selectedTaskToRework.projectId?.projectCode})</strong></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('thekedarDashboard.reworkNotesLabel') || 'Correction / Rework Instructions for Worker'}
              </label>
              <textarea
                required
                rows={3}
                value={taskReworkNotes}
                onChange={(e) => setTaskReworkNotes(e.target.value)}
                placeholder="Describe what needs to be fixed or adjusted before this task can be approved (e.g. edge alignment gap, screw tightening, finish polishing)..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setTaskReworkModalOpen(false);
                  setSelectedTaskToRework(null);
                  setTaskReworkNotes('');
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" variant="danger">
                {t('thekedarDashboard.sendRework') || 'Submit Rework Request'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
              placeholder="e.g. Ramesh Kumar"
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
                step="50"
                required
                value={newWorkerWage}
                onChange={(e) => setNewWorkerWage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign to Project (Optional)
              </label>
              <select
                value={newWorkerProjectId}
                onChange={(e) => setNewWorkerProjectId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- No initial project --</option>
                {projectsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.projectCode})
                  </option>
                ))}
              </select>
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

      {/* Modal: Edit Worker Details */}
      <Modal
        isOpen={editWorkerModalOpen}
        onClose={() => setEditWorkerModalOpen(false)}
        title="Edit Craftsman Details"
      >
        <form onSubmit={handleUpdateWorker} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editWorkerName}
              onChange={(e) => setEditWorkerName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                value={editWorkerPhone}
                onChange={(e) => setEditWorkerPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trade / Specialty
              </label>
              <select
                value={editWorkerTrade}
                onChange={(e) => setEditWorkerTrade(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="Mistry">Mistry</option>
                <option value="Helper">Helper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Daily Wage Rate (₹/day)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              required
              value={editWorkerWage}
              onChange={(e) => setEditWorkerWage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Address / Notes
            </label>
            <input
              type="text"
              value={editWorkerAddress}
              onChange={(e) => setEditWorkerAddress(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setEditWorkerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={editWorkerSubmitting}>
              {editWorkerSubmitting ? 'Saving...' : 'Update Worker'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Mark Daily Worker Attendance */}
      <Modal
        isOpen={markAttendanceModalOpen}
        onClose={() => setMarkAttendanceModalOpen(false)}
        title="Mark Worker Daily Attendance"
      >
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Worker *
            </label>
            <select
              required
              value={attendanceWorkerId}
              onChange={(e) => setAttendanceWorkerId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            >
              {workersList.map((w) => {
                const id = w.userId?._id || w._id;
                const name = w.userId?.name || w.name;
                const code = w.workerCode || 'WRK';
                return (
                  <option key={id} value={id}>
                    {name} ({code}) - ₹{w.defaultDailyWage || 750}/day
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Furniture Project Site *
            </label>
            <select
              required
              value={attendanceProjectId}
              onChange={(e) => setAttendanceProjectId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            >
              {projectsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.projectCode}) - {p.projectType || 'Custom'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attendance Date *
              </label>
              <input
                type="date"
                required
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shift
              </label>
              <select
                value={attendanceShift}
                onChange={(e) => setAttendanceShift(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="GENERAL">General Shift</option>
                <option value="DAY">Day Shift</option>
                <option value="NIGHT">Night Shift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Attendance Code & Multiplier *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { code: 'P', label: 'Full Day (1.0x)', desc: 'Standard Day' },
                { code: 'HALF', label: 'Half Day (0.5x)', desc: 'Half Shift' },
                { code: 'P1/5', label: 'Overtime (1.5x)', desc: 'Until 9 PM' },
                { code: 'PP', label: 'Double OT (2.0x)', desc: 'Until Midnight' },
                { code: 'ABSENT', label: 'Absent (0.0x)', desc: 'No Wage' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.code}
                  onClick={() => setAttendanceCode(opt.code)}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    attendanceCode === opt.code
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{opt.code}</div>
                  <div className="text-[9px] text-slate-500 font-medium">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shift Notes / Work Details
            </label>
            <input
              type="text"
              value={attendanceNotes}
              onChange={(e) => setAttendanceNotes(e.target.value)}
              placeholder="e.g. Completed kitchen base carcass assembly"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setMarkAttendanceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={markAttendanceSubmitting}>
              {markAttendanceSubmitting ? 'Recording...' : 'Authorize & Save Attendance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
