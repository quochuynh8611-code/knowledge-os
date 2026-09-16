import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  calculateRetentionRate,
  calculateWorkloadForecast,
  getWeakCardsMetrics,
  calculateLapseTrend,
  calculateOverviewMetrics,
  generateActionableInsights,
  type DailyWorkloadForecast,
  type ActionableInsight,
} from "../../lib/flashcardAnalyticsLogic";
import {
  getDailyNewLimit,
  setDailyNewLimit,
  getNewCardsLearnedToday,
} from "../../lib/studySessionLogic";
import { useData } from "../../context/DataContext";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Coffee,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  Sliders,
} from "lucide-react";

export interface FlashcardAnalyticsDashboardProps {
  topicId?: string;
  cards?: Flashcard[];
  reviews?: FlashcardReview[];
  onLaunchSession?: (sessionType: "review" | "new" | "weak" | "cram") => void;
}

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
      openFlashcardReview: undefined,
      openStudyLauncher: undefined,
      openCardBrowser: undefined,
    };
  }
}

export function FlashcardAnalyticsDashboard({
  topicId,
  cards: propCards,
  reviews: propReviews,
  onLaunchSession,
}: FlashcardAnalyticsDashboardProps) {
  const { topics, openFlashcardReview, openStudyLauncher, openCardBrowser } =
    useSafeData();

  const [internalCards, setInternalCards] = useState<Flashcard[]>(propCards || []);
  const [internalReviews, setInternalReviews] = useState<FlashcardReview[]>(
    propReviews || []
  );
  const [loading, setLoading] = useState(!propCards);
  const [forecastDays, setForecastDays] = useState<7 | 30>(7);
  const [dailyLimit, setDailyLimitState] = useState<number>(getDailyNewLimit());
  const [learnedToday, setLearnedToday] = useState<number>(getNewCardsLearnedToday());
  const [showLimitModal, setShowLimitModal] = useState(false);

  const topicTitle = useMemo(() => {
    if (!topicId) return null;
    return topics?.find((t) => t.id === topicId)?.title || null;
  }, [topicId, topics]);

  // Load data from APIs if not supplied via props
  useEffect(() => {
    if (propCards) {
      setInternalCards(propCards);
    }
    if (propReviews) {
      setInternalReviews(propReviews);
    }
    if (propCards && propReviews) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const cardsUrl = topicId
          ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards";

        const resCards = await fetch(cardsUrl);
        if (resCards.ok && isMounted) {
          const cardsData = await resCards.json();
          setInternalCards(cardsData);
        }

        // Fetch recent reviews if endpoint available, or fallback gracefully
        const reviewsUrl = topicId
          ? `/api/flashcards/reviews?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards/reviews";

        try {
          const resReviews = await fetch(reviewsUrl);
          if (resReviews.ok && isMounted) {
            const reviewsData = await resReviews.json();
            setInternalReviews(reviewsData);
          }
        } catch {
          // Reviews endpoint optional; fallback to empty
        }
      } catch (err) {
        console.error("Failed to load flashcard analytics data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [topicId, propCards, propReviews]);

  // Calculations
  const overview = useMemo(() => {
    return calculateOverviewMetrics(
      internalCards,
      internalReviews,
      dailyLimit,
      learnedToday,
      new Date(),
      topicId
    );
  }, [internalCards, internalReviews, dailyLimit, learnedToday, topicId]);

  const forecast = useMemo(() => {
    return calculateWorkloadForecast(
      internalCards,
      forecastDays,
      new Date(),
      topicId
    );
  }, [internalCards, forecastDays, topicId]);

  const weakMetrics = useMemo(() => {
    return getWeakCardsMetrics(internalCards, topicId);
  }, [internalCards, topicId]);

  const lapseTrend = useMemo(() => {
    return calculateLapseTrend(internalReviews, 7, new Date(), topicId);
  }, [internalReviews, topicId]);

  const insights = useMemo(() => {
    return generateActionableInsights(overview, forecast, lapseTrend);
  }, [overview, forecast, lapseTrend]);

  // CTA Action Handlers
  const handleLaunchSession = useCallback(
    (type: "review" | "new" | "weak" | "cram") => {
      if (onLaunchSession) {
        onLaunchSession(type);
      } else if (openFlashcardReview) {
        openFlashcardReview(topicId || null, type);
      }
    },
    [onLaunchSession, openFlashcardReview, topicId]
  );

  const handleUpdateLimit = useCallback(
    (newLimit: number) => {
      const clamped = Math.max(1, Math.min(200, newLimit));
      setDailyNewLimit(clamped);
      setDailyLimitState(clamped);
      setShowLimitModal(false);
    },
    []
  );

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-stone-200 dark:bg-stone-800 rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  // Calculate maximum count in forecast for SVG scaling
  const maxForecastCount = Math.max(...forecast.map((f) => f.count), 5);

  return (
    <div
      data-testid="flashcard-analytics-dashboard"
      className="p-4 md:p-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <span>Phân Tích &amp; Dự Báo Ôn Tập</span>
            </h1>
            {topicTitle && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {topicTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Đo lường độ bền trí nhớ, phân bổ tải học và khuyến nghị hành động tối ưu theo SM-2
          </p>
        </div>

        <div className="flex items-center gap-2">
          {openStudyLauncher && (
            <button
              onClick={() => openStudyLauncher(topicId || null)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              Trung tâm học tập
            </button>
          )}
          {openCardBrowser && (
            <button
              onClick={() => openCardBrowser(topicId || null)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              Danh sách thẻ
            </button>
          )}
        </div>
      </div>

      {/* Actionable Insights Panel */}
      <div
        data-testid="actionable-insights-panel"
        className="space-y-2.5"
      >
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Khuyến Nghị Hành Động (Actionable Insights)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => {
            const isUrgent = insight.severity === "urgent";
            const isWarning = insight.severity === "warning";
            const isSuccess = insight.severity === "success";

            return (
              <div
                key={insight.id}
                data-testid={`insight-card-${insight.type}`}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isUrgent
                    ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                    : isWarning
                    ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60"
                    : isSuccess
                    ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
                    : "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isUrgent && (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    {isWarning && (
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    {isSuccess && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <h3
                      className={`text-xs font-bold ${
                        isUrgent
                          ? "text-rose-950 dark:text-rose-200"
                          : isWarning
                          ? "text-amber-950 dark:text-amber-200"
                          : isSuccess
                          ? "text-emerald-950 dark:text-emerald-200"
                          : "text-blue-950 dark:text-blue-200"
                      }`}
                    >
                      {insight.title}
                    </h3>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isUrgent
                        ? "text-rose-800 dark:text-rose-300"
                        : isWarning
                        ? "text-amber-800 dark:text-amber-300"
                        : isSuccess
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-blue-800 dark:text-blue-300"
                    }`}
                  >
                    {insight.description}
                  </p>
                </div>

                {insight.ctaText && (
                  <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex justify-end">
                    {insight.ctaAction === "launch_review" && (
                      <button
                        data-testid="btn-cta-review"
                        onClick={() => handleLaunchSession("review")}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <span>{insight.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {insight.ctaAction === "launch_weak" && (
                      <button
                        data-testid="btn-cta-weak"
                        onClick={() => handleLaunchSession("weak")}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-800 hover:bg-amber-900 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <span>{insight.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {insight.ctaAction === "adjust_limit" && (
                      <button
                        data-testid="btn-cta-adjust-limit"
                        onClick={() => setShowLimitModal(true)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-800 hover:bg-amber-900 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <span>{insight.ctaText}</span>
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {insight.ctaAction === "take_break" && (
                      <button
                        data-testid="btn-cta-take-break"
                        onClick={() => setShowLimitModal(true)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-stone-700 hover:bg-stone-800 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <Coffee className="w-3.5 h-3.5" />
                        <span>{insight.ctaText}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Cards */}
        <div
          data-testid="stat-total-cards"
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Tổng số thẻ</span>
            <Layers className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {overview.totalCards}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 flex gap-2">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {overview.activeCards} active
            </span>
            <span>•</span>
            <span className="text-stone-400">
              {overview.suspendedCards} suspended
            </span>
          </div>
        </div>

        {/* Due & Overdue */}
        <div
          data-testid="stat-due-overdue"
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Cần ôn tập</span>
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300">
            {overview.dueToday}
          </div>
          <div className="text-[11px] mt-1.5 flex items-center justify-between">
            <span
              className={
                overview.overdue > 0
                  ? "text-rose-700 dark:text-rose-400 font-semibold"
                  : "text-stone-400"
              }
            >
              {overview.overdue} thẻ quá hạn
            </span>
            {overview.dueToday > 0 && (
              <button
                onClick={() => handleLaunchSession("review")}
                className="text-amber-800 hover:text-amber-900 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
              >
                Ôn ngay
              </button>
            )}
          </div>
        </div>

        {/* New Cards Learned Today */}
        <div
          data-testid="stat-new-learned"
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Thẻ mới hôm nay</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-800 dark:text-blue-300">
            {overview.newCardsLearnedToday}
            <span className="text-xs font-normal text-stone-400 ml-1.5">
              / {overview.dailyNewLimit}
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 flex items-center justify-between">
            <span>
              Còn {Math.max(0, overview.dailyNewLimit - overview.newCardsLearnedToday)}{" "}
              thẻ
            </span>
            <button
              onClick={() => setShowLimitModal(true)}
              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:underline cursor-pointer"
            >
              Sửa limit
            </button>
          </div>
        </div>

        {/* Retention Rate */}
        <div
          data-testid="stat-retention"
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Tỷ lệ nhớ (7 ngày)</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
            {overview.retention7d}%
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 flex gap-2">
            <span>30d: {overview.retention30d}%</span>
            <span>•</span>
            <span>All: {overview.retentionAllTime}%</span>
          </div>
        </div>
      </div>

      {/* Forecast Workload Bar Chart */}
      <div
        data-testid="forecast-workload-chart"
        className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Dự Báo Khối Lượng Ôn Tập (Workload Forecast)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Phân bổ số thẻ đến hạn trong {forecastDays} ngày tới dựa trên thuật toán SM-2
            </p>
          </div>

          {/* Timeframe Switcher */}
          <div className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800 rounded-xl self-start border border-stone-200/80 dark:border-stone-700">
            <button
              data-testid="btn-forecast-7d"
              onClick={() => setForecastDays(7)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                forecastDays === 7
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              7 ngày
            </button>
            <button
              data-testid="btn-forecast-30d"
              onClick={() => setForecastDays(30)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                forecastDays === 30
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              30 ngày
            </button>
          </div>
        </div>

        {/* Lightweight SVG Bar Chart */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[600px] h-44 flex items-end gap-2 border-b border-stone-200 dark:border-stone-800 pt-6 px-2">
            {forecast.map((point) => {
              const heightPercent =
                maxForecastCount > 0
                  ? Math.max(8, Math.round((point.count / maxForecastCount) * 100))
                  : 8;

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] font-semibold pointer-events-none whitespace-nowrap z-10">
                    {point.count} thẻ ({point.dateFormatted})
                  </div>

                  {/* Count above bar if count > 0 */}
                  {point.count > 0 && (
                    <span className="text-[10px] font-bold font-mono text-stone-600 dark:text-stone-400">
                      {point.count}
                    </span>
                  )}

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      point.isToday
                        ? "bg-amber-700 hover:bg-amber-800 shadow-2xs"
                        : point.count > 40
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-stone-300 dark:bg-stone-700 hover:bg-amber-600 dark:hover:bg-amber-500"
                    }`}
                  />

                  {/* Day Label */}
                  <span
                    className={`text-[10px] truncate max-w-full ${
                      point.isToday
                        ? "font-bold text-amber-800 dark:text-amber-400"
                        : "text-stone-400"
                    }`}
                  >
                    {point.isToday ? "Nay" : point.dateFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weak Cards & Lapse Trend Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weak Cards Panel */}
        <div
          data-testid="weak-cards-panel"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Thẻ Yếu &amp; Khó Nhớ</span>
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {weakMetrics.count} thẻ ({weakMetrics.percentage}%)
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Thẻ có từ 3 lần quên trở lên hoặc hệ số dễ (Ease Factor) ≤ 2.0
            </p>

            {/* List Preview */}
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {weakMetrics.weakCards.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-center text-xs text-stone-500 dark:text-stone-400">
                  Tuyệt vời! Không có thẻ yếu nào trong kho lưu trữ này.
                </div>
              ) : (
                weakMetrics.weakCards.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50 flex items-center justify-between text-xs"
                  >
                    <span className="truncate max-w-[220px] font-medium text-stone-800 dark:text-stone-200">
                      {c.front}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                      <span>Quên: {c.schedule?.lapses || 0}</span>
                      <span>•</span>
                      <span>EF: {c.schedule?.easeFactor?.toFixed(2) || "2.50"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {weakMetrics.count > 0 && (
            <button
              onClick={() => handleLaunchSession("weak")}
              className="w-full py-2 px-3.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <span>Ôn tập {weakMetrics.count} thẻ yếu ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Lapse Trend Panel */}
        <div
          data-testid="lapse-trend-panel"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Xu Hướng Quên Thẻ (Lapse Trend)</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                  lapseTrend.isSpike
                    ? "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
              >
                {lapseTrend.currentPeriodLapses} lần quên (7 ngày)
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Theo dõi số lần đánh giá "Again" (rating = 1) theo thời gian
            </p>

            {/* Daily lapse bars */}
            <div className="mt-4 flex items-end gap-2.5 h-24 border-b border-stone-200 dark:border-stone-800 pb-2 px-1">
              {lapseTrend.dailyPoints.map((pt) => {
                const height =
                  pt.lapses > 0 ? Math.min(100, Math.max(16, pt.lapses * 20)) : 8;
                return (
                  <div
                    key={pt.date}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                  >
                    {pt.lapses > 0 && (
                      <span className="text-[10px] font-bold font-mono text-rose-600 dark:text-rose-400">
                        {pt.lapses}
                      </span>
                    )}
                    <div
                      style={{ height: `${height}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        pt.lapses > 0
                          ? "bg-rose-500 hover:bg-rose-600"
                          : "bg-stone-200 dark:bg-stone-800"
                      }`}
                    />
                    <span className="text-[10px] text-stone-400 truncate">
                      {pt.dateFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>
              So với chu kỳ trước:{" "}
              <strong
                className={
                  lapseTrend.percentChange > 0
                    ? "text-rose-700 dark:text-rose-400 font-mono"
                    : "text-emerald-700 dark:text-emerald-400 font-mono"
                }
              >
                {lapseTrend.percentChange > 0 ? "+" : ""}
                {lapseTrend.percentChange}%
              </strong>
            </span>
            {lapseTrend.isSpike && (
              <span className="text-rose-700 font-semibold text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Cảnh báo tăng đột biến
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Adjust Daily Limit Modal */}
      {showLimitModal && (
        <div
          data-testid="adjust-limit-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>Điều Chỉnh Hạn Mức Thẻ Mới</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Giảm lượng thẻ mới mỗi ngày giúp bạn tập trung ôn tập thẻ cũ và tránh quá tải nhận thức.
            </p>

            <div className="flex items-center justify-center gap-3 py-2">
              <button
                onClick={() => handleUpdateLimit(dailyLimit - 5)}
                className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                -5
              </button>
              <span className="text-xl font-extrabold font-mono text-stone-900 dark:text-stone-100">
                {dailyLimit}
              </span>
              <button
                onClick={() => handleUpdateLimit(dailyLimit + 5)}
                className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                +5
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLimitModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
