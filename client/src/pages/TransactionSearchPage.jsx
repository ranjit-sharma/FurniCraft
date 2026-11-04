import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { LoadError } from '../components/common/LoadError';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadPdf } from '../utils/download';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
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
  CreditCard,
  Utensils,
  Home,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const TransactionSearchPage = () => {
  const { user, isWorker, isThekedar, isOwner } = useAuth();
  const { t, language } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

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

  // Execute search via API or local filter
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      fetchRecentTransactions();
      return;
    }

    try {
      setSearching(true);
      const res = await api.get(`/finance/transactions/search/${encodeURIComponent(searchTerm.trim())}`);
      const results = res.data?.transactions || [];
      setTransactions(results);
      if (results.length > 0) {
        setSelectedTx(results[0]);
      } else {
        setSelectedTx(null);
      }
    } catch (err) {
      console.error('Search failed:', err);
      // Fallback to query parameter search
      try {
        const fallbackRes = await api.get(`/finance/transactions?search=${encodeURIComponent(searchTerm.trim())}`);
        const list = fallbackRes.data?.transactions || [];
        setTransactions(list);
        setSelectedTx(list[0] || null);
      } catch (e2) {
        setTransactions([]);
        setSelectedTx(null);
      }
    } finally {
      setSearching(false);
    }
  };

  // Filter list by category tab
  const filteredTransactions = useMemo(() => {
    if (selectedCategory === 'ALL') return transactions;
    return transactions.filter((tx) => tx.category === selectedCategory);
  }, [transactions, selectedCategory]);

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
        title={t('transactionSearch.pageTitle', 'Transactions')}
        subtitle={`${transactions.length} ${t('transactionSearch.recordsLower', 'records')} · ${t('transactionSearch.pageSub', 'find a payment or advance and download its bill')}`}
      />

      {/* Search + category filter */}
      <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) fetchRecentTransactions();
              }}
              placeholder={t('transactionSearch.searchPlaceholder', 'Transaction ID or UPI / receipt ref')}
              aria-label="Search transactions"
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <Button type="submit" loading={searching} icon={Search}>
            {t('transactionSearch.searchBtn', 'Search')}
          </Button>
        </form>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 touch-pan-x" role="tablist" aria-label="Category">
          {[
            { id: 'ALL', label: t('transactionSearch.allCategories', 'All') },
            { id: 'SALARY_PAYMENT', label: t('transactionSearch.wagePayments', 'Wage payments') },
            { id: 'ADVANCE_DISBURSEMENT', label: t('transactionSearch.advanceDisbursements', 'Advances') },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'border-amber-600 bg-amber-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Results List (Left) + Detail Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Matches List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {t('transactionSearch.matchingRecords') || 'Matching Records'} ({filteredTransactions.length})
            </h2>
            {searchTerm && (
              <span className="text-xs text-blue-600 font-semibold truncate max-w-[150px] sm:max-w-none">
                {(t('transactionSearch.searchingFor') || 'Searching for "{query}"').replace('{query}', searchTerm)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3" />
              <p className="text-xs font-semibold">{t('transactionSearch.loadingLedger') || 'Loading transactions ledger...'}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t('transactionSearch.noFound') || 'No Transactions Found'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {(t('transactionSearch.noFoundDesc') || 'No matching financial transaction found with ID "{query}".').replace('{query}', searchTerm)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('ALL');
                  fetchRecentTransactions();
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                {t('transactionSearch.resetFilters') || 'Reset Search Filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[238px] lg:max-h-[700px] overflow-y-auto pr-1">
              {filteredTransactions.map((tx) => {
                const isSelected = selectedTx?._id === tx._id;
                return (
                  <div
                    key={tx._id}
                    onClick={() => setSelectedTx(tx)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-400 tracking-wider">
                            {tx.transactionId}
                          </span>
                          <Badge variant={getCategoryBadgeVariant(tx.category)} size="sm">
                            {tx.category?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {tx.workerId ? (
                            <span>{t('transactionSearch.craftsman') || 'Craftsman:'} <strong className="text-slate-900 dark:text-white">{tx.workerId.name}</strong></span>
                          ) : (
                            <span>{t('transactionSearch.generalLedger') || 'Workshop General Ledger'}</span>
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
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                        {t('transactionSearch.viewVoucher') || 'View Voucher'} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Full Detailed Voucher & Statement Inspection */}
        <div className="lg:col-span-7">
          {selectedTx ? (
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
                    {selectedTx.workerId ? (
                      <div>
                        <div className="font-bold text-base text-slate-900 dark:text-white">{selectedTx.workerId.name}</div>
                        {selectedTx.workerId.phone && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Phone: {selectedTx.workerId.phone}</div>
                        )}
                        {selectedTx.workerId.email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{selectedTx.workerId.email}</div>
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
                    {selectedTx.thekedarId ? (
                      <div>
                        <div className="font-bold text-base text-slate-900 dark:text-white">{selectedTx.thekedarId.name}</div>
                        {selectedTx.thekedarId.phone && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Phone: {selectedTx.thekedarId.phone}</div>
                        )}
                        {selectedTx.thekedarId.email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{selectedTx.thekedarId.email}</div>
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
                {selectedTx.breakdown && selectedTx.breakdown.baseEarned > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900/60 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {t('transactionSearch.wagesDeductionsAudit') || 'Wages & Deductions Detailed Audit'}
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 block">{t('transactionSearch.grossEarned') || 'Gross Earned'}</span>
                        <strong className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{selectedTx.breakdown.baseEarned?.toLocaleString('en-IN')}
                        </strong>
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
