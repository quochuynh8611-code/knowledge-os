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
  FolderPlus,
  X,
} from 'lucide-react';
import { TopicFormModal } from '../modals/TopicFormModal';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
import {
  getRootCategories,
  getChildCategories,
  getDescendantCategoryIds,
  resolveCategoryFilterToRootId,
  topicBelongsToRootCategory,
  countTopicsForRootCategory,
} from '../../lib/taxonomyMigration';

// Explicit Safe-Merge Target for legacy economy categories (cat-root-kinh-te, cat-root-kinh-te-hoc).
// Prevents topic/subcategory orphan risk when users delete legacy economy categories from existing datasets.
const FIXED_ECONOMY_MERGE_TARGET_ID = 'cat-root-kinh-te-tai-chinh';

const isEconomyMergeSource = (catId: string): boolean => {
  return catId === 'cat-root-kinh-te' || catId === 'cat-root-kinh-te-hoc';
};

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
    deleteCategory,
    mergeCategories,
    hideTopic,
    restoreTopic,
    addCategory,
    tags,
  } = useData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'active' | 'hidden' | 'all'>('active');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

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

  const canonicalFilterRootId = useMemo(() => {
    return resolveCategoryFilterToRootId(categories, selectedCategoryFilter);
  }, [categories, selectedCategoryFilter]);

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

  const handleCategoryDelete = (e: React.MouseEvent, cat: Category, topicCount: number) => {
    e.stopPropagation();

    if (isEconomyMergeSource(cat.id)) {
      const confirmed = window.confirm(
        `Danh mục "${cat.name}" sẽ được gộp vào "Kinh Tế & Tài Chính". Các chủ đề hiện có sẽ được giữ lại và chuyển sang danh mục đích. Bạn có muốn tiếp tục không?`
      );
      if (!confirmed) return;

      const result = mergeCategories(cat.id, FIXED_ECONOMY_MERGE_TARGET_ID);
      if (!result.success) {
        alert(`Không thể gộp danh mục: ${result.error || 'UNKNOWN_ERROR'}`);
      }
      return;
    }

    if (topicCount > 0) {
      if (
        !window.confirm(
          `Danh mục "${cat.name}" đang có ${topicCount} chủ đề. Bạn có chắc muốn xóa danh mục này?`
        )
      ) {
        return;
      }
    } else if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) {
      return;
    }
    deleteCategory(cat.id);
  };

  const handleCreateDomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDomainName.trim()) return;

    const trimmed = newDomainName.trim();
    const generatedSlug = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newId = addCategory({
      name: trimmed,
      slug: generatedSlug,
      type: generatedSlug,
      parentId: null,
      color: '#475569',
    });

    setNewDomainName('');
    setIsAddingDomain(false);
    setSelectedCategoryFilter(newId);
  };

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      // Visibility filter
      if (visibilityFilter === 'active' && t.visibility === 'hidden') return false;
      if (visibilityFilter === 'hidden' && t.visibility !== 'hidden') return false;

      // Domain filter
      if (canonicalFilterRootId) {
        if (!topicBelongsToRootCategory(t, categories, canonicalFilterRootId)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && t.studyProgress?.status !== statusFilter) return false;
      // Tag filter
      if (selectedTagFilter && !t.tags?.includes(selectedTagFilter)) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchTag = t.tags?.some((tg) => tg.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      return true;
    });
  }, [topics, categories, canonicalFilterRootId, statusFilter, selectedTagFilter, visibilityFilter, search]);

  // Categories to render in tree hierarchy
  const categoriesToRender = useMemo(() => {
    let list = categories;
    if (canonicalFilterRootId) {
      const descendantIds = new Set(getDescendantCategoryIds(categories, canonicalFilterRootId));
      list = list.filter((c) => descendantIds.has(c.id));
    }
    // Filter out pure root containers that have 0 direct topics and have subcategories
    return list.filter((cat) => {
      const directTopics = filteredTopics.filter((t) => t.categoryId === cat.id);
      const children = getChildCategories(categories, cat.id);
      if (directTopics.length === 0 && children.length > 0) {
        return false;
      }
      return true;
    });
  }, [categories, canonicalFilterRootId, filteredTopics]);

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
            onClick={() => setIsAddingDomain(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <FolderPlus className="w-4 h-4 text-amber-700" /> Thêm Lĩnh Vực
          </button>
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
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition ${
                !canonicalFilterRootId
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tất cả
            </button>
            {rootCategories.map((root) => {
              const isSelected = canonicalFilterRootId === root.id;
              const rootTopicCount = countTopicsForRootCategory(
                topics.filter((t) => t.visibility !== 'hidden'),
                categories,
                root.id
              );

              return (
                <button
                  key={root.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? null : root.id)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Folder className="w-3 h-3" /> {root.name} ({rootTopicCount})
                </button>
              );
            })}
            <button
              onClick={() => setIsAddingDomain(true)}
              className="py-1.5 px-2.5 rounded-xl text-xs font-medium border border-dashed border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-400 hover:bg-stone-50 transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm lĩnh vực
            </button>
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

        {/* Inline Add Domain Form */}
        {isAddingDomain && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 animate-fadeIn">
            <FolderPlus className="w-4 h-4 text-amber-800 shrink-0" />
            <input
              type="text"
              autoFocus
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="Tên lĩnh vực mới (VD: Triết Học Phương Tây, Khoa Học Tự Nhiên)..."
              className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDomain(e);
                if (e.key === 'Escape') setIsAddingDomain(false);
              }}
            />
            <button
              type="button"
              onClick={() => handleCreateDomain()}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingDomain(false);
                setNewDomainName('');
              }}
              className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg text-xs font-medium"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
        {categoriesToRender.map((cat) => {
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
                  {!['cat-root-phat-hoc', 'cat-root-huyen-hoc', 'cat-root-dong-y', 'cat-root-ngon-ngu'].includes(cat.id) && (
                    <button
                      onClick={(e) => handleCategoryDelete(e, cat, catTopics.length)}
                      data-testid={`delete-category-${cat.id}`}
                      className="p-1 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
