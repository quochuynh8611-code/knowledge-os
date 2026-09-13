import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { NotebookLMHeaderProps } from './types';

export function NotebookLMHeader({ onClose, topicTitle }: NotebookLMHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/90">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-700 dark:bg-blue-600 text-blue-50 flex items-center justify-center font-bold shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 id="notebooklm-studio-title" className="text-base font-bold text-stone-900 dark:text-white">
              Google NotebookLM Research Hub
            </h2>
            {topicTitle && (
              <span className="hidden sm:inline-block text-[11px] font-semibold text-stone-500 dark:text-stone-400 truncate max-w-xs">
                &bull; {topicTitle}
              </span>
            )}
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
