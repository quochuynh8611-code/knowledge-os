import React from 'react';

export interface WorkbenchPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'subtle' | 'elevated';
  children: React.ReactNode;
}

export function WorkbenchPanel({
  title,
  subtitle,
  icon: Icon,
  headerActions,
  footer,
  variant = 'default',
  className = '',
  children,
  ...props
}: WorkbenchPanelProps) {
  const bgStyle =
    variant === 'subtle'
      ? 'bg-stone-50/70 dark:bg-stone-900/60'
      : variant === 'elevated'
      ? 'bg-white dark:bg-stone-900 shadow-xs'
      : 'bg-white dark:bg-stone-900/90 shadow-2xs';

  const hasHeader = Boolean(title || headerActions);

  return (
    <div
      className={`rounded-2xl border border-stone-200/80 dark:border-stone-800 flex flex-col overflow-hidden ${bgStyle} ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate font-sans">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center gap-1.5 shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 p-4 sm:p-5">{children}</div>

      {footer && (
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-stone-200/70 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/30 text-xs text-stone-600 dark:text-stone-400">
          {footer}
        </div>
      )}
    </div>
  );
}
