import React, { useEffect, useState } from "react";
import { Note } from "../../types";
import { useData } from "../../context/DataContext";
import {
  X,
  Edit2,
  FileText,
  Lightbulb,
  HelpCircle,
  Bookmark,
  Sparkles,
  Clock,
  Tag as TagIcon,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { formatTimeAgo } from "../../lib/spaced-repetition";

export interface NoteReaderModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onEdit: (note: Note) => void;
}

export function NoteReaderModal({
  isOpen,
  note,
  onClose,
  onEdit,
}: NoteReaderModalProps) {
  const { topics, openTopicDetail } = useData();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !note) return null;

  const handleCopyPath = () => {
    if (note.sourcePath && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(note.sourcePath).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTypeBadge = () => {
    switch (note.type) {
      case "insight":
        return (
          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Ý tưởng &amp; Phát hiện
          </span>
        );
      case "question":
        return (
          <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            Câu hỏi &amp; Thắc mắc
          </span>
        );
      case "summary":
        return (
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Tóm lược
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            Học tập
          </span>
        );
    }
  };

  const renderWikiLinks = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const titleQuery = part.slice(2, -2).trim();
        const matchedTopic = topics.find(
          (t) =>
            t.title.toLowerCase().includes(titleQuery.toLowerCase()) ||
            titleQuery.toLowerCase().includes(t.title.toLowerCase())
        );

        if (matchedTopic) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                onClose();
                openTopicDetail(matchedTopic.id);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/90 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold rounded-md text-xs sm:text-sm border border-amber-300 dark:border-amber-700 transition mx-0.5 cursor-pointer align-baseline"
              title={`Mở chủ đề: ${matchedTopic.title}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{titleQuery}</span>
            </button>
          );
        }
        return (
          <span
            key={index}
            className="px-2 py-0.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md text-xs sm:text-sm font-mono"
          >
            {titleQuery}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết ghi chú"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-stone-900 dark:text-stone-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            {getTypeBadge()}
            {note.topicTitle && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openTopicDetail(note.topicId);
                }}
                className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 transition"
                title="Xem chi tiết chủ đề này"
              >
                <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                <span>{note.topicTitle}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono hidden sm:inline flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(note.createdAt)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Focus Reading Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Note Title */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-50 font-serif-title leading-tight">
              {note.title}
            </h2>
          </div>

          {/* Note Body with Markdown/Wiki link formatting */}
          <div className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-sans whitespace-pre-wrap bg-stone-50/70 dark:bg-stone-950/40 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80">
            {renderWikiLinks(note.content)}
          </div>

          {/* Source Path Display */}
          {note.sourcePath && (
            <div className="p-3 bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl flex items-center justify-between text-xs font-mono text-stone-700 dark:text-stone-300">
              <span className="truncate flex-1 mr-2" title={note.sourcePath}>
                📄 {note.sourcePath}
              </span>
              <button
                type="button"
                onClick={handleCopyPath}
                className="px-2.5 py-1 bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                title="Sao chép đường dẫn tệp"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Chép path</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <TagIcon className="w-3.5 h-3.5 text-stone-400 mr-1" />
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full text-xs font-medium border border-stone-200 dark:border-stone-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
