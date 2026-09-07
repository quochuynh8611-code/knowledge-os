import React, { useMemo } from "react";
import { parseClozeDeletions } from "../../lib/clozeParser";
import type { Flashcard } from "../../types/flashcard";
import { Sparkles, Eye, RotateCw, Pencil, History } from "lucide-react";

export interface FlashcardCardViewProps {
  card: Pick<Flashcard, "id" | "type" | "front" | "back"> & {
    topicId?: string;
    lifecycleStatus?: string;
    schedule?: any;
  };
  isFlipped: boolean;
  onFlip?: () => void;
  onEdit?: () => void;
  onHistory?: () => void;
}

/**
 * FlashcardCardView renders both Basic and Cloze flashcards with a responsive 3D-like flip card interface.
 */
export function FlashcardCardView({
  card,
  isFlipped,
  onFlip,
  onEdit,
  onHistory,
}: FlashcardCardViewProps) {
  const isCloze = card.type === "cloze";

  const clozeItems = useMemo(() => {
    if (!isCloze) return [];
    return parseClozeDeletions(card.front);
  }, [card.front, isCloze]);

  // Render front content
  const renderFront = () => {
    if (isCloze && clozeItems.length > 0) {
      const firstCloze = clozeItems[0];
      // Replace cloze syntax with a styled blank placeholder
      const parts = card.front.split(/\{\{c\d+::[\s\S]*?\}\}/);

      return (
        <div className="space-y-4">
          <div className="text-lg md:text-xl font-medium leading-relaxed text-stone-900 dark:text-stone-100">
            {parts[0]}
            <span
              data-testid="cloze-deletion"
              className="inline-flex items-center px-3 py-1 mx-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-mono font-bold tracking-widest text-sm shadow-xs"
            >
              [...]
            </span>
            {parts[1] || ""}
          </div>
          {firstCloze.hint && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Gợi ý: {firstCloze.hint}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-lg md:text-xl font-medium leading-relaxed text-stone-900 dark:text-stone-100 whitespace-pre-wrap">
        {card.front}
      </div>
    );
  };

  // Render back content
  const renderBack = () => {
    if (isCloze && clozeItems.length > 0) {
      const firstCloze = clozeItems[0];
      const parts = card.front.split(/\{\{c\d+::[\s\S]*?\}\}/);

      return (
        <div className="space-y-4">
          <div className="text-lg md:text-xl font-medium leading-relaxed text-stone-900 dark:text-stone-100">
            {parts[0]}
            <span className="inline-flex items-center px-3 py-1 mx-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold text-base shadow-xs animate-in fade-in duration-300">
              {firstCloze.answer}
            </span>
            {parts[1] || ""}
          </div>
          {card.back && (
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 text-sm md:text-base text-stone-600 dark:text-stone-300 whitespace-pre-wrap">
              {card.back}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-lg md:text-xl font-medium leading-relaxed text-stone-900 dark:text-stone-100 whitespace-pre-wrap">
        {card.back}
      </div>
    );
  };

  return (
    <div
      data-testid="flashcard-card"
      data-flipped={isFlipped ? "true" : "false"}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? "Mặt sau của thẻ nhớ" : "Mặt trước của thẻ nhớ"}
      className={`relative w-full min-h-[260px] md:min-h-[320px] p-6 md:p-8 rounded-3xl cursor-pointer select-none transition-all duration-300 flex flex-col justify-between border ${
        isFlipped
          ? "bg-stone-50/95 dark:bg-stone-900/95 border-emerald-500/40 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20"
          : "bg-white dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 shadow-xl hover:shadow-2xl hover:border-amber-500/30"
      }`}
    >
      {/* Card Header Info */}
      <div className="flex items-center justify-between text-xs font-semibold text-stone-400 dark:text-stone-500 mb-4">
        <span className="uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
          {isCloze ? "Thẻ Điền Khuyết (Cloze)" : "Thẻ Khái Niệm (Basic)"}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              data-testid="btn-quick-edit-card"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Chỉnh sửa nhanh (Ctrl+E)"
              aria-label="Chỉnh sửa thẻ"
              className="p-1 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onHistory && (
            <button
              type="button"
              data-testid="btn-view-card-history"
              onClick={(e) => {
                e.stopPropagation();
                onHistory();
              }}
              title="Xem lịch sử ôn tập (Ctrl+H)"
              aria-label="Xem lịch sử ôn tập"
              className="p-1 rounded-lg text-stone-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-stone-400">
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Mặt sau" : "Mặt trước (Space để lật)"}</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex items-center justify-center text-center px-2 py-4">
        {isFlipped ? renderBack() : renderFront()}
      </div>

      {/* Card Footer Hint */}
      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {isFlipped ? "Nhấn 1-4 để chấm điểm" : "Nhấp thẻ hoặc phím Space để xem đáp án"}
        </span>
      </div>
    </div>
  );
}
