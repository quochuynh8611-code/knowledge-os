import React, { useState, useMemo } from "react";
import type { Note, Resource, Topic } from "../../types";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  buildResearchTimeline,
  groupTimelineByDateBuckets,
  type ResearchTimelineEvent,
  type ResearchEventType,
} from "../../lib/researchTimelineService";
import {
  FileText,
  Brain,
  Zap,
  Library,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  X,
  Clock,
  Tag,
  ExternalLink,
} from "lucide-react";

export interface ResearchTimelineProps {
  topicId?: string;
  topicTitle?: string;
  topics?: Topic[];
  notes?: Note[];
  flashcards?: Flashcard[];
  reviews?: FlashcardReview[];
  resources?: Resource[];
  onSelectEvent?: (event: ResearchTimelineEvent) => void;
  onNavigateEntity?: (type: string, id: string) => void;
}

export function ResearchTimeline({
  topicId,
  topicTitle,
  topics = [],
  notes = [],
  flashcards = [],
  reviews = [],
  resources = [],
  onSelectEvent,
  onNavigateEntity,
}: ResearchTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    "all" | "notes" | "flashcards" | "reviews" | "resources"
  >("all");
  const [previewEvent, setPreviewEvent] = useState<ResearchTimelineEvent | null>(null);

  // Map event types based on filter
  const activeEventTypes = useMemo<ResearchEventType[] | undefined>(() => {
    switch (selectedTypeFilter) {
      case "notes":
        return ["NOTE_CREATED", "NOTE_UPDATED"];
      case "flashcards":
        return ["FLASHCARD_CREATED"];
      case "reviews":
        return ["REVIEW_COMPLETED"];
      case "resources":
        return ["RESOURCE_ADDED"];
      default:
        return undefined;
    }
  }, [selectedTypeFilter]);

  // Topic lookup map
  const topicMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of topics) {
      map.set(t.id, t.title);
    }
    return map;
  }, [topics]);

  // Build raw timeline events
  const allEvents = useMemo(() => {
    return buildResearchTimeline({
      topicId,
      eventTypes: activeEventTypes,
      notes,
      flashcards,
      reviews,
      resources,
    });
  }, [topicId, activeEventTypes, notes, flashcards, reviews, resources]);

  // Filter by search query if any
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const q = searchQuery.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.snippet && e.snippet.toLowerCase().includes(q))
    );
  }, [allEvents, searchQuery]);

  // Group into relative date buckets
  const groupedBuckets = useMemo(() => {
    return groupTimelineByDateBuckets(filteredEvents);
  }, [filteredEvents]);

  const getEventBadge = (type: ResearchEventType) => {
    switch (type) {
      case "NOTE_CREATED":
        return {
          icon: <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
          label: "Tạo ghi chú",
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
          nodeBg: "bg-blue-500",
        };
      case "NOTE_UPDATED":
        return {
          icon: <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
          label: "Cập nhật ghi chú",
          bg: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
          nodeBg: "bg-sky-500",
        };
      case "FLASHCARD_CREATED":
        return {
          icon: <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
          label: "Tạo flashcard",
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
          nodeBg: "bg-purple-500",
        };
      case "REVIEW_COMPLETED":
        return {
          icon: <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          label: "Ôn tập",
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
          nodeBg: "bg-emerald-500",
        };
      case "RESOURCE_ADDED":
        return {
          icon: <Library className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          label: "Thêm tài liệu",
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
          nodeBg: "bg-amber-500",
        };
    }
  };

  const handleCardClick = (event: ResearchTimelineEvent) => {
    setPreviewEvent(event);
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <div className="space-y-6" data-testid="research-timeline">
      {/* 1. Header & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Lọc sự kiện dòng thời gian..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            data-testid="timeline-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "notes", label: "Ghi chú" },
              { key: "flashcards", label: "Flashcards" },
              { key: "reviews", label: "Ôn tập" },
              { key: "resources", label: "Tài liệu" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTypeFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                selectedTypeFilter === tab.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              data-testid={`filter-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Timeline List */}
      {groupedBuckets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Không có sự kiện nào phù hợp
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc loại sự kiện khác.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedBuckets.map((bucket) => (
            <div key={bucket.key} className="space-y-3" data-testid={`bucket-${bucket.key}`}>
              {/* Bucket Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  {bucket.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({bucket.events.length} hoạt động)
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Event items in bucket */}
              <div className="relative pl-6 space-y-3 border-l-2 border-indigo-100 dark:border-indigo-950 ml-4">
                {bucket.events.map((event) => {
                  const badge = getEventBadge(event.type);
                  const formattedTime = new Date(event.timestamp).toLocaleTimeString(
                    "vi-VN",
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  const formattedDate = new Date(event.timestamp).toLocaleDateString(
                    "vi-VN",
                    { month: "short", day: "numeric" }
                  );
                  const eventTopic = topicMap.get(event.topicId) || topicTitle;

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleCardClick(event)}
                      className="relative group cursor-pointer"
                      data-testid="timeline-event-card"
                    >
                      {/* Timeline node circle */}
                      <span
                        className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${badge.nodeBg} group-hover:scale-125 transition-transform`}
                      />

                      {/* Event Card */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                            {eventTopic && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                • {eventTopic}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                            {formattedTime} ({formattedDate})
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {event.title}
                        </h4>

                        {event.snippet && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                            {event.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Event Preview Modal / Drawer */}
      {previewEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          data-testid="timeline-preview-modal"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {getEventBadge(previewEvent.type).icon}
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Chi Tiết Sự Kiện Nghiên Cứu
                </span>
              </div>
              <button
                onClick={() => setPreviewEvent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                data-testid="close-preview-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    getEventBadge(previewEvent.type).bg
                  }`}
                >
                  {getEventBadge(previewEvent.type).label}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                  {previewEvent.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Thời gian: {new Date(previewEvent.timestamp).toLocaleString("vi-VN")}
                </p>
              </div>

              {previewEvent.snippet && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Trích đoạn / Chi tiết
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {previewEvent.snippet}
                  </p>
                </div>
              )}

              {previewEvent.metadata && (
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="font-semibold uppercase tracking-wider text-slate-400">
                    Metadata
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(previewEvent.metadata, null, 2)}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setPreviewEvent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50"
              >
                Đóng
              </button>
              {onNavigateEntity && (
                <button
                  onClick={() => {
                    const type = previewEvent.type.startsWith("NOTE")
                      ? "notes"
                      : previewEvent.type.startsWith("FLASHCARD")
                      ? "flashcards"
                      : previewEvent.type.startsWith("REVIEW")
                      ? "reviews"
                      : "resources";
                    onNavigateEntity(type, previewEvent.entityId);
                    setPreviewEvent(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <span>Mở thực thể</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
