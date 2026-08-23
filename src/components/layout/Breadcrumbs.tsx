import React from "react";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  id?: string;
  label: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrent?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  onHomeClick?: () => void;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  onHomeClick,
  className = "",
}: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-stone-500 dark:text-stone-400 overflow-x-auto no-scrollbar py-1 ${className}`}
    >
      <ol className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {/* Home Item */}
        {showHome && (
          <li className="flex items-center">
            <button
              type="button"
              onClick={onHomeClick}
              className={`flex items-center gap-1 hover:text-amber-800 dark:hover:text-amber-400 transition font-medium ${
                items.length === 0
                  ? "text-amber-900 dark:text-amber-300 font-bold"
                  : ""
              }`}
              title="Về Trang Tổng Quan"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tổng quan</span>
            </button>
            <ChevronRight
              className="w-3 h-3 text-stone-400 dark:text-stone-600 mx-1 shrink-0"
              aria-hidden="true"
            />
          </li>
        )}

        {/* Dynamic Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;
          const Icon = item.icon;

          return (
            <li key={item.id || index} className="flex items-center">
              {isLast ? (
                <span
                  className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 max-w-[200px] sm:max-w-[320px] truncate"
                  aria-current="page"
                  title={item.label}
                >
                  {Icon && (
                    <Icon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center gap-1.5 hover:text-amber-800 dark:hover:text-amber-400 transition max-w-[140px] sm:max-w-[200px] truncate font-medium"
                  title={item.label}
                >
                  {Icon && (
                    <Icon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              )}

              {!isLast && (
                <ChevronRight
                  className="w-3 h-3 text-stone-400 dark:text-stone-600 mx-1 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
