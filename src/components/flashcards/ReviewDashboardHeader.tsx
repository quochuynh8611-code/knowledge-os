import React from "react";
import type { FlashcardProgressStats } from "../../types/flashcard";
import { Clock, Sparkles, Brain, Flame } from "lucide-react";

export interface ReviewDashboardHeaderProps {
  stats?: FlashcardProgressStats | null;
  dueToday?: number;
  newCards?: number;
  retentionRate?: number;
  streakDays?: number;
  loading?: boolean;
  topicTitle?: string | null;
  className?: string;
}

/**
 * ReviewDashboardHeader displays a high-level statistical overview of flashcard readiness:
 * - Due Today count
 * - New Cards count
 * - Overall Retention Rate percentage
 * - Consecutive review streak in days
 */
export function ReviewDashboardHeader({
  stats,
  dueToday: propDueToday,
  newCards: propNewCards,
  retentionRate: propRetentionRate,
  streakDays: propStreakDays,
  loading = false,
  topicTitle,
  className = "",
}: ReviewDashboardHeaderProps) {
  const resolvedDueToday = propDueToday ?? stats?.dueToday ?? 0;
  const resolvedNewCards = propNewCards ?? stats?.newCards ?? 0;
  const resolvedRetention = propRetentionRate ?? stats?.retentionRate ?? 100;
  const resolvedStreak = propStreakDays ?? stats?.streakDays ?? 0;

  if (loading) {
    return (
      <div
        data-testid="review-dashboard-header-skeleton"
        className={`grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse ${className}`}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 h-20 flex flex-col justify-between"
          >
            <div className="w-16 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="w-10 h-6 bg-stone-300 dark:bg-stone-600 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="review-dashboard-header"
      className={`space-y-2 ${className}`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Due Today */}
        <div
          data-testid="header-stat-due-today"
          className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
              Cần ôn tập
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center text-amber-800 dark:text-amber-300">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              data-testid="value-due-today"
              className="text-2xl font-black font-mono tracking-tight text-amber-950 dark:text-amber-100"
            >
              {resolvedDueToday}
            </span>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400 font-medium">
              thẻ
            </span>
          </div>
        </div>

        {/* 2. New Cards */}
        <div
          data-testid="header-stat-new-cards"
          className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
              Thẻ mới
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              data-testid="value-new-cards"
              className="text-2xl font-black font-mono tracking-tight text-emerald-950 dark:text-emerald-100"
            >
              {resolvedNewCards}
            </span>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400 font-medium">
              chưa học
            </span>
          </div>
        </div>

        {/* 3. Retention Rate */}
        <div
          data-testid="header-stat-retention-rate"
          className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-sky-700 dark:text-sky-400 uppercase">
              Tỷ lệ nhớ
            </span>
            <div className="w-6 h-6 rounded-lg bg-sky-200/60 dark:bg-sky-900/60 flex items-center justify-center text-sky-800 dark:text-sky-300">
              <Brain className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              data-testid="value-retention-rate"
              className="text-2xl font-black font-mono tracking-tight text-sky-950 dark:text-sky-100"
            >
              {resolvedRetention}%
            </span>
            <span className="text-[11px] text-sky-600/80 dark:text-sky-400 font-medium">
              chuẩn SM-2
            </span>
          </div>
        </div>

        {/* 4. Streak Days */}
        <div
          data-testid="header-stat-streak-days"
          className="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/60 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-orange-700 dark:text-orange-400 uppercase">
              Chuỗi ôn tập
            </span>
            <div className="w-6 h-6 rounded-lg bg-orange-200/60 dark:bg-orange-900/60 flex items-center justify-center text-orange-800 dark:text-orange-300">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              data-testid="value-streak-days"
              className="text-2xl font-black font-mono tracking-tight text-orange-950 dark:text-orange-100"
            >
              {resolvedStreak}
            </span>
            <span className="text-[11px] text-orange-600/80 dark:text-orange-400 font-medium">
              ngày liên tiếp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
