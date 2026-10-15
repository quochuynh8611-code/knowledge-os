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
  Clock,
  Brain,
  BookOpen,
  Plus,
  X,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
} from 'lucide-react';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
import {
  getRootCategories,
  topicBelongsToRootCategory,
  resolveCategoryFilterToRootId,
} from '../../lib/taxonomyMigration';
import { getNeutralDomainStyle } from '../../lib/domainStyling';
import { useSidebarState } from './useSidebarState';

export interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  initialCollapsed?: boolean;
}

export function AppSidebar({
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggle,
  initialCollapsed,
}: AppSidebarProps) {
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

  const internalState = useSidebarState(initialCollapsed);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalState.isCollapsed;
  const toggleCollapse = controlledToggle !== undefined ? controlledToggle : internalState.toggleCollapse;

  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

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
      const isFocusA = Boolean(focusDomainId && a.id === focusDomainId);
      const isFocusB = Boolean(focusDomainId && b.id === focusDomainId);
      if (isFocusA && !isFocusB) return -1;
      if (!isFocusA && isFocusB) return 1;

      const countA = domainStats[a.id]?.total || 0;
      const countB = domainStats[b.id]?.total || 0;
      if (countB !== countA) {
        return countB - countA;
      }

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

  // Hub 1: KHẢO CỨU (Research & Sources)
  const researchNavItems: NavItemConfig[] = [
    { id: 'library', label: 'Thư Viện Sách', icon: BookOpen },
    { id: 'resources', label: 'Tài liệu & Giáo trình', icon: Library, badge: stats.totalResourcesCount },
  ];

  // Hub 2: HỌC TẬP & ÔN TẬP (Study & Recall)
  const studyNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'flashcards', label: 'Thẻ nhớ (Flashcards)', icon: Brain },
    {
      id: 'progress',
      label: 'Tiến độ & Hàng đợi',
      icon: TrendingUp,
      badge: reviewQueue.length > 0 ? `${reviewQueue.length} cần ôn` : undefined,
      highlight: reviewQueue.length > 0,
    },
  ];

  // Hub 3: VƯỜN TRI THỨC (Knowledge Garden)
  const gardenNavItems: NavItemConfig[] = [
    { id: 'topics', label: 'Chủ đề học', icon: FolderTree, badge: stats.totalTopics },
    { id: 'notes', label: 'Ghi chú & Đúc kết', icon: FileText, badge: stats.totalNotesCount },
    { id: 'graph', label: 'Bản đồ tri thức', icon: Share2 },
    { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Network },
  ];

  // Hub 4: PHÂN TÍCH & CÔNG CỤ (Insights & Tools)
  const toolsNavItems: NavItemConfig[] = [
    { id: 'search', label: 'Tìm kiếm', icon: Search },
    { id: 'ai_studio', label: 'AI Hỗ trợ', icon: Sparkles, badge: 'AI', highlight: true },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (tabId === 'topics' && activeTab !== 'topics') {
      setSelectedTopicId(null);
    }
  };

  const renderNavButton = (item: NavItemConfig) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    if (isCollapsed) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleNavClick(item.id)}
          title={item.label}
          aria-label={item.label}
          className={`relative w-full flex items-center justify-center p-2.5 my-0.5 rounded-xl transition-all select-none cursor-pointer group ${
            isActive
              ? 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-bold shadow-2xs border border-amber-300/80 dark:border-amber-700/80'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/80 hover:text-stone-950 dark:hover:text-stone-100'
          }`}
        >
          <Icon
            className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
              isActive
                ? 'text-amber-800 dark:text-amber-400'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          />
          {item.badge !== undefined && (
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                item.id === 'progress' && reviewQueue.length > 0
                  ? 'bg-amber-600 dark:bg-amber-500 animate-pulse'
                  : 'bg-amber-500/80 dark:bg-amber-400'
              }`}
            />
          )}
        </button>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavClick(item.id)}
        title={item.label}
        aria-label={item.label}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all select-none cursor-pointer ${
          isActive
            ? 'bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-bold shadow-2xs border border-amber-300/80 dark:border-amber-700/80'
            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/80 hover:text-stone-950 dark:hover:text-stone-100 font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 ${
              isActive
                ? 'text-amber-800 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 tabular-nums ${
              item.id === 'progress' && reviewQueue.length > 0
                ? 'bg-amber-600 dark:bg-amber-500 text-white animate-pulse'
                : isActive
                ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                : 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      data-testid="app-sidebar-container"
      className={`${
        isCollapsed ? 'w-18' : 'w-64'
      } bg-stone-100/70 dark:bg-stone-900/60 border-r border-stone-200/80 dark:border-stone-800/90 flex flex-col shrink-0 min-h-[calc(100vh-57px)] select-none transition-all duration-200 overflow-x-hidden`}
    >
      {/* Top Header Row with Toggle Button */}
      <div className={`p-2.5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3.5'} border-b border-stone-200/60 dark:border-stone-800/60`}>
        {!isCollapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 font-serif-title">
            Không Gian Làm Việc
          </span>
        )}
        <button
          data-testid="toggle-app-sidebar-btn"
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-label={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/80 rounded-xl transition cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Hub 1: KHẢO CỨU */}
      <div className={`${isCollapsed ? 'p-1.5' : 'p-3'} space-y-0.5`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-400/90 px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
            <span>Khảo Cứu</span>
          </div>
        )}
        {researchNavItems.map(renderNavButton)}
      </div>

      {/* Hub 2: HỌC TẬP & ÔN TẬP */}
      <div className={`${isCollapsed ? 'p-1.5' : 'px-3 pt-2 pb-1'} border-t border-stone-200/60 dark:border-stone-800/60 space-y-0.5`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            <span>Học Tập & Ôn Tập</span>
          </div>
        )}
        {studyNavItems.map(renderNavButton)}
      </div>

      {/* Hub 3: VƯỜN TRI THỨC */}
      <div className={`${isCollapsed ? 'p-1.5' : 'px-3 pt-2 pb-1'} border-t border-stone-200/60 dark:border-stone-800/60 space-y-0.5`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500"></span>
            <span>Vườn Tri Thức</span>
          </div>
        )}
        {gardenNavItems.map(renderNavButton)}
      </div>

      {/* Hub 4: PHÂN TÍCH & CÔNG CỤ */}
      <div className={`${isCollapsed ? 'p-1.5' : 'px-3 pt-2 pb-2'} border-t border-stone-200/60 dark:border-stone-800/60`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
              <span>Phân Tích & Công Cụ</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
              Suite
            </span>
          </div>
        )}
        <div className="space-y-0.5 mt-0.5">
          {toolsNavItems.map(renderNavButton)}
        </div>
      </div>

      {/* Domain Classification Filter */}
      {isCollapsed ? (
        <div className="p-1.5 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('topics');
            }}
            title={selectedCategoryFilter ? "Lĩnh vực đang chọn - Nhấn để xem chủ đề" : "Lĩnh vực nghiên cứu"}
            aria-label="Lĩnh vực nghiên cứu"
            className={`w-full flex items-center justify-center p-2.5 my-0.5 rounded-xl transition cursor-pointer ${
              selectedCategoryFilter
                ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 shadow-2xs'
                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
            }`}
          >
            <Filter className="w-5 h-5 text-stone-500 dark:text-stone-400" />
          </button>
        </div>
      ) : (
        <div className="px-3 pt-3 pb-2 border-t border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <span>Lĩnh Vực Nghiên Cứu</span>
            {selectedCategoryFilter && (
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline lowercase font-normal cursor-pointer"
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700/80 shadow-2xs'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <DomainIcon className={`w-3.5 h-3.5 ${domainStyle.sidebarIconColor} shrink-0`} />
                    <span className="truncate">{root.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                      ({domainStat.total})
                    </span>
                    <span className="text-[10px] font-mono text-stone-700 dark:text-stone-300 bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.2 rounded font-semibold tabular-nums">
                      {domainStat.donePercent}%
                    </span>
                  </div>
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
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-700"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-amber-700 dark:bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 cursor-pointer"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingDomain(false);
                      setNewDomainName('');
                    }}
                    className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingDomain(true)}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm lĩnh vực</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Study Habit Widget at bottom of sidebar */}
      {isCollapsed ? (
        <div className="mt-auto p-2 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col items-center">
          <div
            title={`Thời gian học: ${formatMinutesToHours(stats.totalTimeSpentMinutes)} (${stats.completedTopicsCount}/${stats.totalTopics} xong)`}
            aria-label={`Thời gian học: ${formatMinutesToHours(stats.totalTimeSpentMinutes)}`}
            className="p-2 rounded-xl bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center cursor-help"
          >
            <Clock className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="mt-auto p-3.5 m-3 bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 rounded-2xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Thời gian học
            </span>
            <span className="font-mono text-amber-900 dark:text-amber-300 font-bold tabular-nums">
              {formatMinutesToHours(stats.totalTimeSpentMinutes)}
            </span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-700 dark:bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((stats.completedTopicsCount / (stats.totalTopics || 1)) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 font-medium">
            <span>{stats.completedTopicsCount} / {stats.totalTopics} xong</span>
            <span className="font-mono">{Math.round((stats.completedTopicsCount / (stats.totalTopics || 1)) * 100)}%</span>
          </div>
        </div>
      )}
    </aside>
  );
}
