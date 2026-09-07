import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Brain,
  History,
  AlertCircle,
} from "lucide-react";
import type {
  Flashcard,
  FlashcardReview,
  ReviewRating,
} from "../../types/flashcard";

export interface FlashcardReviewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcardId?: string;
  card?: Flashcard | null;
  initialReviews?: FlashcardReview[];
}

export function FlashcardReviewHistoryModal({
  isOpen,
  onClose,
  flashcardId,
  card: propCard,
  initialReviews,
}: FlashcardReviewHistoryModalProps) {
  const [card, setCard] = useState<Flashcard | null>(propCard || null);
  const [reviews, setReviews] = useState<FlashcardReview[]>(
    initialReviews || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveCardId = propCard?.id || flashcardId || card?.id;

  // Sync propCard when changed
  useEffect(() => {
    if (propCard) {
      setCard(propCard);
    }
  }, [propCard]);

  // Fetch card and review history
  useEffect(() => {
    if (!isOpen || !effectiveCardId) return;

    let isMounted = true;

    const loadHistoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch card if not available
        if (!propCard && flashcardId) {
          const cardRes = await fetch(`/api/flashcards/${flashcardId}`);
          if (cardRes.ok && isMounted) {
            const cardData = await cardRes.json();
            setCard(cardData);
          }
        }

        // Use initialReviews if provided (even if empty)
        if (initialReviews !== undefined) {
          setReviews(initialReviews);
        } else {
          const revRes = await fetch(
            `/api/flashcards/${effectiveCardId}/reviews`
          );
          if (revRes.ok && isMounted) {
            const revData = await revRes.json();
            setReviews(Array.isArray(revData) ? revData : []);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Không thể tải lịch sử ôn tập"
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHistoryData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveCardId, propCard, flashcardId, initialReviews]);

  if (!isOpen) return null;

  const schedule = card?.schedule;

  const getRatingBadge = (rating: ReviewRating) => {
    switch (rating) {
      case 1:
        return {
          label: "Again (Quên) [1]",
          bg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900/60",
        };
      case 2:
        return {
          label: "Hard (Khó) [2]",
          bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-900/60",
        };
      case 3:
        return {
          label: "Good (Nhớ) [3]",
          bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60",
        };
      case 4:
        return {
          label: "Easy (Dễ) [4]",
          bg: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-900/60",
        };
      default:
        return {
          label: "Unknown",
          bg: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200",
        };
    }
  };

  return (
    <div
      data-testid="modal-card-history"
      role="dialog"
      aria-label="Lịch sử Ôn tập Thẻ Nhớ"
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Lịch sử Ôn tập Thẻ Nhớ
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Mã thẻ:{" "}
                <code className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-[11px]">
                  {effectiveCardId}
                </code>
              </p>
            </div>
          </div>
          <button
            data-testid="btn-close-history"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Card Content Preview */}
          {card && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Mặt trước (Câu hỏi)
                </span>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mt-0.5">
                  {card.front}
                </p>
              </div>
              <div className="border-t border-stone-200/60 dark:border-stone-700/60 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Mặt sau (Đáp án)
                </span>
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5 whitespace-pre-wrap">
                  {card.back}
                </p>
              </div>
            </div>
          )}

          {/* Current SRS Parameters */}
          <div>
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2.5 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Thông số SRS hiện tại
            </h4>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">
                  Khoảng cách
                </span>
                <span
                  data-testid="history-stat-interval"
                  className="text-base font-bold font-mono text-stone-900 dark:text-stone-100"
                >
                  {schedule?.interval ?? 0}d
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">
                  Độ dễ (Ease)
                </span>
                <span
                  data-testid="history-stat-ease"
                  className="text-base font-bold font-mono text-stone-900 dark:text-stone-100"
                >
                  {(schedule?.easeFactor ?? 2.5).toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">
                  Lần nhớ liên tiếp
                </span>
                <span
                  data-testid="history-stat-repetitions"
                  className="text-base font-bold font-mono text-stone-900 dark:text-stone-100"
                >
                  {schedule?.repetitions ?? 0}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">
                  Lần quên (Lapses)
                </span>
                <span
                  data-testid="history-stat-lapses"
                  className="text-base font-bold font-mono text-stone-900 dark:text-stone-100"
                >
                  {schedule?.lapses ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Review History Events Timeline */}
          <div>
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              Dòng thời gian các lượt ôn tập ({reviews.length})
            </h4>

            {loading ? (
              <div className="p-8 text-center text-xs text-stone-400 animate-pulse">
                Đang tải lịch sử ôn tập...
              </div>
            ) : reviews.length === 0 ? (
              <div
                data-testid="empty-history-timeline"
                className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl"
              >
                Chưa có lượt ôn tập nào được ghi nhận cho thẻ này.
              </div>
            ) : (
              <div className="space-y-2.5" data-testid="review-history-timeline">
                {reviews.map((rev) => {
                  const badge = getRatingBadge(rev.rating);
                  const durationSec = (
                    (rev.reviewDurationMs || 0) / 1000
                  ).toFixed(1);
                  return (
                    <div
                      key={rev.id}
                      data-testid={`review-item-${rev.id}`}
                      className="p-3.5 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          data-testid={`badge-rating-${rev.id}`}
                          className={`px-2.5 py-1 rounded-xl font-bold border text-[11px] shrink-0 ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-stone-700 dark:text-stone-300">
                            <span data-testid={`transition-${rev.id}`}>
                              {rev.stateBefore}{" "}
                              <span className="text-stone-400">→</span>{" "}
                              {rev.stateAfter}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700 mx-1">
                              •
                            </span>
                            <span>
                              {rev.intervalBefore}d → {rev.intervalAfter}d
                            </span>
                            <span className="text-stone-300 dark:text-stone-700 mx-1">
                              •
                            </span>
                            <span>
                              Ease: {rev.easeFactorBefore?.toFixed(2)} →{" "}
                              {rev.easeFactorAfter?.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-1">
                            {new Date(rev.reviewedAt).toLocaleString("vi-VN")} •{" "}
                            Thời lượng: {durationSec}s
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex justify-end">
          <button
            type="button"
            data-testid="btn-close-history-footer"
            onClick={onClose}
            className="px-5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
