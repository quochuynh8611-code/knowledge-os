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
 * - Uses Workbench V2 design tokens & surfaces
 */

import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, Timer, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';

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
          className="flex items-center gap-2 px-3 py-2 bg-stone-900/95 dark:bg-stone-100/95 text-white dark:text-stone-900 rounded-2xl shadow-xl border border-stone-700/80 dark:border-stone-300 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition backdrop-blur-md cursor-pointer"
        >
          <Timer className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 animate-pulse" />
          <span className="font-mono tabular-nums">{formatTime(timerSeconds)}</span>
          {isPaused && (
            <span className="text-amber-400 dark:text-amber-600 text-[10px] font-bold">⏸</span>
          )}
          <Maximize2 className="w-3 h-3 opacity-70" />
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
        className={`flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-xl border transition-all duration-300 backdrop-blur-md ${
          isPaused
            ? 'bg-stone-900/95 dark:bg-stone-100/95 border-amber-600/50 dark:border-amber-400/60 ring-1 ring-amber-500/20'
            : 'bg-stone-900/95 dark:bg-stone-100/95 border-stone-750 dark:border-stone-300'
        }`}
      >
        {/* Timer icon + status indicator */}
        <div className="shrink-0 p-1 rounded-lg bg-white/10 dark:bg-stone-900/10">
          <Timer
            className={`w-4 h-4 ${
              isTimerRunning
                ? 'text-amber-400 dark:text-amber-600 animate-pulse'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          />
        </div>

        {/* Topic title — clickable shortcut */}
        <button
          onClick={() => onNavigateToTopic(topicId)}
          title="Đi đến chủ đề đang học"
          className="min-w-0 flex-1 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90 dark:text-amber-700 shrink-0">
              {isPaused ? 'Đang tạm dừng' : 'Đang học'}
            </span>
            <ChevronRight className="w-3 h-3 text-stone-500 dark:text-stone-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs font-bold text-white dark:text-stone-900 truncate leading-tight group-hover:text-amber-300 dark:group-hover:text-amber-800 transition">
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
            className="shrink-0 p-1.5 rounded-xl text-stone-300 dark:text-stone-600 hover:bg-white/15 dark:hover:bg-black/10 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onResume}
            aria-label="Tiếp tục"
            title="Tiếp tục phiên học"
            className="shrink-0 p-1.5 rounded-xl text-amber-300 dark:text-amber-700 hover:bg-white/15 dark:hover:bg-black/10 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}

        {/* Complete session */}
        <button
          onClick={onOpenWrapup}
          aria-label="Hoàn tất"
          title="Hoàn tất phiên học và ghi nhận kết quả"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer border border-emerald-500/50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hoàn tất</span>
        </button>

        {/* Minimize */}
        <button
          onClick={() => setIsMinimized(true)}
          title="Thu gọn thanh phiên học"
          className="shrink-0 p-1.5 rounded-xl text-stone-400 dark:text-stone-500 hover:bg-white/10 dark:hover:bg-black/10 hover:text-white dark:hover:text-stone-900 transition cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
