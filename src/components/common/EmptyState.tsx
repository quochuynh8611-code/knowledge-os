import React from 'react';
import { Sparkles, BookOpen, Plus, RefreshCw } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  suggestions?: { label: string; onClick: () => void }[];
  className?: string;
}

export function EmptyState({
  icon: Icon = BookOpen,
  title = 'Chưa có dữ liệu khảo cứu',
  description = 'Bắt đầu ghi chép, tạo chủ đề mới hoặc kết nối dữ liệu để mở rộng bản đồ tri thức của bạn.',
  primaryAction,
  secondaryAction,
  suggestions,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-12 px-6 bg-white/60 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-700/80 rounded-3xl backdrop-blur-xs flex flex-col items-center max-w-lg mx-auto my-6 ${className}`}
    >
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center mb-4 shadow-xs border border-amber-200/60 dark:border-amber-800/60">
        <Icon className="w-7 h-7" />
      </div>

      {/* Title & Description */}
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight font-serif-title mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition flex items-center gap-1.5"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white shadow-xs transition flex items-center gap-1.5"
            >
              {primaryAction.icon && <primaryAction.icon className="w-3.5 h-3.5" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Search suggestions if any */}
      {suggestions && suggestions.length > 0 && (
        <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 w-full flex flex-col items-center gap-2">
          <span className="text-[11px] text-stone-400 font-medium">Gợi ý từ khóa khảo cứu:</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={s.onClick}
                className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-300 text-[11px] font-medium text-stone-600 dark:text-stone-400 rounded-md transition border border-stone-200/60 dark:border-stone-700/60"
              >
                #{s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
