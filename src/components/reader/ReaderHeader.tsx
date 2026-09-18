import React from 'react';
import { BookOpen, List, X, FileText } from 'lucide-react';

export interface ReaderHeaderProps {
  title: string;
  format: string;
  isTocOpen: boolean;
  onToggleToc: () => void;
  onClose: () => void;
  extraControls?: React.ReactNode;
}

export function ReaderHeader({
  title,
  format,
  isTocOpen,
  onToggleToc,
  onClose,
  extraControls,
}: ReaderHeaderProps) {
  const normalizedFormat = (format || 'doc').toUpperCase();

  const getFormatBadgeStyle = () => {
    switch (normalizedFormat) {
      case 'EPUB':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800';
      case 'MD':
      case 'MARKDOWN':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
      case 'PDF':
        return 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700';
    }
  };

  const displayLabel = normalizedFormat === 'MD' ? 'MARKDOWN' : normalizedFormat;

  return (
    <header className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs gap-3 shrink-0">
      {/* Title & Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 shadow-2xs">
          {normalizedFormat === 'EPUB' ? (
            <BookOpen className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
              {title || 'Tài liệu nghiên cứu'}
            </h2>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-md border shrink-0 ${getFormatBadgeStyle()}`}
            >
              {displayLabel}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono truncate">
            Unified Research Reader
          </p>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* TOC Toggle Button */}
        <button
          type="button"
          onClick={onToggleToc}
          aria-expanded={isTocOpen}
          aria-label="Mục lục"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer border ${
            isTocOpen
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs font-semibold'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200/80 dark:hover:bg-stone-700'
          }`}
          title="Mở / Đóng mục lục tài liệu"
        >
          <List className="w-4 h-4" />
          <span>Mục lục</span>
        </button>

        {/* Extra Controls (e.g. font size, layout) */}
        {extraControls}

        {/* Close Button */}
        <div className="pl-1 border-l border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            title="Đóng trình đọc (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
