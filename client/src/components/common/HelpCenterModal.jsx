import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const HelpCenterModal = ({ isOpen, onClose, initialTab }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const isOwner = user?.role === 'OWNER';

  // Tabs: 'all' (Owner only) | 'new' | 'history'
  const [activeTab, setActiveTab] = useState(() => (isOwner ? 'all' : 'new'));

  // Form states
  const [category, setCategory] = useState('GENERAL_INQUIRY');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Tickets lists
  const [myTickets, setMyTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // Owner filter & search states
  const [ownerSearch, setOwnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

  // Owner ticket editing/updating state
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [ticketStatusDraft, setTicketStatusDraft] = useState({});
  const [ticketNotesDraft, setTicketNotesDraft] = useState({});
  const [updateFeedback, setUpdateFeedback] = useState({});

  // Reset tab when modal opens or initialTab is provided
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (isOwner) {
        setActiveTab('all');
      } else {
        setActiveTab('new');
      }
    }
  }, [isOpen, initialTab, isOwner]);

  // Fetch tickets whenever modal is open or tab changes
  useEffect(() => {
    if (isOpen) {
      if (isOwner && (activeTab === 'all' || activeTab === 'history')) {
        fetchAllTickets();
      }
      fetchMyTickets();
    }
  }, [isOpen, activeTab, isOwner]);

  const fetchMyTickets = async () => {
    try {
      const res = await api.get('/support/tickets/my');
      const tickets = res?.tickets || res?.data?.tickets || [];
      setMyTickets(tickets);
    } catch {
      // Non-blocking
    }
  };

  const fetchAllTickets = async () => {
    if (!isOwner) return;
    setLoadingTickets(true);
    try {
      const res = await api.get('/support/tickets');
      const tickets = res?.tickets || res?.data?.tickets || [];
      setAllTickets(tickets);
    } catch {
      // Non-blocking
    } finally {
      setLoadingTickets(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedTicketId((prev) => (prev === id ? null : id));
  };

  const handleResetForm = () => {
    setCategory('GENERAL_INQUIRY');
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
      // User email and phone are automatically fetched from logged in user data by default
      const res = await api.post('/support/tickets', {
        category,
        subject: subject.trim(),
        message: message.trim(),
        contactEmail: (user?.email || '').trim(),
        contactPhone: (user?.phone || '').trim(),
      });

      const ticket = res?.ticket || res?.data?.ticket;
      if (ticket) {
        setSubmittedTicket(ticket);
        // Refresh ticket lists immediately
        fetchMyTickets();
        if (isOwner) fetchAllTickets();
      }
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || t('common.error', 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Owner updating ticket status & admin response notes
  const handleOwnerUpdateTicket = async (ticketId) => {
    const newStatus = ticketStatusDraft[ticketId];
    const newNotes = ticketNotesDraft[ticketId];

    if (!newStatus && newNotes === undefined) {
      return;
    }

    setUpdatingTicketId(ticketId);
    setUpdateFeedback((prev) => ({ ...prev, [ticketId]: null }));

    try {
      const res = await api.patch(`/support/tickets/${ticketId}`, {
        status: newStatus,
        adminNotes: newNotes,
      });

      const updatedTicket = res?.ticket || res?.data?.ticket;

      if (updatedTicket) {
        // Update local tickets list
        setAllTickets((prev) =>
          prev.map((t) => (t._id === ticketId ? { ...t, ...updatedTicket } : t))
        );
        setMyTickets((prev) =>
          prev.map((t) => (t._id === ticketId ? { ...t, ...updatedTicket } : t))
        );

        setUpdateFeedback((prev) => ({
          ...prev,
          [ticketId]: { type: 'success', text: 'Ticket updated & requester notified!' },
        }));
        setTimeout(() => {
          setUpdateFeedback((prev) => ({ ...prev, [ticketId]: null }));
        }, 3500);
      }
    } catch (err) {
      setUpdateFeedback((prev) => ({
        ...prev,
        [ticketId]: {
          type: 'error',
          text: err?.message || 'Failed to update ticket. Please try again.',
        },
      }));
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const categories = [
    {
      id: 'GENERAL_INQUIRY',
      label: t('help.catGeneral', 'General Inquiry'),
      icon: HelpCircle,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
    },
    {
      id: 'ATTENDANCE_WAGES',
      label: t('help.catAttendance', 'Attendance & Earnings'),
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
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getCategoryLabel = (catId) => {
    const match = categories.find((c) => c.id === catId);
    if (match) return match.label;
    switch (catId) {
      case 'GENERAL_INQUIRY': return t('help.catGeneral', 'General Inquiry');
      case 'ATTENDANCE_WAGES': return t('help.catAttendance', 'Attendance & Earnings');
      case 'PAYMENT_BILL': return t('help.catPayment', 'Payment & Advance');
      case 'PROJECT_SITE': return t('help.catProject', 'Project & Site');
      case 'TOOL_EQUIPMENT': return t('help.catTool', 'Tools & Machinery');
      case 'ACCOUNT_LOGIN': return t('help.catAccount', 'Account & Access');
      default: return catId ? catId.replace(/_/g, ' ') : 'General';
    }
  };

  // Filtered tickets for Owner
  const filteredOwnerTickets = useMemo(() => {
    return allTickets.filter((tkt) => {
      // Filter by status
      if (statusFilter !== 'ALL' && tkt.status !== statusFilter) {
        return false;
      }
      // Filter by search query
      if (ownerSearch.trim()) {
        const q = ownerSearch.toLowerCase();
        const matchNum = tkt.ticketNumber?.toLowerCase().includes(q);
        const matchName = tkt.userName?.toLowerCase().includes(q);
        const matchRole = tkt.userRole?.toLowerCase().includes(q);
        const matchSub = tkt.subject?.toLowerCase().includes(q);
        const matchMsg = tkt.message?.toLowerCase().includes(q);
        const matchPhone = tkt.userPhone?.toLowerCase().includes(q);
        return matchNum || matchName || matchRole || matchSub || matchMsg || matchPhone;
      }
      return true;
    });
  }, [allTickets, statusFilter, ownerSearch]);

  const openTicketsCount = useMemo(() => {
    return allTickets.filter((t) => t.status === 'OPEN').length;
  }, [allTickets]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleResetForm();
        onClose();
      }}
      title={
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                {isOwner ? t('help.thekedarRequests', 'Thekedar Requests') : t('help.title', 'Help & Support Center')}
              </h3>
              {isOwner && openTicketsCount > 0 && (
                <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider animate-pulse">
                  {openTicketsCount} Open
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
              {isOwner
                ? t('help.ownerSubtitle', 'Review, manage, and resolve Thekedar support requests')
                : t('help.subtitle', 'Submit a query, report an issue, or track help requests')}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-3.5">
        {/* Navigation Tabs (Only for Thekedars/Workers, removed from Owner side) */}
        {!isOwner && (
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 flex-wrap">
            {/* Tab: Submit Request */}
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{t('help.newTicket', 'Submit Request')}</span>
            </button>

            {/* Tab: My Tickets */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{t('help.myTickets', 'My Tickets')}</span>
              {myTickets.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-black">
                  {myTickets.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1 (OWNER ONLY): ALL THEKEDAR REQUESTS                                 */}
        {/* ========================================================================= */}
        {isOwner && (
          <div className="space-y-3">
            {/* Owner Filter & Search Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder="Search Thekedar, ticket #, or issue..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] no-scrollbar py-0.5">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                      statusFilter === st
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={fetchAllTickets}
                  title="Refresh tickets"
                  disabled={loadingTickets}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* List of Thekedar Tickets */}
            {loadingTickets ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mb-2" />
                <span>Loading Thekedar requests...</span>
              </div>
            ) : filteredOwnerTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {ownerSearch || statusFilter !== 'ALL'
                    ? 'No requests match your current search/filter.'
                    : 'No support requests from Thekedars yet.'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  When Thekedars submit requests via Help Center, they will be listed here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOwnerTickets.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt._id;
                  const currentDraftStatus = ticketStatusDraft[tkt._id] || tkt.status;
                  const currentDraftNotes =
                    ticketNotesDraft[tkt._id] !== undefined
                      ? ticketNotesDraft[tkt._id]
                      : tkt.adminNotes || '';
                  const isUpdating = updatingTicketId === tkt._id;
                  const feedback = updateFeedback[tkt._id];

                  return (
                    <div
                      key={tkt._id}
                      className={`rounded-2xl border p-4 text-xs transition shadow-2xs ${
                        tkt.status === 'OPEN'
                          ? 'border-amber-300/80 bg-amber-50/20 dark:border-amber-800/80 dark:bg-amber-950/20'
                          : 'border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      {/* Ticket Header & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            {tkt.ticketNumber}
                          </span>
                          <span className="rounded-md border bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                            {getCategoryLabel(tkt.category)}
                          </span>
                        </div>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${getStatusBadge(tkt.status)}`}>
                          {tkt.status}
                        </span>
                      </div>

                      {/* Requester Identity Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-2.5 border border-slate-200/60 dark:border-slate-700/60 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs">
                            {tkt.userName ? tkt.userName.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                              {tkt.userName || 'Thekedar'}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              {tkt.userRole || 'THEKEDAR'}
                            </span>
                          </div>
                        </div>

                        {/* Direct Contacts */}
                        <div className="flex items-center gap-2 text-[11px] flex-wrap">
                          {tkt.userPhone && (
                            <a
                              href={`tel:${tkt.userPhone}`}
                              className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:text-amber-700 transition"
                              title="Call Thekedar"
                            >
                              <Phone className="h-3 w-3 text-emerald-600" />
                              <span className="font-semibold">{tkt.userPhone}</span>
                            </a>
                          )}
                          {tkt.userEmail && (
                            <a
                              href={`mailto:${tkt.userEmail}`}
                              className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:text-amber-700 transition"
                              title="Email Thekedar"
                            >
                              <Mail className="h-3 w-3 text-blue-600" />
                              <span className="truncate max-w-[150px]">{tkt.userEmail}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1 leading-snug">
                        {tkt.subject}
                      </h5>

                      {/* Message Body */}
                      <p className={`text-slate-600 dark:text-slate-300 leading-relaxed text-xs ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                        {tkt.message}
                      </p>

                      {/* Expandable Details & Owner Resolution Controls */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                          {/* Submission timestamp & notification status */}
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1 leading-snug">
                            <span>
                              Submitted on:{' '}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {new Date(tkt.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </strong>
                            </span>
                            <span className="text-amber-700 dark:text-amber-400 font-semibold break-all">
                              Routed to: furnicraft.erp@gmail.com
                            </span>
                          </div>

                          {/* Owner Interactive Status & Response Editor */}
                          <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:border-amber-800/80 dark:from-slate-800/90 dark:to-slate-800/60 p-3 sm:p-3.5 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                                Owner Resolution & Response
                              </span>
                              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                  Status:
                                </label>
                                <select
                                  value={currentDraftStatus}
                                  onChange={(e) =>
                                    setTicketStatusDraft((prev) => ({
                                      ...prev,
                                      [tkt._id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 sm:flex-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                                >
                                  <option value="OPEN">OPEN</option>
                                  <option value="IN_PROGRESS">IN PROGRESS</option>
                                  <option value="RESOLVED">RESOLVED</option>
                                  <option value="CLOSED">CLOSED</option>
                                </select>
                              </div>
                            </div>

                            {/* Response / Notes textarea */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Resolution Notes / Reply to Thekedar:
                              </label>
                              <textarea
                                rows={2}
                                value={currentDraftNotes}
                                onChange={(e) =>
                                  setTicketNotesDraft((prev) => ({
                                    ...prev,
                                    [tkt._id]: e.target.value,
                                  }))
                                }
                                placeholder="Type response note for the contractor (e.g. Approved earnings adjustment; payment transferred via UPI ref #1234)..."
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none shadow-2xs"
                              />
                            </div>

                            {/* Feedback message */}
                            {feedback && (
                              <div
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                                  feedback.type === 'success'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {feedback.text}
                              </div>
                            )}

                            {/* Save Button */}
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleOwnerUpdateTicket(tkt._id)}
                                className="w-full sm:w-auto justify-center flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 disabled:opacity-60 cursor-pointer transition"
                              >
                                {isUpdating ? (
                                  <>
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Save Resolution</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card Footer Toggler */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-400">
                        <span>
                          {new Date(tkt.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(tkt._id)}
                          className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Full Details & Resolve'}</span>
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

        {/* ========================================================================= */}
        {/* TAB 2: SUBMIT NEW REQUEST FORM (THEKEDAR ONLY, HIDDEN FOR OWNER)          */}
        {/* ========================================================================= */}
        {!isOwner && activeTab === 'new' && (
          <div>
            {submittedTicket ? (
              <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-amber-50/40 dark:from-emerald-950/40 dark:to-slate-900 p-6 text-center animate-page-in shadow-xs">
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
                  <h4 className="text-base font-black text-emerald-950 dark:text-emerald-200">
                    {t('help.successTitle', 'Request Submitted Successfully!')}
                  </h4>
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                </div>
                <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300 max-w-md mx-auto">
                  {t(
                    'help.successDesc',
                    'Your inquiry has been registered in the system. The management will review and resolve it promptly.'
                  )}
                </p>

                {/* Animated Ticket ID Voucher Card */}
                <div className="mt-4 rounded-2xl border-2 border-emerald-400/80 bg-white dark:bg-slate-900 p-4 shadow-sm relative overflow-hidden transition-all duration-300 animate-pop-in">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 animate-pulse" />

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <LifeBuoy className="h-3.5 w-3.5 text-amber-600" />
                      {t('help.ticketId', 'Ticket Number')}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      Generated & Dispatched
                    </span>
                  </div>

                  {/* Prominent Ticket ID with Animated Copy Action */}
                  <div className="flex items-center justify-center gap-2 py-1.5">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-wider select-all">
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
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      {getCategoryLabel(submittedTicket.category)}
                    </span>
                    <span className="font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      furnicraft.erp@gmail.com
                    </span>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{t('help.submitAnother', 'Submit Another')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(isOwner ? 'all' : 'history')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 cursor-pointer transition transform hover:scale-[1.02]"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{isOwner ? 'View All Requests' : t('help.viewTickets', 'View My Tickets')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 font-bold shadow-2xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('help.subject', 'Subject / Summary')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('help.subjectPlaceholder', 'e.g. Attendance shift mismatch or payment query')}
                    maxLength={150}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                  />
                  <div className="mt-1 text-right text-[10px] text-slate-400">
                    {message.length} / 2000
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      handleResetForm();
                      onClose();
                    }}
                    disabled={submitting}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-60 cursor-pointer transition transform hover:scale-[1.01]"
                  >
                    {submitting ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>{t('help.submitting', 'Submitting...')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>{t('help.submit', 'Submit Request')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY SUBMITTED TICKETS (THEKEDAR ONLY, HIDDEN FOR OWNER)             */}
        {/* ========================================================================= */}
        {!isOwner && activeTab === 'history' && (
          <div className="space-y-2.5">
            {myTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('help.noTickets', 'No support tickets found.')}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
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
              <div className="space-y-2.5">
                {myTickets.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt._id;
                  const categoryLabel = getCategoryLabel(tkt.category);

                  return (
                    <div
                      key={tkt._id}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs transition shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            {tkt.ticketNumber}
                          </span>
                          <span className="rounded-md border bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
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
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 leading-snug">
                        {tkt.subject}
                      </h5>

                      {/* Message / Query Description */}
                      <p className={`text-slate-600 dark:text-slate-300 leading-relaxed text-xs ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                        {tkt.message}
                      </p>

                      {/* Owner / Management Response Banner (Always prominent when answered) */}
                      {tkt.adminNotes ? (
                        <div className="mt-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 animate-fade-in">
                          <span className="font-bold flex items-center gap-1 mb-1 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Management / Owner Response:
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">{tkt.adminNotes}</p>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[10px] text-slate-400 italic">
                          Status: {tkt.status === 'OPEN' ? 'Awaiting review by FurniCraft support desk' : tkt.status}
                        </div>
                      )}

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-fade-in text-[11px]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Submitted At
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {new Date(tkt.createdAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Support Notification
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium break-all">
                                furnicraft.erp@gmail.com
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-400">
                        <span>
                          {new Date(tkt.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(tkt._id)}
                          className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 cursor-pointer"
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

// Simple inline Inbox icon fallback
function InboxIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
