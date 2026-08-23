import React from 'react';
import { useData, ActiveTab } from '../../context/DataContext';
import {
  LayoutDashboard,
  FolderTree,
  Share2,
  TrendingUp,
  FileText,
  Library,
  Search,
  Sparkles,
  Compass,
  CheckCircle2,
  Clock,
  Brain,
  BookA,
} from 'lucide-react';
import { formatMinutesToHours } from '../../lib/spaced-repetition';

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    setSelectedTopicId,
    stats,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    categories,
    reviewQueue,
  } = useData();

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number | string; highlight?: boolean }[] = [
    { id: 'dashboard', label: 'Tổng Quan Nghiên Cứu', icon: LayoutDashboard },
    { id: 'ai_studio', label: 'Antigravity AI Scholar', icon: Sparkles, badge: 'AI', highlight: true },
    { id: 'topics', label: 'Quản Lý & Cây Chủ Đề', icon: FolderTree, badge: stats.totalTopics },
    { id: 'abhidharma_matrix', label: 'Ma Trận Vi Diệu Pháp', icon: Brain, badge: '89 Tâm' },
    { id: 'divination_matrix', label: 'Dịch Học & Kỳ Môn', icon: Compass, badge: '64 Quẻ' },
    { id: 'lexicon', label: 'Từ Điển Đa Ngữ Pali/Hán', icon: BookA },
    { id: 'graph', label: 'Biểu Đồ Tri Thức (Graph)', icon: Share2 },
    { id: 'progress', label: 'Tiến Độ & Ôn Tập (SM-2)', icon: TrendingUp, badge: reviewQueue.length > 0 ? reviewQueue.length : undefined },
    { id: 'notes', label: 'Ghi Chú & Wiki Link', icon: FileText, badge: stats.totalNotesCount },
    { id: 'resources', label: 'Tài Liệu & Thư Viện', icon: Library, badge: stats.totalResourcesCount },
    { id: 'search', label: 'Tra Cứu Chuyên Sâu', icon: Search },
  ];

  return (
    <aside className="w-64 bg-stone-100/70 border-r border-stone-200/80 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="p-3.5 space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 px-3 py-1.5">
          Danh mục chính
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'topics' && activeTab !== 'topics') {
                  setSelectedTopicId(null);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-amber-100 text-amber-900 font-semibold shadow-2xs'
                  : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-800' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.id === 'progress' && reviewQueue.length > 0
                      ? 'bg-amber-600 text-white animate-pulse'
                      : isActive
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Domain Classification Filter */}
      <div className="px-3.5 pt-4 pb-2 border-t border-stone-200">
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-600">
          <span>Lĩnh Vực Khảo Cứu</span>
          {selectedCategoryFilter && (
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className="text-[10px] text-amber-800 hover:underline lowercase font-normal"
            >
              xem tất cả
            </button>
          )}
        </div>

        <div className="space-y-1 mt-1">
          {/* Buddhism Category */}
          <button
            onClick={() => {
              setSelectedCategoryFilter(selectedCategoryFilter === 'phat-hoc' ? null : 'phat-hoc');
              setActiveTab('topics');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              selectedCategoryFilter === 'phat-hoc'
                ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300'
                : 'text-stone-700 hover:bg-stone-200/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Phật Học ({stats.phatHocTopics})</span>
            </div>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
              {stats.phatHocDonePercent}%
            </span>
          </button>

          {/* Esotericism Category */}
          <button
            onClick={() => {
              setSelectedCategoryFilter(selectedCategoryFilter === 'huyen-hoc' ? null : 'huyen-hoc');
              setActiveTab('topics');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              selectedCategoryFilter === 'huyen-hoc'
                ? 'bg-indigo-100/90 text-indigo-950 font-bold border border-indigo-300'
                : 'text-stone-700 hover:bg-stone-200/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-indigo-700" />
              <span>Huyền Học ({stats.huyenHocTopics})</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded">
              {stats.huyenHocDonePercent}%
            </span>
          </button>
        </div>
      </div>

      {/* Study Habit Widget at bottom of sidebar */}
      <div className="mt-auto p-4 m-3 bg-stone-200/70 border border-stone-300/80 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-800" /> Thời gian học
          </span>
          <span className="font-mono text-amber-900">{formatMinutesToHours(stats.totalTimeSpentMinutes)}</span>
        </div>
        <div className="w-full bg-stone-300 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-700 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((stats.completedTopicsCount / (stats.totalTopics || 1)) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-stone-600 font-medium">
          <span>{stats.completedTopicsCount} / {stats.totalTopics} chủ đề xong</span>
          <span>{Math.round((stats.completedTopicsCount / (stats.totalTopics || 1)) * 100)}%</span>
        </div>
      </div>
    </aside>
  );
}
