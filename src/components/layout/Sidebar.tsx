import React, { useState, useMemo } from 'react';
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
  Clock,
  Brain,
  BookA,
  BookOpen,
  Plus,
  X,
  Folder,
} from 'lucide-react';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
import {
  getRootCategories,
  topicBelongsToRootCategory,
  resolveCategoryFilterToRootId,
} from '../../lib/taxonomyMigration';
import { getNeutralDomainStyle } from '../../lib/domainStyling';
import { getScholarSuiteCounts } from '../../lib/scholarSuite/selectors';

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    setSelectedTopicId,
    stats,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    categories,
    topics,
    addCategory,
    reviewQueue,
    focusDomainId,
  } = useData();

  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  const scholarCounts = useMemo(() => getScholarSuiteCounts(), []);

  const rootCategories = useMemo(() => {
    return getRootCategories(categories);
  }, [categories]);

  const canonicalFilterRootId = useMemo(() => {
    return resolveCategoryFilterToRootId(categories, selectedCategoryFilter);
  }, [categories, selectedCategoryFilter]);

  // Compute topic stats for each root domain dynamically
  const domainStats = useMemo(() => {
    const map: Record<string, { total: number; donePercent: number }> = {};
    const activeTopics = topics.filter((t) => t.visibility !== 'hidden');

    rootCategories.forEach((root) => {
      const rootTopics = activeTopics.filter((t) =>
        topicBelongsToRootCategory(t, categories, root.id)
      );

      const completed = rootTopics.filter(
        (t) =>
          (t.studyProgress?.progress || 0) >= 100 ||
          t.studyProgress?.status === 'completed'
      ).length;

      const donePercent =
        rootTopics.length > 0
          ? Math.round((completed / rootTopics.length) * 100)
          : 0;

      map[root.id] = {
        total: rootTopics.length,
        donePercent,
      };
    });

    return map;
  }, [categories, rootCategories, topics]);

  const sortedRootCategories = useMemo(() => {
    const roots = getRootCategories(categories);
    return [...roots].sort((a, b) => {
      // 1. isFocus
      const isFocusA = Boolean(focusDomainId && a.id === focusDomainId);
      const isFocusB = Boolean(focusDomainId && b.id === focusDomainId);
      if (isFocusA && !isFocusB) return -1;
      if (!isFocusA && isFocusB) return 1;

      // 2. totalTopics desc
      const countA = domainStats[a.id]?.total || 0;
      const countB = domainStats[b.id]?.total || 0;
      if (countB !== countA) {
        return countB - countA;
      }

      // 3. name A-Z
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [categories, domainStats, focusDomainId]);

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
  };

  type NavItemConfig = {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    highlight?: boolean;
  };

  // Tầng 1: HỌC TẬP (Learning - Trọng tâm)
  const learningNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    {
      id: 'progress',
      label: 'Tiến độ & Ôn tập',
      icon: TrendingUp,
      badge: reviewQueue.length > 0 ? `${reviewQueue.length} cần ôn` : undefined,
      highlight: reviewQueue.length > 0,
    },
    {
      id: 'flashcards',
      label: 'Thẻ nhớ (Flashcards)',
      icon: Brain,
    },
    { id: 'topics', label: 'Chủ đề học', icon: FolderTree, badge: stats.totalTopics },
  ];

  // Tầng 2: TRI THỨC (Knowledge Base)
  const knowledgeNavItems: NavItemConfig[] = [
    { id: 'notes', label: 'Ghi chú', icon: FileText, badge: stats.totalNotesCount },
    { id: 'resources', label: 'Tài liệu', icon: Library, badge: stats.totalResourcesCount },
    { id: 'graph', label: 'Bản đồ tri thức', icon: Share2 },
    { id: 'search', label: 'Tìm kiếm', icon: Search },
  ];

  // Tầng 3: CÔNG CỤ & TIỆN ÍCH (Tools & Scholar Suite)
  const toolsNavItems: NavItemConfig[] = [
    { id: 'ai_studio', label: 'AI Hỗ trợ', icon: Sparkles, badge: 'AI', highlight: true },
    {
      id: 'abhidharma_matrix',
      label: 'Ma trận phân tích',
      icon: Brain,
      badge: `${scholarCounts.totalCittas} Tâm`,
    },
    {
      id: 'divination_matrix',
      label: 'Mô hình hệ thống',
      icon: Compass,
      badge: `${scholarCounts.totalHexagrams} Quẻ`,
    },
    { id: 'lexicon', label: 'Từ điển thuật ngữ', icon: BookA },
    { id: 'docs', label: 'Tài liệu kiến trúc', icon: BookOpen },
  ];

  const renderNavButton = (item: NavItemConfig) => {
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
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
          isActive
            ? 'bg-amber-100 text-amber-950 font-semibold shadow-2xs border-l-[3px] border-amber-800 pl-2.5'
            : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900 border-l-[3px] border-transparent pl-2.5'
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
  };

  return (
    <aside className="w-64 bg-stone-100/70 border-r border-stone-200/80 flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
      {/* Tầng 1: HỌC TẬP */}
      <div className="p-3 space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 px-2.5 py-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          <span>Học tập</span>
        </div>
        {learningNavItems.map(renderNavButton)}
      </div>

      {/* Tầng 2: TRI THỨC */}
      <div className="px-3 pt-2 pb-1 border-t border-stone-200/60 space-y-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-2.5 py-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
          <span>Tri thức</span>
        </div>
        {knowledgeNavItems.map(renderNavButton)}
      </div>

      {/* Tầng 3: CÔNG CỤ & TIỆN ÍCH */}
      <div className="px-3 pt-2 pb-2 border-t border-stone-200/60">
        <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Công cụ</span>
          </div>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-stone-200 text-stone-600 font-semibold">
            Suite
          </span>
        </div>
        <div className="space-y-0.5 mt-0.5">
          {toolsNavItems.map(renderNavButton)}
        </div>
      </div>

      {/* Domain Classification Filter */}
      <div className="px-3.5 pt-4 pb-2 border-t border-stone-200">
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-600">
          <span>Lĩnh Vực Nghiên Cứu</span>
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
          {sortedRootCategories.map((root) => {
            const isSelected = canonicalFilterRootId === root.id;
            const domainStat = domainStats[root.id] || { total: 0, donePercent: 0 };
            const domainStyle = getNeutralDomainStyle(root);
            const DomainIcon = domainStyle.icon;

            return (
              <button
                key={root.id}
                onClick={() => {
                  setSelectedCategoryFilter(isSelected ? null : root.id);
                  setActiveTab('topics');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                  isSelected
                    ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300'
                    : 'text-stone-700 hover:bg-stone-200/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <DomainIcon className={`w-3.5 h-3.5 ${domainStyle.sidebarIconColor} shrink-0`} />
                  <span className="truncate">{root.name} ({domainStat.total})</span>
                </div>
                <span className="text-[10px] font-mono text-stone-800 bg-stone-200/70 px-1.5 py-0.5 rounded shrink-0">
                  {domainStat.donePercent}%
                </span>
              </button>
            );
          })}

          {/* Add Domain Button & Form */}
          {isAddingDomain ? (
            <form onSubmit={handleCreateDomain} className="pt-2 px-1 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="Tên lĩnh vực mới..."
                  autoFocus
                  className="w-full px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-700"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingDomain(false);
                    setNewDomainName('');
                  }}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingDomain(true)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm lĩnh vực</span>
            </button>
          )}
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
