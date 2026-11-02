import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import {
  Calendar,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  Send,
  PlusCircle,
  IndianRupee,
  FolderKanban,
  FileText,
  Download,
} from 'lucide-react';

export const WorkerDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Calendar states
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState({ records: [], payments: [], advances: [], summary: null });

  // Attendance Submission State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCode, setSelectedCode] = useState('P');
  const [extraWorkCategory, setExtraWorkCategory] = useState('');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [submitting, setSubmitting] = useState(false);

  // Advance Request State
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  // Tool acknowledgment & damage state
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [isMissing, setIsMissing] = useState(false);

  // Day Details Modal State
  const [dayDetailsModalOpen, setDayDetailsModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState('');
  const [selectedDayRecords, setSelectedDayRecords] = useState([]);
  const [selectedDayPayments, setSelectedDayPayments] = useState([]);
  const [selectedDayAdvances, setSelectedDayAdvances] = useState([]);

  // Dispute Modal State
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('ATTENDANCE');
  const [disputeSubject, setDisputeSubject] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');

  const [message, setMessage] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setDashboardData(res.data);
      if (res.data?.activeAssignments?.length > 0) {
        setSelectedProjectId(res.data.activeAssignments[0].projectId?._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCalendar = async (y, m) => {
    try {
      const res = await api.get(`/attendance/calendar?year=${y}&month=${m}`);
      setCalendarData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchCalendar(calYear, calMonth)]).finally(() => setLoading(false));
  }, []);

  const handleMonthChange = (y, m) => {
    setCalYear(y);
    setCalMonth(m);
    fetchCalendar(y, m);
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetProjId =
        selectedProjectId ||
        (dashboardData?.activeAssignments?.length > 0
          ? dashboardData.activeAssignments[0].projectId?._id
          : null);

      if (!targetProjId) {
        throw new Error('Please select an active furniture project.');
      }

      await api.post('/attendance/submit', {
        projectId: targetProjId,
        date: todayStr,
        code: selectedCode,
        checkInTime: checkInTime || '09:00',
        checkOutTime: checkOutTime || '18:00',
        extraWorkCategory:
          selectedCode === 'P1/5' || selectedCode === 'PP'
            ? extraWorkCategory || 'Extended site work'
            : undefined,
      });
      setMessage({ type: 'success', text: "Today's attendance submitted successfully!" });
      setSubmitModalOpen(false);
      fetchDashboard();
      fetchCalendar(calYear, calMonth);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestAdvance = async (e) => {
    e.preventDefault();
    const currentAdv = profile?.outstandingAdvanceBalance || 0;
    const reqAmount = parseFloat(advanceAmount);

    if (currentAdv >= 10000) {
      setMessage({ type: 'error', text: 'You have reached the maximum advance limit of ₹10,000 and cannot request additional advances.' });
      return;
    }
    if (currentAdv + reqAmount > 10000) {
      setMessage({ type: 'error', text: `Requested amount pushes total advance to ₹${(currentAdv + reqAmount).toLocaleString('en-IN')}, exceeding the ₹10,000 limit.` });
      return;
    }

    try {
      await api.post('/finance/advance-requests', {
        projectId: selectedProjectId || undefined,
        amount: reqAmount,
        reason: advanceReason,
      });
      setMessage({ type: 'success', text: 'Advance request submitted to Thekedar!' });
      setAdvanceModalOpen(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleAcknowledgeTool = async (issueId) => {
    try {
      await api.patch(`/tools/issues/${issueId}/acknowledge`);
      setMessage({ type: 'success', text: 'Tool receipt acknowledged!' });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleReportToolDamage = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tools/${selectedToolId}/report-damage`, {
        damageNotes,
        isMissing,
      });
      setMessage({ type: 'success', text: 'Tool report logged successfully.' });
      setDamageModalOpen(false);
      setDamageNotes('');
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDayClick = (dateStr, recordsData) => {
    setSelectedDayDate(dateStr);
    const list = Array.isArray(recordsData)
      ? recordsData
      : (recordsData ? [recordsData] : []);
    setSelectedDayRecords(list);

    const dayPayments = (calendarData?.payments || []).filter((p) => {
      const d = new Date(p.transactionDate).toISOString().split('T')[0];
      return d === dateStr;
    });
    const dayAdvances = (calendarData?.advances || []).filter((a) => {
      const rawDate = a.requestedAt || a.createdAt || a.reviewedAt;
      return rawDate && new Date(rawDate).toISOString().split('T')[0] === dateStr;
    });
    setSelectedDayPayments(dayPayments);
    setSelectedDayAdvances(dayAdvances);

    setDayDetailsModalOpen(true);
  };


  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    try {
      await api.post('/disputes', {
        category: disputeCategory,
        subject: disputeSubject,
        description: disputeDescription,
      });
      setMessage({ type: 'success', text: 'Grievance / Dispute submitted for review.' });
      setDisputeModalOpen(false);
      setDisputeSubject('');
      setDisputeDescription('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const [completingId, setCompletingId] = useState(null);

  const handleMarkAssignmentDone = async (assignmentId, projectName) => {
    try {
      setCompletingId(assignmentId);
      await api.patch(`/projects/assignments/${assignmentId}`, { status: 'COMPLETED' });
      setMessage({ type: 'success', text: `Work on "${projectName || 'furniture project'}" marked as completed!` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to mark work as done' });
    } finally {
      setCompletingId(null);
    }
  };

  const handleMarkTaskDone = async (taskId, taskName) => {
    try {
      setCompletingId(taskId);
      await api.patch(`/furniture-tasks/${taskId}`, { status: 'COMPLETED' });
      setMessage({ type: 'success', text: `Assigned task "${taskName || 'work'}" marked as done!` });
      fetchDashboard();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to mark task as done' });
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  const profile = dashboardData?.profile;
  const todayAttendance = dashboardData?.todayAttendance;
  const activeAssignments = dashboardData?.activeAssignments || [];
  const allAssignments = dashboardData?.allAssignments || activeAssignments;
  const assignedTasks = dashboardData?.assignedTasks || [];
  const issuedTools = dashboardData?.issuedTools || [];

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Worker Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-900 to-amber-950 p-4 sm:p-6 text-white shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xl shadow-inner">
            <i className="fa-solid fa-user"></i>
          </div>
          <div>
            <span className="inline-block rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              {t('profile.role') || 'Role'}: {profile?.workerCode || 'WRK-ACTIVE'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">{user?.name}</h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              {t('worker.thekedarSupervisor') || 'Thekedar:'} <span className="font-bold text-amber-300">{profile?.thekedarId?.name || 'N/A'}</span> {profile?.thekedarId?.phone ? `(${profile.thekedarId.phone})` : ''} • <span className="text-[11px] text-amber-200/70">{t('profile.workerDesc') || 'Craftsman & Site Worker'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Button
            variant="primary"
            onClick={() => setSubmitModalOpen(true)}
            className="w-full sm:w-auto justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md hover:shadow-lg transition-all"
            icon={CheckCircle}
          >
            {t('worker.logAttendance') || "Mark Today's Attendance"}
          </Button>
          <Button
            variant="outline-amber"
            onClick={() => setAdvanceModalOpen(true)}
            icon={IndianRupee}
            className="w-full sm:w-auto justify-center"
          >
            {t('worker.requestAdvance') || 'Request Advance'}
          </Button>
          <Button
            variant="outline-amber"
            onClick={() => setDisputeModalOpen(true)}
            icon={AlertTriangle}
            className="w-full sm:w-auto justify-center"
          >
            {t('disputes.fileDispute') || 'File Grievance'}
          </Button>
        </div>
      </div>

      {/* Financial Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="text-xs text-emerald-800 font-semibold">{t('worker.standardDailyWage') || 'Standard Daily Wage'}</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">₹{profile?.defaultDailyWage || 0}</div>
          <span className="text-[11px] text-emerald-700">{t('worker.fullDay') || 'Per full day (P = 1.0x)'}</span>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40">
          <div className="text-xs text-blue-800 font-semibold">{t('worker.outstandingSalaryBalance') || 'Outstanding Salary Balance'}</div>
          <div className="text-2xl font-black text-blue-950 mt-1">₹{profile?.outstandingSalaryBalance?.toLocaleString('en-IN') || 0}</div>
          <span className="text-[11px] text-blue-700">{t('worker.accumulatedUnpaid') || 'Accumulated unpaid finalized salary'}</span>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-semibold">{t('worker.outstandingAdvance') || 'Outstanding Advance Balance'}</span>
            {(profile?.outstandingAdvanceBalance || 0) >= 10000 && (
              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white animate-pulse">
                {t('worker.maxCapBadge') || 'MAX 10K CAP'}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-950 mt-1">₹{profile?.outstandingAdvanceBalance?.toLocaleString('en-IN') || 0}</div>
          <span className="text-[11px] text-amber-700">
            {(profile?.outstandingAdvanceBalance || 0) >= 10000 ? (t('worker.maxAdvanceNote') || 'Limit reached') : (t('worker.remainingLimit') || 'Total unrecovered advance balance')}
          </span>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40">
          <div className="text-xs text-purple-800 font-semibold">{t('worker.todaysAttendance') || "Today's Attendance"}</div>
          <div className="mt-1 flex items-center gap-2">
            {todayAttendance ? (
              <Badge variant={todayAttendance.approvalStatus} size="md">
                {todayAttendance.code} ({todayAttendance.approvalStatus})
              </Badge>
            ) : (
              <Badge variant="warning" size="md">{t('worker.notMarked') || 'Not Marked'}</Badge>
            )}
          </div>
          <span className="text-[11px] text-purple-700">
            {todayAttendance ? (t('worker.earningsPrefix') || 'Earnings: ₹{amt}').replace('{amt}', todayAttendance.calculatedEarnings) : (t('worker.submitShiftAttendance') || 'Please submit shift attendance')}
          </span>
        </Card>
      </div>

      {/* Monthly Attendance Calendar */}
      <Card
        title={t('worker.attendanceAndEarnings') || 'Attendance & Earnings'}
        subtitle={t('worker.attendanceCalendarSubtitle') || 'Click on any recorded day to view details of your shift'}
      >
        <div className="space-y-4">
          {/* Monthly Attendance & Unpaid Balance Indicator Bar (Above Calendar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Present Days Indicator */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm font-black text-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  {t('calendar.presentDaysThisMonth', 'Current Month Shifts / Attendance')}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-amber-950">
                    {calendarData.summary?.totalDehadi ?? calendarData.summary?.approvedDaysCount ?? 0}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {t('calendar.dehadiUnit', 'Shifts')} ({calendarData.summary?.approvedDaysCount || 0} {t('calendar.shiftsWorkedCount', 'Shifts Worked')})
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  {calendarData.summary?.totalDehadi || 0} {t('calendar.totalShiftsCount', 'Total Shifts')} in {new Date(calYear, calMonth - 1).toLocaleString('default', { month: 'long' })} {calYear}
                </span>
              </div>
            </div>

            {/* Current Month Gross Earnings */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm font-black text-lg">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  {t('calendar.thisMonthEarned', 'Current Month Earnings')}
                </span>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">
                  ₹{(calendarData.summary?.totalApprovedEarnings || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-800 font-medium">
                  {calendarData.summary?.totalDehadi || 0} {t('calendar.dehadiUnit', 'Shifts')} × ₹{profile?.defaultDailyWage || 800}/day = ₹{(calendarData.summary?.totalApprovedEarnings || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Past Month Unpaid Earnings (Beside) */}
            <div className={`flex items-center gap-3.5 rounded-2xl border p-4 shadow-xs sm:col-span-2 lg:col-span-1 ${
              (calendarData.summary?.pastMonthUnpaidEarnings || 0) > 0
                ? 'border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50/50'
                : 'border-slate-200 bg-white'
            }`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm font-black text-lg ${
                (calendarData.summary?.pastMonthUnpaidEarnings || 0) > 0 ? 'bg-rose-600' : 'bg-slate-400'
              }`}>
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  {t('calendar.pastMonthUnpaid', 'Past Month Unpaid Earnings')}
                </span>
                <div className={`text-2xl font-black mt-0.5 ${
                  (calendarData.summary?.pastMonthUnpaidEarnings || 0) > 0 ? 'text-rose-950' : 'text-slate-800'
                }`}>
                  ₹{(calendarData.summary?.pastMonthUnpaidEarnings || 0).toLocaleString('en-IN')}
                </div>
                <span className={`text-[11px] font-medium ${
                  (calendarData.summary?.pastMonthUnpaidEarnings || 0) > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
                }`}>
                  {(calendarData.summary?.pastMonthUnpaidEarnings || 0) > 0
                    ? `Pending settlement from previous months (${calendarData.summary?.pastMonthUnpaidDaysCount || 0} shifts)`
                    : 'All previous months fully settled'}
                </span>
              </div>
            </div>
          </div>

          <AttendanceCalendar
            records={calendarData.records}
            payments={calendarData.payments}
            advances={calendarData.advances}
            year={calYear}
            month={calMonth}
            summary={calendarData.summary}
            onMonthChange={handleMonthChange}
            onDayClick={handleDayClick}
            isWorker={true}
          />
        </div>
      </Card>

      {/* Grid: Assigned Furniture Projects & Assigned Tools */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Projects */}
        <Card title={t('worker.myActiveProjects') || 'My Active Furniture Projects'} subtitle={t('worker.myActiveProjectsSub') || 'Modern furniture sites where you are actively assigned'}>
          {allAssignments.length === 0 ? (
            <p className="text-xs text-slate-700 py-4 italic">{t('worker.noProjectAssignments') || 'No project assignments.'}</p>
          ) : (
            <div className="space-y-3">
              {allAssignments.map((a) => (
                <div key={a._id} className="flex items-start justify-between rounded-xl border border-slate-200 p-3 hover:border-amber-300">
                  <div>
                    <span className="text-[11px] font-bold text-amber-800">{a.projectId?.projectCode}</span>
                    <h4 className="text-sm font-bold text-slate-900">{a.projectId?.name}</h4>
                    <p className="text-xs text-slate-700 mt-0.5">{a.projectId?.siteAddress}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-slate-700">
                      {t('profile.role') || 'Role'}: {a.roleInProject} {a.wageOverride ? `(Special Wage: ₹${a.wageOverride})` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={a.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                      {a.status === 'COMPLETED' ? 'COMPLETED ✓' : a.status}
                    </Badge>
                    {a.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 font-bold shadow-xs"
                        loading={completingId === a._id}
                        onClick={() => handleMarkAssignmentDone(a._id, a.projectId?.name)}
                        icon={CheckCircle}
                      >
                        {t('worker.markWorkDone') || 'Mark Work Done'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Assigned Tools */}
        <Card title={t('worker.toolsMachineryAssigned') || 'Tools & Machinery Assigned to Me'} subtitle={t('worker.toolsMachinerySub') || 'Drills, cutters, routers, sanders, and precision measuring tools'}>
          {issuedTools.length === 0 ? (
            <p className="text-xs text-slate-700 py-4 italic">{t('worker.noToolsAssigned') || 'No tools currently assigned to your account.'}</p>
          ) : (
            <div className="space-y-3">
              {issuedTools.map((tItem) => (
                <div key={tItem._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{tItem.name}</h4>
                      <p className="text-xs text-slate-700">Code: {tItem.toolCode} | Condition: {tItem.condition}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setSelectedToolId(tItem._id);
                        setDamageModalOpen(true);
                      }}
                    >
                      {t('worker.reportIssue') || 'Report Issue'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Assigned Furniture Tasks / Craft Items */}
      {assignedTasks.length > 0 && (
        <Card title={t('worker.assignedTasks') || 'Assigned Furniture Craft Tasks'} subtitle={t('worker.assignedTasksSub') || 'Specific furniture items and joinery assigned to you'}>
          <div className="space-y-3">
            {assignedTasks.map((task) => (
              <div
                key={task._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                  task.status === 'REWORK_NEEDED'
                    ? 'border-rose-300 bg-rose-50/30'
                    : task.status === 'COMPLETED'
                    ? 'border-amber-300 bg-amber-50/20'
                    : task.status === 'VERIFIED'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-800">
                      {task.projectId?.projectCode} • {task.projectId?.name}
                    </span>
                    {task.status === 'COMPLETED' && (
                      <Badge variant="warning" size="sm">
                        {t('worker.awaitingApproval') || 'COMPLETED • Awaiting Thekedar Approval ⏳'}
                      </Badge>
                    )}
                    {task.status === 'VERIFIED' && (
                      <Badge variant="success" size="sm">
                        {t('worker.approvedVerified') || 'APPROVED & VERIFIED ✓'}
                      </Badge>
                    )}
                    {task.status === 'REWORK_NEEDED' && (
                      <Badge variant="danger" size="sm">
                        {t('worker.reworkRequested') || 'REWORK REQUESTED ⚠️'}
                      </Badge>
                    )}
                    {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                      <Badge variant="default" size="sm">
                        {task.status}
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{task.furnitureItemName}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {t('worker.stage') || 'Stage:'} <span className="font-semibold text-slate-800">{task.taskType}</span> • {t('worker.progress') || 'Progress:'}{' '}
                    <strong className="text-slate-900">
                      {task.completedUnits || 0}/{task.plannedUnits} {task.unitMetric || 'pcs'}
                    </strong>
                  </p>
                  {task.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{task.notes}</p>}

                  {/* If supervisor requested rework, show defect inspection instructions */}
                  {task.status === 'REWORK_NEEDED' && task.defectReport?.description && (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                      <span className="font-bold block">{t('worker.supervisorFeedback') || 'Supervisor Inspection Feedback:'}</span>
                      <p className="mt-0.5">{task.defectReport.description}</p>
                    </div>
                  )}

                  {/* If verified, show confirmation text */}
                  {task.status === 'VERIFIED' && (
                    <p className="text-[11px] text-emerald-800 font-medium mt-1">
                      {t('worker.qualityCheckPassed') || 'Quality check passed and approved by Thekedar.'}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  {task.status === 'COMPLETED' ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
                      <Clock className="h-4 w-4 text-amber-600 animate-spin" />
                      <span>{t('worker.pendingApproval') || 'Pending Approval'}</span>
                    </div>
                  ) : task.status === 'VERIFIED' ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>{t('worker.approved') || 'Approved ✓'}</span>
                    </div>
                  ) : task.status === 'REWORK_NEEDED' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 font-bold shadow-xs"
                      loading={completingId === task._id}
                      onClick={() => handleMarkTaskDone(task._id, task.furnitureItemName)}
                      icon={CheckCircle}
                    >
                      {t('worker.markDoneAgain') || 'Mark Done Again ✓'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 font-bold shadow-xs"
                      loading={completingId === task._id}
                      onClick={() => handleMarkTaskDone(task._id, task.furnitureItemName)}
                      icon={CheckCircle}
                    >
                      {t('worker.markDone') || 'Mark Done ✓'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal 1: Submit Attendance */}
      <Modal isOpen={submitModalOpen} onClose={() => setSubmitModalOpen(false)} title={t('workerModals.submitAttendanceTitle') || "Mark Today's Attendance"}>
        <form onSubmit={handleSubmitAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('worker.selectProject') || 'Select Furniture Project'}</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            >
              {activeAssignments.map((a) => (
                <option key={a.projectId?._id} value={a.projectId?._id}>
                  {a.projectId?.name} ({a.projectId?.projectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('worker.shiftCode') || 'Attendance Shift Code'}</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { code: 'P', label: `P (${t('worker.fullDay') || '1.0x Full Day'})` },
                { code: 'HALF', label: `HALF (${t('worker.halfDay') || '0.5x Half Day'})` },
                { code: 'P1/5', label: `P1/5 (${t('worker.ot9pm') || '1.5x Overtime to 9PM'})` },
                { code: 'PP', label: `PP (${t('worker.otMidnight') || '2.0x Overtime to Midnight'})` },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.code}
                  onClick={() => setSelectedCode(opt.code)}
                  className={`rounded-lg border p-2 text-xs font-bold text-left transition-all ${
                    selectedCode === opt.code
                      ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('worker.checkInTime') || 'Check-in Time'}</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('worker.checkOutTime') || 'Check-out Time'}</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          {(selectedCode === 'P1/5' || selectedCode === 'PP') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('worker.extendedWorkReason') || 'Extended Work Reason / Note'}</label>
              <input
                type="text"
                value={extraWorkCategory}
                onChange={(e) => setExtraWorkCategory(e.target.value)}
                placeholder={t('worker.extendedWorkPlaceholder') || 'e.g. Urgent modular wardrobe carcass assembly for site handover'}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSubmitModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit" loading={submitting}>{t('common.submit', 'Submit Attendance')}</Button>
          </div>
        </form>
      </Modal>


      {/* Modal 2: Request Advance */}
      <Modal isOpen={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} title={t('workerModals.advanceModalTitle', 'Request Cash / UPI Advance')}>
        <form onSubmit={handleRequestAdvance} className="space-y-4">
          {/* Flashing Warning if Current Advance is at or over ₹10,000 */}
          {(profile?.outstandingAdvanceBalance || 0) >= 10000 ? (
            <div className="rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-900 animate-pulse shadow-sm flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-black text-sm text-rose-800 tracking-wide uppercase">
                  {t('workerModals.advanceLimitReached', '⚠️ Advance Limit Reached (Max ₹10,000)')}
                </h4>
                <p className="text-xs text-rose-700 mt-1 font-medium leading-relaxed">
                  {t('worker.maxAdvanceNote', 'Worker cannot take more than ₹10,000 advance')}.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700">{t('workerModals.currentAdvance', 'Current Advance')}: </span>
                <span className="font-bold text-amber-900">₹{(profile?.outstandingAdvanceBalance || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700">{t('workerModals.remainingAllowance', 'Remaining Allowance')}: </span>
                <span className="font-black text-emerald-700">₹{Math.max(0, 10000 - (profile?.outstandingAdvanceBalance || 0)).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-500 block">(Max: ₹10,000)</span>
              </div>
            </div>
          )}

          {/* Flashing Warning if entered amount pushes total over ₹10,000 */}
          {(profile?.outstandingAdvanceBalance || 0) < 10000 &&
            parseFloat(advanceAmount) > 0 &&
            ((profile?.outstandingAdvanceBalance || 0) + parseFloat(advanceAmount)) > 10000 && (
              <div className="rounded-lg border-2 border-rose-400 bg-rose-50 p-3 text-rose-800 animate-pulse flex items-start gap-2.5 text-xs">
                <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{t('workerModals.advanceLimitExceeded', 'Requested amount exceeds ₹10,000 total limit!')}</span>
                  <p className="mt-0.5 text-rose-700 font-medium">
                    {t('worker.remainingLimit', 'Remaining allowable advance limit')}: <strong>₹{Math.max(0, 10000 - (profile?.outstandingAdvanceBalance || 0)).toLocaleString('en-IN')}</strong>.
                  </p>
                </div>
              </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('workerModals.advanceAmount', 'Advance Amount (INR ₹)')}</label>
            <input
              type="number"
              min="100"
              max={Math.max(0, 10000 - (profile?.outstandingAdvanceBalance || 0))}
              disabled={(profile?.outstandingAdvanceBalance || 0) >= 10000}
              required
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              placeholder="e.g. 2000"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('workerModals.advanceReason', 'Reason for Advance')}</label>
            <textarea
              required
              rows={3}
              disabled={(profile?.outstandingAdvanceBalance || 0) >= 10000}
              value={advanceReason}
              onChange={(e) => setAdvanceReason(e.target.value)}
              placeholder="e.g. Site travel expenses, family emergency, festive support"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              type="submit"
              disabled={
                (profile?.outstandingAdvanceBalance || 0) >= 10000 ||
                !advanceAmount ||
                parseFloat(advanceAmount) <= 0 ||
                ((profile?.outstandingAdvanceBalance || 0) + parseFloat(advanceAmount)) > 10000
              }
              className={
                (profile?.outstandingAdvanceBalance || 0) >= 10000 ||
                ((profile?.outstandingAdvanceBalance || 0) + parseFloat(advanceAmount || 0)) > 10000
                  ? 'opacity-50 cursor-not-allowed bg-rose-600 hover:bg-rose-600'
                  : ''
              }
            >
              {(profile?.outstandingAdvanceBalance || 0) >= 10000 ? 'Limit Exceeded (₹10k Max)' : t('common.submit', 'Submit Request')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Day Details (Only day details, no correction options) */}
      <Modal
        isOpen={dayDetailsModalOpen}
        onClose={() => setDayDetailsModalOpen(false)}
        title={`${t('calendar.dayDetails', 'Day Details')} • ${selectedDayDate}`}
      >
        <div className="space-y-4">
          {selectedDayRecords.length === 0 && selectedDayPayments.length === 0 && selectedDayAdvances.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 italic">
              {t('calendar.noRecordsOnDate', 'No attendance shift or payment recorded on this date.')}
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayRecords.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                    <span>{t('nav.attendance', 'Attendance Shift Details')}</span>
                    <span className="text-[11px] font-normal text-slate-500">{selectedDayRecords.length} shift(s)</span>
                  </div>

                  {selectedDayRecords.map((rec) => (
                    <div
                      key={rec._id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5 shadow-2xs"
                    >
                      {/* Top Header: Project & Code */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {rec.projectId?.name || 'Assigned Furniture Project'}
                          </div>
                          {rec.projectId?.projectCode && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              Code: {rec.projectId.projectCode}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={rec.code} size="sm">
                            {rec.code} ({rec.wageMultiplier}x)
                          </Badge>
                          <Badge variant={rec.approvalStatus} size="sm">
                            {rec.approvalStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* Wage & Hours Breakdown */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white p-2 border border-slate-200/60">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Standard Wage Rate</span>
                          <span className="font-bold text-slate-800 text-xs">
                            ₹{rec.applicableDailyWage || profile?.defaultDailyWage || 800} / day
                          </span>
                        </div>
                        <div className="rounded-lg bg-white p-2 border border-slate-200/60">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Shift Multiplier</span>
                          <span className="font-bold text-amber-900 text-xs">
                            {rec.wageMultiplier}x ({rec.code})
                          </span>
                        </div>
                        <div className="rounded-lg bg-emerald-50/70 p-2 border border-emerald-200/60">
                          <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Earned for Shift</span>
                          <span className="font-black text-emerald-900 text-sm">
                            ₹{rec.calculatedEarnings || 0}
                          </span>
                        </div>
                        <div className="rounded-lg bg-white p-2 border border-slate-200/60">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Shift Timings</span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {rec.checkInTime || '09:00'} - {rec.checkOutTime || '18:00'}
                          </span>
                        </div>
                      </div>

                      {/* Supervisor and Status Footer */}
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1">
                        <span>
                          Supervisor: <strong className="text-slate-800 font-semibold">{rec.thekedarId?.name || profile?.thekedarId?.name || 'Assigned Thekedar'}</strong>
                        </span>
                        {rec.approvalStatus === 'APPROVED' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            ✓ Approved shift
                          </span>
                        ) : rec.approvalStatus === 'REJECTED' ? (
                          <span className="text-rose-700 font-bold">
                            ✗ Rejected {rec.rejectionReason ? `(${rec.rejectionReason})` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold">
                            ⏳ Submitted for Supervisor Approval
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions on this date */}
              {(selectedDayPayments.length > 0 || selectedDayAdvances.length > 0) && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Financial Activity on this Date
                  </span>
                  {selectedDayPayments.map((p) => {
                    const isAdv = p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST';
                    return (
                      <div
                        key={p._id}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold border ${
                          isAdv
                            ? 'bg-rose-50 text-rose-900 border-rose-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        <div>
                          <span className="block font-bold">
                            {isAdv ? 'Advance Payment Disbursed' : 'Salary Payout Received'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Mode: {p.paymentMethod || 'UPI'}
                          </span>
                        </div>
                        <span className="text-sm font-black">
                          {isAdv ? '-' : '+'}₹{p.amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end border-t border-slate-100">
            <Button variant="secondary" onClick={() => setDayDetailsModalOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 4: Report Tool Damage / Missing */}
      <Modal isOpen={damageModalOpen} onClose={() => setDamageModalOpen(false)} title={t('workerModals.toolDamageTitle', 'Report Tool Damage / Loss')}>
        <form onSubmit={handleReportToolDamage} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isMissing"
              checked={isMissing}
              onChange={(e) => setIsMissing(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="isMissing" className="text-xs font-bold text-rose-700">
              {t('workerModals.toolMissing', 'Tool is Missing / Lost')}
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('workerModals.damageDescription', 'Damage or Incident Description')}</label>
            <textarea
              required
              rows={3}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Router blade burned while cutting hardwood, or impact drill switch broken..."
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDamageModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit" variant="danger">{t('common.submit', 'Submit Incident Report')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: File Dispute */}
      <Modal isOpen={disputeModalOpen} onClose={() => setDisputeModalOpen(false)} title={t('workerModals.disputeModalTitle', 'File Worker Grievance / Dispute')}>
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.category', 'Grievance Category')}</label>
            <select
              value={disputeCategory}
              onChange={(e) => setDisputeCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            >
              <option value="ATTENDANCE">Attendance Correction</option>
              <option value="PAYROLL">Payroll & Wage Dispute</option>
              <option value="ADVANCE">Advance Request Support</option>
              <option value="TOOL">Tool Assignment Dispute</option>
              <option value="OTHER">Other Site Concern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.subject', 'Subject')}</label>
            <input
              type="text"
              required
              value={disputeSubject}
              onChange={(e) => setDisputeSubject(e.target.value)}
              placeholder="Brief summary of your grievance"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.description', 'Detailed Description')}</label>
            <textarea
              required
              rows={3}
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              placeholder="Provide complete facts for the review..."
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDisputeModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('disputes.submitGrievance', 'Submit Grievance')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
