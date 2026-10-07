import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useData } from "../../context/DataContext";
import {
  projectToMindMapTree,
  exportMindMapToMarkdown,
  MindMapLayoutMode,
  MindMapTreeNode,
} from "../../lib/mindmapProjection";
import {
  loadMindMapViewState,
  saveMindMapViewState,
} from "../../lib/mindmapStorage";
import { MindMapTreeCanvas } from "./MindMapTreeCanvas";
import {
  Network,
  Copy,
  Check,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  AlertTriangle,
  BookOpen,
  Info,
  Share2,
} from "lucide-react";

export function MindMapView() {
  const { topics, notes, resources, selectedTopicId, openTopicDetail } = useData();

  const [layoutMode, setLayoutMode] =
    useState<MindMapLayoutMode>("tree_horizontal");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [showCrossLinks, setShowCrossLinks] = useState<boolean>(false);
  const [internalTopicId, setInternalTopicId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Active topic ID: prefer selectedTopicId if available, fallback to internal or first active topic
  const activeRootTopicId = useMemo(() => {
    if (selectedTopicId && topics.some((t) => t.id === selectedTopicId)) {
      return selectedTopicId;
    }
    if (internalTopicId && topics.some((t) => t.id === internalTopicId)) {
      return internalTopicId;
    }
    const firstActive = topics.find((t) => t.visibility !== "hidden");
    return firstActive?.id || topics[0]?.id || "";
  }, [selectedTopicId, internalTopicId, topics]);

  // Topic Map for fast metadata lookup
  const topicMap = useMemo(() => {
    return new Map(topics.map((t) => [t.id, t]));
  }, [topics]);

  // Load persisted view state when active topic changes
  useEffect(() => {
    if (!activeRootTopicId) {
      setCollapsedNodeIds(new Set());
      setLayoutMode("tree_horizontal");
      return;
    }
    const savedState = loadMindMapViewState(activeRootTopicId);
    setLayoutMode(savedState.layoutMode);
    setCollapsedNodeIds(new Set(savedState.collapsedNodeIds));
  }, [activeRootTopicId]);

  // Derive mind map projection
  const projection = useMemo(() => {
    if (!activeRootTopicId) return null;
    return projectToMindMapTree(
      { topics, notes, resources },
      activeRootTopicId,
      {
        layoutMode,
        maxDepth: 3,
        maxNodesLimit: 80,
      }
    );
  }, [topics, notes, resources, activeRootTopicId, layoutMode]);

  // Collect all active node IDs in tree for stale ID sanitization
  const validNodeIds = useMemo(() => {
    if (!projection) return new Set<string>();
    const ids = new Set<string>();
    const traverse = (node: MindMapTreeNode) => {
      ids.add(node.id);
      for (const child of node.children) {
        traverse(child);
      }
    };
    traverse(projection.tree);
    return ids;
  }, [projection]);

  // Toggle layout mode and persist per topic
  const handleSetLayoutMode = useCallback(
    (newMode: MindMapLayoutMode) => {
      setLayoutMode(newMode);
      if (activeRootTopicId) {
        saveMindMapViewState(
          {
            version: 1,
            topicId: activeRootTopicId,
            layoutMode: newMode,
            collapsedNodeIds: Array.from(collapsedNodeIds),
            updatedAt: new Date().toISOString(),
          },
          validNodeIds
        );
      }
    },
    [activeRootTopicId, collapsedNodeIds, validNodeIds]
  );

  // Toggle branch collapse/expand state and persist per topic
  const handleToggleCollapse = useCallback(
    (nodeId: string) => {
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }

        if (activeRootTopicId) {
          saveMindMapViewState(
            {
              version: 1,
              topicId: activeRootTopicId,
              layoutMode,
              collapsedNodeIds: Array.from(next),
              updatedAt: new Date().toISOString(),
            },
            validNodeIds
          );
        }

        return next;
      });
    },
    [activeRootTopicId, layoutMode, validNodeIds]
  );

  // Copy Markdown outline to clipboard
  const handleCopyMarkdown = useCallback(async () => {
    if (!projection) return;
    const md = exportMindMapToMarkdown(projection, topicMap);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement("textarea");
      textArea.value = md;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [projection, topicMap]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-xl">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              Sơ Đồ Tư Duy (Mind Map)
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full">
                Derived Read-Model
              </span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Phân cấp tri thức tự động từ đồ thị chủ đề và ghi chú liên kết
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Topic Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5">
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <select
              aria-label="Chọn chủ đề gốc"
              value={activeRootTopicId}
              onChange={(e) => setInternalTopicId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-hidden cursor-pointer max-w-[200px] truncate"
            >
              {topics
                .filter((t) => t.visibility !== "hidden")
                .map((topic) => (
                  <option
                    key={topic.id}
                    value={topic.id}
                    className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                  >
                    {topic.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              onClick={() => handleSetLayoutMode("tree_horizontal")}
              title="Cây nằm ngang"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                layoutMode === "tree_horizontal"
                  ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ngang</span>
            </button>
            <button
              onClick={() => handleSetLayoutMode("tree_vertical")}
              title="Cây thẳng đứng"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                layoutMode === "tree_vertical"
                  ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dọc</span>
            </button>
          </div>

          {/* Cross-Links Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowCrossLinks((prev) => !prev)}
            title="Bật/tắt hiển thị liên kết chéo trên sơ đồ"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              showCrossLinks
                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {showCrossLinks ? "Ẩn liên kết chéo" : "Hiện liên kết chéo"}
            </span>
            <span className="sm:hidden">
              {showCrossLinks ? "Ẩn chéo" : "Hiện chéo"}
            </span>
            {projection?.crossEdges && projection.crossEdges.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono">
                {projection.crossEdges.length}
              </span>
            )}
          </button>

          {/* Copy Markdown Outline CTA */}
          <button
            onClick={handleCopyMarkdown}
            disabled={!projection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Xuất Outline Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Traversal Signals & Info Banner */}
      {projection && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Gốc: {projection.rootTitle}
            </span>
            <span>•</span>
            <span>Tổng: {projection.totalNodesCount} nút</span>
            <span>•</span>
            <span>Độ sâu: {projection.maxDepthReached} cấp</span>
            {collapsedNodeIds.size > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {collapsedNodeIds.size} nhánh đang thu gọn
                </span>
              </>
            )}
            {projection.crossEdges.length > 0 && (
              <>
                <span>•</span>
                <span className="text-stone-600 dark:text-stone-300 font-medium">
                  {projection.crossEdges.length} liên kết chéo
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {projection.hasCyclesDetected && (
              <span
                title="Đồ thị có chu trình khép kín; các nhánh lặp đã được ngắt để giữ cây đơn cha an toàn."
                className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Đã ngắt chu trình (Acyclic)</span>
              </span>
            )}
            {projection.hasTruncatedBranches && (
              <span
                title="Đã đạt giới hạn độ sâu hoặc số nút tối đa của một sơ đồ tư duy."
                className="flex items-center gap-1 text-stone-400 dark:text-stone-500"
              >
                <span>[Nhánh biên đã được giới hạn]</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Stage */}
      {projection ? (
        <MindMapTreeCanvas
          tree={projection.tree}
          layoutMode={layoutMode}
          collapsedNodeIds={collapsedNodeIds}
          crossEdges={projection.crossEdges}
          cycleAnnotations={projection.cycleAnnotations}
          showCrossLinks={showCrossLinks}
          onToggleCollapse={handleToggleCollapse}
          onSelectTopic={(topicId) => openTopicDetail(topicId)}
        />
      ) : (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <Network className="w-8 h-8 mx-auto text-stone-400" />
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Không thể sinh sơ đồ tư duy
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Chủ đề được chọn chưa có dữ liệu hoặc không tồn tại trong cây tri thức.
          </p>
        </div>
      )}
    </div>
  );
}
