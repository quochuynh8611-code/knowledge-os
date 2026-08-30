import React from 'react';
import { Topic } from '../../types';
import { getResumeQueue } from '../../lib/learningStateSelectors';
import { formatTimeAgo } from '../../lib/spaced-repetition';
import {
  Play,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export interface ResumeStudyQueueProps {
  topics: Topic[];
  onStartStudy: (topicId: string) => void;
  onOpenTopicDetail: (topicId: string) => void;
  onViewAllProgress?: () => void;
}

export function ResumeStudyQueue({
  topics,
  onStartStudy,
  onOpenTopicDetail,
  onViewAllProgress,
}: ResumeStudyQueueProps) {
  const queue = React.useMemo(() => getResumeQueue(topics, 4), [topics]);

  return (
    <section
      data-testid="resume-study-queue"
      className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
            Tiếp tục bài học dở dang
          </h2>
          {queue.length > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300">
              {queue.length} bài
            </span>
          )}
        </div>

        {onViewAllProgress && (
          <button
            onClick={onViewAllProgress}
            className="text-xs text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 font-medium flex items-center gap-1 transition cursor-pointer"
          >
            <span>Tất cả tiến độ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {queue.map((topic) => {
          const progress = topic.studyProgress?.progress || 0;
          const timeLabel = topic.studyProgress?.lastStudied
            ? formatTimeAgo(topic.studyProgress.lastStudied)
            : 'Gần đây';

          return (
            <div
              key={topic.id}
              className="p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-stone-50/70 dark:hover:bg-stone-800/60 transition space-y-2 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {topic.categoryName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {topic.categoryName}
                      </span>
                    )}
                    <span
                      onClick={() => onOpenTopicDetail(topic.id)}
                      className="text-xs font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer transition truncate"
                    >
                      {topic.title}
                    </span>
                  </div>
                  {topic.description && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onStartStudy(topic.id)}
                    className="px-2.5 py-1.5 bg-stone-900 dark:bg-stone-100 hover:bg-amber-800 dark:hover:bg-amber-400 text-white dark:text-stone-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Bắt đầu phiên tính giờ học cho chủ đề này"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Học tiếp</span>
                  </button>
                  <button
                    onClick={() => onOpenTopicDetail(topic.id)}
                    className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>

              {/* Progress Bar & Recency */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Đã học: {timeLabel}</span>
                  </span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 font-mono">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="p-6 text-center bg-stone-50/60 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-700 rounded-xl space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Không có bài học nào đang dở dang
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Hãy chọn một bài học trong các môn học phía trên để bắt đầu phiên học tập.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
