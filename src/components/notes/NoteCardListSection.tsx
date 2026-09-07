import React, { useState, useEffect } from "react";
import type { Flashcard } from "../../types/flashcard";
import { Brain, Sparkles, Plus, AlertCircle, RefreshCw } from "lucide-react";

export interface NoteCardListSectionProps {
  noteId: string;
  topicId?: string;
  onCreateCardClick?: () => void;
  onSelectCard?: (card: Flashcard) => void;
  cards?: Flashcard[];
}

// Module-level cache with 5-minute TTL
const noteCardsCache = new Map<string, { data: Flashcard[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function clearNoteCardsCache(noteId?: string) {
  if (noteId) {
    noteCardsCache.delete(noteId);
  } else {
    noteCardsCache.clear();
  }
}

export function NoteCardListSection({
  noteId,
  topicId,
  onCreateCardClick,
  onSelectCard,
  cards: propCards,
}: NoteCardListSectionProps) {
  const [cards, setCards] = useState<Flashcard[]>(propCards || []);
  const [loading, setLoading] = useState<boolean>(!propCards);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propCards) {
      setCards(propCards);
      setLoading(false);
      return;
    }

    if (!noteId) {
      setCards([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const now = Date.now();
    const cached = noteCardsCache.get(noteId);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      setCards(cached.data);
      setLoading(false);
      return;
    }

    async function fetchCards() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/flashcards?noteId=${encodeURIComponent(noteId)}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: Flashcard[] = await res.json();
        noteCardsCache.set(noteId, { data, timestamp: Date.now() });
        if (isMounted) {
          setCards(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Không tải được danh sách thẻ nhớ");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCards();
    return () => {
      isMounted = false;
    };
  }, [noteId, propCards]);

  return (
    <div
      data-testid="note-card-list-section"
      className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            Thẻ nhớ liên kết ({cards.length})
          </h3>
        </div>

        {onCreateCardClick && (
          <button
            type="button"
            onClick={onCreateCardClick}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-amber-300 dark:border-amber-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thẻ</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="p-4 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Đang nạp danh sách thẻ nhớ...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Không tải được danh sách thẻ nhớ: {error}</span>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="p-5 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center space-y-2.5">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Chưa có thẻ nào được tạo từ ghi chú này. Bôi đen văn bản phía trên để tạo ngay!
          </p>
          {onCreateCardClick && (
            <button
              type="button"
              onClick={onCreateCardClick}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo thẻ đầu tiên</span>
            </button>
          )}
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cards.map((card) => {
            const repetitions = card.schedule?.repetitions || 0;
            const isCloze = card.type === "cloze";

            return (
              <div
                key={card.id}
                role="listitem"
                data-testid={`note-card-item-${card.id}`}
                onClick={() => onSelectCard?.(card)}
                className="p-3 bg-stone-50 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800/80 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl transition cursor-pointer space-y-1.5 group shadow-2xs"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      isCloze
                        ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {isCloze ? "Cloze" : "Basic"}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400 font-mono">
                    Đã ôn: {repetitions} lần
                  </span>
                </div>

                <p className="text-xs font-medium text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug">
                  {card.front}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

NoteCardListSection.clearCache = clearNoteCardsCache;
