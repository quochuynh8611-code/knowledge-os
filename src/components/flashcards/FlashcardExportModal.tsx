/**
 * FlashcardExportModal Component (Phase F6.11 Task 5)
 *
 * Provides CSV export for:
 * 1. Current review session (in-memory session reviews)
 * 2. Full review history across cards
 * Filters: Topic, Rating, Date range (Today, 7 days, 30 days, Custom)
 * Outputs RFC 4180 compliant CSV with UTF-8 BOM.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import type { Flashcard, FlashcardReview, ReviewRating } from "../../types/flashcard";
import { useData } from "../../context/DataContext";
import {
  generateReviewSessionCSV,
  downloadCSV,
} from "../../lib/flashcardReviewSessionUtils";

export interface FlashcardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionReviews?: FlashcardReview[];
  cardsMap?: Map<string, Flashcard> | Record<string, Flashcard>;
  currentTopicId?: string;
  onExportSuccess?: (exportedCount: number) => void;
}

export type ExportScope = "session" | "full";
export type DateRangePreset = "all" | "today" | "7days" | "30days" | "custom";

export function FlashcardExportModal({
  isOpen,
  onClose,
  sessionReviews = [],
  cardsMap,
  currentTopicId,
  onExportSuccess,
}: FlashcardExportModalProps) {
  const { topics } = useData();

  const [exportScope, setExportScope] = useState<ExportScope>(
    sessionReviews.length > 0 ? "session" : "full"
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    currentTopicId || "all"
  );
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("all");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");

  const [fullReviews, setFullReviews] = useState<FlashcardReview[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportedSuccessMsg, setExportedSuccessMsg] = useState<string | null>(
    null
  );

  // Sync initial scope if sessionReviews change
  useEffect(() => {
    if (sessionReviews.length > 0 && exportScope !== "full") {
      setExportScope("session");
    }
  }, [sessionReviews.length]);

  // Fetch full reviews when scope is "full" and modal is open
  useEffect(() => {
    if (!isOpen || exportScope !== "full") return;

    let isMounted = true;
    const fetchFullReviews = async () => {
      try {
        setLoadingFull(true);
        setError(null);
        const queryParams = new URLSearchParams();
        if (selectedTopicId && selectedTopicId !== "all") {
          queryParams.set("topicId", selectedTopicId);
        }
        if (selectedRating && selectedRating !== "all") {
          queryParams.set("rating", selectedRating);
        }
        if (dateRangePreset === "today") {
          const today = new Date().toISOString().slice(0, 10);
          queryParams.set("fromDate", today);
        } else if (dateRangePreset === "7days") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          queryParams.set("fromDate", d.toISOString().slice(0, 10));
        } else if (dateRangePreset === "30days") {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          queryParams.set("fromDate", d.toISOString().slice(0, 10));
        } else if (dateRangePreset === "custom") {
          if (customFromDate) queryParams.set("fromDate", customFromDate);
          if (customToDate) queryParams.set("toDate", customToDate);
        }

        const url = `/api/flashcards/reviews${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setFullReviews(Array.isArray(data) ? data : []);
        } else if (isMounted) {
          throw new Error("Không thể tải lịch sử ôn tập từ máy chủ");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Lỗi tải toàn bộ lịch sử ôn tập"
          );
        }
      } finally {
        if (isMounted) setLoadingFull(false);
      }
    };

    fetchFullReviews();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    exportScope,
    selectedTopicId,
    selectedRating,
    dateRangePreset,
    customFromDate,
    customToDate,
  ]);

  // Compute filtered reviews for session scope
  const filteredSessionReviews = useMemo(() => {
    let list = [...sessionReviews];

    if (selectedTopicId && selectedTopicId !== "all") {
      list = list.filter((r) => r.topicId === selectedTopicId);
    }

    if (selectedRating && selectedRating !== "all") {
      const ratingNum = Number(selectedRating);
      list = list.filter((r) => r.rating === ratingNum);
    }

    if (dateRangePreset === "today") {
      const todayStr = new Date().toISOString().slice(0, 10);
      list = list.filter((r) => r.reviewedAt?.startsWith(todayStr));
    } else if (dateRangePreset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      list = list.filter((r) => new Date(r.reviewedAt) >= d);
    } else if (dateRangePreset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      list = list.filter((r) => new Date(r.reviewedAt) >= d);
    } else if (dateRangePreset === "custom") {
      if (customFromDate) {
        const fromD = new Date(customFromDate);
        list = list.filter((r) => new Date(r.reviewedAt) >= fromD);
      }
      if (customToDate) {
        const toD = new Date(customToDate);
        toD.setHours(23, 59, 59, 999);
        list = list.filter((r) => new Date(r.reviewedAt) <= toD);
      }
    }

    return list;
  }, [
    sessionReviews,
    selectedTopicId,
    selectedRating,
    dateRangePreset,
    customFromDate,
    customToDate,
  ]);

  const activeReviews =
    exportScope === "session" ? filteredSessionReviews : fullReviews;

  const handleDownload = () => {
    if (activeReviews.length === 0) return;

    const csvContent = generateReviewSessionCSV(activeReviews, cardsMap);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `flashcard-reviews-${exportScope}-${dateStr}.csv`;

    downloadCSV(csvContent, filename);

    setExportedSuccessMsg(`Đã xuất thành công ${activeReviews.length} dòng dữ liệu!`);
    onExportSuccess?.(activeReviews.length);

    setTimeout(() => {
      setExportedSuccessMsg(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-export-csv"
      role="dialog"
      aria-label="Xuất dữ liệu ôn tập CSV"
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Xuất Báo Cáo Ôn Tập CSV
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Hỗ trợ định dạng Excel UTF-8 BOM chuẩn quốc tế
              </p>
            </div>
          </div>
          <button
            data-testid="btn-close-export-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {exportedSuccessMsg && (
            <div
              data-testid="export-success-message"
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{exportedSuccessMsg}</span>
            </div>
          )}

          {/* Scope Selector: Session vs Full */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-2 block flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Phạm vi xuất dữ liệu
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="scope-session-btn"
                onClick={() => setExportScope("session")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col ${
                  exportScope === "session"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20"
                    : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">Phiên học hiện tại</span>
                  <span
                    data-testid="session-reviews-count"
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold"
                  >
                    {sessionReviews.length} lượt
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 mt-1">
                  Chỉ các thẻ vừa chấm điểm trong phiên làm việc này
                </span>
              </button>

              <button
                type="button"
                data-testid="scope-full-btn"
                onClick={() => setExportScope("full")}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col ${
                  exportScope === "full"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20"
                    : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">Toàn bộ lịch sử</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold">
                    {loadingFull ? "..." : `${fullReviews.length} lượt`}
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 mt-1">
                  Toàn bộ lịch sử ôn tập đã lưu trong cơ sở dữ liệu
                </span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-4 bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              Bộ lọc dữ liệu xuất
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Topic Filter */}
              <div>
                <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1 block">
                  Chủ đề (Topic)
                </label>
                <select
                  data-testid="filter-topic-select"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition"
                >
                  <option value="all">Tất cả chủ đề</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1 block">
                  Điểm đánh giá
                </label>
                <select
                  data-testid="filter-rating-select"
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition"
                >
                  <option value="all">Tất cả điểm (1-4)</option>
                  <option value="1">1: Again (Quên)</option>
                  <option value="2">2: Hard (Khó)</option>
                  <option value="3">3: Good (Nhớ)</option>
                  <option value="4">4: Easy (Dễ)</option>
                </select>
              </div>
            </div>

            {/* Date Range Presets */}
            <div>
              <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">
                Khoảng thời gian
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Tất cả thời gian" },
                  { id: "today", label: "Hôm nay" },
                  { id: "7days", label: "7 ngày qua" },
                  { id: "30days", label: "30 ngày qua" },
                  { id: "custom", label: "Tùy chỉnh" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`date-preset-${preset.id}`}
                    onClick={() =>
                      setDateRangePreset(preset.id as DateRangePreset)
                    }
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                      dateRangePreset === preset.id
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold shadow-2xs"
                        : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {dateRangePreset === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <div>
                    <span className="text-[10px] text-stone-400 block mb-0.5">
                      Từ ngày:
                    </span>
                    <input
                      type="date"
                      data-testid="input-from-date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block mb-0.5">
                      Đến ngày:
                    </span>
                    <input
                      type="date"
                      data-testid="input-to-date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Tổng số lượt ôn tập khớp bộ lọc:
                </span>
                <span
                  data-testid="filtered-reviews-count"
                  className="ml-2 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm"
                >
                  {loadingFull ? "Đang đếm..." : `${activeReviews.length} lượt`}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              .csv (RFC 4180)
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            data-testid="btn-download-csv"
            disabled={activeReviews.length === 0 || loadingFull}
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải xuống CSV ({activeReviews.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
