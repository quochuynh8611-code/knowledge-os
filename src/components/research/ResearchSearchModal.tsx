import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Note, Resource, Topic } from "../../types";
import type { Flashcard } from "../../types/flashcard";
import {
  ResearchSearchEngine,
  buildSearchableDocuments,
  type SearchResultItem,
  type ResearchSearchEntityType,
} from "../../lib/researchSearchEngine";
import {
  Search,
  X,
  FileText,
  Brain,
  Library,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface ResearchSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId?: string;
  topicTitle?: string;
  notes?: Note[];
  flashcards?: Flashcard[];
  resources?: Resource[];
  topics?: Topic[];
  onSelectResult?: (result: SearchResultItem) => void;
}

export function ResearchSearchModal({
  isOpen,
  onClose,
  topicId,
  topicTitle,
  notes = [],
  flashcards = [],
  resources = [],
  topics = [],
  onSelectResult,
}: ResearchSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ResearchSearchEntityType | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize BM25 search engine
  const searchEngine = useMemo(() => {
    const docs = buildSearchableDocuments({ notes, flashcards, resources, topics });
    return new ResearchSearchEngine(docs, { k1: 1.2, b: 0.75 });
  }, [notes, flashcards, resources, topics]);

  const { results: searchResults, searchTimeMs } = useMemo(() => {
    if (!query.trim()) return { results: [], searchTimeMs: 0 };
    const t0 = performance.now();
    const results = searchEngine.search(query, {
      type: selectedType,
      topicId: topicId,
      limit: 25,
    });
    const t1 = performance.now();
    return {
      results,
      searchTimeMs: Math.round((t1 - t0) * 10) / 10,
    };
  }, [query, selectedType, topicId, searchEngine]);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getBadgeMeta = (type: ResearchSearchEntityType) => {
    switch (type) {
      case "note":
        return {
          icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
          label: "Ghi chú",
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
        };
      case "flashcard":
        return {
          icon: <Brain className="w-3.5 h-3.5 text-purple-500" />,
          label: "Flashcard",
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
        };
      case "resource":
        return {
          icon: <Library className="w-3.5 h-3.5 text-amber-500" />,
          label: "Tài liệu",
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="research-search-modal"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm BM25 (hỗ trợ Tiếng Việt & Pāli/Sanskrit IAST)..."
            className="flex-1 bg-transparent text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            data-testid="bm25-search-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
            data-testid="close-search-modal"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills & Summary Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "note", label: "Ghi chú" },
                { key: "flashcard", label: "Flashcards" },
                { key: "resource", label: "Tài liệu" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedType === tab.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
                data-testid={`search-filter-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">
            {query.trim() && (
              <span>
                {searchResults.length} kết quả ({searchTimeMs}ms)
              </span>
            )}
            {topicTitle && <span className="ml-1.5">• {topicTitle}</span>}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5" data-testid="search-results-list">
          {!query.trim() ? (
            <div className="py-14 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nhập từ khóa để tìm kiếm toàn văn
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Thuật toán BM25 xếp hạng theo độ liên quan, tự động chuẩn hóa dấu tiếng Việt và ký tự Pāli/Sanskrit (ví dụ: satipatthana khớp Satipaṭṭhāna).
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Không tìm thấy kết quả nào phù hợp với "{query}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Thử tìm với từ khóa ngắn hơn hoặc chọn danh mục "Tất cả".
              </p>
            </div>
          ) : (
            searchResults.map((item) => {
              const badge = getBadgeMeta(item.document.type);
              return (
                <div
                  key={item.document.id}
                  onClick={() => {
                    if (onSelectResult) {
                      onSelectResult(item);
                    }
                    onClose();
                  }}
                  className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition-all cursor-pointer group"
                  data-testid="search-result-item"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      {item.document.topicTitle && (
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {item.document.topicTitle}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono font-medium">
                      Score: {item.score}
                    </span>
                  </div>

                  {/* Title with mark */}
                  <h4
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                    dangerouslySetInnerHTML={{ __html: item.highlightedTitle }}
                  />

                  {/* Snippet with mark */}
                  {item.highlightedSnippet && (
                    <p
                      className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: item.highlightedSnippet }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
