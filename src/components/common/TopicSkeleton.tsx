import React from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface TopicSkeletonProps {
  mode?: 'card' | 'detail' | 'tree';
  count?: number;
  className?: string;
}

export function TopicSkeleton({
  mode = 'card',
  count = 4,
  className = '',
}: TopicSkeletonProps) {
  if (mode === 'detail') {
    return (
      <div className={`p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse ${className}`}>
        {/* Breadcrumb & Navigation skeleton */}
        <div className="flex items-center justify-between gap-4">
          <LoadingSkeleton variant="text" width="220px" height="18px" />
          <LoadingSkeleton variant="rect" width="100px" height="32px" />
        </div>

        {/* Header Hero Banner */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="rect" width="120px" height="24px" />
            <LoadingSkeleton variant="rect" width="80px" height="24px" />
          </div>
          <LoadingSkeleton variant="text" width="60%" height="28px" />
          <LoadingSkeleton variant="text" count={2} />
          
          {/* Progress bar */}
          <div className="pt-2">
            <LoadingSkeleton variant="rect" width="100%" height="8px" />
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
          <LoadingSkeleton variant="rect" width="90px" height="32px" />
          <LoadingSkeleton variant="rect" width="90px" height="32px" />
          <LoadingSkeleton variant="rect" width="90px" height="32px" />
          <LoadingSkeleton variant="rect" width="90px" height="32px" />
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4">
          <LoadingSkeleton variant="text" width="40%" height="20px" />
          <LoadingSkeleton variant="text" count={6} />
          <LoadingSkeleton variant="rect" width="100%" height="160px" />
          <LoadingSkeleton variant="text" count={4} />
        </div>
      </div>
    );
  }

  if (mode === 'tree') {
    return (
      <div className={`space-y-3 p-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 animate-pulse"
          >
            <LoadingSkeleton variant="circle" width="20px" height="20px" />
            <div className="flex-1 space-y-1.5">
              <LoadingSkeleton variant="text" width="45%" height="16px" />
              <LoadingSkeleton variant="text" width="25%" height="12px" />
            </div>
            <LoadingSkeleton variant="rect" width="48px" height="20px" />
          </div>
        ))}
      </div>
    );
  }

  // Default: Grid Card Mode
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="rect" width="90px" height="20px" />
            <LoadingSkeleton variant="text" width="60px" height="14px" />
          </div>
          <LoadingSkeleton variant="text" width="75%" height="18px" />
          <LoadingSkeleton variant="text" count={2} />
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
            <LoadingSkeleton variant="text" width="80px" height="14px" />
            <LoadingSkeleton variant="rect" width="90px" height="24px" />
          </div>
        </div>
      ))}
    </div>
  );
}
