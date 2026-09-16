import React from 'react';

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  categoryLabel?: string;
  categoryIcon?: React.ComponentType<{ className?: string }>;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  categoryLabel,
  categoryIcon: CategoryIcon,
  breadcrumbs,
  actions,
  badge,
  className = '',
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={`border-b border-stone-200/80 dark:border-stone-800 pb-4 sm:pb-5 space-y-2 ${className}`}
      {...props}
    >
      {breadcrumbs && <div className="mb-1">{breadcrumbs}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0">
          {categoryLabel && (
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              {CategoryIcon && <CategoryIcon className="w-3.5 h-3.5" />}
              <span>{categoryLabel}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight font-serif-title">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
