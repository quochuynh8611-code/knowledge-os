import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

export interface ExamCountdownToolbarProps {
  examDate?: string | null;
  smartQueueEnabled?: boolean;
  onExamDateChange: (date: string | null) => void;
  onSmartQueueToggle: (enabled: boolean) => void;
  totalCardsCount?: number;
}

export function ExamCountdownToolbar({
  examDate: propExamDate,
  smartQueueEnabled: propSmartQueue = false,
  onExamDateChange,
  onSmartQueueToggle,
  totalCardsCount = 0,
}: ExamCountdownToolbarProps) {
  const [internalExamDate, setInternalExamDate] = useState<string>(
    propExamDate || ""
  );
  const [isSmartQueue, setIsSmartQueue] = useState<boolean>(propSmartQueue);

  // Sync from props if provided
  useEffect(() => {
    if (propExamDate !== undefined) {
      setInternalExamDate(propExamDate || "");
    }
  }, [propExamDate]);

  useEffect(() => {
    if (propSmartQueue !== undefined) {
      setIsSmartQueue(propSmartQueue);
    }
  }, [propSmartQueue]);

  // Compute days remaining
  const daysUntilExam = React.useMemo(() => {
    if (!internalExamDate) return null;
    const target = new Date(internalExamDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / 86400000);
    return diff;
  }, [internalExamDate]);

  const handleDateChange = (val: string) => {
    setInternalExamDate(val);
    onExamDateChange(val || null);
    if (val) {
      try {
        localStorage.setItem("srs_exam_date", val);
      } catch {
        // Safe fallback
      }
    } else {
      try {
        localStorage.removeItem("srs_exam_date");
      } catch {
        // Safe fallback
      }
    }
  };

  const handleToggleSmartQueue = () => {
    const next = !isSmartQueue;
    setIsSmartQueue(next);
    onSmartQueueToggle(next);
    try {
      localStorage.setItem("srs_smart_queue_enabled", String(next));
    } catch {
      // Safe fallback
    }
  };

  const handleSetPresetDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const dateStr = target.toISOString().split("T")[0];
    handleDateChange(dateStr);
  };

  return (
    <div
      data-testid="exam-countdown-toolbar"
      className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      {/* Left: Exam Date Input & Countdown Status */}
      <div className="flex items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>Mục Tiêu Thi Cử</span>
              {daysUntilExam !== null && (
                <span
                  data-testid="days-remaining-badge"
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    daysUntilExam <= 3
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 animate-pulse"
                      : daysUntilExam <= 7
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                      : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  {daysUntilExam > 0
                    ? `Còn ${daysUntilExam} ngày`
                    : daysUntilExam === 0
                    ? "Hôm nay thi!"
                    : "Đã qua ngày thi"}
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">
              {daysUntilExam !== null && daysUntilExam <= 7
                ? "Nước rút: SRS tự động đẩy thẻ khó & chưa thuần thục lên đầu"
                : "Thiết lập ngày thi để kích hoạt cơ chế nén khoảng cách ôn tập"}
            </div>
          </div>
        </div>

        {/* Date input & Clear */}
        <div className="flex items-center gap-1.5 ml-0 md:ml-2">
          <input
            data-testid="input-exam-date"
            type="date"
            value={internalExamDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {internalExamDate && (
            <button
              data-testid="btn-clear-exam-date"
              onClick={() => handleDateChange("")}
              title="Xóa mục tiêu ngày thi"
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Presets */}
          {!internalExamDate && (
            <div className="flex items-center gap-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  data-testid={`btn-preset-${days}d`}
                  onClick={() => handleSetPresetDays(days)}
                  className="px-2 py-1 text-[11px] rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                >
                  +{days}d
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Smart Queue Toggle */}
      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-stone-800">
        <div className="text-right">
          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Smart Review Queue</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            {isSmartQueue
              ? "Sắp xếp theo độ khẩn cấp & độ khó thẻ"
              : "Sắp xếp tuần tự theo hạn ôn mặc định"}
          </div>
        </div>

        <button
          data-testid="btn-toggle-smart-queue"
          onClick={handleToggleSmartQueue}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
            isSmartQueue ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"
          }`}
          role="switch"
          aria-checked={isSmartQueue}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              isSmartQueue ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
