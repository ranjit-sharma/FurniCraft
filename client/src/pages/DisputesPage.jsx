import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { AlertCircle, Plus, CheckCircle, Clock } from 'lucide-react';

export const DisputesPage = () => {
  const { user, isOwner, isThekedar, isWorker } = useAuth();
  const { t } = useLanguage();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // File Dispute Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [category, setCategory] = useState('ATTENDANCE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Resolve Dispute Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchDisputes = async () => {
    try {
      const res = await api.get('/disputes');
      setDisputes(res.data.disputes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    try {
      await api.post('/disputes', {
        category,
        subject,
        description,
      });
      setMessage({ type: 'success', text: t('disputes.submittedSuccess', 'Grievance / Dispute submitted for review.') });
      setCreateModalOpen(false);
      setSubject('');
      setDescription('');
      fetchDisputes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/disputes/${selectedDispute._id}/resolve`, {
        status: resolveStatus,
        resolutionNotes,
      });
      setMessage({ type: 'success', text: `Dispute marked as ${resolveStatus}!` });
      setResolveModalOpen(false);
      setResolutionNotes('');
      fetchDisputes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('disputes.title', 'Worker Grievances & Disputes')}</h2>
          <p className="text-xs text-slate-700">{t('disputes.subtitle', 'Transparent dispute handling for attendance shifts, wage rates, tool damage, and advances.')}</p>
        </div>

        {isWorker && (
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} icon={Plus} className="w-full sm:w-auto justify-center">
            {t('disputes.submitGrievance', 'Submit Grievance')}
          </Button>
        )}
      </div>

      {/* Disputes Table */}
      <Card title={t('disputes.registerTitle', 'Grievances Register')} subtitle={t('disputes.registerSubtitle', 'Documented worker queries and resolutions')}>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : disputes.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-700 italic">{t('disputes.noDisputes', 'No disputes or grievances filed.')}</p>
        ) : (
          <div className="space-y-3">
            {disputes.map((disp) => (
              <div key={disp._id} className="rounded-xl border border-slate-200 p-4 hover:border-amber-300">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-800">{disp.disputeCode}</span>
                      <Badge variant="default" size="sm">{disp.category}</Badge>
                      <Badge variant={disp.status === 'RESOLVED' ? 'success' : disp.status === 'OPEN' ? 'warning' : 'danger'} size="sm">
                        {disp.status === 'RESOLVED' ? t('disputes.resolved', 'RESOLVED') : disp.status === 'OPEN' ? t('disputes.open', 'OPEN') : disp.status}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{disp.subject}</h3>
                    <p className="text-xs text-slate-700 mt-1">{disp.description}</p>
                    <span className="inline-block mt-2 text-[11px] text-slate-700">
                      {t('disputes.filedBy', 'Filed by')}: <strong className="text-slate-800">{disp.workerId?.name}</strong> • {t('disputes.thekedar', 'Thekedar')}: {disp.thekedarId?.name} • {new Date(disp.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {(isOwner || isThekedar) && disp.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedDispute(disp);
                        setResolveModalOpen(true);
                      }}
                      icon={CheckCircle}
                    >
                      {t('disputes.resolveGrievance', 'Resolve Grievance')}
                    </Button>
                  )}
                </div>

                {disp.resolutionNotes && (
                  <div className="mt-3 rounded-lg bg-emerald-50/70 p-3 text-xs text-emerald-900 border border-emerald-200">
                    <span className="font-bold">{t('disputes.resolutionDecision', 'Resolution Decision')} ({disp.status}):</span>
                    <p className="mt-0.5">{disp.resolutionNotes}</p>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      {t('disputes.resolvedBy', 'Resolved by')}: {disp.resolvedBy?.name || 'Administrator'} on {new Date(disp.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: Create Dispute */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('disputes.fileDisputeModal', 'File Worker Grievance')}>
        <form onSubmit={handleCreateDispute} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.category', 'Category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            >
              <option value="ATTENDANCE">Attendance Correction</option>
              <option value="PAYROLL">Payroll & Wage Settlement</option>
              <option value="ADVANCE">Advance Support</option>
              <option value="TOOL">Tool Assignment Dispute</option>
              <option value="OTHER">Other Site Grievance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.subject', 'Subject')}</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. October 2nd shift recorded as Half instead of Full"
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">{t('disputes.description', 'Description & Details')}</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide all facts regarding work done..."
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit">{t('disputes.submitGrievance', 'Submit Grievance')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resolve Dispute */}
      <Modal isOpen={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title={t('disputes.resolveGrievanceModal', 'Resolve Grievance')}>
        {selectedDispute && (
          <form onSubmit={handleResolveDispute} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <div>{t('disputes.subject', 'Subject')}: <strong className="text-slate-900">{selectedDispute.subject}</strong></div>
              <div>{t('common.worker', 'Worker')}: <strong className="text-slate-900">{selectedDispute.workerId?.name}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('disputes.resolutionDecision', 'Resolution Decision')}</label>
              <select
                value={resolveStatus}
                onChange={(e) => setResolveStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="RESOLVED">{t('disputes.resolved', 'Resolved')} (Accepted & Addressed)</option>
                <option value="REJECTED">{t('common.rejected', 'Rejected')} (Declined with reason)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">{t('disputes.resolutionExplanation', 'Resolution Explanation & Notes')}</label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="State the decision and any compensatory action taken..."
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResolveModalOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit">{t('disputes.saveResolution', 'Save Official Resolution')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

