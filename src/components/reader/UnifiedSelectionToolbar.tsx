import React, { useEffect } from 'react';
import { Highlighter, Copy, Quote, FilePlus, Inbox, Check } from 'lucide-react';
import { copyTextToClipboard } from '../../lib/clipboard';

export type SelectionToolbarAction =
  | 'highlight'
  | 'copy'
  | 'citation'
  | 'send_to_note'
  | 'add_to_inbox';

export interface UnifiedSelectionToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  selectedText: string;
  onAction: (action: SelectionToolbarAction, payload: { text: string; success?: boolean }) => void;
  onClose: () => void;
}

export function UnifiedSelectionToolbar({
  isOpen,
  position,
  selectedText,
  onAction,
  onClose,
}: UnifiedSelectionToolbarProps) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !position || !selectedText || !selectedText.trim()) {
    return null;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await copyTextToClipboard(selectedText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onAction('copy', { text: selectedText, success: true });
    } else {
      onAction('copy', { text: selectedText, success: false });
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Công cụ trích xuất nghiên cứu"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      className="transform -translate-y-full -translate-x-1/2 mb-2.5 flex items-center gap-1 p-1.5 bg-stone-900/95 dark:bg-stone-100/95 text-stone-100 dark:text-stone-900 rounded-2xl shadow-2xl border border-stone-700/60 dark:border-stone-300/60 backdrop-blur-md text-xs font-sans animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* 1. Highlight */}
      <button
        type="button"
        onClick={() => onAction('highlight', { text: selectedText })}
        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 text-amber-400 dark:text-amber-700 font-medium rounded-xl transition cursor-pointer"
        aria-label="Highlight"
        title="Đánh dấu đoạn văn bản"
      >
        <Highlighter className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Highlight</span>
      </button>

      {/* 2. Copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 text-stone-200 dark:text-stone-800 font-medium rounded-xl transition cursor-pointer"
        aria-label="Sao chép"
        title="Sao chép vào clipboard (Client-only)"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{copied ? 'Đã chép' : 'Sao chép'}</span>
      </button>

      {/* 3. Citation */}
      <button
        type="button"
        onClick={() => onAction('citation', { text: selectedText })}
        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 text-purple-400 dark:text-purple-700 font-medium rounded-xl transition cursor-pointer"
        aria-label="Trích dẫn"
        title="Tạo trích dẫn học thuật"
      >
        <Quote className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Trích dẫn</span>
      </button>

      {/* 4. Send to Note */}
      <button
        type="button"
        onClick={() => onAction('send_to_note', { text: selectedText })}
        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 text-emerald-400 dark:text-emerald-700 font-medium rounded-xl transition cursor-pointer"
        aria-label="Gửi vào ghi chú"
        title="Gửi đoạn trích vào ghi chú nghiên cứu"
      >
        <FilePlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Vào ghi chú</span>
      </button>

      {/* 5. Add to Inbox */}
      <button
        type="button"
        onClick={() => onAction('add_to_inbox', { text: selectedText })}
        className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-200 text-sky-400 dark:text-sky-700 font-medium rounded-xl transition cursor-pointer"
        aria-label="Thêm vào Inbox"
        title="Thêm vào Research Inbox"
      >
        <Inbox className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Vào Inbox</span>
      </button>
    </div>
  );
}
