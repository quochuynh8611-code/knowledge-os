import React from 'react';
import { Search, X } from 'lucide-react';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  filters,
  actions,
  onReset,
  hasActiveFilters = false,
  className = '',
}: FilterBarProps) {
  return (
    <div
      className={`bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition"
              title="Xóa ô tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action / reset triggers */}
        {(actions || (hasActiveFilters && onReset)) && (
          <div className="flex items-center gap-2 shrink-0 justify-end">
            {hasActiveFilters && onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition font-medium cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
            {actions}
          </div>
        )}
      </div>

      {filters && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-stone-100 dark:border-stone-800/60">
          {filters}
        </div>
      )}
    </div>
  );
}
