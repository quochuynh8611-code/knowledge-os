import React, { useEffect } from "react";
import { Sparkles, Brain } from "lucide-react";

export interface TextSelectionPopoverProps {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  selectionText?: string;
  onCreateCard: (selectedText?: string) => void;
  onClose: () => void;
}

/**
 * TextSelectionPopover renders a floating toolbar near active text selection
 * allowing instant creation of flashcards from reading notes.
 */
export function TextSelectionPopover({
  isOpen,
  position,
  selectionText,
  onCreateCard,
  onClose,
}: TextSelectionPopoverProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        onCreateCard(selectionText);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectionText, onCreateCard, onClose]);

  if (!isOpen || !position) {
    return null;
  }

  // Preview snippet truncated
  const preview =
    selectionText && selectionText.length > 30
      ? `${selectionText.substring(0, 30)}...`
      : selectionText || "";

  return (
    <div
      data-testid="text-selection-popover"
      role="dialog"
      aria-label="Tạo flashcard từ text đã chọn"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      className="transform -translate-y-full -translate-x-1/2 mb-2 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/95 dark:bg-stone-100/95 text-stone-100 dark:text-stone-900 rounded-2xl shadow-xl border border-stone-700/60 dark:border-stone-300/60 backdrop-blur-md text-xs font-sans animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <button
        type="button"
        onClick={() => onCreateCard(selectionText)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl transition cursor-pointer shadow-xs"
        aria-label="Tạo thẻ nhớ"
      >
        <Brain className="w-3.5 h-3.5 text-stone-950" />
        <span>Tạo thẻ nhớ</span>
        <span className="text-[10px] font-mono px-1 py-0.5 bg-amber-600/30 rounded text-amber-950 ml-0.5">
          Alt+F
        </span>
      </button>

      {preview && (
        <span className="hidden sm:inline-block max-w-[140px] truncate text-[11px] text-stone-300 dark:text-stone-600 pl-1 border-l border-stone-700 dark:border-stone-300">
          "{preview}"
        </span>
      )}
    </div>
  );
}
