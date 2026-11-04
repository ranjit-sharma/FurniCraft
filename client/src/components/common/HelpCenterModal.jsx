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
  ChevronDown,
  ChevronUp,
  Mail,
  User,
  Phone,
  Copy,
  Check,
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
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Ticket history & detail expansion
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedTicketId((prev) => (prev === id ? null : id));
  };

  // Fetch past tickets whenever modal is open or tab changes
  useEffect(() => {
    if (isOpen) {
      fetchMyTickets();
    }
  }, [isOpen, activeTab]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get('/support/tickets/my');
      const tickets = res?.tickets || res?.data?.tickets || [];
      setMyTickets(tickets);
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

      const ticket = res?.ticket || res?.data?.ticket;
      if (ticket) {
        setSubmittedTicket(ticket);
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

  const getCategoryLabel = (catId) => {
    const match = categories.find((c) => c.id === catId);
    if (match) return match.label;
    switch (catId) {
      case 'ATTENDANCE_WAGES': return t('help.catAttendance', 'Attendance & Wages');
      case 'PAYMENT_BILL': return t('help.catPayment', 'Payment & Advance');
      case 'PROJECT_SITE': return t('help.catProject', 'Project & Site');
      case 'ACCOUNT_LOGIN': return t('help.catAccount', 'Account & Access');
      case 'GENERAL_INQUIRY': return t('help.catGeneral', 'General Inquiry');
      default: return catId ? catId.replace(/_/g, ' ') : 'General';
    }
  };

  const getPriorityLabel = (pri) => {
    switch (pri) {
      case 'LOW': return t('help.priorityLow', 'Low');
      case 'MEDIUM': return t('help.priorityMedium', 'Normal');
      case 'HIGH': return t('help.priorityHigh', 'High');
      case 'URGENT': return t('help.priorityUrgent', 'Urgent');
      default: return pri || 'Normal';
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
              <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-amber-50/40 p-6 text-center animate-page-in shadow-xs">
                {/* Expanding checkmark ripple */}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-25 duration-1000" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transform transition-transform duration-300 hover:scale-105">
                    <CheckCircle2 className="h-8 w-8 animate-scale-in" />
                  </div>
                </div>

                {/* Animated Heading */}
                <div className="mt-3.5 flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  <h4 className="text-base font-black text-emerald-950">
                    {t('help.successTitle', 'Request Submitted Successfully!')}
                  </h4>
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                </div>
                <p className="mt-1 text-xs text-emerald-800/90 max-w-md mx-auto">
                  {t(
                    'help.successDesc',
                    'Your inquiry has been registered in the system. Our team will review and resolve it promptly.'
                  )}
                </p>

                {/* Animated Ticket ID Voucher Card */}
                <div className="mt-4 rounded-2xl border-2 border-emerald-400/80 bg-white p-4 shadow-sm relative overflow-hidden transition-all duration-300 animate-pop-in">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 animate-pulse" />

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100">
                    <span className="flex items-center gap-1 text-slate-600">
                      <LifeBuoy className="h-3.5 w-3.5 text-amber-600" />
                      {t('help.ticketId', 'Ticket Number')}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      Generated & Dispatched
                    </span>
                  </div>

                  {/* Prominent Ticket ID with Animated Copy Action */}
                  <div className="flex items-center justify-center gap-2 py-1.5">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-700 tracking-wider select-all">
                      {submittedTicket.ticketNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator?.clipboard) {
                          navigator.clipboard.writeText(submittedTicket.ticketNumber);
                          setCopiedTicket(true);
                          setTimeout(() => setCopiedTicket(false), 2200);
                        }
                      }}
                      title="Copy Ticket ID"
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    >
                      {copiedTicket ? (
                        <Check className="h-4 w-4 text-emerald-600 animate-scale-in" />
                      ) : (
                        <Copy className="h-4 w-4 hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                  {copiedTicket && (
                    <div className="text-[10px] font-bold text-emerald-600 animate-fade-in mb-1">
                      Copied to clipboard!
                    </div>
                  )}

                  {/* Quick Meta Chips */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {getCategoryLabel(submittedTicket.category)}
                    </span>
                    <span className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {getPriorityLabel(submittedTicket.priority)}
                    </span>
                    <span className="font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                      furnicraft.erp@gmail.com
                    </span>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t('help.submitAnother', 'Submit Another')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 cursor-pointer transition transform hover:scale-[1.02]"
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
              <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1">
                {myTickets.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt._id;
                  const categoryLabel = getCategoryLabel(tkt.category);
                  const priorityLabel = getPriorityLabel(tkt.priority);

                  return (
                    <div
                      key={tkt._id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 text-xs transition shadow-2xs hover:border-slate-300"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            {tkt.ticketNumber}
                          </span>
                          <span className="rounded-md border bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {categoryLabel}
                          </span>
                        </div>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${getStatusBadge(
                            tkt.status
                          )}`}
                        >
                          {tkt.status}
                        </span>
                      </div>

                      {/* Subject */}
                      <h5 className="font-bold text-slate-900 text-sm mb-1.5 leading-snug">
                        {tkt.subject}
                      </h5>

                      {/* Profile / Requester Details Row (Always visible) */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[11px]">
                        {(tkt.userEmail || user?.email) && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                            <Mail className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>{tkt.userEmail || user?.email}</span>
                          </span>
                        )}
                        {(tkt.userName || user?.name) && (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{tkt.userName || user?.name} ({tkt.userRole || user?.role})</span>
                          </span>
                        )}
                        {(tkt.userPhone || user?.phone) && (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{tkt.userPhone || user?.phone}</span>
                          </span>
                        )}
                      </div>

                      {/* Message / Query Description */}
                      <p className={`text-slate-600 leading-relaxed text-xs ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                        {tkt.message}
                      </p>

                      {/* Expandable Full Details Section */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-fade-in bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {t('help.ticketId', 'Ticket ID')}
                              </span>
                              <span className="font-mono font-bold text-slate-800">{tkt.ticketNumber}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {t('help.priority', 'Priority')}
                              </span>
                              <span className="font-bold text-slate-800">{priorityLabel}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {t('help.selectCategory', 'Category')}
                              </span>
                              <span className="font-medium text-slate-800">{categoryLabel}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Submitted At
                              </span>
                              <span className="text-slate-700 font-medium">
                                {new Date(tkt.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Profile Information Block */}
                          <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 text-[11px] space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Requester Profile Information
                            </span>
                            <div className="flex flex-col gap-0.5 text-slate-700">
                              <div><strong>Name:</strong> {tkt.userName || user?.name || 'N/A'} ({tkt.userRole || user?.role})</div>
                              <div><strong>Email:</strong> {tkt.userEmail || user?.email || 'N/A'}</div>
                              {Boolean(tkt.userPhone || user?.phone) && (
                                <div><strong>Phone:</strong> {tkt.userPhone || user?.phone}</div>
                              )}
                              <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                                Notified support desk: furnicraft.erp@gmail.com
                              </div>
                            </div>
                          </div>

                          {/* Support Team Response Notes */}
                          {tkt.adminNotes ? (
                            <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-[11px] text-emerald-900">
                              <span className="font-bold block mb-0.5">Support Team Response:</span>
                              <p className="whitespace-pre-wrap">{tkt.adminNotes}</p>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              Status: {tkt.status === 'OPEN' ? 'Open — Awaiting review by FurniCraft support desk' : tkt.status}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer */}
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
                        <button
                          type="button"
                          onClick={() => toggleExpand(tkt._id)}
                          className="flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
