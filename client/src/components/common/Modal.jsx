import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Bottom sheet on phones, centered dialog from `sm` up.
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Stop the page behind the sheet from scrolling.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" />

      <div
        className={`relative z-10 flex w-full ${maxWidth} max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl animate-sheet-up sm:animate-pop-in`}
      >
        {/* Grab handle (visual cue for the sheet) */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6 sm:py-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shrink-0 -mr-2"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
};
