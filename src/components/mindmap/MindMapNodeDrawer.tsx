import React, { useState, useEffect } from "react";
import { X, Check, Edit3, Tag, Hash, Bookmark } from "lucide-react";
import { MindMapTreeNode } from "../../lib/mindmapProjection";

export interface MindMapDrawerNode extends MindMapTreeNode {
  semanticBadge?: string;
  sourceIdReference?: string;
}

export interface MindMapNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: MindMapDrawerNode | null;
  onUpdateTitle: (nodeId: string, nextTitle: string) => void;
}

export function MindMapNodeDrawer({
  isOpen,
  onClose,
  node,
  onUpdateTitle,
}: MindMapNodeDrawerProps) {
  const [titleInput, setTitleInput] = useState<string>("");

  useEffect(() => {
    if (node) {
      setTitleInput(node.title);
    }
  }, [node?.id, node?.title]);

  if (!isOpen || !node) {
    return null;
  }

  const handleApply = () => {
    const trimmed = titleInput.trim();
    if (!trimmed) return;
    if (trimmed !== node.title) {
      onUpdateTitle(node.id, trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const isChanged = titleInput.trim() !== node.title;

  return (
    <aside
      data-testid="mindmap-node-drawer"
      aria-label="Chi tiết và chỉnh sửa nút sơ đồ"
      className="absolute top-4 right-4 z-40 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40">
        <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200">
          <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Chi Tiết Nút
          </h3>
        </div>
        <button
          type="button"
          data-testid="btn-close-node-drawer"
          onClick={onClose}
          aria-label="Đóng bảng chi tiết"
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 text-xs">
        {/* Title Editor */}
        <div className="space-y-1.5">
          <label
            htmlFor="drawer-node-title-input"
            className="font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between"
          >
            <span>Tiêu đề nút:</span>
            {isChanged && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">
                Chưa áp dụng
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="drawer-node-title-input"
              type="text"
              data-testid="input-drawer-node-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              placeholder="Nhập tiêu đề nút..."
            />
            <button
              type="button"
              data-testid="btn-drawer-apply-title"
              onClick={handleApply}
              title="Áp dụng thay đổi tiêu đề"
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Áp dụng</span>
            </button>
          </div>
        </div>

        {/* Read-Only Metadata */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
            Thông tin hệ thống (Read-Only)
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
              <span className="text-stone-400 dark:text-stone-500 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Loại nút</span>
              </span>
              <span
                data-testid="drawer-node-type"
                className="font-mono font-semibold text-stone-800 dark:text-stone-200 capitalize block"
              >
                {node.type}
              </span>
            </div>

            <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl space-y-1">
              <span className="text-stone-400 dark:text-stone-500 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Mã nút (ID)</span>
              </span>
              <span
                data-testid="drawer-node-id"
                title={node.id}
                className="font-mono text-stone-700 dark:text-stone-300 truncate block"
              >
                {node.id}
              </span>
            </div>
          </div>

          {node.semanticBadge && (
            <div className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl text-[11px]">
              <span className="text-stone-400 dark:text-stone-500 flex items-center gap-1">
                <Bookmark className="w-3 h-3" />
                <span>Nhãn ngữ nghĩa:</span>
              </span>
              <span
                data-testid="drawer-node-badge"
                className="font-semibold text-amber-700 dark:text-amber-300"
              >
                {node.semanticBadge}
              </span>
            </div>
          )}

          {node.sourceIdReference && (
            <div className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl text-[11px]">
              <span className="text-stone-400 dark:text-stone-500">
                Nguồn tham chiếu:
              </span>
              <span
                data-testid="drawer-node-source-ref"
                className="font-mono text-stone-600 dark:text-stone-300 truncate max-w-[150px]"
              >
                {node.sourceIdReference}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
