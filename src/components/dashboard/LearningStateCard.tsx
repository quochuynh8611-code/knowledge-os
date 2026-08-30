import React from 'react';
import { DomainLearningState } from '../../lib/learningStateSelectors';
import { getNeutralDomainStyle } from '../../lib/domainStyling';
import { formatMinutesToHours, formatTimeAgo } from '../../lib/spaced-repetition';
import {
  Clock,
  Play,
  ArrowUpRight,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export interface LearningStateCardProps {
  state: DomainLearningState;
  onSelectDomain: (domainId: string) => void;
  onStartStudyTopic?: (topicId: string) => void;
  onOpenTopicDetail?: (topicId: string) => void;
}

export function LearningStateCard({
  state,
  onSelectDomain,
  onStartStudyTopic,
  onOpenTopicDetail,
}: LearningStateCardProps) {
  const {
    rootCategory,
    status,
    statusLabel,
    totalTopics,
    completedTopics,
    donePercent,
    totalTimeSpentMinutes,
    lastStudiedAt,
    nextStepTopic,
  } = state;

  const style = getNeutralDomainStyle(rootCategory);
  const Icon = style.icon;

  const statusBadgeStyle = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    maintenance: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dormant: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700',
  }[status];

  const statusDotColor = {
    active: 'bg-emerald-500 animate-pulse',
    maintenance: 'bg-amber-500',
    dormant: 'bg-stone-400',
  }[status];

  const cardContainerStyle = {
    active: 'bg-white dark:bg-stone-900 border-stone-200/90 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs',
    maintenance: 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-2xs',
    dormant: 'bg-stone-50/60 dark:bg-stone-900/60 border-stone-200/60 dark:border-stone-800/60 opacity-85 hover:opacity-100 hover:border-stone-300 dark:hover:border-stone-700',
  }[status];

  return (
    <div
      data-testid={`learning-state-card-${rootCategory.id}`}
      onClick={() => onSelectDomain(rootCategory.id)}
      className={`border rounded-2xl p-4 sm:p-5 hover:shadow-md transition flex flex-col justify-between group cursor-pointer ${cardContainerStyle}`}
    >
      {/* 1. Header: Icon + Title + Status Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div
            onClick={() => onSelectDomain(rootCategory.id)}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center font-bold shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate group-hover:text-amber-900 dark:group-hover:text-amber-300 transition">
              {rootCategory.name}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusBadgeStyle}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
            <span>{statusLabel}</span>
          </span>
        </div>

        {/* 2. True Learning Metrics (Time & Progress) */}
        <div className="space-y-2 mb-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{formatMinutesToHours(totalTimeSpentMinutes)}</span>
            </span>
            <span className="font-mono text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
              {completedTopics}/{totalTopics} bài ({donePercent}%)
            </span>
          </div>

          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                status === 'active'
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : status === 'maintenance'
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : 'bg-stone-400 dark:bg-stone-600'
              }`}
              style={{ width: `${donePercent}%` }}
            />
          </div>
        </div>

        {/* 3. Next Step Box */}
        {nextStepTopic ? (
          <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 rounded-xl space-y-1.5 mb-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
              <span>
                {nextStepTopic.studyProgress?.status === 'in_progress' ? 'Đang học dở' : 'Bài tiếp theo'}
              </span>
              {nextStepTopic.studyProgress?.progress ? (
                <span className="font-mono text-emerald-800 dark:text-emerald-300">
                  {nextStepTopic.studyProgress.progress}%
                </span>
              ) : null}
            </div>

            <div
              onClick={() => onOpenTopicDetail ? onOpenTopicDetail(nextStepTopic.id) : onSelectDomain(rootCategory.id)}
              className="text-xs font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer line-clamp-1 transition"
              title={nextStepTopic.title}
            >
              {nextStepTopic.title}
            </div>

            {onStartStudyTopic && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartStudyTopic(nextStepTopic.id);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer ${
                    status === 'active'
                      ? 'bg-stone-900 dark:bg-stone-100 hover:bg-amber-800 dark:hover:bg-amber-400 text-white dark:text-stone-900'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/80 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Học bài này</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-700 rounded-xl mb-3 flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-[11px] leading-tight">Đã hoàn thành các bài học hiện có</span>
          </div>
        )}
      </div>

      {/* 4. Footer: Recency + Explore action */}
      <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
        <span>
          {lastStudiedAt ? `Học ${formatTimeAgo(lastStudiedAt)}` : 'Chưa có phiên học'}
        </span>
        <button
          onClick={() => onSelectDomain(rootCategory.id)}
          className="font-semibold text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-0.5 transition cursor-pointer"
        >
          <span>Lộ trình</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
