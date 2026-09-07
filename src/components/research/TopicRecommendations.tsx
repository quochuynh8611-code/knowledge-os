import React, { useState, useMemo } from "react";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import type { Topic } from "../../types/index";
import {
  getStudyRecommendations,
  type TimeBudgetMinutes,
  type TopicRecommendation,
} from "../../lib/studyRecommendationEngine";

export interface TopicRecommendationsProps {
  topics: Topic[];
  cards: Flashcard[];
  reviews: FlashcardReview[];
  lastCompletedTopicId?: string | null;
  examTargetDates?: Record<string, string>;
  onStartReview?: (topicId: string, suggestedCount: number) => void;
  className?: string;
}

export const TopicRecommendations: React.FC<TopicRecommendationsProps> = ({
  topics,
  cards,
  reviews,
  lastCompletedTopicId,
  examTargetDates,
  onStartReview,
  className = "",
}) => {
  const [timeBudget, setTimeBudget] = useState<TimeBudgetMinutes>(30);

  const recommendationResult = useMemo(() => {
    return getStudyRecommendations(topics, cards, reviews, {
      timeBudgetMinutes: timeBudget,
      lastCompletedTopicId,
      examTargetDates,
    });
  }, [topics, cards, reviews, timeBudget, lastCompletedTopicId, examTargetDates]);

  const { recommendedTopics, topRecommendation, totalDueCardsAcrossTopics } =
    recommendationResult;

  if (topics.length === 0) {
    return (
      <div className={`p-6 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center ${className}`}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chưa có chủ đề nào để gợi ý lộ trình học tập.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="topic-recommendations"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5 ${className}`}
    >
      {/* Header & Time Budget Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🎯</span> Gợi Ý Lộ Trình Học Tập (Study Recommendations)
            </h3>
            {totalDueCardsAcrossTopics > 0 && (
              <span
                data-testid="total-due-badge"
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              >
                {totalDueCardsAcrossTopics} thẻ đến hạn
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Xếp hạng đa tiêu chí: Thẻ đến hạn, Trí nhớ suy giảm, Kế hoạch thi cử và Quỹ thời gian
          </p>
        </div>

        {/* Time Budget Selector Pills */}
        <div
          data-testid="time-budget-selector"
          className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg self-start sm:self-auto"
        >
          {([15, 30, 60] as TimeBudgetMinutes[]).map((budget) => {
            const isActive = timeBudget === budget;
            return (
              <button
                key={`budget-${budget}`}
                type="button"
                onClick={() => setTimeBudget(budget)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {budget} phút
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Recommendation Hero Card (Rank #1) */}
      {topRecommendation && (
        <div
          data-testid="top-recommendation-hero"
          className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border border-indigo-200 dark:border-indigo-800/70 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span
                  data-testid="next-best-topic-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs"
                >
                  <span>⭐</span> Khuyên học tiếp theo (Next Best Topic)
                </span>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Điểm ưu tiên: {Math.round(topRecommendation.compositeScore)}/100
                </span>
              </div>

              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {topRecommendation.topicTitle}
              </h4>

              {/* Explainable Rationale */}
              <p
                data-testid="top-recommendation-explanation"
                className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 leading-relaxed"
              >
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
                  Lý do đề xuất:
                </span>
                {topRecommendation.explanation}
              </p>

              {/* Metrics Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="px-2 py-1 rounded bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-medium">
                  {topRecommendation.metrics.dueCardsCount} thẻ cần ôn
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Tỷ lệ nhớ: {Math.round(topRecommendation.metrics.retentionRate * 100)}%
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Ước tính: ~{topRecommendation.metrics.estimatedMinutesNeeded} phút
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            {onStartReview && (
              <div className="sm:self-center">
                <button
                  type="button"
                  data-testid="start-review-top-btn"
                  onClick={() =>
                    onStartReview(
                      topRecommendation.topicId,
                      topRecommendation.suggestedCardBatchSize
                    )
                  }
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>Bắt đầu ôn tập ({topRecommendation.suggestedCardBatchSize} thẻ)</span>
                  <span>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subsequent Ranked Topics (Rank #2, #3, ...) */}
      {recommendedTopics.length > 1 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Các chủ đề ưu tiên tiếp theo
          </h4>

          <div className="space-y-2.5" data-testid="ranked-topics-list">
            {recommendedTopics.slice(1, 4).map((topicRec) => (
              <div
                key={`rec-${topicRec.topicId}`}
                data-testid={`topic-rec-card-${topicRec.topicId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    #{topicRec.rank}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {topicRec.topicTitle}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        Điểm: {Math.round(topicRec.compositeScore)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {topicRec.explanation}
                    </p>
                  </div>
                </div>

                {onStartReview && (
                  <button
                    type="button"
                    onClick={() =>
                      onStartReview(topicRec.topicId, topicRec.suggestedCardBatchSize)
                    }
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-lg transition-colors self-end sm:self-center shrink-0"
                  >
                    Ôn chủ đề này
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
