import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  PageSkeleton,
  ThekedarDashboardSkeleton,
  OwnerDashboardSkeleton,
  ProjectsPageSkeleton,
  ProjectDetailSkeleton,
  WorkersGridSkeleton,
  WorkerActivitySkeleton,
  ThekedarsSkeleton,
  ExpensesSkeleton,
  TransactionSearchSkeleton,
  AuditLogsSkeleton,
  MembersOverviewSkeleton,
} from '../components/common/Skeleton';

describe('Skeleton Loader System — FurniCraft ERP', () => {
  it('renders base Skeleton with status role and shimmering class', () => {
    const { container } = render(<Skeleton className="h-6 w-32" />);
    const el = screen.getByRole('status', { name: /Loading.../i });
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('skeleton-shimmer');
    expect(el.className).toContain('h-6');
    expect(el.className).toContain('w-32');
  });

  it('renders SkeletonText with requested number of lines', () => {
    render(<SkeletonText lines={4} />);
    const elements = screen.getAllByRole('status', { name: /Loading.../i });
    expect(elements.length).toBe(4);
  });

  it('renders SkeletonCircle with rounded-full', () => {
    render(<SkeletonCircle size="h-12 w-12" />);
    const el = screen.getByRole('status', { name: /Loading.../i });
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('h-12');
  });

  it('renders PageSkeleton fallback without errors', () => {
    const { container } = render(<PageSkeleton />);
    expect(container.querySelector('.skeleton-shimmer')).toBeTruthy();
  });

  it('renders ThekedarDashboardSkeleton correctly', () => {
    const { container } = render(<ThekedarDashboardSkeleton />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(10);
  });

  it('renders OwnerDashboardSkeleton correctly', () => {
    const { container } = render(<OwnerDashboardSkeleton />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(10);
  });

  it('renders ProjectsPageSkeleton correctly', () => {
    const { container } = render(<ProjectsPageSkeleton />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(10);
  });

  it('renders ProjectDetailSkeleton correctly', () => {
    const { container } = render(<ProjectDetailSkeleton />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(10);
  });

  it('renders WorkersGridSkeleton and WorkerActivitySkeleton correctly', () => {
    const { container: gridContainer } = render(<WorkersGridSkeleton />);
    expect(gridContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(10);

    const { container: actContainer } = render(<WorkerActivitySkeleton />);
    expect(actContainer.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);
  });

  it('renders ThekedarsSkeleton, ExpensesSkeleton, TransactionSearchSkeleton, AuditLogsSkeleton, MembersOverviewSkeleton correctly', () => {
    const { container: th } = render(<ThekedarsSkeleton />);
    expect(th.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);

    const { container: exp } = render(<ExpensesSkeleton />);
    expect(exp.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);

    const { container: tx } = render(<TransactionSearchSkeleton />);
    expect(tx.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);

    const { container: audit } = render(<AuditLogsSkeleton />);
    expect(audit.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);

    const { container: members } = render(<MembersOverviewSkeleton />);
    expect(members.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(5);
  });
});
