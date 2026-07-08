import React from 'react';

interface LoadingSkeletonProps {
  /** Type of skeleton layout */
  type?: 'card' | 'table' | 'list' | 'stats' | 'text';
  /** Number of skeleton items to render */
  count?: number;
  className?: string;
}

function SkeletonCard() {
  return (
    <div className="skeleton skeleton-card rounded-2xl" />
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="skeleton skeleton-text mb-0 h-4 w-1/3" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="skeleton skeleton-text mb-0 h-4 flex-1" />
            <div className="skeleton skeleton-text mb-0 h-4 w-24" />
            <div className="skeleton skeleton-text mb-0 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <div className="skeleton skeleton-heading mb-1 h-4" />
            <div className="skeleton skeleton-text mb-0 h-3 w-2/3" />
          </div>
          <div className="skeleton skeleton-text mb-0 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-${Math.min(count, 4)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card rounded-2xl" style={{ height: '8rem' }} />
      ))}
    </div>
  );
}

function SkeletonText() {
  return (
    <div>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text w-3/4" />
      <div className="skeleton skeleton-text w-1/2" />
    </div>
  );
}

export default function LoadingSkeleton({
  type = 'card',
  count,
  className = '',
}: LoadingSkeletonProps) {
  const wrapperClass = `animate-fade-in ${className}`;

  switch (type) {
    case 'card':
      return (
        <div className={wrapperClass}>
          <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-${Math.min(count || 3, 4)}`}>
            {Array.from({ length: count || 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    case 'table':
      return (
        <div className={wrapperClass}>
          <SkeletonTable rows={count || 5} />
        </div>
      );
    case 'list':
      return (
        <div className={wrapperClass}>
          <SkeletonList items={count || 5} />
        </div>
      );
    case 'stats':
      return (
        <div className={wrapperClass}>
          <SkeletonStats count={count || 4} />
        </div>
      );
    case 'text':
      return (
        <div className={wrapperClass}>
          <SkeletonText />
        </div>
      );
    default:
      return <SkeletonCard />;
  }
}
