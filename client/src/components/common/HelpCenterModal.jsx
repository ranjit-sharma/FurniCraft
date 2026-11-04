import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api/client';
import {
  LifeBuoy,
  HelpCircle,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  FolderKanban,
  UserCheck,
  CalendarCheck,
  FileText,
  RotateCcw,
  Sparkles,
  Mail,
} from 'lucide-react';

export const HelpCenterModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [category, setCategory] = useState('ATTENDANCE_WAGES');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Ticket history
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Fetch past tickets when tab switches to 'history' or on mount
  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchMyTickets();
    }
  }, [isOpen, activeTab]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get('/support/tickets/my');
      setMyTickets(res.data?.tickets || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleReset = () => {
    setCategory('ATTENDANCE_WAGES');
    setPriority('MEDIUM');
    setSubject('');
    setMessage('');
    setError(null);
    setSubmittedTicket(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError(t('help.subjectRequired', 'Please enter a subject or title for your query.'));
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setError(t('help.messageRequired', 'Please provide a description (at least 5 characters).'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/support/tickets', {
        category,
        priority,
        subject: subject.trim(),
        message: message.trim(),
        contactEmail: (user?.email || '').trim(),
        contactPhone: (user?.phone || '').trim(),
      });

      if (res.data?.ticket) {
        setSubmittedTicket(res.data.ticket);
        // Refresh ticket list
        fetchMyTickets();
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('common.error', 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    {
      id: 'ATTENDANCE_WAGES',
      label: t('help.catAttendance', 'Attendance & Wages'),
      icon: CalendarCheck,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'PAYMENT_BILL',
      label: t('help.catPayment', 'Payment & Advance'),
      icon: Receipt,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'PROJECT_SITE',
      label: t('help.catProject', 'Project & Site'),
      icon: FolderKanban,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'ACCOUNT_LOGIN',
      label: t('help.catAccount', 'Account & Access'),
      icon: UserCheck,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      id: 'GENERAL_INQUIRY',
      label: t('help.catGeneral', 'General Inquiry'),
      icon: HelpCircle,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {t('help.title', 'Help & Support Center')}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {t('help.subtitle', 'Submit a query, report an issue, or track help requests')}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>{t('help.newTicket', 'Submit Request')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{t('help.myTickets', 'My Tickets')}</span>
            {myTickets.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-black">
                {myTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Submit Request Form */}
        {activeTab === 'new' && (
          <div>
            {submittedTicket ? (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 text-center animate-fade-in">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="mt-3 text-base font-black text-emerald-950">
                  {t('help.successTitle', 'Request Submitted Successfully!')}
                </h4>
                <p className="mt-1 text-xs text-emerald-800">
                  {t(
                    'help.successDesc',
                    'Your inquiry has been registered in the system. Our team will review and resolve it promptly.'
                  )}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {t('help.ticketId', 'Ticket ID')}:
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-700">
                    {submittedTicket.ticketNumber}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t('help.submitAnother', 'Submit Another')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t('help.viewTickets', 'View My Tickets')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Requester Summary Card */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900">{user?.name}</span>
                      <span className="ml-1.5 text-[11px] text-slate-500 font-medium">({user?.role})</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 shrink-0">
                    {user?.email || user?.phone}
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('help.selectCategory', 'Issue Category')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 font-bold shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('help.priority', 'Urgency / Priority')}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'LOW', label: t('help.priorityLow', 'Low') },
                      { id: 'MEDIUM', label: t('help.priorityMedium', 'Normal') },
                      { id: 'HIGH', label: t('help.priorityHigh', 'High') },
                      { id: 'URGENT', label: t('help.priorityUrgent', 'Urgent') },
                    ].map((p) => {
                      const isSelected = priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={`py-1.5 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                            isSelected
                              ? p.id === 'URGENT'
                                ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                                : 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('help.subject', 'Subject / Summary')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('help.subjectPlaceholder', 'e.g. Attendance shift mismatch or payment query')}
                    maxLength={150}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('help.description', 'Details / Description')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t(
                      'help.descriptionPlaceholder',
                      'Please describe the issue in detail, including worker code, project name, or any error messages...'
                    )}
                    maxLength={2000}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                  />
                  <div className="mt-1 text-right text-[10px] text-slate-400">
                    {message.length} / 2000
                  </div>
                </div>

                {/* Automated Profile Email Notice */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px]">
                    <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{t('help.dispatchNotice', 'Your request will be delivered directly to furnicraft.erp@gmail.com')}</span>
                  </div>
                  {user?.email && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                      {user.email}
                    </span>
                  )}
                </div>

                {/* Form Actions */}
                <div className="mt-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      onClose();
                    }}
                    disabled={submitting}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? t('help.submitting', 'Submitting...') : t('help.submit', 'Submit Request')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: My Submitted Tickets */}
        {activeTab === 'history' && (
          <div className="space-y-2.5">
            {loadingTickets ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mb-2" />
                {t('common.loading', 'Loading tickets...')}
              </div>
            ) : myTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-700">{t('help.noTickets', 'No support tickets found.')}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t('help.noTicketsDesc', 'When you submit a help query, it will be tracked here.')}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{t('help.newTicket', 'Submit Request')}</span>
                </button>
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {myTickets.map((tkt) => (
                  <div
                    key={tkt._id}
                    className="rounded-xl border border-slate-200/90 bg-white p-3 text-xs transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-black text-amber-700">
                          {tkt.ticketNumber}
                        </span>
                        <span className="rounded-md border bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                          {tkt.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          tkt.status
                        )}`}
                      >
                        {tkt.status}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-900 mb-1">{tkt.subject}</h5>
                    <p className="text-slate-600 leading-relaxed text-[11px] line-clamp-3">
                      {tkt.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                      <span>
                        {new Date(tkt.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-semibold text-slate-500">
                        {t('help.priority', 'Priority')}: {tkt.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
