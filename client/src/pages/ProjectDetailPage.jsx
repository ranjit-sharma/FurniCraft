import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import {
  FolderKanban,
  Wrench,
  Receipt,
  Plus,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  IndianRupee,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('moneyReceived');
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

  const fetchProjectDetails = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load project details:', err);
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

  const project = data?.project;
  const moneyReceived = data?.moneyReceived || [];
  const tools = data?.tools || [];
  const summary = data?.financialSummary || {};
  const totalInflow = moneyReceived.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6">
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
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-3">
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
              {t('projectDetail.tools', 'Assigned Tools at Site')}
            </span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
              {tools.length} <span className="text-xs font-normal text-slate-500">units</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              Deployed machinery & equipment
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

      {/* Tabs Strip: Strictly Money Received & Assigned Tools */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scrollbar-none pb-0.5">
        {[
          {
            id: 'moneyReceived',
            label: `${t('projectDetail.moneyReceived', 'Money Received')} (${moneyReceived.length})`,
            icon: IndianRupee,
          },
          {
            id: 'tools',
            label: `${t('projectDetail.tools', 'Assigned Tools')} (${tools.length})`,
            icon: Wrench,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-900 dark:text-amber-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Money Received */}
      {activeTab === 'moneyReceived' && (
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
            {isThekedar && (
              <Button
                size="xs"
                variant="primary"
                onClick={() => setMoneyModalOpen(true)}
                icon={Plus}
              >
                {t('projectDetail.recordPayment', 'Record Payment')}
              </Button>
            )}
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
      )}

      {/* Tab 2: Assigned Tools */}
      {activeTab === 'tools' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Site Tools & Machinery ({tools.length})
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Equipment, power tools, and hardware currently deployed at this furniture project site.
              </p>
            </div>
            <Link to="/tools">
              <Button size="xs" variant="outline" icon={ExternalLink}>
                Manage in Tool Tracking
              </Button>
            </Link>
          </div>

          {tools.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Wrench className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                {t('projectDetail.noToolsDeployed', 'No tools currently deployed at this project site.')}
              </p>
              <Link to="/tools" className="inline-block mt-3">
                <Button size="sm" variant="outline" icon={Plus}>
                  Issue Tools to this Site
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                    <th className="p-3 font-bold">Tool ID</th>
                    <th className="p-3 font-bold">Tool Name</th>
                    <th className="p-3 font-bold">Category</th>
                    <th className="p-3 font-bold">Assigned Craftsman</th>
                    <th className="p-3 font-bold">Condition</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tools.map((toolItem) => {
                    const assignedWorker =
                      toolItem.currentAssignment?.workerId?.name ||
                      toolItem.assignedWorkerName ||
                      'Site General Custody';
                    const assignedPhone =
                      toolItem.currentAssignment?.workerId?.phone || '';

                    return (
                      <tr
                        key={toolItem._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-400">
                          {toolItem.toolCode || 'TOL'}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {toolItem.name}
                          </div>
                          {toolItem.description && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {toolItem.description}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {toolItem.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {assignedWorker}
                          </div>
                          {assignedPhone && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {assignedPhone}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              toolItem.condition === 'DAMAGED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : toolItem.condition === 'FAIR'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {toolItem.condition || 'GOOD'}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant={toolItem.status} size="sm">
                            {toolItem.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

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
              {moneySubmitting ? 'Recording...' : t('projectDetail.recordPayment', 'Record Payment')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
