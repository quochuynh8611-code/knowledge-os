import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { NotebookLMHeaderProps } from './types';

export function NotebookLMHeader({
  onClose,
  topicTitle,
  runtimeStatus = 'unknown',
}: NotebookLMHeaderProps) {
  const getStatusBadge = () => {
    switch (runtimeStatus) {
      case 'configured':
        return {
          label: 'Đã cấu hình',
          className:
            'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'verified':
        return {
          label: 'Smoke đã xác minh',
          className:
            'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'blocked':
        return {
          label: 'Audio Overview: Chưa khả dụng',
          className:
            'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'unknown':
      default:
        return {
          label: 'Chưa kiểm tra',
          className:
            'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/90">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-700 dark:bg-blue-600 text-blue-50 flex items-center justify-center font-bold shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="notebooklm-studio-title" className="text-base font-bold text-stone-900 dark:text-white">
              Google NotebookLM Research Hub
            </h2>
            {topicTitle && (
              <span className="hidden sm:inline-block text-[11px] font-semibold text-stone-500 dark:text-stone-400 truncate max-w-xs">
                &bull; {topicTitle}
              </span>
            )}
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Chuẩn bị nguồn, tạo prompt và nhập kết quả nghiên cứu.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng modal"
        className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
