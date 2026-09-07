import React, { useState, useEffect } from "react";
import { X, Clock, Brain, ArrowRight, History, Zap, CheckCircle2, RotateCcw } from "lucide-react";
import type { Flashcard, FlashcardReview, ReviewRating } from "../../types/flashcard";

export interface CardReviewHistoryModalProps {
  isOpen: boolean;
  card: Flashcard | null;
  initialReviews?: FlashcardReview[];
  onClose: () => void;
}

export function CardReviewHistoryModal({
  isOpen,
  card,
  initialReviews,
  onClose,
}: CardReviewHistoryModalProps) {
  const [reviews, setReviews] = useState<FlashcardReview[]>(initialReviews || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !card) return;

    if (initialReviews && initialReviews.length > 0) {
      setReviews(initialReviews);
      return;
    }

    let isMounted = true;
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/flashcards/${card.id}/reviews`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setReviews(data);
        }
      } catch {
        // safe fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [isOpen, card, initialReviews]);

  if (!isOpen || !card) return null;

  const schedule = card.schedule;

  const getRatingBadge = (rating: ReviewRating) => {
    switch (rating) {
      case 1:
        return { label: "Again (Quên)", bg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200" };
      case 2:
        return { label: "Hard (Khó)", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200" };
      case 3:
        return { label: "Good (Nhớ)", bg: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200" };
      case 4:
        return { label: "Easy (Dễ)", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200" };
      default:
        return { label: "Unknown", bg: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200" };
    }
  };

  return (
    <div
      data-testid="modal-card-history"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Lịch sử Ôn tập Thẻ Nhớ
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Mã thẻ: <code className="font-mono">{card.id}</code>
              </p>
            </div>
          </div>
          <button
            data-testid="btn-close-history"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card Content Preview */}
          <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 rounded-xl space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Mặt trước (Câu hỏi / Gợi ý)
              </span>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mt-0.5">
                {card.front}
              </p>
            </div>
            <div className="border-t border-stone-200/60 dark:border-stone-700/60 pt-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Mặt sau (Đáp án / Luận giải)
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5 whitespace-pre-wrap">
                {card.back}
              </p>
            </div>
          </div>

          {/* Current SRS Parameters */}
          <div>
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Thông số SRS hiện tại
            </h4>
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">Khoảng cách (Ngày)</span>
                <span data-testid="history-stat-interval" className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                  {schedule?.interval ?? 0}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">Độ dễ (Ease)</span>
                <span data-testid="history-stat-ease" className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                  {(schedule?.easeFactor ?? 2.5).toFixed(1)}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">Lần nhớ liên tiếp</span>
                <span data-testid="history-stat-repetitions" className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                  {schedule?.repetitions ?? 0}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-center">
                <span className="text-[10px] text-stone-500 block">Lần quên (Lapses)</span>
                <span data-testid="history-stat-lapses" className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
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
              <div className="p-6 text-center text-xs text-stone-400">Đang tải lịch sử...</div>
            ) : reviews.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                Chưa có lượt ôn tập nào được ghi nhận cho thẻ này.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((rev) => {
                  const badge = getRatingBadge(rev.rating);
                  const durationSec = ((rev.reviewDurationMs || 0) / 1000).toFixed(1);
                  return (
                    <div
                      key={rev.id}
                      data-testid={`review-item-${rev.id}`}
                      className="p-3 bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          data-testid={`badge-rating-${rev.id}`}
                          className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <div>
                          <div className="flex items-center gap-1 font-mono text-stone-700 dark:text-stone-300">
                            <span data-testid={`transition-${rev.id}`}>
                              {rev.stateBefore} <span className="text-stone-400">→</span> {rev.stateAfter}
                            </span>
                            <span className="text-stone-400 mx-1">|</span>
                            <span>{rev.intervalBefore}d → {rev.intervalAfter}d</span>
                            <span className="text-stone-400 mx-1">|</span>
                            <span>Ease: {rev.easeFactorBefore?.toFixed(2)} → {rev.easeFactorAfter?.toFixed(2)}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {new Date(rev.reviewedAt).toLocaleString("vi-VN")} • {durationSec}s
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
        <div className="px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
