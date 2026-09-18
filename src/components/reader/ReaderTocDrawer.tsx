import React, { useEffect, useRef } from 'react';
import { X, ChevronRight, Bookmark } from 'lucide-react';

export interface TocItem {
  id: string;
  label: string;
  level: number;
}

export interface ReaderTocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItem[];
  activeId?: string;
  onSelectTocItem: (item: TocItem) => void;
}

export function ReaderTocDrawer({
  isOpen,
  onClose,
  toc,
  activeId,
  onSelectTocItem,
}: ReaderTocDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mục lục tài liệu"
      className="absolute top-0 right-0 bottom-0 z-30 w-80 max-w-[85vw] bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-xl flex flex-col animate-in slide-in-from-right duration-200"
      ref={drawerRef}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-800 dark:text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
            Mục lục tài liệu
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng mục lục"
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TOC Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {toc.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 italic">
            Tài liệu không có đề mục hoặc chưa nạp được mục lục.
          </div>
        ) : (
          toc.map((item, idx) => {
            const isActive = activeId === item.id;
            const paddingLeft =
              item.level === 1
                ? 'pl-2.5'
                : item.level === 2
                ? 'pl-6'
                : item.level === 3
                ? 'pl-9'
                : 'pl-12';

            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => onSelectTocItem(item)}
                className={`w-full text-left py-2 pr-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-between gap-2 group ${paddingLeft} ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-semibold shadow-2xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                }`}
                title={item.label}
              >
                <span className="truncate flex-1">{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
