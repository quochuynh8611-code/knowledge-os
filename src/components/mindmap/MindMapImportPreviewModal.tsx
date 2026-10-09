import React, { useState, useMemo, useCallback } from "react";
import { parseMindMapMarkdownOutline } from "../../lib/mindmapImportParser";
import { convertImportAstToMindMapTreeNode } from "../../lib/mindmapImportPreviewAdapter";
import {
  ingestMindMapAst,
  DedupeStrategy,
  IngestionPort,
} from "../../lib/mindmapImportIngestion";
import { MindMapTreeCanvas } from "./MindMapTreeCanvas";
import { MindMapLayoutMode } from "../../lib/mindmapProjection";
import { useData } from "../../context/DataContext";
import {
  X,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Trash2,
  FileText,
  Info,
  FolderTree,
  DownloadCloud,
  Check,
  Loader2,
} from "lucide-react";

export interface MindMapImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMarkdown?: string;
}

const SAMPLE_MARKDOWN = `# 🗺️ Sơ Đồ Tư Duy: Bát Chánh Đạo
> Nguồn: Mẫu xem trước • Sandbox RAM

- 📚 **[Chánh Kiến](#/topics/chanh-kien)** \`[Tiến độ: 100%]\`
  - [tiên quyết] 📚 **[Chánh Tư Duy](#/topics/chanh-tu-duy)** \`[Tiến độ: 75%]\`
    - [nâng cao] 📚 **[Chánh Ngữ](#/topics/chanh-ngu)**
    - [nâng cao] 📚 **[Chánh Nghiệp](#/topics/chanh-nghiep)**
  - [liên quan] 📝 Ghi chú về Tứ Diệu Đế
  - [liên quan] 🔗 Tài liệu Kinh tạng Pāli
`;

export function MindMapImportPreviewModal({
  isOpen,
  onClose,
  initialMarkdown = "",
}: MindMapImportPreviewModalProps) {
  let dataContext: any = null;
  try {
    dataContext = useData();
  } catch {
    // Graceful fallback when rendered outside DataProvider in standalone preview tests
  }

  const categories = dataContext?.categories || [];
  const topics = dataContext?.topics || [];

  const [markdownText, setMarkdownText] = useState<string>(initialMarkdown);
  const [layoutMode, setLayoutMode] = useState<MindMapLayoutMode>("tree_horizontal");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Controlled Ingestion states (Phase I3)
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [dedupeStrategy, setDedupeStrategy] = useState<DedupeStrategy>("skip-and-reuse");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);

  // Parse markdown into AST
  const parseResult = useMemo(() => {
    return parseMindMapMarkdownOutline(markdownText, { tabSize: 2 });
  }, [markdownText]);

  // Adapt AST root into MindMapTreeNode
  const previewTree = useMemo(() => {
    if (!parseResult.root) return null;
    return convertImportAstToMindMapTreeNode(parseResult.root, "general");
  }, [parseResult.root]);

  const targetCategory = useMemo(() => {
    return categories.find((c) => c.id === targetCategoryId);
  }, [categories, targetCategoryId]);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleLoadSample = useCallback(() => {
    setMarkdownText(SAMPLE_MARKDOWN);
    setCollapsedNodeIds(new Set());
    setIngestionError(null);
  }, []);

  const handleClear = useCallback(() => {
    setMarkdownText("");
    setCollapsedNodeIds(new Set());
    setIngestionError(null);
  }, []);

  const handleExecuteIngestion = useCallback(async () => {
    if (!parseResult.root || !targetCategoryId || !dataContext) {
      return;
    }

    setIsIngesting(true);
    setIngestionError(null);

    const port: IngestionPort = {
      getExistingTopics: () => dataContext.topics || [],
      createTopic: (topicData) => dataContext.addTopic(topicData),
      deleteTopic: (id) => dataContext.deleteTopic(id),
      createKnowledgeLink: (linkData) => dataContext.addKnowledgeLink(linkData),
    };

    try {
      await ingestMindMapAst(
        parseResult.root,
        {
          targetCategoryId,
          targetCategoryType: targetCategory?.type || "phat_hoc",
          dedupeStrategy,
        },
        port
      );

      setIsIngesting(false);
      setIsConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setIsIngesting(false);
      setIngestionError(err.message || "Có lỗi xảy ra trong quá trình nhập sơ đồ");
    }
  }, [
    parseResult.root,
    targetCategoryId,
    targetCategory,
    dedupeStrategy,
    dataContext,
    onClose,
  ]);

  if (!isOpen) return null;

  const totalNodesCount = parseResult.totalNodeCount;
  const isImportEnabled =
    Boolean(targetCategoryId) &&
    Boolean(parseResult.root) &&
    parseResult.errors.length === 0 &&
    !isIngesting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="import-preview-title"
                className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100"
              >
                Xem Trước Dàn Ý Sơ Đồ Tư Duy
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                📌 Chế độ xem trước (Sandbox) • Dữ liệu chỉ hiển thị tạm thời trên bộ nhớ RAM
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-import-preview-header"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split-View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Markdown Input & Ingestion Controls */}
          <div className="w-full md:w-5/12 flex flex-col border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4 overflow-y-auto">
            {/* Target Category Selection (Phase I3) */}
            <div className="mb-3 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Danh Mục Đích (Bắt buộc để nhập):</span>
              </div>
              <select
                data-testid="import-target-category-select"
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">-- Chọn danh mục đích --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Markdown Input Area */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Nhập Dàn Ý Markdown:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="btn-load-sample"
                  onClick={handleLoadSample}
                  className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition cursor-pointer"
                >
                  Dán Mẫu
                </button>
                <button
                  type="button"
                  data-testid="btn-clear-markdown"
                  onClick={handleClear}
                  disabled={!markdownText}
                  title="Xóa nội dung"
                  className="p-1 text-stone-400 hover:text-rose-500 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              data-testid="import-markdown-textarea"
              value={markdownText}
              onChange={(e) => {
                setMarkdownText(e.target.value);
                setIngestionError(null);
              }}
              placeholder={`# Nhập tiêu đề gốc\n- [tiên quyết] 📚 Chủ đề con 1\n  - [nâng cao] 📚 Chủ đề con 2\n- 📝 Ghi chú minh họa`}
              className="flex-1 min-h-[160px] md:min-h-[180px] p-3 font-mono text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition resize-none"
            />

            {/* Error banner if ingestion failed */}
            {ingestionError && (
              <div className="mt-2.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{ingestionError}</span>
              </div>
            )}

            {/* Diagnostics Panel */}
            <div
              data-testid="import-diagnostics-panel"
              className="mt-3 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Chẩn Đoán Cú Pháp
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    parseResult.errors.length > 0
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                      : parseResult.warnings.length > 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      : parseResult.root
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  {parseResult.errors.length > 0 ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Có lỗi</span>
                    </>
                  ) : parseResult.warnings.length > 0 ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Có cảnh báo</span>
                    </>
                  ) : parseResult.root ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Hợp lệ</span>
                    </>
                  ) : (
                    <span>Chờ nhập</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                <div>
                  Tổng số nodes:{" "}
                  <span className="font-semibold text-stone-900 dark:text-stone-200">
                    {parseResult.totalNodeCount}
                  </span>
                </div>
                <div>
                  Độ sâu tối đa:{" "}
                  <span className="font-semibold text-stone-900 dark:text-stone-200">
                    {parseResult.maxDepth}
                  </span>
                </div>
              </div>

              {parseResult.warnings.length > 0 && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1">
                  {parseResult.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-amber-800 dark:text-amber-400 text-[11px]"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Live Tree Canvas */}
          <div className="w-full md:w-7/12 flex flex-col bg-stone-100/60 dark:bg-stone-900/40 relative overflow-hidden">
            {/* Canvas Header Controls */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/70 dark:bg-stone-900/70 border-b border-stone-200 dark:border-stone-800 backdrop-blur-xs z-10">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Khung Nhìn Sơ Đồ Xem Trước
              </span>

              {/* Layout Mode Switcher */}
              <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  data-testid="btn-preview-layout-horizontal"
                  onClick={() => setLayoutMode("tree_horizontal")}
                  title="Cây nằm ngang"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    layoutMode === "tree_horizontal"
                      ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                  }`}
                >
                  <AlignHorizontalDistributeCenter className="w-3 h-3" />
                  <span>Ngang</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-preview-layout-vertical"
                  onClick={() => setLayoutMode("tree_vertical")}
                  title="Cây thẳng đứng"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    layoutMode === "tree_vertical"
                      ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                  }`}
                >
                  <AlignVerticalDistributeCenter className="w-3 h-3" />
                  <span>Dọc</span>
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 relative overflow-hidden min-h-[350px]">
              {previewTree ? (
                <MindMapTreeCanvas
                  tree={previewTree}
                  layoutMode={layoutMode}
                  collapsedNodeIds={collapsedNodeIds}
                  onToggleCollapse={handleToggleCollapse}
                  // Explicitly prevent navigation side-effects
                  onSelectTopic={undefined}
                />
              ) : (
                <div
                  data-testid="import-preview-empty-state"
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-stone-400 dark:text-stone-500"
                >
                  <FileText className="w-10 h-10 mb-2 opacity-50 stroke-1" />
                  <p className="text-sm font-medium">
                    Dán dàn ý Markdown để xem trước sơ đồ
                  </p>
                  <p className="text-xs mt-1 max-w-sm opacity-75">
                    Hỗ trợ tiêu đề `#`, gạch đầu dòng `-`, `*`, `+`, nhãn quan hệ `[tiên quyết]`, `[nâng cao]`, và liên kết Markdown.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <Info className="w-3.5 h-3.5" />
            <span>Chế độ Sandbox: chỉ ghi dữ liệu khi bạn bấm nút Nhập và xác nhận.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-close-import-preview-footer"
              onClick={onClose}
              disabled={isIngesting}
              className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Đóng
            </button>

            {/* Controlled Ingestion CTA Button (Phase I3) */}
            <button
              type="button"
              data-testid="btn-trigger-import"
              disabled={!isImportEnabled}
              onClick={() => setIsConfirmOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white disabled:text-stone-400 dark:disabled:text-stone-600 rounded-xl text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Nhập vào CSDL</span>
            </button>
          </div>
        </div>

        {/* Confirmation Dialog Overlay (Phase I3) */}
        {isConfirmOpen && (
          <div
            data-testid="import-confirm-dialog"
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl">
                  <DownloadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Xác nhận nhập sơ đồ vào CSDL
                </h3>
              </div>

              <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                <p>
                  Bạn chuẩn bị nhập cấu trúc sơ đồ tư duy này vào cơ sở tri thức chính thức:
                </p>
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1.5 text-xs font-medium">
                  <div className="flex justify-between">
                    <span>Quy mô dàn ý:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {totalNodesCount} chủ đề
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Danh mục đích:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {targetCategory?.name || "Chưa chọn"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Xử lý trùng lặp:</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {dedupeStrategy === "skip-and-reuse"
                        ? "Tái sử dụng chủ đề đã có"
                        : dedupeStrategy === "create-with-suffix"
                        ? "Tạo mới kèm hậu tố"
                        : "Hủy nếu trùng lặp"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                  * Dữ liệu sẽ được lưu nguyên tử và cập nhật trực tiếp vào danh sách chủ đề của bạn.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  data-testid="btn-cancel-import-confirm"
                  disabled={isIngesting}
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-import-confirm"
                  disabled={isIngesting}
                  onClick={handleExecuteIngestion}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang nhập...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận nhập</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
