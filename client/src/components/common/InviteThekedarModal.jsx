import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  MessageCircle,
  HardHat,
  Info,
} from 'lucide-react';

export const InviteThekedarModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('invite.title', 'Invite & Refer Thekedar')} maxWidth="max-w-lg">
      <div className="space-y-4 p-1 sm:p-2">
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

        {/* Referral Link & Share Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {t('invite.exclusiveLink', 'Your Exclusive Referral Link')}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Registration Link
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
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

          {/* Prominent Quick Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t('invite.shareWhatsApp', 'Share via WhatsApp')}</span>
            </button>

            {/* More Options / Share Sheet */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span>{t('invite.moreOptions', 'More Options')}</span>
            </button>
          </div>
        </div>

        {/* Updated How Contractor Invitation Works Box */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5 text-xs">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>{t('invite.howItWorksTitle', 'How Contractor Invitation Works')}</span>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-[11px] sm:text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <li>
              <span className="font-medium">{t('invite.step1', 'Copy your referral link or share it directly with a fellow contractor via WhatsApp.')}</span>
            </li>
            <li>
              <span className="font-medium">{t('invite.step2', 'The contractor opens the link to register their profile with their mobile number and password.')}</span>
            </li>
            <li>
              <span className="font-medium">{t('invite.step3', 'Once registered, they can immediately log in to manage their furniture projects, workers, and daily attendance.')}</span>
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};
