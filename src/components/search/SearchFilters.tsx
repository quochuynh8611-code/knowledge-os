import React from "react";
import {
  Filter,
  Sparkles,
  Compass,
  Tag as TagIcon,
  X,
  Check,
  Bookmark,
  Folder,
} from "lucide-react";
import { Category, Tag, CategoryType, TopicStatus } from "../../types";
import {
  getRootCategories,
  getDescendantCategoryIds,
  resolveCategoryFilterToRootId,
} from "../../lib/taxonomyMigration";

export interface SearchFiltersState {
  domain: "all" | CategoryType;
  categoryId: string | null;
  tag: string | null;
  status: "all" | TopicStatus;
}

export interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFilterChange: (newFilters: SearchFiltersState) => void;
  categories: Category[];
  tags: Tag[];
  totalResultsCount?: number;
  className?: string;
}

export function SearchFilters({
  filters,
  onFilterChange,
  categories = [],
  tags = [],
  totalResultsCount,
  className = "",
}: SearchFiltersProps) {
  const hasActiveFilters =
    filters.domain !== "all" ||
    filters.categoryId !== null ||
    filters.tag !== null ||
    filters.status !== "all";

  const handleResetFilters = () => {
    onFilterChange({
      domain: "all",
      categoryId: null,
      tag: null,
      status: "all",
    });
  };

  const rootCategories = getRootCategories(categories);

  const filteredCategories = categories.filter((cat) => {
    if (filters.domain === "all") return true;
    const selectedRootId = resolveCategoryFilterToRootId(categories, filters.domain);
    if (!selectedRootId) return true;
    const descendantIds = new Set(getDescendantCategoryIds(categories, selectedRootId));
    return descendantIds.has(cat.id);
  });

  return (
    <div
      className={`bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-2xs space-y-4 ${className}`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ Lọc Chuyên Sâu</span>
          {totalResultsCount !== undefined && (
            <span className="font-normal lowercase text-stone-500 dark:text-stone-400">
              ({totalResultsCount} kết quả)
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition"
          >
            <X className="w-3 h-3" />
            <span>Xóa tất cả bộ lọc</span>
          </button>
        )}
      </div>

      {/* 1. Domain Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-amber-700" />
          <span>Lĩnh Vực (Domain):</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onFilterChange({ ...filters, domain: "all", categoryId: null })
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filters.domain === "all"
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-bold shadow-2xs"
                : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            }`}
          >
            Tất cả
          </button>
          {rootCategories.map((root) => {
            const domainKey = (root.slug || root.type || root.id) as CategoryType;
            const isSelected = filters.domain === domainKey;
            return (
              <button
                key={root.id}
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    domain: domainKey,
                    categoryId: null,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                  isSelected
                    ? root.slug === "phat-hoc"
                      ? "bg-amber-800 text-white font-bold shadow-2xs"
                      : root.slug === "huyen-hoc"
                      ? "bg-indigo-800 text-white font-bold shadow-2xs"
                      : "bg-stone-900 text-white font-bold shadow-2xs"
                    : root.slug === "phat-hoc"
                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100"
                    : root.slug === "huyen-hoc"
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                }`}
              >
                {root.slug === "phat-hoc" ? (
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                ) : root.slug === "huyen-hoc" ? (
                  <Compass className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Folder className="w-3 h-3" />
                )}
                <span>{root.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Category & Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Category Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Danh Mục (Category):
          </label>
          <select
            value={filters.categoryId || "all"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                categoryId: e.target.value === "all" ? null : e.target.value,
              })
            }
            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
          >
            <option value="all">
              Tất cả danh mục ({filteredCategories.length})
            </option>
            {filteredCategories.map((cat) => {
              const root = categories.find(
                (c) =>
                  !c.parentId &&
                  (c.id === cat.parentId ||
                    c.slug === cat.type ||
                    c.type === cat.type)
              );
              const domainLabel = root?.name || cat.type || cat.name;
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({domainLabel})
                </option>
              );
            })}
          </select>
        </div>

        {/* Study Status Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Trạng Thái Tiến Độ:
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="not_started">Chưa bắt đầu</option>
            <option value="in_progress">Đang khảo cứu</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="reviewing">Hàng đợi ôn tập (SM-2)</option>
          </select>
        </div>
      </div>

      {/* 3. Tags Chips */}
      {tags.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <TagIcon className="w-3 h-3" /> Thẻ Phân Loại (Tags):
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {tags.map((t) => {
              const isSelected = filters.tag === t.name;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      tag: isSelected ? null : t.name,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    isSelected
                      ? "bg-amber-800 text-white font-bold shadow-2xs"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                  }`}
                >
                  <span>#{t.name}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
