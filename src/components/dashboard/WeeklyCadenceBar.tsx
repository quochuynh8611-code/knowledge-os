import React from 'react';
import { WeeklyCadenceSummary, DayCadenceItem } from '../../lib/learningStateSelectors';
import { Calendar, Sparkles } from 'lucide-react';

export interface WeeklyCadenceBarProps {
  cadence: WeeklyCadenceSummary;
  className?: string;
}

export function WeeklyCadenceBar({
  cadence,
  className = '',
}: WeeklyCadenceBarProps) {
  const {
    activeDaysCount,
    activeTopicsCount,
    days,
    cadenceStatus,
    headlineMessage,
  } = cadence;

  return (
    <section
      data-testid="weekly-cadence-bar"
      aria-label="Nhịp học tuần này"
      className={`bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 ${className}`}
    >
      {/* 1. Left Headline & Momentum Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
          {cadenceStatus === 'strong' || cadenceStatus === 'consistent' ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              {headlineMessage}
            </span>
            {activeDaysCount > 0 && (
              <span
                data-testid="cadence-active-badge"
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-700"
              >
                {activeDaysCount}/7 ngày • {activeTopicsCount} chủ đề
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate hidden sm:block">
            Theo dõi nhịp độ học tập tuần hiện tại (Thứ 2 — Chủ Nhật)
          </p>
        </div>
      </div>

      {/* 2. Right: 7-Day Micro Pills Horizon */}
      <div
        role="group"
        aria-label="7 ngày trong tuần"
        className="grid grid-cols-7 gap-1 sm:gap-1.5 shrink-0 self-stretch sm:self-auto"
      >
        {days.map((day) => (
          <DayPill key={day.dateStr} item={day} />
        ))}
      </div>
    </section>
  );
}

function DayPill({ item }: { item: DayCadenceItem }) {
  const {
    dayLabel,
    dayNumber,
    isToday,
    isFuture,
    hasActivity,
    activeTopicCount,
  } = item;

  // Visual State Calculation
  let pillStyle = 'bg-stone-50/80 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border-stone-200/80 dark:border-stone-800';

  if (hasActivity) {
    pillStyle = 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/80 font-semibold';
  } else if (isFuture && !isToday) {
    pillStyle = 'opacity-40 bg-stone-50/40 dark:bg-stone-900/20 text-stone-400 dark:text-stone-500 border-stone-200/50 dark:border-stone-800/50';
  } else if (isToday) {
    pillStyle = 'bg-stone-100/90 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 font-medium';
  }

  const todayEmphasis = isToday ? 'ring-1.5 ring-amber-600/70 dark:ring-amber-400/80 shadow-2xs' : '';

  return (
    <div
      data-testid={`cadence-day-${dayLabel}`}
      data-active={hasActivity ? 'true' : 'false'}
      data-today={isToday ? 'true' : 'false'}
      data-future={isFuture ? 'true' : 'false'}
      title={`${dayLabel} (${dayNumber}): ${hasActivity ? `${activeTopicCount} chủ đề đã học` : isFuture ? 'Tương lai' : 'Nghỉ ngơi'}`}
      className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-xl border transition-all text-center min-w-[34px] sm:min-w-[40px] ${pillStyle} ${todayEmphasis}`}
    >
      <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
        {dayLabel}
      </span>
      <div className="flex items-center gap-0.5 mt-0.5">
        <span className="text-[10px] sm:text-[11px] font-mono leading-none">
          {dayNumber}
        </span>
        {hasActivity && (
          <span
            data-testid={`activity-dot-${dayLabel}`}
            className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0"
          />
        )}
      </div>
    </div>
  );
}
