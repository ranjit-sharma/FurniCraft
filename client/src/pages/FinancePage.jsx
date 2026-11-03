import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  IndianRupee,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  CheckCircle,
  Clock,
  Plus,
  AlertTriangle,
  FileText,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

export const FinancePage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t, language } = useLanguage();

  const [transactions, setTransactions] = useState([]);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [message, setMessage] = useState(null);

  // Record Salary Payment Modal
  const [salaryPayModalOpen, setSalaryPayModalOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [receiptReference, setReceiptReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Advance Review & Disburse State
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedAdvanceForDisburse, setSelectedAdvanceForDisburse] = useState(null);
  const [disbursePaymentMethod, setDisbursePaymentMethod] = useState('CASH');
  const [disburseReceiptReference, setDisburseReceiptReference] = useState('');
  const [disburseSubmitting, setDisburseSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [txRes, advRes, payRes] = await Promise.all([
        api.get('/finance/transactions'),
        api.get('/finance/advance-requests'),
        api.get('/payroll'),
      ]);
      setTransactions(txRes.data.transactions || []);
      setAdvanceRequests(advRes.data.requests || []);
      setPayrolls(payRes.data.payrolls || []);

      if (payRes.data.payrolls && payRes.data.payrolls.length > 0) {
        setSelectedPayrollId(payRes.data.payrolls[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?._id]);

  const userWorkerId = user?._id?.toString();

  const displayedTransactions = isWorker
    ? transactions.filter((tx) => (tx.workerId?._id || tx.workerId)?.toString() === userWorkerId)
    : transactions;

  const displayedAdvanceRequests = isWorker
    ? advanceRequests.filter((adv) => (adv.workerId?._id || adv.workerId)?.toString() === userWorkerId)
    : advanceRequests;

  const handleRecordSalaryPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/salary-payments', {
        payrollId: selectedPayrollId,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        receiptReference,
        notes: paymentNotes,
      });
      setMessage({ type: 'success', text: 'Salary payment recorded and allocated to payroll!' });
      setSalaryPayModalOpen(false);
      setPaymentAmount('');
      setReceiptReference('');
      setPaymentNotes('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleReviewAdvance = async (requestId, status) => {
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
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || `Failed to ${status.toLowerCase()} advance request` });
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleDisburseAdvance = async (e) => {
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
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to disburse advance' });
    } finally {
      setDisburseSubmitting(false);
    }
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
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {isWorker ? t('finance.workerPageTitle', 'My Salary & Advances') : t('finance.pageTitle', 'Salary & Advance Payments')}
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            {isWorker
              ? t('finance.workerPageSub', 'Your advances, salary payments received, and verified payment vouchers.')
              : t('finance.pageSub', 'Disburse worker advances, record salary payouts, and track verified payment vouchers.')}
          </p>
        </div>

        {(isOwner || isThekedar) && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setSalaryPayModalOpen(true)}
              icon={IndianRupee}
            >
              {t('finance.recordSalaryPayment', 'Record Salary Payment')}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'transactions' ? 'border-amber-600 text-amber-900 dark:text-amber-400' : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isWorker ? t('finance.myTransactions', 'My Payment Transactions') : t('finance.allTransactions', 'All Payment Transactions')} ({displayedTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'advances' ? 'border-amber-600 text-amber-900 dark:text-amber-400' : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isWorker ? t('finance.myAdvances', 'My Advance Requests') : t('finance.advancesRegister', 'Advance Requests & Register')} ({displayedAdvanceRequests.length})
        </button>
      </div>

      {/* Tab 1: Financial Transactions */}
      {activeTab === 'transactions' && (
        <Card
          title={isWorker ? t('finance.myTransactions', 'My Financial Transactions') : t('finance.allTransactions', 'Date-wise Financial Transactions')}
          subtitle={isWorker ? t('finance.workerPageSub', 'Your salary receipts, advance disbursements, and payment vouchers') : t('finance.pageSub', 'Bank transfers, UPI payments, and cash disbursements')}
        >
          {displayedTransactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-700 dark:text-slate-400 italic">{t('finance.noTransactions', 'No transactions recorded.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{t('finance.transactionId', 'Transaction ID')}</th>
                    <th className="p-3">{t('finance.category', 'Category')}</th>
                    {!isWorker && <th className="p-3">{t('finance.worker', 'Worker')}</th>}
                    <th className="p-3">{t('finance.amount', 'Amount')}</th>
                    <th className="p-3">{t('finance.method', 'Method')}</th>
                    <th className="p-3">{t('finance.reference', 'Reference / UTR')}</th>
                    <th className="p-3">{t('finance.date', 'Date')}</th>
                    <th className="p-3 text-right">{t('finance.billPdf', 'Bill / Voucher')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedTransactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 font-bold text-amber-800 dark:text-amber-400">{tx.transactionId}</td>
                      <td className="p-3">
                        <Badge variant="default" size="sm">{tx.category.replace('_', ' ')}</Badge>
                      </td>
                      {!isWorker && (
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{tx.workerId?.name || 'General'}</td>
                      )}
                      <td className="p-3 font-black text-slate-950 dark:text-slate-100 text-sm">₹{tx.amount?.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{tx.paymentMethod}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-400 font-mono text-[11px]">{tx.receiptReference || '-'}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-400">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => window.open(`/api/v1/finance/transactions/${tx._id}/bill?lang=${language}`, '_blank')}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-1 text-[10px] font-bold transition-colors shadow-xs"
                          title="Download Payment Bill / Voucher (PDF)"
                        >
                          <FileText className="h-3 w-3 text-amber-700 dark:text-amber-400" /> {t('finance.billPdf', 'Bill PDF')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Advance Requests Register */}
      {activeTab === 'advances' && (
        <Card
          title={isWorker ? t('finance.myAdvances', 'My Advance Requests') : t('finance.advancesRegister', 'Advance Requests & Register')}
          subtitle={isWorker ? t('finance.workerPageSub', 'Your submitted advance requests and verified disbursements') : t('finance.pageSub', 'Worker advance submissions and verified disbursements')}
        >
          {displayedAdvanceRequests.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-700 dark:text-slate-400 italic">{t('finance.noAdvances', 'No advance requests found.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{t('tools.tableIssueCode') || 'Request Code'}</th>
                    {!isWorker && <th className="p-3">{t('thekedarDashboard.tableWorker') || 'Worker'}</th>}
                    <th className="p-3">{t('workerModals.advanceAmount') || 'Requested Amount'}</th>
                    <th className="p-3">{t('common.reason') || 'Reason'}</th>
                    <th className="p-3">{t('thekedarDashboard.tableStatus') || 'Status'}</th>
                    <th className="p-3">{t('common.date') || 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedAdvanceRequests.map((adv) => (
                    <tr key={adv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 font-bold text-amber-800 dark:text-amber-400">{adv.requestCode}</td>
                      {!isWorker && (
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {adv.workerId?.name}
                          {adv.exceedsLimit && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-bold animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              {t('workerModals.advanceLimitReached') || 'Exceeds ₹10k Limit'}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="p-3 font-black text-slate-900 dark:text-white text-sm">₹{adv.amount}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{adv.reason}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={adv.status} size="sm">{adv.status}</Badge>
                          {(isThekedar || isOwner) && adv.status === 'PENDING' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={reviewLoadingId === adv._id || adv.exceedsLimit}
                                onClick={() => handleReviewAdvance(adv._id, 'APPROVED')}
                                title={adv.exceedsLimit ? "Worker advance exceeds ₹10,000 limit - Cannot Approve" : "Approve advance request"}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                  adv.exceedsLimit
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                                }`}
                              >
                                {reviewLoadingId === adv._id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                <span>{t('common.approve') || 'Approve'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={reviewLoadingId === adv._id}
                                onClick={() => handleReviewAdvance(adv._id, 'REJECTED')}
                                title="Deny / Reject advance request"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                <span>{t('common.reject') || 'Deny'}</span>
                              </button>
                            </div>
                          )}
                          {(isThekedar || isOwner) && adv.status === 'APPROVED' && (
                            <button
                              type="button"
                              disabled={adv.exceedsLimit}
                              onClick={() => {
                                if (!adv.exceedsLimit) {
                                  setSelectedAdvanceForDisburse(adv);
                                  setDisburseModalOpen(true);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                                adv.exceedsLimit
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                              title={adv.exceedsLimit ? "Worker advance exceeds ₹10,000 limit" : "Disburse approved advance amount"}
                            >
                              <IndianRupee className="h-3 w-3" />
                              <span>{t('thekedar.disburse') || 'Disburse'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-400">{new Date(adv.requestedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Record Salary Payment */}
      <Modal isOpen={salaryPayModalOpen} onClose={() => setSalaryPayModalOpen(false)} title={t('finance.recordSalaryModalTitle', 'Record Salary Payment against Finalized Payroll')}>
        <form onSubmit={handleRecordSalaryPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.selectPayroll', 'Select Finalized Payroll Statement')}</label>
            <select
              value={selectedPayrollId}
              onChange={(e) => setSelectedPayrollId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:outline-none"
            >
              {payrolls
                .filter((p) => p.status === 'FINALIZED' || p.status === 'PARTIALLY_PAID')
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.payrollCode} - {p.workerId?.name} ({t('payroll.remainingDue', 'Remaining Due')}: ₹{p.balanceRemaining})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.paymentAmount', 'Payment Amount (INR ₹)')}</label>
              <input
                type="number"
                required
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.paymentMethod', 'Payment Method')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:outline-none"
              >
                <option value="BANK_TRANSFER">{t('finance.bankTransfer', 'Bank Transfer (NEFT/IMPS)')}</option>
                <option value="UPI">{t('finance.upi', 'UPI')}</option>
                <option value="CASH">{t('finance.cash', 'Cash')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.utrReference', 'UTR / Reference Number')}</label>
            <input
              type="text"
              value={receiptReference}
              onChange={(e) => setReceiptReference(e.target.value)}
              placeholder="e.g. NEFT-SBIN202610-8812"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.notesRemarks', 'Notes / Remarks')}</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Part payment transferred to worker bank account"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setSalaryPayModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('finance.allocateRecord', 'Allocate & Record Payment')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Advance Disbursement */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => {
          setDisburseModalOpen(false);
          setSelectedAdvanceForDisburse(null);
        }}
        title={t('finance.disburseModalTitle', 'Record Advance Disbursement')}
      >
        {selectedAdvanceForDisburse && (
          <form onSubmit={handleDisburseAdvance} className="space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div>{t('common.worker', 'Worker')}: <strong className="text-slate-900 dark:text-white font-bold">{selectedAdvanceForDisburse.workerId?.name}</strong></div>
              <div>{t('tools.tableIssueCode', 'Request Code')}: <span className="font-mono text-amber-800 dark:text-amber-400 font-bold">{selectedAdvanceForDisburse.requestCode}</span></div>
              <div>{t('common.amount', 'Amount to Disburse')}: <strong className="font-black text-sm text-slate-950 dark:text-slate-100">₹{selectedAdvanceForDisburse.amount?.toLocaleString('en-IN')}</strong></div>
              <div>{t('common.reason', 'Reason')}: <span className="text-slate-700 dark:text-slate-400 italic">{selectedAdvanceForDisburse.reason}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.disburseMethod', 'Disbursement Payment Method')}</label>
              <select
                value={disbursePaymentMethod}
                onChange={(e) => setDisbursePaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs font-semibold focus:outline-none"
              >
                <option value="CASH">{t('finance.cash', 'Cash')}</option>
                <option value="UPI">{t('finance.upi', 'UPI')}</option>
                <option value="BANK_TRANSFER">{t('finance.bankTransfer', 'Bank Transfer (NEFT/IMPS)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('finance.utrOptional', 'UTR / Receipt Reference Number (Optional)')}</label>
              <input
                type="text"
                value={disburseReceiptReference}
                onChange={(e) => setDisburseReceiptReference(e.target.value)}
                placeholder="e.g. UPI-UTR-298382910 or Cash Receipt #"
                className="mt-1 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-xs focus:outline-none"
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
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" loading={disburseSubmitting}>
                {t('finance.confirmDisburse', 'Confirm Disbursement')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
