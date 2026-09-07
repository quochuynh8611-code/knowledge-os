import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Flashcard } from "../../types/flashcard";
import {
  type StudySessionType,
  getDueQueue,
  getNewQueue,
  getWeakQueue,
  getCramQueue,
  getDailyNewLimit,
  setDailyNewLimit,
  getNewCardsLearnedToday,
} from "../../lib/studySessionLogic";
import { useData } from "../../context/DataContext";
import {
  Clock,
  Sparkles,
  Flame,
  Zap,
  BookOpen,
  ArrowRight,
  Settings2,
  CheckCircle2,
  Layers,
  HelpCircle,
} from "lucide-react";

export interface StudyLauncherProps {
  topicId?: string;
  cards?: Flashcard[];
  onLaunchSession?: (sessionType: StudySessionType) => void;
  onOpenBrowser?: () => void;
}

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
      openFlashcardReview: undefined,
      openCardBrowser: undefined,
    };
  }
}

export function StudyLauncher({
  topicId,
  cards: propCards,
  onLaunchSession,
  onOpenBrowser,
}: StudyLauncherProps) {
  const { topics, openFlashcardReview, openCardBrowser } = useSafeData();
  const [internalCards, setInternalCards] = useState<Flashcard[]>(propCards || []);
  const [loading, setLoading] = useState(!propCards);
  const [dailyLimit, setDailyLimitState] = useState<number>(getDailyNewLimit());
  const [learnedToday, setLearnedToday] = useState<number>(getNewCardsLearnedToday());

  const topicTitle = useMemo(() => {
    if (!topicId) return null;
    return topics?.find((t) => t.id === topicId)?.title || null;
  }, [topicId, topics]);

  // Load cards from API if not provided via props
  useEffect(() => {
    if (propCards) {
      setInternalCards(propCards);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadCards() {
      setLoading(true);
      try {
        const url = topicId
          ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setInternalCards(Array.isArray(data) ? data : []);
          }
        }
      } catch {
        if (isMounted) setInternalCards([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCards();
    return () => {
      isMounted = false;
    };
  }, [propCards, topicId]);

  // Handle daily limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setDailyNewLimit(val);
      setDailyLimitState(getDailyNewLimit());
    }
  };

  // Derive queues
  const dueQueue = useMemo(
    () => getDueQueue(internalCards, { topicId }),
    [internalCards, topicId]
  );

  const newQueue = useMemo(
    () => getNewQueue(internalCards, { topicId, dailyNewLimit: dailyLimit }),
    [internalCards, topicId, dailyLimit]
  );

  const weakQueue = useMemo(
    () => getWeakQueue(internalCards, { topicId }),
    [internalCards, topicId]
  );

  const cramQueue = useMemo(
    () => getCramQueue(internalCards, { topicId, shuffle: false }),
    [internalCards, topicId]
  );

  const handleLaunch = useCallback(
    (type: StudySessionType) => {
      if (onLaunchSession) {
        onLaunchSession(type);
      } else if (openFlashcardReview) {
        openFlashcardReview(topicId || null, type);
      }
    },
    [onLaunchSession, openFlashcardReview, topicId]
  );

  const handleOpenBrowser = useCallback(() => {
    if (onOpenBrowser) {
      onOpenBrowser();
    } else if (openCardBrowser) {
      openCardBrowser(topicId || undefined);
    }
  }, [onOpenBrowser, openCardBrowser, topicId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6" data-testid="study-launcher">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Trung Tâm Khởi Tạo Ôn Tập
            </h1>
            {topicTitle && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {topicTitle}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Chọn chiến lược học tập thông minh phù hợp với mục tiêu và thời gian của bạn
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="btn-launcher-to-browser"
            onClick={handleOpenBrowser}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-stone-500" />
            <span>Danh sách thẻ</span>
          </button>
        </div>
      </div>

      {/* Daily New-Card Configuration Panel */}
      <div className="bg-gradient-to-r from-stone-50 to-amber-50/40 dark:from-stone-900/60 dark:to-stone-900/30 p-4 rounded-xl border border-stone-200 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Hạn Mức Thẻ Mới Hàng Ngày
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Đã học hôm nay: <strong className="text-emerald-600 dark:text-emerald-400">{learnedToday}</strong> thẻ
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="daily-limit-input" className="text-xs font-medium text-stone-600 dark:text-stone-400">
            Thẻ mới / ngày:
          </label>
          <input
            id="daily-limit-input"
            type="number"
            min="1"
            max="200"
            data-testid="input-daily-new-limit"
            value={dailyLimit}
            onChange={handleLimitChange}
            className="w-20 px-3 py-1.5 text-sm font-semibold text-center rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* 4 Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Review Session */}
        <div
          data-testid="card-strategy-review"
          className="relative group p-6 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 dark:from-stone-900 dark:via-stone-900/90 dark:to-amber-950/20 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-700 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <span
                data-testid="count-due"
                className="text-3xl font-extrabold text-amber-700 dark:text-amber-400"
              >
                {dueQueue.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              Ôn Đến Hạn
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Ôn tập các thẻ đã đến thời điểm ghi nhớ theo thuật toán ngắt quãng SM-2 để duy trì trí nhớ dài hạn.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-review"
            onClick={() => handleLaunch("review")}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Bắt đầu ôn tập</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. New Cards Session */}
        <div
          data-testid="card-strategy-new"
          className="relative group p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/20 dark:from-stone-900 dark:via-stone-900/90 dark:to-emerald-950/20 shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-700 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span
                data-testid="count-new"
                className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400"
              >
                {newQueue.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              Học Thẻ Mới
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Nạp các khái niệm mới vào bộ nhớ. Giới hạn tối đa {dailyLimit} thẻ/ngày để tránh quá tải nhận thức.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-new"
            onClick={() => handleLaunch("new")}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Bắt đầu học mới</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Weak Cards Session */}
        <div
          data-testid="card-strategy-weak"
          className="relative group p-6 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-white via-rose-50/30 to-rose-100/20 dark:from-stone-900 dark:via-stone-900/90 dark:to-rose-950/20 shadow-xs hover:shadow-md hover:border-rose-400 dark:hover:border-rose-700 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <span
                data-testid="count-weak"
                className="text-3xl font-extrabold text-rose-700 dark:text-rose-400"
              >
                {weakQueue.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              Khắc Phục Thẻ Yếu
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Tập trung gỡ rối các thẻ hay quên (quên ≥ 3 lần hoặc hệ số dễ ≤ 2.0) để củng cố nền tảng kiến thức.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-weak"
            onClick={() => handleLaunch("weak")}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Khắc phục thẻ yếu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Cram Session */}
        <div
          data-testid="card-strategy-cram"
          className="relative group p-6 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-br from-white via-purple-50/30 to-purple-100/20 dark:from-stone-900 dark:via-stone-900/90 dark:to-purple-950/20 shadow-xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-700 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Không đổi lịch SRS
                </span>
                <span
                  data-testid="count-cram"
                  className="text-3xl font-extrabold text-purple-700 dark:text-purple-400"
                >
                  {cramQueue.length}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              Ôn Cấp Tốc (Cram Mode)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Ôn lướt toàn bộ thẻ kiến thức bất kể hạn ngày. Thao tác không thay đổi lịch trình SM-2.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-cram"
            onClick={() => handleLaunch("cram")}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Bắt đầu Cram</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
