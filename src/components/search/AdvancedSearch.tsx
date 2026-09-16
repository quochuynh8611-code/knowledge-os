import React, { useState, useMemo } from "react";
import { useData } from "../../context/DataContext";
import {
  Search,
  BookOpen,
  FileText,
  Library,
  ArrowRight,
  Bookmark,
  Pin,
  X,
} from "lucide-react";
import { SearchFilters, SearchFiltersState } from "./SearchFilters";
import { EmptyState } from "../ui/EmptyState";
import {
  formatMinutesToHours,
  formatTimeAgo,
} from "../../lib/spaced-repetition";
import { searchScholarCollections } from "../../lib/scholarSearch";
import { toReadablePlainTextPreview } from "../../lib/markdownReadability";
import {
  getSavedSearchViews,
  createSavedSearchView,
  togglePinSavedSearchView,
  deleteSavedSearchView,
  isSavedViewInputValid,
  SavedSearchView,
} from "../../lib/savedViewStorage";
import { PageHeader, SurfaceCard, StatusPill, SectionHeader, ToolbarButton } from "../workbench";

export function AdvancedSearch() {
  const {
    searchQuery,
    setSearchQuery,
    topics,
    notes,
    resources,
    categories,
    tags,
    openTopicDetail,
  } = useData();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "topics" | "notes" | "resources"
  >("all");
  const [filters, setFilters] = useState<SearchFiltersState>({
    domain: "all",
    categoryId: null,
    tag: null,
    status: "all",
  });

  const [savedViews, setSavedViews] = useState<SavedSearchView[]>(() =>
    getSavedSearchViews(),
  );
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewPinned, setNewViewPinned] = useState(false);

  const q = searchQuery.toLowerCase().trim();

  const refreshSavedViews = () => {
    setSavedViews(getSavedSearchViews());
  };

  const canSaveCurrentView = isSavedViewInputValid(
    "valid",
    searchQuery,
    filters,
  );

  const handleSaveViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    createSavedSearchView({
      name: newViewName.trim(),
      query: searchQuery,
      filters,
      pinned: newViewPinned,
    });

    refreshSavedViews();
    setIsSavePanelOpen(false);
    setNewViewName("");
    setNewViewPinned(false);
  };

  const handleApplyView = (view: SavedSearchView) => {
    setSearchQuery(view.query);
    if (view.filters) {
      setFilters({
        domain: view.filters.domain || "all",
        categoryId: view.filters.categoryId || null,
        tag: view.filters.tag || null,
        status: view.filters.status || "all",
      });
    }
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePinSavedSearchView(id);
    refreshSavedViews();
  };

  const handleDeleteView = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSavedSearchView(id);
    refreshSavedViews();
  };

  const searchResults = useMemo(() => {
    return searchScholarCollections({
      query: searchQuery,
      topics,
      notes,
      resources,
      filters: {
        domain: filters.domain,
        categoryId: filters.categoryId,
        tag: filters.tag,
        status: filters.status,
      },
    });
  }, [topics, notes, resources, searchQuery, filters]);

  const matchedTopics = useMemo(
    () => searchResults.topics.map((t) => t.item),
    [searchResults],
  );
  const matchedNotes = useMemo(
    () => searchResults.notes.map((n) => n.item),
    [searchResults],
  );
  const matchedResources = useMemo(
    () => searchResults.resources.map((r) => r.item),
    [searchResults],
  );

  const totalResultsCount = searchResults.totalCount;

  const highlightMatch = (text: string) => {
    if (!q) return text;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = text.split(new RegExp(`(${escaped})`, "gi"));
      return parts.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark
            key={i}
            className="bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch {
      return text;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Tra Cứu & Khám Phá Tri Thức"
        subtitle="Tìm kiếm xuyên suốt tất cả chủ đề luận tạng, ghi chép cá nhân, thuật ngữ và tài liệu nghiên cứu"
        categoryLabel="Công Cụ Tra Cứu Toàn Diện"
        categoryIcon={Search}
      />

      {/* Main Search Input & Actions */}
      <SurfaceCard variant="subtle" className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 dark:text-stone-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập thuật ngữ: Vi Diệu Pháp, Tâm Vương, Cửu Cung, Quẻ Càn, Bát Nhã, Tứ Niệm Xứ..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 transition shadow-2xs"
          />
        </div>

        {/* View mode buttons & Saved Views actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-stone-500 dark:text-stone-400 font-medium mr-1">
              Hiển thị:
            </span>
            {[
              { id: "all", label: `Tất cả (${totalResultsCount})` },
              { id: "topics", label: `Chủ đề (${matchedTopics.length})` },
              { id: "notes", label: `Ghi chú (${matchedNotes.length})` },
              {
                id: "resources",
                label: `Tài liệu (${matchedResources.length})`,
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-xs ${
                  activeFilter === f.id
                    ? "bg-amber-800 text-amber-50 shadow-2xs"
                    : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {canSaveCurrentView && (
            <button
              type="button"
              onClick={() => {
                setIsSavePanelOpen(!isSavePanelOpen);
                if (!isSavePanelOpen && !newViewName) {
                  setNewViewName(
                    searchQuery
                      ? `Góc nhìn: ${searchQuery}`
                      : "Góc nhìn bộ lọc",
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer shadow-2xs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Lưu góc nhìn</span>
            </button>
          )}
        </div>

        {/* Inline Save View Panel */}
        {isSavePanelOpen && (
          <form
            onSubmit={handleSaveViewSubmit}
            className="p-3.5 bg-amber-50/70 dark:bg-stone-800/80 border border-amber-200 dark:border-amber-900/50 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-in fade-in duration-150"
          >
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Tên góc nhìn nghiên cứu..."
                className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs focus:ring-1 focus:ring-amber-700 font-medium text-stone-900 dark:text-stone-100"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 dark:text-stone-300 select-none">
              <input
                type="checkbox"
                checked={newViewPinned}
                onChange={(e) => setNewViewPinned(e.target.checked)}
                className="rounded text-amber-700 focus:ring-amber-700"
              />
              <span>Ghim lên đầu</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!newViewName.trim()}
                className="px-3 py-1.5 bg-amber-800 text-white font-semibold rounded-lg hover:bg-amber-900 transition disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                Xác nhận lưu
              </button>
              <button
                type="button"
                onClick={() => setIsSavePanelOpen(false)}
                className="px-2 py-1.5 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Saved Views Chip List */}
        {savedViews.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-stone-200/60 dark:border-stone-800 text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-medium mr-1 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Góc nhìn đã lưu:
            </span>
            {savedViews.map((sv) => (
              <div
                key={sv.id}
                onClick={() => handleApplyView(sv)}
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                  sv.pinned
                    ? "bg-amber-100/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                    : "bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(e, sv.id)}
                  title={`Ghim góc nhìn '${sv.name}'`}
                  className="p-0.5 hover:text-amber-700 dark:hover:text-amber-400 rounded transition cursor-pointer"
                >
                  <Pin
                    className={`w-3 h-3 ${
                      sv.pinned
                        ? "fill-amber-700 dark:fill-amber-400 text-amber-700 dark:text-amber-400"
                        : "text-stone-400"
                    }`}
                  />
                </button>
                <span>{sv.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteView(e, sv.id)}
                  title={`Xóa góc nhìn '${sv.name}'`}
                  className="p-0.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {/* Deep Multidimensional Filters */}
      <SearchFilters
        filters={filters}
        onFilterChange={setFilters}
        categories={categories}
        tags={tags}
        totalResultsCount={totalResultsCount}
      />

      {/* Search Results Sections */}
      <div className="space-y-6">
        {/* Section 1: Topics */}
        {(activeFilter === "all" || activeFilter === "topics") &&
          matchedTopics.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Chủ đề khớp tìm kiếm"
                count={matchedTopics.length}
                icon={BookOpen}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchedTopics.map((topic) => (
                  <SurfaceCard
                    key={topic.id}
                    variant="interactive"
                    onClick={() => openTopicDetail(topic.id)}
                    className="cursor-pointer space-y-3 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <StatusPill
                          variant={topic.type === "phat-hoc" ? "accent" : "purple"}
                        >
                          {topic.type === "phat-hoc" ? "Phật Học" : "Huyền Học"}{" "}
                          • {topic.categoryName}
                        </StatusPill>
                        <span className="text-stone-400 dark:text-stone-500 font-mono">
                          {topic.studyProgress?.progress}%
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm leading-snug group-hover:text-amber-800 dark:group-hover:text-amber-400 transition font-serif-title">
                        {highlightMatch(topic.title)}
                      </h3>

                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {highlightMatch(topic.description)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-2 font-mono">
                        <span>
                          {topic.studyProgress?.totalNotes || 0} notes
                        </span>
                        <span>•</span>
                        <span>
                          {formatMinutesToHours(
                            topic.studyProgress?.timeSpent || 0,
                          )}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          )}

        {/* Section 2: Notes */}
        {(activeFilter === "all" || activeFilter === "notes") &&
          matchedNotes.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Ghi chú cá nhân"
                count={matchedNotes.length}
                icon={FileText}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchedNotes.map((note) => (
                  <SurfaceCard
                    key={note.id}
                    variant="interactive"
                    onClick={() => openTopicDetail(note.topicId)}
                    className="cursor-pointer space-y-2 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mb-1 border-b border-stone-100 dark:border-stone-800/80 pb-1.5">
                        <StatusPill variant="success">
                          {note.type}
                        </StatusPill>
                        <span className="font-mono">{formatTimeAgo(note.createdAt)}</span>
                      </div>
                      <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm group-hover:text-amber-800 dark:group-hover:text-amber-400 transition font-serif-title">
                        {highlightMatch(note.title)}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 line-clamp-3 leading-relaxed">
                        {highlightMatch(toReadablePlainTextPreview(note.content, 220))}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-amber-800 dark:text-amber-400 font-medium flex items-center justify-between">
                      <span>Chủ đề: {note.topicTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          )}

        {/* Section 3: Resources */}
        {(activeFilter === "all" || activeFilter === "resources") &&
          matchedResources.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Tài liệu tham khảo"
                count={matchedResources.length}
                icon={Library}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchedResources.map((res) => (
                  <SurfaceCard
                    key={res.id}
                    variant="interactive"
                    onClick={() => openTopicDetail(res.topicId)}
                    className="cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-1.5">
                      <StatusPill variant="purple">
                        {res.type.toUpperCase()}
                      </StatusPill>
                      <span className="font-mono">{formatTimeAgo(res.createdAt)}</span>
                    </div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm group-hover:text-amber-800 dark:group-hover:text-amber-400 transition font-serif-title">
                      {highlightMatch(res.title)}
                    </h3>
                    {res.author && (
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        Tác giả: {highlightMatch(res.author)}
                      </p>
                    )}
                    {res.notes && (
                      <p className="text-xs text-stone-500 dark:text-stone-300 line-clamp-2 leading-relaxed">
                        {highlightMatch(res.notes)}
                      </p>
                    )}
                  </SurfaceCard>
                ))}
              </div>
            </div>
          )}

        {/* Empty State */}
        {totalResultsCount === 0 && (
          <EmptyState
            icon={Search}
            title={
              q
                ? `Không tìm thấy kết quả cho "${searchQuery}"`
                : "Không có mục nào khớp bộ lọc"
            }
            description="Hãy thử điều chỉnh bộ lọc, xóa từ khóa hoặc tìm kiếm các thuật ngữ cốt lõi như 'Abhidharma', 'Kỳ Môn', 'Kinh Dịch', 'Tâm Sở'..."
            suggestions={[
              {
                label: "Abhidharma",
                onClick: () => setSearchQuery("Abhidharma"),
              },
              {
                label: "Kỳ Môn Độn Giáp",
                onClick: () => setSearchQuery("Kỳ Môn"),
              },
              {
                label: "Tứ Niệm Xứ",
                onClick: () => setSearchQuery("Tứ Niệm Xứ"),
              },
              { label: "Bát Nhã", onClick: () => setSearchQuery("Bát Nhã") },
              { label: "Quẻ Dịch", onClick: () => setSearchQuery("Quẻ Dịch") },
            ]}
            primaryAction={{
              label: "Xóa bộ lọc & Đặt lại",
              onClick: () => {
                setSearchQuery("");
                setFilters({
                  domain: "all",
                  categoryId: null,
                  tag: null,
                  status: "all",
                });
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
