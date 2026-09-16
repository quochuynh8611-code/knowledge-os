import React from 'react';

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  actions?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  count,
  actions,
  className = '',
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
        )}
        <div className="flex items-center gap-2 truncate">
          <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate font-sans">
            {title}
          </h2>
          {count !== undefined && (
            <span className="text-[11px] font-mono px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full border border-stone-200 dark:border-stone-700 font-semibold">
              {count}
            </span>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
