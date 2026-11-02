import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl transition-all z-10 max-h-[92vh] sm:max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 flex-1">{children}</div>
      </div>
    </div>
  );
};
