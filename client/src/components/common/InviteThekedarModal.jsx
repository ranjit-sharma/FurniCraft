import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api/client';
import {
  UserPlus,
  Sparkles,
  Copy,
  Check,
  Share2,
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle2,
  HardHat,
  Info,
} from 'lucide-react';

export const InviteThekedarModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Generate the unique referral link
  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const refParam = encodeURIComponent(user?.name || user?.phone || 'furnicraft');
    return `${origin}/register-thekedar?ref=${refParam}`;
  }, [user]);

  // Pre-formatted message for sharing
  const shareMessage = useMemo(() => {
    const inviterTitle = user?.role === 'OWNER' ? 'Executive Business Owner' : 'Furniture Contractor (Thekedar)';
    const sender = user?.name || 'FurniCraft';
    return `Namaste! ${sender} (${inviterTitle}) has invited you to join FurniCraft ERP as an official Furniture Contractor (Thekedar).\n\nManage furniture sites, craftsman attendance, dehadi wages, and advance ledgers seamlessly.\n\nRegister your contractor account here:\n${inviteUrl}`;
  }, [user, inviteUrl]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = inviteUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmailClient = () => {
    const subject = encodeURIComponent(`Invitation to join FurniCraft ERP as a Contractor`);
    const body = encodeURIComponent(shareMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSms = () => {
    const body = encodeURIComponent(shareMessage);
    window.location.href = `sms:?body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FurniCraft ERP as a Contractor',
          text: shareMessage,
          url: inviteUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDirectWhatsAppToPhone = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const recipient = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const personalText = customMessage.trim() ? `\n\n"${customMessage.trim()}"\n\n` : '\n\n';
    const msg = `Namaste ${name.trim() || 'Contractor'}!\n${user?.name || 'I'} am inviting you to join FurniCraft ERP as a Furniture Thekedar.${personalText}Register your account here:\n${inviteUrl}`;
    const waUrl = `https://api.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendEmailInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide either a mobile number or an email address.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.post('/auth/invite-thekedar', {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        customMessage: customMessage.trim() || undefined,
      });

      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'Contractor invitation sent successfully!',
      });
      setName('');
      setPhone('');
      setEmail('');
      setCustomMessage('');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to send invitation',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('invite.title', 'Invite & Refer Thekedar')} maxWidth="max-w-xl">
      <div className="space-y-5 p-1 sm:p-2">
        {/* Intro Banner */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/20 p-4 text-xs text-amber-950 dark:text-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-600/10 dark:bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{t('invite.title', 'Invite & Refer Thekedar')}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                  <Sparkles className="h-3 w-3" /> Exclusive Link
                </span>
              </h4>
              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'invite.subtitle',
                  'Invite fellow furniture contractors to register on FurniCraft ERP and manage their projects and workforce.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Status Message Feedback */}
        {statusMessage && (
          <div
            className={`rounded-xl border p-3.5 text-xs flex items-center gap-2.5 animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="font-semibold">{statusMessage.text}</div>
          </div>
        )}

        {/* Referral Link Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {t('invite.exclusiveLink', 'Your Exclusive Referral Link')}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Contractor Registration Link
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
              {inviteUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>{t('invite.copied', 'Link Copied!')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{t('invite.copyLink', 'Copy Invite Link')}</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Share Buttons */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Share link directly via:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              {/* Email Client */}
              <button
                type="button"
                onClick={handleShareEmailClient}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Email Client</span>
              </button>

              {/* SMS */}
              <button
                type="button"
                onClick={handleShareSms}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>SMS</span>
              </button>

              {/* Native Mobile Share Sheet */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>More...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Direct Invite Form */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
            <UserPlus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('invite.directInviteTitle', 'Send Official Direct Invite')}</span>
          </h4>

          <form onSubmit={handleSendEmailInvite} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('invite.contractorName', 'Contractor Full Name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('invite.contractorNamePlaceholder', 'e.g. Ramesh Sharma')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('invite.mobileNumber', 'Mobile Number')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('invite.mobilePlaceholder', '10-digit mobile number')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('invite.emailAddress', 'Email Address (Optional)')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('invite.emailPlaceholder', 'contractor@example.com')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('invite.personalNote', 'Personal Note (Optional)')}
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={t(
                  'invite.personalNotePlaceholder',
                  'Hey! Join FurniCraft ERP to manage site projects, workers, and daily attendance.'
                )}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              {phone.trim().length >= 10 && (
                <button
                  type="button"
                  onClick={handleDirectWhatsAppToPhone}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Send via WhatsApp</span>
                </button>
              )}

              <button
                type="submit"
                disabled={submitting || (!email.trim() && !phone.trim())}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-5 py-2.5 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {submitting
                    ? t('invite.sending', 'Sending...')
                    : email.trim()
                    ? t('invite.sendEmailInvite', 'Send Official Email Invite')
                    : 'Generate Contractor Invite'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* How it Works Information Accordion */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('invite.howItWorksTitle', 'How Contractor Invitation Works')}</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>{t('invite.step1', 'Share your referral link with any furniture contractor or supervisor.')}</li>
            <li>
              {t('invite.step2', 'They register their profile with name, phone, and password at the invite link.')}
            </li>
            <li>
              {t(
                'invite.step3',
                'They immediately access FurniCraft ERP to manage projects, craftsman workforce, attendance, and advances.'
              )}
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};
