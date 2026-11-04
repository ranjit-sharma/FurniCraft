import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { LoadError } from '../components/common/LoadError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  Receipt,
  Plus,
  ArrowLeft,
  IndianRupee,
  MapPin,
  HardHat,
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState(null);

  // Record Money Received Modal
  const [moneyModalOpen, setMoneyModalOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedStage, setReceivedStage] = useState('Advance Booking');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [receiptReference, setReceiptReference] = useState('');
  const [payerName, setPayerName] = useState('');
  const [moneyNotes, setMoneyNotes] = useState('');
  const [moneySubmitting, setMoneySubmitting] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const fetchProjectDetails = async () => {
    try {
      setLoadError(null);
      const res = await api.get(`/projects/${projectId}`);
      setData(res.data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleRecordMoneyReceived = async (e) => {
    e.preventDefault();
    setMoneySubmitting(true);
    try {
      await api.post(`/projects/${projectId}/money-received`, {
        amount: parseFloat(receivedAmount),
        stage: receivedStage,
        paymentMethod,
        receiptReference: receiptReference || undefined,
        payerName: payerName || undefined,
        notes: moneyNotes,
      });
      setMessage({ type: 'success', text: 'Project money received recorded successfully!' });
      setMoneyModalOpen(false);
      setReceivedAmount('');
      setReceiptReference('');
      setPayerName('');
      setMoneyNotes('');
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record money received' });
    } finally {
      setMoneySubmitting(false);
    }
  };

  const handleProjectStatusChange = async (newStatus) => {
    try {
      await api.put(`/projects/${projectId}`, { status: newStatus });
      setMessage({ type: 'success', text: `Project status successfully updated to ${newStatus}` });
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update project status' });
    }
  };

  const handleProjectPriorityChange = async (newPriority) => {
    try {
      await api.put(`/projects/${projectId}`, { priority: newPriority });
      setMessage({ type: 'success', text: `Project priority successfully updated to ${newPriority}` });
      fetchProjectDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update priority' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  // Load failed: show the reason and a way back instead of an empty project shell.
  if (!data && loadError) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-400">
          <ArrowLeft className="h-4 w-4" /> {t('projectDetail.backToProjects', 'Back to Projects')}
        </Link>
        <LoadError message={loadError} onRetry={fetchProjectDetails} />
      </div>
    );
  }

  const project = data?.project;
  const moneyReceived = data?.moneyReceived || [];
  const summary = data?.financialSummary || {};
  const totalInflow = moneyReceived.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <LoadError message={loadError} onRetry={fetchProjectDetails} />
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
      >
        <ArrowLeft className="h-4 w-4" /> {t('projectDetail.backToProjects', 'Back to Projects')}
      </Link>

      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Project Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                {project?.projectCode}
              </span>

              {isThekedar ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      {t('common.status', 'Status')}:
                    </span>
                    <select
                      value={project?.status}
                      onChange={(e) => handleProjectStatusChange(e.target.value)}
                      className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-slate-900 dark:text-white shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="PLANNED">PLANNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="ON_HOLD">ON_HOLD</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ARCHIVED">ARCHIVED 📁</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                      Priority:
                    </span>
                    <select
                      value={project?.priority || 'MEDIUM'}
                      onChange={(e) => handleProjectPriorityChange(e.target.value)}
                      className="text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-slate-900 dark:text-white shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="CRITICAL">🔥 CRITICAL</option>
                      <option value="HIGH">⚡ HIGH</option>
                      <option value="MEDIUM">🔷 MEDIUM</option>
                      <option value="LOW">🟢 LOW</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <Badge variant={project?.status} size="sm">
                    {project?.status}
                  </Badge>
                  <Badge variant={project?.priority || 'MEDIUM'} size="sm">
                    {project?.priority === 'CRITICAL' && '🔥 '}
                    {project?.priority === 'HIGH' && '⚡ '}
                    {project?.priority || 'MEDIUM'} PRIORITY
                  </Badge>
                </>
              )}

              <Badge variant="default" size="sm">
                {project?.projectType ? project.projectType.replace('_', ' ') : ''}
              </Badge>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {project?.name}
            </h1>
            {isOwner && project?.thekedarId && (
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-1 flex items-center gap-1.5">
                <HardHat className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>{t('thekedars.thekedarSupervisor', 'Thekedar')}: {project.thekedarId.name || project.thekedarId}</span>
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              {project?.siteAddress || 'No site address specified'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
            {isThekedar && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setMoneyModalOpen(true)}
                icon={IndianRupee}
              >
                {t('projectDetail.recordMoney', 'Record Money Received')}
              </Button>
            )}

            {isOwner && (
              <span className="inline-flex items-center rounded-lg bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-900 dark:text-purple-300">
                {t('projectDetail.readOnlyInspection', 'Read-Only Executive Inspection')}
              </span>
            )}
          </div>
        </div>

        {/* Project Metrics Summary Strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t('projectDetail.projectMoneyReceived', 'Total Money Received')}
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              ₹{(summary.totalMoneyReceived ?? totalInflow).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Client payments & milestone advances
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Site Location
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
              {project?.siteAddress || 'Project Site'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Client: {project?.clientName || 'General Client'}
            </span>
          </div>
        </div>
      </div>

      {/* Money Received */}
        <Card>
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('projectDetail.moneyReceivedTitle', 'Project Money Received')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t(
                  'projectDetail.moneyReceivedSub',
                  'Client milestone disbursements, booking advances, and progress payments for this project.'
                )}
              </p>
            </div>
          </div>

          {moneyReceived.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <IndianRupee className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                {t('projectDetail.noPaymentsRecorded', 'No payments recorded from client yet.')}
              </p>
              {isThekedar && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMoneyModalOpen(true)}
                  icon={Plus}
                  className="mt-3"
                >
                  Record First Inflow
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {moneyReceived.map((rec) => (
                <div
                  key={rec._id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        {rec.receiptCode || 'RCP'}
                      </span>
                      <Badge variant="success" size="sm">
                        {rec.stage || 'Payment'}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                      {rec.payerName || project?.clientName || 'Client Payment'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Method: <strong className="text-slate-700 dark:text-slate-300">{rec.paymentMethod}</strong>
                      {rec.receiptReference ? ` • Ref: ${rec.receiptReference}` : ''} • Date:{' '}
                      {new Date(rec.receivedDate || rec.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {rec.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        {rec.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-700 dark:text-emerald-300 text-lg">
                      ₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                      {t('projectDetail.receivedInflow', 'Received Inflow')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      {/* Modal: Record Money Received (Exclusively preserved) */}
      <Modal
        isOpen={moneyModalOpen}
        onClose={() => setMoneyModalOpen(false)}
        title={t('projectDetail.recordMoneyModalTitle', 'Record Project Money Received')}
      >
        <form onSubmit={handleRecordMoneyReceived} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('projectDetail.amountReceivedLabel', 'Amount Received (INR ₹) *')}
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('projectDetail.milestoneStage', 'Milestone / Stage')}
              </label>
              <select
                value={receivedStage}
                onChange={(e) => setReceivedStage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('projectDetail.paymentMethod', 'Payment Method')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">
                  {t('finance.bankTransfer', 'Bank Transfer (NEFT/IMPS)')}
                </option>
                <option value="UPI">{t('finance.upi', 'UPI')}</option>
                <option value="CASH">{t('finance.cash', 'Cash')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('projectDetail.payerName', 'Payer Name')}
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={project?.clientName || t('projectDetail.payerPlaceholder', 'e.g. Client Name')}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('projectDetail.receiptRefLabel', 'UTR / Cheque / Receipt Ref')}
              </label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder={t('projectDetail.receiptRefPlaceholder', 'e.g. UTR-99882211')}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('projectDetail.notesRemarks', 'Notes / Remarks')}
            </label>
            <input
              type="text"
              value={moneyNotes}
              onChange={(e) => setMoneyNotes(e.target.value)}
              placeholder={t(
                'projectDetail.notesPlaceholder',
                'e.g. First installment received via bank transfer'
              )}
              className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setMoneyModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={moneySubmitting}>
              {moneySubmitting ? 'Recording...' : t('projectDetail.recordMoney', 'Record Money Received')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
