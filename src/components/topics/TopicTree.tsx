import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Topic, Category, TopicStatus } from '../../types';
import {
  FolderTree,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Sparkles,
  Compass,
  CheckCircle2,
  Clock,
  BookOpen,
  Tag as TagIcon,
  Layers,
  ArrowRight,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Folder,
} from 'lucide-react';
import { TopicFormModal } from '../modals/TopicFormModal';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
import { getRootCategories } from '../../lib/taxonomyMigration';

export function TopicTree() {
  const {
    topics,
    categories,
    openTopicDetail,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedTagFilter,
    setSelectedTagFilter,
    deleteTopic,
    hideTopic,
    restoreTopic,
    tags,
  } = useData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'active' | 'hidden' | 'all'>('active');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((c) => {
      initial[c.id] = true;
    });
    return initial;
  });

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    categories.forEach((c) => {
      allExp[c.id] = true;
    });
    setExpandedCategories(allExp);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      // Visibility filter
      if (visibilityFilter === 'active' && t.visibility === 'hidden') return false;
      if (visibilityFilter === 'hidden' && t.visibility !== 'hidden') return false;

      // Domain filter
      if (selectedCategoryFilter) {
        const cat = categories.find((c) => c.id === t.categoryId);
        const matchRoot =
          t.type === selectedCategoryFilter ||
          t.categorySlug === selectedCategoryFilter ||
          cat?.parentId === selectedCategoryFilter ||
          cat?.id === selectedCategoryFilter;
        if (!matchRoot) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && t.studyProgress.status !== statusFilter) return false;
      // Tag filter
      if (selectedTagFilter && !t.tags.includes(selectedTagFilter)) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchTag = t.tags?.some((tg) => tg.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      return true;
    });
  }, [topics, categories, selectedCategoryFilter, statusFilter, selectedTagFilter, visibilityFilter, search]);

  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">Hoàn thành</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">Đang học</span>;
      case 'reviewing':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">Ôn tập</span>;
      default:
        return <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-medium">Chưa học</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
            <FolderTree className="w-3.5 h-3.5" />
            <span>Phân Cấp Tri Thức</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
            Cây Phân Cấp &amp; Quản Lý Chủ Đề
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Hệ thống hóa phân nhánh các lĩnh vực nghiên cứu và quản lý trạng thái hiển thị chủ đề
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Thêm Chủ Đề Mới
          </button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên chủ đề, tag, nội dung..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-700"
            />
          </div>

          {/* Dynamic Domain Filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition ${
                !selectedCategoryFilter
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tất cả
            </button>
            {rootCategories.map((root) => {
              const rootKey = root.slug || root.type || root.id;
              const isSelected =
                selectedCategoryFilter === root.id ||
                selectedCategoryFilter === root.slug ||
                selectedCategoryFilter === root.type;
              return (
                <button
                  key={root.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? null : rootKey)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Folder className="w-3 h-3" /> {root.name}
                </button>
              );
            })}
          </div>

          {/* Status & Visibility Filters */}
          <div className="flex items-center gap-2">
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as 'active' | 'hidden' | 'all')}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
            >
              <option value="active">Chủ đề hoạt động</option>
              <option value="hidden">Chủ đề đã ẩn</option>
              <option value="all">Tất cả chủ đề</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
            >
              <option value="all">Tất cả tiến độ</option>
              <option value="in_progress">Đang nghiên cứu</option>
              <option value="reviewing">Đang ôn tập</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="not_started">Chưa học</option>
            </select>
          </div>
        </div>

        {/* Tags row & Tree controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-stone-400 text-[11px] mr-1">Thẻ:</span>
            {selectedTagFilter && (
              <button
                onClick={() => setSelectedTagFilter(null)}
                className="px-2 py-0.5 bg-amber-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1"
              >
                #{selectedTagFilter} ×
              </button>
            )}
            {tags.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTagFilter(selectedTagFilter === t.name ? null : t.name)}
                className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                  selectedTagFilter === t.name
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                #{t.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[11px] text-stone-500 hover:text-stone-800 font-medium hover:underline"
            >
              Mở rộng tất cả
            </button>
            <span className="text-stone-300">•</span>
            <button
              onClick={collapseAll}
              className="text-[11px] text-stone-500 hover:text-stone-800 font-medium hover:underline"
            >
              Thu gọn
            </button>
          </div>
        </div>
      </div>

      {/* Hierarchical Categories & Topics Tree */}
      <div className="space-y-4">
        {categories
          .filter((cat) => !selectedCategoryFilter || cat.type === selectedCategoryFilter || cat.id === selectedCategoryFilter || cat.parentId === selectedCategoryFilter)
          .map((cat) => {
            const catTopics = filteredTopics.filter((t) => t.categoryId === cat.id);
            const isExpanded = expandedCategories[cat.id] ?? true;

            return (
              <div
                key={cat.id}
                className="bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-2xs transition"
              >
                {/* Category Group Header */}
                <div
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center justify-between p-4 bg-stone-100/60 hover:bg-stone-100 cursor-pointer transition border-b border-stone-200/70"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-stone-500 hover:text-stone-800">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-800" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        {cat.name}
                        <span className="text-xs font-normal text-stone-500">
                          ({catTopics.length} chủ đề)
                        </span>
                      </h2>
                      {cat.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-stone-600 hidden sm:inline">
                      {catTopics.reduce((acc, t) => acc + (t.studyProgress?.timeSpent || 0), 0)} phút
                    </span>
                  </div>
                </div>

                {/* Topics in this category */}
                {isExpanded && (
                  <div className="divide-y divide-stone-100">
                    {catTopics.map((topic) => {
                      const isHidden = topic.visibility === 'hidden';

                      return (
                        <div
                          key={topic.id}
                          className={`p-4 hover:bg-stone-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                            isHidden ? 'bg-stone-100/40 opacity-75' : ''
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                onClick={() => openTopicDetail(topic.id)}
                                className="font-bold text-sm text-stone-900 hover:text-amber-800 cursor-pointer flex items-center gap-1.5 transition"
                              >
                                {topic.title}
                              </h3>
                              {getStatusBadge(topic.studyProgress.status)}
                              {isHidden && (
                                <span className="px-2 py-0.5 bg-stone-200 text-stone-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" /> Đã ẩn
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                              {topic.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {topic.tags.map((tg) => (
                                <span
                                  key={tg}
                                  className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] rounded-md font-mono"
                                >
                                  #{tg}
                                </span>
                              ))}
                              <span className="text-[11px] text-stone-500 ml-2 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {formatMinutesToHours(topic.studyProgress.timeSpent)}
                              </span>
                              <span className="text-[11px] text-stone-500 font-mono">
                                • {topic.studyProgress.totalNotes} ghi chú
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar & Actions */}
                          <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                            <div className="w-24 sm:w-28 space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-stone-500">Tiến độ</span>
                                <span className="font-bold text-stone-800">{topic.studyProgress.progress}%</span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-600"
                                  style={{ width: `${topic.studyProgress.progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Soft Hide / Restore Action */}
                              {isHidden ? (
                                <button
                                  onClick={() => restoreTopic(topic.id)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                  title="Khôi phục hiển thị chủ đề"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => hideTopic(topic.id)}
                                  className="p-1.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                                  title="Ẩn chủ đề"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setEditingTopic(topic)}
                                className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition"
                                title="Sửa chủ đề"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa chủ đề "${topic.title}"?`)) {
                                    deleteTopic(topic.id);
                                  }
                                }}
                                className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Xóa chủ đề"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openTopicDetail(topic.id)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition ml-1"
                              >
                                Khám phá <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {catTopics.length === 0 && (
                      <div className="p-4 text-center text-xs text-stone-400">
                        Chưa có chủ đề nào trong phân cấp này phù hợp với bộ lọc hiện tại.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Edit Topic Modal */}
      {editingTopic && (
        <TopicFormModal
          isOpen={!!editingTopic}
          onClose={() => setEditingTopic(null)}
          initialTopic={editingTopic}
        />
      )}

      {/* Add Topic Modal */}
      <TopicFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
