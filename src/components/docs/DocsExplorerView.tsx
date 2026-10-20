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
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { PageHeader, SurfaceCard, StatusPill, ToolbarButton } from "../workbench";
import { copyTextToClipboard } from "../../lib/clipboard";
import { globalReadingPositionStore, formatReadingDuration, calculateReadingAnalyticsBreakdown } from "../../lib/readingPositionUnified";
import { MarkdownReadabilityRenderer } from "../../lib/markdownReadability";

const UnifiedResearchReader = React.lazy(() =>
  import("../reader/UnifiedResearchReader").then((m) => ({
    default: m.UnifiedResearchReader,
  }))
);

const ObsidianVaultBrowserModal = React.lazy(() =>
  import("../modals/ObsidianVaultBrowserModal").then((m) => ({
    default: m.ObsidianVaultBrowserModal,
  }))
);

export interface DocItem {
  id: string;
  title: string;
  category: "adr" | "specs" | "gherkin" | "runbooks" | "guides" | "books" | string;
  relativePath: string;
  status?: string;
  sizeBytes: number;
  lastModified: string;
  sourceType?: "docs" | "vault" | "archive";
  sourcePath?: string;
  lastPosition?: any;
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
    initialPosition?: string;
  } | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [archivedDocs, setArchivedDocs] = useState<any[]>([]);
  const [recentReadsError, setRecentReadsError] = useState<string | null>(null);
  const [deletedHistoryIds, setDeletedHistoryIds] = useState<Set<string>>(new Set());
  const [allHistoryCleared, setAllHistoryCleared] = useState<boolean>(false);
  const [activeDrilldownGroup, setActiveDrilldownGroup] = useState<"completed" | "in-progress" | null>(null);
  const [drilldownSearchQuery, setDrilldownSearchQuery] = useState<string>("");
  useEffect(() => {
    setDrilldownSearchQuery("");
  }, [activeDrilldownGroup]);
  useEffect(() => {
    if (allHistoryCleared && activeDrilldownGroup !== null) {
      setActiveDrilldownGroup(null);
    }
  }, [allHistoryCleared, activeDrilldownGroup]);

  const fetchArchivedDocs = useCallback(async () => {
    setRecentReadsError(null);
    try {
      const res = await fetch("/api/archive/list");
      if (res.ok) {
        const data = await res.json();
        setArchivedDocs(data.documents || []);
        setRecentReadsError(null);
      } else {
        setRecentReadsError(`Lỗi nạp lịch sử (${res.status})`);
      }
    } catch (err: any) {
      setRecentReadsError(err.message || "Không thể kết nối máy chủ");
    }
  }, []);

  const handleDeleteRecentRead = useCallback(
    async (docId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (!docId) return;

      setDeletedHistoryIds((prev) => new Set(prev).add(docId));
      setArchivedDocs((prev) =>
        prev.map((d) => (d.id === docId || d.sourceKey === docId ? { ...d, lastReadAt: null, readCount: 0 } : d))
      );

      try {
        const res = await fetch(`/api/archive/document/${encodeURIComponent(docId)}/history`, {
          method: "DELETE",
        });
        if (!res.ok) {
          fetchArchivedDocs();
        }
      } catch {
        fetchArchivedDocs();
      }
    },
    [fetchArchivedDocs]
  );

  const handleClearAllRecentReads = useCallback(async () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa tất cả lịch sử đọc gần đây?");
    if (!confirmed) return;

    setAllHistoryCleared(true);
    setActiveDrilldownGroup(null);
    setArchivedDocs((prev) => prev.map((d) => ({ ...d, lastReadAt: null, readCount: 0 })));

    try {
      const res = await fetch("/api/archive/history", {
        method: "DELETE",
      });
      if (!res.ok) {
        setAllHistoryCleared(false);
        fetchArchivedDocs();
      }
    } catch {
      setAllHistoryCleared(false);
      fetchArchivedDocs();
    }
  }, [fetchArchivedDocs]);

  const fetchDocsList = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      fetchArchivedDocs();
      const res = await fetch("/api/docs");
      if (!res.ok) throw new Error(`Lỗi tải danh mục tài liệu (${res.status})`);
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (err: any) {
      setError(err.message || "Không thể kết nối máy chủ");
    } finally {
      setIsLoadingList(false);
    }
  }, [fetchArchivedDocs]);

  const fetchDocContent = useCallback(
    async (
      relativePath: string,
      explicitSourceType?: "docs" | "vault",
      docId?: string,
      openInReader: boolean = false,
      initialPos?: string
    ) => {
      setIsLoadingContent(true);
      setError(null);
      try {
        const isVault = explicitSourceType === "vault" || relativePath.startsWith("vault://");
        const cleanPath = relativePath.replace(/^vault:\/\//, "").replace(/^\/+/, "");

        if (isVault) {
          const res = await fetch(`/api/obsidian/vault/file?path=${encodeURIComponent(cleanPath)}`);
          if (!res.ok) throw new Error(`Lỗi nạp nội dung tài liệu Vault (${res.status})`);
          const data = await res.json();
          const fileName = cleanPath.split("/").pop() || cleanPath;
          const detail: DocDetail = {
            id: docId || `vault:${cleanPath}`,
            title: fileName.replace(/\.md$/i, ""),
            category: "guides",
            relativePath: cleanPath,
            sizeBytes: (data.content || "").length,
            lastModified: new Date().toISOString(),
            content: data.content || "",
            sourceType: "vault",
            sourcePath: cleanPath,
          };
          setSelectedDoc(detail);
          setActiveReaderDoc({
            documentId: docId || `vault:${cleanPath}`,
            title: detail.title,
            format: "md",
            sourceType: "vault",
            fileUrl: `/api/obsidian/vault/file?path=${encodeURIComponent(cleanPath)}`,
            content: data.content || "",
            initialPosition: initialPos,
          });
          return;
        }

        const res = await fetch(`/api/docs/content?path=${encodeURIComponent(relativePath)}`);
        if (!res.ok) throw new Error(`Lỗi nạp nội dung tài liệu (${res.status})`);
        const data: DocDetail = await res.json();
        setSelectedDoc(data);

        if (openInReader) {
          const sanitizedRelative = relativePath.replace(/^\/+/, "");
          setActiveReaderDoc({
            documentId: docId || data.id || relativePath,
            title: data.title || relativePath.split("/").pop() || relativePath,
            format: "md",
            sourceType: "docs",
            fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
            content: data.content || "",
            initialPosition: initialPos,
          });
        }
      } catch (err: any) {
        setError(err.message || "Không thể nạp nội dung tài liệu");
      } finally {
        setIsLoadingContent(false);
      }
    },
    []
  );

  const getDocFormat = useCallback((doc: DocItem): "pdf" | "epub" | "md" | "other" => {
    const p = (doc.relativePath || "").toLowerCase();
    if (p.endsWith(".pdf")) return "pdf";
    if (p.endsWith(".epub") || doc.category === "books") return "epub";
    if (p.endsWith(".md")) return "md";
    return "other";
  }, []);

  const handleDocClick = useCallback(
    (doc: DocItem, openInReader: boolean = false) => {
      const format = getDocFormat(doc);
      const isVault =
        doc.sourceType === "vault" ||
        doc.relativePath.startsWith("vault://") ||
        archivedDocs.some(
          (a) =>
            (a.id === doc.id || a.sourcePath === doc.relativePath || a.sourceKey === `vault:${doc.relativePath}`) &&
            (a.sourceType === "vault" || a.storageRelPath?.startsWith("vault://"))
        );

      const matchingArch = archivedDocs.find(
        (a) =>
          a.id === doc.id ||
          a.sourcePath === doc.relativePath ||
          a.storageRelPath === doc.relativePath ||
          a.sourceKey === `vault:${doc.relativePath}` ||
          a.sourceKey === `archive:${doc.relativePath}` ||
          (a.fileName && doc.relativePath.endsWith(a.fileName))
      );

      let initialPos: string | undefined = undefined;
      if (matchingArch?.lastPosition && typeof matchingArch.lastPosition === "object") {
        const lp = matchingArch.lastPosition;
        if (format === "epub" && lp.cfi) initialPos = lp.cfi;
        else if (format === "pdf" && lp.pageNumber) initialPos = String(lp.pageNumber);
        else if (format === "md" && lp.headingId) initialPos = lp.headingId;
      }

      if (isVault) {
        const cleanVaultPath = doc.sourcePath || doc.relativePath.replace(/^vault:\/\//, "").replace(/^\/+/, "");
        if (format === "epub" || format === "pdf") {
          setActiveReaderDoc({
            documentId: matchingArch?.id || doc.id || `vault:${cleanVaultPath}`,
            title: doc.title || cleanVaultPath.split("/").pop() || cleanVaultPath,
            format,
            sourceType: "vault",
            fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanVaultPath)}`,
            initialPosition: initialPos,
          });
          return;
        }
        fetchDocContent(cleanVaultPath, "vault", matchingArch?.id || doc.id, true, initialPos);
        return;
      }

      if (format === "epub") {
        const sanitizedRelative = doc.relativePath.replace(/^\/+/, "");
        setActiveReaderDoc({
          documentId: matchingArch?.id || doc.id || doc.relativePath,
          title: doc.title || doc.relativePath.split("/").pop() || doc.relativePath,
          format: "epub",
          sourceType: "docs",
          fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
          initialPosition: initialPos,
        });
        return;
      }
      if (format === "pdf") {
        const sanitizedRelative = doc.relativePath.replace(/^\/+/, "");
        setActiveReaderDoc({
          documentId: matchingArch?.id || doc.id || doc.relativePath,
          title: doc.title,
          format: "pdf",
          sourceType: "docs",
          fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
          initialPosition: initialPos,
        });
        return;
      }
      fetchDocContent(doc.relativePath, "docs", matchingArch?.id || doc.id, openInReader, initialPos);
    },
    [fetchDocContent, getDocFormat, archivedDocs]
  );

  const handleVaultFileSelect = useCallback(async (filePath: string) => {
    setIsVaultModalOpen(false);
    const isEpub = filePath.toLowerCase().endsWith(".epub");
    const isPdf = filePath.toLowerCase().endsWith(".pdf");
    const format = isEpub ? "epub" : isPdf ? "pdf" : "md";
    const fileName = filePath.split("/").pop() || filePath;
    const title = fileName.replace(/\.(epub|pdf|md)$/i, "");
    const cleanPath = filePath.replace(/^\/+/, "");

    const fileUrl =
      format === "md"
        ? `/api/obsidian/vault/file?path=${encodeURIComponent(cleanPath)}`
        : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanPath)}`;

    let realDocId = `vault:${cleanPath}`;
    try {
      const res = await fetch("/api/archive/vault/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: cleanPath,
          fileName,
          fileFormat: format,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.document?.id) {
          realDocId = data.document.id;
          fetchArchivedDocs();
        }
      }
    } catch {
      // Degraded mode fallback
    }

    setActiveReaderDoc({
      documentId: realDocId,
      title,
      format,
      sourceType: "vault",
      fileUrl,
    });
  }, [fetchArchivedDocs]);

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

  const readingSummary = useMemo(() => {
    return calculateReadingAnalyticsBreakdown(allHistoryCleared ? [] : archivedDocs);
  }, [archivedDocs, allHistoryCleared]);

  const drilldownDocs = useMemo(() => {
    if (!activeDrilldownGroup || allHistoryCleared) return [];
    const targetIds =
      activeDrilldownGroup === "completed"
        ? readingSummary.completedDocIds
        : readingSummary.inProgressDocIds;
    if (!targetIds || targetIds.length === 0) return [];

    const idSet = new Set(targetIds);
    const result: DocItem[] = [];
    const seen = new Set<string>();

    for (const arch of archivedDocs) {
      if (!arch) continue;
      const archId = arch.id || arch.sourceKey || arch.storageRelPath || arch.fileName || arch.sourcePath;
      if (archId && idSet.has(archId) && !seen.has(archId)) {
        seen.add(archId);
        const matched = docs.find(
          (d) =>
            d.id === arch.id ||
            d.relativePath === arch.storageRelPath ||
            d.relativePath === arch.fileName ||
            d.id === arch.fileName?.replace(/\.[^/.]+$/, "") ||
            (arch.fileName && d.relativePath.endsWith(arch.fileName)) ||
            (arch.storageRelPath && d.relativePath.endsWith(arch.storageRelPath))
        );

        if (matched) {
          result.push({
            ...matched,
            id: arch.id || matched.id,
            lastPosition: arch.lastPosition,
            lastModified: arch.lastReadAt || arch.updatedAt || arch.createdAt || matched.lastModified,
          });
        } else {
          const isVault = arch.sourceType === "vault" || arch.storageRelPath?.startsWith("vault://");
          const displayName = (arch.fileName || arch.storageRelPath || arch.sourcePath || "document")
            .split("/")
            .pop()!
            .replace(/\.(epub|md|pdf)$/i, "")
            .replace(/_/g, " ");
          const cleanVaultPath = arch.sourcePath || arch.storageRelPath?.replace(/^vault:\/\//, "") || arch.fileName;
          const format = (arch.fileFormat || arch.fileName?.split(".").pop() || "md").toLowerCase();
          result.push({
            id: archId,
            title: displayName,
            category: format === "epub" ? "books" : "guides",
            relativePath: isVault ? cleanVaultPath : (arch.storageRelPath || arch.fileName || cleanVaultPath),
            sizeBytes: arch.fileSize || 0,
            lastModified: arch.lastReadAt || arch.updatedAt || arch.createdAt || new Date().toISOString(),
            sourceType: isVault ? "vault" : "archive",
            sourcePath: isVault ? cleanVaultPath : undefined,
            lastPosition: arch.lastPosition,
          });
        }
      }
    }

    result.sort((a, b) => {
      const timeA = new Date(a.lastModified || 0).getTime();
      const timeB = new Date(b.lastModified || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [activeDrilldownGroup, allHistoryCleared, readingSummary, archivedDocs, docs]);

  const drilldownGroupDuration = useMemo(() => {
    let totalSeconds = 0;
    for (const doc of drilldownDocs) {
      const sec = doc.lastPosition?.totalReadingSeconds;
      if (typeof sec === "number" && !isNaN(sec) && sec > 0) {
        totalSeconds += sec;
      }
    }
    return totalSeconds;
  }, [drilldownDocs]);

  const filteredDrilldownDocs = useMemo(() => {
    const q = drilldownSearchQuery.trim().toLowerCase();
    if (!q) return drilldownDocs;
    return drilldownDocs.filter((doc) =>
      (doc.title || "").toLowerCase().includes(q)
    );
  }, [drilldownDocs, drilldownSearchQuery]);

  const recentDocs = useMemo(() => {
    if (allHistoryCleared) return [];

    const allPos = globalReadingPositionStore.getAllPositions();
    const keys = Object.keys(allPos);

    // 1. Filter persisted reading history from archive metadata
    // Accept records with reading progress OR valid registered documents with displayable metadata
    const persistedReads = archivedDocs.filter((a) => {
      if (!a) return false;
      if (deletedHistoryIds.has(a.id) || (a.sourceKey && deletedHistoryIds.has(a.sourceKey))) return false;
      if (a.lastReadAt === null && a.readCount === 0) return false;
      if (a.lastReadAt != null) return true;
      const hasIdent = Boolean(a.sourceKey || a.id);
      const hasNameOrPath = Boolean(a.fileName || a.storageRelPath || a.sourcePath);
      const hasFormat =
        Boolean(a.fileFormat && ["epub", "md", "pdf"].includes(String(a.fileFormat).toLowerCase())) ||
        /\.(epub|md|pdf)$/i.test(a.fileName || a.storageRelPath || a.sourcePath || "");
      return hasIdent && hasNameOrPath && hasFormat;
    });

    if (persistedReads.length === 0 && keys.length === 0) {
      return [];
    }

    // Sort persisted reads by recency fallback: lastReadAt -> updatedAt -> createdAt
    const sortedArchived = [...persistedReads].sort((a, b) => {
      const timeA = new Date(a.lastReadAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastReadAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const recentList: DocItem[] = [];
    const seenIds = new Set<string>();

    for (const arch of sortedArchived) {
      // Find matching doc in library docs
      const matched = docs.find(
        (d) =>
          d.id === arch.id ||
          d.relativePath === arch.storageRelPath ||
          d.relativePath === arch.fileName ||
          d.id === arch.fileName?.replace(/\.[^/.]+$/, "") ||
          (arch.fileName && d.relativePath.endsWith(arch.fileName)) ||
          (arch.storageRelPath && d.relativePath.endsWith(arch.storageRelPath))
      );

      if (matched && !seenIds.has(matched.id || matched.relativePath)) {
        seenIds.add(matched.id || matched.relativePath);
        recentList.push({
          ...matched,
          id: arch.id || matched.id,
          lastPosition: arch.lastPosition,
        });
      } else if (!matched && (arch.fileName || arch.storageRelPath || arch.sourcePath)) {
        const virtualId = arch.id || arch.contentHash || arch.sourceKey;
        if (virtualId && !seenIds.has(virtualId)) {
          seenIds.add(virtualId);
          const isVault = arch.sourceType === "vault" || arch.storageRelPath?.startsWith("vault://");
          const displayName = (arch.fileName || arch.storageRelPath || arch.sourcePath || "document")
            .split("/")
            .pop()!
            .replace(/\.(epub|md|pdf)$/i, "")
            .replace(/_/g, " ");
          const cleanVaultPath = arch.sourcePath || arch.storageRelPath?.replace(/^vault:\/\//, "") || arch.fileName;
          const format = (arch.fileFormat || arch.fileName?.split(".").pop() || "md").toLowerCase();
          recentList.push({
            id: virtualId,
            title: displayName,
            category: format === "epub" ? "books" : "guides",
            relativePath: isVault ? cleanVaultPath : (arch.storageRelPath || arch.fileName || cleanVaultPath),
            sizeBytes: arch.fileSize || 0,
            lastModified: arch.lastReadAt || arch.updatedAt || arch.createdAt || new Date().toISOString(),
            sourceType: isVault ? "vault" : "archive",
            sourcePath: isVault ? cleanVaultPath : undefined,
            lastPosition: arch.lastPosition,
          });
        }
      }
    }

    // Append any extra in-memory reads from globalReadingPositionStore
    for (const doc of docs) {
      const docKey = doc.id || doc.relativePath;
      if (seenIds.has(docKey)) continue;
      if (deletedHistoryIds.has(doc.id) || deletedHistoryIds.has(doc.relativePath)) continue;

      const format = getDocFormat(doc);
      const posById = globalReadingPositionStore.getPosition(doc.id, format);
      const posByPath = globalReadingPositionStore.getPosition(doc.relativePath, format);
      const hasKey = keys.some(
        (k) =>
          (doc.id && k.includes(doc.id)) ||
          (doc.relativePath && k.includes(doc.relativePath))
      );

      if (posById || posByPath || hasKey) {
        seenIds.add(docKey);
        recentList.push({
          ...doc,
          lastPosition: posById || posByPath,
        });
      }
    }

    return recentList;
  }, [docs, archivedDocs, getDocFormat, allHistoryCleared, deletedHistoryIds]);

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

      {/* Reading Analytics Summary Surface (Slice 5C) */}
      <div
        data-testid="reading-analytics-summary"
        aria-label="Tổng quan tiến độ đọc"
        className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200"
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
            <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
          </div>
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
            Tổng quan tiến độ đọc:
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px] flex-wrap">
          <span
            data-testid="summary-total-reading-time"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-semibold"
            title="Tổng thời gian đọc"
          >
            <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
            <span>{formatReadingDuration(readingSummary.totalReadingSeconds)}</span>
          </span>

          <button
            data-testid="summary-completed-count"
            type="button"
            aria-label="Thống kê đã hoàn thành"
            onClick={() => setActiveDrilldownGroup((prev) => (prev === "completed" ? null : "completed"))}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold transition cursor-pointer ${
              activeDrilldownGroup === "completed"
                ? "bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400"
                : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70"
            }`}
            title="Số tài liệu đã hoàn thành (Click để xem chi tiết)"
          >
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{readingSummary.completedCount} đã xong</span>
          </button>

          <button
            data-testid="summary-in-progress-count"
            type="button"
            aria-label="Thống kê chưa hoàn thành"
            onClick={() => setActiveDrilldownGroup((prev) => (prev === "in-progress" ? null : "in-progress"))}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold transition cursor-pointer ${
              activeDrilldownGroup === "in-progress"
                ? "bg-stone-200 dark:bg-stone-750 border-stone-400 dark:border-stone-500 text-stone-900 dark:text-stone-100 ring-1 ring-stone-400"
                : "bg-stone-100 dark:bg-stone-800 border-stone-200/60 dark:border-stone-700/60 text-stone-700 dark:text-stone-300 hover:bg-stone-200/60"
            }`}
            title="Số tài liệu đang đọc dở (Click để xem chi tiết)"
          >
            <Book className="w-3 h-3 text-stone-500 dark:text-stone-400" />
            <span>{readingSummary.inProgressCount} đang đọc</span>
          </button>

          <span
            data-testid="summary-completion-rate"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-300 font-semibold"
            title="Tỷ lệ hoàn thành tài liệu"
          >
            <span>{readingSummary.completionRate}% hoàn thành</span>
          </span>
        </div>
      </div>

      {/* Local Reading Analytics Drill-down Surface (Slice 6) */}
      {activeDrilldownGroup && !allHistoryCleared && (
        <div
          data-testid="reading-analytics-drilldown"
          className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl p-3 space-y-2.5 shadow-2xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                {activeDrilldownGroup === "completed" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tài liệu đã hoàn thành ({drilldownDocs.length})</span>
                  </>
                ) : (
                  <>
                    <Book className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Tài liệu đang đọc ({drilldownDocs.length})</span>
                  </>
                )}
              </span>

              <span
                data-testid="drilldown-group-duration"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700/60"
                title="Tổng thời lượng đọc của nhóm"
              >
                <Clock className="w-2.5 h-2.5 text-stone-500" />
                <span>{formatReadingDuration(drilldownGroupDuration)}</span>
              </span>
            </div>

            <button
              data-testid="drilldown-close-btn"
              type="button"
              onClick={() => setActiveDrilldownGroup(null)}
              aria-label="Đóng bảng chi tiết"
              title="Đóng bảng chi tiết"
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {drilldownDocs.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                data-testid="drilldown-search-input"
                type="text"
                value={drilldownSearchQuery}
                onChange={(e) => setDrilldownSearchQuery(e.target.value)}
                placeholder="Lọc trong nhóm này..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-750 rounded-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          )}

          {drilldownDocs.length === 0 ? (
            <div
              data-testid="drilldown-empty-state"
              className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center"
            >
              Chưa có tài liệu nào trong danh mục này
            </div>
          ) : filteredDrilldownDocs.length === 0 ? (
            <div
              data-testid="drilldown-search-empty-state"
              className="text-xs text-stone-500 dark:text-stone-400 py-3 text-center"
            >
              Không tìm thấy tài liệu phù hợp trong nhóm này
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredDrilldownDocs.map((doc) => {
                const format = getDocFormat(doc);
                const lp = doc.lastPosition;
                const duration = lp?.totalReadingSeconds ? formatReadingDuration(lp.totalReadingSeconds) : null;
                return (
                  <button
                    key={doc.id}
                    data-testid={`drilldown-item-${doc.id}`}
                    type="button"
                    onClick={() => handleDocClick(doc, true)}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-750 hover:border-amber-400 dark:hover:border-amber-600 transition text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate group-hover:text-amber-800 dark:group-hover:text-amber-300">
                        {doc.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        <span className="uppercase font-mono px-1 py-0.2 bg-stone-200/70 dark:bg-stone-800 rounded text-[9px] font-semibold">
                          {format}
                        </span>
                        {duration && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {duration}
                          </span>
                        )}
                        {lp?.isCompleted && (
                          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <Check className="w-2.5 h-2.5" />
                            Xong
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 transition shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Reads Shelf (Phase R1 / Reader-First Compact Strip) */}
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

        {recentReadsError ? (
          <div
            data-testid="recent-reads-error"
            className="flex items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400 py-1 flex-1"
          >
            <span>{recentReadsError}</span>
            <button
              data-testid="recent-reads-retry-btn"
              type="button"
              onClick={() => fetchArchivedDocs()}
              className="px-2 py-0.5 text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded hover:bg-rose-200 dark:hover:bg-rose-900/60 transition cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : recentDocs.length === 0 ? (
          <div
            data-testid="recent-reads-empty"
            className="flex items-center text-xs text-stone-500 dark:text-stone-400 italic py-1 flex-1"
          >
            Chưa có tài liệu nào được đọc gần đây
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-1 max-w-full">
              {recentDocs.slice(0, 4).map((doc) => {
                const format = getDocFormat(doc);
                const totalSeconds = doc.lastPosition?.totalReadingSeconds;
                const isCompleted = Boolean(doc.lastPosition?.isCompleted);
                const durationStr = totalSeconds && totalSeconds > 0 ? formatReadingDuration(totalSeconds) : null;

                return (
                  <div
                    key={`recent-${doc.id || doc.relativePath}`}
                    className="inline-flex items-center bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-lg transition shadow-2xs shrink-0 max-w-[280px] group overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-label={`Đang đọc ${doc.title}`}
                      onClick={() => handleDocClick(doc, true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-left cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-950/80 flex-1 min-w-0"
                    >
                      <BookOpen className="w-3 h-3 text-amber-800 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                        {doc.title}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-amber-100/60 dark:bg-amber-950/80 rounded text-amber-800 dark:text-amber-400 font-semibold shrink-0">
                        {format}
                      </span>
                      {durationStr && (
                        <span
                          data-testid={`recent-read-duration-${doc.id}`}
                          className="text-[9px] font-mono text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded font-medium shrink-0 flex items-center gap-0.5"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {durationStr}
                        </span>
                      )}
                      {isCompleted && (
                        <span
                          data-testid={`recent-read-completion-${doc.id}`}
                          className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-1 py-0.2 rounded font-semibold shrink-0 flex items-center gap-0.5"
                          title="Đã đọc xong"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>Xong</span>
                        </span>
                      )}
                    </button>
                    <button
                      data-testid={`remove-recent-read-${doc.id}`}
                      type="button"
                      aria-label={`Xóa ${doc.title} khỏi lịch sử đọc`}
                      title="Xóa khỏi lịch sử đọc"
                      onClick={(e) => handleDeleteRecentRead(doc.id, e)}
                      className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0 border-l border-stone-100 dark:border-stone-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 hidden md:inline-block">
                {recentDocs.length} {isEpubOnly ? "cuốn sách" : "tài liệu"}
              </span>

              <button
                data-testid="clear-recent-reads-btn"
                type="button"
                onClick={handleClearAllRecentReads}
                aria-label="Xóa tất cả lịch sử đọc"
                title="Xóa tất cả lịch sử đọc"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-stone-200 dark:border-stone-800 hover:border-rose-200 dark:hover:border-rose-900 rounded-md transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            </div>
          </>
        )}
      </div>

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
            <React.Suspense
              fallback={
                <SurfaceCard variant="default" className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400 dark:text-stone-500 animate-pulse">
                  <div className="w-7 h-7 rounded-full border-2 border-amber-600/30 border-t-amber-600 animate-spin mb-3" />
                  <span className="text-xs font-semibold tracking-wide text-stone-500 dark:text-stone-400 font-sans">
                    Đang mở trình đọc nghiên cứu...
                  </span>
                </SurfaceCard>
              }
            >
              <UnifiedResearchReader
                documentId={activeReaderDoc.documentId}
                title={activeReaderDoc.title}
                format={activeReaderDoc.format}
                fileUrl={activeReaderDoc.fileUrl}
                content={activeReaderDoc.content}
                sourceType={activeReaderDoc.sourceType}
                initialPosition={activeReaderDoc.initialPosition}
                layoutMode="embedded"
                onClose={() => {
                  setActiveReaderDoc(null);
                  fetchArchivedDocs();
                }}
              />
            </React.Suspense>
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
        <React.Suspense fallback={null}>
          <ObsidianVaultBrowserModal
            isOpen={isVaultModalOpen}
            onClose={() => setIsVaultModalOpen(false)}
            onSelectFile={handleVaultFileSelect}
          />
        </React.Suspense>
      )}
    </div>
  );
}
