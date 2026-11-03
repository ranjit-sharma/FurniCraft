import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  Users,
  UserPlus,
  IndianRupee,
  Phone,
  Mail,
  Award,
  Edit,
  Activity,
  CheckSquare,
  Calendar,
  Wrench,
  Receipt,
  Clock,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  Hammer,
  UserX,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Check,
  X,
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const WorkersPage = () => {
  const { user, isOwner, isThekedar } = useAuth();
  const { t, language } = useLanguage();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Register Worker Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerPassword, setWorkerPassword] = useState('Worker@2026');
  const [defaultWage, setDefaultWage] = useState('750');
  const [thekedarsList, setThekedarsList] = useState([]);
  const [selectedThekedarId, setSelectedThekedarId] = useState('');

  // Update Wage Modal
  const [wageModalOpen, setWageModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [newWage, setNewWage] = useState('');
  const [wageReason, setWageReason] = useState('');

  // Worker 360° Activity Modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityWorker, setActivityWorker] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'attendance' | 'payments' | 'activities'

  // Pay Net Amount Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payWorker, setPayWorker] = useState(null);
  const [payBaseEarned, setPayBaseEarned] = useState(0);
  const [payAdvanceDeduction, setPayAdvanceDeduction] = useState(0);
  const [payFoodDeduction, setPayFoodDeduction] = useState(0);
  const [payRoomRentDeduction, setPayRoomRentDeduction] = useState(0);
  const [payAdditionalWages, setPayAdditionalWages] = useState(0);
  const [deductBonusFromAdvance, setDeductBonusFromAdvance] = useState(true);
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Generated Payment Bill Modal
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [generatedBillData, setGeneratedBillData] = useState(null);

  // Delete Worker Alert Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [selectedWorkerIdToDelete, setSelectedWorkerIdToDelete] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Worker Account Status Action State
  const [statusActionLoadingId, setStatusActionLoadingId] = useState(null);

  // Advance Review & Disbursal inside Activity Modal
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedAdvanceForDisburse, setSelectedAdvanceForDisburse] = useState(null);
  const [disbursePaymentMethod, setDisbursePaymentMethod] = useState('CASH');
  const [disburseReceiptReference, setDisburseReceiptReference] = useState('');
  const [disburseSubmitting, setDisburseSubmitting] = useState(false);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/users/workers');
      setWorkers(res.data.workers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThekedars = async () => {
    try {
      const res = await api.get('/users/thekedars');
      const list = res.data.thekedars || [];
      setThekedarsList(list);
      if (list.length > 0 && !selectedThekedarId) {
        setSelectedThekedarId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkers();
    if (isOwner) {
      fetchThekedars();
    }
  }, [isOwner]);

  const handleRegisterWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', {
        name: workerName,
        email: workerEmail,
        phone: workerPhone,
        password: workerPassword,
        role: 'WORKER',
        defaultDailyWage: parseFloat(defaultWage) || 750,
        ...(isOwner && selectedThekedarId ? { assignedThekedar: selectedThekedarId } : {}),
      });
      setMessage({ type: 'success', text: 'Worker registered and added to workforce!' });
      setRegisterModalOpen(false);
      setWorkerName('');
      setWorkerEmail('');
      setWorkerPhone('');
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateWage = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/workers/${selectedWorker.userId._id}/wage`, {
        dailyWage: parseFloat(newWage),
        notes: wageReason,
      });
      setMessage({ type: 'success', text: `Daily wage updated for ${selectedWorker.userId.name}!` });
      setWageModalOpen(false);
      setNewWage('');
      setWageReason('');
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleOpenActivity = async (w, initialTab = 'tasks') => {
    setActivityWorker(w);
    setActivityModalOpen(true);
    setActivityLoading(true);
    setActiveTab(initialTab);
    setActivityData(null);
    try {
      const res = await api.get(`/users/workers/${w.userId._id}`);
      setActivityData(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to load worker activities: ${err.message}` });
    } finally {
      setActivityLoading(false);
    }
  };

  const handleOpenPayModal = (w) => {
    const earned = w.totalEarned || 0;
    const advance = w.outstandingAdvanceBalance || 0;
    const defaultCut = Math.min(earned, advance);
    setPayWorker(w);
    setPayBaseEarned(earned);
    setPayAdvanceDeduction(defaultCut);
    setPayFoodDeduction(0);
    setPayRoomRentDeduction(0);
    setPayAdditionalWages(0);
    setDeductBonusFromAdvance(true);
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
    setPayModalOpen(true);
  };

  const handleBaseEarnedChange = (val) => {
    setPayBaseEarned(val);
    const base = parseFloat(val) || 0;
    const bonus = parseFloat(payAdditionalWages) || 0;
    const adv = payWorker?.outstandingAdvanceBalance || 0;
    if (deductBonusFromAdvance) {
      setPayAdvanceDeduction(Math.min(base + bonus, adv));
    } else {
      setPayAdvanceDeduction(Math.min(base, adv));
    }
  };

  const handleAdditionalWagesChange = (val) => {
    setPayAdditionalWages(val);
    const bonus = parseFloat(val) || 0;
    const base = parseFloat(payBaseEarned) || 0;
    const adv = payWorker?.outstandingAdvanceBalance || 0;
    if (deductBonusFromAdvance) {
      setPayAdvanceDeduction(Math.min(base + bonus, adv));
    }
  };

  const handleToggleBonusDeduct = (checked) => {
    setDeductBonusFromAdvance(checked);
    const base = parseFloat(payBaseEarned) || 0;
    const bonus = parseFloat(payAdditionalWages) || 0;
    const adv = payWorker?.outstandingAdvanceBalance || 0;
    if (checked) {
      setPayAdvanceDeduction(Math.min(base + bonus, adv));
    } else {
      setPayAdvanceDeduction(Math.min(base, adv));
    }
  };

  const handleUseFullEarned = () => {
    const full = payWorker?.totalEarned || 0;
    setPayBaseEarned(full);
    const bonus = parseFloat(payAdditionalWages) || 0;
    const adv = payWorker?.outstandingAdvanceBalance || 0;
    if (deductBonusFromAdvance) {
      setPayAdvanceDeduction(Math.min(full + bonus, adv));
    } else {
      setPayAdvanceDeduction(Math.min(full, adv));
    }
  };

  const handleSubmitPayNet = async (e) => {
    e.preventDefault();
    setPaySubmitting(true);
    try {
      const res = await api.post(`/finance/workers/${payWorker.userId._id}/pay-net`, {
        baseEarned: parseFloat(payBaseEarned) || 0,
        advanceDeduction: parseFloat(payAdvanceDeduction) || 0,
        foodDeduction: parseFloat(payFoodDeduction) || 0,
        roomRentDeduction: parseFloat(payRoomRentDeduction) || 0,
        additionalWages: parseFloat(payAdditionalWages) || 0,
        paymentMethod: payMethod,
        receiptReference: payReference || undefined,
        notes: payNotes || undefined,
      });
      setMessage({ type: 'success', text: res.message || 'Worker net payment recorded successfully!' });
      setPayModalOpen(false);
      setGeneratedBillData({
        ...res.data,
        workerName: payWorker?.userId?.name,
        workerCode: payWorker?.workerCode,
        paymentMethod: payMethod,
        receiptReference: payReference,
        notes: payNotes,
        date: new Date().toLocaleString('en-IN'),
        billUrl: res.data?.billUrl ? `${res.data.billUrl}&lang=${language}` : `/api/v1/finance/transactions/${res.data?.transaction?._id}/bill?lang=${language}`,
      });
      setBillModalOpen(true);
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record net payment' });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleToggleWorkerStatus = async (w, e) => {
    if (e) e.stopPropagation();
    const workerUser = w.userId;
    if (!workerUser) return;
    const newStatus = workerUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    const confirmed = window.confirm(
      newStatus === 'ACTIVE'
        ? `Are you sure you want to ACTIVATE the account for worker "${workerUser.name}"?\n\nThey will regain access to log in and view their craftsman assignments and ledger.`
        : `Are you sure you want to DEACTIVATE / SUSPEND the account for worker "${workerUser.name}"?\n\nTheir active sessions will be terminated immediately and they will be blocked from logging in.`
    );
    if (!confirmed) return;

    try {
      setStatusActionLoadingId(workerUser._id);
      setMessage(null);
      await api.patch(`/users/workers/${workerUser._id}/status`, { status: newStatus });
      setMessage({
        type: 'success',
        text: `Worker "${workerUser.name}" account successfully ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated/suspended'}.`,
      });
      // Update local workers list state
      setWorkers((prev) =>
        prev.map((item) =>
          item.userId?._id === workerUser._id
            ? { ...item, userId: { ...item.userId, status: newStatus } }
            : item
        )
      );
      if (activityWorker && activityWorker.userId?._id === workerUser._id) {
        setActivityWorker((prev) => ({
          ...prev,
          userId: { ...prev.userId, status: newStatus },
        }));
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || `Failed to update status for worker "${workerUser.name}".`,
      });
    } finally {
      setStatusActionLoadingId(null);
    }
  };

  const handleOpenDeleteModal = (w) => {
    setSelectedWorkerIdToDelete(w?.userId?._id || '');
    setWorkerToDelete(w || null);
    setDeleteModalOpen(true);
  };

  const handleOpenSelectDeleteModal = () => {
    if (workers && workers.length > 0) {
      setSelectedWorkerIdToDelete(workers[0]?.userId?._id || '');
      setWorkerToDelete(workers[0] || null);
    } else {
      setSelectedWorkerIdToDelete('');
      setWorkerToDelete(null);
    }
    setDeleteModalOpen(true);
  };

  const handleWorkerSelectionChange = (workerId) => {
    setSelectedWorkerIdToDelete(workerId);
    const found = workers.find((w) => w?.userId?._id === workerId);
    setWorkerToDelete(found || null);
  };

  const handleConfirmDelete = async () => {
    if (!workerToDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await api.delete(`/users/workers/${workerToDelete.userId._id}`);
      setMessage({
        type: 'success',
        text: res.message || `Worker ${workerToDelete.userId.name} deleted successfully from workforce.`,
      });
      setDeleteModalOpen(false);
      setWorkerToDelete(null);
      setSelectedWorkerIdToDelete('');
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete worker' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleReviewAdvanceFromActivity = async (requestId, status) => {
    if (status === 'REJECTED') {
      const confirmed = window.confirm('Are you sure you want to deny / reject this advance request?');
      if (!confirmed) return;
    }
    try {
      setReviewLoadingId(requestId);
      await api.patch(`/finance/advance-requests/${requestId}/review`, { status });
      setMessage({
        type: 'success',
        text: `Advance request marked as ${status === 'APPROVED' ? 'approved' : 'denied'}!`,
      });
      if (activityWorker?.userId?._id) {
        const res = await api.get(`/users/workers/${activityWorker.userId._id}`);
        setActivityData(res.data);
      }
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || `Failed to ${status.toLowerCase()} advance request` });
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleDisburseAdvanceFromActivity = async (e) => {
    e.preventDefault();
    if (!selectedAdvanceForDisburse) return;
    try {
      setDisburseSubmitting(true);
      await api.post(`/finance/advance-requests/${selectedAdvanceForDisburse._id}/disburse`, {
        paymentMethod: disbursePaymentMethod,
        receiptReference: disburseReceiptReference,
      });
      setMessage({ type: 'success', text: 'Advance disbursed and transaction recorded successfully!' });
      setDisburseModalOpen(false);
      setSelectedAdvanceForDisburse(null);
      setDisburseReceiptReference('');
      if (activityWorker?.userId?._id) {
        const res = await api.get(`/users/workers/${activityWorker.userId._id}`);
        setActivityData(res.data);
      }
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to disburse advance' });
    } finally {
      setDisburseSubmitting(false);
    }
  };

  const computedNetPay = Math.max(
    0,
    (parseFloat(payBaseEarned) || 0) +
      (parseFloat(payAdditionalWages) || 0) -
      (parseFloat(payAdvanceDeduction) || 0) -
      (parseFloat(payFoodDeduction) || 0) -
      (parseFloat(payRoomRentDeduction) || 0)
  );

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('workers.registryTitle', 'Workforce & Craftsmen Registry')}</h2>
          <p className="text-xs text-slate-700 dark:text-slate-400">{t('workers.registrySub', 'Carpenters, edge banders, cabinet fitters, polishers, assigned tasks, and daily wage agreements.')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isThekedar && (
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-center text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-400 font-bold"
              onClick={handleOpenSelectDeleteModal}
              icon={Trash2}
            >
              {t('workers.deleteWorker', 'Delete Worker')}
            </Button>
          )}
          {(isOwner || isThekedar) && (
            <Button variant="primary" onClick={() => setRegisterModalOpen(true)} icon={UserPlus} className="w-full sm:w-auto justify-center">
              {t('workers.registerWorker', 'Register Worker')}
            </Button>
          )}
        </div>
      </div>

      {/* Workers Grid */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        </div>
      ) : workers.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-xs text-slate-700 dark:text-slate-400 italic">{t('workers.noWorkersRegistered', 'No workers currently registered.')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <Card key={w.userId?._id || w._id} className="flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-600">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400 font-mono">{w.workerCode}</span>
                    {w.hasPendingAdvance && (
                      <span
                        onClick={() => handleOpenActivity(w, 'payments')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs border border-amber-400 cursor-pointer animate-pulse transition tracking-tight"
                        title={`Worker requested advance of ₹${(w.requestedAdvanceAmount || w.pendingAdvance?.totalRequested || 0).toLocaleString('en-IN')}. Click to review.`}
                      >
                        <IndianRupee className="h-3 w-3 stroke-[2.5]" />
                        <span>{t('worker.reqAdvBadge', 'Req Adv')}: ₹{(w.requestedAdvanceAmount || w.pendingAdvance?.totalRequested || 0).toLocaleString('en-IN')}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        w.userId?.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          w.userId?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      {w.userId?.status === 'ACTIVE' ? t('workers.active', 'Active') : t('workers.suspended', 'Suspended')}
                    </span>
                    {(isThekedar || isOwner) && (
                      <button
                        type="button"
                        disabled={statusActionLoadingId === w.userId?._id}
                        onClick={(e) => handleToggleWorkerStatus(w, e)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                          w.userId?.status === 'ACTIVE'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                        title={w.userId?.status === 'ACTIVE' ? 'Deactivate Worker login access' : 'Activate Worker login access'}
                      >
                        {statusActionLoadingId === w.userId?._id ? (
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        ) : w.userId?.status === 'ACTIVE' ? (
                          <>
                            <UserX className="h-2.5 w-2.5" />
                            <span>{t('workers.deactivate', 'Deactivate')}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-2.5 w-2.5" />
                            <span>{t('workers.activate', 'Activate')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{w.userId?.name || 'Worker'}</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-400">{w.userId?.phone || 'No phone'}</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-400">{w.userId?.email || ''}</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {w.skills?.map((s, idx) => (
                    <span key={idx} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Wage and Balances */}
                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1.5 text-xs border border-slate-200/70 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-400">{t('dashboard.standardDailyWage', 'Standard Daily Wage')}:</span>
                    <strong className="text-amber-900 dark:text-amber-300 text-sm">₹{w.defaultDailyWage} / {t('calendar.day', 'day')}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-amber-900 dark:text-amber-300 font-semibold">{t('workers.thisMonthWorked', 'Worked This Month')}:</span>
                    <strong className="text-amber-950 dark:text-amber-200 font-bold">
                      {w.monthDehadi !== undefined ? `${w.monthDehadi} ${t('calendar.dehadiUnit', 'Shifts')} (${w.monthWorkedDays || 0}d)` : `${w.monthWorkedDays || 0} ${t('calendar.days', 'days')}`}
                      <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 font-black">(₹{(w.monthEarnings || 0).toLocaleString('en-IN')})</span>
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700 dark:text-slate-400 font-semibold">{t('worker.totalIncome', 'Total Income')}:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      ₹{(w.totalEarned || 0).toLocaleString('en-IN')}
                      {w.approvedDaysCount > 0 && (
                        <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400 font-normal">({w.approvedDaysCount} {t('calendar.days', 'days')})</span>
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700 dark:text-slate-400 font-semibold">{t('dashboard.outstandingAdvance', 'Outstanding Advance Balance')}:</span>
                    <strong className="text-rose-700 dark:text-rose-400 font-bold">₹{(w.outstandingAdvanceBalance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  {w.hasPendingAdvance && (
                    <div
                      onClick={() => handleOpenActivity(w, 'payments')}
                      className="flex justify-between items-center text-[11px] bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 px-2 py-1.5 rounded-lg font-bold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition shadow-xs"
                      title="Pending advance request awaiting review. Click to review."
                    >
                      <span className="flex items-center gap-1 text-amber-800 dark:text-amber-400">
                        <IndianRupee className="h-3 w-3 text-amber-600 stroke-[2.5]" />
                        <span>{t('worker.reqAdvBadge', 'Req Adv')}:</span>
                      </span>
                      <span className="font-black text-amber-950 dark:text-amber-200 flex items-center gap-1">
                        <span>₹{(w.requestedAdvanceAmount || w.pendingAdvance?.totalRequested || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-1.5 py-0.2 rounded">{t('thekedar.review', 'Review')} →</span>
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {((w.netBalance !== undefined ? w.netBalance : (w.netPayable !== undefined ? w.netPayable : ((w.totalEarned || 0) - (w.outstandingAdvanceBalance || 0)))) < 0)
                        ? `${t('worker.netBalance', 'Net Balance')}:`
                        : `${t('worker.netDueToPay', 'Net Due to Pay')}:`}
                    </span>
                    {(() => {
                      const nb = w.netBalance !== undefined ? w.netBalance : (w.netPayable !== undefined ? w.netPayable : ((w.totalEarned || 0) - (w.outstandingAdvanceBalance || 0)));
                      if (nb < 0) {
                        return (
                          <span className="font-black text-rose-700 dark:text-rose-300 text-sm bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                            -₹{Math.abs(nb).toLocaleString('en-IN')}
                          </span>
                        );
                      }
                      if (nb > 0) {
                        return (
                          <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            ₹{nb.toLocaleString('en-IN')}
                          </span>
                        );
                      }
                      return (
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          ₹0 ({t('common.settled', 'Settled')})
                        </span>
                      );
                    })()}
                  </div>
                  {/* Calculation Breakdown: Total Income - Advance = Net Amount */}
                  {(() => {
                    const totalIncome = w.totalEarned || 0;
                    const advance = w.outstandingAdvanceBalance || 0;
                    const nb = w.netBalance !== undefined ? w.netBalance : (w.netPayable !== undefined ? w.netPayable : (totalIncome - advance));
                    if (nb < 0) {
                      return (
                        <div className="mt-1 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2 text-right space-y-0.5">
                          <div className="text-[11px] font-bold text-rose-950 dark:text-rose-200">
                            ₹{totalIncome.toLocaleString('en-IN')} <span className="font-normal text-slate-600 dark:text-slate-400">(Total Income)</span> − ₹{advance.toLocaleString('en-IN')} <span className="font-normal text-slate-600 dark:text-slate-400">(Advance)</span> = <span className="text-rose-700 dark:text-rose-300 font-black">-₹{Math.abs(nb).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            {t('worker.advanceExceeds', 'Advance exceeds earnings by ₹{amt}').replace('{amt}', Math.abs(nb).toLocaleString('en-IN'))}
                          </div>
                        </div>
                      );
                    }
                    if (nb > 0) {
                      return (
                        <div className="mt-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2 text-right">
                          <div className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            ₹{totalIncome.toLocaleString('en-IN')} <span className="font-normal text-slate-600 dark:text-slate-400">(Total Income)</span> − ₹{advance.toLocaleString('en-IN')} <span className="font-normal text-slate-600 dark:text-slate-400">(Advance)</span> = <span className="text-emerald-700 dark:text-emerald-300 font-black">₹{nb.toLocaleString('en-IN')} (Net Due)</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-1.5 text-right text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        ₹{totalIncome.toLocaleString('en-IN')} (Total Income) − ₹{advance.toLocaleString('en-IN')} (Advance) = ₹0 (Fully Settled)
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons: Thekedar activities + Wage Update + Pay Net + Delete */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {t('disputes.thekedar', 'Thekedar')}: {w.thekedarId?.name || 'Assigned Lead'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-[1.4] bg-amber-600 hover:bg-amber-700 text-white shadow-sm justify-center text-xs font-semibold px-2.5 py-2 whitespace-nowrap"
                    onClick={() => handleOpenActivity(w)}
                    icon={Activity}
                  >
                    {t('nav.activities', 'Activities')}
                  </Button>
                  {(isOwner || isThekedar) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-[0.8] justify-center text-xs font-semibold px-2.5 py-2 whitespace-nowrap border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        setSelectedWorker(w);
                        setNewWage(w.defaultDailyWage);
                        setWageModalOpen(true);
                      }}
                      icon={Edit}
                      title="Update Base Wage"
                    >
                      {t('common.wage', 'Wage')}
                    </Button>
                  )}
                  {isThekedar && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-[1] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm justify-center text-xs font-semibold px-2.5 py-2 whitespace-nowrap"
                      onClick={() => handleOpenPayModal(w)}
                      icon={IndianRupee}
                      title="Pay Net Amount"
                    >
                      {t('thekedar.payWorkerNet', 'Pay Net')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Register Worker */}
      <Modal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} title="Register Modern Furniture Craftsman">
        <form onSubmit={handleRegisterWorker} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="e.g. Ramesh Carpenter"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={workerEmail}
                onChange={(e) => setWorkerEmail(e.target.value)}
                placeholder="ramesh@furnicraft.com"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                required
                value={workerPhone}
                onChange={(e) => setWorkerPhone(e.target.value)}
                placeholder="+91 99222 33445"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Password</label>
              <input
                type="text"
                required
                value={workerPassword}
                onChange={(e) => setWorkerPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Daily Wage (₹)</label>
              <input
                type="number"
                required
                value={defaultWage}
                onChange={(e) => setDefaultWage(e.target.value)}
                placeholder="750"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Permanent Thekedar Selection */}
          {isOwner ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Permanent Assigned Thekedar *</label>
              <select
                required
                value={selectedThekedarId}
                onChange={(e) => setSelectedThekedarId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                {thekedarsList.map((th) => (
                  <option key={th._id} value={th._id}>
                    {th.name} ({th.phone || th.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                A worker can permanently work only under this Thekedar and on their projects.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 p-2.5 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span className="font-semibold">Permanent Thekedar:</span> {user?.name} (Craftsman will be permanently registered under your contractor roster).
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setRegisterModalOpen(false)}>Cancel</Button>
            <Button type="submit">Register Craftsman</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Wage */}
      <Modal isOpen={wageModalOpen} onClose={() => setWageModalOpen(false)} title="Update Craftsman Daily Wage">
        {selectedWorker && (
          <form onSubmit={handleUpdateWage} className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 p-3 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Worker: <strong className="text-sm text-slate-900 dark:text-white">{selectedWorker.userId?.name || 'Worker'}</strong> ({selectedWorker.workerCode})
              <div className="mt-1">Current Base Wage: ₹{selectedWorker.defaultDailyWage} / day</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">New Daily Wage (INR ₹)</label>
              <input
                type="number"
                required
                min="100"
                value={newWage}
                onChange={(e) => setNewWage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reason / Wage Agreement Revision Note</label>
              <textarea
                required
                rows={2}
                value={wageReason}
                onChange={(e) => setWageReason(e.target.value)}
                placeholder="e.g. Master level edge-banding promotion, annual skill revision..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setWageModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Revised Wage</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Worker 360° Activity, Tasks, Attendance & Payments */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={activityWorker ? `${activityWorker.userId?.name || 'Worker'} (${activityWorker.workerCode}) — Complete Activity Stream` : 'Worker Activities'}
        maxWidth="max-w-5xl"
      >
        {activityWorker && (
          <div className="space-y-5">
            {/* Worker Top Profile Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-amber-50 via-amber-100/40 to-slate-50 dark:from-slate-800 dark:via-amber-950/40 dark:to-slate-800 p-4 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-lg shadow-sm">
                  <i className="fa-solid fa-user"></i>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{activityWorker.userId?.name || 'Worker'}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activityWorker.userId?.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          activityWorker.userId?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      {activityWorker.userId?.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </span>
                    {(isThekedar || isOwner) && (
                      <button
                        type="button"
                        disabled={statusActionLoadingId === activityWorker.userId?._id}
                        onClick={(e) => handleToggleWorkerStatus(activityWorker, e)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                          activityWorker.userId?.status === 'ACTIVE'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                      >
                        {statusActionLoadingId === activityWorker.userId?._id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : activityWorker.userId?.status === 'ACTIVE' ? (
                          <>
                            <UserX className="h-3 w-3" />
                            <span>Deactivate Worker</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            <span>Activate Worker</span>
                          </>
                        )}
                      </button>
                    )}
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {activityWorker.workerCode}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {activityWorker.userId?.phone || 'No phone'}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {activityWorker.userId?.email || ''}</span>
                  </div>
                </div>
              </div>

              {/* Fast Stats Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Daily Wage</div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300">₹{activityWorker.defaultDailyWage}/day</div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Advance Balance</div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">₹{activityData?.profile?.outstandingAdvanceBalance ?? activityWorker.outstandingAdvanceBalance ?? 0}</div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Assigned Tasks</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{activityData?.tasks?.length || 0}</div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Attendance Logs</div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{activityData?.attendanceHistory?.length || 0}</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 text-xs font-bold overflow-x-auto no-scrollbar scrollbar-none shrink-0">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'tasks'
                    ? 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                <span>Assigned Tasks</span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                  {activityData?.tasks?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'attendance'
                    ? 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Attendance History</span>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                  {activityData?.attendanceHistory?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'payments'
                    ? 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <IndianRupee className="h-4 w-4" />
                <span>Payments & Advances</span>
                <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:text-blue-300">
                  {(activityData?.transactions?.length || 0) + (activityData?.advanceRequests?.length || 0)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('activities')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-all ${
                  activeTab === 'activities'
                    ? 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                <span>Projects & Tools</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                  {(activityData?.assignments?.length || 0) + (activityData?.assignedTools?.length || 0)}
                </span>
              </button>
            </div>

            {/* Loading Spinner */}
            {activityLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
              </div>
            ) : !activityData ? (
              <div className="p-8 text-center text-sm text-slate-500">No activity data available.</div>
            ) : (
              <div>
                {/* TAB 1: ASSIGNED FURNITURE TASKS */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Modern furniture work orders, modular cutting, edge banding, carcase assembly, and hardware fitting assigned to {activityWorker.userId?.name || 'this worker'}.
                      </p>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Total Tasks: {activityData.tasks?.length || 0}
                      </span>
                    </div>

                    {(!activityData.tasks || activityData.tasks.length === 0) ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                        <CheckSquare className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No furniture tasks currently assigned.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Tasks assigned in project details will appear here automatically.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-4 py-3">Furniture Item & Task</th>
                              <th className="px-4 py-3">Project</th>
                              <th className="px-4 py-3">Process Type</th>
                              <th className="px-4 py-3">Units & Progress</th>
                              <th className="px-4 py-3">Target Date</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {activityData.tasks.map((task) => (
                              <tr key={task._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                  <div>{task.furnitureItemName}</div>
                                  {task.notes && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{task.notes}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">{task.projectId?.name || 'Project'}</div>
                                  <div className="text-[10px] text-amber-700 dark:text-amber-400">{task.projectId?.projectCode || ''}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    {task.taskType?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {task.completedUnits || 0} / {task.plannedUnits || 1}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.unitMetric || 'Units'}</span>
                                  </div>
                                  <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500 rounded-full"
                                      style={{
                                        width: `${Math.min(100, Math.round(((task.completedUnits || 0) / (task.plannedUnits || 1)) * 100))}%`,
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                  {formatDate(task.targetDate)}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={task.status} size="sm">{task.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ATTENDANCE HISTORY */}
                {activeTab === 'attendance' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Attendance logs for the last 30 work shifts including duty codes (P, HALF, P1/5, PP), check-in/out timestamps, and approved status.
                      </p>
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                        Logged Records: {activityData.attendanceHistory?.length || 0}
                      </span>
                    </div>

                    {(!activityData.attendanceHistory || activityData.attendanceHistory.length === 0) ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                        <Calendar className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No attendance records found for this worker.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Attendance submitted by the worker or thekedar will be tracked here.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Project / Site</th>
                              <th className="px-4 py-3">Code & Weight</th>
                              <th className="px-4 py-3">Work Hours</th>
                              <th className="px-4 py-3">Daily Wage (Earned)</th>
                              <th className="px-4 py-3">Approval Status</th>
                              <th className="px-4 py-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {activityData.attendanceHistory.map((att) => (
                              <tr key={att._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                  {att.date || formatDate(att.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{att.projectId?.name || 'General Workshop'}</div>
                                  {att.projectId?.projectCode && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{att.projectId.projectCode}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={att.code} size="sm">{att.code}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span>{att.checkInTime || '09:00'} — {att.checkOutTime || '18:00'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-amber-900 dark:text-amber-300">
                                  {att.calculatedWage ? `₹${att.calculatedWage}` : `₹${activityWorker.defaultDailyWage} (base)`}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant={att.approvalStatus} size="sm">{att.approvalStatus}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                                  {att.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PAYMENTS, ADVANCES & PAYROLL */}
                {activeTab === 'payments' && (
                  <div className="space-y-5">
                    {/* Financial Balances Card Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/40 p-3.5">
                        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase">Standard Base Daily Wage</span>
                        <div className="mt-1 text-xl font-black text-amber-900 dark:text-amber-200">₹{activityWorker.defaultDailyWage} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">/ day</span></div>
                        <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">Calculated on 8-hour modular carpentry shifts</p>
                      </div>

                      <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/40 p-3.5">
                        <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase">Total Income (Earned)</span>
                        <div className="mt-1 text-xl font-black text-blue-900 dark:text-blue-200">₹{(activityWorker.totalEarned ?? activityData.profile?.outstandingSalaryBalance ?? 0).toLocaleString('en-IN')}</div>
                        <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">Approved attendance shifts & work</p>
                      </div>

                      <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/40 p-3.5">
                        <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase">Outstanding Advance Balance</span>
                        <div className="mt-1 text-xl font-black text-rose-700 dark:text-rose-300">₹{(activityData.profile?.outstandingAdvanceBalance ?? activityWorker.outstandingAdvanceBalance ?? 0).toLocaleString('en-IN')}</div>
                        <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">Auto-deducted during settlement</p>
                      </div>

                      <div className={`rounded-xl border p-3.5 ${
                        ((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)) < 0
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40'
                          : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40'
                      }`}>
                        <span className={`text-[11px] font-semibold uppercase ${
                          ((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)) < 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'
                        }`}>
                          Net Amount (Balance)
                        </span>
                        <div className={`mt-1 text-xl font-black ${
                          ((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)) < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)) < 0 ? '-' : ''}₹{Math.abs((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)).toLocaleString('en-IN')}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">Total Income − Advance = Net</p>
                      </div>
                    </div>

                    {/* Section: Advance Requests */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Craftsman Advance Requests
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activityData.advanceRequests?.length || 0} Requests
                        </span>
                      </div>

                      {(!activityData.advanceRequests || activityData.advanceRequests.length === 0) ? (
                        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                          No advance requests submitted by this worker.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                              <tr>
                                <th className="px-4 py-2.5">Requested Date</th>
                                <th className="px-4 py-2.5">Amount</th>
                                <th className="px-4 py-2.5">Reason</th>
                                <th className="px-4 py-2.5">Project</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Reviewer Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {activityData.advanceRequests.map((adv) => (
                                <tr key={adv._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                    {formatDate(adv.createdAt)}
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-rose-700 dark:text-rose-400">
                                    ₹{adv.amount}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                    {adv.reason}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                                    {adv.projectId?.name || 'General'}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant={adv.status} size="sm">{adv.status}</Badge>
                                      {(isThekedar || isOwner) && adv.status === 'PENDING' && (() => {
                                        const currentAdvance = activityWorker?.outstandingAdvanceBalance || 0;
                                        const exceedsLimit = currentAdvance >= 10000 || (currentAdvance + (adv.amount || 0)) > 10000;
                                        return (
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={reviewLoadingId === adv._id || exceedsLimit}
                                              onClick={() => handleReviewAdvanceFromActivity(adv._id, 'APPROVED')}
                                              title={exceedsLimit ? "Worker advance exceeds ₹10,000 limit - Cannot Approve" : "Approve advance request"}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                                exceedsLimit
                                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                                              }`}
                                            >
                                              {reviewLoadingId === adv._id ? (
                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Check className="h-3 w-3" />
                                              )}
                                              <span>Approve</span>
                                            </button>
                                            <button
                                              type="button"
                                              disabled={reviewLoadingId === adv._id}
                                              onClick={() => handleReviewAdvanceFromActivity(adv._id, 'REJECTED')}
                                              title="Deny / Reject advance request"
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                                            >
                                              <X className="h-3 w-3" />
                                              <span>Deny</span>
                                            </button>
                                          </div>
                                        );
                                      })()}
                                      {(isThekedar || isOwner) && adv.status === 'APPROVED' && (() => {
                                        const currentAdvance = activityWorker?.outstandingAdvanceBalance || 0;
                                        const exceedsLimit = currentAdvance >= 10000 || (currentAdvance + (adv.amount || 0)) > 10000;
                                        return (
                                          <button
                                            type="button"
                                            disabled={exceedsLimit}
                                            onClick={() => {
                                              if (!exceedsLimit) {
                                                setSelectedAdvanceForDisburse(adv);
                                                setDisburseModalOpen(true);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                              exceedsLimit
                                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                                            }`}
                                            title={exceedsLimit ? "Worker advance exceeds ₹10,000 limit" : "Disburse approved advance amount"}
                                          >
                                            <IndianRupee className="h-3 w-3" />
                                            <span>Disburse</span>
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                    {adv.reviewNotes || (adv.reviewedBy?.name ? `Reviewed by ${adv.reviewedBy.name}` : '-')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section: Payment Transactions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Payment & Disbursement History
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activityData.transactions?.length || 0} Transactions
                        </span>
                      </div>

                      {(!activityData.transactions || activityData.transactions.length === 0) ? (
                        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                          No payment transactions recorded for this worker.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                              <tr>
                                <th className="px-4 py-2.5">Date</th>
                                <th className="px-4 py-2.5">Tx ID</th>
                                <th className="px-4 py-2.5">Category</th>
                                <th className="px-4 py-2.5">Amount</th>
                                <th className="px-4 py-2.5">Payment Method</th>
                                <th className="px-4 py-2.5">Reference No</th>
                                <th className="px-4 py-2.5">Recorded By</th>
                                <th className="px-4 py-2.5 text-right">Bill / Voucher</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {activityData.transactions.map((tx) => (
                                <tr key={tx._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {formatDate(tx.transactionDate || tx.createdAt)}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-[11px] text-amber-800 dark:text-amber-400">
                                    {tx.transactionId}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                      {tx.category?.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                    ₹{tx.amount}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                                    {tx.paymentMethod}
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                    {tx.receiptReference || '-'}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                    {tx.recordedBy?.name || 'Thekedar'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => window.open(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, '_blank')}
                                      className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-1 text-[10px] font-bold transition-colors shadow-xs cursor-pointer"
                                      title="Download Payment Bill (PDF)"
                                    >
                                      <FileText className="h-3 w-3 text-amber-700 dark:text-amber-400" /> {t('dashboard.billPdf') || 'Bill PDF'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Section: Finalized Monthly Payrolls */}
                    {activityData.payrolls && activityData.payrolls.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Finalized Payroll Statements
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                              <tr>
                                <th className="px-4 py-2.5">Period</th>
                                <th className="px-4 py-2.5">Days Present</th>
                                <th className="px-4 py-2.5">Gross Pay</th>
                                <th className="px-4 py-2.5">Advance Deducted</th>
                                <th className="px-4 py-2.5">Net Disbursed</th>
                                <th className="px-4 py-2.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {activityData.payrolls.map((pr) => (
                                <tr key={pr._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                    {pr.periodMonth}/{pr.periodYear}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                                    {pr.presentDays || 0} days
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                                    ₹{pr.grossPay || 0}
                                  </td>
                                  <td className="px-4 py-2.5 text-rose-600 dark:text-rose-400">
                                    ₹{pr.advanceDeduction || 0}
                                  </td>
                                  <td className="px-4 py-2.5 font-black text-emerald-800 dark:text-emerald-400">
                                    ₹{pr.netPayable || 0}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Badge variant={pr.status} size="sm">{pr.status}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PROJECTS, TOOLS & ACTIVITIES */}
                {activeTab === 'activities' && (
                  <div className="space-y-6">
                    {/* Section 1: Active Project Deployments */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FolderKanban className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          Active Project Site Deployments
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activityData.assignments?.length || 0} Projects Assigned
                        </span>
                      </div>

                      {(!activityData.assignments || activityData.assignments.length === 0) ? (
                        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                          Worker has not been assigned to any project sites yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activityData.assignments.map((asgn) => (
                            <div key={asgn._id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 bg-white dark:bg-slate-800/70 hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">{asgn.projectId?.name || 'Project Name'}</h5>
                                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    {asgn.projectId?.projectCode || 'MOD-FURN'}
                                  </span>
                                </div>
                                <Badge variant={asgn.projectId?.status || 'IN_PROGRESS'} size="sm">
                                  {asgn.projectId?.status || 'IN_PROGRESS'}
                                </Badge>
                              </div>
                              <div className="mt-2.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                  <span>Site Address:</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">{asgn.projectId?.siteAddress || 'Main Workshop'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Assigned Role:</span>
                                  <strong className="text-amber-900 dark:text-amber-300">{asgn.roleOnProject || 'Craftsman'}</strong>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span>Assignment Date:</span>
                                  <span>{formatDate(asgn.assignedAt || asgn.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Tools & Equipment in Possession */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          Assigned Power Tools & Equipment (Custody)
                        </h4>
                        <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                          {activityData.assignedTools?.length || 0} Tools Issued
                        </span>
                      </div>

                      {(!activityData.assignedTools || activityData.assignedTools.length === 0) ? (
                        <p className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                          No machinery or power tools currently checked out to this craftsman.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {activityData.assignedTools.map((toolIssue) => (
                            <div key={toolIssue._id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800/70">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  {toolIssue.toolId?.toolCode || 'TOOL'}
                                </span>
                                <Badge variant={toolIssue.toolId?.condition || 'GOOD'} size="sm">
                                  {toolIssue.toolId?.condition || 'GOOD'}
                                </Badge>
                              </div>
                              <h5 className="mt-2 text-xs font-bold text-slate-900 dark:text-white truncate">
                                {toolIssue.toolId?.name || 'Power Tool'}
                              </h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {toolIssue.toolId?.brand || 'Professional'} {toolIssue.toolId?.modelNumber || ''}
                              </p>
                              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] text-slate-600 dark:text-slate-400">
                                <span>Issued On:</span>
                                <strong className="text-slate-800 dark:text-slate-200">{formatDate(toolIssue.issueDate)}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Wage Revision Agreements */}
                    {activityData.wageAgreements && activityData.wageAgreements.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          Wage Agreement History
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                              <tr>
                                <th className="px-4 py-2.5">Effective Date</th>
                                <th className="px-4 py-2.5">Daily Wage</th>
                                <th className="px-4 py-2.5">Agreed By</th>
                                <th className="px-4 py-2.5">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {activityData.wageAgreements.map((wa) => (
                                <tr key={wa._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                    {formatDate(wa.effectiveFrom)}
                                  </td>
                                  <td className="px-4 py-2.5 font-black text-amber-900 dark:text-amber-300">
                                    ₹{wa.dailyWage} / day
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                                    {wa.thekedarId?.name || 'Thekedar Lead'}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                    {wa.notes || 'Routine revision'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Section 4: Grievances & Disputes */}
                    {activityData.disputes && activityData.disputes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          Worker Grievances & Attendance Disputes
                        </h4>
                        <div className="space-y-2">
                          {activityData.disputes.map((disp) => (
                            <div key={disp._id} className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/40 p-3 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{disp.subject || 'Dispute'}</span>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{disp.description}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant={disp.status} size="sm">{disp.status}</Badge>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{formatDate(disp.createdAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setActivityModalOpen(false)}>
                Close Stream
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Pay Worker Net Amount */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={`Pay Net Amount — ${payWorker?.userId?.name || 'Worker'} (${payWorker?.workerCode || ''})`}
      >
        <form onSubmit={handleSubmitPayNet} className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase">Total Income (Earned)</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                ₹{(payWorker?.totalEarned || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase">Outstanding Advance</span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">
                ₹{payWorker?.outstandingAdvanceBalance || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase">Daily Wage</span>
              <span className="text-sm font-bold text-amber-800 dark:text-amber-400 mt-0.5 block">
                ₹{payWorker?.defaultDailyWage || 0}/day
              </span>
            </div>
          </div>

          {/* Calculation inputs */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Base Earned to Settle (₹)
                </label>
                <button
                  type="button"
                  onClick={handleUseFullEarned}
                  className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                >
                  Use Full Earned (₹{payWorker?.totalEarned || 0})
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={payBaseEarned}
                onChange={(e) => handleBaseEarnedChange(e.target.value)}
                placeholder="Amount earned from approved attendance"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Wages from approved attendance shifts and completed tasks.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-rose-800 dark:text-rose-400">
                  2. Advance Deduction to Cut (₹)
                </label>
                <div className="flex gap-2">
                  {(() => {
                    const totalCredits = (parseFloat(payBaseEarned) || 0) + (parseFloat(payAdditionalWages) || 0);
                    const maxCut = Math.min(totalCredits, payWorker?.outstandingAdvanceBalance || 0);
                    return (
                      <button
                        type="button"
                        onClick={() => setPayAdvanceDeduction(maxCut)}
                        className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                      >
                        Cut Max (₹{maxCut})
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setPayAdvanceDeduction(0)}
                    className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hover:underline cursor-pointer"
                  >
                    Cut ₹0
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                max={payWorker?.outstandingAdvanceBalance || 0}
                step="any"
                value={payAdvanceDeduction}
                onChange={(e) => setPayAdvanceDeduction(e.target.value)}
                placeholder="Advance deduction"
                className="mt-1 block w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/30 text-slate-900 dark:text-white p-2 text-sm focus:border-rose-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Amount to deduct ("cut") from worker's outstanding advance balance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-800 dark:text-rose-400">
                3. Food / Mess Deduction (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={payFoodDeduction}
                onChange={(e) => setPayFoodDeduction(e.target.value)}
                placeholder="e.g. 1200 for food expenses"
                className="mt-1 block w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/30 text-slate-900 dark:text-white p-2 text-sm focus:border-rose-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Amount to deduct for worker meals / mess facility.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                4. Room Rent Deduction (Optional) (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={payRoomRentDeduction}
                onChange={(e) => setPayRoomRentDeduction(e.target.value)}
                placeholder="e.g. 1500 (leave 0 if not applicable)"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Optional accommodation / room rent charge deduction.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                5. Additional Wages / Bonus / Allowance (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={payAdditionalWages}
                onChange={(e) => handleAdditionalWagesChange(e.target.value)}
                placeholder="e.g. 500 for site incentive"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Overtime incentive, travel allowance, or festive bonus.
              </p>
              {(payWorker?.outstandingAdvanceBalance || 0) > 0 && (
                <div className="mt-2 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-2.5 text-xs space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deductBonusFromAdvance}
                      onChange={(e) => handleToggleBonusDeduct(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-bold text-amber-950 dark:text-amber-200">
                      Deduct bonus from advance balance (-)
                    </span>
                  </label>
                  {parseFloat(payAdditionalWages) > 0 && deductBonusFromAdvance ? (
                    <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-800">
                      ✓ Advance will be reduced by ₹{parseFloat(payAdvanceDeduction) || 0} (Bonus ₹{parseFloat(payAdditionalWages) || 0} + Base ₹{parseFloat(payBaseEarned) || 0})
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-800 dark:text-amber-300">
                      When checked, any bonus entered will automatically reduce the worker's outstanding advance.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Computed Net Pay Banner */}
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 text-center shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Net Cash Paid to Worker
            </span>
            <div className="mt-0.5 text-2xl font-black text-emerald-950 dark:text-emerald-200">
              ₹{computedNetPay.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
              ₹{((parseFloat(payBaseEarned) || 0) + (parseFloat(payAdditionalWages) || 0)).toLocaleString('en-IN')} (Total Income: Base ₹{parseFloat(payBaseEarned) || 0} + Bonus ₹{parseFloat(payAdditionalWages) || 0}) − ₹{parseFloat(payAdvanceDeduction) || 0} (Advance Cut) − ₹{(parseFloat(payFoodDeduction) || 0) + (parseFloat(payRoomRentDeduction) || 0)} (Deductions) = ₹{computedNetPay.toLocaleString('en-IN')}
            </div>
            {(payWorker?.outstandingAdvanceBalance || 0) > 0 && (
              <div className="pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 flex-wrap">
                <span className="text-slate-600 dark:text-slate-400">Advance Balance:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹{(payWorker?.outstandingAdvanceBalance || 0).toLocaleString('en-IN')}</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">− ₹{(parseFloat(payAdvanceDeduction) || 0).toLocaleString('en-IN')}</span>
                <span>=</span>
                <span className="font-black text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  ₹{Math.max(0, (payWorker?.outstandingAdvanceBalance || 0) - (parseFloat(payAdvanceDeduction) || 0)).toLocaleString('en-IN')} Remaining Advance
                </span>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Receipt / Ref (Optional)</label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UPI Ref / Cash voucher #"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Notes (Optional)</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Weekly net wage settlement"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={paySubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              icon={IndianRupee}
            >
              Confirm & Pay ₹{computedNetPay.toLocaleString('en-IN')}
            </Button>
          </div>
        </form>
      </Modal>



      {/* Modal: Payment Bill / Voucher Generated */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title="Payment Receipt & Wage Settlement Bill Generated"
      >
        {generatedBillData && (
          <div className="space-y-4">
            {/* Success Header Banner */}
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 text-emerald-950 dark:text-emerald-200 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Payment Recorded & Official Bill Created
                </span>
                <h4 className="font-black text-lg text-emerald-950 dark:text-emerald-200">
                  ₹{Number(generatedBillData.netPaid || 0).toLocaleString('en-IN')} Paid Successfully
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Voucher Bill No: <strong className="font-mono">{generatedBillData.transaction?.transactionId || 'TXN-NET'}</strong>
                </p>
              </div>
            </div>

            {/* Bill Details Summary Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Payee Craftsman</span>
                  <strong className="text-slate-900 dark:text-white text-sm font-bold">{generatedBillData.workerName}</strong>
                  <span className="text-slate-600 dark:text-slate-400 text-[10px] block font-mono">{generatedBillData.workerCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Payment Mode</span>
                  <Badge variant="success" size="sm">{generatedBillData.paymentMethod}</Badge>
                  {generatedBillData.receiptReference && (
                    <span className="text-slate-600 dark:text-slate-400 text-[10px] block font-mono mt-0.5">Ref: {generatedBillData.receiptReference}</span>
                  )}
                </div>
              </div>

              {/* Itemized breakdown table */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>1. Base Approved Earned Wages:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{Number(generatedBillData.breakdown?.baseEarned ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-700 dark:text-rose-400">
                  <span>2. Advance Deduction ("Cut"):</span>
                  <span className="font-bold">-₹{Number(generatedBillData.advanceDeduction ?? 0).toLocaleString('en-IN')}</span>
                </div>
                {Number(generatedBillData.breakdown?.foodDeduction || 0) > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-400">
                    <span>3. Food / Mess Deduction:</span>
                    <span className="font-bold">-₹{Number(generatedBillData.breakdown?.foodDeduction || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {Number(generatedBillData.breakdown?.roomRentDeduction || 0) > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-400">
                    <span>4. Room Rent Deduction:</span>
                    <span className="font-bold">-₹{Number(generatedBillData.breakdown?.roomRentDeduction || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-teal-700 dark:text-teal-400">
                  <span>Additional Wages / Bonus:</span>
                  <span className="font-semibold">+₹{Number(generatedBillData.breakdown?.additionalWages ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>Net Disbursed Payment:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">₹{Number(generatedBillData.netPaid ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Account Balance status */}
              <div className="rounded-lg bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Remaining Advance Balance:</span>
                <span className="font-bold text-amber-800 dark:text-amber-400">₹{Number(generatedBillData.remainingAdvance ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setBillModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                icon={FileText}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => {
                  let url = generatedBillData.billUrl || `/api/v1/finance/transactions/${generatedBillData.transaction?._id}/bill`;
                  if (!url.includes('lang=')) {
                    url += (url.includes('?') ? '&' : '?') + `lang=${language}`;
                  }
                  window.open(url, '_blank');
                }}
              >
                {t('dashboard.billPdf') ? `${t('dashboard.billPdf')} (PDF)` : 'Download / Print Bill (PDF)'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Delete Worker Confirmation Alert */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setWorkerToDelete(null);
          setSelectedWorkerIdToDelete('');
        }}
        title="Delete Worker from Workforce Registry"
      >
        <div className="space-y-4">
          {/* Worker Selector Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Worker to Delete
            </label>
            <select
              value={selectedWorkerIdToDelete}
              onChange={(e) => handleWorkerSelectionChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs font-semibold text-slate-900 dark:text-white shadow-sm focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose craftsman to delete --</option>
              {workers.map((w) => {
                const nb = (w.totalEarned || 0) - (w.outstandingAdvanceBalance || 0);
                const nbFormatted = nb < 0 ? `-₹${Math.abs(nb).toLocaleString('en-IN')}` : `₹${nb.toLocaleString('en-IN')}`;
                const statusTag = nb === 0 ? ' [Net: ₹0 • Ready to Delete]' : ` [Net: ${nbFormatted} • Prohibited]`;
                const wId = w.userId?._id || w._id;
                const wName = w.userId?.name || 'Worker';
                return (
                  <option key={wId} value={wId}>
                    {wName} ({w.workerCode}){statusTag}
                  </option>
                );
              })}
            </select>
          </div>

          {workerToDelete && (() => {
            const earned = workerToDelete.totalEarned || 0;
            const advance = workerToDelete.outstandingAdvanceBalance || 0;
            const netBalance = workerToDelete.netBalance !== undefined ? workerToDelete.netBalance : (earned - advance);
            const canDelete = netBalance === 0;

            return (
              <div className="space-y-3.5">
                {/* Financial Balance Summary Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{workerToDelete.userId?.name}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{workerToDelete.workerCode} • {workerToDelete.userId?.phone}</p>
                    </div>
                    <Badge variant={workerToDelete.userId?.status} size="sm">
                      {workerToDelete.userId?.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block">Approved Earned</span>
                      <strong className="text-xs font-black text-slate-900 dark:text-white mt-0.5 block">
                        ₹{earned.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block">Outstanding Advance</span>
                      <strong className="text-xs font-black text-rose-700 dark:text-rose-400 mt-0.5 block">
                        ₹{advance.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className={`rounded-lg p-2 border ${
                      canDelete
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                        : netBalance < 0
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                    }`}>
                      <span className="text-[10px] font-medium block">Net Balance</span>
                      <strong className="text-xs font-black mt-0.5 block">
                        {netBalance < 0
                          ? `-₹${Math.abs(netBalance).toLocaleString('en-IN')}`
                          : `₹${netBalance.toLocaleString('en-IN')}`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Validation Banner: Prohibited vs Eligible */}
                {!canDelete ? (
                  <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Deletion Prohibited — Net Balance Must Be Exactly ₹0</span>
                    </div>

                    {netBalance > 0 ? (
                      <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                        Worker <strong className="text-rose-950 dark:text-rose-100">{workerToDelete.userId?.name}</strong> has{' '}
                        <strong className="text-rose-950 dark:text-rose-100 font-bold">₹{netBalance.toLocaleString('en-IN')}</strong> in unpaid earned wages dues.
                        System rules strictly prohibit deleting workers with unsettled dues. You must settle and pay the net amount via <strong>Pay Net</strong> before deleting.
                      </p>
                    ) : (
                      <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                        Worker <strong className="text-rose-950 dark:text-rose-100">{workerToDelete.userId?.name}</strong> has an advance of{' '}
                        <strong className="text-rose-950 dark:text-rose-100 font-bold">₹{advance.toLocaleString('en-IN')}</strong> exceeding approved earnings (Net Balance:{' '}
                        <strong className="text-rose-950 dark:text-rose-100 font-bold">-₹{Math.abs(netBalance).toLocaleString('en-IN')}</strong>).
                        System rules strictly prohibit deleting workers with unrecovered advances. The advance must be settled before deletion.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 p-3.5 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Worker Eligible for Deletion (Net Balance = ₹0)</span>
                      </div>
                      <p className="text-emerald-800 dark:text-emerald-300">
                        All wage earnings and cash advances for <strong className="text-emerald-950 dark:text-emerald-100">{workerToDelete.userId?.name}</strong> are completely settled at ₹0.
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>Final Deletion Confirmation</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{workerToDelete.userId?.name}</strong> ({workerToDelete.workerCode})?
                        This will delete their user account, remove their craftsman profile, and unassign them from any active furniture projects.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Modal Action Buttons */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setWorkerToDelete(null);
                setSelectedWorkerIdToDelete('');
              }}
            >
              Cancel
            </Button>
            {workerToDelete && (workerToDelete.totalEarned || 0) - (workerToDelete.outstandingAdvanceBalance || 0) === 0 ? (
              <Button
                variant="danger"
                loading={deleteSubmitting}
                onClick={handleConfirmDelete}
                icon={Trash2}
              >
                Yes, Delete Worker (Net = ₹0)
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={true}
                icon={Trash2}
                title="Worker can only be deleted when Net Balance is exactly ₹0"
              >
                Delete Prohibited (Net ≠ ₹0)
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Record Advance Disbursement */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => {
          setDisburseModalOpen(false);
          setSelectedAdvanceForDisburse(null);
        }}
        title="Record Advance Disbursement"
      >
        {selectedAdvanceForDisburse && (
          <form onSubmit={handleDisburseAdvanceFromActivity} className="space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 p-3.5 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 space-y-1">
              <div>Worker: <strong className="text-slate-900 dark:text-white font-bold">{activityWorker?.userId?.name || selectedAdvanceForDisburse.workerId?.name}</strong></div>
              <div>Request Code: <span className="font-mono text-amber-800 dark:text-amber-400 font-bold">{selectedAdvanceForDisburse.requestCode || 'ADV-REQ'}</span></div>
              <div>Amount to Disburse: <strong className="font-black text-sm text-slate-950 dark:text-white">₹{selectedAdvanceForDisburse.amount?.toLocaleString('en-IN')}</strong></div>
              <div>Reason: <span className="text-slate-700 dark:text-slate-400 italic">{selectedAdvanceForDisburse.reason}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Disbursement Payment Method</label>
              <select
                value={disbursePaymentMethod}
                onChange={(e) => setDisbursePaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">UTR / Receipt Reference Number (Optional)</label>
              <input
                type="text"
                value={disburseReceiptReference}
                onChange={(e) => setDisburseReceiptReference(e.target.value)}
                placeholder="e.g. UPI-UTR-298382910 or Cash Receipt #"
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setDisburseModalOpen(false);
                  setSelectedAdvanceForDisburse(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={disburseSubmitting}>
                Confirm Disbursement
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
