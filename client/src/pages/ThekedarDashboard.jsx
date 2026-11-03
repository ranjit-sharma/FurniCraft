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
    Promise.all([fetchDashboard(), fetchPendingAttendance()]).finally(() => setLoading(false));
  }, []);

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
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">{t('dashboard.pendingAttendance') || 'Pending Approvals'}</span>
            <CheckCircle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-2">
            {pendingAttendance.length + pendingTasks.length}
          </div>
          <span className="text-[11px] text-amber-800 dark:text-amber-400">
            {pendingAttendance.length} {t('nav.attendance') || 'Attendance'} • {pendingTasks.length} {t('nav.tasks') || 'Tasks'}
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

      {/* Pending Attendance Approvals Table */}
      <Card
        title={`${t('thekedarDashboard.pendingApprovalsTitle') || 'Pending Attendance Approvals'} (${pendingAttendance.length})`}
        subtitle={t('thekedarDashboard.pendingApprovalsSubtitle') || 'Review worker shift submissions and correction requests'}
      >
        {pendingAttendance.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-700 dark:text-slate-400 italic">
            {t('thekedarDashboard.allReviewed') || 'All attendance submissions and corrections are currently reviewed!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{t('thekedarDashboard.tableWorker') || 'Worker'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableProject') || 'Project'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableDate') || 'Date'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableCode') || 'Code'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableCalculated') || 'Calculated'}</th>
                  <th className="p-3">{t('thekedarDashboard.tableStatus') || 'Status'}</th>
                  <th className="p-3 text-right">{t('thekedarDashboard.tableActions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingAttendance.map((att) => (
                  <tr key={att._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{att.workerId?.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{att.workerId?.phone}</span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{att.projectId?.name}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{att.date}</td>
                    <td className="p-3">
                      {(() => {
                        const currentCode = approvalCodes[att._id] || att.code;
                        return (
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <select
                              value={currentCode}
                              onChange={(e) => setApprovalCodes((prev) => ({ ...prev, [att._id]: e.target.value }))}
                              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="P">P (1.0x Full Day)</option>
                              <option value="HALF">HALF (0.5x Half Day)</option>
                              <option value="P1/5">P1/5 (1.5x Overtime)</option>
                              <option value="PP">PP (2.0x Double Shift)</option>
                              <option value="ABSENT">ABSENT (0x)</option>
                              <option value="LEAVE">LEAVE (0x)</option>
                            </select>
                            {att.code !== currentCode && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                Submitted: {att.code}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {(() => {
                        const MULTIPLIERS = { P: 1.0, HALF: 0.5, 'P1/5': 1.5, PP: 2.0, ABSENT: 0, LEAVE: 0 };
                        const currentCode = approvalCodes[att._id] || att.code;
                        const mult = MULTIPLIERS[currentCode] ?? att.wageMultiplier ?? 1.0;
                        const wage = att.applicableDailyWage || 800;
                        const computed = Math.round(wage * mult);
                        return (
                          <div>
                            <span className="font-bold text-emerald-800 dark:text-emerald-400">₹{computed}</span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">₹{wage}/d ({mult}x)</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <Badge variant={att.approvalStatus} size="sm">{att.approvalStatus}</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApproveAttendance(att._id)}
                      >
                        {t('common.approve') || 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setRejectAttendanceId(att._id);
                          setRejectModalOpen(true);
                        }}
                      >
                        {t('common.reject') || 'Reject'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
    </div>
  );
};
