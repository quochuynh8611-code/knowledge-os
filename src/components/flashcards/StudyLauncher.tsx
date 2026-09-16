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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Trung Tâm Khởi Tạo Ôn Tập
            </h1>
            {topicTitle && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100/80 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {topicTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Chọn chiến lược học tập thông minh phù hợp với mục tiêu và thời lượng nghiên cứu của bạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-launcher-to-browser"
            onClick={handleOpenBrowser}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span>Danh sách thẻ</span>
          </button>
        </div>
      </div>

      {/* Daily New-Card Configuration Panel */}
      <div className="bg-stone-50 dark:bg-stone-900/60 p-3.5 rounded-2xl border border-stone-200/90 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Hạn Mức Thẻ Mới Hàng Ngày
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              Đã nạp hôm nay: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{learnedToday}</strong> thẻ
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
            className="w-16 px-2.5 py-1 text-xs font-bold font-mono text-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
          />
        </div>
      </div>

      {/* 4 Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Review Session */}
        <div
          data-testid="card-strategy-review"
          className="p-5 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs hover:border-amber-300 dark:hover:border-amber-800/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                <Clock className="w-5 h-5" />
              </div>
              <span
                data-testid="count-due"
                className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-300"
              >
                {dueQueue.length}
              </span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
              Ôn Đến Hạn
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
              Ôn tập các thẻ đã đến thời điểm ghi nhớ theo thuật toán ngắt quãng SM-2 để duy trì trí nhớ dài hạn.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-review"
            onClick={() => handleLaunch("review")}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white shadow-2xs transition cursor-pointer"
          >
            <span>Bắt đầu ôn tập</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. New Cards Session */}
        <div
          data-testid="card-strategy-new"
          className="p-5 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                <Sparkles className="w-5 h-5" />
              </div>
              <span
                data-testid="count-new"
                className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300"
              >
                {newQueue.length}
              </span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
              Học Thẻ Mới
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
              Nạp các khái niệm mới vào bộ nhớ. Giới hạn tối đa {dailyLimit} thẻ/ngày để tránh quá tải nhận thức.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-new"
            onClick={() => handleLaunch("new")}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition cursor-pointer"
          >
            <span>Bắt đầu học mới</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Weak Cards Session */}
        <div
          data-testid="card-strategy-weak"
          className="p-5 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs hover:border-rose-300 dark:hover:border-rose-800/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                <Flame className="w-5 h-5" />
              </div>
              <span
                data-testid="count-weak"
                className="text-2xl font-bold font-mono text-rose-800 dark:text-rose-300"
              >
                {weakQueue.length}
              </span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
              Khắc Phục Thẻ Yếu
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
              Tập trung gỡ rối các thẻ hay quên (quên ≥ 3 lần hoặc hệ số dễ ≤ 2.0) để củng cố nền tảng kiến thức.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-weak"
            onClick={() => handleLaunch("weak")}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-2xs transition cursor-pointer"
          >
            <span>Khắc phục thẻ yếu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. Cram Session */}
        <div
          data-testid="card-strategy-cram"
          className="p-5 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs hover:border-purple-300 dark:hover:border-purple-800/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Không đổi lịch SRS
                </span>
                <span
                  data-testid="count-cram"
                  className="text-2xl font-bold font-mono text-purple-800 dark:text-purple-300"
                >
                  {cramQueue.length}
                </span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
              Ôn Cấp Tốc (Cram Mode)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">
              Ôn lướt toàn bộ thẻ kiến thức bất kể hạn ngày. Thao tác không thay đổi lịch trình SM-2.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-launch-cram"
            onClick={() => handleLaunch("cram")}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white shadow-2xs transition cursor-pointer"
          >
            <span>Bắt đầu Cram</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
