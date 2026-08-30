/**
 * SessionWrapupModal
 *
 * A calm, low-friction wrap-up dialog shown when a learner completes a
 * study session. Allows quick progress update and optional Key Takeaway note.
 *
 * Invariants (from Phase 17 spec):
 * - ALWAYS saves timeSpent and updates progress when confirmed.
 * - ONLY creates a new Note when takeaway.trim().length > 0.
 * - Skip button closes without any side effects.
 *
 * Phase 17 spec: docs/specs/phase-17-focus-learning-session-and-next-action.md
 */

import React, { useState } from 'react';
import { CheckCircle2, X, Clock, BookOpen, Lightbulb } from 'lucide-react';
import { Topic, TopicStatus } from '../../types';

export interface SessionWrapupParams {
  progress: number;
  status: TopicStatus;
  /** Optional: non-empty takeaway string. Caller should create a Note when present. */
  takeaway?: string;
}

export interface SessionWrapupModalProps {
  isOpen: boolean;
  topic: Topic;
  minutesSpent: number;
  onClose: () => void;
  onSaveWrapup: (params: SessionWrapupParams) => void;
}

function resolveNextStatus(progress: number, current: TopicStatus): TopicStatus {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'in_progress';
  return current;
}

export function SessionWrapupModal({
  isOpen,
  topic,
  minutesSpent,
  onClose,
  onSaveWrapup,
}: SessionWrapupModalProps) {
  const [progress, setProgress] = useState(topic.studyProgress?.progress ?? 0);
  const [takeaway, setTakeaway] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const params: SessionWrapupParams = {
      progress,
      status: resolveNextStatus(progress, topic.studyProgress?.status ?? 'in_progress'),
    };
    // Only include takeaway when non-empty — caller must gate addNote on this
    if (takeaway.trim().length > 0) {
      params.takeaway = takeaway.trim();
    }
    onSaveWrapup(params);
  };

  return (
    <div
      data-testid="session-wrapup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
              Tổng kết phiên học
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Session summary */}
          <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl shrink-0">
              <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400 mb-0.5" />
              <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300 leading-none">
                {minutesSpent}
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">phút</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-500 dark:text-stone-400">Bạn vừa học</p>
              <p
                className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug truncate"
                title={topic.title}
              >
                {topic.title}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                <span className="font-mono">{minutesSpent}</span> phút tích lũy trong phiên này
              </p>
            </div>
          </div>

          {/* Progress update */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                Cập nhật tiến độ
              </label>
              <span className="text-sm font-bold font-mono text-amber-800 dark:text-amber-400">
                {progress}%
              </span>
            </div>
            <input
              data-testid="progress-slider"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-amber-700 cursor-pointer"
            />
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Key Takeaway — optional */}
          <div className="space-y-1.5">
            <label
              htmlFor="wrapup-takeaway"
              className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Đúc kết phiên học
              <span className="text-stone-400 dark:text-stone-500 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              id="wrapup-takeaway"
              data-testid="takeaway-input"
              value={takeaway}
              onChange={(e) => setTakeaway(e.target.value)}
              placeholder="Ghi nhanh một điều quan trọng bạn vừa học được..."
              rows={3}
              className="w-full px-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 resize-none leading-relaxed transition"
            />
            {takeaway.trim().length > 0 && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Sẽ được lưu thành ghi chú "Đúc kết" trong chủ đề này
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
          <button
            onClick={onClose}
            aria-label="Bỏ qua"
            className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleSave}
            aria-label="Lưu thành quả"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Lưu thành quả phiên học
          </button>
        </div>
      </div>
    </div>
  );
}
