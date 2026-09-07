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
  Clock,
  Tag as TagIcon,
  Copy,
  Check,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { formatTimeAgo } from "../../lib/spaced-repetition";
import { MarkdownReadabilityRenderer } from "../../lib/markdownReadability";
import { TextSelectionPopover } from "../notes/TextSelectionPopover";
import { FlashcardFormModal } from "./FlashcardFormModal";
import { detectClozeFromSelection } from "../../lib/detectClozeFromSelection";
import { NoteCardListSection, clearNoteCardsCache } from "../notes/NoteCardListSection";

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
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);

  // US1: Text selection & Flashcard Form integration
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");

  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);
  const [flashcardInitialData, setFlashcardInitialData] = useState<{
    initialFront?: string;
    initialBack?: string;
    initialType?: "basic" | "cloze";
    defaultNoteId?: string;
  }>({});

  const handleCreateFlashcardFromSelection = (textToUse?: string) => {
    const text = textToUse || selectedText;
    if (!text || text.trim().length === 0) return;

    const clozeDetection = detectClozeFromSelection(text);
    setFlashcardInitialData({
      initialFront: text,
      initialType: clozeDetection.hasCloze ? "cloze" : "basic",
      defaultNoteId: note?.id,
    });
    setIsFlashcardModalOpen(true);
    setIsPopoverOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsPopoverOpen(false);
      setPopoverPosition(null);
      setSelectedText("");
      return;
    }

    let timer: any = null;

    const updateSelection = () => {
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !selection.toString() ||
        selection.toString().trim().length < 2
      ) {
        setIsPopoverOpen(false);
        setPopoverPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const centerLeft = rect.left + rect.width / 2;
        const top = rect.top;
        setPopoverPosition({ top, left: centerLeft });
        setSelectedText(text);
        setIsPopoverOpen(true);
      } catch {
        // Range may be invalid
      }
    };

    const handleDebouncedSelection = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(updateSelection, 100);
    };

    const handleMouseUp = () => {
      updateSelection();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFlashcardModalOpen) {
          setIsFlashcardModalOpen(false);
        } else if (isPopoverOpen) {
          setIsPopoverOpen(false);
        } else {
          onClose();
        }
      } else if (e.altKey && (e.key === "f" || e.key === "F")) {
        const selection = window.getSelection();
        const text = selection?.toString()?.trim() || selectedText;
        if (text && text.length >= 2) {
          e.preventDefault();
          handleCreateFlashcardFromSelection(text);
        }
      }
    };

    document.addEventListener("selectionchange", handleDebouncedSelection);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("selectionchange", handleDebouncedSelection);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, selectedText, isPopoverOpen, isFlashcardModalOpen, note?.id]);

  if (!isOpen || !note) return null;

  const handleCopyPath = () => {
    if (note.sourcePath && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(note.sourcePath).catch(() => {});
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handleCopyContent = () => {
    if (note.content && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(note.content).catch(() => {});
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    }
  };

  const getTypeBadge = () => {
    switch (note.type) {
      case "insight":
        return (
          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Lightbulb className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Ý tưởng &amp; Phát hiện
          </span>
        );
      case "question":
        return (
          <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            Câu hỏi &amp; Thắc mắc
          </span>
        );
      case "summary":
        return (
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <Bookmark className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Tóm lược
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            Học tập
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết ghi chú"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col text-stone-900 dark:text-stone-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {getTypeBadge()}
            {note.topicTitle && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openTopicDetail(note.topicId);
                }}
                className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Xem chi tiết chủ đề này"
              >
                <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{note.topicTitle}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono hidden md:inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeAgo(note.createdAt)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/80 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Focus Reading Content Area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-7 space-y-6 scrollbar-thin">
          {/* Note Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 font-serif-title leading-snug tracking-tight">
              {note.title}
            </h2>
          </div>

          {/* Note Body with Readability Formatting */}
          <div className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-sans bg-stone-50/80 dark:bg-stone-950/40 p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 shadow-2xs">
            <MarkdownReadabilityRenderer
              content={note.content}
              topics={topics}
              onOpenTopic={(id) => {
                onClose();
                openTopicDetail(id);
              }}
            />
          </div>

          {/* Source Path Display */}
          {note.sourcePath && (
            <div className="p-3.5 bg-stone-100/90 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl flex items-center justify-between text-xs font-mono text-stone-700 dark:text-stone-300">
              <span className="truncate flex-1 mr-2 flex items-center gap-1.5" title={note.sourcePath}>
                <FolderOpen className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="truncate">{note.sourcePath}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPath}
                className="px-3 py-1 bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 border border-stone-200 dark:border-stone-600"
                title="Sao chép đường dẫn tệp"
              >
                {copiedPath ? (
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
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span className="flex items-center gap-1 text-xs font-semibold text-stone-400 mr-1">
                <TagIcon className="w-3.5 h-3.5" />
                <span>Thẻ:</span>
              </span>
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full text-xs font-medium border border-stone-200 dark:border-stone-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Linked Flashcards Section (US4) */}
          <NoteCardListSection
            key={`${note.id}-${cardsRefreshKey}`}
            noteId={note.id}
            topicId={note.topicId}
            onCreateCardClick={() => {
              setFlashcardInitialData({
                defaultNoteId: note.id,
              });
              setIsFlashcardModalOpen(true);
            }}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              onClick={handleCopyContent}
              className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
              title="Sao chép toàn bộ văn bản ghi chú"
            >
              {copiedContent ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép nội dung</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 dark:bg-stone-200 hover:bg-stone-900 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Floating text selection popover */}
      <TextSelectionPopover
        isOpen={isPopoverOpen}
        position={popoverPosition}
        selectionText={selectedText}
        onCreateCard={handleCreateFlashcardFromSelection}
        onClose={() => setIsPopoverOpen(false)}
      />

      {/* Modal creating flashcard from note text selection */}
      {isFlashcardModalOpen && (
        <FlashcardFormModal
          isOpen={isFlashcardModalOpen}
          onClose={() => setIsFlashcardModalOpen(false)}
          onSuccess={() => {
            if (note?.id) clearNoteCardsCache(note.id);
            setCardsRefreshKey((k) => k + 1);
          }}
          defaultTopicId={note.topicId}
          defaultNoteId={note.id}
          {...flashcardInitialData}
        />
      )}
    </div>
  );
}
