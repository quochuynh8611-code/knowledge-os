/**
 * StudyCTA
 *
 * Smart primary study CTA button with 5 distinct semantic states:
 *
 *  1. no-session        : "▷ Bắt đầu học"   → calls onStartStudy(topicId)
 *  2. this-topic-running: "⏱ Đang học X:XX" → informational only, no action
 *  3. this-topic-paused : "▶ Tiếp tục học"  → calls onStartStudy(topicId)
 *                                              (resumes via startStudyTimer with same ID)
 *  4. other-topic-active: "⚡ Phiên khác đang chạy" → GUARD: does NOT call startStudy.
 *                          Clicking shows an inline warning tooltip without auto-switching.
 *  5. other-topic-paused: "▷ Bắt đầu học"  → safe to start (other session paused)
 *
 * SAFETY INVARIANT (constraint #7):
 *   When activeTimerTopicId is non-null AND different from this topicId
 *   AND isTimerRunning === true, clicking MUST NOT call onStartStudy.
 *   Silently switching topics would discard the other session's timerSeconds.
 *
 * Phase 17B spec: docs/specs/phase-17b-topic-detail-toolbar.md
 */

import React, { useState } from 'react';
import { Play, Timer, AlertTriangle } from 'lucide-react';

export interface StudyCTAProps {
  topicId: string;
  topicTitle: string;
  activeTimerTopicId: string | null;
  isTimerRunning: boolean;
  timerSeconds: number;
  onStartStudy: (topicId: string) => void;
  onResumeStudy?: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type CTAState =
  | 'no-session'
  | 'this-running'
  | 'this-paused'
  | 'other-running'   // GUARD: must not switch
  | 'other-paused';   // Safe to start (timer paused, no data loss)

function resolveState(
  topicId: string,
  activeTimerTopicId: string | null,
  isTimerRunning: boolean,
  timerSeconds: number
): CTAState {
  if (!activeTimerTopicId) return 'no-session';
  if (activeTimerTopicId === topicId) {
    return isTimerRunning ? 'this-running' : 'this-paused';
  }
  // Different topic
  return isTimerRunning ? 'other-running' : 'other-paused';
}

export function StudyCTA({
  topicId,
  topicTitle,
  activeTimerTopicId,
  isTimerRunning,
  timerSeconds,
  onStartStudy,
  onResumeStudy,
}: StudyCTAProps) {
  const [showGuardHint, setShowGuardHint] = useState(false);
  const state = resolveState(topicId, activeTimerTopicId, isTimerRunning, timerSeconds);

  // ── State: this topic is running ──────────────────────────────────────────
  if (state === 'this-running') {
    return (
      <button
        data-testid="study-cta-btn"
        // Informational — navigate user's eye to the session bar at bottom
        onClick={() => {/* intentionally no-op: session bar is visible at bottom */}}
        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-default"
        title="Phiên học đang chạy — xem thanh phiên học ở cuối màn hình"
      >
        <Timer className="w-3.5 h-3.5 animate-pulse" />
        Đang học {formatTime(timerSeconds)}
      </button>
    );
  }

  // ── State: this topic is paused ───────────────────────────────────────────
  if (state === 'this-paused') {
    return (
      <button
        data-testid="study-cta-btn"
        onClick={() => {
          if (onResumeStudy) {
            onResumeStudy();
          } else {
            onStartStudy(topicId);
          }
        }}
        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-800/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        title="Tiếp tục phiên học đang tạm dừng"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Tiếp tục học
      </button>
    );
  }

  // ── State: GUARD — other topic's session is RUNNING ───────────────────────
  // Do NOT allow silent topic switch. Show warning; user must manually stop
  // the other session via the ActiveLearningSessionBar before starting here.
  if (state === 'other-running') {
    return (
      <div className="relative">
        <button
          data-testid="study-cta-btn"
          onClick={() => setShowGuardHint((v) => !v)}
          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          title="Đang có phiên học khác đang chạy — hoàn tất hoặc dừng phiên đó trước"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Phiên khác đang chạy
        </button>
        {showGuardHint && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-stone-900 dark:bg-stone-800 text-white text-[11px] leading-snug px-3 py-2 rounded-xl shadow-xl z-20">
            Đang có phiên học ở chủ đề khác đang chạy. Hãy hoàn tất hoặc dừng phiên đó trước khi học chủ đề này.
          </div>
        )}
      </div>
    );
  }

  // ── State: other topic paused OR no session — safe to start ──────────────
  return (
    <button
      data-testid="study-cta-btn"
      onClick={() => onStartStudy(topicId)}
      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
      title={`Bắt đầu phiên học: ${topicTitle}`}
    >
      <Play className="w-3.5 h-3.5 fill-current" />
      Bắt đầu học
    </button>
  );
}
