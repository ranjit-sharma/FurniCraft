import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/client';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { LoadError } from '../components/common/LoadError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadPdf } from '../utils/download';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { TransactionSearchSkeleton } from '../components/common/Skeleton';
import {
  Search,
  Receipt,
  FileText,
  User,
  Building,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Utensils,
  Home,
  AlertCircle,
  Clock,
  Calendar,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react';

export const TransactionSearchPage = () => {
  const { user, isWorker, isThekedar, isOwner } = useAuth();
  const { t, language } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'voucher'
  const voucherRef = useRef(null);

  // Handle popstate for native mobile back button navigation
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.view !== 'voucher') {
        setMobileView('list');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTx = (tx, navigateOnMobile = true) => {
    setSelectedTx(tx);
    if (navigateOnMobile) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        window.history.pushState({ view: 'voucher' }, '');
        setMobileView('voucher');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (voucherRef.current) {
        voucherRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleBackToList = () => {
    if (typeof window !== 'undefined' && window.history.state?.view === 'voucher') {
      window.history.back();
    } else {
      setMobileView('list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Fetch initial recent transactions
  const [loadError, setLoadError] = useState(null);

  const fetchRecentTransactions = async () => {
    try {
      setLoadError(null);
      setLoading(true);
      const res = await api.get('/finance/transactions');
      const list = res.data?.transactions || [];
      setTransactions(list);
      if (list.length > 0 && !selectedTx) {
        setSelectedTx(list[0]);
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();
  }, [user?._id]);

  // Filter list by category and date
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Category Filter
      if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) {
        return false;
      }

      // 2. Date Filter
      if (dateFilterMode === 'ALL' && !customDate) {
        return true;
      }

      const txDate = new Date(tx.transactionDate);
      const now = new Date();

      if (dateFilterMode === 'TODAY') {
        return (
          txDate.getFullYear() === now.getFullYear() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getDate() === now.getDate()
        );
      }

      if (dateFilterMode === 'THIS_MONTH') {
        return (
          txDate.getFullYear() === now.getFullYear() &&
          txDate.getMonth() === now.getMonth()
        );
      }

      if (dateFilterMode === 'CUSTOM' && customDate) {
        const [year, month, day] = customDate.split('-').map(Number);
        return (
          txDate.getFullYear() === year &&
          txDate.getMonth() === month - 1 &&
          txDate.getDate() === day
        );
      }

      return true;
    });
  }, [transactions, selectedCategory, dateFilterMode, customDate]);

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setDateFilterMode('ALL');
    setCustomDate('');
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'SALARY_PAYMENT':
        return t('transactionSearch.wagesShort', 'Earnings');
      case 'ADVANCE_DISBURSEMENT':
        return t('transactionSearch.advancesShort', 'Advances');
      default:
        return t('transactionSearch.allShort', 'All');
    }
  };

  const getDateLabel = () => {
    if (dateFilterMode === 'TODAY') return t('transactionSearch.todayShort', 'Today');
    if (dateFilterMode === 'THIS_MONTH') return t('transactionSearch.monthShort', 'This Month');
    if (dateFilterMode === 'CUSTOM' && customDate) {
      return new Date(customDate).toLocaleDateString();
    }
    return t('transactionSearch.allShort', 'All');
  };

  const getCategoryShortBadge = (cat) => {
    switch (cat) {
      case 'SALARY_PAYMENT':
        return t('transactionSearch.salaryShort', 'Salary');
      case 'ADVANCE_DISBURSEMENT':
        return t('transactionSearch.advanceShort', 'Advance');
      default:
        return cat?.replace(/_/g, ' ') || 'General';
    }
  };

  const isFilterActive = selectedCategory !== 'ALL' || dateFilterMode !== 'ALL' || !!customDate;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getCategoryBadgeVariant = (cat) => {
    switch (cat) {
      case 'SALARY_PAYMENT':
        return 'success';
      case 'ADVANCE_DISBURSEMENT':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <LoadError message={loadError} onRetry={fetchRecentTransactions} />
      <PageHeader
        title={t('transactionSearch.pageTitle', 'Transaction History')}
        subtitle={`${transactions.length} ${t('transactionSearch.recordsLower', 'records')} · ${t('transactionSearch.pageSub', 'find a payment or advance and download its bill')}`}
      />

      {/* Single Filter Toggler */}
      <div className={`${mobileView === 'voucher' ? 'hidden lg:block' : 'block'} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden`}>
        {/* Toggler Bar Button */}
        <button
          type="button"
          onClick={() => setFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 sm:p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Filter className="h-4 w-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('transactionSearch.filterTransactions') || 'Filter Transactions'}
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5 flex-wrap">
                <span>{getCategoryLabel(selectedCategory)}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-blue-600 dark:text-blue-400">{getDateLabel()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFilterActive && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetFilters();
                }}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {t('transactionSearch.resetFilters') || 'Reset'}
              </span>
            )}
            <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {/* Toggled Filter Options */}
        {filterOpen && (
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3">
            {/* Category selection */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                {t('transactionSearch.filterCategory', 'Category')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="tablist">
                {[
                  { id: 'ALL', label: t('transactionSearch.allShort', 'All') },
                  { id: 'SALARY_PAYMENT', label: t('transactionSearch.wagesShort', 'Earnings') },
                  { id: 'ADVANCE_DISBURSEMENT', label: t('transactionSearch.advancesShort', 'Advances') },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date selection */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                {t('transactionSearch.filterDate', 'Date')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode('ALL');
                    setCustomDate('');
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    dateFilterMode === 'ALL' && !customDate
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {t('transactionSearch.allShort', 'All')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode('TODAY');
                    setCustomDate('');
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    dateFilterMode === 'TODAY'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {t('transactionSearch.todayShort', 'Today')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode('THIS_MONTH');
                    setCustomDate('');
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    dateFilterMode === 'THIS_MONTH'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {t('transactionSearch.monthShort', 'This Month')}
                </button>

                {/* Custom Date Picker Pill */}
                <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  dateFilterMode === 'CUSTOM' && customDate
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}>
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilterMode(e.target.value ? 'CUSTOM' : 'ALL');
                    }}
                    aria-label="Filter by specific date"
                    className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer border-none p-0 w-28"
                  />
                  {customDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDate('');
                        setDateFilterMode('ALL');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      title="Clear date filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Results List (Left) + Detail Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Matches List */}
        <div className={`${mobileView === 'voucher' ? 'hidden lg:block' : 'block'} lg:col-span-5 space-y-3`}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
              {t('transactionSearch.matchingRecords', 'Matching Records')} ({filteredTransactions.length})
            </h2>
          </div>

          {loading ? (
            <TransactionSearchSkeleton />
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t('transactionSearch.noFound', 'No Transactions Found')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {t('transactionSearch.noFoundFiltered', 'No transactions found for the selected category and date filter.')}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
              >
                {t('transactionSearch.resetFilters', 'Reset Filters')}
              </button>
            </div>
          ) : (
            <>
              {/* Mobile View: Out of the cards (flat list with sleek dividers - only View Voucher is clickable) */}
              <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="py-3 px-1 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-400 tracking-wider">
                            {tx.transactionId}
                          </span>
                          <Badge variant={getCategoryBadgeVariant(tx.category)} size="sm">
                            {getCategoryShortBadge(tx.category)}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {(tx.workerId?.name || tx.workerName) ? (
                            <span>{t('transactionSearch.craftsman', 'Craftsman:')} <strong className="text-slate-900 dark:text-white">{tx.workerId?.name || tx.workerName}</strong>{tx.workerCode ? <span className="text-[11px] text-slate-500 ml-1">({tx.workerCode})</span> : null}</span>
                          ) : (
                            <span>{t('transactionSearch.generalLedger', 'Workshop General Ledger')}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{(tx.breakdown?.netPaid || tx.amount)?.toLocaleString('en-IN')}
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(tx.transactionDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-slate-400" />
                        {tx.paymentMethod} {tx.receiptReference ? `(${tx.receiptReference})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectTx(tx, true)}
                        className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 hover:underline active:scale-95 transition-transform cursor-pointer py-1 px-1.5 -mr-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <span>{t('transactionSearch.viewVoucher', 'View Voucher')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Keep it same as now (cards with hover & selected state - only View Voucher selects) */}
              <div className="hidden lg:block space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => {
                  const isSelected = selectedTx?._id === tx._id;
                  return (
                    <div
                      key={tx._id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-400 tracking-wider">
                              {tx.transactionId}
                            </span>
                            <Badge variant={getCategoryBadgeVariant(tx.category)} size="sm">
                              {getCategoryShortBadge(tx.category)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {(tx.workerId?.name || tx.workerName) ? (
                              <span>{t('transactionSearch.craftsman', 'Craftsman:')} <strong className="text-slate-900 dark:text-white">{tx.workerId?.name || tx.workerName}</strong>{tx.workerCode ? <span className="text-[11px] text-slate-500 ml-1">({tx.workerCode})</span> : null}</span>
                            ) : (
                              <span>{t('transactionSearch.generalLedger', 'Workshop General Ledger')}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            ₹{(tx.breakdown?.netPaid || tx.amount)?.toLocaleString('en-IN')}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(tx.transactionDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-slate-400" />
                          {tx.paymentMethod} {tx.receiptReference ? `(${tx.receiptReference})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectTx(tx, false)}
                          className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          {t('transactionSearch.viewVoucher', 'View Voucher')} <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Full Detailed Voucher & Statement Inspection */}
        <div
          ref={voucherRef}
          className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'} lg:col-span-7 scroll-mt-20`}
        >
          {selectedTx ? (
            <div className="space-y-3">
              {/* Mobile Back Navigation */}
              <div className="lg:hidden flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{t('transactionSearch.backToList') || 'Back to Transactions'}</span>
                </button>
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                  {selectedTx.transactionId}
                </span>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
              {/* Card Top Title Banner */}
              <div className="bg-slate-900 p-6 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t('transactionSearch.officialVoucher') || 'Official Transaction Voucher'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="font-mono text-lg md:text-xl font-black text-white">
                        {selectedTx.transactionId}
                      </h3>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedTx.transactionId)}
                        className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white transition-colors"
                        title="Copy Transaction ID"
                      >
                        {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadPdf(`/api/v1/finance/transactions/${selectedTx._id}/bill?lang=${language}`, `Bill_${selectedTx.transactionId || selectedTx._id}.pdf`)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-3.5 py-2 text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{t('dashboard.billPdf') || 'Download Bill PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Main Voucher Body Content */}
              <div className="p-6 md:p-8 space-y-6">
                {/* Total Payment Metric */}
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                      {t('transactionSearch.totalDisbursed') || 'Total Disbursed / Net Paid'}
                    </span>
                    <div className="text-3xl md:text-4xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
                      ₹{(selectedTx.breakdown?.netPaid || selectedTx.amount)?.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                      {t('transactionSearch.categoryLabel') || 'Category:'} {selectedTx.category?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-3 py-1 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> {t('transactionSearch.verifiedSettled') || 'Verified Settled'}
                    </span>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                      {t('transactionSearch.method') || 'Method:'} <strong className="text-slate-800 dark:text-slate-200">{selectedTx.paymentMethod}</strong>
                    </div>
                    {selectedTx.receiptReference && (
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {t('transactionSearch.utr') || 'UTR:'} <strong className="text-slate-900 dark:text-white">{selectedTx.receiptReference}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Worker & Thekedar Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Worker / Craftsman */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                      <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> {t('transactionSearch.recipientCraftsman') || 'Recipient Craftsman'}
                    </div>
                    {(selectedTx.workerId?.name || selectedTx.workerName) ? (
                      <div>
                        <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{selectedTx.workerId?.name || selectedTx.workerName}</span>
                          {(selectedTx.workerCode || (!selectedTx.workerId && selectedTx.workerName)) && (
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                              {selectedTx.workerCode || 'Archived'}
                            </span>
                          )}
                        </div>
                        {(selectedTx.workerId?.phone || selectedTx.workerPhone) && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Phone: {selectedTx.workerId?.phone || selectedTx.workerPhone}</div>
                        )}
                        {selectedTx.workerId?.email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{selectedTx.workerId.email}</div>
                        )}
                        {!selectedTx.workerId && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                            (Worker profile deleted from active workforce; ledger voucher preserved for audit)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic">{t('transactionSearch.noWorkerAssigned') || 'No specific worker assigned (General)'}</div>
                    )}
                  </div>

                  {/* Thekedar / Supervisor */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                      <Building className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> {t('transactionSearch.thekedarSupervisor') || 'Contractor / Thekedar'}
                    </div>
                    {(selectedTx.thekedarId?.name || selectedTx.thekedarName) ? (
                      <div>
                        <div className="font-bold text-base text-slate-900 dark:text-white">{selectedTx.thekedarId?.name || selectedTx.thekedarName}</div>
                        {(selectedTx.thekedarId?.phone || selectedTx.thekedarPhone) && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Phone: {selectedTx.thekedarId?.phone || selectedTx.thekedarPhone}</div>
                        )}
                        {(selectedTx.thekedarId?.email || selectedTx.thekedarBusinessName) && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{selectedTx.thekedarId?.email || selectedTx.thekedarBusinessName}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t('transactionSearch.recordedBySupervisor') || 'Recorded By Supervisor'}</div>
                    )}
                  </div>
                </div>

                {/* Project Context */}
                {selectedTx.projectId && (
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/30 p-4">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block mb-1">
                      {t('transactionSearch.associatedProject') || 'Associated Furniture Project'}
                    </span>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedTx.projectId.name}</h4>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {t('transactionSearch.projectCode') || 'Code:'} <strong className="font-mono text-slate-900 dark:text-white">{selectedTx.projectId.projectCode}</strong>
                          {selectedTx.projectId.clientName && ` • ${t('transactionSearch.client') || 'Client:'} ${selectedTx.projectId.clientName}`}
                        </div>
                      </div>
                      {selectedTx.projectId.location && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {selectedTx.projectId.location}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Salary & Deductions Breakdown (If Available) */}
                {selectedTx.breakdown && (selectedTx.breakdown.baseEarned > 0 || (selectedTx.breakdown.additionalWages || 0) > 0) && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {t('transactionSearch.wagesDeductionsAudit') || 'Earnings & Deductions Detailed Audit'}
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        {t('transactionSearch.bonusAllowance') || 'Bonus / Allowance'}: +₹{(selectedTx.breakdown.additionalWages || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 block">{t('transactionSearch.grossEarned') || 'Gross Earned'}</span>
                        <strong className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{selectedTx.breakdown.baseEarned?.toLocaleString('en-IN')}
                        </strong>
                        <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                          +₹{(selectedTx.breakdown.additionalWages || 0).toLocaleString('en-IN')} {t('transactionSearch.bonusAllowance') || 'Bonus / Allowance'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 border border-rose-100 dark:border-rose-900">
                        <span className="text-rose-700 dark:text-rose-400 block">{t('transactionSearch.advanceDeducted') || 'Advance Deducted'}</span>
                        <strong className="text-sm font-black text-rose-900 dark:text-rose-200">
                          -₹{selectedTx.breakdown.advanceDeduction?.toLocaleString('en-IN') || 0}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-3 border border-amber-100 dark:border-amber-900">
                        <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <Utensils className="h-3 w-3" /> {t('transactionSearch.foodDeduction') || 'Food Deduction'}
                        </span>
                        <strong className="text-sm font-black text-amber-950 dark:text-amber-200">
                          -₹{selectedTx.breakdown.foodDeduction?.toLocaleString('en-IN') || 0}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-3 border border-indigo-100 dark:border-indigo-900">
                        <span className="text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                          <Home className="h-3 w-3" /> {t('transactionSearch.roomRent') || 'Room Rent'}
                        </span>
                        <strong className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                          -₹{selectedTx.breakdown.roomRentDeduction?.toLocaleString('en-IN') || 0}
                        </strong>
                      </div>
                    </div>

                    {selectedTx.breakdown.remainingAdvance > 0 && (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
                        <span>{t('transactionSearch.carriedForwardAdvance') || 'Carried Forward Advance Balance:'}</span>
                        <strong className="font-black text-sm text-amber-950 dark:text-amber-200">
                          ₹{selectedTx.breakdown.remainingAdvance?.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    )}

                    {selectedTx.breakdown.remainingWages > 0 && (
                      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                        <span>{t('transactionSearch.remainingWages') || 'Remaining Unpaid Earnings in Account:'}</span>
                        <strong className="font-black text-sm text-blue-950 dark:text-blue-200">
                          ₹{selectedTx.breakdown.remainingWages?.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    )}

                    {(() => {
                      const remWages = selectedTx.breakdown.remainingWages || 0;
                      const remAdv = selectedTx.breakdown.remainingAdvance || 0;
                      const remBal = selectedTx.breakdown.remainingBalance !== undefined
                        ? selectedTx.breakdown.remainingBalance
                        : (remWages - remAdv);
                      if (remWages > 0 || remAdv > 0) {
                        return (
                          <div className={`rounded-xl p-3 text-xs flex items-center justify-between border ${
                            remBal < 0
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                          }`}>
                            <span className="font-bold">{t('transactionSearch.remainingBalance', 'Exact Remaining Balance in Account:')}</span>
                            <strong className="font-black text-sm">
                              {remBal < 0 ? `-₹${Math.abs(remBal).toLocaleString('en-IN')}` : `₹${remBal.toLocaleString('en-IN')}`}
                            </strong>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      const totalEarnedBefore = selectedTx.breakdown.totalEarnedBefore || 0;
                      const remWages = selectedTx.breakdown.remainingWages || 0;
                      const netPaid = selectedTx.amount || selectedTx.breakdown.netPaid || 0;
                      const food = selectedTx.breakdown.foodDeduction || 0;
                      const room = selectedTx.breakdown.roomRentDeduction || 0;
                      const advCut = selectedTx.breakdown.advanceDeduction || 0;
                      const bonus = selectedTx.breakdown.additionalWages || 0;
                      const netDeductions = (advCut + food + room) - bonus;
                      if (totalEarnedBefore > 0 && remWages > 0) {
                        return (
                          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between flex-wrap gap-1 border border-slate-200 dark:border-slate-700">
                            <span>
                              <strong>Total Accounted:</strong> ₹{netPaid.toLocaleString('en-IN')} (Cash)
                              {netDeductions !== 0 && <span> + ₹{netDeductions.toLocaleString('en-IN')} (Expenses)</span>}
                              <span> + ₹{remWages.toLocaleString('en-IN')} (Remaining)</span>
                            </span>
                            <strong className="text-emerald-700 dark:text-emerald-400 font-black">
                              = ₹{totalEarnedBefore.toLocaleString('en-IN')} ✓
                            </strong>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Transaction Metadata Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t('transactionSearch.timestamp') || 'Timestamp:'} {new Date(selectedTx.transactionDate).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    {selectedTx.recordedBy && (
                      <span>{t('transactionSearch.auditedBy') || 'Audited by:'} <strong className="text-slate-700 dark:text-slate-300">{selectedTx.recordedBy.name}</strong></span>
                    )}
                  </div>
                </div>

                {selectedTx.notes && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">{t('transactionSearch.voucherNotes') || 'Voucher Notes:'}</span>
                    <p>{selectedTx.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400 dark:text-slate-500">
              <Receipt className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">{t('transactionSearch.selectTransactionPrompt') || 'Select a Transaction to Inspect'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {t('transactionSearch.selectTransactionDesc') || 'Search via Transaction ID on the left, or click any transaction to view complete payment statements, deductions breakdown, and download official bill vouchers.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TransactionSearchPage;
