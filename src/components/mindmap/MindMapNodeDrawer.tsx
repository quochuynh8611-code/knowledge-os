import React, { useState, useEffect } from "react";
import { X, Check, Edit3, Tag, Hash, Bookmark, Link2, Trash2, Plus } from "lucide-react";
import { MindMapTreeNode } from "../../lib/mindmapProjection";
import { MindMapDocumentEdge } from "../../types/mindmapDocument";
import { LinkType } from "../../types";
import { validateCrossLinkMutation } from "../../lib/mindmapCrossLinks";

export interface MindMapDrawerNode extends MindMapTreeNode {
  semanticBadge?: string;
  sourceIdReference?: string;
}

export interface MindMapNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: MindMapDrawerNode | null;
  onUpdateTitle: (nodeId: string, nextTitle: string) => void;
  // Phase M5a Cross-Link Props
  crossLinks?: MindMapDocumentEdge[];
  availableNodes?: Array<{ id: string; title: string }>;
  onAddCrossLink?: (edge: { targetNodeId: string; edgeType: LinkType; label?: string }) => void;
  onRemoveCrossLink?: (edgeId: string) => void;
  treeRoot?: MindMapTreeNode | null;
}

export function MindMapNodeDrawer({
  isOpen,
  onClose,
  node,
  onUpdateTitle,
  crossLinks = [],
  availableNodes = [],
  onAddCrossLink,
  onRemoveCrossLink,
  treeRoot,
}: MindMapNodeDrawerProps) {
  const [titleInput, setTitleInput] = useState<string>("");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [edgeType, setEdgeType] = useState<LinkType>("related");
  const [labelInput, setLabelInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setTitleInput(node.title);
      setTargetNodeId("");
      setEdgeType("related");
      setLabelInput("");
      setErrorMessage(null);
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

  // Filter connected cross-links (either source or target is current node)
  const connectedLinks = crossLinks.filter(
    (e) => e.sourceNodeId === node.id || e.targetNodeId === node.id
  );

  const nodeMap = new Map(availableNodes.map((n) => [n.id, n.title]));

  const handleAddLink = () => {
    setErrorMessage(null);
    if (!targetNodeId) {
      setErrorMessage("Vui lòng chọn nút đích");
      return;
    }

    const validation = validateCrossLinkMutation(
      node.id,
      targetNodeId,
      edgeType,
      crossLinks,
      treeRoot
    );

    if (!validation.valid) {
      setErrorMessage(validation.error || "Không thể tạo liên kết");
      return;
    }

    onAddCrossLink?.({
      targetNodeId,
      edgeType,
      label: labelInput.trim() || undefined,
    });

    setTargetNodeId("");
    setLabelInput("");
  };

  return (
    <aside
      data-testid="mindmap-node-drawer"
      aria-label="Chi tiết và chỉnh sửa nút sơ đồ"
      className="absolute top-4 right-4 z-40 w-80 sm:w-96 max-h-[calc(100vh-2rem)] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 shrink-0">
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
      <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
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

        {/* Phase M5a: Cross-Links Section */}
        <div
          data-testid="mindmap-crosslinks-section"
          className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Liên kết chéo ({connectedLinks.length})</span>
            </span>
          </div>

          {/* List of existing connected links */}
          {connectedLinks.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {connectedLinks.map((edge) => {
                const isSource = edge.sourceNodeId === node.id;
                const otherNodeId = isSource ? edge.targetNodeId : edge.sourceNodeId;
                const otherTitle = nodeMap.get(otherNodeId) || otherNodeId;

                return (
                  <div
                    key={edge.id}
                    data-testid={`crosslink-item-${edge.id}`}
                    className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-100 dark:border-stone-800 text-[11px]"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200 truncate">
                        <span className="text-stone-400 font-mono text-[10px]">
                          {isSource ? "➜" : "⬅"}
                        </span>
                        <span className="truncate">{otherTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-mono">
                          {edge.edgeType}
                        </span>
                      </div>
                      {edge.label && (
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 italic truncate">
                          {edge.label}
                        </div>
                      )}
                    </div>
                    {onRemoveCrossLink && (
                      <button
                        type="button"
                        data-testid={`crosslink-remove-btn-${edge.id}`}
                        onClick={() => onRemoveCrossLink(edge.id)}
                        aria-label={`Xóa liên kết ${edge.id}`}
                        className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Form to add a new cross-link */}
          <div className="p-2.5 bg-stone-50/80 dark:bg-stone-800/40 rounded-xl border border-stone-200/60 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
              Thêm liên kết mới
            </span>

            {/* Target Select */}
            <div className="space-y-1">
              <label
                htmlFor="crosslink-target-select-id"
                className="text-[10px] text-stone-600 dark:text-stone-400 block"
              >
                Nút đích:
              </label>
              <select
                id="crosslink-target-select-id"
                data-testid="crosslink-target-select"
                value={targetNodeId}
                onChange={(e) => setTargetNodeId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Chọn nút đích --</option>
                {availableNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} ({n.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Edge Type & Label */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="crosslink-type-select-id"
                  className="text-[10px] text-stone-600 dark:text-stone-400 block"
                >
                  Loại quan hệ:
                </label>
                <select
                  id="crosslink-type-select-id"
                  data-testid="crosslink-type-select"
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as LinkType)}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="related">Liên quan</option>
                  <option value="prerequisite">Tiên quyết</option>
                  <option value="advanced">Nâng cao</option>
                  <option value="contradicts">Đối chiếu</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="crosslink-label-input-id"
                  className="text-[10px] text-stone-600 dark:text-stone-400 block"
                >
                  Nhãn (tùy chọn):
                </label>
                <input
                  id="crosslink-label-input-id"
                  data-testid="crosslink-label-input"
                  type="text"
                  maxLength={60}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Ví dụ: Quan hệ..."
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Validation Error Banner */}
            {errorMessage && (
              <div
                data-testid="crosslink-error-message"
                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-600 dark:rose-400 text-[10px] font-medium"
              >
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              data-testid="crosslink-add-btn"
              onClick={handleAddLink}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm liên kết</span>
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
