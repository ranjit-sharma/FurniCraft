import React from 'react';

/**
 * Base Skeleton Block with shimmering gradient
 */
export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`skeleton-shimmer rounded-lg select-none pointer-events-none ${className}`}
      {...props}
    />
  );
};

/**
 * Skeleton Circle for avatars, icon placeholders, status indicators
 */
export const SkeletonCircle = ({ size = 'h-10 w-10', className = '', ...props }) => {
  return <Skeleton className={`rounded-full shrink-0 ${size} ${className}`} {...props} />;
};

/**
 * Skeleton Text with staggered line lengths
 */
export const SkeletonText = ({ lines = 3, className = '' }) => {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-1/2'];
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} className={`h-3.5 ${widths[idx % widths.length]}`} />
      ))}
    </div>
  );
};

/**
 * Generic Card container skeleton
 */
export const SkeletonCard = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm ${className}`}
      {...props}
    >
      {children || (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-1/2" />
          <SkeletonText lines={2} />
        </div>
      )}
    </div>
  );
};

/**
 * Single Stat Tile Skeleton
 */
export const SkeletonStatCard = ({ className = '' }) => {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <SkeletonCircle size="h-6 w-6" />
      </div>
      <div className="mt-2 space-y-1">
        <Skeleton className="h-6 sm:h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

/**
 * Grid of Stat Cards
 */
export const SkeletonStatGrid = ({ count = 4, className = 'grid-cols-2 sm:grid-cols-4' }) => {
  return (
    <div className={`grid gap-3 sm:gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
};

/**
 * Table Skeleton with header and pulsing rows
 */
export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${className}`}>
      {/* Table Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SkeletonCircle size="h-8 w-8" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              {Array.from({ length: Math.max(1, cols - 2) }).map((_, c) => (
                <Skeleton key={c} className="h-3.5 w-16 sm:w-20" />
              ))}
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Page Header Skeleton
 */
export const SkeletonHeader = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 sm:w-64" />
        <Skeleton className="h-4 w-60 sm:w-80" />
      </div>
      <Skeleton className="h-9 w-32 rounded-xl" />
    </div>
  );
};

/**
 * Generic Full Page Skeleton (used for Suspense & PageLoader)
 */
export const PageSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonHeader />
      <SkeletonStatGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard className="h-72" />
          <SkeletonTable rows={4} cols={4} />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    </div>
  );
};

/**
 * Thekedar Dashboard Skeleton
 */
export const ThekedarDashboardSkeleton = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl border border-amber-900/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 bg-amber-800/30 dark:bg-amber-700/30" />
            <Skeleton className="h-3.5 w-32 bg-amber-800/20 dark:bg-amber-700/20" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl bg-amber-800/30" />
        </div>
        <div className="mt-3 pt-3 border-t border-amber-800/30 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16 bg-amber-800/20" />
              <Skeleton className="h-5 w-20 bg-amber-800/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Date Navigation Bar Skeleton */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <SkeletonCircle size="h-8 w-8" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-20 rounded-xl" />
          <Skeleton className="h-12 w-24 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
        <SkeletonCircle size="h-8 w-8" />
      </div>

      {/* Worker Attendance Cards List Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size="h-10 w-10" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            {/* Shift code buttons skeleton */}
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {Array.from({ length: 7 }).map((_, b) => (
                <Skeleton key={b} className="h-9 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Owner Dashboard Skeleton
 */
export const OwnerDashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>

      {/* 8 Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard className="h-80" />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="h-44" />
          <SkeletonCard className="h-60" />
        </div>
      </div>
    </div>
  );
};

/**
 * Projects Page Skeleton
 */
export const ProjectsPageSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            {/* Progress bar skeleton */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Project Detail Skeleton
 */
export const ProjectDetailSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-28" />

      {/* Project Banner Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <SkeletonStatGrid count={4} />

      {/* Money Received Ledger */}
      <SkeletonTable rows={4} cols={4} />
    </div>
  );
};

/**
 * Workers Page Grid Skeleton
 */
export const WorkersGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 animate-fade-in">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonCircle size="h-11 w-11" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <div className="rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Worker Activity Modal / Sheet Skeleton
 */
export const WorkerActivitySkeleton = () => {
  return (
    <div className="space-y-4 py-2 animate-fade-in">
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="h-12 w-12" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <SkeletonTable rows={4} cols={3} />
    </div>
  );
};

/**
 * Thekedars Page Skeleton
 */
export const ThekedarsSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonStatGrid count={4} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size="h-11 w-11" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {Array.from({ length: 3 }).map((_, s) => (
                <div key={s} className="space-y-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Expenses Page Skeleton
 */
export const ExpensesSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Big Green Inflow Card */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 p-5 text-white shadow-lg space-y-3">
        <Skeleton className="h-3.5 w-32 bg-emerald-700/40" />
        <Skeleton className="h-8 w-44 bg-emerald-700/50" />
        <Skeleton className="h-3 w-40 bg-emerald-700/30" />
      </div>

      {/* Receipts Table */}
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
};

/**
 * Transaction Search Page Skeleton
 */
export const TransactionSearchSkeleton = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-7">
          <SkeletonCard className="h-96" />
        </div>
      </div>
    </div>
  );
};

/**
 * Audit Logs Page Skeleton
 */
export const AuditLogsSkeleton = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
};

/**
 * Members Overview Page Skeleton
 */
export const MembersOverviewSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonStatGrid count={3} />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-xl" />
        ))}
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
};
