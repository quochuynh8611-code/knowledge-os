import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Flashcard, FlashcardReview, ReviewRating } from "../../types/flashcard";
import { FlashcardCardView } from "./FlashcardCardView";
import { FlashcardFormModal } from "../modals/FlashcardFormModal";
import { FlashcardImportModal } from "../modals/FlashcardImportModal";
import { FlashcardReviewHistoryModal } from "./FlashcardReviewHistoryModal";
import { FlashcardExportModal } from "./FlashcardExportModal";
import { shortcutScope } from "../../lib/shortcutScope";
import { useData } from "../../context/DataContext";
import confetti from "canvas-confetti";
import {
  Brain,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle,
  ThumbsUp,
  Flame,
  AlertCircle,
  ArrowRight,
  Home,
  CheckCheck,
  Plus,
  Upload,
  BookOpen,
  X,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Trophy,
} from "lucide-react";

import type { StudySessionType } from "../../lib/studySessionLogic";
import {
  buildSessionQueue,
  incrementNewCardsLearnedToday,
} from "../../lib/studySessionLogic";

export interface FlashcardReviewStudioProps {
  topicId?: string;
  onClose?: () => void;
  sessionType?: StudySessionType;
  cramMode?: boolean;
  initialQueue?: Flashcard[];
}

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
    };
  }
}

/**
 * Interactive Flashcard Review Studio with active recall, SM-2 keyboard shortcuts,
 * Option A Idempotent review submissions, and celebration states.
 */
export function FlashcardReviewStudio({
  topicId,
  onClose,
  sessionType = "review",
  cramMode = false,
  initialQueue,
}: FlashcardReviewStudioProps) {
  const effectiveSessionType: StudySessionType =
    sessionType || (cramMode ? "cram" : "review");
  const isCram = cramMode || effectiveSessionType === "cram";

  const { topics } = useSafeData();
  const topicTitle = topicId ? topics?.find((t) => t.id === topicId)?.title : null;
  const [cards, setCards] = useState<Flashcard[]>(initialQueue || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(!initialQueue);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [sessionReviews, setSessionReviews] = useState<FlashcardReview[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    totalCards: number;
    correctRate: number;
    timeSpentSeconds: number;
    ratingBreakdown: Record<1 | 2 | 3 | 4, number>;
  } | null>(null);

  const cardsMap = useMemo(() => {
    const map = new Map<string, Flashcard>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  // Inactivity tracking
  const lastActiveRef = useRef<number>(Date.now());
  const cardStartTimeRef = useRef<number>(Date.now());

  // Quick edit current card
  const handleOpenQuickEdit = useCallback(() => {
    if (cards[currentIndex]) {
      setIsEditModalOpen(true);
    }
  }, [cards, currentIndex]);

  // View history current card
  const handleOpenHistory = useCallback(() => {
    if (cards[currentIndex]) {
      setIsHistoryModalOpen(true);
    }
  }, [cards, currentIndex]);

  const handleQuickEditSuccess = useCallback(
    (updatedCard: Flashcard) => {
      setCards((prev) =>
        prev.map((c, idx) =>
          idx === currentIndex ? { ...c, ...updatedCard } : c
        )
      );
      setIsEditModalOpen(false);
    },
    [currentIndex]
  );

  // Reset activity timestamp
  const recordActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (inactivityWarning) {
      setInactivityWarning(false);
    }
  }, [inactivityWarning]);

  // Load cards based on sessionType
  const loadCards = useCallback(async () => {
    if (initialQueue) {
      setCards(initialQueue);
      setLoading(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setShowCelebration(false);
      setSessionStats(null);
      setSessionReviews([]);
      cardStartTimeRef.current = Date.now();
      lastActiveRef.current = Date.now();
      return;
    }

    setLoading(true);
    try {
      if (effectiveSessionType === "review") {
        const url = topicId
          ? `/api/flashcards/due?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards/due";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCards(Array.isArray(data) ? data : []);
        }
      } else {
        const url = topicId
          ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const allCards = Array.isArray(data) ? data : [];
          setCards(
            buildSessionQueue(allCards, {
              sessionType: effectiveSessionType,
              topicId,
            })
          );
        }
      }
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setShowCelebration(false);
      setSessionStats(null);
      setSessionReviews([]);
      cardStartTimeRef.current = Date.now();
      lastActiveRef.current = Date.now();
    }
  }, [effectiveSessionType, initialQueue, topicId]);

  const loadDueCards = loadCards;

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Timer loop & Inactivity monitoring (5 minutes = 300,000ms)
  useEffect(() => {
    if (loading || isCompleted || cards.length === 0) return;

    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);

      const idleDuration = Date.now() - lastActiveRef.current;
      if (idleDuration >= 300000 && !inactivityWarning) {
        setInactivityWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, isCompleted, cards.length, inactivityWarning]);

  // Format time mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Flip action
  const handleFlip = useCallback(() => {
    recordActivity();
    setIsFlipped((prev) => !prev);
  }, [recordActivity]);

  // Rate action
  const handleRate = useCallback(
    async (rating: number) => {
      recordActivity();
      const currentCard = cards[currentIndex];
      if (!currentCard) return;

      const elapsedMs = Math.max(0, Date.now() - cardStartTimeRef.current);
      const clientEventId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      let recordedReview: FlashcardReview | null = null;

      // Post review via API only if not in Cram Mode
      if (!isCram) {
        try {
          const res = await fetch("/api/flashcards/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flashcardId: currentCard.id,
              cardId: currentCard.id,
              topicId: currentCard.topicId,
              rating,
              clientEventId,
              reviewDurationMs: elapsedMs,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.review) {
              recordedReview = data.review;
            }
          }
          if (effectiveSessionType === "new") {
            incrementNewCardsLearnedToday(1);
          }
        } catch (err) {
          console.error("Failed to record review:", err);
        }
      }

      if (!recordedReview) {
        recordedReview = {
          id: `session-rev-${clientEventId}`,
          clientEventId,
          flashcardId: currentCard.id,
          cardId: currentCard.id,
          topicId: currentCard.topicId,
          rating: rating as ReviewRating,
          reviewDurationMs: elapsedMs,
          reviewedAt: new Date().toISOString(),
          stateBefore: currentCard.schedule?.state || "new",
          stateAfter: rating >= 3 ? "review" : "relearning",
          intervalBefore: currentCard.schedule?.interval ?? 0,
          intervalAfter: rating >= 3 ? (currentCard.schedule?.interval ?? 1) : 0,
          easeFactorBefore: currentCard.schedule?.easeFactor ?? 2.5,
          easeFactorAfter: currentCard.schedule?.easeFactor ?? 2.5,
          dueBeforeAt: currentCard.schedule?.dueAt || new Date().toISOString(),
          dueAfterAt: new Date().toISOString(),
        };
      }

      setSessionReviews((prev) => [...prev, recordedReview!]);

      // Next card transition
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        cardStartTimeRef.current = Date.now();
      } else {
        const nextReviews = [...sessionReviews, recordedReview!];
        const breakdown: Record<1 | 2 | 3 | 4, number> = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
        };
        for (const r of nextReviews) {
          if (r.rating in breakdown) {
            breakdown[r.rating as 1 | 2 | 3 | 4] += 1;
          }
        }
        const rememberedCount = (breakdown[3] || 0) + (breakdown[4] || 0);
        const correctRate =
          nextReviews.length > 0
            ? Math.round((rememberedCount / nextReviews.length) * 100)
            : 100;

        setSessionStats({
          totalCards: cards.length,
          correctRate,
          timeSpentSeconds: sessionSeconds,
          ratingBreakdown: breakdown,
        });
        setIsCompleted(true);
        setShowCelebration(true);
        try {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // Safe fallback
        }
      }
    },
    [cards, currentIndex, recordActivity, sessionReviews, sessionSeconds]
  );

  // Register flashcard_review scope when active review queue is present and not completed
  useEffect(() => {
    if (!loading && cards.length > 0 && !isCompleted) {
      const unregister = shortcutScope.pushScope("flashcard_review");
      return () => {
        unregister();
      };
    }
  }, [loading, cards.length, isCompleted]);

  // Scoped keyboard shortcuts with input/modal protection and priority
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if session is not active or empty or loading
      if (loading || cards.length === 0 || isCompleted) {
        return;
      }

      // Editable/modal protection:
      // Do not capture if focus is in input, textarea, select, contenteditable, or inside an open modal/dialog
      const target = e.target;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && (target.isContentEditable || target.getAttribute("contenteditable") === "true"));

      const isInsideModal =
        target instanceof HTMLElement &&
        Boolean(
          target.closest('[role="dialog"]') ||
          target.closest('[aria-modal="true"]') ||
          target.closest('.modal-container') ||
          target.closest('[data-modal]')
        );

      if (
        isInput ||
        isInsideModal ||
        isCreateModalOpen ||
        isImportModalOpen ||
        isEditModalOpen ||
        isHistoryModalOpen ||
        isExportModalOpen
      ) {
        return;
      }

      // Ctrl+E or Cmd+E to Quick Edit current card
      if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleOpenQuickEdit();
        return;
      }

      // Ctrl+H or Cmd+H to View History of current card
      if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleOpenHistory();
        return;
      }

      // Space flips card & prevents default scroll
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        handleFlip();
        return;
      }

      // 1-4 rating only active when card back is visible
      if (["1", "2", "3", "4"].includes(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        // Prevent default and stop propagation so global tab navigation never fires
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        if (isFlipped) {
          handleRate(Number(e.key));
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    handleFlip,
    handleRate,
    handleOpenQuickEdit,
    handleOpenHistory,
    isFlipped,
    loading,
    cards.length,
    isCompleted,
    isCreateModalOpen,
    isImportModalOpen,
    isEditModalOpen,
    isHistoryModalOpen,
  ]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-stone-400 animate-pulse">
        <div className="w-10 h-10 rounded-full border-3 border-amber-600/30 border-t-amber-600 animate-spin mb-3" />
        <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">
          Đang nạp hàng đợi thẻ cần ôn...
        </span>
      </div>
    );
  }

  // 2. Empty State
  if (cards.length === 0) {
    return (
      <>
        <div
          data-testid="empty-queue-state"
          className="flex flex-col items-center justify-center p-8 md:p-12 text-center max-w-lg mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-sm space-y-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {topicTitle
                ? "🎉 Không có thẻ cần ôn cho chủ đề này!"
                : "🎉 Không có thẻ cần ôn hôm nay!"}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
              {topicTitle
                ? `Toàn bộ thẻ thuộc chủ đề "${topicTitle}" đã được ôn tập đúng hạn. Hãy tiếp tục đọc thêm tài liệu hoặc tạo thêm thẻ mới.`
                : "Bạn đã hoàn thành mọi mục tiêu ôn tập ngắt quãng. Hãy tiếp tục đọc thêm tài liệu hoặc tạo thêm thẻ mới."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              type="button"
              data-testid="btn-create-card-empty"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo thẻ mới</span>
            </button>
            <button
              type="button"
              data-testid="btn-import-csv-empty"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-sm transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Nhập CSV / TSV</span>
            </button>
            {onClose && (
              <button
                type="button"
                data-testid="btn-close-empty"
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-sm transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{topicTitle ? "Quay lại chủ đề" : "Quay lại Dashboard"}</span>
              </button>
            )}
          </div>
        </div>

        {isCreateModalOpen && (
          <FlashcardFormModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => loadDueCards()}
            defaultTopicId={topicId}
          />
        )}
        {isImportModalOpen && (
          <FlashcardImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onSuccess={() => loadDueCards()}
            defaultTopicId={topicId}
          />
        )}
      </>
    );
  }

  // 3. Celebration State
  if (isCompleted || showCelebration) {
    const totalCount = sessionStats?.totalCards ?? cards.length;
    const correctRate = sessionStats?.correctRate ?? 100;
    const timeSpent = sessionStats?.timeSpentSeconds ?? sessionSeconds;
    const breakdown = sessionStats?.ratingBreakdown ?? {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    return (
      <>
        <div
          data-testid="session-completed-view"
          className="flex flex-col items-center justify-center p-6 sm:p-10 text-center max-w-xl mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header Trophy & Sparkles */}
          <div className="relative">
            <div className="w-18 h-18 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/10">
              <Trophy className="w-9 h-9" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-amber-950" />
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {topicTitle
                ? `Hoàn thành phiên ôn tập cho "${topicTitle}"!`
                : "Hoàn thành phiên ôn tập!"}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
              {correctRate >= 80
                ? "Xuất sắc! Bạn đã ghi nhớ rất tốt kiến thức trong phiên học hôm nay."
                : "Rất tốt! Bạn đang củng cố kiến thức ngày càng vững chắc."}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/80 dark:border-stone-700 text-center">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1">
                Số thẻ đã học
              </span>
              <span
                data-testid="celebration-stat-total"
                className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100"
              >
                {totalCount}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block mb-1">
                Tỷ lệ nhớ đúng
              </span>
              <span
                data-testid="celebration-stat-correct-rate"
                className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300"
              >
                {correctRate}%
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/80 dark:border-stone-700 text-center">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-1">
                Thời gian ôn
              </span>
              <span
                data-testid="celebration-stat-time"
                className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100"
              >
                {formatTimer(timeSpent)}
              </span>
            </div>
          </div>

          {/* Rating Breakdown Section */}
          <div className="w-full text-left bg-stone-50/70 dark:bg-stone-800/30 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-2.5">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
              Chi tiết các lượt đánh giá
            </span>
            <div
              data-testid="celebration-rating-breakdown"
              className="grid grid-cols-4 gap-2"
            >
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-center">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block">
                  Quên [1]
                </span>
                <span
                  data-testid="breakdown-rating-1"
                  className="text-base font-bold font-mono text-rose-800 dark:text-rose-300"
                >
                  {breakdown[1] || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-center">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                  Khó [2]
                </span>
                <span
                  data-testid="breakdown-rating-2"
                  className="text-base font-bold font-mono text-amber-800 dark:text-amber-300"
                >
                  {breakdown[2] || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-center">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                  Nhớ [3]
                </span>
                <span
                  data-testid="breakdown-rating-3"
                  className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-300"
                >
                  {breakdown[3] || 0}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900/60 text-center">
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 block">
                  Dễ [4]
                </span>
                <span
                  data-testid="breakdown-rating-4"
                  className="text-base font-bold font-mono text-sky-800 dark:text-sky-300"
                >
                  {breakdown[4] || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
            <button
              data-testid="btn-review-again"
              onClick={loadDueCards}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ôn tập lại</span>
            </button>
            <button
              type="button"
              data-testid="btn-export-completed-session"
              onClick={() => setIsExportModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất CSV phiên</span>
            </button>
            {onClose && (
              <button
                data-testid="btn-exit-session"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>{topicTitle ? "Về chủ đề" : "Thoát"}</span>
              </button>
            )}
          </div>
        </div>

        {isExportModalOpen && (
          <FlashcardExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            sessionReviews={sessionReviews}
            cardsMap={cardsMap}
            currentTopicId={topicId}
          />
        )}
      </>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Inactivity Toast Warning */}
      {inactivityWarning && (
        <div
          data-testid="inactivity-warning"
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-md animate-in fade-in"
        >
          <div className="flex items-center gap-2.5 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Bạn còn ở đó không? Phiên học tạm dừng ghi nhận thời gian.</span>
          </div>
          <button
            onClick={() => setInactivityWarning(false)}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {/* Header bar: Progress & Actions */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
            <Brain className="w-4 h-4" />
          </div>
          <span
            data-testid="queue-progress"
            className="text-sm font-bold text-stone-800 dark:text-stone-200 tracking-wide"
          >
            {currentIndex + 1} / {cards.length}
          </span>
          {/* Session Type Badge */}
          <div
            data-testid="badge-session-type"
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              effectiveSessionType === "cram"
                ? "bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300"
                : effectiveSessionType === "new"
                ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                : effectiveSessionType === "weak"
                ? "bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300"
                : "bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300"
            }`}
          >
            {effectiveSessionType === "cram" && <span>Cram Mode (Ôn cấp tốc)</span>}
            {effectiveSessionType === "new" && <span>Học Thẻ Mới</span>}
            {effectiveSessionType === "weak" && <span>Khắc Phục Thẻ Yếu</span>}
            {effectiveSessionType === "review" && <span>Ôn Tập Đến Hạn</span>}
          </div>
          {topicTitle && (
            <div
              data-testid="review-topic-context"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-semibold max-w-[200px] sm:max-w-[260px] truncate"
              title={`Chủ đề: ${topicTitle}`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{topicTitle}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="btn-create-card"
            onClick={() => setIsCreateModalOpen(true)}
            title="Tạo thẻ mới"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo thẻ</span>
          </button>
          <button
            type="button"
            data-testid="btn-import-csv"
            onClick={() => setIsImportModalOpen(true)}
            title="Nhập CSV/TSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nhập CSV</span>
          </button>
          <button
            type="button"
            data-testid="btn-open-export-csv"
            onClick={() => setIsExportModalOpen(true)}
            title="Xuất CSV (Phiên hiện tại & Toàn bộ lịch sử)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
          {onClose && (
            <button
              type="button"
              data-testid="btn-close-review"
              onClick={onClose}
              title={topicTitle ? "Quay lại chủ đề" : "Thoát phiên ôn"}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div
            data-testid="session-timer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-mono font-semibold"
          >
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>{formatTimer(sessionSeconds)}</span>
          </div>
        </div>
      </div>


      {/* Card Rendering */}
      {currentCard && (
        <FlashcardCardView
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onEdit={handleOpenQuickEdit}
          onHistory={handleOpenHistory}
        />
      )}

      {/* Rating Action Bar */}
      <div className="pt-2">
        {isFlipped ? (
          <div className="grid grid-cols-4 gap-2.5 md:gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* 1: Again */}
            <button
              data-testid="rating-btn-1"
              onClick={() => handleRate(1)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 transition shadow-xs group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                Lặp lại [1]
              </span>
              <span className="text-sm font-bold mt-0.5">&lt; 1 ngày</span>
            </button>

            {/* 2: Hard */}
            <button
              data-testid="rating-btn-2"
              onClick={() => handleRate(2)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900/80 text-amber-700 dark:text-amber-300 transition shadow-xs group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                Khó [2]
              </span>
              <span className="text-sm font-bold mt-0.5">1 ngày</span>
            </button>

            {/* 3: Good */}
            <button
              data-testid="rating-btn-3"
              onClick={() => handleRate(3)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 transition shadow-xs group ring-1 ring-emerald-500/20"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Chuẩn [3]
              </span>
              <span className="text-sm font-bold mt-0.5">Khoảng cách</span>
            </button>

            {/* 4: Easy */}
            <button
              data-testid="rating-btn-4"
              onClick={() => handleRate(4)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-900/80 text-sky-700 dark:text-sky-300 transition shadow-xs group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                Dễ [4]
              </span>
              <span className="text-sm font-bold mt-0.5">&gt; 4 ngày</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-stone-400 dark:text-stone-500 text-xs">
            <span>Nhấn phím <strong className="text-stone-700 dark:text-stone-300 font-mono px-1.5 py-0.5 bg-white dark:bg-stone-700 rounded border border-stone-300 dark:border-stone-600">Space</strong> hoặc click vào thẻ để xem đáp án trước khi chấm điểm</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <FlashcardFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => loadDueCards()}
          defaultTopicId={topicId}
        />
      )}
      {isImportModalOpen && (
        <FlashcardImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => loadDueCards()}
          defaultTopicId={topicId}
        />
      )}
      {isEditModalOpen && currentCard && (
        <FlashcardFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleQuickEditSuccess}
          editingCard={currentCard}
          defaultTopicId={currentCard.topicId || topicId}
        />
      )}
      {isHistoryModalOpen && currentCard && (
        <FlashcardReviewHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          card={currentCard}
        />
      )}
      {isExportModalOpen && (
        <FlashcardExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          sessionReviews={sessionReviews}
          cardsMap={cardsMap}
          currentTopicId={topicId}
        />
      )}
    </div>
  );
}


