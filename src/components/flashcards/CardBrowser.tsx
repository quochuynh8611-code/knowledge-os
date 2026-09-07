import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  History,
  PauseCircle,
  PlayCircle,
  Archive,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Brain,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import type {
  Flashcard,
  FlashcardState,
  FlashcardLifecycleStatus,
} from "../../types/flashcard";
import {
  filterCards,
  sortCards,
  paginateCards,
  type CardBrowserFilterOptions,
  type CardBrowserSortOption,
} from "../../lib/cardBrowserLogic";
import { CardReviewHistoryModal } from "./CardReviewHistoryModal";
import { CardConfirmModal } from "./CardConfirmModal";

export interface CardBrowserProps {
  topicId?: string;
  initialCards?: Flashcard[];
  onViewHistory?: (card: Flashcard) => void;
  onStatusChange?: (cardIds: string[], status: FlashcardLifecycleStatus) => void;
  onClose?: () => void;
}

export function CardBrowser({
  topicId,
  initialCards,
  onViewHistory,
  onStatusChange,
  onClose,
}: CardBrowserProps) {
  const { topics } = useData();

  const [cards, setCards] = useState<Flashcard[]>(initialCards || []);
  const [loading, setLoading] = useState(false);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<FlashcardState | "all">("all");
  const [selectedLifecycle, setSelectedLifecycle] = useState<FlashcardLifecycleStatus | "all">("all");
  const [selectedDueStatus, setSelectedDueStatus] = useState<"all" | "due" | "overdue" | "notDue">("all");
  const [weakOnly, setWeakOnly] = useState(false);
  const [sortBy, setSortBy] = useState<CardBrowserSortOption>("dueAt_asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Bulk Selection State
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Modals State
  const [historyModalCard, setHistoryModalCard] = useState<Flashcard | null>(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetStatus: FlashcardLifecycleStatus;
    affectedCardIds: string[];
    isDestructive?: boolean;
  } | null>(null);

  // Load cards from API if initialCards not provided
  const loadCards = useCallback(async () => {
    if (initialCards && initialCards.length > 0) {
      setCards(initialCards);
      return;
    }
    try {
      setLoading(true);
      const url = topicId
        ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}`
        : `/api/flashcards`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  }, [topicId, initialCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Topic lookup map
  const topicMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of topics) {
      map.set(t.id, t.title);
    }
    return map;
  }, [topics]);

  // Filtered & Sorted Cards
  const processedCards = useMemo(() => {
    const filterOptions: CardBrowserFilterOptions = {
      query: searchQuery,
      topicId,
      state: selectedState,
      lifecycleStatus: selectedLifecycle,
      dueStatus: selectedDueStatus,
      weakOnly,
    };
    const filtered = filterCards(cards, filterOptions);
    return sortCards(filtered, sortBy);
  }, [cards, searchQuery, topicId, selectedState, selectedLifecycle, selectedDueStatus, weakOnly, sortBy]);

  // Paginated Cards
  const paginatedResult = useMemo(() => {
    return paginateCards(processedCards, currentPage, pageSize);
  }, [processedCards, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedState, selectedLifecycle, selectedDueStatus, weakOnly, sortBy]);

  // Selection handlers
  const handleToggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedResult.items.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedCardIds.has(id));

    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedCardIds(new Set());
  };

  // Lifecycle status mutations
  const handleApplyStatusChange = async (cardIds: string[], status: FlashcardLifecycleStatus) => {
    if (cardIds.length === 0) return;

    if (onStatusChange) {
      onStatusChange(cardIds, status);
    } else {
      try {
        await Promise.all(
          cardIds.map((id) =>
            fetch(`/api/flashcards/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lifecycleStatus: status }),
            })
          )
        );
      } catch {
        // safe fallback
      }
    }

    // Optimistic local update
    setCards((prev) =>
      prev.map((card) =>
        cardIds.includes(card.id) ? { ...card, lifecycleStatus: status } : card
      )
    );
    setSelectedCardIds(new Set());
    setConfirmModalConfig(null);

    // Notify global system
    window.dispatchEvent(new CustomEvent("flashcard-updated"));
  };

  // Open confirmation modal for bulk actions
  const triggerBulkConfirm = (status: FlashcardLifecycleStatus) => {
    const count = selectedCardIds.size;
    if (count === 0) return;

    let title = "";
    let description = "";
    let isDestructive = false;

    if (status === "suspended") {
      title = `Tạm hoãn ${count} thẻ đã chọn`;
      description =
        "Các thẻ bị tạm hoãn sẽ không xuất hiện trong các phiên ôn tập cho đến khi được kích hoạt lại.";
    } else if (status === "active") {
      title = `Kích hoạt lại ${count} thẻ đã chọn`;
      description =
        "Các thẻ sẽ được khôi phục trạng thái hoạt động và xuất hiện lại trong hàng đợi ôn tập khi đến hạn.";
    } else if (status === "archived") {
      title = `Lưu trữ ${count} thẻ đã chọn`;
      description =
        "Các thẻ được lưu trữ sẽ ngừng xuất hiện trong hàng đợi ôn tập và phân tích tiến độ.";
      isDestructive = true;
    }

    setConfirmModalConfig({
      isOpen: true,
      title,
      description,
      targetStatus: status,
      affectedCardIds: Array.from(selectedCardIds),
      isDestructive,
    });
  };

  // Open history modal
  const handleOpenHistory = (card: Flashcard) => {
    if (onViewHistory) {
      onViewHistory(card);
    } else {
      setHistoryModalCard(card);
    }
  };

  const isAllVisibleSelected =
    paginatedResult.items.length > 0 &&
    paginatedResult.items.every((c) => selectedCardIds.has(c.id));

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              data-testid="input-card-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung mặt trước hoặc mặt sau thẻ..."
              className="w-full pl-9.5 pr-8 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-700 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Refresh & Close if provided */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadCards}
              disabled={loading}
              className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
                title="Đóng trình duyệt thẻ"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Facet Filters & Sort */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          {/* SRS State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-500">SRS:</span>
            <select
              data-testid="select-filter-state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as any)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 font-medium"
            >
              <option value="all">Tất cả giai đoạn</option>
              <option value="new">Thẻ mới (New)</option>
              <option value="learning">Đang học (Learning)</option>
              <option value="review">Đang ôn (Review)</option>
              <option value="relearning">Học lại (Relearning)</option>
            </select>
          </div>

          {/* Lifecycle Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-500">Vòng đời:</span>
            <select
              data-testid="select-filter-lifecycle"
              value={selectedLifecycle}
              onChange={(e) => setSelectedLifecycle(e.target.value as any)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động (Active)</option>
              <option value="suspended">Đã tạm hoãn (Suspended)</option>
              <option value="archived">Đã lưu trữ (Archived)</option>
            </select>
          </div>

          {/* Due Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-500">Hạn ôn:</span>
            <select
              data-testid="select-filter-due"
              value={selectedDueStatus}
              onChange={(e) => setSelectedDueStatus(e.target.value as any)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 font-medium"
            >
              <option value="all">Tất cả lịch</option>
              <option value="due">Đến hạn hôm nay</option>
              <option value="overdue">Quá hạn</option>
              <option value="notDue">Chưa đến hạn</option>
            </select>
          </div>

          {/* Weak Cards Checkbox Toggle */}
          <label
            data-testid="checkbox-filter-weak"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-300 cursor-pointer select-none transition"
          >
            <input
              type="checkbox"
              checked={weakOnly}
              onChange={(e) => setWeakOnly(e.target.checked)}
              className="rounded text-amber-700 focus:ring-amber-500 w-3.5 h-3.5"
            />
            <span className="font-semibold text-[11px]">Thẻ yếu (Lapses ≥ 3 hoặc Ease ≤ 2.0)</span>
          </label>

          {/* Sort Selector */}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <select
              data-testid="select-card-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 font-medium"
            >
              <option value="dueAt_asc">Hạn ôn (gần nhất trước)</option>
              <option value="dueAt_desc">Hạn ôn (xa nhất trước)</option>
              <option value="lapses_desc">Hay quên nhất (Lapses)</option>
              <option value="easeFactor_asc">Độ dễ thấp nhất (Ease)</option>
              <option value="createdAt_desc">Mới tạo nhất</option>
              <option value="createdAt_asc">Cũ nhất</option>
              <option value="front_asc">Mặt trước (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when >= 1 cards selected) */}
      {selectedCardIds.size > 0 && (
        <div
          data-testid="bulk-action-bar"
          className="bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center font-bold text-xs font-mono">
              <span data-testid="bulk-selected-count">{selectedCardIds.size}</span>
            </span>
            <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
              thẻ được chọn
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="btn-bulk-suspend"
              onClick={() => triggerBulkConfirm("suspended")}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Tạm hoãn</span>
            </button>

            <button
              data-testid="btn-bulk-restore"
              onClick={() => triggerBulkConfirm("active")}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kích hoạt lại</span>
            </button>

            <button
              data-testid="btn-bulk-archive"
              onClick={() => triggerBulkConfirm("archived")}
              className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-rose-600" />
              <span>Lưu trữ</span>
            </button>

            <button
              data-testid="btn-bulk-cancel"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* Cards Table List */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50/80 dark:bg-stone-800/60 border-b border-stone-200/80 dark:border-stone-700/80 text-[11px] font-bold text-stone-600 dark:text-stone-300 select-none">
              <tr>
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    data-testid="checkbox-select-all"
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleSelectAllVisible}
                    className="rounded text-amber-700 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 font-semibold">Mặt trước (Câu hỏi / Prompt)</th>
                <th className="p-3.5 font-semibold">Mặt sau (Đáp án)</th>
                {!topicId && <th className="p-3.5 font-semibold">Chủ đề</th>}
                <th className="p-3.5 font-semibold text-center">SRS State</th>
                <th className="p-3.5 font-semibold text-center">Lịch đến hạn</th>
                <th className="p-3.5 font-semibold text-center">Ease / Lapses</th>
                <th className="p-3.5 font-semibold text-center">Vòng đời</th>
                <th className="p-3.5 pr-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {paginatedResult.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={!topicId ? 9 : 8}
                    className="p-8 text-center text-xs text-stone-400"
                  >
                    Không tìm thấy thẻ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedResult.items.map((card) => {
                  const isSelected = selectedCardIds.has(card.id);
                  const schedule = card.schedule;
                  const topicTitle = topicMap.get(card.topicId) || card.topicId;

                  return (
                    <tr
                      key={card.id}
                      data-testid={`card-row-${card.id}`}
                      className={`hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition ${
                        isSelected
                          ? "bg-amber-50/40 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="p-3.5 pl-4 text-center">
                        <input
                          data-testid={`checkbox-select-card-${card.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCard(card.id)}
                          className="rounded text-amber-700 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Front Content */}
                      <td className="p-3.5 max-w-[220px]">
                        <div className="font-medium text-stone-900 dark:text-stone-100 truncate" title={card.front}>
                          {card.front}
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 uppercase">
                          {card.type}
                        </span>
                      </td>

                      {/* Back Content */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="text-stone-600 dark:text-stone-300 truncate" title={card.back}>
                          {card.back}
                        </div>
                      </td>

                      {/* Topic (Global Mode Only) */}
                      {!topicId && (
                        <td className="p-3.5 max-w-[140px]">
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] truncate block" title={topicTitle}>
                            {topicTitle}
                          </span>
                        </td>
                      )}

                      {/* SRS State Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            schedule?.state === "new"
                              ? "bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300"
                              : schedule?.state === "learning"
                              ? "bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300"
                              : schedule?.state === "review"
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : "bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300"
                          }`}
                        >
                          {schedule?.state || "new"}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="p-3.5 text-center font-mono text-[11px] text-stone-600 dark:text-stone-300">
                        {schedule?.dueAt
                          ? new Date(schedule.dueAt).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>

                      {/* Ease & Lapses */}
                      <td className="p-3.5 text-center font-mono text-[11px]">
                        <span className="text-stone-700 dark:text-stone-200">
                          {schedule?.easeFactor?.toFixed(1) ?? "2.5"}
                        </span>
                        <span className="text-stone-400 mx-1">/</span>
                        <span className={schedule?.lapses && schedule.lapses >= 3 ? "text-rose-600 font-bold" : "text-stone-500"}>
                          {schedule?.lapses ?? 0}
                        </span>
                      </td>

                      {/* Lifecycle Status Badge */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            card.lifecycleStatus === "active"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : card.lifecycleStatus === "suspended"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300"
                              : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-400"
                          }`}
                        >
                          {card.lifecycleStatus === "active"
                            ? "Active"
                            : card.lifecycleStatus === "suspended"
                            ? "Suspended"
                            : "Archived"}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* History Button */}
                          <button
                            data-testid={`btn-view-history-${card.id}`}
                            onClick={() => handleOpenHistory(card)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
                            title="Xem lịch sử ôn tập"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Lifecycle State Buttons */}
                          {card.lifecycleStatus === "active" ? (
                            <button
                              data-testid={`btn-suspend-card-${card.id}`}
                              onClick={() => handleApplyStatusChange([card.id], "suspended")}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition cursor-pointer"
                              title="Tạm hoãn thẻ"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              data-testid={`btn-restore-card-${card.id}`}
                              onClick={() => handleApplyStatusChange([card.id], "active")}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                              title="Kích hoạt lại"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {card.lifecycleStatus !== "archived" && (
                            <button
                              data-testid={`btn-archive-card-${card.id}`}
                              onClick={() => handleApplyStatusChange([card.id], "archived")}
                              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Lưu trữ thẻ"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 px-4 bg-stone-50/50 dark:bg-stone-900/50 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            Hiển thị <span className="font-bold text-stone-800 dark:text-stone-200">{paginatedResult.items.length}</span> /{" "}
            <span className="font-bold text-stone-800 dark:text-stone-200">{paginatedResult.total}</span> thẻ
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-bold text-stone-800 dark:text-stone-200 border-b border-stone-300 dark:border-stone-700 pb-0.5 focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Prev / Next Controls */}
            <div className="flex items-center gap-1 font-mono">
              <button
                disabled={paginatedResult.currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 rounded-md transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {paginatedResult.currentPage} / {paginatedResult.totalPages}
              </span>
              <button
                disabled={paginatedResult.currentPage >= paginatedResult.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(paginatedResult.totalPages, p + 1))}
                className="p-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 rounded-md transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Internal History Modal */}
      {historyModalCard && (
        <CardReviewHistoryModal
          isOpen={Boolean(historyModalCard)}
          card={historyModalCard}
          onClose={() => setHistoryModalCard(null)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModalConfig && (
        <CardConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          description={confirmModalConfig.description}
          affectedCount={confirmModalConfig.affectedCardIds.length}
          actionLabel="Xác nhận"
          isDestructive={confirmModalConfig.isDestructive}
          onConfirm={() =>
            handleApplyStatusChange(
              confirmModalConfig.affectedCardIds,
              confirmModalConfig.targetStatus
            )
          }
          onCancel={() => setConfirmModalConfig(null)}
        />
      )}
    </div>
  );
}
