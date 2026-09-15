import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Search,
  RotateCcw,
  FileText,
  ShieldCheck,
  Tag,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Book,
  FolderOpen,
  Info,
} from "lucide-react";
import { FileViewer } from "./FileViewer";
import { ObsidianVaultBrowserModal } from "../modals/ObsidianVaultBrowserModal";

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
      fetchDocContent(filePath);
    }
  }, [fetchDocContent]);

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-amber-300" />
            <span className="text-xs uppercase font-mono tracking-widest text-amber-300 font-bold">
              {isEpubOnly ? "Nguồn: Obsidian Vault & Kho lưu trữ EPUB" : "Architecture & Specifications Explorer"}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            {isEpubOnly ? "Thư Viện Sách" : "Tài Liệu Kiến Trúc & Đặc Tả Hệ Thống"}
          </h1>
          <p className="text-xs text-stone-300 max-w-2xl mt-1">
            {isEpubOnly
              ? "Đọc và quản lý sách EPUB trong kho tài liệu của bạn."
              : "Tra cứu trực tiếp quyết định kiến trúc (ADRs), đặc tả kỹ thuật (Specs), kịch bản kiểm thử (Gherkin) và sổ tay vận hành hệ thống."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEpubOnly && (
            <button
              onClick={() => setIsVaultModalOpen(true)}
              aria-label="Chọn sách từ Vault"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Chọn sách từ Vault</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            aria-label="Làm mới"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800/80 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700/80 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Split-Pane Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px]">
        {/* Left Pane: Directory & Search */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEpubOnly ? "Tìm kiếm sách EPUB trong thư viện..." : "Tìm kiếm tài liệu (ADR-061, Spec, P12.2...)"}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
            />
          </div>

          {/* Category Filter Tabs (mode full only) or Section Heading (epub-only) */}
          {!isEpubOnly ? (
            <div
              role="group"
              aria-label="Bộ lọc danh mục tài liệu"
              className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-xl"
            >
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-stone-800 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Tất Cả ({docs.length})
              </button>
              <button
                onClick={() => setSelectedCategory("adr")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedCategory === "adr"
                    ? "bg-amber-800 text-white shadow-xs"
                    : "text-stone-600 hover:text-amber-900"
                }`}
              >
                ADRs
              </button>
              <button
                onClick={() => setSelectedCategory("specs")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedCategory === "specs"
                    ? "bg-indigo-800 text-white shadow-xs"
                    : "text-stone-600 hover:text-indigo-900"
                }`}
              >
                Specs
              </button>
              <button
                onClick={() => setSelectedCategory("gherkin")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedCategory === "gherkin"
                    ? "bg-teal-800 text-white shadow-xs"
                    : "text-stone-600 hover:text-teal-900"
                }`}
              >
                Gherkin
              </button>
              <button
                onClick={() => setSelectedCategory("books")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  selectedCategory === "books"
                    ? "bg-amber-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-amber-900"
                }`}
              >
                Sách EPUB
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 px-1">
              <span>Danh sách sách ({filteredDocs.length})</span>
            </div>
          )}

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-1">
            {isLoadingList ? (
              <div className="p-8 text-center text-xs text-stone-400 animate-pulse">
                {isEpubOnly ? "Đang nạp danh sách sách EPUB..." : "Đang nạp danh mục tài liệu..."}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 space-y-3 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                <Book className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-medium text-stone-600">
                  {isEpubOnly ? "Chưa có sách EPUB nào trong danh mục." : "Không tìm thấy tài liệu phù hợp"}
                </p>
                {isEpubOnly && (
                  <button
                    onClick={() => setIsVaultModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[11px] font-semibold transition cursor-pointer border border-stone-300"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-700" />
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
                        ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/40"
                        : "bg-stone-50/60 border-stone-200/80 hover:bg-stone-100/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isEpub && <Book className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                        <span className="text-xs font-bold text-stone-900 line-clamp-2">
                          {doc.title}
                        </span>
                      </div>
                      {doc.status && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${
                            doc.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : doc.status === "PROPOSED"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : doc.status === "EPUB"
                              ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                              : "bg-stone-100 text-stone-700 border border-stone-200"
                          }`}
                        >
                          {doc.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                      <span>{doc.relativePath}</span>
                      <span>•</span>
                      <span>{Math.round(doc.sizeBytes / 1024)} KB</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Markdown Reader or EPUB Library Overview */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs flex flex-col min-h-[500px]">
          {isLoadingContent ? (
            <div className="flex-1 flex items-center justify-center text-xs text-stone-400 animate-pulse">
              Đang nạp nội dung...
            </div>
          ) : selectedDoc ? (
            <div className="space-y-4">
              {/* Document Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                    <span className="uppercase font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                      {selectedDoc.category}
                    </span>
                    <span>{selectedDoc.relativePath}</span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {selectedDoc.title}
                  </h2>
                </div>

                <button
                  onClick={handleCopyContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl border border-stone-300 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600" />
                      <span>Sao chép Markdown</span>
                    </>
                  )}
                </button>
              </div>

              {/* Raw / Formatted Markdown Reader Content */}
              <div className="prose prose-stone max-w-none text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-wrap bg-stone-50 p-4 rounded-xl border border-stone-200/80 overflow-x-auto">
                {selectedDoc.content}
              </div>
            </div>
          ) : isEpubOnly ? (
            /* EPUB Library Overview / Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-10 space-y-5 my-auto">
              <div className="w-16 h-16 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="max-w-lg space-y-2">
                <h3 className="text-lg font-bold text-stone-900">
                  {filteredDocs.length === 0
                    ? "Thư viện chưa có sách EPUB"
                    : "Chọn một cuốn sách để bắt đầu đọc"}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-300 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Helpful storage guidance */}
              <div className="w-full max-w-lg bg-stone-50 border border-stone-200 rounded-xl p-4 text-left space-y-2 text-[11px] text-stone-600">
                <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Hướng dẫn vị trí lưu trữ sách EPUB:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-stone-500 pl-1">
                  <li>
                    Thư mục <code className="bg-stone-200/80 px-1 py-0.5 rounded font-mono text-stone-800">docs/books</code> trong thư mục dự án.
                  </li>
                  <li>
                    Hoặc bất kỳ thư mục tài liệu nào trong <strong>Obsidian Vault</strong> đã liên kết.
                  </li>
                </ul>
                <p className="text-[10px] text-stone-400 italic pt-1 border-t border-stone-200/60">
                  Sau khi thêm tệp .epub mới, hãy nhấn nút <strong>Làm mới</strong> hoặc chọn trực tiếp qua nút <strong>Chọn sách từ Vault</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* Default Documentation Overview State for mode="full" */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
              <div className="w-14 h-14 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-stone-900">
                  Trung Tâm Tra Cứu Tài Liệu Kiến Trúc
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Vui lòng chọn một tài liệu (ADR, Kịch bản Gherkin, hoặc Đặc tả kỹ thuật) từ danh mục bên trái để đọc chi tiết toàn văn.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-stone-600">
                <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 font-mono">
                  {docs.length} Tài liệu trên đĩa
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-mono">
                  Tự động đồng bộ thời gian thực
                </span>
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
}
