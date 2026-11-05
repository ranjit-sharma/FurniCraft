import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Bottom sheet on phones, centered dialog from `sm` up.
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Stop the page behind the sheet from scrolling.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Always reset scroll to the very top so top details/banner are fully visible
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* Alignment container: bottom sheet on phone, vertically centered modal on sm+ with margin auto protection */}
      <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-4 sm:py-6">
        <div
          className={`relative z-10 flex w-full ${maxWidth} max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl animate-sheet-up sm:animate-pop-in text-left my-auto`}
        >
          {/* Grab handle (visual cue for mobile sheet) */}
          <div className="flex justify-center pt-2.5 sm:hidden shrink-0" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>

          {/* Dialog Header — ALWAYS pinned at the top with shrink-0 */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 z-10">
            <div className="min-w-0 flex-1 pr-2">
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h3>
              ) : (
                title
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Dialog Body — Scrollable with min-h-0 so overflow-y-auto is strictly contained */}
          <div
            ref={contentRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3.5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' && document.body ? createPortal(modalNode, document.body) : modalNode;
};
