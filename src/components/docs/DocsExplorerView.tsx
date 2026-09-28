import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Search,
  RotateCcw,
  FileText,
  Copy,
  Check,
  Book,
  FolderOpen,
  Info,
  Eye,
  Clock,
  LayoutGrid,
  List,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { UnifiedResearchReader } from "../reader/UnifiedResearchReader";
import { ObsidianVaultBrowserModal } from "../modals/ObsidianVaultBrowserModal";
import { PageHeader, SurfaceCard, StatusPill, ToolbarButton } from "../workbench";
import { copyTextToClipboard } from "../../lib/clipboard";
import { globalReadingPositionStore } from "../../lib/readingPositionUnified";
import { MarkdownReadabilityRenderer } from "../../lib/markdownReadability";

export interface DocItem {
  id: string;
  title: string;
  category: "adr" | "specs" | "gherkin" | "runbooks" | "guides" | "books" | string;
  relativePath: string;
  status?: string;
  sizeBytes: number;
  lastModified: string;
}

export interface DocDetail extends DocItem {
  content: string;
}

export function DocsExplorerView({
  initialPath,
  mode = "epub-only",
}: {
  initialPath?: string;
  mode?: "full" | "epub-only";
}) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "pdf" | "epub" | "md">("all");
  const [selectedSource, setSelectedSource] = useState<"all" | "vault" | "local">("all");
  const [sortBy, setSortBy] = useState<"recent" | "title-asc" | "size-desc">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [activeReaderDoc, setActiveReaderDoc] = useState<{
    documentId: string;
    title: string;
    format: string;
    fileUrl?: string;
    content?: string;
    sourceType?: 'docs' | 'vault';
  } | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);

  const fetchDocsList = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) throw new Error(`Lỗi tải danh mục tài liệu (${res.status})`);
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (err: any) {
      setError(err.message || "Không thể kết nối máy chủ");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const fetchDocContent = useCallback(async (relativePath: string) => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const res = await fetch(`/api/docs/content?path=${encodeURIComponent(relativePath)}`);
      if (!res.ok) throw new Error(`Lỗi nạp nội dung tài liệu (${res.status})`);
      const data: DocDetail = await res.json();
      setSelectedDoc(data);
    } catch (err: any) {
      setError(err.message || "Không thể nạp nội dung tài liệu");
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  const getDocFormat = useCallback((doc: DocItem): "pdf" | "epub" | "md" | "other" => {
    const p = (doc.relativePath || "").toLowerCase();
    if (p.endsWith(".pdf")) return "pdf";
    if (p.endsWith(".epub") || doc.category === "books") return "epub";
    if (p.endsWith(".md")) return "md";
    return "other";
  }, []);

  const handleDocClick = useCallback((doc: DocItem) => {
    const format = getDocFormat(doc);
    if (format === "epub") {
      const sanitizedRelative = doc.relativePath.replace(/^\/+/, "");
      setActiveReaderDoc({
        documentId: doc.id || doc.relativePath,
        title: doc.title || doc.relativePath.split("/").pop() || doc.relativePath,
        format: "epub",
        sourceType: "docs",
        fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
      });
      return;
    }
    if (format === "pdf") {
      const sanitizedRelative = doc.relativePath.replace(/^\/+/, "");
      setActiveReaderDoc({
        documentId: doc.id || doc.relativePath,
        title: doc.title,
        format: "pdf",
        sourceType: "docs",
        fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
      });
      return;
    }
    fetchDocContent(doc.relativePath);
  }, [fetchDocContent, getDocFormat]);

  const handleVaultFileSelect = useCallback((filePath: string) => {
    setIsVaultModalOpen(false);
    const isEpub = filePath.toLowerCase().endsWith(".epub");
    const isPdf = filePath.toLowerCase().endsWith(".pdf");
    const fileName = filePath.split("/").pop() || filePath;
    if (isEpub) {
      setActiveReaderDoc({
        documentId: `vault:${filePath}`,
        title: fileName.replace(/\.epub$/i, ""),
        format: "epub",
        sourceType: "vault",
        fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(filePath)}`,
      });
    } else if (isPdf) {
      setActiveReaderDoc({
        documentId: `vault:${filePath}`,
        title: fileName.replace(/\.pdf$/i, ""),
        format: "pdf",
        sourceType: "vault",
        fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(filePath)}`,
      });
    } else {
      setActiveReaderDoc({
        documentId: `vault:${filePath}`,
        title: fileName.replace(/\.md$/i, ""),
        format: "md",
        sourceType: "vault",
        fileUrl: `/api/obsidian/vault/file?path=${encodeURIComponent(filePath)}`,
      });
    }
  }, []);

  useEffect(() => {
    fetchDocsList();
  }, [fetchDocsList]);

  useEffect(() => {
    if (initialPath) {
      if (initialPath.toLowerCase().endsWith(".epub")) {
        const sanitizedRelative = initialPath.replace(/^\/+/, "");
        const fileName = initialPath.split("/").pop() || initialPath;
        setActiveReaderDoc({
          documentId: initialPath,
          title: fileName.replace(/\.epub$/i, ""),
          format: "epub",
          fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
        });
      } else {
        fetchDocContent(initialPath);
      }
    }
  }, [initialPath, fetchDocContent]);

  const isEpubOnly = mode === "epub-only";

  const filteredDocs = useMemo(() => {
    return docs
      .filter((doc) => {
        const format = getDocFormat(doc);
        if (isEpubOnly && format !== "epub") return false;

        const matchCategory =
          selectedCategory === "all" || doc.category === selectedCategory;

        const matchFormat =
          selectedFormat === "all" || format === selectedFormat;

        const isVault =
          doc.relativePath.startsWith("vault:") ||
          doc.id.startsWith("vault:") ||
          doc.relativePath.startsWith("01_Notes");

        const matchSource =
          selectedSource === "all" ||
          (selectedSource === "vault" && isVault) ||
          (selectedSource === "local" && !isVault);

        const matchSearch =
          searchTerm.trim() === "" ||
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.relativePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.status && doc.status.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchCategory && matchFormat && matchSource && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === "title-asc") {
          return a.title.localeCompare(b.title, "vi");
        }
        if (sortBy === "size-desc") {
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        }
        const timeA = new Date(a.lastModified || 0).getTime();
        const timeB = new Date(b.lastModified || 0).getTime();
        return timeB - timeA;
      });
  }, [
    docs,
    selectedCategory,
    selectedFormat,
    selectedSource,
    sortBy,
    searchTerm,
    isEpubOnly,
    getDocFormat,
  ]);

  const recentDocs = useMemo(() => {
    const allPos = globalReadingPositionStore.getAllPositions();
    const keys = Object.keys(allPos);
    if (keys.length === 0) return [];

    return docs.filter((doc) => {
      const format = getDocFormat(doc);
      const posById = globalReadingPositionStore.getPosition(doc.id, format);
      const posByPath = globalReadingPositionStore.getPosition(doc.relativePath, format);
      if (posById || posByPath) return true;
      return keys.some(
        (k) =>
          (doc.id && k.includes(doc.id)) ||
          (doc.relativePath && k.includes(doc.relativePath))
      );
    });
  }, [docs, getDocFormat]);

  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of docs) {
      if (doc.category) {
        counts[doc.category] = (counts[doc.category] || 0) + 1;
      }
    }
    const friendlyLabels: Record<string, string> = {
      adr: "ADRs",
      specs: "Specs",
      gherkin: "Gherkin",
      books: "Sách",
      guides: "Hướng dẫn",
      drafts: "Bản nháp",
      releases: "Releases",
      "test-plans": "Test Plans",
      runbooks: "Runbooks",
      sop: "SOP",
    };
    const catKeys = Object.keys(counts).sort((a, b) => {
      const order = ["adr", "specs", "gherkin", "books", "guides", "drafts", "releases", "test-plans", "runbooks", "sop"];
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return [
      { id: "all", label: `Tất Cả (${docs.length})` },
      ...catKeys.map((cat) => ({
        id: cat,
        label: friendlyLabels[cat] || cat.toUpperCase(),
      })),
    ];
  }, [docs]);

  const handleCopyContent = async () => {
    if (!selectedDoc?.content) return;
    const success = await copyTextToClipboard(selectedDoc.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    fetchDocsList();
    if (selectedDoc) {
      fetchDocContent(selectedDoc.relativePath);
    }
  };

  return (
    <div className={`p-4 md:p-6 lg:p-8 ${activeReaderDoc ? "max-w-[1700px] 2xl:px-8" : "max-w-7xl"} mx-auto space-y-5 animate-in fade-in duration-200`}>
      {/* Page Header */}
      <PageHeader
        title={isEpubOnly ? "Thư Viện Sách" : "Tài Liệu Kiến Trúc & Đặc Tả Hệ Thống"}
        subtitle={
          isEpubOnly
            ? "Không gian đọc sách điện tử & tra cứu tài liệu nghiên cứu."
            : "Tra cứu trực tiếp quyết định kiến trúc (ADRs), đặc tả kỹ thuật (Specs), kịch bản kiểm thử (Gherkin) và sổ tay vận hành hệ thống."
        }
        categoryLabel={isEpubOnly ? "Kho tài liệu EPUB • PDF • Obsidian Vault" : "Architecture & Specifications Explorer"}
        categoryIcon={BookOpen}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isEpubOnly && (
              <ToolbarButton
                variant="primary"
                icon={FolderOpen}
                onClick={() => setIsVaultModalOpen(true)}
                aria-label="Chọn sách từ Vault"
              >
                Chọn sách từ Vault
              </ToolbarButton>
            )}

            <ToolbarButton
              variant="secondary"
              icon={RotateCcw}
              onClick={handleRefresh}
              aria-label="Làm mới"
            >
              Làm mới
            </ToolbarButton>
          </div>
        }
      />

      {/* Recent Reads Shelf (Phase R1 / Reader-First Compact Strip) */}
      {recentDocs.length > 0 && (
        <div
          data-testid="recent-reads-shelf"
          aria-label="Đọc gần đây"
          className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center">
              <Clock className="w-3 h-3" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Đọc gần đây:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-1 max-w-full">
            {recentDocs.slice(0, 4).map((doc) => {
              const format = getDocFormat(doc);
              return (
                <button
                  key={`recent-${doc.id || doc.relativePath}`}
                  aria-label={`Đang đọc ${doc.title}`}
                  onClick={() => handleDocClick(doc)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-stone-900 hover:bg-amber-100/80 dark:hover:bg-amber-950/80 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-lg transition text-left cursor-pointer shadow-2xs shrink-0 max-w-[220px]"
                >
                  <BookOpen className="w-3 h-3 text-amber-800 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                    {doc.title}
                  </span>
                  <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-amber-100/60 dark:bg-amber-950/80 rounded text-amber-800 dark:text-amber-400 font-semibold shrink-0">
                    {format}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0 hidden md:inline-block">
            {recentDocs.length} {isEpubOnly ? "cuốn sách" : "tài liệu"}
          </span>
        </div>
      )}

      {/* Split-Pane Content Container: Reader-First Flexbox Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch min-h-[700px] lg:min-h-[calc(100vh-160px)] relative">
        {/* Left Pane: Directory, Filters & Search (Slim & Collapsible) */}
        <SurfaceCard
          data-testid="library-left-sidebar"
          variant="default"
          className={`${
            isLeftSidebarCollapsed
              ? "hidden"
              : "w-full lg:w-72 shrink-0"
          } flex flex-col space-y-3 transition-all duration-200`}
        >
          {/* Top Row inside Left Pane: Title & Collapse Toggle */}
          <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>{isEpubOnly ? `Danh mục sách (${filteredDocs.length})` : `Danh mục (${filteredDocs.length})`}</span>
            </span>
            <button
              data-testid="toggle-left-sidebar-btn"
              type="button"
              onClick={() => setIsLeftSidebarCollapsed(true)}
              aria-label="Thu gọn danh mục"
              title="Thu gọn danh mục để mở rộng vùng đọc"
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEpubOnly ? "Tìm theo tên sách, tác giả, đường dẫn..." : "Tìm kiếm tài liệu (ADR-061, Spec, P12.2...)"}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 transition shadow-2xs"
            />
          </div>

          {/* Category Filter Tabs (mode full only) */}
          {!isEpubOnly && (
            <div
              role="group"
              aria-label="Bộ lọc danh mục tài liệu"
              className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl max-h-24 overflow-y-auto"
            >
              {dynamicCategories.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    selectedCategory === tab.id
                      ? "bg-amber-800 text-amber-50 shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Phase R1 Multi-Facet Filters Bar: Format, Source, Sort, View Toggle */}
          <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800 text-xs">
            {/* Format Filter Buttons */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Định dạng
              </span>
              <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[11px]">
                {[
                  { id: "all", label: "Tất cả", testId: "filter-format-all" },
                  { id: "pdf", label: "PDF", testId: "filter-format-pdf" },
                  { id: "epub", label: "EPUB", testId: "filter-format-epub" },
                  { id: "md", label: "Markdown", testId: "filter-format-md" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    data-testid={fmt.testId}
                    onClick={() => setSelectedFormat(fmt.id as any)}
                    className={`px-1.5 py-0.5 font-semibold rounded transition cursor-pointer ${
                      selectedFormat === fmt.id
                        ? "bg-amber-800 text-amber-50 shadow-2xs"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Filter, Sort Dropdown & View Mode Toggle */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
              {/* Source Filters */}
              <div className="flex items-center gap-0.5">
                <button
                  data-testid="filter-source-all"
                  onClick={() => setSelectedSource("all")}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer border ${
                    selectedSource === "all"
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                      : "bg-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 border-transparent"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  data-testid="filter-source-vault"
                  onClick={() => setSelectedSource("vault")}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer border ${
                    selectedSource === "vault"
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                      : "bg-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 border-transparent"
                  }`}
                >
                  Vault
                </button>
              </div>

              {/* Sort & View Mode */}
              <div className="flex items-center gap-1">
                <select
                  data-testid="library-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-1.5 py-0.5 text-stone-700 dark:text-stone-300 cursor-pointer focus:outline-hidden"
                >
                  <option value="recent">Mới nhất</option>
                  <option value="title-asc">Tên A-Z</option>
                  <option value="size-desc">Dung lượng</option>
                </select>

                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                  <button
                    data-testid="view-mode-grid"
                    onClick={() => setViewMode("grid")}
                    className={`p-0.5 rounded transition cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-stone-700 text-amber-800 dark:text-amber-300 shadow-2xs"
                        : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    }`}
                    title="Chế độ lưới"
                    aria-label="Chế độ lưới"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    data-testid="view-mode-list"
                    onClick={() => setViewMode("list")}
                    className={`p-0.5 rounded transition cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white dark:bg-stone-700 text-amber-800 dark:text-amber-300 shadow-2xs"
                        : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    }`}
                    title="Chế độ danh sách"
                    aria-label="Chế độ danh sách"
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List / Grid Container */}
          <div className="flex-1 overflow-y-auto max-h-[520px] space-y-2 pr-1 scrollbar-thin">
            {isLoadingList ? (
              <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500 animate-pulse">
                {isEpubOnly ? "Đang nạp danh sách sách EPUB..." : "Đang nạp danh mục tài liệu..."}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400 space-y-3 bg-stone-50/50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                <Book className="w-7 h-7 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="font-medium text-stone-600 dark:text-stone-300 text-xs">
                  {isEpubOnly ? "Chưa có sách trong danh mục." : "Không tìm thấy tài liệu phù hợp"}
                </p>
                {isEpubOnly && (
                  <button
                    onClick={() => setIsVaultModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-[11px] font-semibold transition cursor-pointer border border-stone-300 dark:border-stone-600"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>Duyệt sách từ Vault</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                data-testid={viewMode === "grid" ? "library-grid-container" : "library-list-container"}
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-2"
                    : "space-y-1.5"
                }
              >
                {filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.relativePath === doc.relativePath || activeReaderDoc?.documentId === doc.id || activeReaderDoc?.documentId === doc.relativePath;
                  const format = getDocFormat(doc);
                  const isEpub = format === "epub";
                  const isPdf = format === "pdf";

                  return (
                    <button
                      key={doc.relativePath}
                      data-testid={`doc-item-${doc.id}`}
                      aria-label={doc.title}
                      onClick={() => handleDocClick(doc)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/40"
                          : "bg-stone-50/60 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 hover:bg-stone-100/80 dark:hover:bg-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isEpub && <Book className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />}
                          {isPdf && <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
                          <span
                            data-testid="library-doc-title"
                            className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1"
                          >
                            {doc.title}
                          </span>
                        </div>
                        {doc.status && (
                          <span
                            className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase font-mono shrink-0 ${
                              doc.status === "ACCEPTED"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : doc.status === "PROPOSED"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : doc.status === "EPUB"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-semibold"
                                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] text-stone-500 dark:text-stone-400 font-mono">
                        <span className="truncate max-w-[140px]">{doc.relativePath}</span>
                        <span>•</span>
                        <span className="shrink-0">{Math.round(doc.sizeBytes / 1024)} KB</span>
                        <span>•</span>
                        <span className="uppercase font-semibold text-amber-800 dark:text-amber-400">{format}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SurfaceCard>

        {/* Right Pane: Dominant Embedded Reader, Markdown Preview, or Overview */}
        <div
          data-testid="library-right-content-pane"
          className="flex-1 min-w-0 flex flex-col min-h-[700px] lg:min-h-[calc(100vh-160px)] overflow-hidden relative"
        >
          {/* Floating Expand Sidebar Button when Left Sidebar is Collapsed */}
          {isLeftSidebarCollapsed && (
            <button
              data-testid="expand-left-sidebar-btn"
              type="button"
              onClick={() => setIsLeftSidebarCollapsed(false)}
              aria-label="Mở danh mục"
              title="Mở danh mục sách"
              className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-stone-900/95 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold shadow-md backdrop-blur-xs transition cursor-pointer animate-in fade-in"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span className="hidden sm:inline">Danh mục</span>
            </button>
          )}
          {activeReaderDoc ? (
            <UnifiedResearchReader
              documentId={activeReaderDoc.documentId}
              title={activeReaderDoc.title}
              format={activeReaderDoc.format}
              fileUrl={activeReaderDoc.fileUrl}
              content={activeReaderDoc.content}
              sourceType={activeReaderDoc.sourceType}
              layoutMode="embedded"
              onClose={() => setActiveReaderDoc(null)}
            />
          ) : isLoadingContent ? (
            <SurfaceCard variant="default" className="flex-1 flex items-center justify-center text-xs text-stone-400 dark:text-stone-500 animate-pulse">
              Đang nạp nội dung...
            </SurfaceCard>
          ) : selectedDoc ? (
            <SurfaceCard variant="default" className="flex-1 flex flex-col space-y-4">
              {/* Document Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                    <span className="uppercase font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded">
                      {selectedDoc.category}
                    </span>
                    <span>{selectedDoc.relativePath}</span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    {selectedDoc.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const sanitizedRelative = selectedDoc.relativePath.replace(/^\/+/, "");
                      setActiveReaderDoc({
                        documentId: selectedDoc.relativePath,
                        title: selectedDoc.title,
                        format: 'md',
                        sourceType: 'docs',
                        fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
                        content: selectedDoc.content,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-xl border border-amber-300/80 dark:border-amber-700/80 transition cursor-pointer shadow-2xs"
                    title="Mở khung đọc nghiên cứu với công cụ trích dẫn và mục lục"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                    <span>Mở trong khung đọc</span>
                  </button>

                  <button
                    onClick={handleCopyContent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-700 transition cursor-pointer shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                        <span>Sao chép Markdown</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Formatted Markdown Reader Content */}
              <div className="prose prose-stone dark:prose-invert max-w-none text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans bg-stone-50/50 dark:bg-stone-850/50 p-4 sm:p-6 rounded-xl border border-stone-200/80 dark:border-stone-700/80 overflow-x-auto">
                <MarkdownReadabilityRenderer
                  content={selectedDoc.content}
                  docPath={selectedDoc.relativePath}
                  sourceType="docs"
                />
              </div>
            </SurfaceCard>
          ) : isEpubOnly ? (
            /* EPUB Library Overview / Empty State */
            <SurfaceCard variant="default" className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 space-y-5 my-auto">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="max-w-lg space-y-2">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {filteredDocs.length === 0
                    ? "Thư viện chưa có sách"
                    : "Chọn sách để bắt đầu đọc"}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {filteredDocs.length === 0
                    ? "Thêm file EPUB/PDF đầu tiên để bắt đầu đọc sách điện tử trong không gian nghiên cứu."
                    : "Chọn một cuốn sách từ danh mục bên trái hoặc mở từ Obsidian Vault để bắt đầu phiên nghiên cứu trong khung đọc này."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVaultModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Chọn sách từ Vault</span>
                </button>

                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold border border-stone-300 dark:border-stone-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Helpful storage guidance */}
              <div className="w-full max-w-lg bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl p-4 text-left space-y-2 text-[11px] text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
                  <Info className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>Vị trí nạp sách vào hệ thống:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-stone-500 dark:text-stone-400 pl-1">
                  <li>
                    Thư mục <code className="bg-stone-200/80 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-stone-800 dark:text-stone-200">docs/books</code> trong mã nguồn dự án.
                  </li>
                  <li>
                    Các file <code className="bg-stone-200/80 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-stone-800 dark:text-stone-200">.epub</code> / <code className="bg-stone-200/80 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-stone-800 dark:text-stone-200">.pdf</code> trong <strong>Obsidian Vault</strong> đã liên kết.
                  </li>
                </ul>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 italic pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                  Sau khi thêm tệp sách mới, hãy nhấn nút <strong>Làm mới</strong> hoặc mở trực tiếp qua nút <strong>Chọn sách từ Vault</strong>.
                </p>
              </div>
            </SurfaceCard>
          ) : (
            /* Default Documentation Overview State for mode="full" */
            <SurfaceCard variant="default" className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Trung Tâm Tra Cứu Tài Liệu Kiến Trúc
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Vui lòng chọn một tài liệu (ADR, Kịch bản Gherkin, hoặc Đặc tả kỹ thuật) từ danh mục bên trái để đọc chi tiết toàn văn.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-stone-600 dark:text-stone-400">
                <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono">
                  {docs.length} Tài liệu trên đĩa
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                  Tự động đồng bộ thời gian thực
                </span>
              </div>
            </SurfaceCard>
          )}
        </div>
      </div>

      {/* Obsidian Vault Browser Modal */}
      {isVaultModalOpen && (
        <ObsidianVaultBrowserModal
          isOpen={isVaultModalOpen}
          onClose={() => setIsVaultModalOpen(false)}
          onSelectFile={handleVaultFileSelect}
        />
      )}
    </div>
  );
}
