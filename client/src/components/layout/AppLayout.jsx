import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { errorText } from '../../api/client';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
  </div>
);

// Phones drop signal often on job sites; say so instead of letting saves fail silently.
const OfflineBanner = () => {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] md:top-16 z-30 flex items-center justify-center gap-2 bg-slate-900 dark:bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white dark:text-slate-950 animate-fade-in">
      <WifiOff className="h-4 w-4 shrink-0" />
      {errorText('offlineBanner')}
    </div>
  );
};

export const AppLayout = () => {
  const { pathname } = useLocation();

  // New screen starts at the top, like a native app.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Copy each column header onto its cells so tables can stack as labelled cards on phones (index.css).
  useEffect(() => {
    const labelTables = () => {
      document.querySelectorAll('.overflow-x-auto > table').forEach((table) => {
        const heads = [...table.querySelectorAll(':scope > thead th')].map((th) => th.textContent.trim());
        table.querySelectorAll(':scope > tbody > tr').forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (heads[i] && !td.hasAttribute('colspan') && td.dataset.label !== heads[i]) td.dataset.label = heads[i];
          });
        });
      });
    };
    let timer = 0;
    const observer = new MutationObserver(() => {
      if (!timer) timer = setTimeout(() => { timer = 0; labelTables(); }, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    labelTables();
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <OfflineBanner />
      <div className="flex flex-1 items-start">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pb-8 overflow-x-clip">
          <div key={pathname} className="mx-auto max-w-7xl animate-page-in">
            <ErrorBoundary>
              {/* Keeps the header and tab bar on screen while a page chunk loads */}
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
