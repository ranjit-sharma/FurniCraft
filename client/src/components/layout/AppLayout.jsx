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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <OfflineBanner />
      <div className="flex flex-1 items-start">
        <Sidebar />
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 pb-24 lg:pb-8 overflow-x-clip">
          <div key={pathname} className="mx-auto max-w-7xl 2xl:max-w-[1536px] w-full animate-page-in">
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
