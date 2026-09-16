import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { X, Play, Pause, Square, Timer, Flame, CheckCircle, Clock } from 'lucide-react';
import { formatMinutesToHours } from '../../lib/spaced-repetition';

interface StudyTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopicId?: string;
}

export function StudyTimerModal({ isOpen, onClose, defaultTopicId }: StudyTimerModalProps) {
  const {
    categories,
    topics,
    activeTimerTopicId,
    timerSeconds,
    isTimerRunning,
    timerMode,
    pomodoroTimeRemaining,
    startStudyTimer,
    pauseStudyTimer,
    stopAndSaveStudyTimer,
  } = useData();

  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopicId || topics[0]?.id || '');
  const [selectedMode, setSelectedMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');

  if (!isOpen) return null;

  const currentTopic = topics.find((t) => t.id === (activeTimerTopicId || selectedTopicId));

  const formatDisplayTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startStudyTimer(selectedTopicId, selectedMode);
  };

  const handleStopAndSave = () => {
    stopAndSaveStudyTimer();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Đồng hồ tập trung nghiên cứu"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-center p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Timer className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base font-serif-title">
              Đồng Hồ Tập Trung
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Topic Selector */}
        {!isTimerRunning && !activeTimerTopicId && (
          <div className="text-left space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Chọn chủ đề đang học
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {topics.map((t) => {
                  const domainLabel =
                    categories.find((c) => c.slug === t.type || c.id === t.categoryId)?.name ||
                    t.categoryName ||
                    t.type;
                  return (
                    <option key={t.id} value={t.id}>
                      [{domainLabel}] {t.title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Mode selection */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedMode('stopwatch')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  selectedMode === 'stopwatch'
                    ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1" /> Bấm giờ tự do
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('pomodoro')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  selectedMode === 'pomodoro'
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-600 dark:text-rose-400" /> Pomodoro 25 Phút
              </button>
            </div>
          </div>
        )}

        {/* Live Timer Display */}
        <div className="py-6 px-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
            {currentTopic ? currentTopic.title : 'Chưa chọn chủ đề'}
          </p>
          <div className="text-5xl font-mono font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {timerMode === 'pomodoro'
              ? formatDisplayTime(pomodoroTimeRemaining)
              : formatDisplayTime(timerSeconds)}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
            Đã tích lũy trong phiên: {Math.floor(timerSeconds / 60)} phút
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isTimerRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="py-3 px-6 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl font-semibold text-sm flex items-center gap-2 shadow-xs transition"
            >
              <Play className="w-4 h-4 fill-white" /> {timerSeconds > 0 ? 'Tiếp tục' : 'Bắt đầu học'}
            </button>
          ) : (
            <button
              type="button"
              onClick={pauseStudyTimer}
              className="py-3 px-6 bg-stone-700 hover:bg-stone-800 text-white rounded-2xl font-semibold text-sm flex items-center gap-2 transition"
            >
              <Pause className="w-4 h-4" /> Tạm dừng
            </button>
          )}

          {(timerSeconds > 0 || activeTimerTopicId) && (
            <button
              type="button"
              onClick={handleStopAndSave}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-sm flex items-center gap-2 shadow-xs transition"
            >
              <CheckCircle className="w-4 h-4" /> Kết thúc &amp; Lưu thời gian
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
