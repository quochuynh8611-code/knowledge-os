import React, { useEffect, useMemo } from 'react';
import { X, Inbox, Eye, CheckSquare, FileText, Bookmark, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { ResearchExcerpt, ResearchInboxItem } from '../../types';

export function filterUnprocessedInboxItems(items: ResearchInboxItem[] = []): ResearchInboxItem[] {
  return items.filter((item) => !item.isProcessed);
}

export function dismissResearchInboxItem(
  items: ResearchInboxItem[] = [],
  id: string
): ResearchInboxItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, isProcessed: true, updatedAt: new Date().toISOString() } : item
  );
}

export function markInboxItemAsProcessed(
  items: ResearchInboxItem[] = [],
  id: string
): ResearchInboxItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, isProcessed: true, updatedAt: new Date().toISOString() } : item
  );
}

export function sortInboxItemsByPriority(items: ResearchInboxItem[] = []): ResearchInboxItem[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function createInboxItemFromExcerpt(
  excerpt: ResearchExcerpt,
  priority: number = 0
): ResearchInboxItem {
  const now = new Date().toISOString();
  return {
    id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    excerptId: excerpt.id,
    excerpt,
    isProcessed: false,
    priority,
    createdAt: now,
    updatedAt: now,
  };
}

export interface ResearchInboxDrawerProps {
  isOpen: boolean;
  items: ResearchInboxItem[];
  onView: (item: ResearchInboxItem) => void;
  onDismiss: (id: string) => void;
  onDelete?: (id: string) => void;
  onSendToNote: (item: ResearchInboxItem) => void;
  onClose: () => void;
  className?: string;
}

export function ResearchInboxDrawer({
  isOpen,
  items = [],
  onView,
  onDismiss,
  onDelete,
  onSendToNote,
  onClose,
  className = '',
}: ResearchInboxDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unprocessedItems = useMemo(() => {
    return sortInboxItemsByPriority(filterUnprocessedInboxItems(items));
  }, [items]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Research Inbox"
      className={`fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-2xs animate-in fade-in duration-150 ${className}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Research Inbox
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-stone-950 rounded-full">
                  {unprocessedItems.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Các đoạn trích đã lưu cần xem lại hoặc xử lý
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Inbox"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {unprocessedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center border border-stone-200 dark:border-stone-700">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  Research Inbox trống
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs">
                  Chưa có trích đoạn nào được thêm vào Inbox. Bạn có thể chọn văn bản khi đọc tài liệu và bấm "Vào Inbox".
                </p>
              </div>
            </div>
          ) : (
            unprocessedItems.map((item) => {
              const excerpt = item.excerpt;
              const docTitle = excerpt?.citationSnapshot?.title || 'Tài liệu không tên';
              const docAuthor = excerpt?.citationSnapshot?.author;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl shadow-2xs hover:shadow-xs transition space-y-3"
                >
                  {/* Document Attribution */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1.5 font-medium truncate max-w-[240px]">
                      <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">{docTitle}</span>
                    </span>
                    {docAuthor && (
                      <span className="text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-600 dark:text-stone-300 shrink-0">
                        {docAuthor}
                      </span>
                    )}
                  </div>

                  {/* Excerpt Selected Text */}
                  <blockquote className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 text-xs sm:text-sm text-stone-800 dark:text-stone-200 italic font-serif leading-relaxed line-clamp-4">
                    {excerpt?.selectedText || ''}
                  </blockquote>

                  {/* 3 Action Buttons: View, Send to Note, Dismiss */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/80 gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(item)}
                        aria-label="Xem lại"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-medium transition cursor-pointer"
                        title="Mở vị trí nguồn tài liệu"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem lại</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendToNote(item)}
                        aria-label="Lưu vào ghi chú"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium transition cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60"
                        title="Chèn trích đoạn vào ghi chú"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Lưu vào ghi chú</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label="Xóa trích đoạn"
                          className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                          title="Xóa vĩnh viễn khỏi Inbox"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDismiss(item.id)}
                        aria-label="Bỏ qua"
                        className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
                        title="Đánh dấu đã xử lý / bỏ qua"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
