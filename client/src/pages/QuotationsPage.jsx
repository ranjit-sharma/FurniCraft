import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadError } from '../components/common/LoadError';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Edit,
  Eye,
  Calendar,
  User,
  Phone,
  MapPin,
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileDown,
} from 'lucide-react';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export const QuotationsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Navigation / View State: 'list' | 'form'
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  // List State
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Notification Banner
  const [banner, setBanner] = useState(null);

  // Auto-dismiss notification banner after 7 seconds
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => {
      setBanner(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [banner]);

  // Initial Thekedar Details & Date
  const [initialData, setInitialData] = useState({
    thekedar: {
      businessName: user?.businessName || user?.name || '',
      phone: user?.phone || '',
      thekedarCode: user?.thekedarCode || '',
    },
    currentDate: '',
    defaultTerms: [
      'All work will be done as per the agreed design, size, and details.',
      'Materials, colours, and fittings will be used as agreed with the customer.',
      'Any extra work or changes will cost extra.',
      'Extra charges will be discussed with the customer before starting the work.',
      'Payments must be made as agreed between the customer and the contractor.',
    ],
  });

  // Form State
  const defaultItem = () => ({
    particular: '',
    quantity: 1,
    unit: 'SQ FEET',
    rate: 0,
    total: 0,
  });

  const [formData, setFormData] = useState({
    quotationNumber: '',
    quotationDate: '',
    formattedDate: '',
    thekedar: {
      businessName: user?.businessName || user?.name || '',
      phone: user?.phone || '',
    },
    customer: {
      name: '',
      phone: '',
      address: '',
    },
    items: [defaultItem()],
    termsAndConditions: [],
    status: 'DRAFT',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pdfDownloadingId, setPdfDownloadingId] = useState(null);

  // Modals
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch initial profile & system date
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await api.get('/quotations/initial-data');
        const payload = res?.data?.thekedar ? res.data : (res?.data?.data || res?.data || res);
        if (payload?.thekedar || payload?.currentDate) {
          setInitialData(payload);
          setFormData((prev) => ({
            ...prev,
            formattedDate: payload.currentDate || prev.formattedDate,
            termsAndConditions: payload.defaultTerms || prev.termsAndConditions,
            thekedar: {
              businessName: payload.thekedar?.businessName || prev.thekedar.businessName,
              phone: payload.thekedar?.phone || prev.thekedar.phone,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to load quotation initial data', err);
      }
    };
    fetchInitial();
  }, []);

  // Fetch quotations list
  const fetchQuotations = async (page = 1) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/quotations', {
        params: {
          page,
          limit: pagination.limit,
          sortBy: 'createdAt',
          sortOrder,
        },
      });
      const payload = res?.data?.quotations ? res.data : (res?.data?.data || res?.data || res);
      if (payload) {
        setQuotations(payload.quotations || []);
        if (payload.pagination) {
          setPagination(payload.pagination);
        }
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load quotations list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations(pagination.page);
  }, [pagination.page, sortOrder]);

  // Recalculate Live Totals
  const liveTotals = useMemo(() => {
    const items = formData.items || [];
    let sum = 0;
    const calculated = items.map((item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      const t = Math.round((q * r + Number.EPSILON) * 100) / 100;
      sum += t;
      return { ...item, total: t };
    });
    return {
      items: calculated,
      grandTotal: Math.round(sum * 100) / 100,
    };
  }, [formData.items]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setFormData({
      quotationNumber: '',
      quotationDate: '',
      formattedDate: initialData.currentDate || '',
      thekedar: {
        businessName: initialData.thekedar.businessName || user?.businessName || user?.name || '',
        phone: initialData.thekedar.phone || user?.phone || '',
      },
      customer: {
        name: '',
        phone: '',
        address: '',
      },
      items: [defaultItem()],
      termsAndConditions: initialData.defaultTerms || [],
      status: 'DRAFT',
    });
    setView('form');
  };

  // Open Edit Form
  const handleOpenEdit = async (qtn) => {
    setEditingId(qtn._id);
    setFormErrors({});
    setFormData({
      quotationNumber: qtn.quotationNumber,
      quotationDate: qtn.quotationDate,
      formattedDate: qtn.formattedDate,
      thekedar: {
        businessName: qtn.thekedar?.businessName || user?.businessName || user?.name || '',
        phone: qtn.thekedar?.phone || user?.phone || '',
      },
      customer: {
        name: qtn.customer?.name || '',
        phone: qtn.customer?.phone || '',
        address: qtn.customer?.address || '',
      },
      items:
        qtn.items && qtn.items.length > 0
          ? qtn.items.map((i) => ({
              particular: i.particular,
              quantity: i.quantity,
              unit: i.unit,
              rate: i.rate,
              total: i.total,
            }))
          : [defaultItem()],
      termsAndConditions: qtn.termsAndConditions || initialData.defaultTerms,
      status: qtn.status || 'DRAFT',
    });
    setView('form');
  };

  // Preview Quotation from History Card
  const handlePreviewQuotation = (qtn) => {
    if (!qtn) return;
    setPreviewData({
      _id: qtn._id,
      quotationNumber: qtn.quotationNumber,
      formattedDate: qtn.formattedDate,
      thekedar: qtn.thekedar || initialData.thekedar,
      thekedarCode: qtn.thekedarCode || initialData.thekedar?.thekedarCode || 'TK001',
      customer: qtn.customer,
      items: qtn.items || [],
      grandTotal: qtn.grandTotal || 0,
      termsAndConditions: qtn.termsAndConditions || initialData.defaultTerms,
    });
    setPreviewModalOpen(true);
  };

  // Download PDF
  const handleDownloadPdf = async (qtn) => {
    if (!qtn) return;
    const qtnId = qtn._id || qtn.id;
    if (!qtnId) return;

    setPdfDownloadingId(qtnId);
    try {
      const res = await api.get(`/quotations/${qtnId}/pdf`, { responseType: 'blob' });
      const blob =
        res instanceof Blob
          ? res
          : res?.data instanceof Blob
          ? res.data
          : new Blob([res?.data || res], { type: 'application/pdf' });

      // If server returned a JSON error wrapped in a blob
      if (blob.type === 'application/json' || (blob.size < 400 && blob.type !== 'application/pdf')) {
        const text = await blob.text();
        try {
          const jsonErr = JSON.parse(text);
          throw new Error(jsonErr.message || 'Failed to download PDF document');
        } catch (e) {
          if (e.message !== 'Failed to download PDF document') throw e;
        }
      }

      const fileName = `${qtn.quotationNumber || 'FurniCraft-Quotation'}.pdf`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }, 500);

      setBanner({
        type: 'success',
        text: `Quotation PDF downloaded successfully (${fileName}).`,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      setBanner({
        type: 'error',
        text: err.message || 'Failed to download PDF document',
      });
    } finally {
      setPdfDownloadingId(null);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingQuotation) return;
    setDeleting(true);
    try {
      await api.delete(`/quotations/${deletingQuotation._id}`);
      setDeleteModalOpen(false);
      setPreviewModalOpen(false);
      setDeletingQuotation(null);
      setBanner({
        type: 'success',
        text: `Quotation ${deletingQuotation.quotationNumber} deleted successfully.`,
      });
      fetchQuotations(pagination.page);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.message || 'Failed to delete quotation',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Item management in form
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, defaultItem()],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Validate form client-side
  const validateForm = () => {
    const errs = {};
    if (!formData.customer.name.trim()) {
      errs.customerName = 'Customer name is required';
    }
    if (!formData.items || formData.items.length === 0) {
      errs.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, idx) => {
        if (!item.particular || !item.particular.trim()) {
          errs[`item_${idx}_particular`] = `Item #${idx + 1} description is required`;
        }
        const q = parseFloat(item.quantity);
        if (isNaN(q) || q <= 0) {
          errs[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than zero`;
        }
        const r = parseFloat(item.rate);
        if (isNaN(r) || r < 0) {
          errs[`item_${idx}_rate`] = `Item #${idx + 1} rate must be zero or positive`;
        }
      });
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Quotation Form (Submit)
  const handleSubmit = async (andDownload = false) => {
    if (!validateForm()) return;
    setSubmitting(true);
    setBanner(null);

    const payload = {
      thekedar: formData.thekedar,
      customer: formData.customer,
      items: formData.items.map((it) => ({
        particular: it.particular.trim(),
        quantity: parseFloat(it.quantity) || 1,
        unit: it.unit,
        rate: parseFloat(it.rate) || 0,
      })),
      termsAndConditions: formData.termsAndConditions,
      status: formData.status,
    };

    try {
      let savedQuotation = null;
      if (editingId) {
        const res = await api.put(`/quotations/${editingId}`, payload);
        savedQuotation = res?.data?.data?.quotation || res?.data?.quotation || res?.quotation;
        setBanner({
          type: 'success',
          text: `Quotation ${savedQuotation?.quotationNumber || ''} updated successfully.`,
        });
      } else {
        const res = await api.post('/quotations', payload);
        savedQuotation = res?.data?.data?.quotation || res?.data?.quotation || res?.quotation;
        setBanner({
          type: 'success',
          text: `Quotation ${savedQuotation?.quotationNumber || ''} created successfully!`,
        });
      }

      if (andDownload && savedQuotation) {
        await handleDownloadPdf(savedQuotation);
      }

      setView('list');
      fetchQuotations(1);
    } catch (err) {
      console.error('Save quotation error:', err);
      setBanner({
        type: 'error',
        text: err.message || 'Failed to save quotation',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = () => {
    if (!validateForm()) return;
    setPreviewData({
      _id: editingId || null,
      quotationNumber: formData.quotationNumber || 'FC-PREVIEW-0001',
      formattedDate: formData.formattedDate || initialData.currentDate,
      thekedar: formData.thekedar,
      thekedarCode: initialData.thekedar.thekedarCode || 'TK001',
      customer: formData.customer,
      items: liveTotals.items,
      grandTotal: liveTotals.grandTotal,
      termsAndConditions: formData.termsAndConditions,
      status: formData.status,
    });
    setPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
            <span>Thekedar Dashboard</span>
            <span>/</span>
            <span>Profile</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100">Quotations</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {view === 'form'
              ? editingId
                ? 'Edit Furniture Quotation'
                : 'Create New Quotation'
              : 'Quotations Management'}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {view === 'form'
              ? 'Fill in customer details and items. Prices calculate automatically.'
              : 'Create, review, print, and manage professional client quotations.'}
          </p>
        </div>

        {view === 'list' ? (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 w-full sm:w-auto justify-center shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Quotation</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setView('list')}
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to History</span>
          </Button>
        )}
      </div>

      {/* Global Notification Banner */}
      {banner && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-xl text-sm font-medium border ${
            banner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'error' ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW: QUOTATIONS LIST / HISTORY */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* List Content */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : loadError ? (
            <LoadError message={loadError} onRetry={() => fetchQuotations(pagination.page)} />
          ) : quotations.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
                No quotations found
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You have not created any quotations yet. Create your first quotation to send to customers.
              </p>
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                className="mt-5 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Quotation</span>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {quotations.map((qtn) => (
                <Card
                  key={qtn._id}
                  onClick={() => handlePreviewQuotation(qtn)}
                  className="p-4 sm:p-5 transition hover:border-amber-400 dark:hover:border-amber-600/50 shadow-sm cursor-pointer hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                          {qtn.quotationNumber}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>{qtn.formattedDate}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{qtn.customer?.name}</span>
                          {qtn.customer?.phone && (
                            <span className="text-slate-400 font-normal">
                              ({qtn.customer.phone})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">
                        <span>Items: {qtn.items?.length || 0}</span>
                      </div>
                    </div>

                    {/* Right: Grand Total & Actions */}
                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Grand Total
                        </span>
                        <span className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                          {inr(qtn.grandTotal)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {/* Download PDF */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPdf(qtn);
                          }}
                          disabled={pdfDownloadingId === qtn._id}
                          className="border-amber-400/80 dark:border-amber-600/70 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs flex items-center gap-1.5 px-2.5 py-1.5 font-semibold"
                          title="Download PDF Document"
                        >
                          <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(qtn);
                          }}
                          className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1.5 px-2.5 py-1.5 font-medium"
                          title="Edit Quotation"
                        >
                          <Edit className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs text-slate-500">
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
                    total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                      }
                      className="text-xs px-3 py-1.5"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: p.page + 1 }))
                      }
                      className="text-xs px-3 py-1.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CREATE / EDIT FORM */}
      {view === 'form' && (
        <div className="space-y-6">
          {/* SECTION A: THEKEDAR INFORMATION (Auto-loaded) */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    A. Thekedar Information
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Auto-loaded from your verified profile. Displayed first on the PDF.
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Code: {initialData.thekedar.thekedarCode || user?.thekedarCode || 'Auto'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  value={formData.thekedar.businessName}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      thekedar: { ...p.thekedar, businessName: e.target.value },
                    }))
                  }
                  placeholder="e.g. Sharma Interiors & Woodcraft"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.thekedar.phone}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      thekedar: { ...p.thekedar, phone: e.target.value },
                    }))
                  }
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </Card>

          {/* SECTION B: CUSTOMER INFORMATION */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  B. Customer Information
                </h2>
                <p className="text-[11px] text-slate-400">
                  Enter client details. Customer name is required.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={formData.customer.name}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      customer: { ...p.customer, name: e.target.value },
                    }))
                  }
                  placeholder="e.g. Rajesh Gupta"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none ${
                    formErrors.customerName
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:border-amber-500'
                  }`}
                />
                {formErrors.customerName && (
                  <span className="text-[11px] font-semibold text-rose-500 mt-1 block">
                    {formErrors.customerName}
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.customer.phone}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      customer: { ...p.customer, phone: e.target.value },
                    }))
                  }
                  placeholder="e.g. 9812345678"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Site Address (Optional)
                </label>
                <input
                  type="text"
                  value={formData.customer.address}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      customer: { ...p.customer, address: e.target.value },
                    }))
                  }
                  placeholder="e.g. Flat 402, Green Heights, Andheri West, Mumbai"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </Card>

          {/* SECTION C: DYNAMIC QUOTATION ITEMS */}
          <Card className="p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                C. Quotation Items
              </h2>
              <p className="text-[11px] text-slate-400">
                Add items with quantity, unit (SQ FEET or PCS), and rate.
              </p>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const itemTotal =
                  Math.round(
                    ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) +
                      Number.EPSILON) *
                      100
                  ) / 100;

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        Item #{index + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Particular / Description */}
                      <div className="md:col-span-5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Particular / Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.particular}
                          onChange={(e) =>
                            handleItemChange(index, 'particular', e.target.value)
                          }
                          placeholder="e.g. Kitchen Tandem Drawer Box"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                        {formErrors[`item_${index}_particular`] && (
                          <span className="text-[10px] text-rose-500 mt-0.5 block">
                            {formErrors[`item_${index}_particular`]}
                          </span>
                        )}
                      </div>

                      {/* Quantity & Unit in a SINGLE ROW */}
                      <div className="md:col-span-4 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                            Qty <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 text-right"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="SQ FEET">SQF</option>
                            <option value="PCS">PCS</option>
                          </select>
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Rate (₹) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 text-right"
                        />
                      </div>

                      {/* Item Total */}
                      <div className="md:col-span-1 flex flex-col justify-center text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Total
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                          {inr(itemTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Item Button placed below items and above Grand Total on the right */}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                className="text-xs flex items-center gap-1.5 py-2 px-3.5 border-amber-400 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold shadow-xs"
              >
                <Plus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Add Item</span>
              </Button>
            </div>

            {/* SECTION E: GRAND TOTAL DISPLAY (ONLY ONE FINANCIAL ROW) */}
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                  GRAND TOTAL
                </span>
                <span className="text-[11px] text-amber-700/80 dark:text-amber-400">
                  {formData.items.length} item{formData.items.length > 1 ? 's' : ''} calculated
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {inr(liveTotals.grandTotal)}
              </span>
            </div>
          </Card>

          {/* SECTION F: TERMS & CONDITIONS */}
          <Card className="p-5 space-y-3">
            <h2 className="text-sm font-bold text-amber-800 dark:text-amber-400">
              Terms & Conditions
            </h2>
            <ol className="space-y-1.5 list-decimal list-inside text-xs text-slate-600 dark:text-slate-300">
              {formData.termsAndConditions.map((term, i) => (
                <li key={i} className="leading-relaxed">
                  {term}
                </li>
              ))}
            </ol>
          </Card>

          {/* FORM ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setView('list')}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenPreview}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center gap-1.5 justify-center"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Quotation</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center gap-1.5 justify-center text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
            >
              <FileDown className="h-4 w-4" />
              <span>Save & Download PDF</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center gap-1.5 justify-center"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{editingId ? 'Update Quotation' : 'Save Quotation'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* MODAL: LIVE QUOTATION PREVIEW */}
      {previewModalOpen && previewData && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title="Quotation Preview"
          maxWidth="max-w-2xl"
        >
          <div className="p-1 sm:p-4 bg-white dark:bg-slate-900 space-y-4 max-w-2xl mx-auto text-slate-900 dark:text-slate-100">
            {/* Header matching exact PDF design */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Logo + Company Name */}
                <div className="flex items-center gap-3">
                  <img
                    src="/furnicraft-logo.png"
                    alt="FurniCraft Logo"
                    className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-lg shrink-0 shadow-xs"
                  />
                  <div>
                    <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight block">
                      FurniCraft
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium block">
                      Furniture workforce & site management
                    </span>
                  </div>
                </div>

                {/* Right: Quotation Title & Meta */}
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-slate-100 uppercase block">
                    QUOTATION
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400 block">
                    {previewData.quotationNumber}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block">
                    Date: {previewData.formattedDate}
                  </span>
                </div>
              </div>

              {/* Orange Rule Bar matching PDF */}
              <div className="h-1 bg-amber-600 rounded-full w-full" />
            </div>

            {/* 2 Info Cards: Thekedar and Customer strictly in a single row */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* 1. Thekedar */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-amber-600 uppercase block mb-1">
                    THEKEDAR
                  </span>
                  <span className="font-bold block truncate text-slate-900 dark:text-slate-100">
                    {previewData.thekedar?.businessName || user?.businessName || user?.name || 'Contractor'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    {previewData.thekedar?.phone ? `Phone: ${previewData.thekedar.phone}` : 'Site Contractor'}
                  </span>
                </div>
                {previewData.thekedarCode && (
                  <span className="text-[10px] text-slate-400 block font-mono mt-1 truncate">
                    Code: {previewData.thekedarCode}
                  </span>
                )}
              </div>

              {/* 2. Customer */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-amber-600 uppercase block mb-1">
                    CUSTOMER
                  </span>
                  <span className="font-bold block truncate text-slate-900 dark:text-slate-100">
                    {previewData.customer?.name}
                  </span>
                  {previewData.customer?.phone && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      Phone: {previewData.customer.phone}
                    </span>
                  )}
                </div>
                {previewData.customer?.address && (
                  <span className="text-[10px] text-slate-400 block truncate mt-1">
                    {previewData.customer.address}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table matching PDF design (open layout, no clipping box) */}
            <div className="w-full">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2 px-1 text-center w-[6%]">#</th>
                    <th className="py-2 px-1.5 text-left w-[30%]">PARTICULAR</th>
                    <th className="py-2 px-1 text-right w-[14%]">QTY</th>
                    <th className="py-2 px-1 text-center w-[14%]">UNIT</th>
                    <th className="py-2 px-1 text-right w-[16%]">RATE</th>
                    <th className="py-2 px-1.5 text-right w-[20%]">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewData.items.map((it, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}
                    >
                      <td className="py-2 px-1 text-center text-slate-400 font-mono text-[9px] sm:text-[10px] align-top">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-1.5 font-medium text-slate-900 dark:text-slate-100 text-[10px] sm:text-[11px] break-words whitespace-normal leading-snug align-top">
                        {it.particular}
                      </td>
                      <td className="py-2 px-1 text-right text-slate-700 dark:text-slate-300 font-mono text-[9px] sm:text-[10px] whitespace-nowrap align-top">
                        {Number(it.quantity).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-1 text-center whitespace-nowrap align-top">
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          {it.unit === 'SQ FEET' || it.unit === 'SQF' ? 'SQF' : it.unit}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right text-slate-700 dark:text-slate-300 font-mono text-[9px] sm:text-[10px] whitespace-nowrap align-top">
                        {inr(it.rate)}
                      </td>
                      <td className="py-2 px-1.5 text-right font-bold text-slate-900 dark:text-slate-100 font-mono text-[10px] sm:text-[11px] whitespace-nowrap align-top">
                        {inr(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total */}
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                GRAND TOTAL
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {inr(previewData.grandTotal)}
              </span>
            </div>

            {/* Terms & Conditions & Digital Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs items-stretch">
              <div className="sm:col-span-7">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                  Terms & Conditions
                </span>
                <ol className="space-y-1 list-decimal list-inside text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {previewData.termsAndConditions.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ol>
              </div>

              {/* Thekedar Signature (Right side, aligned with lower line of Terms & Conditions) */}
              <div className="sm:col-span-5 flex flex-col justify-end text-center sm:text-right space-y-0.5 h-full self-end">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {previewData.thekedar?.businessName || user?.businessName || user?.name || 'Contractor'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                  Date: {previewData.formattedDate}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Authorized Digital Signature
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                  No physical signature required.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* Bottom Left: Delete button in required style */}
              <div>
                {previewData._id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingQuotation(previewData);
                      setDeleteModalOpen(true);
                    }}
                    className="border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1.5 px-2.5 py-1.5 font-medium"
                    title="Delete Quotation"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    <span>Delete</span>
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              {/* Bottom Right: Actions */}
              <div className="flex items-center gap-2">
                {previewData._id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(previewData)}
                    disabled={pdfDownloadingId === previewData._id}
                    className="border-amber-400/80 dark:border-amber-600/70 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs flex items-center gap-1.5 px-2.5 py-1.5 font-semibold"
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-xs px-3 py-1.5"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteModalOpen && deletingQuotation && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Quotation"
        >
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete quotation{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {deletingQuotation.quotationNumber}
              </strong>{' '}
              for customer{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {deletingQuotation.customer?.name}
              </strong>
              ?
            </p>
            <p className="text-xs text-slate-400">
              This action cannot be undone. Its quotation number will be retired and will not be
              reused.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Quotation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
