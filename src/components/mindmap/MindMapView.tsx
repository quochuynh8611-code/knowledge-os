import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useData } from "../../context/DataContext";
import {
  projectToMindMapTree,
  exportMindMapToMarkdown,
  getSemanticEdgeLabel,
  MindMapLayoutMode,
  MindMapTreeNode,
} from "../../lib/mindmapProjection";
import {
  exportMindMapToSvg,
  getMindMapExportFilename,
  rasterizeSvgToPng,
} from "../../lib/mindmapExport";
import { LinkType } from "../../types";
import {
  loadMindMapViewState,
  saveMindMapViewState,
} from "../../lib/mindmapStorage";
import { MindMapTreeCanvas } from "./MindMapTreeCanvas";
import { MindMapImportPreviewModal } from "./MindMapImportPreviewModal";
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
  Download,
  FileCode,
} from "lucide-react";

export type MindMapEdgeTypeFilter = "all" | LinkType;

const ORDERED_EDGE_TYPES: LinkType[] = [
  "prerequisite",
  "advanced",
  "related",
  "contradicts",
];

function findAncestorIds(root: MindMapTreeNode, targetId: string): string[] | null {
  if (root.id === targetId) return [];
  for (const child of root.children) {
    if (child.id === targetId) return [root.id];
    const sub = findAncestorIds(child, targetId);
    if (sub) return [root.id, ...sub];
  }
  return null;
}

export function MindMapView() {
  const { topics, notes, resources, selectedTopicId, openTopicDetail } = useData();

  const [layoutMode, setLayoutMode] =
    useState<MindMapLayoutMode>("tree_horizontal");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [showCrossLinks, setShowCrossLinks] = useState<boolean>(false);
  const [activeEdgeTypeFilter, setActiveEdgeTypeFilter] =
    useState<MindMapEdgeTypeFilter>("all");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [internalTopicId, setInternalTopicId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active topic ID: prefer user-selected internalTopicId if set, fallback to selectedTopicId or first active topic
  const activeRootTopicId = useMemo(() => {
    if (internalTopicId && topics.some((t) => t.id === internalTopicId)) {
      return internalTopicId;
    }
    if (selectedTopicId && topics.some((t) => t.id === selectedTopicId)) {
      return selectedTopicId;
    }
    const firstActive = topics.find((t) => t.visibility !== "hidden");
    return firstActive?.id || topics[0]?.id || "";
  }, [internalTopicId, selectedTopicId, topics]);

  // Topic Map for fast metadata lookup
  const topicMap = useMemo(() => {
    return new Map(topics.map((t) => [t.id, t]));
  }, [topics]);

  // Load persisted view state and reset ephemeral filter when active topic changes
  useEffect(() => {
    setActiveEdgeTypeFilter("all");
    if (!activeRootTopicId) {
      setCollapsedNodeIds(new Set());
      setLayoutMode("tree_horizontal");
      setShowCrossLinks(false);
      return;
    }
    const savedState = loadMindMapViewState(activeRootTopicId);
    setLayoutMode(savedState.layoutMode);
    setCollapsedNodeIds(new Set(savedState.collapsedNodeIds));
    setShowCrossLinks(Boolean(savedState.showCrossLinks));
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

  // Compute counts for each LinkType present in projection.crossEdges
  const edgeTypeCounts = useMemo(() => {
    if (!projection?.crossEdges) return new Map<LinkType, number>();
    const counts = new Map<LinkType, number>();
    for (const edge of projection.crossEdges) {
      const type = edge.type as LinkType;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return counts;
  }, [projection?.crossEdges]);

  // Filter cross edges based on active semantic edge type filter
  const filteredCrossEdges = useMemo(() => {
    if (!projection?.crossEdges) return [];
    if (activeEdgeTypeFilter === "all") return projection.crossEdges;
    return projection.crossEdges.filter((e) => e.type === activeEdgeTypeFilter);
  }, [projection?.crossEdges, activeEdgeTypeFilter]);

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
            showCrossLinks,
            updatedAt: new Date().toISOString(),
          },
          validNodeIds
        );
      }
    },
    [activeRootTopicId, collapsedNodeIds, showCrossLinks, validNodeIds]
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
              showCrossLinks,
              updatedAt: new Date().toISOString(),
            },
            validNodeIds
          );
        }

        return next;
      });
    },
    [activeRootTopicId, layoutMode, showCrossLinks, validNodeIds]
  );

  // Toggle cross-links overlay visibility and persist per topic
  const handleToggleCrossLinks = useCallback(() => {
    setShowCrossLinks((prev) => {
      const next = !prev;
      if (activeRootTopicId) {
        saveMindMapViewState(
          {
            version: 1,
            topicId: activeRootTopicId,
            layoutMode,
            collapsedNodeIds: Array.from(collapsedNodeIds),
            showCrossLinks: next,
            updatedAt: new Date().toISOString(),
          },
          validNodeIds
        );
      }
      return next;
    });
  }, [activeRootTopicId, layoutMode, collapsedNodeIds, validNodeIds]);

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

  // Export Mind Map to standalone SVG file
  const handleExportSvg = useCallback(() => {
    if (!projection) return;
    try {
      const svgString = exportMindMapToSvg(projection, {
        layoutMode,
        collapsedNodeIds,
        showCrossLinks,
        crossEdges: filteredCrossEdges,
      });

      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getMindMapExportFilename(
        projection.rootTitle,
        layoutMode,
        "svg"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export mind map SVG:", err);
    }
  }, [projection, layoutMode, collapsedNodeIds, showCrossLinks, filteredCrossEdges]);

  // Export Mind Map to rasterized PNG file
  const handleExportPng = useCallback(async () => {
    if (!projection) return;
    try {
      setIsExportingPng(true);
      const svgString = exportMindMapToSvg(projection, {
        layoutMode,
        collapsedNodeIds,
        showCrossLinks,
        crossEdges: filteredCrossEdges,
      });

      const pngBlob = await rasterizeSvgToPng(svgString, { scale: 2 });
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getMindMapExportFilename(
        projection.rootTitle,
        layoutMode,
        "png"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export mind map PNG:", err);
    } finally {
      setIsExportingPng(false);
    }
  }, [projection, layoutMode, collapsedNodeIds, showCrossLinks, filteredCrossEdges]);

  // Cleanup highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Focus on a target node: uncollapse ancestors, highlight temporarily, and scroll into view
  const handleFocusNode = useCallback(
    (targetNodeId: string) => {
      if (!targetNodeId) return;

      // 1. Uncollapse any parent nodes along the target's path so target is visible in DOM
      if (projection?.tree) {
        const ancestorIds = findAncestorIds(projection.tree, targetNodeId);
        if (ancestorIds && ancestorIds.length > 0) {
          setCollapsedNodeIds((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const aId of ancestorIds) {
              if (next.has(aId)) {
                next.delete(aId);
                changed = true;
              }
            }
            if (changed && activeRootTopicId) {
              saveMindMapViewState(
                {
                  version: 1,
                  topicId: activeRootTopicId,
                  layoutMode,
                  collapsedNodeIds: Array.from(next),
                  showCrossLinks,
                  updatedAt: new Date().toISOString(),
                },
                validNodeIds
              );
            }
            return changed ? next : prev;
          });
        }
      }

      // 2. Set temporary highlight on target node
      setHighlightedNodeId(targetNodeId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedNodeId(null);
      }, 2000);

      // 3. Scroll to target DOM element if it exists
      setTimeout(() => {
        try {
          const targetEl = document.querySelector(
            `[data-node-id="${targetNodeId}"]`
          ) as HTMLElement | null;
          if (targetEl && typeof targetEl.scrollIntoView === "function") {
            targetEl.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "center",
            });
          }
        } catch {
          // Graceful fallback if DOM or scrollIntoView is unavailable
        }
      }, 0);
    },
    [projection, activeRootTopicId, layoutMode, showCrossLinks, validNodeIds]
  );

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
            onClick={handleToggleCrossLinks}
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

          {/* Edge-Type Filter Pills (Rendered only when showCrossLinks is active and crossEdges exist) */}
          {showCrossLinks && projection?.crossEdges && projection.crossEdges.length > 0 && (
            <div
              data-testid="mindmap-edge-filter-bar"
              className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700 overflow-x-auto"
            >
              <button
                type="button"
                data-testid="edge-filter-pill-all"
                aria-pressed={activeEdgeTypeFilter === "all"}
                onClick={() => setActiveEdgeTypeFilter("all")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  activeEdgeTypeFilter === "all"
                    ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1 py-0.2 text-[9px] rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono">
                  {projection.crossEdges.length}
                </span>
              </button>

              {ORDERED_EDGE_TYPES.map((type) => {
                const count = edgeTypeCounts.get(type) || 0;
                if (count === 0) return null;
                const isSelected = activeEdgeTypeFilter === type;

                return (
                  <button
                    key={type}
                    type="button"
                    data-testid={`edge-filter-pill-${type}`}
                    aria-pressed={isSelected}
                    onClick={() => setActiveEdgeTypeFilter(type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-2xs"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                    }`}
                  >
                    <span>{getSemanticEdgeLabel(type)}</span>
                    <span className="px-1 py-0.2 text-[9px] rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Export SVG Action */}
          <button
            type="button"
            data-testid="btn-export-svg"
            onClick={handleExportSvg}
            disabled={!projection}
            title="Xuất sơ đồ tư duy ra file vector SVG độc lập"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Xuất SVG</span>
          </button>

          {/* Export PNG Action */}
          <button
            type="button"
            data-testid="btn-export-png"
            onClick={handleExportPng}
            disabled={!projection || isExportingPng}
            title="Xuất sơ đồ tư duy ra file ảnh PNG độ nét cao (2x)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">
              {isExportingPng ? "Đang xuất PNG..." : "Xuất PNG"}
            </span>
            <span className="sm:hidden">PNG</span>
          </button>

          {/* Import / Preview Markdown Outline Action */}
          <button
            type="button"
            data-testid="btn-open-import-preview"
            onClick={() => setIsImportModalOpen(true)}
            title="Xem trước dàn ý sơ đồ tư duy từ Markdown (Sandbox)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Xem trước dàn ý</span>
            <span className="sm:hidden">Xem trước</span>
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
                  {filteredCrossEdges.length}/{projection.crossEdges.length} liên kết chéo
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
          crossEdges={filteredCrossEdges}
          cycleAnnotations={projection.cycleAnnotations}
          showCrossLinks={showCrossLinks}
          highlightedNodeId={highlightedNodeId}
          onToggleCollapse={handleToggleCollapse}
          onSelectTopic={(topicId) => openTopicDetail(topicId)}
          onFocusNode={handleFocusNode}
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

      {/* Import / Preview Sandbox Modal */}
      <MindMapImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
