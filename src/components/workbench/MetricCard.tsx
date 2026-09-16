import React from 'react';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  badge?: React.ReactNode;
  progressPercent?: number;
}

export function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  badge,
  progressPercent,
  className = '',
  ...props
}: MetricCardProps) {
  return (
    <div
      className={`bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 transition-all hover:border-stone-300 dark:hover:border-stone-700 ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 dark:text-stone-100 tabular-nums">
          {value}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {subValue && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate font-medium">
          {subValue}
        </p>
      )}

      {progressPercent !== undefined && (
        <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-700 dark:bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
