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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-center p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-700" />
            <h3 className="font-semibold text-stone-900 text-base">Đồng Hồ Tập Trung Nghiên Cứu</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Topic Selector */}
        {!isTimerRunning && !activeTimerTopicId && (
          <div className="text-left space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                Chọn chủ đề đang học
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900"
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
                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                    : 'bg-white border-stone-300 text-stone-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1" /> Bấm giờ tự do
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('pomodoro')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  selectedMode === 'pomodoro'
                    ? 'bg-rose-100 border-rose-400 text-rose-900'
                    : 'bg-white border-stone-300 text-stone-600'
                }`}
              >
                <Flame className="w-3.5 h-3.5 inline mr-1 text-rose-600" /> Pomodoro 25 Phút
              </button>
            </div>
          </div>
        )}

        {/* Live Timer Display */}
        <div className="py-6 px-4 bg-stone-100 rounded-2xl border border-stone-200">
          <p className="text-xs font-medium text-stone-600 mb-1">
            {currentTopic ? currentTopic.title : 'Chưa chọn chủ đề'}
          </p>
          <div className="text-5xl font-mono font-extrabold text-stone-900 tracking-tight">
            {timerMode === 'pomodoro'
              ? formatDisplayTime(pomodoroTimeRemaining)
              : formatDisplayTime(timerSeconds)}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            Đã tích lũy trong phiên: {Math.floor(timerSeconds / 60)} phút
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isTimerRunning ? (
            <button
              onClick={handleStart}
              className="py-3 px-6 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl font-semibold text-sm flex items-center gap-2 shadow-xs transition"
            >
              <Play className="w-4 h-4 fill-white" /> {timerSeconds > 0 ? 'Tiếp tục' : 'Bắt đầu học'}
            </button>
          ) : (
            <button
              onClick={pauseStudyTimer}
              className="py-3 px-6 bg-stone-700 hover:bg-stone-800 text-white rounded-2xl font-semibold text-sm flex items-center gap-2 transition"
            >
              <Pause className="w-4 h-4" /> Tạm dừng
            </button>
          )}

          {(timerSeconds > 0 || activeTimerTopicId) && (
            <button
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
