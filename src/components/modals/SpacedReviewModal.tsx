import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Topic } from '../../types';
import { X, Sparkles, CheckCircle, RotateCcw, Brain, Clock, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpacedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: Topic | null;
}

export function SpacedReviewModal({ isOpen, onClose, initialTopic }: SpacedReviewModalProps) {
  const { reviewQueue, reviewTopicSM2, topics } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const activeQueue = initialTopic ? [initialTopic] : reviewQueue;
  const currentTopic = activeQueue[currentIndex] || activeQueue[0];

  if (!isOpen || !currentTopic) return null;

  const handleScore = (quality: number) => {
    reviewTopicSM2(currentTopic.id, quality);

    if (quality >= 4) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Safe fallback
      }
    }

    if (currentIndex + 1 < activeQueue.length) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Completed queue
      onClose();
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Ôn Tập Thông Minh (Spaced Repetition SM-2)
              </h2>
              <p className="text-xs text-stone-600">
                Thẻ {currentIndex + 1} / {activeQueue.length} trong hàng đợi hôm nay
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  currentTopic.type === 'phat-hoc'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                }`}
              >
                {currentTopic.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'} • {currentTopic.categoryName}
              </span>
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Đã học: {currentTopic.studyProgress.timeSpent} phút
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{currentTopic.title}</h3>
              <p className="text-sm text-stone-700 bg-white p-4 rounded-xl border border-stone-200 italic">
                "{currentTopic.description}"
              </p>
            </div>

            {/* Answer Section */}
            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-4 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 rounded-2xl text-amber-900 font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4 text-amber-700" />
                Nhấp để xem nội dung &amp; kiểm tra trí nhớ
              </button>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-stone-200 text-stone-800 text-xs max-h-56 overflow-y-auto space-y-2">
                <h4 className="font-semibold text-stone-900 text-xs border-b pb-1">Nội dung cốt lõi:</h4>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {currentTopic.content.slice(0, 450)}...
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {currentTopic.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SM-2 Quality Evaluation Buttons (0 to 5) */}
          {showAnswer && (
            <div className="mt-6 pt-4 border-t border-stone-200">
              <p className="text-center text-xs font-semibold text-stone-600 mb-2.5">
                Đánh giá mức độ ghi nhớ của bạn (Thuật toán SM-2 tính chu kỳ kế tiếp):
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                <button
                  onClick={() => handleScore(0)}
                  className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-center transition"
                >
                  <span className="block font-bold text-sm">0</span>
                  <span className="text-[10px] block">Quên hẳn</span>
                </button>
                <button
                  onClick={() => handleScore(1)}
                  className="p-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 text-center transition"
                >
                  <span className="block font-bold text-sm">1</span>
                  <span className="text-[10px] block">Rất khó</span>
                </button>
                <button
                  onClick={() => handleScore(2)}
                  className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-center transition"
                >
                  <span className="block font-bold text-sm">2</span>
                  <span className="text-[10px] block">Lờ mờ</span>
                </button>
                <button
                  onClick={() => handleScore(3)}
                  className="p-2 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 text-center transition"
                >
                  <span className="block font-bold text-sm">3</span>
                  <span className="text-[10px] block">Khá ổn</span>
                </button>
                <button
                  onClick={() => handleScore(4)}
                  className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-center transition"
                >
                  <span className="block font-bold text-sm">4</span>
                  <span className="text-[10px] block">Nhớ tốt</span>
                </button>
                <button
                  onClick={() => handleScore(5)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center transition"
                >
                  <span className="block font-bold text-sm">5</span>
                  <span className="text-[10px] block">Hoàn hảo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
