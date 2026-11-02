import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { Modal } from '../components/common/Modal';
import { Download, FileText, Plus, CheckCircle, Clock, X, Check, AlertTriangle, Calendar, IndianRupee } from 'lucide-react';

export const AttendancePage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t, language } = useLanguage();

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState({ records: [], payments: [], summary: null });
  const [loading, setLoading] = useState(true);

  // Filters
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterWorkerId, setFilterWorkerId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');

  // Day detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedDayPayments, setSelectedDayPayments] = useState([]);
  const [selectedDayAdvances, setSelectedDayAdvances] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [rejectingRecordId, setRejectingRecordId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [approveCodeOverrides, setApproveCodeOverrides] = useState({});

  const fetchFilters = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        api.get('/projects'),
        !isWorker ? api.get('/users/workers') : Promise.resolve({ data: { workers: [] } }),
      ]);
      setProjects(pRes.data.projects);
      setWorkers(wRes.data.workers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCalendar = async (y, m, wId, pId) => {
    try {
      let url = `/attendance/calendar?year=${y}&month=${m}`;
      if (wId) url += `&workerId=${wId}`;
      if (pId) url += `&projectId=${pId}`;

      const res = await api.get(url);
      setCalendarData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchCalendar(calYear, calMonth, filterWorkerId, filterProjectId);
  }, []);

  const handleFilterChange = (wId, pId) => {
    setFilterWorkerId(wId);
    setFilterProjectId(pId);
    fetchCalendar(calYear, calMonth, wId, pId);
  };

  const handleMonthChange = (y, m) => {
    setCalYear(y);
    setCalMonth(m);
    fetchCalendar(y, m, filterWorkerId, filterProjectId);
  };

  const handleDayClick = (dateStr, recordsData) => {
    setSelectedDateStr(dateStr);
    const list = Array.isArray(recordsData)
      ? recordsData
      : (recordsData ? [recordsData] : []);
    setSelectedRecords(list);

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

    setActionMessage(null);
    setRejectingRecordId(null);
    setRejectReason('');
    setDetailModalOpen(true);
  };

  const handleApprove = async (recordId) => {
    try {
      setActionLoading(recordId);
      const chosenCode = approveCodeOverrides[recordId];
      const payload = chosenCode ? { code: chosenCode } : {};
      const res = await api.patch(`/attendance/${recordId}/approve`, payload);
      const updated = res.data?.data?.attendance;
      if (updated) {
        setSelectedRecords((prev) =>
          prev.map((r) => (r._id === recordId ? { ...r, ...updated } : r))
        );
        setCalendarData((prev) => {
          if (!prev?.records) return prev;
          return {
            ...prev,
            records: prev.records.map((r) => (r._id === recordId ? { ...r, ...updated } : r)),
          };
        });
      } else {
        setSelectedRecords((prev) =>
          prev.map((r) => (r._id === recordId ? { ...r, approvalStatus: 'APPROVED' } : r))
        );
      }
      setActionMessage({ type: 'success', text: `Attendance record approved successfully${chosenCode ? ` as ${chosenCode}` : ''}!` });
      fetchCalendar(calYear, calMonth, filterWorkerId, filterProjectId);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to approve attendance' });
      fetchCalendar(calYear, calMonth, filterWorkerId, filterProjectId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (recordId) => {
    if (!rejectReason || rejectReason.trim().length < 2) {
      setActionMessage({ type: 'error', text: 'Please enter a valid rejection reason (min 2 characters)' });
      return;
    }
    try {
      setActionLoading(recordId);
      setSelectedRecords((prev) =>
        prev.map((r) =>
          r._id === recordId
            ? { ...r, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), calculatedEarnings: 0 }
            : r
        )
      );
      setCalendarData((prev) => {
        if (!prev?.records) return prev;
        return {
          ...prev,
          records: prev.records.map((r) =>
            r._id === recordId
              ? { ...r, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), calculatedEarnings: 0 }
              : r
          ),
        };
      });
      await api.patch(`/attendance/${recordId}/reject`, { reason: rejectReason.trim() });
      setActionMessage({ type: 'success', text: 'Attendance record rejected.' });
      setRejectingRecordId(null);
      setRejectReason('');
      fetchCalendar(calYear, calMonth, filterWorkerId, filterProjectId);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to reject attendance' });
      fetchCalendar(calYear, calMonth, filterWorkerId, filterProjectId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportPDF = () => {
    let url = `/api/v1/reports/export/attendance?year=${calYear}&month=${calMonth}&lang=${language}&`;
    if (filterWorkerId) url += `workerId=${filterWorkerId}&`;
    if (filterProjectId) url += `projectId=${filterProjectId}&`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('nav.attendance') || 'Attendance Calendar'} & {t('dashboard.attendanceApprovals') || 'Approvals'}</h2>
          <p className="text-xs text-slate-700">{t('calendar.legend') || 'Daily multiplier calculations'} (P = 1.0x, HALF = 0.5x, P1/5 = 1.5x, PP = 2.0x).</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportPDF} icon={FileText} className="w-full sm:w-auto justify-center">
            {t('calendar.exportPdf') || 'Export Attendance (PDF)'}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      {!isWorker && (
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-2.5 sm:gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-sm text-xs">
          <span className="font-bold text-slate-700">{t('common.filter') || 'Filter'}:</span>

          <select
            value={filterWorkerId}
            onChange={(e) => handleFilterChange(e.target.value, filterProjectId)}
            className="rounded-lg border border-slate-300 p-1.5 text-xs font-medium w-full sm:w-auto"
          >
            <option value="">{t('common.all') || 'All'} {t('thekedar.managedWorkers') || 'Workers'}</option>
            {workers.map((w) => {
              const wId = w.userId?._id || w._id;
              const wName = w.userId?.name || w.name || 'Worker';
              const wCode = w.workerCode || '';
              return (
                <option key={wId} value={wId}>
                  {wName} {wCode ? `(${wCode})` : ''}
                </option>
              );
            })}
          </select>

          <select
            value={filterProjectId}
            onChange={(e) => handleFilterChange(filterWorkerId, e.target.value)}
            className="rounded-lg border border-slate-300 p-1.5 text-xs font-medium w-full sm:w-auto"
          >
            <option value="">{t('common.all') || 'All'} {t('projects.allProjects') || 'Furniture Projects'}</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.projectCode})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calendar Card */}
      <Card>
        <AttendanceCalendar
          records={calendarData.records}
          payments={calendarData.payments}
          advances={calendarData.advances}
          year={calYear}
          month={calMonth}
          summary={calendarData.summary}
          onMonthChange={handleMonthChange}
          onDayClick={handleDayClick}
          isWorker={isWorker}
        />
      </Card>

      {/* Day Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setRejectingRecordId(null);
          setRejectReason('');
        }}
        title={(t('attendancePage.dayDetailsTitle') || 'Attendance & Advances Details — {date}').replace('{date}', selectedDateStr)}
      >
        {actionMessage && (
          <div
            className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Advances & Financial Transactions on this date */}
        {(selectedDayPayments.length > 0 || selectedDayAdvances.length > 0) && (
          <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>{t('attendancePage.advancesAndTxOnDate') || 'Advances & Financial Transactions on this Date'}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {selectedDayPayments.length + selectedDayAdvances.filter((a) => a.status !== 'DISBURSED').length} entry(s)
              </span>
            </h4>
            <div className="space-y-1.5">
              {selectedDayPayments.map((p) => {
                const isAdv = p.category === 'ADVANCE_DISBURSEMENT' || p.category === 'ADVANCE_REQUEST';
                return (
                  <div
                    key={p._id}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs border font-medium ${
                      isAdv
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${isAdv ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                        <span className="font-bold">
                          {isAdv ? (t('attendancePage.advanceTaken') || '💸 Advance Taken') : (t('attendancePage.salaryPayout') || 'Salary Payout')}
                        </span>
                        {p.workerId?.name && <span className="font-semibold text-slate-800"> ({p.workerId.name})</span>}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        via {p.paymentMethod} {p.receiptReference ? `• Ref: ${p.receiptReference}` : ''} {p.notes ? `• ${p.notes}` : ''}
                      </div>
                    </div>
                    <span className={`font-black text-sm shrink-0 ${isAdv ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {isAdv ? '-' : ''}₹{p.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}

              {selectedDayAdvances.filter((a) => a.status !== 'DISBURSED').map((adv) => (
                <div
                  key={adv._id}
                  className="flex items-center justify-between p-2.5 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-950 font-medium"
                >
                  <div>
                    <span className="font-bold">{t('worker.requestAdvance') || 'Advance Request'} ({adv.status})</span>
                    {adv.workerId?.name && <span className="font-semibold text-slate-800"> ({adv.workerId.name})</span>}
                    {adv.reason && <div className="text-[10px] text-amber-800 mt-0.5">{t('common.reason') || 'Reason'}: "{adv.reason}"</div>}
                  </div>
                  <span className="font-black text-sm text-amber-800 shrink-0">
                    ₹{adv.amount?.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRecords && selectedRecords.length > 0 ? (
          <div className="space-y-4">
            {/* Top summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">{selectedRecords.length}</span> {t('attendancePage.recordsOnDate') || 'record(s) on this date'}
                {selectedRecords.filter((r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'CORRECTION_REQUESTED').length > 0 && (
                  <span className="ml-2 font-bold text-amber-700">
                    ({selectedRecords.filter((r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'CORRECTION_REQUESTED').length} {t('common.pending') || 'pending'})
                  </span>
                )}
              </div>
            </div>

            {/* List of records */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedRecords.map((record) => {
                const isPending =
                  record.approvalStatus === 'SUBMITTED' ||
                  record.approvalStatus === 'CORRECTION_REQUESTED';
                const canReview = (isThekedar || isOwner) && isPending;

                return (
                  <div
                    key={record._id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {record.workerId?.name || (t('thekedarDashboard.tableWorker') || 'Worker')}
                        </div>
                        <div className="text-[11px] text-slate-700">
                          {t('thekedarDashboard.tableProject') || 'Project'}: <span className="font-semibold text-slate-800">{record.projectId?.name || 'Assigned Project'}</span>
                          {record.projectId?.projectCode && ` (${record.projectId.projectCode})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={record.code} size="sm">
                          {record.code} ({record.wageMultiplier}x)
                        </Badge>
                        <Badge variant={record.approvalStatus} size="sm">
                          {record.approvalStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-700">{t('attendancePage.applicableWage') || 'Applicable Wage'}: </span>
                        <span className="font-semibold text-slate-800">₹{record.applicableDailyWage || 0}/day</span>
                      </div>
                      <div>
                        <span className="text-slate-700">{t('attendancePage.payableEarned') || 'Payable Earned'}: </span>
                        <span className="font-black text-emerald-800">₹{record.calculatedEarnings || 0}</span>
                      </div>
                    </div>

                    {record.extraWorkCategory && (
                      <div className="rounded-lg bg-amber-50/60 p-2 text-[11px] text-amber-900 border border-amber-200">
                        <span className="font-semibold">{t('worker.extendedWork') || 'Extended Work'}: </span>
                        <span>{record.extraWorkCategory}</span>
                      </div>
                    )}

                    {record.rejectionReason && (
                      <div className="rounded-lg bg-rose-50/70 p-2 text-[11px] text-rose-900 border border-rose-200">
                        <span className="font-semibold">{t('thekedarDashboard.rejectionReason') || 'Rejection Reason'}: </span>
                        <span>{record.rejectionReason}</span>
                      </div>
                    )}

                    {/* Pending Approval Actions */}
                    {canReview && (
                      <div className="pt-2 border-t border-slate-100">
                        {rejectingRecordId === record._id ? (
                          <div className="space-y-2 rounded-lg bg-rose-50/50 p-2.5 border border-rose-200">
                            <label className="block text-[11px] font-semibold text-rose-900">
                              {t('thekedarDashboard.rejectionReason') || 'Reason for Rejection:'}
                            </label>
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="e.g. Incomplete hours, wrong shift code submitted"
                              className="w-full rounded border border-rose-300 p-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setRejectingRecordId(null);
                                  setRejectReason('');
                                }}
                              >
                                {t('common.cancel') || 'Cancel'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={actionLoading === record._id}
                                onClick={() => handleReject(record._id)}
                              >
                                {t('thekedarDashboard.confirmReject') || 'Confirm Rejection'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-600">Approve as:</span>
                              <select
                                value={approveCodeOverrides[record._id] || record.code}
                                onChange={(e) => setApproveCodeOverrides((prev) => ({ ...prev, [record._id]: e.target.value }))}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800"
                              >
                                <option value="P">P (1.0x Full Day)</option>
                                <option value="HALF">HALF (0.5x Half Day)</option>
                                <option value="P1/5">P1/5 (1.5x Overtime)</option>
                                <option value="PP">PP (2.0x Double Shift)</option>
                                <option value="ABSENT">ABSENT (0x)</option>
                                <option value="LEAVE">LEAVE (0x)</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                                onClick={() => {
                                  setRejectingRecordId(record._id);
                                  setRejectReason('');
                                }}
                              >
                                {t('common.reject') || 'Reject'}
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                loading={actionLoading === record._id}
                                onClick={() => handleApprove(record._id)}
                                icon={CheckCircle}
                              >
                                {t('common.approve') || 'Approve'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="secondary" onClick={() => setDetailModalOpen(false)}>
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDayPayments.length === 0 && selectedDayAdvances.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-700">
                {t('attendancePage.noAttendanceRecords') || 'No attendance or advance records for this date.'}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                {t('attendancePage.noShiftLogs') || 'No attendance shift logs submitted for this date.'}
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="secondary" onClick={() => setDetailModalOpen(false)}>
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
