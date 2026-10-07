import React, { useRef, useState, useMemo } from "react";
import {
  MindMapTreeNode,
  MindMapLayoutMode,
  MindMapCrossEdge,
  MindMapCycleAnnotation,
} from "../../lib/mindmapProjection";
import { MindMapCrossLinksLayer } from "./MindMapCrossLinksLayer";
import {
  BookOpen,
  FileText,
  Link2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Repeat,
} from "lucide-react";

interface MindMapTreeCanvasProps {
  tree: MindMapTreeNode;
  layoutMode: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  crossEdges?: MindMapCrossEdge[];
  cycleAnnotations?: MindMapCycleAnnotation[];
  showCrossLinks?: boolean;
  highlightedNodeId?: string | null;
  onToggleCollapse?: (nodeId: string) => void;
  onSelectTopic?: (topicId: string) => void;
  onFocusNode?: (nodeId: string) => void;
}

export function MindMapTreeCanvas({
  tree,
  layoutMode,
  collapsedNodeIds,
  crossEdges,
  cycleAnnotations,
  showCrossLinks,
  highlightedNodeId,
  onToggleCollapse,
  onSelectTopic,
  onFocusNode,
}: MindMapTreeCanvasProps) {
  const isHorizontal = layoutMode === "tree_horizontal";
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedCrossLinkNodeId, setFocusedCrossLinkNodeId] = useState<string | null>(null);

  const activeCrossLinkNodeId = focusedCrossLinkNodeId ?? hoveredNodeId;

  const peerNodeIds = useMemo(() => {
    if (!showCrossLinks || !activeCrossLinkNodeId || !crossEdges) return new Set<string>();
    const peers = new Set<string>();
    for (const edge of crossEdges) {
      if (
        collapsedNodeIds?.has(edge.sourceNodeId) ||
        collapsedNodeIds?.has(edge.targetNodeId)
      ) {
        continue;
      }
      if (edge.sourceNodeId === activeCrossLinkNodeId) peers.add(edge.targetNodeId);
      if (edge.targetNodeId === activeCrossLinkNodeId) peers.add(edge.sourceNodeId);
    }
    return peers;
  }, [showCrossLinks, activeCrossLinkNodeId, crossEdges, collapsedNodeIds]);

  const renderStatusBadge = (node: MindMapTreeNode) => {
    if (node.progress !== undefined && node.progress !== null) {
      if (node.progress >= 100 || node.studyStatus === "completed") {
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-md">
            100%
          </span>
        );
      }
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded-md">
          {Math.round(node.progress)}%
        </span>
      );
    }
    if (node.studyStatus === "in_progress") {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded-md">
          Đang học
        </span>
      );
    }
    if (node.studyStatus === "reviewing") {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 rounded-md">
          Ôn tập
        </span>
      );
    }
    return null;
  };

  const renderRelationTag = (node: MindMapTreeNode) => {
    if (!node.edgeTypeToParent) return null;
    let label: string = node.edgeTypeToParent;
    let colorClass =
      "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400";

    switch (node.edgeTypeToParent) {
      case "prerequisite":
        label = "Tiên quyết";
        colorClass =
          "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700";
        break;
      case "advanced":
        label = "Nâng cao";
        colorClass =
          "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300 dark:border-purple-700";
        break;
      case "related":
        label = "Liên quan";
        colorClass =
          "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-300 dark:border-sky-700";
        break;
      case "contradicts":
        label = "Đối chiếu";
        colorClass =
          "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700";
        break;
      case "has_note":
        label = "Ghi chú";
        colorClass =
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
        break;
      case "has_resource":
        label = "Tài liệu";
        colorClass =
          "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700";
        break;
    }

    return (
      <span
        className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${colorClass}`}
      >
        {label}
      </span>
    );
  };

  const renderNodeCard = (node: MindMapTreeNode) => {
    const isRoot = node.hopDistance === 0;
    const isTopic = node.type === "topic";
    const hasChildren = node.children.length > 0;
    const isCollapsed = Boolean(collapsedNodeIds?.has(node.id));
    const isHighlighted = highlightedNodeId === node.id;
    const isPeerHighlighted = peerNodeIds.has(node.id);

    const handleClick = () => {
      setFocusedCrossLinkNodeId((prev) => (prev === node.id ? null : node.id));
      if (isTopic && onSelectTopic) {
        onSelectTopic(node.id);
      }
    };

    const handleToggleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleCollapse) {
        onToggleCollapse(node.id);
      }
    };

    const nodeCycles =
      cycleAnnotations?.filter((ca) => ca.nodeId === node.id) || [];

    return (
      <div
        data-node-id={node.id}
        data-highlighted={isHighlighted ? "true" : undefined}
        data-peer-highlighted={isPeerHighlighted ? "true" : undefined}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={handleClick}
        className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
          isHighlighted
            ? "ring-2 ring-amber-500 shadow-md bg-amber-100/90 dark:bg-amber-900/60 border-amber-500 animate-pulse"
            : isPeerHighlighted
              ? "ring-2 ring-amber-400/80 dark:ring-amber-500/80 shadow-xs bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600"
              : isRoot
                ? "bg-amber-50/90 dark:bg-amber-950/50 border-amber-400/80 dark:border-amber-600/80 shadow-xs ring-1 ring-amber-400/30"
                : isTopic
                  ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-500/60 dark:hover:border-amber-500/60"
                  : "bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/60 dark:border-stone-800/60"
        } ${
          isTopic ? "cursor-pointer hover:shadow-md" : "cursor-default"
        } min-w-[180px] max-w-[260px]`}
      >
        {/* Node Header */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            {node.type === "topic" && (
              <BookOpen
                className={`w-3.5 h-3.5 ${
                  isRoot
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-stone-500 dark:text-stone-400"
                }`}
              />
            )}
            {node.type === "note" && (
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            {node.type === "resource" && (
              <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {node.type}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {renderStatusBadge(node)}
            {/* Collapse/Expand Toggle Affordance */}
            {hasChildren && (
              <button
                type="button"
                onClick={handleToggleCollapse}
                aria-label={
                  isCollapsed
                    ? `Mở rộng nhánh ${node.title}`
                    : `Thu gọn nhánh ${node.title}`
                }
                title={
                  isCollapsed
                    ? `Mở rộng (${node.children.length} nhánh con)`
                    : `Thu gọn (${node.children.length} nhánh con)`
                }
                className={`p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-0.5 text-[10px] font-semibold ${
                  isCollapsed
                    ? "text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-1"
                    : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                }`}
              >
                {isCollapsed ? (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span>+{node.children.length}</span>
                  </>
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Node Title */}
        <div className="font-semibold text-xs text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug">
          {node.title}
        </div>

        {/* Node Footer: Relation tag, Cycle badges & category */}
        {(node.edgeTypeToParent || nodeCycles.length > 0 || node.categoryName) && (
          <div className="mt-2 pt-1.5 border-t border-stone-100 dark:border-stone-800/60 flex flex-wrap items-center justify-between gap-1">
            <div className="flex flex-wrap items-center gap-1">
              {renderRelationTag(node)}
              {nodeCycles.map((cycle, idx) => (
                <button
                  type="button"
                  key={idx}
                  data-testid={`cycle-badge-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFocusNode) {
                      onFocusNode(cycle.targetAncestorId);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded border bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600 transition cursor-pointer"
                  title={`Chu trình khép kín trở về tổ tiên: ${cycle.targetAncestorTitle || cycle.targetAncestorId} (Nhấp để chuyển đến)`}
                >
                  ↻ {cycle.targetAncestorTitle || cycle.targetAncestorId}
                </button>
              ))}
            </div>
            {node.categoryName && (
              <span className="text-[9px] text-stone-400 dark:text-stone-500 truncate max-w-[100px]">
                {node.categoryName}
              </span>
            )}
          </div>
        )}

        {isTopic && !isRoot && (
          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
        )}
      </div>
    );
  };

  const renderHorizontalTree = (node: MindMapTreeNode): React.ReactNode => {
    const isCollapsed = Boolean(collapsedNodeIds?.has(node.id));
    const showChildren = node.children.length > 0 && !isCollapsed;

    return (
      <div key={node.id} className="flex items-center">
        {/* Node Box */}
        <div className="shrink-0">{renderNodeCard(node)}</div>

        {/* Branch Lines & Children (Hidden if collapsed) */}
        {showChildren && (
          <div className="flex items-center">
            {/* Horizontal Connector */}
            <div className="w-6 h-px bg-stone-300 dark:bg-stone-700" />

            {/* Vertical Bracket & Child Column */}
            <div className="relative pl-6 py-2 flex flex-col gap-4 border-l border-stone-300 dark:border-stone-700">
              {node.children.map((child) => (
                <div key={child.id} className="relative flex items-center">
                  {/* Branch Arm from Bracket to Child */}
                  <div className="absolute -left-6 w-6 h-px bg-stone-300 dark:bg-stone-700" />
                  {renderHorizontalTree(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVerticalTree = (node: MindMapTreeNode): React.ReactNode => {
    const isCollapsed = Boolean(collapsedNodeIds?.has(node.id));
    const showChildren = node.children.length > 0 && !isCollapsed;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Box */}
        <div className="shrink-0">{renderNodeCard(node)}</div>

        {/* Branch Lines & Children (Hidden if collapsed) */}
        {showChildren && (
          <div className="flex flex-col items-center">
            {/* Vertical Connector */}
            <div className="w-px h-6 bg-stone-300 dark:bg-stone-700" />

            {/* Horizontal Bracket & Children Row */}
            <div className="relative pt-6 px-4 flex gap-6 border-t border-stone-300 dark:border-stone-700">
              {node.children.map((child) => (
                <div
                  key={child.id}
                  className="relative flex flex-col items-center"
                >
                  {/* Branch Arm from Bracket to Child */}
                  <div className="absolute -top-6 w-px h-6 bg-stone-300 dark:bg-stone-700" />
                  {renderVerticalTree(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full overflow-auto p-8 min-h-[500px] flex items-center justify-center bg-stone-50/50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800">
      <div ref={containerRef} className="relative inline-block">
        {showCrossLinks && crossEdges && crossEdges.length > 0 && (
          <MindMapCrossLinksLayer
            crossEdges={crossEdges}
            collapsedNodeIds={collapsedNodeIds}
            containerRef={containerRef}
            hoveredNodeId={activeCrossLinkNodeId}
          />
        )}
        {isHorizontal ? renderHorizontalTree(tree) : renderVerticalTree(tree)}
      </div>
    </div>
  );
}
