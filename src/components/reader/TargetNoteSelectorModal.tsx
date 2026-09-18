import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, ArrowRight } from 'lucide-react';
import { Note } from '../../types';

export interface TargetNoteSelectorModalProps {
  isOpen: boolean;
  notes: Note[];
  selectedExcerptText?: string;
  onSelectNote: (noteId: string) => void;
  onClose: () => void;
}

export function TargetNoteSelectorModal({
  isOpen,
  notes,
  selectedExcerptText,
  onSelectNote,
  onClose,
}: TargetNoteSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chọn ghi chú đích"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Chọn ghi chú đích
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Excerpt Snippet Preview */}
        {selectedExcerptText && (
          <div className="px-5 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[11px] text-emerald-900 dark:text-emerald-300 line-clamp-2 italic font-serif">
              "{selectedExcerptText}"
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ghi chú theo tiêu đề hoặc nội dung..."
              className="w-full pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              autoFocus
            />
          </div>
        </div>

        {/* Note List */}
        <div className="max-h-72 overflow-y-auto p-3 space-y-1.5">
          {filteredNotes.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 italic">
              Không tìm thấy ghi chú phù hợp với từ khóa.
            </div>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  onSelectNote(note.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 hover:border-emerald-400/80 dark:hover:border-emerald-600 bg-white dark:bg-stone-900 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {note.title || 'Ghi chú không tên'}
                  </h4>
                  {note.content && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {note.content.replace(/[#*`_>]/g, '').trim()}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
