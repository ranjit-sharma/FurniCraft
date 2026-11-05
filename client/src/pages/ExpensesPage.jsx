import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { IndianRupee, Plus } from 'lucide-react';

export const ExpensesPage = () => {
  const { isThekedar } = useAuth();
  const { t } = useLanguage();

  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // New Money Received Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
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

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/projects/${projectId}/money-received`, {
        amount: parseFloat(amount),
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
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const totalMoneyReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const uniqueProjectsCount = new Set(payments.map((p) => p.projectId?._id || p.projectId)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.pageTitle', 'Money Received')}
        subtitle={t('expenses.pageSub', 'Payments from clients for your projects')}
        actions={isThekedar && (
          <Button variant="primary" onClick={() => setModalOpen(true)} icon={Plus}>
            {t('expenses.recordMoneyReceived', 'Record Money Received')}
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

      {/* Summary: total + counts in one compact card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 text-white shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">{t('expenses.totalMoneyReceived', 'Total money received')}</div>
        <div className="text-3xl font-black">₹{totalMoneyReceived.toLocaleString('en-IN')}</div>
        <div className="mt-2 text-xs text-emerald-100/90">
          {payments.length} {t('expenses.receiptsLower', 'receipts')} · {uniqueProjectsCount} {t('expenses.projectsLower', 'projects')}
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('expenses.ledgerTitle', 'Receipts')}</h3>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <IndianRupee className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">{t('expenses.noPaymentsRecorded') || 'No client payments recorded'}</h3>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-400">{t('expenses.noPaymentsDesc') || 'Record advances or milestone payments received from project clients.'}</p>
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
              {payments.map((p) => (
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
                      <span className="font-semibold text-slate-500">Payer: </span>
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
                  {payments.map((p) => (
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

      {/* Modal: Record Money Received */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('expenses.recordModalTitle') || 'Record Project Money Received'}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">{t('expenses.stage') || 'Milestone Stage'}</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="Advance Booking">Advance Booking</option>
                <option value="Material Delivery">Material Delivery</option>
                <option value="Carcass Assembly">Carcass Assembly</option>
                <option value="Shutter & Fitting">Shutter & Fitting</option>
                <option value="Polishing & Finishing">Polishing & Finishing</option>
                <option value="Final Handover">Final Handover</option>
                <option value="Part Payment">Part Payment</option>
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
                <option value="CASH">Cash</option>
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
