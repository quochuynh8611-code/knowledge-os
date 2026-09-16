import React from 'react';
import { X } from 'lucide-react';

export interface InspectorPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function InspectorPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  headerActions,
  footer,
  className = '',
  children,
  ...props
}: InspectorPanelProps) {
  if (!isOpen) return null;

  return (
    <aside
      className={`w-full md:w-80 lg:w-96 bg-white dark:bg-stone-900 border-l border-stone-200/80 dark:border-stone-800 flex flex-col shrink-0 h-full overflow-hidden shadow-lg ${className}`}
      {...props}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/70 dark:bg-stone-900/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {headerActions}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition cursor-pointer"
            title="Đóng bảng chi tiết"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-3 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-xs shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );
}
