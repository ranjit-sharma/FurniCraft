import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { ExpensesSkeleton } from '../components/common/Skeleton';
import { IndianRupee, Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const getCurrentMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (mStr) => {
  if (!mStr || mStr === 'ALL') return 'All Months';
  const [y, m] = mStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const ExpensesPage = () => {
  const { isThekedar } = useAuth();
  const { t } = useLanguage();

  // Month-wise view: defaults strictly to the current month (e.g. 2026-11)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr);
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Auto-dismiss notification message after 7 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [message]);

  // New Money Received Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stage, setStage] = useState('Advance Booking');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [receiptReference, setReceiptReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, projRes] = await Promise.all([
        api.get('/projects/money-received/all'),
        api.get('/projects'),
      ]);
      setPayments(payRes.data.payments || []);
      setProjects(projRes.data.projects || []);
      if (projRes.data.projects?.length > 0) {
        setProjectId(projRes.data.projects[0]._id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch money received records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrevMonth = () => {
    const base = selectedMonth && selectedMonth !== 'ALL' ? selectedMonth : getCurrentMonthStr();
    const [y, m] = base.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const base = selectedMonth && selectedMonth !== 'ALL' ? selectedMonth : getCurrentMonthStr();
    const [y, m] = base.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/projects/${projectId}/money-received`, {
        amount: parseFloat(amount),
        receivedDate: receivedDate || undefined,
        stage,
        paymentMethod,
        receiptReference: receiptReference || undefined,
        payerName: payerName || undefined,
        notes,
      });
      setMessage({ type: 'success', text: 'Project money received recorded successfully!' });
      setModalOpen(false);
      setAmount('');
      setReceiptReference('');
      setPayerName('');
      setNotes('');
      setReceivedDate(new Date().toISOString().slice(0, 10));
      // Auto sync selected month if receipt was recorded for a specific month
      if (receivedDate) {
        const entryMonth = receivedDate.slice(0, 7);
        if (selectedMonth !== 'ALL' && selectedMonth !== entryMonth) {
          setSelectedMonth(entryMonth);
        }
      }
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter payments month-wise
  const filteredPayments = useMemo(() => {
    if (selectedMonth === 'ALL') return payments;
    return payments.filter((p) => {
      const d = new Date(p.receivedDate || p.createdAt);
      if (isNaN(d.getTime())) return false;
      const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return yyyyMm === selectedMonth;
    });
  }, [payments, selectedMonth]);

  const monthMoneyReceived = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const allTimeMoneyReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const uniqueProjectsInMonth = new Set(filteredPayments.map((p) => p.projectId?._id || p.projectId)).size;
  const uniqueProjectsAllTime = new Set(payments.map((p) => p.projectId?._id || p.projectId)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.pageTitle', 'Project Income')}
        subtitle={t('expenses.pageSub', 'Payments from clients for your projects')}
        actions={isThekedar && (
          <Button variant="primary" onClick={() => setModalOpen(true)} icon={Plus}>
            {t('expenses.recordMoneyReceived', 'Record Income')}
          </Button>
        )}
      />

      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-semibold ${
            message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Month Navigation & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
            <Calendar className="h-5 w-5 shrink-0" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              {t('expenses.showingPeriod', 'Showing Period')}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {getMonthLabel(selectedMonth)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Previous Month */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            disabled={selectedMonth === 'ALL'}
            icon={ChevronLeft}
            title={t('common.prev', 'Previous Month')}
          >
            <span className="hidden sm:inline">{t('common.prev', 'Prev')}</span>
          </Button>

          {/* Month Input Picker */}
          <input
            type="month"
            value={selectedMonth === 'ALL' ? '' : selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            aria-label="Select month"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
            title="Pick month"
          />

          {/* Next Month */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={selectedMonth === 'ALL'}
            title={t('common.next', 'Next Month')}
          >
            <span className="hidden sm:inline">{t('common.next', 'Next')}</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>

          {/* Current Month Shortcut */}
          <Button
            type="button"
            variant={selectedMonth === getCurrentMonthStr() ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth(getCurrentMonthStr())}
            className="text-xs"
          >
            {t('common.currentMonth', 'Current Month')}
          </Button>

          {/* All Months Toggle */}
          <Button
            type="button"
            variant={selectedMonth === 'ALL' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth(selectedMonth === 'ALL' ? getCurrentMonthStr() : 'ALL')}
            className="text-xs"
          >
            {selectedMonth === 'ALL' ? 'Current Month' : 'All Months'}
          </Button>
        </div>
      </div>

      {/* Summary: month-wise total + all-time total */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
            {selectedMonth === 'ALL'
              ? t('expenses.totalMoneyReceivedAllTime', 'Total Project Income (All Time)')
              : `${t('expenses.totalMoneyReceivedMonth', 'Project Income')} — ${getMonthLabel(selectedMonth)}`}
          </div>
          <div className="text-3xl font-black mt-1">₹{monthMoneyReceived.toLocaleString('en-IN')}</div>
          <div className="mt-2 text-xs text-emerald-100/90">
            {filteredPayments.length} {t('expenses.receiptsLower', 'receipts')} · {uniqueProjectsInMonth} {t('expenses.projectsLower', 'projects')}
          </div>
        </div>

        {selectedMonth !== 'ALL' && (
          <div className="border-t sm:border-t-0 sm:border-l border-emerald-600/60 pt-3 sm:pt-0 sm:pl-6 text-left sm:text-right">
            <div className="text-[11px] font-semibold uppercase text-emerald-200">
              {t('expenses.allTimeTotal', 'All-Time Total')}
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              ₹{allTimeMoneyReceived.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-200/80">
              {payments.length} {t('expenses.receiptsLower', 'receipts')} across {uniqueProjectsAllTime} {t('expenses.projectsLower', 'projects')}
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('expenses.ledgerTitle', 'Receipts & Inflows Ledger')}
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                ({getMonthLabel(selectedMonth)})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('expenses.ledgerSubtitle', 'Recorded receipts of funds received from clients for modern furniture manufacturing, assembly, and site installation.')}
            </p>
          </div>
          <Badge variant="success" size="sm">
            {filteredPayments.length} {t('expenses.receiptsLower', 'receipts')}
          </Badge>
        </div>

        {loading ? (
          <ExpensesSkeleton />
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <IndianRupee className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
              {selectedMonth === 'ALL'
                ? (t('expenses.noPaymentsRecorded') || 'No client payments recorded')
                : `No client payments recorded for ${getMonthLabel(selectedMonth)}`}
            </h3>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-400">
              {t('expenses.noPaymentsDesc') || 'Record advances or milestone payments received from project clients.'}
            </p>
            {isThekedar && (
              <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> {t('expenses.recordFirstPayment') || 'Record First Payment'}
              </Button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile / Small Screen Card Layout: Single View, Zero Side Scroll */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-4 space-y-3">
              {filteredPayments.map((p) => (
                <div key={p._id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400 text-xs">{p.receiptCode}</span>
                    <div className="font-black text-emerald-700 dark:text-emerald-400 text-base">₹{p.amount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{p.projectId?.name || 'Project Site'}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{p.projectId?.projectCode}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <div>
                      <span className="font-semibold text-slate-500">{t('expenses.payer', 'Payer:')} </span>
                      {p.payerName || p.projectId?.clientName || 'Client'}
                    </div>
                    <Badge variant="success" size="sm">{p.stage || 'Stage Payment'}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap gap-1">
                    <span>{p.paymentMethod} {p.receiptReference ? `· Ref: ${p.receiptReference}` : ''}</span>
                    <span>{new Date(p.receivedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout: Full Width */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3.5">{t('expenses.receiptCodeCol') || 'Receipt Code'}</th>
                    <th className="px-6 py-3.5">{t('expenses.projectCol') || 'Project'}</th>
                    <th className="px-6 py-3.5">{t('expenses.clientPayerCol') || 'Client / Payer'}</th>
                    <th className="px-6 py-3.5">{t('expenses.stageCol') || 'Milestone Stage'}</th>
                    <th className="px-6 py-3.5">{t('expenses.methodRefCol') || 'Method & Ref'}</th>
                    <th className="px-6 py-3.5">{t('expenses.dateCol') || t('common.date') || 'Date'}</th>
                    <th className="px-6 py-3.5 text-right">{t('expenses.amountReceivedCol') || 'Amount Received'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400 text-xs">{p.receiptCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.projectId?.name || 'Project Site'}</div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-400 font-mono">{p.projectId?.projectCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.payerName || p.projectId?.clientName || 'Client'}</div>
                        {p.notes && <div className="text-[11px] text-slate-700 dark:text-slate-400 italic">{p.notes}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success" size="sm">{p.stage || 'Stage Payment'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{p.paymentMethod}</div>
                        {p.receiptReference && (
                          <div className="text-[11px] text-slate-700 dark:text-slate-400 font-mono">Ref: {p.receiptReference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-400">
                        {new Date(p.receivedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-emerald-950 dark:text-emerald-300 text-base">₹{p.amount.toLocaleString('en-IN')}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Record Project Income */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('expenses.recordModalTitle') || 'Record Project Income'}>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.selectProject') || 'Target Furniture Project *'}</label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            >
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id}>
                  {proj.projectCode} - {proj.name} ({proj.clientName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.amountReceived') || 'Amount Received (INR ₹) *'}</label>
              <input
                type="number"
                required
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 75000"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('expenses.paymentDate', 'Payment Received Date *')}
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.stage') || 'Milestone Stage'}</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="Advance Booking">{t('projects.milestoneAdvance', 'Advance Booking')}</option>
                <option value="Material Delivery">{t('projects.milestoneMaterial', 'Material Delivery')}</option>
                <option value="Carcass Assembly">{t('projects.milestoneCarcass', 'Carcass Assembly')}</option>
                <option value="Shutter & Fitting">{t('projects.milestoneShutter', 'Shutter & Fitting')}</option>
                <option value="Polishing & Finishing">{t('projects.milestonePolishing', 'Polishing & Finishing')}</option>
                <option value="Final Handover">{t('projects.milestoneFinal', 'Final Handover')}</option>
                <option value="Part Payment">{t('projects.milestonePart', 'Part Payment')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.paymentMethod') || 'Payment Method'}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">{t('expenses.cash', 'Cash')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.payerName') || 'Payer Name'}</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Client Name or Signee"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.receiptRef') || 'UTR / Cheque / Ref Number'}</label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder="e.g. UTR-88112244"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.notes') || 'Notes / Remarks'}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment description / notes"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (t('common.loading') || 'Recording...') : (t('expenses.recordMoneyReceived') || 'Record Payment')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
