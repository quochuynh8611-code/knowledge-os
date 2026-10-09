import React, { useState, useMemo, useCallback } from "react";
import { parseMindMapMarkdownOutline } from "../../lib/mindmapImportParser";
import { convertImportAstToMindMapTreeNode } from "../../lib/mindmapImportPreviewAdapter";
import { MindMapTreeCanvas } from "./MindMapTreeCanvas";
import { MindMapLayoutMode } from "../../lib/mindmapProjection";
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
  const [markdownText, setMarkdownText] = useState<string>(initialMarkdown);
  const [layoutMode, setLayoutMode] = useState<MindMapLayoutMode>("tree_horizontal");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Parse markdown into AST
  const parseResult = useMemo(() => {
    return parseMindMapMarkdownOutline(markdownText, { tabSize: 2 });
  }, [markdownText]);

  // Adapt AST root into MindMapTreeNode
  const previewTree = useMemo(() => {
    if (!parseResult.root) return null;
    return convertImportAstToMindMapTreeNode(parseResult.root, "general");
  }, [parseResult.root]);

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
  }, []);

  const handleClear = useCallback(() => {
    setMarkdownText("");
    setCollapsedNodeIds(new Set());
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden">
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
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split-View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Textarea Editor & Diagnostics */}
          <div className="w-full md:w-5/12 flex flex-col border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4 overflow-y-auto">
            {/* Editor Toolbar */}
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
                  className="p-1 text-stone-400 hover:text-rose-500 rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Xóa nội dung"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              data-testid="import-markdown-textarea"
              value={markdownText}
              onChange={(e) => setMarkdownText(e.target.value)}
              placeholder={`# Tiêu đề sơ đồ\n- 📚 Chủ đề gốc\n  - [tiên quyết] 📚 Nhánh con 1\n  - [liên quan] 📚 Nhánh con 2`}
              rows={12}
              className="w-full flex-1 min-h-[160px] p-3 font-mono text-xs text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 resize-none"
            />

            {/* Diagnostics Summary Box */}
            <div
              data-testid="import-diagnostics-panel"
              className="mt-3 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-semibold text-stone-800 dark:text-stone-200">
                <span>Chẩn Đoán Cú Pháp:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    parseResult.status === "SUCCESS"
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400"
                      : parseResult.status === "WARNING"
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                  }`}
                >
                  {parseResult.status === "SUCCESS"
                    ? "Hợp lệ"
                    : parseResult.status === "WARNING"
                    ? "Có cảnh báo"
                    : "Chờ dữ liệu"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                <div>
                  Tổng số nodes:{" "}
                  <strong className="text-stone-900 dark:text-stone-100">
                    {parseResult.totalNodeCount}
                  </strong>
                </div>
                <div>
                  Độ sâu tối đa:{" "}
                  <strong className="text-stone-900 dark:text-stone-100">
                    {parseResult.maxDepth}
                  </strong>
                </div>
              </div>

              {/* Warning Messages */}
              {parseResult.warnings.length > 0 && (
                <div className="pt-2 border-t border-amber-100 dark:border-amber-950/50 space-y-1">
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
            <span>Chế độ Sandbox: không lưu hoặc sửa đổi cơ sở tri thức thật.</span>
          </div>

          <button
            type="button"
            data-testid="btn-close-import-preview-footer"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
