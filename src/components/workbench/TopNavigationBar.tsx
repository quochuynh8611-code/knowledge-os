import React from 'react';
import { Inbox } from 'lucide-react';

export interface TopNavigationBarProps {
  unprocessedInboxCount?: number;
  onToggleInbox?: () => void;
  title?: string;
  extraControls?: React.ReactNode;
  className?: string;
}

export function TopNavigationBar({
  unprocessedInboxCount = 0,
  onToggleInbox,
  title,
  extraControls,
  className = '',
}: TopNavigationBarProps) {
  return (
    <header
      className={`flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs ${className}`}
    >
      {/* Title / Branding */}
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        {extraControls}

        {/* Research Inbox Trigger Button */}
        {onToggleInbox && (
          <button
            type="button"
            onClick={onToggleInbox}
            aria-label="Mở Research Inbox"
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700 rounded-xl text-xs font-medium transition cursor-pointer shadow-2xs"
            title="Mở Research Inbox"
          >
            <Inbox className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span className="hidden sm:inline">Research Inbox</span>
            {unprocessedInboxCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-stone-950 rounded-full min-w-[18px] text-center">
                {unprocessedInboxCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
