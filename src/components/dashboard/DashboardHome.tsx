import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatTimeAgo } from '../../lib/spaced-repetition';
import { SpacedReviewModal } from '../modals/SpacedReviewModal';
import { StudyTimerModal } from '../modals/StudyTimerModal';
import { TodayLearningHero } from './TodayLearningHero';
import { WeeklyCadenceBar } from './WeeklyCadenceBar';
import { LearningStateCard } from './LearningStateCard';
import { ResumeStudyQueue } from './ResumeStudyQueue';
import { FlashcardAnalyticsWidget } from '../flashcards/FlashcardAnalyticsWidget';
import { PageHeader } from '../workbench/PageHeader';
import { SectionHeader } from '../workbench/SectionHeader';
import { ToolbarButton } from '../workbench/ToolbarButton';
import {
  getDomainLearningStates,
  getWeeklyLearningCadence,
  sortDomainLearningStates,
} from '../../lib/learningStateSelectors';
import {
  Share2,
  BookOpen,
  Sparkles,
  FileText,
  Library,
  Clock,
  Folder,
  Plus,
  X,
  Boxes,
  Compass,
  GraduationCap,
  Play,
} from 'lucide-react';

export function DashboardHome() {
  const {
    topics,
    categories,
    notes,
    resources,
    focusDomainId,
    setFocusDomainId,
    openTopicDetail,
    setActiveTab,
    setSelectedCategoryFilter,
    addCategory,
  } = useData();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTopicId, setTimerTopicId] = useState<string | undefined>();
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  const weeklyCadence = useMemo(() => {
    return getWeeklyLearningCadence(topics);
  }, [topics]);

  const domainLearningStates = useMemo(() => {
    const states = getDomainLearningStates(topics, categories, new Date(), focusDomainId);
    return sortDomainLearningStates(states);
  }, [topics, categories, focusDomainId]);

  const handleCreateDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    const newId = addCategory({
      name: newDomainName.trim(),
      slug: '',
      parentId: null,
      color: '#475569',
    });

    setNewDomainName('');
    setIsAddingDomain(false);
    setSelectedCategoryFilter(newId);
    setActiveTab('topics');
  };

  // Recent items for secondary recent panel
  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2),
    [notes]
  );

  const recentResources = useMemo(
    () =>
      [...resources]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2),
    [resources]
  );

  const handleStartStudy = (topicId: string) => {
    setTimerTopicId(topicId);
    setShowTimerModal(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      {/* 0. Workbench Page Header */}
      <PageHeader
        title="Tổng Quan Nghiên Cứu"
        subtitle="Bàn điều khiển tổng hợp nhịp độ học tập, bài học đề xuất và trạng thái tích lũy đa lĩnh vực."
        categoryLabel="Research Hub & Learning Overview"
        categoryIcon={Compass}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ToolbarButton
              variant="primary"
              size="sm"
              icon={GraduationCap}
              onClick={() => setShowReviewModal(true)}
              title="Mở phiên ôn tập ngắt quãng"
            >
              Ôn tập thẻ
            </ToolbarButton>
            <ToolbarButton
              variant="outline"
              size="sm"
              icon={Play}
              onClick={() => {
                const firstTopic = topics[0];
                if (firstTopic) handleStartStudy(firstTopic.id);
                else setActiveTab('topics');
              }}
              title="Bắt đầu tính giờ phiên học mới"
            >
              Bấm giờ học
            </ToolbarButton>
          </div>
        }
      />

      {/* Khối 1: Today Recommendation & Action Hero */}
      <TodayLearningHero
        onStartStudy={handleStartStudy}
        onOpenReviewModal={() => setShowReviewModal(true)}
      />

      {/* Khối 2: Weekly Learning Cadence & Momentum Horizon */}
      <WeeklyCadenceBar cadence={weeklyCadence} />

      {/* Khối 2.5: Flashcard & Retention Progress Analytics */}
      <section>
        <FlashcardAnalyticsWidget />
      </section>

      {/* Khối 3: Multi-Disciplinary Learning State Hub */}
      <section className="space-y-3.5 sm:space-y-4">
        <SectionHeader
          title="Lĩnh vực học tập"
          icon={Folder}
          count={`${domainLearningStates.length} môn`}
          subtitle="Trạng thái học thực tế, bài học tiếp theo và thời gian tích lũy đa lĩnh vực"
          actions={
            isAddingDomain ? (
              <form onSubmit={handleCreateDomain} className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="Tên lĩnh vực mới..."
                  autoFocus
                  className="px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-700 text-stone-900 dark:text-stone-100"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingDomain(false);
                    setNewDomainName('');
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <ToolbarButton
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setIsAddingDomain(true)}
              >
                Thêm lĩnh vực
              </ToolbarButton>
            )
          }
        />

        {/* Dynamic Multi-Disciplinary Learning State Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
          {domainLearningStates.map((domainState) => (
            <LearningStateCard
              key={domainState.rootCategory.id}
              state={domainState}
              onSelectDomain={(catId) => {
                setSelectedCategoryFilter(catId);
                setActiveTab('topics');
              }}
              onToggleFocus={setFocusDomainId}
              onStartStudyTopic={handleStartStudy}
              onOpenTopicDetail={openTopicDetail}
            />
          ))}
        </div>
      </section>

      {/* Khối 4: Resume Study Queue & Recent Context (2-col grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Resume Study Queue */}
        <div className="lg:col-span-2">
          <ResumeStudyQueue
            topics={topics}
            onStartStudy={handleStartStudy}
            onOpenTopicDetail={openTopicDetail}
            onViewAllProgress={() => setActiveTab('progress')}
          />
        </div>

        {/* Right 1 Col: Recent Context (Secondary Context Panel) */}
        <div className="space-y-4">
          <div className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <h2 className="font-semibold text-stone-700 dark:text-stone-300 text-xs uppercase tracking-wider">
                  Ghi chú & Tài liệu gần đây
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openTopicDetail(note.topicId)}
                  className="p-2.5 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white dark:bg-stone-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">
                    <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Note
                    </span>
                    <span className="font-mono">{formatTimeAgo(note.createdAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">{note.title}</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                    Chủ đề: {note.topicTitle}
                  </p>
                </div>
              ))}

              {recentResources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => openTopicDetail(res.topicId)}
                  className="p-2.5 rounded-xl border border-stone-200/70 dark:border-stone-800/80 bg-white dark:bg-stone-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">
                    <span className="font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                      <Library className="w-3 h-3" /> {res.type.toUpperCase()}
                    </span>
                    <span className="font-mono">{formatTimeAgo(res.createdAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">{res.title}</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                    {res.author ? `Tác giả: ${res.author}` : res.topicTitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Khối 5: Utility Section - Bộ công cụ & Tiện ích chuyên sâu ở chân trang */}
      <section className="bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200/70 dark:border-stone-800/70 rounded-2xl p-4 sm:p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Công cụ & Tiện ích mở rộng
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500 hidden sm:inline">
            Không gian nghiên cứu chuyên sâu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('ai_studio')}
            className="p-3 bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 rounded-xl text-left transition duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
                AI Research Studio
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Trợ lý tổng hợp tri thức & trích dẫn đa nguồn</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="p-3 bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 rounded-xl text-left transition duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 group-hover:text-amber-700 dark:group-hover:text-amber-400" />
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
                Thư Viện Sách
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Trình đọc tài liệu & sách điện tử EPUB</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className="p-3 bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 rounded-xl text-left transition duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 group-hover:text-amber-700 dark:group-hover:text-amber-400" />
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
                Bản đồ tri thức
              </span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Mạng lưới liên kết & đồ thị quan hệ chủ đề</p>
          </button>
        </div>
      </section>

      {/* Modals */}
      <SpacedReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} />
      <StudyTimerModal
        isOpen={showTimerModal}
        onClose={() => {
          setShowTimerModal(false);
          setTimerTopicId(undefined);
        }}
        defaultTopicId={timerTopicId}
      />
    </div>
  );
}
