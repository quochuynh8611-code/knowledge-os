import React, { useEffect, useState, useCallback } from "react";
import { useData } from "../../context/DataContext";
import type { FlashcardProgressStats } from "../../types/flashcard";
import {
  Brain,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Flame,
  TrendingUp,
} from "lucide-react";

export interface DailyDueReviewWidgetProps {
  className?: string;
  onStartReview?: () => void;
}

/**
 * DailyDueReviewWidget: Habit-forming daily active recall card on DashboardHome.
 * Provides a 1-click trigger to launch FlashcardReviewStudio for all due cards.
 */
export function DailyDueReviewWidget({
  className = "",
  onStartReview,
}: DailyDueReviewWidgetProps) {
  const { openFlashcardReview } = useData();
  const [stats, setStats] = useState<FlashcardProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards/progress");
      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu (${res.status})`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Không thể kết nối máy chủ"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    const handleUpdate = () => {
      fetchProgress();
    };
    window.addEventListener("flashcard-updated", handleUpdate);
    return () => window.removeEventListener("flashcard-updated", handleUpdate);
  }, [fetchProgress]);

  const handleLaunchReview = () => {
    if (onStartReview) {
      onStartReview();
    } else if (openFlashcardReview) {
      openFlashcardReview(null, "review");
    }
  };

  // 1. Loading Skeleton
  if (loading) {
    return (
      <div
        data-testid="daily-due-review-widget"
        className={`p-4 sm:p-5 rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-stone-200 dark:bg-stone-800 rounded-md" />
            <div className="h-6 w-48 bg-stone-200 dark:bg-stone-800 rounded-lg" />
          </div>
          <div className="h-10 w-36 bg-stone-200 dark:bg-stone-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Error Fallback State (Non-blocking)
  if (error || !stats) {
    return (
      <div
        data-testid="daily-due-review-widget"
        className={`rounded-2xl border ${className}`}
      >
        <div
          data-testid="daily-due-error-state"
          className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/80 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                Chưa thể nạp số lượng thẻ ôn tập hôm nay
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                {error || "Lỗi nạp dữ liệu"}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-daily-due-retry"
            onClick={fetchProgress}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      </div>
    );
  }

  const hasDueCards = stats.dueToday > 0;

  // 3. All-Caught-Up State (dueToday === 0)
  if (!hasDueCards) {
    return (
      <div
        data-testid="daily-due-review-widget"
        className={`p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-500/10 via-stone-50/90 to-stone-100/50 dark:from-emerald-950/30 dark:via-stone-900/90 dark:to-stone-950 border border-emerald-300/50 dark:border-emerald-800/60 shadow-2xs ${className}`}
      >
        <div
          data-testid="daily-due-all-caught-up"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/15 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Mục tiêu hàng ngày
                </span>
                {stats.streakDays > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>{stats.streakDays} ngày liên tiếp</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                Đã hoàn tất mục tiêu hôm nay
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Không có thẻ đến hạn. Toàn bộ {stats.totalCards} thẻ trong kho tri thức đều đang ở trạng thái ghi nhớ tốt!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-xs font-semibold border border-stone-200 dark:border-stone-700">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Độ bền: {stats.retentionRate}%</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Actionable State (dueToday > 0)
  return (
    <div
      data-testid="daily-due-review-widget"
      className={`p-4 sm:p-5 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-50/60 to-stone-50/80 dark:from-amber-950/30 dark:via-stone-900/90 dark:to-stone-950 border border-amber-300/60 dark:border-amber-800/70 shadow-2xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Due Info & Badges */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Brain className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wide border border-amber-300 dark:border-amber-800">
                <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                <span>Cần ôn hôm nay</span>
              </span>

              <span
                data-testid="daily-due-estimate"
                className="text-[11px] text-stone-600 dark:text-stone-400 font-medium flex items-center gap-1"
              >
                <span>Ước tính ~5 phút</span>
              </span>

              {stats.streakDays > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 text-[10px] font-bold">
                  <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  <span>Streak {stats.streakDays} ngày</span>
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Có{" "}
                <span
                  data-testid="daily-due-count"
                  className="text-amber-800 dark:text-amber-400 font-mono text-xl sm:text-2xl font-black tabular-nums"
                >
                  {stats.dueToday}
                </span>{" "}
                thẻ đến hạn ôn tập
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Duy trì nhịp Spaced Repetition (Active Recall) để củng cố trí nhớ dài hạn.
            </p>
          </div>
        </div>

        {/* Right: 1-Click CTA Launch Button */}
        <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            data-testid="btn-daily-due-review"
            onClick={handleLaunchReview}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 hover:bg-amber-800 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer border border-amber-800/80"
            title="Kích hoạt ngay phiên ôn tập thẻ đến hạn toàn vault"
          >
            <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
            <span>Ôn tập ngay 5 phút</span>
          </button>
        </div>
      </div>
    </div>
  );
}
