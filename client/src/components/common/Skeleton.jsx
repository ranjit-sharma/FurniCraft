import React from 'react';
import { Card } from './Card';

/**
 * High-Performance Base Shimmering Skeleton Block
 * Hardware-accelerated on GPU compositor thread (0% CPU, 0 layout shifts)
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
    <Card className={className} {...props}>
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
    </Card>
  );
};

/**
 * Single Stat Tile Skeleton
 */
export const SkeletonStatCard = ({ className = '' }) => {
  return (
    <div className={`flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded-md" />
        <Skeleton className="h-3 w-3 rounded-full sm:hidden" />
      </div>
      <div className="mt-1.5 sm:mt-2 space-y-1">
        <Skeleton className="h-5 sm:h-7 w-16 sm:w-24" />
        <Skeleton className="h-3 sm:h-3.5 w-20" />
        <Skeleton className="h-2.5 sm:h-3 w-14" />
      </div>
    </div>
  );
};

/**
 * Grid of Stat Cards
 */
export const SkeletonStatGrid = ({ count = 3, className = 'grid-cols-3 gap-2 sm:gap-4' }) => {
  return (
    <div className={`grid ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
};

/**
 * Generic Page Header Skeleton
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/60">
              <div className="flex items-center gap-3 flex-1">
                <SkeletonCircle size="h-9 w-9" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ========================================================================== */
/* 1. THEKEDAR DASHBOARD SKELETON (Exact 1:1 match with Application Boxes)     */
/* ========================================================================== */

export const ThekedarDashboardSkeleton = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Greeting + Money Owed Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 p-4 sm:p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 sm:h-7 w-44 bg-white/20" />
            <Skeleton className="h-3.5 w-36 bg-white/15" />
          </div>
          <Skeleton className="h-8 sm:h-9 w-28 rounded-xl bg-white/20" />
        </div>

        {/* Inner Net Payable Box */}
        <div className="mt-4 rounded-2xl bg-white/10 p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-36 bg-white/20" />
            <Skeleton className="h-4 w-4 rounded-full bg-white/20" />
          </div>
          <Skeleton className="h-8 sm:h-9 w-32 bg-white/25" />
          <div className="mt-3 grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-24 bg-white/20" />
              <Skeleton className="h-5 w-20 bg-white/25" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-28 bg-white/20" />
              <Skeleton className="h-5 w-20 bg-white/25" />
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 flex items-center gap-2">
            <Skeleton className="h-3 w-48 bg-white/15" />
          </div>
        </div>
      </div>

      {/* 2. Today's Attendance Card (Using real Card component for 0 CLS) */}
      <Card
        title={<Skeleton className="h-5 w-44" />}
        subtitle={<Skeleton className="h-3.5 w-56 mt-0.5" />}
        action={
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 select-none">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <div className="flex items-center gap-3 sm:gap-6 px-1">
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-2.5 w-7" />
                <Skeleton className="h-5 w-6" />
                <Skeleton className="h-2.5 w-7" />
              </div>
              <div className="flex flex-col items-center gap-1 scale-105">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-7 w-8" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex flex-col items-center gap-1 opacity-50">
                <Skeleton className="h-2.5 w-7" />
                <Skeleton className="h-5 w-6" />
                <Skeleton className="h-2.5 w-7" />
              </div>
            </div>
            <Skeleton className="h-7 w-7 rounded-lg" />
            <SkeletonCircle size="h-7 w-7" />
          </div>
        }
      >
        {/* Worker Attendance Rows List */}
        <ul className="-mx-1 divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="px-1 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <SkeletonCircle size="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20 font-mono" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>

              {/* Exact 7 Shift code buttons row */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: 7 }).map((_, b) => (
                  <div
                    key={b}
                    className="min-h-[42px] px-0.5 sm:px-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs"
                  >
                    <Skeleton className="h-3 w-4 rounded-xs" />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

/* ========================================================================== */
/* 2. OWNER DASHBOARD SKELETON (Exact 1:1 match with Application Boxes)        */
/* ========================================================================== */

export const OwnerDashboardSkeleton = () => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Header + Database status banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4 sm:p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-md bg-purple-500/20" />
            <Skeleton className="h-7 w-48 bg-white/20" />
            <Skeleton className="h-3 w-32 bg-white/15" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full bg-white/20 self-start sm:self-auto" />
        </div>

        {/* Inner Net Payable Box */}
        <div className="mt-4 rounded-2xl bg-white/10 p-3.5 sm:p-4 border border-white/10 space-y-2">
          <Skeleton className="h-3 w-36 bg-white/20" />
          <Skeleton className="h-8 w-32 bg-white/25" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm pt-1">
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-24 bg-white/20" />
              <Skeleton className="h-5 w-20 bg-white/25" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-28 bg-white/20" />
              <Skeleton className="h-5 w-20 bg-white/25" />
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2.5 flex items-center gap-2">
            <Skeleton className="h-3 w-48 bg-white/15" />
          </div>
        </div>
      </div>

      {/* 2. Exact 3 Stat Tiles Grid (Thekedars, Workers, Projects) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 3. By Thekedar Card */}
      <Card
        title={<Skeleton className="h-5 w-36" />}
        subtitle={<Skeleton className="h-3 w-56 mt-0.5" />}
        action={<Skeleton className="h-4 w-20" />}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SkeletonCircle size="h-10 w-10" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ========================================================================== */
/* 3. WORKERS GRID SKELETON (Exact 1:1 match with Real Worker Card)            */
/* ========================================================================== */

export const WorkerCardSkeleton = () => {
  return (
    <Card className="flex flex-col gap-3">
      {/* Top line: workerCode (left) + trade badge (right) */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 font-mono" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>

      {/* Middle row: Avatar box + Name + Shift Rate + Phone + Chevron */}
      <div className="mt-1 flex items-center gap-3">
        {/* Square rounded avatar box (h-10 w-10 rounded-xl) */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/60 dark:bg-amber-950/40">
          <Skeleton className="h-5 w-5 rounded-md" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full shrink-0" />
      </div>

      {/* Inner Box 1: "Worked This Month" (bg-amber-50/80 px-2.5 py-2 rounded-lg border border-amber-200) */}
      <div className="mt-1 flex justify-between items-center text-[11px] bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-2 rounded-lg border border-amber-200/70 dark:border-amber-800/60">
        <Skeleton className="h-3 w-28 bg-amber-200/50 dark:bg-amber-900/40" />
        <Skeleton className="h-3.5 w-20 bg-amber-200/60 dark:bg-amber-900/50" />
      </div>

      {/* Inner Box 2: "REMAINING BALANCE" (bg-slate-50 p-2.5 rounded-xl border border-slate-200) */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-2.5 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
        <div className="space-y-1">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-3 w-20 ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </Card>
  );
};

export const WorkersGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 animate-fade-in">
      {Array.from({ length: 8 }).map((_, i) => (
        <WorkerCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Worker Details & Activity Sheet Skeleton
 */
export const WorkerActivitySkeleton = () => {
  return (
    <div className="space-y-4 py-2 animate-fade-in">
      {/* Worker Header Card */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 flex items-center justify-center">
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>

      {/* Month picker / tabs row */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl ml-auto" />
      </div>

      {/* Attendance Calendar Grid / Transactions ledger rows */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-20 font-mono" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ========================================================================== */
/* 4. PROJECTS SKELETON (Only the Project Cards Grid, matching real boxes)     */
/* ========================================================================== */

export const ProjectCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2.5"
        >
          {/* Top row: projectCode + priority badge */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-20 font-mono" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          {/* Project Name & Client */}
          <Skeleton className="h-5 w-3/4 mt-1.5" />
          <Skeleton className="h-3 w-1/2" />
          {/* Status badge + money received amount */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for ProjectsPage
export const ProjectsPageSkeleton = ProjectCardsSkeleton;

/* ========================================================================== */
/* 5. PROJECT DETAIL SKELETON (Exact 1:1 match with Project Detail Cards)      */
/* ========================================================================== */

export const ProjectDetailSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-28" />

      {/* Project Banner Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-4 w-24 font-mono" />
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
            <Skeleton className="h-7 w-3/5 mt-2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* 2-box summary strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800 space-y-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-100 dark:border-slate-800 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      </div>

      {/* Client Specs Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Receipts Ledger Card */}
      <Card
        title={<Skeleton className="h-5 w-32" />}
        subtitle={<Skeleton className="h-3 w-56 mt-0.5" />}
        action={<Skeleton className="h-6 w-20 rounded-md" />}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24 font-mono" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ========================================================================== */
/* 6. EXPENSES / INCOME LEDGER SKELETON (Only the Table Rows inside Card)      */
/* ========================================================================== */

export const ExpensesTableSkeleton = () => {
  return (
    <div className="overflow-x-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
      {/* Shimmering Table Rows matching Expenses columns */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-24 font-mono" />
            <div className="space-y-1 flex-1 min-w-0 hidden sm:block">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Skeleton className="h-4 w-16 hidden md:block" />
            <Skeleton className="h-4 w-20 hidden md:block" />
            <Skeleton className="h-5 w-20 font-bold" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for ExpensesPage
export const ExpensesSkeleton = ExpensesTableSkeleton;

/* ========================================================================== */
/* 7. THEKEDARS TABLE SKELETON (Only the Contractor Rows inside Card)          */
/* ========================================================================== */

export const ThekedarsTableSkeleton = () => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <SkeletonCircle size="h-11 w-11" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24 hidden sm:block" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for ThekedarsPage
export const ThekedarsSkeleton = ThekedarsTableSkeleton;

/* ========================================================================== */
/* 8. MEMBERS TABLE SKELETON (Only the Table Rows inside Directory Card)       */
/* ========================================================================== */

export const MembersTableSkeleton = () => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonCircle size="h-9 w-9" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for MembersOverviewPage
export const MembersOverviewSkeleton = MembersTableSkeleton;

/* ========================================================================== */
/* 9. TRANSACTION LIST SKELETON (Only the Matching Records list)               */
/* ========================================================================== */

export const TransactionListSkeleton = () => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="py-3 px-1 flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-28 font-mono" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="text-right space-y-1 shrink-0">
            <Skeleton className="h-4 w-16 ml-auto font-bold" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for TransactionSearchPage
export const TransactionSearchSkeleton = TransactionListSkeleton;

/* ========================================================================== */
/* 10. AUDIT LOGS ROWS SKELETON (Only the Rows inside Audit Events Card)       */
/* ========================================================================== */

export const AuditLogsRowsSkeleton = () => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SkeletonCircle size="h-8 w-8" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
};

// Backwards-compatible alias for AuditLogsPage
export const AuditLogsSkeleton = AuditLogsRowsSkeleton;
