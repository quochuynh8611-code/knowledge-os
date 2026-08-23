import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export function LoadingSkeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: LoadingSkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full shrink-0';
      case 'rect':
        return 'rounded-xl';
      case 'card':
        return 'rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800';
      case 'text':
      default:
        return 'rounded-md h-3.5';
    }
  };

  const baseClasses = `animate-pulse bg-stone-200/80 dark:bg-stone-800/80 ${getVariantStyles()} ${className}`;

  if (count > 1) {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{
              width: width || (variant === 'text' ? (i === count - 1 ? '70%' : '100%') : undefined),
              height: height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={{
        width: width,
        height: height,
      }}
      aria-hidden="true"
    />
  );
}
