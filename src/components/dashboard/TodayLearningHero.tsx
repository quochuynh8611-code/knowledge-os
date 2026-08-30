import React from 'react';
import { useData } from '../../context/DataContext';
import {
  getTodayRecommendation,
  TodayRecommendation,
} from '../../lib/learningStateSelectors';
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
    openTopicDetail,
  } = useData();

  const recommendation: TodayRecommendation | null = React.useMemo(() => {
    return getTodayRecommendation(topics, categories, reviewQueue);
  }, [topics, categories, reviewQueue]);

  // 1. Empty / Null State
  if (!recommendation) {
    return (
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-stone-100 rounded-3xl p-6 sm:p-8 shadow-md border border-stone-700/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Không gian học tập</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-title tracking-tight text-white">
              Bắt đầu lộ trình học tập của bạn
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Tạo các chủ đề đầu tiên để kích hoạt bàn điều khiển học tập và hệ thống ôn tập lặp lại ngắt quãng.
            </p>
          </div>
          {onOpenTopicModal && (
            <button
              onClick={onOpenTopicModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 shrink-0"
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

  // 2. Dynamic Banner Background / Accent by Tier
  const tierConfig = {
    review_due: {
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      badgeIcon: Brain,
      primaryBtnText: 'Ôn tập ngay',
      primaryBtnIcon: Brain,
      primaryBtnClass: 'bg-amber-600 hover:bg-amber-500 text-white',
      headline: 'Củng cố trí nhớ hôm nay',
    },
    in_progress: {
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      badgeIcon: TrendingUp,
      primaryBtnText: 'Vào học tiếp',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      headline: 'Tiếp tục bài học dở dang',
    },
    next_step: {
      badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      badgeIcon: BookOpen,
      primaryBtnText: 'Bắt đầu học bài này',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      headline: `Bài học tiếp theo (${rootCategory?.name || 'Môn học'})`,
    },
    fallback: {
      badgeBg: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
      badgeIcon: Sparkles,
      primaryBtnText: 'Bắt đầu học',
      primaryBtnIcon: Play,
      primaryBtnClass: 'bg-amber-600 hover:bg-amber-500 text-white',
      headline: 'Khởi động bài học mới',
    },
  }[tier];

  const BadgeIcon = tierConfig.badgeIcon;
  const PrimaryBtnIcon = tierConfig.primaryBtnIcon;

  return (
    <section
      data-testid="today-learning-hero"
      className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800 relative overflow-hidden"
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Focus Info */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${tierConfig.badgeBg}`}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{badgeLabel}</span>
            </span>

            {rootCategory && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700/80 font-medium">
                {rootCategory.name}
              </span>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 mb-0.5">
              {tierConfig.headline}
            </div>
            <h1
              onClick={handleSecondaryAction}
              className="text-lg sm:text-xl lg:text-2xl font-bold font-serif-title tracking-tight text-white hover:text-amber-300 transition cursor-pointer"
            >
              {topic.title}
            </h1>
          </div>

          <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
            {topic.description || reason}
          </p>

          {/* Quick Context Stats (Non-KPI, calm & minimal) */}
          <div className="flex items-center gap-3.5 text-[11px] text-stone-400 pt-0.5">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400/90" />
              <span>{topic.studyProgress?.timeSpent ? `${topic.studyProgress.timeSpent} phút tích lũy` : 'Chưa có thời gian học'}</span>
            </span>
            {progressPercent > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{progressPercent}% hoàn thành</span>
              </span>
            )}
          </div>
        </div>

        {/* Right 1-Click Action Cluster */}
        <div className="flex flex-row md:flex-col sm:items-stretch items-center gap-2 shrink-0 pt-1 md:pt-0">
          <button
            onClick={handlePrimaryAction}
            className={`w-full px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${tierConfig.primaryBtnClass}`}
          >
            <PrimaryBtnIcon className="w-3.5 h-3.5 fill-current" />
            <span>{tierConfig.primaryBtnText}</span>
          </button>

          <button
            onClick={handleSecondaryAction}
            className="w-full px-4 py-2 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Chi tiết bài học</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>
    </section>
  );
}
