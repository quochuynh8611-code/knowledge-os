import React, { useEffect, useState } from "react";
import type { FlashcardProgressStats } from "../../types/flashcard";
import {
  Brain,
  Sparkles,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export interface FlashcardAnalyticsWidgetProps {
  topicId?: string;
}

/**
 * FlashcardAnalyticsWidget displays active recall and memory retention metrics.
 */
export function FlashcardAnalyticsWidget({
  topicId,
}: FlashcardAnalyticsWidgetProps) {
  const [stats, setStats] = useState<FlashcardProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const url = topicId
      ? `/api/flashcards/progress?topicId=${encodeURIComponent(topicId)}`
      : "/api/flashcards/progress";

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load analytics (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 animate-pulse">
        <div className="h-6 w-48 bg-stone-200 dark:bg-stone-800 rounded-md mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-stone-200 dark:bg-stone-800 rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        data-testid="analytics-error-state"
        className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-3 text-rose-800 dark:text-rose-300"
      >
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">Không thể nạp dữ liệu thống kê ôn tập</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
            {error || "Lỗi kết nối cơ sở dữ liệu"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Tiến Độ Ôn Tập Ngắt Quãng (Spaced Repetition)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Chỉ số ghi nhớ và hàng đợi thẻ học bản địa
            </p>
          </div>
        </div>

        {/* Retention Rate Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-right">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block leading-tight">
              Độ bền trí nhớ
            </span>
            <span
              data-testid="stat-retention-rate"
              className="text-base font-bold text-emerald-900 dark:text-emerald-200"
            >
              {stats.retentionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Cards */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
            <span>Tổng số thẻ</span>
            <BookOpen className="w-4 h-4 text-stone-400" />
          </div>
          <span
            data-testid="stat-total-cards"
            className="text-2xl font-bold text-stone-900 dark:text-stone-100"
          >
            {stats.totalCards}
          </span>
        </div>

        {/* Due Today */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs mb-1">
            <span>Cần ôn hôm nay</span>
            <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span
            data-testid="stat-due-today"
            className="text-2xl font-bold text-amber-900 dark:text-amber-200"
          >
            {stats.dueToday}
          </span>
        </div>

        {/* New Cards */}
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs mb-1">
            <span>Thẻ mới</span>
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span
            data-testid="stat-new-cards"
            className="text-2xl font-bold text-sky-900 dark:text-sky-200"
          >
            {stats.newCards}
          </span>
        </div>

        {/* Learning */}
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs mb-1">
            <span>Đang học</span>
            <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span
            data-testid="stat-learning-cards"
            className="text-2xl font-bold text-purple-900 dark:text-purple-200"
          >
            {stats.learningCards}
          </span>
        </div>

        {/* Review */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs mb-1">
            <span>Đã thành thục</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span
            data-testid="stat-review-cards"
            className="text-2xl font-bold text-emerald-900 dark:text-emerald-200"
          >
            {stats.reviewCards}
          </span>
        </div>
      </div>
    </div>
  );
}
