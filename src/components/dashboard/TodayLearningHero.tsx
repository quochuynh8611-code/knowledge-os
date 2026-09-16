import React from 'react';
import { useData } from '../../context/DataContext';
import {
  getTodayRecommendation,
  TodayRecommendation,
} from '../../lib/learningStateSelectors';
import { StatusPill } from '../workbench/StatusPill';
import {
  Sparkles,
  Play,
  Brain,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export interface TodayLearningHeroProps {
  onStartStudy?: (topicId: string) => void;
  onOpenReviewModal?: () => void;
  onOpenTopicModal?: () => void;
}

export function TodayLearningHero({
  onStartStudy,
  onOpenReviewModal,
  onOpenTopicModal,
}: TodayLearningHeroProps = {}) {
  const {
    topics,
    categories,
    reviewQueue,
    focusDomainId,
    openTopicDetail,
  } = useData();

  const recommendation: TodayRecommendation | null = React.useMemo(() => {
    return getTodayRecommendation(topics, categories, reviewQueue, new Date(), focusDomainId);
  }, [topics, categories, reviewQueue, focusDomainId]);

  // 1. Empty / Null State
  if (!recommendation) {
    return (
      <div
        data-testid="today-learning-hero"
        className="bg-linear-to-br from-amber-500/5 via-stone-50/80 to-stone-100/50 dark:from-stone-900/90 dark:via-stone-900/95 dark:to-stone-950 text-stone-900 dark:text-stone-100 rounded-2xl p-5 sm:p-6 shadow-2xs border border-amber-300/40 dark:border-stone-800 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Không gian học tập</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-title tracking-tight text-stone-900 dark:text-white">
              Bắt đầu lộ trình học tập của bạn
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Tạo các chủ đề đầu tiên để kích hoạt bàn điều khiển học tập và hệ thống ôn tập lặp lại ngắt quãng.
            </p>
          </div>
          {onOpenTopicModal && (
            <button
              onClick={onOpenTopicModal}
              className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Tạo chủ đề đầu tiên</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { topic, rootCategory, tier, badgeLabel, reason } = recommendation;
  const progressPercent = topic.studyProgress?.progress || 0;

  const handlePrimaryAction = () => {
    if (tier === 'review_due' && onOpenReviewModal) {
      onOpenReviewModal();
    } else if (onStartStudy) {
      onStartStudy(topic.id);
    } else {
      openTopicDetail(topic.id);
    }
  };

  const handleSecondaryAction = () => {
    openTopicDetail(topic.id);
  };

  // 2. Dynamic Banner Configuration by Tier
  const tierConfig = {
    review_due: {
      pillVariant: 'accent' as const,
      badgeIcon: Brain,
      primaryBtnText: 'Ôn tập ngay',
      primaryBtnIcon: Brain,
      primaryBtnClass: 'bg-amber-700 hover:bg-amber-800 text-white border border-amber-800/80',
      headline: 'Củng cố trí nhớ hôm nay',
    },
    in_progress: {
      pillVariant: 'success' as const,
      badgeIcon: TrendingUp,
      primaryBtnText: 'Vào học tiếp',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800/80',
      headline: 'Tiếp tục bài học dở dang',
    },
    next_step: {
      pillVariant: 'info' as const,
      badgeIcon: BookOpen,
      primaryBtnText: 'Bắt đầu học bài này',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-indigo-700 hover:bg-indigo-800 text-white border border-indigo-800/80',
      headline: `Bài học tiếp theo (${rootCategory?.name || 'Môn học'})`,
    },
    fallback: {
      pillVariant: 'neutral' as const,
      badgeIcon: Sparkles,
      primaryBtnText: 'Bắt đầu học',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-amber-700 hover:bg-amber-800 text-white border border-amber-800/80',
      headline: 'Khởi động bài học mới',
    },
  }[tier];

  const BadgeIcon = tierConfig.badgeIcon;
  const PrimaryBtnIcon = tierConfig.primaryBtnIcon;

  return (
    <section
      data-testid="today-learning-hero"
      className="bg-linear-to-br from-amber-500/5 via-stone-50/80 to-stone-100/40 dark:from-stone-900/95 dark:via-stone-900/90 dark:to-stone-950 text-stone-900 dark:text-stone-100 rounded-2xl p-5 sm:p-6 shadow-2xs border border-stone-200/90 dark:border-stone-800 relative overflow-hidden"
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Focus Info */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              variant={tierConfig.pillVariant}
              size="xs"
              icon={BadgeIcon}
            >
              {badgeLabel}
            </StatusPill>

            {rootCategory && (
              <StatusPill variant="neutral" size="xs">
                {rootCategory.name}
              </StatusPill>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-0.5">
              {tierConfig.headline}
            </div>
            <h1
              onClick={handleSecondaryAction}
              className="text-lg sm:text-xl lg:text-2xl font-bold font-serif-title tracking-tight text-stone-900 dark:text-white hover:text-amber-800 dark:hover:text-amber-300 transition cursor-pointer"
            >
              {topic.title}
            </h1>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
            {topic.description || reason}
          </p>

          {/* Quick Context Stats */}
          <div className="flex items-center gap-3.5 text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{topic.studyProgress?.timeSpent ? `${topic.studyProgress.timeSpent} phút tích lũy` : 'Chưa có thời gian học'}</span>
            </span>
            {progressPercent > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{progressPercent}% hoàn thành</span>
              </span>
            )}
          </div>
        </div>

        {/* Right 1-Click Action Cluster */}
        <div className="flex flex-row md:flex-col sm:items-stretch items-center gap-2 shrink-0 pt-1 md:pt-0">
          <button
            onClick={handlePrimaryAction}
            className={`w-full px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer ${tierConfig.primaryBtnClass}`}
          >
            <PrimaryBtnIcon className="w-3.5 h-3.5 fill-current" />
            <span>{tierConfig.primaryBtnText}</span>
          </button>

          <button
            onClick={handleSecondaryAction}
            className="w-full px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Chi tiết bài học</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          </button>
        </div>
      </div>
    </section>
  );
}
