import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { localToday } from '../utils/date';
import { downloadPdf } from '../utils/download';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  UserPlus,
  IndianRupee,
  Phone,
  Edit,
  ChevronRight,
  Calendar,
  Receipt,
  CheckCircle2,
  Lock,
  FileText,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Check,
  X,
  CalendarOff,
  User,
} from 'lucide-react';

/**
 * Worker attendance can only be edited on the same day it was recorded/taken.
 * An entry is editable ONLY if:
 * 1. It is not already finalized/locked in payroll
 * 2. The shift date or record creation date matches today's local date
 */
const isAttendanceEditableToday = (att) => {
  if (!att) return false;
  if (att.isPayrollProcessed) return false;

  const todayStr = localToday(); // YYYY-MM-DD in local time
  const attDate = att.date ? String(att.date).slice(0, 10) : '';

  let createdDateStr = '';
  if (att.createdAt) {
    try {
      const cd = new Date(att.createdAt);
      if (!isNaN(cd.getTime())) {
        createdDateStr = new Date(cd.getTime() - cd.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      }
    } catch {}
  }

  return attDate === todayStr || createdDateStr === todayStr;
};

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

const ATTENDANCE_CODE_OPTIONS = [
  { code: 'P', label: 'P (1.0x)', desc: 'Full Day' },
  { code: 'HALF', label: 'HALF (0.5x)', desc: 'Half Day' },
  { code: 'P1/5', label: 'P1/5 (1.5x)', desc: 'Till 9 PM' },
  { code: 'PP', label: 'PP (2.0x)', desc: 'Till 12 AM' },
  { code: 'ABSENT', label: 'Absent (0.0x)', desc: 'No Wage' },
  { code: 'LEAVE', label: 'Leave (0.0x)', desc: 'On Leave' },
];

const MAX_ADVANCE = 25000; // mirrors MAX_ADVANCE_LIMIT on the server

const PaymentMethodPicker = ({ value, onChange }) => (
  <div>
    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Paid by</span>
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
      {[
        { id: 'CASH', label: 'Cash' },
        { id: 'UPI', label: 'UPI' },
        { id: 'BANK_TRANSFER', label: 'Bank' },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={`min-h-11 rounded-xl border text-sm font-bold transition ${
            value === m.id
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  </div>
);

/** One line of the pay receipt: label (+/− sign, hint) on the left, amount input on the right. */
const PayRow = ({ sign, label, hint, children }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {sign && <span className={sign === '+' ? 'text-emerald-600 mr-1' : 'text-rose-600 mr-1'}>{sign}</span>}
        {label}
      </div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
    {children}
  </div>
);

export const WorkersPage = () => {
  const { user, isOwner, isThekedar } = useAuth();
  const { t, language } = useLanguage();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Register Worker Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerTrade, setWorkerTrade] = useState('Mistry');
  const [defaultWage, setDefaultWage] = useState('750');
  const [thekedarsList, setThekedarsList] = useState([]);
  const [selectedThekedarId, setSelectedThekedarId] = useState('');

  // Edit Worker Details Modal
  const [editWorkerModalOpen, setEditWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTrade, setEditTrade] = useState('Mistry');
  const [editWage, setEditWage] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Mark Daily Attendance Modal (Direct from Worker Cards / Roster)
  const [markAttendanceModalOpen, setMarkAttendanceModalOpen] = useState(false);
  const [selectedAttendanceWorker, setSelectedAttendanceWorker] = useState(null);
  const [attendanceWorkerId, setAttendanceWorkerId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(localToday);
  const [attendanceShift, setAttendanceShift] = useState('GENERAL');
  const [attendanceCode, setAttendanceCode] = useState('P');
  const [markAttendanceSubmitting, setMarkAttendanceSubmitting] = useState(false);

  // Worker details sheet (attendance history, advances, payment bills)
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityWorker, setActivityWorker] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'advances' | 'bills'

  // Pay Net Amount Modal
  // Edit an existing attendance entry (not yet paid)
  const [editAttendance, setEditAttendance] = useState(null);
  const [editAttendanceCode, setEditAttendanceCode] = useState('P');
  const [editAttendanceReason, setEditAttendanceReason] = useState('');
  const [editAttendanceSubmitting, setEditAttendanceSubmitting] = useState(false);

  // Give an advance directly to a worker
  const [advanceWorker, setAdvanceWorker] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('CASH');
  const [advanceReference, setAdvanceReference] = useState('');
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Monthly attendance PDF picker
  const [pdfTarget, setPdfTarget] = useState(null);
  const [pdfMonth, setPdfMonth] = useState(() => localToday().slice(0, 7));
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payWorker, setPayWorker] = useState(null);
  const [payBaseEarned, setPayBaseEarned] = useState(0);
  const [payAdvanceDeduction, setPayAdvanceDeduction] = useState(0);
  const [payFoodDeduction, setPayFoodDeduction] = useState(0);
  const [payRoomRentDeduction, setPayRoomRentDeduction] = useState(0);
  const [payAdditionalWages, setPayAdditionalWages] = useState(0);
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

  // Advance review & disbursal inside the worker details sheet
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedAdvanceForDisburse, setSelectedAdvanceForDisburse] = useState(null);
  const [disbursePaymentMethod, setDisbursePaymentMethod] = useState('CASH');
  const [disburseReceiptReference, setDisburseReceiptReference] = useState('');
  const [disburseSubmitting, setDisburseSubmitting] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const fetchWorkers = async () => {
    try {
      setLoadError(null);
      const res = await api.get('/users/workers');
      setWorkers(res.data.workers);
    } catch (err) {
      setLoadError(err.message);
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
      const res = await api.post('/users/workers', {
        name: workerName.trim(),
        phone: workerPhone.trim(),
        trade: workerTrade || 'Mistry',
        defaultDailyWage: defaultWage !== '' && !isNaN(Number(defaultWage)) ? Number(defaultWage) : 750,
        ...(isOwner ? { thekedarId: selectedThekedarId || thekedarsList[0]?._id } : {}),
      });
      const generatedCode = res.data?.data?.worker?.profile?.workerCode || 'FC-WRK';
      setMessage({ type: 'success', text: `Craftsman ${workerName} added successfully with ID ${generatedCode}!` });
      setRegisterModalOpen(false);
      setWorkerName('');
      setWorkerPhone('');
      setWorkerTrade('Mistry');
      setDefaultWage('750');
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleOpenMarkAttendance = (worker) => {
    if (!worker) return;
    setSelectedAttendanceWorker(worker);
    const targetWorkerId = worker?.userId?._id || worker?._id || '';
    setAttendanceWorkerId(targetWorkerId);
    setAttendanceDate(localToday());
    setAttendanceShift('GENERAL');
    setAttendanceCode('P');
    setMarkAttendanceModalOpen(true);
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceWorkerId) {
      setMessage({ type: 'error', text: 'Please select a worker' });
      return;
    }
    try {
      setMarkAttendanceSubmitting(true);
      const res = await api.post('/attendance/submit', {
        workerId: attendanceWorkerId,
        date: attendanceDate,
        shift: attendanceShift,
        code: attendanceCode,
      });
      setMessage({ type: 'success', text: res.data?.updated ? `Attendance for ${attendanceDate} updated to ${attendanceCode}.` : `Attendance for ${attendanceDate} marked as ${attendanceCode}.` });
      setMarkAttendanceModalOpen(false);
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit attendance' });
    } finally {
      setMarkAttendanceSubmitting(false);
    }
  };

  // Reload the open worker sheet and the cards after a change.
  const refreshWorkerData = async (worker) => {
    fetchWorkers();
    const userId = worker?.userId?._id;
    if (userId) {
      const res = await api.get(`/users/workers/${userId}`);
      setActivityData(res.data);
    }
  };

  const handleOpenEditAttendance = (att) => {
    if (!isAttendanceEditableToday(att)) {
      setMessage({ type: 'error', text: 'Worker attendance can only be edited on the same day it was taken.' });
      return;
    }
    setEditAttendance(att);
    setEditAttendanceCode(att.code);
    setEditAttendanceReason('');
  };

  const handleSaveAttendanceEdit = async (e) => {
    e.preventDefault();
    if (!editAttendance) return;
    if (!isAttendanceEditableToday(editAttendance)) {
      setMessage({ type: 'error', text: 'Worker attendance can only be edited on the same day it was taken.' });
      setEditAttendance(null);
      return;
    }
    setEditAttendanceSubmitting(true);
    try {
      await api.patch(`/attendance/${editAttendance._id}/rectify`, {
        code: editAttendanceCode,
        reason: editAttendanceReason.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Attendance for ${editAttendance.date} updated to ${editAttendanceCode}.` });
      setEditAttendance(null);
      await refreshWorkerData(activityWorker);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setEditAttendanceSubmitting(false);
    }
  };

  const handleToggleLeaveToday = async () => {
    if (!activityWorker?.userId?._id && !activityWorker?._id) return;
    const workerUserId = activityWorker?.userId?._id || activityWorker?._id;
    const workerName = activityWorker?.userId?.name || activityWorker?.name || 'Craftsman';
    const todayStr = localToday();
    const todayAtt = (activityData?.attendanceHistory || []).find((a) => a.date === todayStr);

    if (todayAtt?.code === 'LEAVE') {
      const confirmRemove = window.confirm(
        `Remove leave for ${workerName} today (${todayStr})? This will return them to active attendance on the dashboard.`
      );
      if (!confirmRemove) return;
      try {
        setLeaveActionLoading(true);
        await api.delete(`/attendance/${todayAtt._id}`);
        setMessage({
          type: 'success',
          text: `Leave removed for ${workerName}. Worker returned to active attendance.`,
        });
        await refreshWorkerData(activityWorker);
        fetchWorkers();
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Failed to remove leave' });
      } finally {
        setLeaveActionLoading(false);
      }
    } else {
      try {
        setLeaveActionLoading(true);
        await api.post('/attendance/submit', {
          workerId: workerUserId,
          date: todayStr,
          shift: 'GENERAL',
          code: 'LEAVE',
        });
        setMessage({
          type: 'success',
          text: `${workerName} marked on leave for today (${todayStr}). They will not appear in today's attendance list on the dashboard.`,
        });
        await refreshWorkerData(activityWorker);
        fetchWorkers();
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Failed to mark leave' });
      } finally {
        setLeaveActionLoading(false);
      }
    }
  };

  const handleOpenGiveAdvance = (w) => {
    setActivityModalOpen(false);
    setAdvanceWorker(w);
    setAdvanceAmount('');
    setAdvanceReason('');
    setAdvanceMethod('CASH');
    setAdvanceReference('');
  };

  const handleGiveAdvance = async (e) => {
    e.preventDefault();
    setAdvanceSubmitting(true);
    try {
      const res = await api.post(`/finance/workers/${advanceWorker.userId?._id}/advance`, {
        amount: parseFloat(advanceAmount),
        reason: advanceReason.trim(),
        paymentMethod: advanceMethod,
        receiptReference: advanceReference.trim() || undefined,
      });
      const txId = res.data?.transaction?.transactionId;
      setMessage({ type: 'success', text: `Advance of ₹${parseFloat(advanceAmount).toLocaleString('en-IN')} given to ${advanceWorker.userId?.name}${txId ? ` (${txId})` : ''}. It will be deducted at the next payment.` });
      const worker = advanceWorker;
      setAdvanceWorker(null);
      fetchWorkers();
      handleOpenActivity(worker, 'advances');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  // Attendance PDFs are per month for a specific craftsman only (from worker card).
  const handleExportWorkerAttendancePDF = (worker) => {
    if (!worker) return;
    setPdfTarget({ worker });
    setPdfMonth(localToday().slice(0, 7));
  };

  const handleDownloadMonthPdf = () => {
    if (!pdfTarget?.worker) return;
    const workerUserId = pdfTarget.worker.userId?._id || pdfTarget.worker._id;
    if (!workerUserId) return;
    const [year, month] = pdfMonth.split('-');
    const params = new URLSearchParams({ year, month: String(Number(month)), lang: language, workerId: workerUserId });
    downloadPdf(`/api/v1/reports/export/attendance?${params}`, `Attendance_${pdfMonth}_${pdfTarget.worker.userId?.name || 'Worker'}.pdf`);
    setPdfTarget(null);
  };

  const handleOpenEditWorker = (worker) => {
    setEditingWorker(worker);
    setEditName(worker.userId?.name || worker.name || '');
    setEditPhone(worker.userId?.phone || worker.phone || '');
    setEditTrade(worker.skills?.[0] || 'Mistry');
    setEditWage(worker.defaultDailyWage || '750');
    setEditWorkerModalOpen(true);
  };

  const handleUpdateWorkerDetails = async (e) => {
    e.preventDefault();
    if (!editingWorker) return;
    const userId = editingWorker.userId?._id || editingWorker._id;
    try {
      setEditSubmitting(true);
      await api.put(`/users/workers/${userId}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        trade: editTrade,
        defaultDailyWage: editWage !== '' && !isNaN(Number(editWage)) ? Number(editWage) : undefined,
      });
      setMessage({ type: 'success', text: `Craftsman details for ${editName} updated successfully!` });
      setEditWorkerModalOpen(false);
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update craftsman details' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenActivity = async (w, initialTab = 'attendance') => {
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
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
    setPayModalOpen(true);
  };

  // Advance cut follows wages + bonus automatically (capped at the outstanding advance); the user can still edit it.
  const autoAdvanceCut = (base, bonus) =>
    setPayAdvanceDeduction(Math.min((parseFloat(base) || 0) + (parseFloat(bonus) || 0), payWorker?.outstandingAdvanceBalance || 0));

  const handleBaseEarnedChange = (val) => {
    setPayBaseEarned(val);
    autoAdvanceCut(val, payAdditionalWages);
  };

  const handleAdditionalWagesChange = (val) => {
    setPayAdditionalWages(val);
    autoAdvanceCut(payBaseEarned, val);
  };

  const handleUseFullEarned = () => {
    const full = payWorker?.totalEarned || 0;
    setPayBaseEarned(full);
    autoAdvanceCut(full, payAdditionalWages);
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
        billUrl: `/api/v1/finance/transactions/${res.data?.transaction?._id || res.data?.transaction?.transactionId}/bill?lang=${language}`,
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
        ? `Are you sure you want to ACTIVATE the account for worker "${workerUser.name}"?\n\nThey will appear again for attendance and payments.`
        : `Are you sure you want to DEACTIVATE / SUSPEND the account for worker "${workerUser.name}"?\n\nThey will be hidden from attendance until reactivated. Their records stay intact.`
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
      <LoadError message={loadError} onRetry={fetchWorkers} />
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('workers.pageTitle', 'Workers')}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {workers.length} {t('workers.countLabel', 'workers')} · {t('workers.tapHint', 'tap a card for attendance, advances and bills')}
          </p>
        </div>

        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          {isThekedar && (
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial justify-center text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-400 font-bold"
              onClick={handleOpenSelectDeleteModal}
              icon={Trash2}
            >
              {t('workers.deleteWorker', 'Delete Worker')}
            </Button>
          )}
          {(isOwner || isThekedar) && (
            <Button variant="primary" onClick={() => setRegisterModalOpen(true)} icon={UserPlus} className="flex-1 sm:flex-initial justify-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {workers.map((w) => {
            const wid = w.userId?._id || w._id;
            return (
            <Card key={wid} className="flex flex-col gap-3 hover:border-amber-400 dark:hover:border-amber-600 transition">
              {/* Tap the card for wages, balances and all other actions */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOpenActivity(w)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleOpenActivity(w))}
                aria-label={`${w.userId?.name || 'Worker'}: ${t('workers.viewDetails', 'view details and actions')}`}
                className="cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400 font-mono">{w.workerCode}</span>
                    {w.hasPendingAdvance && (
                      <span
                        onClick={(e) => { e.stopPropagation(); handleOpenActivity(w, 'advances'); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs border border-amber-400 cursor-pointer animate-pulse transition tracking-tight"
                        title={`Worker requested advance of ₹${(w.requestedAdvanceAmount || w.pendingAdvance?.totalRequested || 0).toLocaleString('en-IN')}. Click to review.`}
                      >
                        <IndianRupee className="h-3 w-3 stroke-[2.5]" />
                        <span>{t('worker.reqAdvBadge', 'Req Adv')}: ₹{(w.requestedAdvanceAmount || w.pendingAdvance?.totalRequested || 0).toLocaleString('en-IN')}</span>
                      </span>
                    )}
                  </div>
                  {!isThekedar && (
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
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{w.userId?.name || 'Worker'}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        ₹{w.defaultDailyWage || 750}/day
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-400">{w.userId?.phone || 'No phone'}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </div>

                <div className="mt-3 flex justify-between items-center text-[11px] bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-900 dark:text-amber-300 font-semibold">{t('workers.thisMonthWorked', 'Worked This Month')}:</span>
                  <strong className="text-amber-950 dark:text-amber-200 font-bold">
                    {w.monthDehadi !== undefined ? `${w.monthDehadi} ${t('calendar.dehadiUnit', 'Shifts')} (${w.monthWorkedDays || 0}d)` : `${w.monthWorkedDays || 0} ${t('calendar.days', 'days')}`}
                  </strong>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Register Worker */}
      <Modal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} title="Register Craftsman to Workforce">
        <form onSubmit={handleRegisterWorker} className="space-y-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
            Craftsmen are managed workforce records. A unique Worker ID (e.g. <strong>FC-WRK-{String(workers.length + 1).padStart(4, '0')}</strong>) will be auto-generated. Workers do not need a password or login account.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Craftsman name"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
              <input
                type="text"
                required
                value={workerPhone}
                onChange={(e) => setWorkerPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Trade / Skill</label>
              <select
                value={workerTrade}
                onChange={(e) => setWorkerTrade(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="Mistry">Mistry</option>
                <option value="Helper">Helper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Daily Wage (₹/day) *</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={defaultWage}
              onChange={(e) => setDefaultWage(e.target.value)}
              placeholder="Custom rate e.g. 754"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
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

      {/* Modal: Edit Craftsman Details */}
      <Modal isOpen={editWorkerModalOpen} onClose={() => setEditWorkerModalOpen(false)} title="Edit Craftsman Profile">
        <form onSubmit={handleUpdateWorkerDetails} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Trade / Specialty</label>
              <select
                value={editTrade}
                onChange={(e) => setEditTrade(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="Mistry">Mistry</option>
                <option value="Helper">Helper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Daily Wage (₹/day) *</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={editWage}
              onChange={(e) => setEditWage(e.target.value)}
              placeholder="Custom rate e.g. 754"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setEditWorkerModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={editSubmitting}>
              {editSubmitting ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Mark Worker Daily Attendance */}
      <Modal
        isOpen={markAttendanceModalOpen}
        onClose={() => setMarkAttendanceModalOpen(false)}
        title="Mark Worker Daily Attendance"
      >
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          {/* Selected Craftsman Fixed Identity Banner (Direct from Worker Card) */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-black text-white shadow-xs text-base">
                {(selectedAttendanceWorker?.userId?.name || selectedAttendanceWorker?.name || 'W').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedAttendanceWorker?.userId?.name || selectedAttendanceWorker?.name || 'Worker'}
                  </h4>
                  <span className="rounded-md bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200 font-mono">
                    {selectedAttendanceWorker?.workerCode || 'FC-WRK'}
                  </span>
                  <span className="rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {selectedAttendanceWorker?.skills?.[0] || 'Mistry'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Daily Wage Rate: <strong className="text-amber-800 dark:text-amber-300 font-black">₹{selectedAttendanceWorker?.defaultDailyWage || 750} / day</strong>
                  {selectedAttendanceWorker?.userId?.phone && (
                    <span className="ml-2 text-slate-400 dark:text-slate-500">• {selectedAttendanceWorker?.userId?.phone}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              Logging attendance directly for this craftsman from their worker card.
            </div>
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
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Working Shift
              </label>
              <select
                value={attendanceShift}
                onChange={(e) => setAttendanceShift(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="GENERAL">General Shift (9 AM – 6 PM)</option>
                <option value="NIGHT">Night Shift</option>
                <option value="OVERTIME">Overtime Shift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attendance Multiplier Code *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
              {ATTENDANCE_CODE_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => setAttendanceCode(item.code)}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    attendanceCode === item.code
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-black shadow-xs ring-2 ring-amber-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-black">{item.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                </button>
              ))}
            </div>
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

      {/* Modal: Worker details — attendance, advances and bills (opened by tapping a worker card) */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={activityWorker ? `${activityWorker.userId?.name || 'Worker'} (${activityWorker.workerCode})` : 'Worker'}
        maxWidth="max-w-5xl"
      >
        {activityWorker && (
          <div className="space-y-5">
            {/* Worker Top Profile Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-amber-50 via-amber-100/40 to-slate-50 dark:from-slate-800 dark:via-amber-950/40 dark:to-slate-800 p-4 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-lg shadow-sm">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{activityWorker.userId?.name || 'Worker'}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ₹{activityWorker.defaultDailyWage || 750}/day
                    </span>
                    {(() => {
                      const todayStr = localToday();
                      const todayAtt = (activityData?.attendanceHistory || []).find((a) => a.date === todayStr);
                      return todayAtt?.code === 'LEAVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <CalendarOff className="h-3 w-3" />
                          On Leave Today
                        </span>
                      ) : null;
                    })()}
                    
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {activityWorker.workerCode}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {activityWorker.userId?.phone || 'No phone'}</span>
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
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Net Payable</div>
                  <div className={`text-xs font-bold ${((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    ₹{((activityWorker.totalEarned || 0) - (activityWorker.outstandingAdvanceBalance || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Attendance Logs</div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{activityData?.attendanceHistory?.length || 0}</div>
                </div>
              </div>
            </div>

            {/* Actions (each closes this sheet before opening its own form) */}
            {(isOwner || isThekedar) && (() => {
              const todayStr = localToday();
              const todayAtt = (activityData?.attendanceHistory || []).find((a) => a.date === todayStr);
              const isOnLeaveToday = todayAtt?.code === 'LEAVE';
              return (
                <div className="flex flex-wrap gap-2">
                  {isThekedar && (
                    <Button variant="success" className="justify-center" icon={IndianRupee} onClick={() => { setActivityModalOpen(false); handleOpenPayModal(activityWorker); }}>
                      {t('thekedar.payWorkerNet', 'Pay Net')}
                    </Button>
                  )}
                  {isThekedar && (
                    <Button variant="outline" className="justify-center border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300" icon={Receipt} onClick={() => handleOpenGiveAdvance(activityWorker)}>
                      Give Advance
                    </Button>
                  )}
                  <Button variant="outline" className="justify-center border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300" icon={Edit} onClick={() => { setActivityModalOpen(false); handleOpenEditWorker(activityWorker); }}>
                    {t('common.edit', 'Edit')}
                  </Button>
                  {isThekedar && (
                    <Button
                      variant={isOnLeaveToday ? 'secondary' : 'outline'}
                      className={`justify-center ${
                        isOnLeaveToday
                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      icon={CalendarOff}
                      loading={leaveActionLoading}
                      onClick={handleToggleLeaveToday}
                      title={isOnLeaveToday ? 'Currently on leave today. Click to remove leave.' : 'Mark worker on leave for today'}
                    >
                      {isOnLeaveToday ? 'On Leave ✓' : 'On Leave'}
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Tab Navigation — 3-column responsive grid: all tabs visible in single view with zero side-scroll */}
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
              {[
                { id: 'attendance', label: t('workers.tabAttendance', 'Attendance History'), shortLabel: 'Attendance', icon: Calendar, count: activityData?.attendanceHistory?.length || 0 },
                { id: 'advances', label: t('workers.tabAdvances', 'Advances Taken'), shortLabel: 'Advances', icon: Receipt, count: activityData?.advanceRequests?.length || 0 },
                { id: 'bills', label: t('workers.tabBills', 'Payment Bills'), shortLabel: 'Bills', icon: IndianRupee, count: activityData?.transactions?.length || 0 },
              ].map(({ id, label, shortLabel, icon: Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center justify-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-2.5 border-b-2 text-center transition-all ${
                    activeTab === id
                      ? 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                  <span className="inline sm:hidden truncate">{shortLabel}</span>
                  <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 shrink-0">{count}</span>
                </button>
              ))}
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
                {/* TAB 1: ATTENDANCE HISTORY — Fluid layout with no horizontal side scroll */}
                {activeTab === 'attendance' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                        Every logged shift with its earnings. Attendance is only editable on the same day it was taken; paid and past entries are locked.
                      </p>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                          Records: {activityData.attendanceHistory?.length || 0}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={FileText}
                          onClick={() => handleExportWorkerAttendancePDF(activityWorker)}
                          className="text-xs font-bold border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                        >
                          Monthly Attendance PDF
                        </Button>
                      </div>
                    </div>

                    {(!activityData.attendanceHistory || activityData.attendanceHistory.length === 0) ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                        <Calendar className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">No attendance records found for this worker.</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Attendance recorded from worker cards or dashboard will be tracked here.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full divide-y divide-slate-200 dark:divide-slate-700 text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3">Date</th>
                              <th className="px-2 sm:px-4 py-2.5 sm:py-3">Code</th>
                              <th className="px-2 sm:px-4 py-2.5 sm:py-3">Earned</th>
                              <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {activityData.attendanceHistory.map((att) => (
                              <tr key={att._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                                <td className="px-3 sm:px-4 py-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                                  {att.date || formatDate(att.createdAt)}
                                </td>
                                <td className="px-2 sm:px-4 py-2.5">
                                  <Badge variant={att.code} size="sm">{att.code}</Badge>
                                </td>
                                <td className="px-2 sm:px-4 py-2.5 font-bold text-amber-900 dark:text-amber-300 whitespace-nowrap text-xs">
                                  ₹{(att.calculatedEarnings ?? 0).toLocaleString('en-IN')}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                                  {att.isPayrollProcessed ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Paid (locked)
                                    </span>
                                  ) : isAttendanceEditableToday(att) ? (
                                    <Button size="sm" variant="outline" icon={Edit} onClick={() => handleOpenEditAttendance(att)}>
                                      {t('common.edit', 'Edit')}
                                    </Button>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                                      title="Attendance can only be edited on the same day it was taken"
                                    >
                                      <Lock className="h-3.5 w-3.5" /> Locked
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ADVANCES TAKEN — Single View Responsive Cards, Zero Side Scroll */}
                {activeTab === 'advances' && (
                  <div className="space-y-4">
                    {/* Section: Advance Requests */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Advance History
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
                        <div className="space-y-3">
                          {activityData.advanceRequests.map((adv) => {
                            const currentAdvance = activityWorker?.outstandingAdvanceBalance || 0;
                            const exceedsLimit = currentAdvance >= MAX_ADVANCE || (currentAdvance + (adv.amount || 0)) > MAX_ADVANCE;
                            return (
                              <div
                                key={adv._id}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-3.5 shadow-xs space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {formatDate(adv.createdAt)}
                                    </span>
                                    <Badge variant={adv.status} size="sm">{adv.status}</Badge>
                                  </div>
                                  <div className="text-sm font-black text-rose-700 dark:text-rose-400">
                                    ₹{(adv.amount || 0).toLocaleString('en-IN')}
                                  </div>
                                </div>

                                {adv.reason && (
                                  <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 break-words">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">Reason: </span>
                                    {adv.reason}
                                  </div>
                                )}

                                {adv.reviewNotes && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                    Note: {adv.reviewNotes} {adv.reviewedBy?.name ? `(by ${adv.reviewedBy.name})` : ''}
                                  </div>
                                )}

                                {(isThekedar || isOwner) && adv.status === 'PENDING' && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                    <button
                                      type="button"
                                      disabled={reviewLoadingId === adv._id || exceedsLimit}
                                      onClick={() => handleReviewAdvanceFromActivity(adv._id, 'APPROVED')}
                                      title={exceedsLimit ? "Worker advance exceeds ₹25,000 limit - Cannot Approve" : "Approve advance request"}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                        exceedsLimit
                                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                                      }`}
                                    >
                                      {reviewLoadingId === adv._id ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5" />
                                      )}
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={reviewLoadingId === adv._id}
                                      onClick={() => handleReviewAdvanceFromActivity(adv._id, 'REJECTED')}
                                      title="Deny / Reject advance request"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      <span>Deny</span>
                                    </button>
                                  </div>
                                )}

                                {(isThekedar || isOwner) && adv.status === 'APPROVED' && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                      type="button"
                                      disabled={exceedsLimit}
                                      onClick={() => {
                                        if (!exceedsLimit) {
                                          setSelectedAdvanceForDisburse(adv);
                                          setDisburseModalOpen(true);
                                        }
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                        exceedsLimit
                                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                                      }`}
                                      title={exceedsLimit ? "Worker advance exceeds ₹25,000 limit" : "Disburse approved advance amount"}
                                    >
                                      <IndianRupee className="h-3.5 w-3.5" />
                                      <span>Disburse Advance</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 3: PAYMENT BILLS — Single View Responsive Cards, Zero Side Scroll */}
                {activeTab === 'bills' && (
                  <div className="space-y-4">
                    {/* Section: Payment Transactions */}
                    <div className="space-y-2.5">
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
                        <div className="space-y-3">
                          {activityData.transactions.map((tx) => (
                            <div
                              key={tx._id}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-3.5 shadow-xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                                    {formatDate(tx.transactionDate || tx.createdAt)}
                                  </div>
                                  <div className="text-[11px] font-mono text-amber-800 dark:text-amber-400">
                                    {tx.transactionId}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                    ₹{(tx.amount || 0).toLocaleString('en-IN')}
                                  </div>
                                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {tx.category?.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                <div className="text-[11px]">
                                  <span>Method: <strong className="text-slate-800 dark:text-slate-200">{tx.paymentMethod}</strong></span>
                                  {tx.receiptReference && (
                                    <span className="ml-2 font-mono text-slate-500">({tx.receiptReference})</span>
                                  )}
                                  {tx.recordedBy?.name && (
                                    <span className="ml-2 text-slate-500">by {tx.recordedBy.name}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => downloadPdf(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, `Bill_${tx.transactionId || tx._id}.pdf`)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                                  title="Download Payment Bill (PDF)"
                                >
                                  <FileText className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                                  <span>{t('dashboard.billPdf') || 'Bill PDF'}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setActivityModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Craftsman attendance statement PDF */}
      <Modal
        isOpen={Boolean(pdfTarget?.worker)}
        onClose={() => setPdfTarget(null)}
        title={`Attendance Statement PDF — ${pdfTarget?.worker?.userId?.name || pdfTarget?.worker?.name || 'Craftsman'}`}
      >
        {pdfTarget && (() => {
          const thisMonth = localToday().slice(0, 7);
          const d = new Date(`${thisMonth}-01T00:00:00`);
          d.setMonth(d.getMonth() - 1);
          const lastMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[thisMonth, lastMonth].map((ym) => (
                  <button
                    key={ym}
                    type="button"
                    onClick={() => setPdfMonth(ym)}
                    aria-pressed={pdfMonth === ym}
                    className={`min-h-12 rounded-xl border text-sm font-bold transition ${
                      pdfMonth === ym
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/30'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ym === thisMonth ? 'This month' : 'Last month'}
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label(ym)}</span>
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Or pick any month</span>
                <input
                  type="month"
                  value={pdfMonth}
                  max={thisMonth}
                  onChange={(e) => e.target.value && setPdfMonth(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none"
                />
              </label>
              <Button className="w-full" size="lg" icon={FileText} onClick={handleDownloadMonthPdf}>
                Download {label(pdfMonth)} PDF
              </Button>
            </div>
          );
        })()}
      </Modal>

      {/* Modal: Edit Attendance Entry */}
      <Modal
        isOpen={!!editAttendance}
        onClose={() => setEditAttendance(null)}
        title={editAttendance ? `Edit Attendance — ${editAttendance.date}` : 'Edit Attendance'}
      >
        {editAttendance && (
          <form onSubmit={handleSaveAttendanceEdit} className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-sm">
              <div className="font-bold text-slate-900 dark:text-white">{activityWorker?.userId?.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Current shift: <strong>{editAttendance.code}</strong> (₹{(editAttendance.calculatedEarnings ?? 0).toLocaleString('en-IN')})
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Correct shift</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {ATTENDANCE_CODE_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => setEditAttendanceCode(item.code)}
                    aria-pressed={editAttendanceCode === item.code}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      editAttendanceCode === item.code
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-black">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reason (optional)</label>
              <input
                type="text"
                value={editAttendanceReason}
                onChange={(e) => setEditAttendanceReason(e.target.value)}
                placeholder="e.g. Worked till 9 PM, marked full day by mistake"
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setEditAttendance(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={editAttendanceSubmitting} disabled={editAttendanceCode === editAttendance.code}>
                Save Change
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Give Advance */}
      <Modal
        isOpen={!!advanceWorker}
        onClose={() => setAdvanceWorker(null)}
        title={advanceWorker ? `Give Advance — ${advanceWorker.userId?.name}` : 'Give Advance'}
      >
        {advanceWorker && (() => {
          const outstanding = advanceWorker.outstandingAdvanceBalance || 0;
          const room = Math.max(0, MAX_ADVANCE - outstanding);
          const amount = parseFloat(advanceAmount) || 0;
          return (
            <form onSubmit={handleGiveAdvance} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Advance now</div>
                  <div className="text-lg font-black text-rose-700 dark:text-rose-300">₹{outstanding.toLocaleString('en-IN')}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Can still give</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">₹{room.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max={room}
                  step="any"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 text-lg font-bold focus:border-rose-500 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000, 10000, 20000, 25000].filter((v) => v <= room).map((v) => (
                    <button key={v} type="button" onClick={() => setAdvanceAmount(String(v))} className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                      ₹{v.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reason *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="e.g. Family medical need"
                  className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
              <PaymentMethodPicker value={advanceMethod} onChange={setAdvanceMethod} />
              <input
                type="text"
                value={advanceReference}
                onChange={(e) => setAdvanceReference(e.target.value)}
                placeholder="UPI / receipt reference (optional)"
                aria-label="Payment reference"
                className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
              {amount > 0 && (
                <p className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-xs text-rose-900 dark:text-rose-200">
                  Advance becomes <strong>₹{(outstanding + amount).toLocaleString('en-IN')}</strong> and is deducted from the next net payment. A transaction and bill are recorded.
                </p>
              )}
              <Button type="submit" variant="danger" className="w-full" size="lg" loading={advanceSubmitting} disabled={amount <= 0 || amount > room}>
                Give ₹{amount.toLocaleString('en-IN')} Advance
              </Button>
            </form>
          );
        })()}
      </Modal>

      {/* Modal: Pay Worker Net Amount (receipt layout: earned + bonus − advance − deductions = net cash) */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={`Pay ${payWorker?.userId?.name || 'Worker'} (${payWorker?.workerCode || ''})`}
      >
        {payWorker && (() => {
          const outstanding = payWorker.outstandingAdvanceBalance || 0;
          const base = parseFloat(payBaseEarned) || 0;
          const bonus = parseFloat(payAdditionalWages) || 0;
          const advCut = parseFloat(payAdvanceDeduction) || 0;
          const maxCut = Math.min(base + bonus, outstanding);
          const inputCls = 'w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-right text-base font-bold focus:border-amber-500 focus:outline-none';
          return (
            <form onSubmit={handleSubmitPayNet} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Earned</div>
                  <div className="text-base font-black text-slate-900 dark:text-white">₹{(payWorker.totalEarned || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 p-2.5">
                  <div className="text-[11px] font-semibold uppercase text-rose-600">Advance</div>
                  <div className="text-base font-black text-rose-700 dark:text-rose-300">₹{outstanding.toLocaleString('en-IN')}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">Daily wage</div>
                  <div className="text-base font-black text-amber-800 dark:text-amber-300">₹{payWorker.defaultDailyWage || 0}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                <PayRow label="Wages to settle" hint={<button type="button" onClick={handleUseFullEarned} className="font-semibold text-amber-700 dark:text-amber-400 underline">Use full ₹{(payWorker.totalEarned || 0).toLocaleString('en-IN')}</button>}>
                  <input type="number" inputMode="decimal" min="0" step="any" required aria-label="Wages to settle" value={payBaseEarned} onChange={(e) => handleBaseEarnedChange(e.target.value)} className={inputCls} />
                </PayRow>
                <PayRow sign="+" label="Bonus / allowance" hint="Overtime, travel or festival bonus">
                  <input type="number" inputMode="decimal" min="0" step="any" aria-label="Bonus or allowance" value={payAdditionalWages} onChange={(e) => handleAdditionalWagesChange(e.target.value)} className={inputCls} />
                </PayRow>
                <PayRow
                  sign="−"
                  label="Advance cut"
                  hint={
                    outstanding > 0 ? (
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span>₹{outstanding.toLocaleString('en-IN')} → ₹{Math.max(0, outstanding - advCut).toLocaleString('en-IN')} left</span>
                        <button type="button" onClick={() => setPayAdvanceDeduction(maxCut)} className="font-semibold text-rose-700 dark:text-rose-400 underline">Max</button>
                        <button type="button" onClick={() => setPayAdvanceDeduction(0)} className="font-semibold text-slate-600 dark:text-slate-400 underline">None</button>
                      </span>
                    ) : 'No advance taken'
                  }
                >
                  <input type="number" inputMode="decimal" min="0" max={outstanding} step="any" aria-label="Advance cut" disabled={outstanding === 0} value={payAdvanceDeduction} onChange={(e) => setPayAdvanceDeduction(e.target.value)} className={`${inputCls} disabled:opacity-50`} />
                </PayRow>
                <PayRow sign="−" label="Food / mess">
                  <input type="number" inputMode="decimal" min="0" step="any" aria-label="Food deduction" value={payFoodDeduction} onChange={(e) => setPayFoodDeduction(e.target.value)} className={inputCls} />
                </PayRow>
                <PayRow sign="−" label="Room rent">
                  <input type="number" inputMode="decimal" min="0" step="any" aria-label="Room rent deduction" value={payRoomRentDeduction} onChange={(e) => setPayRoomRentDeduction(e.target.value)} className={inputCls} />
                </PayRow>
                <div className="flex items-center justify-between gap-3 rounded-b-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-4">
                  <div>
                    <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Net cash to pay</div>
                    <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                      ₹{(base + bonus).toLocaleString('en-IN')} − ₹{(advCut + (parseFloat(payFoodDeduction) || 0) + (parseFloat(payRoomRentDeduction) || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">₹{computedNetPay.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <PaymentMethodPicker value={payMethod} onChange={setPayMethod} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="text" aria-label="Payment reference" value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="UPI / receipt reference (optional)" className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none" />
                <input type="text" aria-label="Payment notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Notes (optional)" className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>

              <div className="sticky bottom-0 -mx-5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-5 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
                <Button type="submit" variant="success" size="lg" className="w-full" loading={paySubmitting} icon={IndianRupee}>
                  Confirm & Pay ₹{computedNetPay.toLocaleString('en-IN')}
                </Button>
              </div>
            </form>
          );
        })()}
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
                  const txId = generatedBillData.transaction?._id || generatedBillData.transaction?.transactionId;
                  const billCode = generatedBillData.transaction?.transactionId || txId || 'payment';
                  let url = generatedBillData.billUrl;
                  if (!url) {
                    url = `/api/v1/finance/transactions/${txId}/bill?lang=${language}`;
                  } else if (!url.includes('lang=')) {
                    url += (url.includes('?') ? '&' : '?') + `lang=${language}`;
                  }
                  downloadPdf(url, `Bill_${billCode}.pdf`);
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
                        This will delete their user account and remove their craftsman profile.
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
