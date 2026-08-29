import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Category } from '../../types';
import {
  Sparkles,
  Compass,
  BookOpen,
  FileText,
  Library,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Search,
  Brain,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Folder,
  Plus,
  X,
} from 'lucide-react';
import { formatMinutesToHours, formatTimeAgo } from '../../lib/spaced-repetition';
import { SpacedReviewModal } from '../modals/SpacedReviewModal';
import { StudyTimerModal } from '../modals/StudyTimerModal';
import {
  getRootCategories,
  getChildCategories,
  calculateRootCategoryStats,
} from '../../lib/taxonomyMigration';
import { getNeutralDomainStyle } from '../../lib/domainStyling';

export function DashboardHome() {
  const {
    stats,
    topics,
    categories,
    notes,
    resources,
    openTopicDetail,
    setActiveTab,
    setSearchQuery,
    setSelectedCategoryFilter,
    reviewQueue,
    startStudyTimer,
    addCategory,
  } = useData();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTopicId, setTimerTopicId] = useState<string | undefined>();
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      setActiveTab('search');
    }
  };

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

  const getDomainSubtitle = (root: Category) => {
    const childCats = getChildCategories(categories, root.id);
    if (childCats.length > 0) {
      return childCats.slice(0, 4).map((c) => c.name).join(', ');
    }
    return root.description || 'Khảo sát chuyên sâu';
  };

  // In-progress topics for "Tiến độ tuần này"
  const inProgressTopics = topics
    .filter((t) => t.studyProgress.status === 'in_progress' || t.studyProgress.status === 'reviewing')
    .slice(0, 4);

  // Recent items
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  const recentTopics = [...topics]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 2);

  const recentResources = [...resources]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  const handleStartStudy = (topicId: string) => {
    setTimerTopicId(topicId);
    setShowTimerModal(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-7">
      {/* Top Banner: Research Overview Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Không Gian Nghiên Cứu</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight font-serif-title">
            Tổng quan nghiên cứu
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Hệ thống hóa học thuật, ghi chú và quản trị tri thức đa lĩnh vực
          </p>
        </div>

        {/* Due Reviews Notification Pill */}
        {reviewQueue.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-2xl shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                {reviewQueue.length} chủ đề đến hạn ôn tập (SM-2)
              </div>
              <div className="text-[11px] text-amber-800">
                Thuật toán lặp lại ngắt quãng để củng cố trí nhớ
              </div>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="ml-2 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Ôn ngay
            </button>
          </div>
        )}
      </div>

      {/* Research Domain Hub Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif-title flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-800" />
              <span>Lĩnh vực nghiên cứu</span>
            </h2>
            <p className="text-xs text-stone-500">
              Không gian tri thức chuyên ngành và tiến độ khảo sát học thuật
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
                className="px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-700"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingDomain(false);
                  setNewDomainName('');
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingDomain(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200/80 rounded-xl text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              <span>Thêm lĩnh vực</span>
            </button>
          )}
        </div>

        {/* Dynamic Root Domain Cards + System Stat Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Dynamic Root Category Cards */}
          {rootCategories.map((root) => {
            const style = getNeutralDomainStyle(root);
            const domainStat = calculateRootCategoryStats(topics, categories, root.id);
            const Icon = style.icon;
            const subtitle = getDomainSubtitle(root);

            return (
              <div
                key={root.id}
                onClick={() => {
                  setSelectedCategoryFilter(root.id);
                  setActiveTab('topics');
                }}
                className={`bg-white border border-stone-200/90 rounded-2xl p-5 ${style.hoverBorder} hover:shadow-md transition cursor-pointer relative overflow-hidden group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center font-bold`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-stone-900 text-sm">{root.name}</span>
                  </div>
                  <ArrowUpRight className={`w-4 h-4 text-stone-400 ${style.arrowHover} transition`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-serif-title text-stone-900">{domainStat.totalTopics}</span>
                  <span className="text-xs text-stone-500 font-medium">chủ đề (topics)</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500">Mức độ hoàn thành</span>
                    <span className={`font-bold ${style.percentText}`}>{domainStat.donePercent}% done</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${style.progressBar} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${domainStat.donePercent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                  <span className="truncate pr-2">{subtitle}</span>
                  <span className={`${style.actionText} font-medium shrink-0`}>Khảo sát →</span>
                </div>
              </div>
            );
          })}

          {/* System Card: Đang học / Tiến độ */}
          <div
            onClick={() => setActiveTab('progress')}
            className="bg-white border border-stone-200/90 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md transition cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-semibold text-stone-900 text-sm">Đang học</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-700 transition" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif-title text-stone-900">{stats.studyingThisWeek}</span>
              <span className="text-xs text-stone-500 font-medium">topic this week</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-500">Tổng thời gian tích lũy</span>
                <span className="font-bold text-emerald-800">{formatMinutesToHours(stats.totalTimeSpentMinutes)}</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((stats.completedTopicsCount / (stats.totalTopics || 1)) * 100))}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
              <span>{stats.totalNotesCount} ghi chú • {stats.totalResourcesCount} tài liệu</span>
              <span className="text-emerald-700 font-medium">Chi tiết →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Tiến độ tuần này (Left) & Gần đây + Tìm kiếm (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tiến độ tuần này */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-700" />
                <h2 className="font-bold text-stone-900 text-sm">Tiến độ tuần này</h2>
              </div>
              <button
                onClick={() => setActiveTab('progress')}
                className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
              >
                Xem tất cả ({topics.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {inProgressTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3.5 rounded-xl border border-stone-200/70 hover:border-amber-300 hover:bg-stone-50/70 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                            topic.type === 'phat-hoc'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-indigo-100 text-indigo-900'
                          }`}
                        >
                          {topic.categoryName}
                        </span>
                        <span className="text-xs font-semibold text-stone-800 cursor-pointer hover:text-amber-800" onClick={() => openTopicDetail(topic.id)}>
                          {topic.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1">{topic.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartStudy(topic.id)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                        title="Bắt đầu phiên học với chủ đề này"
                      >
                        <Play className="w-3 h-3 fill-current" /> Học
                      </button>
                      <button
                        onClick={() => openTopicDetail(topic.id)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-stone-500 font-mono">
                        ⏱️ {topic.studyProgress.timeSpent} phút tích lũy
                      </span>
                      <span className="font-bold text-stone-800">{topic.studyProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          topic.type === 'phat-hoc' ? 'bg-amber-600' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${topic.studyProgress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {inProgressTopics.length === 0 && (
                <div className="p-5 text-center bg-stone-50/80 border border-dashed border-stone-300 rounded-xl space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Bắt đầu phiên học tập đầu tiên</h3>
                    <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-0.5">
                      Toàn bộ tiến độ đang ở trạng thái nguyên sơ 0%. Hãy chọn một chủ đề nòng cốt để bắt đầu:
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {topics.slice(0, 3).map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleStartStudy(topic.id)}
                        className="px-3 py-1.5 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 border border-stone-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Play className="w-3 h-3 fill-current text-amber-700" />
                        <span className="truncate max-w-[160px]">{topic.title.split('-')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search Box (Page 5 wireframe) */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Search className="w-4 h-4 text-amber-700" />
              <span>Tìm kiếm nhanh</span>
            </div>
            <form onSubmit={handleQuickSearch} className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Tra cứu chủ đề, ghi chú, khái niệm học thuật..."
                className="w-full pl-9 pr-16 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-700/40"
              />
              <button
                type="submit"
                disabled={!localSearch.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-amber-800 hover:bg-amber-900 disabled:opacity-40 disabled:hover:bg-amber-800 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
              >
                Tìm
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5 pt-1 items-center">
              <span className="text-[11px] text-stone-600 font-medium">Từ khóa phổ biến:</span>
              {['Abhidharma', 'Vi Diệu Pháp', 'Kỳ Môn', 'Thiền Vipassana', 'Kinh Dịch', 'Thái Ất'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setLocalSearch(tag);
                    setSearchQuery(tag);
                    setActiveTab('search');
                  }}
                  className="px-2 py-0.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-md text-[11px] transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Gần đây (Recent activities matching Page 5) */}
        <div className="space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-600" />
                <h2 className="font-bold text-stone-900 text-sm">Gần đây</h2>
              </div>
            </div>

            {/* List of Recent Items */}
            <div className="space-y-3">
              {/* Recent Notes */}
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openTopicDetail(note.topicId)}
                  className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-amber-50/60 hover:border-amber-200 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-600 mb-1">
                    <span className="font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Note ({note.type})
                    </span>
                    <span>{formatTimeAgo(note.createdAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">{note.title}</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    Chủ đề: {note.topicTitle}
                  </p>
                </div>
              ))}

              {/* Recent Topics */}
              {recentTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => openTopicDetail(topic.id)}
                  className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-amber-50/60 hover:border-amber-200 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-600 mb-1">
                    <span className="font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Topic
                    </span>
                    <span>{formatTimeAgo(topic.updatedAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">{topic.title}</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    {topic.categoryName} • {topic.studyProgress.progress}% hoàn thành
                  </p>
                </div>
              ))}

              {/* Recent Resources */}
              {recentResources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => openTopicDetail(res.topicId)}
                  className="p-2.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-indigo-50/60 hover:border-indigo-200 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-600 mb-1">
                    <span className="font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                      <Library className="w-3 h-3" /> Resource ({res.type.toUpperCase()})
                    </span>
                    <span>{formatTimeAgo(res.createdAt)}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">{res.title}</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    {res.author ? `Tác giả: ${res.author}` : res.topicTitle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Exploration Shortcuts */}
          <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Lối tắt nhanh</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('graph')}
                className="p-2.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-left transition"
              >
                <div className="font-semibold text-xs text-stone-900">Biểu đồ tri thức</div>
                <div className="text-[10px] text-stone-500">Xem liên kết mạng</div>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className="p-2.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-left transition"
              >
                <div className="font-semibold text-xs text-stone-900">Kho ghi chú</div>
                <div className="text-[10px] text-stone-500">{notes.length} bài ghi chép</div>
              </button>
            </div>
          </div>
        </div>
      </div>

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
