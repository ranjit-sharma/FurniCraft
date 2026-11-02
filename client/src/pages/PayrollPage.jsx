import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  Calculator,
  Download,
  Plus,
  CheckCircle,
  FileText,
  Lock,
  IndianRupee,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const PayrollPage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t, language } = useLanguage();

  const [payrolls, setPayrolls] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Preview & Finalize Calculation States
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [periodYear, setPeriodYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [advanceRecovery, setAdvanceRecovery] = useState('0');

  const [previewData, setPreviewData] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const fetchPayrolls = async () => {
    try {
      const res = await api.get('/payroll');
      setPayrolls(res.data.payrolls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/users/workers');
      setWorkers(res.data.workers);
      if (res.data.workers.length > 0) {
        const firstWorker = res.data.workers[0];
        setSelectedWorkerId(firstWorker.userId?._id || firstWorker._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayrolls();
    if (isOwner || isThekedar) {
      fetchWorkers();
    }
  }, []);

  const handleCalculatePreview = async () => {
    if (!selectedWorkerId) return;
    setCalculating(true);
    try {
      const res = await api.get(
        `/payroll/preview?workerId=${selectedWorkerId}&periodMonth=${periodMonth}&periodYear=${periodYear}&allowances=${allowances}&deductions=${deductions}&advanceRecoveryAmount=${advanceRecovery}`
      );
      setPreviewData(res.data.preview);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setCalculating(false);
    }
  };

  const handleFinalizePayroll = async () => {
    setFinalizing(true);
    try {
      await api.post('/payroll/finalize', {
        workerId: selectedWorkerId,
        periodMonth: parseInt(periodMonth, 10),
        periodYear: parseInt(periodYear, 10),
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        advanceRecoveryAmount: parseFloat(advanceRecovery) || 0,
        notes: 'Finalized via FurniCraft Payroll Engine',
      });
      setMessage({ type: 'success', text: 'Payroll successfully finalized, locked, and ledger updated!' });
      setCalcModalOpen(false);
      setPreviewData(null);
      fetchPayrolls();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setFinalizing(false);
    }
  };

  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/adjustments', {
        payrollId: selectedPayroll._id,
        type: adjustType,
        amount: parseFloat(adjustAmount),
        reason: adjustReason,
      });
      setMessage({ type: 'success', text: 'Immutable payroll adjustment added successfully!' });
      setAdjustModalOpen(false);
      setAdjustAmount('');
      setAdjustReason('');
      fetchPayrolls();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDownloadPayslip = (payrollId) => {
    window.open(`/api/v1/reports/export/salary/${payrollId}?lang=${language}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t('payroll.pageTitle', 'Salary & Payroll Management')}</h2>
          <p className="text-xs text-slate-700">{t('payroll.pageSub', 'Monthly wage settlements, advance recoveries, and payslips.')}</p>
        </div>

        {(isOwner || isThekedar) && (
          <Button variant="primary" onClick={() => setCalcModalOpen(true)} icon={Calculator}>
            {t('payroll.calculate', 'Calculate')}
          </Button>
        )}
      </div>

      {/* Payrolls List Table */}
      <Card title={t('payroll.finalizedStatements', 'Finalized Payroll Statements')} subtitle={t('payroll.immutableStatements', 'Permanent immutable wage settlements locked to date')}>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : payrolls.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-700 italic">{t('payroll.noPayrolls', 'No finalized payroll records found.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">{t('payroll.statementCode', 'Statement Code')}</th>
                  <th className="p-3">{t('payroll.worker', 'Worker')}</th>
                  <th className="p-3">{t('payroll.period', 'Period')}</th>
                  <th className="p-3">{t('payroll.daysWorked', 'Days Worked')}</th>
                  <th className="p-3">{t('payroll.grossEarnings', 'Gross Earnings')}</th>
                  <th className="p-3">{t('payroll.advancesRecovered', 'Advances Recovered')}</th>
                  <th className="p-3">{t('payroll.netPayable', 'Net Payable')}</th>
                  <th className="p-3">{t('payroll.remainingDue', 'Remaining Due')}</th>
                  <th className="p-3">{t('payroll.status', 'Status')}</th>
                  <th className="p-3 text-right">{t('payroll.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((pay) => (
                  <tr key={pay._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-amber-800">{pay.payrollCode}</td>
                    <td className="p-3 font-semibold text-slate-900">{pay.workerId?.name}</td>
                    <td className="p-3">{pay.periodMonth}/{pay.periodYear}</td>
                    <td className="p-3">{pay.totalApprovedDays} {t('calendar.daysCount', '{count} Days').replace('{count}', '')}</td>
                    <td className="p-3">₹{pay.grossEarnings?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-rose-600 font-semibold">-₹{pay.advancesRecovered?.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-black text-slate-900">₹{pay.netPayable?.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-bold text-blue-900">₹{pay.balanceRemaining?.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <Badge variant={pay.status} size="sm">{pay.status}</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPayslip(pay._id)}
                        icon={Download}
                      >
                        {t('payroll.payslip', 'Payslip')}
                      </Button>
                      {(isOwner || isThekedar) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedPayroll(pay);
                            setAdjustModalOpen(true);
                          }}
                        >
                          {t('payroll.adjustment', 'Adjustment')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Calculate & Finalize Payroll */}
      <Modal isOpen={calcModalOpen} onClose={() => setCalcModalOpen(false)} title={t('payroll.calcModalTitle', 'Calculate & Finalize Payroll')} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.selectWorker', 'Select Worker')}</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.month', 'Month')}</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(parseInt(e.target.value, 10))}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                {[...Array(12).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.year', 'Year')}</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value, 10))}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.allowances', 'Allowances (₹)')}</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.deductions', 'Deductions (₹)')}</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.advanceRecovery', 'Advance Recovery (₹)')}</label>
              <input
                type="number"
                value={advanceRecovery}
                onChange={(e) => setAdvanceRecovery(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleCalculatePreview} loading={calculating} icon={Calculator}>
              {t('payroll.generatePreview', 'Generate Salary Preview')}
            </Button>
          </div>

          {/* Preview Box */}
          {previewData && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-bold text-sm text-amber-950">
                  {t('payroll.salaryPreview', 'Salary Preview:')} {previewData.worker?.name} ({previewData.periodMonth}/{previewData.periodYear})
                </span>
                <span className="text-xs text-amber-800">
                  {t('payroll.approvedDaysBreakdown', '{days} Approved Days ({items} Shift Records)')
                    .replace('{days}', previewData.totalApprovedDays)
                    .replace('{items}', previewData.lineItemsCount)}
                </span>
              </div>

              {/* Shift Breakdown */}
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-700">
                <div className="bg-white p-2 rounded-lg border border-amber-200">
                  <div>{t('payroll.fullDayBreakdown', 'Full Day (P):')} <strong>{previewData.breakdown?.P?.count || 0}</strong></div>
                  <div className="text-[10px] text-slate-700">₹{previewData.breakdown?.P?.earnings}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200">
                  <div>{t('payroll.halfDayBreakdown', 'Half Day (HALF):')} <strong>{previewData.breakdown?.HALF?.count || 0}</strong></div>
                  <div className="text-[10px] text-slate-700">₹{previewData.breakdown?.HALF?.earnings}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200">
                  <div>{t('payroll.ot9pmBreakdown', 'Ext 9PM (P1/5):')} <strong>{previewData.breakdown?.['P1/5']?.count || 0}</strong></div>
                  <div className="text-[10px] text-slate-700">₹{previewData.breakdown?.['P1/5']?.earnings}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200">
                  <div>{t('payroll.midnightBreakdown', 'Midnight (PP):')} <strong>{previewData.breakdown?.PP?.count || 0}</strong></div>
                  <div className="text-[10px] text-slate-700">₹{previewData.breakdown?.PP?.earnings}</div>
                </div>
              </div>

              {/* Calculation Summary */}
              <div className="rounded-lg bg-white p-3 border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>{t('payroll.grossLabel', 'Gross Earnings:')}</span>
                  <span className="font-bold">₹{previewData.grossEarnings?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>{t('payroll.allowancesLabel', '+ Allowances:')}</span>
                  <span>₹{previewData.allowances}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>{t('payroll.deductionsLabel', '- Deductions:')}</span>
                  <span>₹{previewData.deductions}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>{t('payroll.advancesRecoveredLabel', '- Advances Recovered:')}</span>
                  <span>₹{previewData.advancesRecovered?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-black text-slate-900">
                  <span>{t('payroll.netSalaryPayable', 'NET SALARY PAYABLE:')}</span>
                  <span>₹{previewData.netPayable?.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCalcModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                <Button variant="success" onClick={handleFinalizePayroll} loading={finalizing} icon={Lock}>
                  {t('payroll.confirmFinalize', 'Confirm & Finalize Immutable Payroll')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Add Adjustment */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title={t('payroll.adjustModalTitle', 'Add Linked Payroll Adjustment')}>
        {selectedPayroll && (
          <form onSubmit={handleAddAdjustment} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <div>{t('payroll.statementCode', 'Payroll')}: <span className="font-bold">{selectedPayroll.payrollCode}</span></div>
              <div>{t('payroll.worker', 'Worker')}: <span className="font-bold">{selectedPayroll.workerId?.name}</span></div>
              <div>{t('payroll.remainingDue', 'Current Remaining Balance')}: <span className="font-bold">₹{selectedPayroll.balanceRemaining}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('payroll.adjustType', 'Adjustment Type')}</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="CREDIT">{t('payroll.creditOption', 'Credit (Increase payable balance)')}</option>
                  <option value="DEBIT">{t('payroll.debitOption', 'Debit (Decrease payable balance)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t('payroll.adjustAmount', 'Amount (INR ₹)')}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('payroll.adjustReason', 'Reason for Authorized Adjustment')}</label>
              <textarea
                required
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Document the exact business or audit reason for this wage adjustment..."
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit">{t('payroll.saveAdjust', 'Save Immutable Adjustment')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
