import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatTimeAgo } from '../../lib/spaced-repetition';
import { SpacedReviewModal } from '../modals/SpacedReviewModal';
import { StudyTimerModal } from '../modals/StudyTimerModal';
import { TodayLearningHero } from './TodayLearningHero';
import { LearningStateCard } from './LearningStateCard';
import { ResumeStudyQueue } from './ResumeStudyQueue';
import { getDomainLearningStates } from '../../lib/learningStateSelectors';
import {
  Compass,
  Share2,
  BookA,
  BookOpen,
  Sparkles,
  Brain,
  FileText,
  Library,
  Clock,
  Folder,
  Plus,
  X,
  ArrowUpRight,
  Boxes,
} from 'lucide-react';

export function DashboardHome() {
  const {
    topics,
    categories,
    notes,
    resources,
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

  const domainLearningStates = useMemo(
    () => getDomainLearningStates(topics, categories),
    [topics, categories]
  );

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Khối 1: Today Recommendation & Action Hero */}
      <TodayLearningHero
        onStartStudy={handleStartStudy}
        onOpenReviewModal={() => setShowReviewModal(true)}
      />

      {/* Khối 3: Multi-Disciplinary Learning State Hub */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif-title flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-800 dark:text-amber-400" />
              <span>Lĩnh vực học tập</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Trạng thái học thực tế, bài học tiếp theo và thời gian tích lũy đa lĩnh vực
            </p>
          </div>

          {/* Add Domain CTA Button / Inline Form */}
          {isAddingDomain ? (
            <form onSubmit={handleCreateDomain} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="Tên lĩnh vực mới..."
                autoFocus
                className="px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-700"
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
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingDomain(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-stone-700 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-300 border border-stone-200/80 dark:border-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Thêm lĩnh vực</span>
            </button>
          )}
        </div>

        {/* Dynamic Multi-Disciplinary Learning State Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {domainLearningStates.map((domainState) => (
            <LearningStateCard
              key={domainState.rootCategory.id}
              state={domainState}
              onSelectDomain={(catId) => {
                setSelectedCategoryFilter(catId);
                setActiveTab('topics');
              }}
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

        {/* Right 1 Col: Recent Notes & Resources */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Ghi chú & Tài liệu mới</h2>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openTopicDetail(note.topicId)}
                  className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 hover:border-amber-200 dark:hover:border-amber-800 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">
                    <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Note
                    </span>
                    <span>{formatTimeAgo(note.createdAt)}</span>
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
                  className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">
                    <span className="font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                      <Library className="w-3 h-3" /> {res.type.toUpperCase()}
                    </span>
                    <span>{formatTimeAgo(res.createdAt)}</span>
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
      <section className="bg-stone-50/80 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Công cụ & Tiện ích chuyên sâu
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            Hỗ trợ nghiên cứu & phân tích
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => setActiveTab('ai_studio')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              AI Hỗ trợ
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Hỏi đáp đa môn</div>
          </button>

          <button
            onClick={() => setActiveTab('abhidharma_matrix')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <Brain className="w-4 h-4 text-indigo-700 dark:text-indigo-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              Ma trận Tâm
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">89/121 Tâm & Sở hữu</div>
          </button>

          <button
            onClick={() => setActiveTab('divination_matrix')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <Compass className="w-4 h-4 text-amber-700 dark:text-amber-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              Mô hình Dịch
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">64 Quẻ & Kỳ Môn</div>
          </button>

          <button
            onClick={() => setActiveTab('lexicon')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <BookA className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              Thuật ngữ
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Từ điển đa ngữ</div>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-700 dark:text-sky-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              Tài liệu
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Kiến trúc Markdown</div>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className="p-3 bg-white dark:bg-stone-800/80 hover:bg-amber-50/70 dark:hover:bg-amber-950/60 border border-stone-200/70 dark:border-stone-700/70 hover:border-amber-300 dark:hover:border-amber-700 rounded-xl text-left transition group cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-purple-700 dark:text-purple-400 mb-1.5" />
            <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
              Bản đồ tri thức
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1">Mạng lưới liên kết</div>
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
