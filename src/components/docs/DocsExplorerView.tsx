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
} from "lucide-react";
import { FileViewer } from "./FileViewer";
import { UnifiedResearchReader } from "../reader/UnifiedResearchReader";
import { ObsidianVaultBrowserModal } from "../modals/ObsidianVaultBrowserModal";
import { PageHeader, SurfaceCard, StatusPill, ToolbarButton } from "../workbench";

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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEpubFile, setActiveEpubFile] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [activeReaderDoc, setActiveReaderDoc] = useState<{
    documentId: string;
    title: string;
    format: string;
    fileUrl?: string;
    content?: string;
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

  const handleDocClick = useCallback((doc: DocItem) => {
    if (doc.relativePath.toLowerCase().endsWith(".epub") || doc.category === "books") {
      const sanitizedRelative = doc.relativePath.replace(/^\/+/, "");
      setActiveEpubFile({
        fileName: doc.title || doc.relativePath.split("/").pop() || doc.relativePath,
        fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
      });
      return;
    }
    fetchDocContent(doc.relativePath);
  }, [fetchDocContent]);

  const handleVaultFileSelect = useCallback((filePath: string) => {
    setIsVaultModalOpen(false);
    const isEpub = filePath.toLowerCase().endsWith(".epub");
    const fileName = filePath.split("/").pop() || filePath;
    if (isEpub) {
      setActiveEpubFile({
        fileName,
        fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(filePath)}`,
      });
    } else {
      setActiveReaderDoc({
        documentId: `vault:${filePath}`,
        title: fileName.replace(/\.md$/i, ""),
        format: "md",
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
        setActiveEpubFile({
          fileName: initialPath.split("/").pop() || initialPath,
          fileUrl: `/api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`,
        });
      } else {
        fetchDocContent(initialPath);
      }
    }
  }, [initialPath, fetchDocContent]);

  const isEpubOnly = mode === "epub-only";

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const isEpub =
        doc.relativePath.toLowerCase().endsWith(".epub") ||
        doc.category === "books";
      if (isEpubOnly && !isEpub) return false;
      const matchCategory =
        selectedCategory === "all" || doc.category === selectedCategory;
      const matchSearch =
        searchTerm.trim() === "" ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.relativePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.status && doc.status.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [docs, selectedCategory, searchTerm, isEpubOnly]);

  const handleCopyContent = () => {
    if (!selectedDoc?.content) return;
    navigator.clipboard.writeText(selectedDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    fetchDocsList();
    if (selectedDoc) {
      fetchDocContent(selectedDoc.relativePath);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title={isEpubOnly ? "Thư Viện Sách" : "Tài Liệu Kiến Trúc & Đặc Tả Hệ Thống"}
        subtitle={
          isEpubOnly
            ? "Đọc và quản lý sách EPUB trong kho tài liệu của bạn."
            : "Tra cứu trực tiếp quyết định kiến trúc (ADRs), đặc tả kỹ thuật (Specs), kịch bản kiểm thử (Gherkin) và sổ tay vận hành hệ thống."
        }
        categoryLabel={isEpubOnly ? "Nguồn: Obsidian Vault & Kho lưu trữ EPUB" : "Architecture & Specifications Explorer"}
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

      {/* Split-Pane Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px]">
        {/* Left Pane: Directory & Search */}
        <SurfaceCard variant="default" className="lg:col-span-4 flex flex-col space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEpubOnly ? "Tìm kiếm sách EPUB trong thư viện..." : "Tìm kiếm tài liệu (ADR-061, Spec, P12.2...)"}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 transition shadow-2xs"
            />
          </div>

          {/* Category Filter Tabs (mode full only) or Section Heading (epub-only) */}
          {!isEpubOnly ? (
            <div
              role="group"
              aria-label="Bộ lọc danh mục tài liệu"
              className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl"
            >
              {[
                { id: "all", label: `Tất Cả (${docs.length})` },
                { id: "adr", label: "ADRs" },
                { id: "specs", label: "Specs" },
                { id: "gherkin", label: "Gherkin" },
                { id: "books", label: "Sách EPUB" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    selectedCategory === tab.id
                      ? "bg-amber-800 text-amber-50 shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 px-1">
              <span>Danh sách sách ({filteredDocs.length})</span>
            </div>
          )}

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-1">
            {isLoadingList ? (
              <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500 animate-pulse">
                {isEpubOnly ? "Đang nạp danh sách sách EPUB..." : "Đang nạp danh mục tài liệu..."}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 space-y-3 bg-stone-50/50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                <Book className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="font-medium text-stone-600 dark:text-stone-300">
                  {isEpubOnly ? "Chưa có sách EPUB nào trong danh mục." : "Không tìm thấy tài liệu phù hợp"}
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
              filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.relativePath === doc.relativePath;
                const isEpub = doc.relativePath.toLowerCase().endsWith(".epub") || doc.category === "books";
                return (
                  <button
                    key={doc.relativePath}
                    data-testid={`doc-item-${doc.id}`}
                    onClick={() => handleDocClick(doc)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/40"
                        : "bg-stone-50/60 dark:bg-stone-800/50 border-stone-200/80 dark:border-stone-700/80 hover:bg-stone-100/80 dark:hover:bg-stone-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isEpub && <Book className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />}
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                          {doc.title}
                        </span>
                      </div>
                      {doc.status && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${
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

                    <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                      <span className="truncate">{doc.relativePath}</span>
                      <span>•</span>
                      <span className="shrink-0">{Math.round(doc.sizeBytes / 1024)} KB</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SurfaceCard>

        {/* Right Pane: Markdown Reader or EPUB Library Overview */}
        <SurfaceCard variant="default" className="lg:col-span-8 flex flex-col min-h-[500px]">
          {isLoadingContent ? (
            <div className="flex-1 flex items-center justify-center text-xs text-stone-400 dark:text-stone-500 animate-pulse">
              Đang nạp nội dung...
            </div>
          ) : selectedDoc ? (
            <div className="space-y-4">
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
                      setActiveReaderDoc({
                        documentId: selectedDoc.relativePath,
                        title: selectedDoc.title,
                        format: 'md',
                        content: selectedDoc.content,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-xl border border-amber-300/80 dark:border-amber-700/80 transition cursor-pointer shadow-2xs"
                    title="Mở giao diện đọc toàn màn hình với công cụ trích dẫn và mục lục"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                    <span>Đọc trong Unified Reader</span>
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

              {/* Raw / Formatted Markdown Reader Content */}
              <div className="prose prose-stone dark:prose-invert max-w-none text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans whitespace-pre-wrap bg-stone-50 dark:bg-stone-850 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80 overflow-x-auto">
                {selectedDoc.content}
              </div>
            </div>
          ) : isEpubOnly ? (
            /* EPUB Library Overview / Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 space-y-5 my-auto">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="max-w-lg space-y-2">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {filteredDocs.length === 0
                    ? "Thư viện chưa có sách EPUB"
                    : "Chọn một cuốn sách để bắt đầu đọc"}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {filteredDocs.length === 0
                    ? "Thêm file EPUB đầu tiên để bắt đầu đọc sách điện tử chất lượng cao trong không gian nghiên cứu."
                    : "Nhấp vào bất kỳ cuốn sách nào từ danh sách bên trái hoặc chọn trực tiếp từ Obsidian Vault để mở giao diện đọc toàn màn hình."}
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
                  <span>Hướng dẫn vị trí lưu trữ sách EPUB:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-stone-500 dark:text-stone-400 pl-1">
                  <li>
                    Thư mục <code className="bg-stone-200/80 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-stone-800 dark:text-stone-200">docs/books</code> trong thư mục dự án.
                  </li>
                  <li>
                    Hoặc bất kỳ thư mục tài liệu nào trong <strong>Obsidian Vault</strong> đã liên kết.
                  </li>
                </ul>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 italic pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                  Sau khi thêm tệp .epub mới, hãy nhấn nút <strong>Làm mới</strong> hoặc chọn trực tiếp qua nút <strong>Chọn sách từ Vault</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* Default Documentation Overview State for mode="full" */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
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
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* EPUB Viewer Modal Overlay */}
      {activeEpubFile && (
        <FileViewer
          fileUrl={activeEpubFile.fileUrl}
          fileName={activeEpubFile.fileName}
          onClose={() => setActiveEpubFile(null)}
        />
      )}

      {/* Obsidian Vault Browser Modal */}
      {isVaultModalOpen && (
        <ObsidianVaultBrowserModal
          isOpen={isVaultModalOpen}
          onClose={() => setIsVaultModalOpen(false)}
          onSelectFile={handleVaultFileSelect}
        />
      )}

      {/* Phase 18A Unified Research Reader */}
      {activeReaderDoc && (
        <UnifiedResearchReader
          documentId={activeReaderDoc.documentId}
          title={activeReaderDoc.title}
          format={activeReaderDoc.format}
          fileUrl={activeReaderDoc.fileUrl}
          content={activeReaderDoc.content}
          onClose={() => setActiveReaderDoc(null)}
        />
      )}
    </div>
  );
}
