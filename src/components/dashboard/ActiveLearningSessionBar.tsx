/**
 * ActiveLearningSessionBar
 *
 * A calm, non-intrusive floating bar that accompanies the learner while
 * reading content or writing notes during an active study session.
 *
 * Design principles:
 * - Does NOT block reading content (positioned fixed bottom-center)
 * - Four explicit semantics: running / paused / resume / complete
 * - Collapses to a minimal pill on mobile (<640px)
 * - Renders nothing when topicId is empty (no active session)
 *
 * Phase 17 spec: docs/specs/phase-17-focus-learning-session-and-next-action.md
 */

import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, Timer, ChevronRight, Minimize2 } from 'lucide-react';

export interface ActiveLearningSessionBarProps {
  /** Topic ID — if empty the bar renders nothing (no active session) */
  topicId: string;
  topicTitle: string;
  timerSeconds: number;
  isTimerRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onOpenWrapup: () => void;
  onNavigateToTopic: (topicId: string) => void;
}

/** Formats total seconds into MM:SS (supports >60 mins as XX:SS) */
function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ActiveLearningSessionBar({
  topicId,
  topicTitle,
  timerSeconds,
  isTimerRunning,
  onPause,
  onResume,
  onOpenWrapup,
  onNavigateToTopic,
}: ActiveLearningSessionBarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Render nothing when there is no active session
  if (!topicId) return null;

  const isPaused = !isTimerRunning && timerSeconds > 0;

  // ─── Minimized pill ───────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div
        data-testid="active-session-bar"
        className="fixed bottom-4 right-4 z-40"
      >
        <button
          onClick={() => setIsMinimized(false)}
          title="Mở rộng thanh phiên học"
          className="flex items-center gap-2 px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl shadow-lg text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition"
        >
          <Timer className="w-3.5 h-3.5 text-amber-400 dark:text-amber-700" />
          <span className="font-mono">{formatTime(timerSeconds)}</span>
          {isPaused && (
            <span className="text-amber-400 dark:text-amber-700 text-[10px] font-bold">⏸</span>
          )}
        </button>
      </div>
    );
  }

  // ─── Full bar ─────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="active-session-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl"
    >
      <div
        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-2xl shadow-xl border transition-all duration-300 ${
          isPaused
            ? 'bg-stone-800/95 dark:bg-stone-200/95 border-stone-600 dark:border-stone-400'
            : 'bg-stone-900/95 dark:bg-stone-100/95 border-stone-700 dark:border-stone-300'
        } backdrop-blur-sm`}
      >
        {/* Timer icon + status indicator */}
        <div className="shrink-0">
          <Timer
            className={`w-4 h-4 ${
              isTimerRunning
                ? 'text-amber-400 dark:text-amber-700 animate-pulse'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          />
        </div>

        {/* Topic title — clickable shortcut */}
        <button
          onClick={() => onNavigateToTopic(topicId)}
          title="Đi đến chủ đề đang học"
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0">
              {isPaused ? 'Đang tạm dừng' : 'Đang học'}
            </span>
            <ChevronRight className="w-3 h-3 text-stone-500 dark:text-stone-400 shrink-0" />
          </div>
          <p className="text-xs font-semibold text-white dark:text-stone-900 truncate leading-tight">
            {topicTitle}
          </p>
        </button>

        {/* Timer display */}
        <span className="font-mono text-sm font-bold text-amber-300 dark:text-amber-700 shrink-0 tabular-nums">
          {formatTime(timerSeconds)}
        </span>

        {/* Pause / Resume */}
        {isTimerRunning ? (
          <button
            onClick={onPause}
            aria-label="Tạm dừng"
            title="Tạm dừng phiên học"
            className="shrink-0 p-1.5 rounded-xl text-stone-300 dark:text-stone-600 hover:bg-stone-700 dark:hover:bg-stone-200 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onResume}
            aria-label="Tiếp tục"
            title="Tiếp tục phiên học"
            className="shrink-0 p-1.5 rounded-xl text-amber-300 dark:text-amber-700 hover:bg-stone-700 dark:hover:bg-stone-200 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}

        {/* Complete session */}
        <button
          onClick={onOpenWrapup}
          aria-label="Hoàn tất"
          title="Hoàn tất phiên học và ghi nhận kết quả"
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hoàn tất</span>
        </button>

        {/* Minimize */}
        <button
          onClick={() => setIsMinimized(true)}
          title="Thu gọn thanh phiên học"
          className="shrink-0 p-1.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-700 dark:hover:bg-stone-200 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
