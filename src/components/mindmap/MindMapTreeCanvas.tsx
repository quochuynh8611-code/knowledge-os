import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  MindMapTreeNode,
  MindMapLayoutMode,
  MindMapCrossEdge,
  MindMapCycleAnnotation,
} from "../../lib/mindmapProjection";
import { MindMapCrossLinksLayer } from "./MindMapCrossLinksLayer";
import { MindMapMinimap } from "./MindMapMinimap";
import {
  BookOpen,
  FileText,
  Link2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Repeat,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit3,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
} from "lucide-react";

interface MindMapTreeCanvasProps {
  tree: MindMapTreeNode;
  layoutMode: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  crossEdges?: MindMapCrossEdge[];
  cycleAnnotations?: MindMapCycleAnnotation[];
  showCrossLinks?: boolean;
  highlightedNodeId?: string | null;
  matchingNodeIds?: Set<string> | null;
  onToggleCollapse?: (nodeId: string) => void;
  onSelectTopic?: (topicId: string) => void;
  onFocusNode?: (nodeId: string) => void;

  // Phase P2: Interactive Editing Props
  isEditable?: boolean;
  editingNodeId?: string | null;
  onStartRename?: (nodeId: string) => void;
  onCommitRename?: (nodeId: string, newTitle: string) => void;
  onCancelRename?: () => void;
  onAddChild?: (parentNodeId: string) => void;
  onRequestDelete?: (nodeId: string) => void;
  onMoveUp?: (nodeId: string) => void;
  onMoveDown?: (nodeId: string) => void;

  // Phase P3: AI Expansion Props
  onRequestAiExpand?: (nodeId: string) => void;
}

interface InlineNodeEditorProps {
  nodeId: string;
  initialTitle: string;
  onCommit?: (nodeId: string, title: string) => void;
  onCancel?: () => void;
}

function InlineNodeEditor({
  nodeId,
  initialTitle,
  onCommit,
  onCancel,
}: InlineNodeEditorProps) {
  const [val, setVal] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(initialTitle);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [initialTitle]);

  const handleCommit = () => {
    const trimmed = val.trim();
    if (trimmed && onCommit) {
      onCommit(nodeId, trimmed);
    }
  };

  return (
    <div
      className="flex items-center gap-1 my-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        autoFocus
        data-testid={`input-inline-rename-${nodeId}`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            if (onCancel) onCancel();
          }
        }}
        className="w-full px-2 py-1 text-xs font-semibold bg-white dark:bg-stone-900 border border-amber-500 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden ring-2 ring-amber-500/30"
      />
      <button
        type="button"
        data-testid={`btn-confirm-inline-rename-${nodeId}`}
        onClick={(e) => {
          e.stopPropagation();
          handleCommit();
        }}
        className="p-1 bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer transition shrink-0"
        title="Lưu tiêu đề (Enter)"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        type="button"
        data-testid={`btn-cancel-inline-rename-${nodeId}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onCancel) onCancel();
        }}
        className="p-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-300 rounded cursor-pointer transition shrink-0"
        title="Hủy bỏ (Esc)"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MindMapTreeCanvas({
  tree,
  layoutMode,
  collapsedNodeIds,
  crossEdges,
  cycleAnnotations,
  showCrossLinks,
  highlightedNodeId,
  matchingNodeIds,
  onToggleCollapse,
  onSelectTopic,
  onFocusNode,
  isEditable,
  editingNodeId,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onAddChild,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  onRequestAiExpand,
}: MindMapTreeCanvasProps) {
  const isHorizontal = layoutMode === "tree_horizontal";
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedCrossLinkNodeId, setFocusedCrossLinkNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Build tree lookup maps for O(1) parent and sibling traversal
  const { nodeMap, parentMap } = useMemo(() => {
    const nodes = new Map<string, MindMapTreeNode>();
    const parents = new Map<string, string>();

    const traverse = (node: MindMapTreeNode, parentId?: string) => {
      nodes.set(node.id, node);
      if (parentId) {
        parents.set(node.id, parentId);
      }
      for (const child of node.children) {
        traverse(child, node.id);
      }
    };

    traverse(tree);
    return { nodeMap: nodes, parentMap: parents };
  }, [tree]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.tagName === "SELECT"
    ) {
      return;
    }

    const currentId = focusedNodeId || tree.id;
    const currentNode = nodeMap.get(currentId);

    if (e.key === "Escape") {
      e.stopPropagation();
      setFocusedNodeId(null);
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      setFocusedNodeId(tree.id);
      return;
    }

    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (focusedNodeId && currentNode && currentNode.children.length > 0 && onToggleCollapse) {
        onToggleCollapse(focusedNodeId);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (focusedNodeId && currentNode && currentNode.type === "topic" && onSelectTopic) {
        onSelectTopic(focusedNodeId);
      }
      return;
    }

    // Phase P2.x: Keyboard shortcuts for editing mode
    if (isEditable) {
      if (e.key === "F2") {
        e.preventDefault();
        if (currentId && onStartRename) {
          onStartRename(currentId);
        }
        return;
      }

      if (e.key === "Tab" || e.key === "Insert") {
        e.preventDefault();
        if (currentId && onAddChild) {
          onAddChild(currentId);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (currentId && currentId !== tree.id && onRequestDelete) {
          e.preventDefault();
          onRequestDelete(currentId);
          return;
        }
      }

      // Phase P3.x: Shift + A shortcut to open AI expansion for current node
      if (e.shiftKey && (e.key === "A" || e.key === "a")) {
        if (currentId && onRequestAiExpand) {
          e.preventDefault();
          onRequestAiExpand(currentId);
          return;
        }
      }

      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        if (currentId && currentId !== tree.id) {
          e.preventDefault();
          if (e.key === "ArrowUp" && onMoveUp) {
            onMoveUp(currentId);
          } else if (e.key === "ArrowDown" && onMoveDown) {
            onMoveDown(currentId);
          }
          return;
        }
      }
    }

    // Helper functions for arrow navigation
    const isCollapsed = (id: string) => Boolean(collapsedNodeIds?.has(id));

    const getFirstChild = (node: MindMapTreeNode | undefined): string | null => {
      if (!node || node.children.length === 0 || isCollapsed(node.id)) {
        return null;
      }
      return node.children[0].id;
    };

    const getParent = (id: string): string | null => {
      return parentMap.get(id) || null;
    };

    const getSibling = (id: string, delta: number): string | null => {
      const parentId = parentMap.get(id);
      if (!parentId) return null;
      const parentNode = nodeMap.get(parentId);
      if (!parentNode) return null;
      const idx = parentNode.children.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= parentNode.children.length) {
        return null;
      }
      return parentNode.children[targetIdx].id;
    };

    if (!focusedNodeId) {
      // First arrow key press establishes initial focus
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        if (isHorizontal && e.key === "ArrowRight") {
          const childId = getFirstChild(tree);
          setFocusedNodeId(childId || tree.id);
        } else if (!isHorizontal && e.key === "ArrowDown") {
          const childId = getFirstChild(tree);
          setFocusedNodeId(childId || tree.id);
        } else {
          setFocusedNodeId(tree.id);
        }
        return;
      }
    }

    if (isHorizontal) {
      // Horizontal layout: Right -> child, Left -> parent, Down -> next sibling, Up -> prev sibling
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const childId = getFirstChild(currentNode);
        if (childId) setFocusedNodeId(childId);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const parentId = getParent(currentId);
        if (parentId) setFocusedNodeId(parentId);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextSibling = getSibling(currentId, 1);
        if (nextSibling) setFocusedNodeId(nextSibling);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevSibling = getSibling(currentId, -1);
        if (prevSibling) setFocusedNodeId(prevSibling);
      }
    } else {
      // Vertical layout: Down -> child, Up -> parent, Right -> next sibling, Left -> prev sibling
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const childId = getFirstChild(currentNode);
        if (childId) setFocusedNodeId(childId);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const parentId = getParent(currentId);
        if (parentId) setFocusedNodeId(parentId);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextSibling = getSibling(currentId, 1);
        if (nextSibling) setFocusedNodeId(nextSibling);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevSibling = getSibling(currentId, -1);
        if (prevSibling) setFocusedNodeId(prevSibling);
      }
    }
  };

  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const isDraggingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest?.(
        '[data-node-id], button, input, [data-testid="mindmap-zoom-controls"], [data-testid="mindmap-minimap"]'
      )
    ) {
      return;
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(2.0, +(prev + 0.1).toFixed(2)));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(0.5, +(prev - 0.1).toFixed(2)));
  };

  const handleZoomReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToViewport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const backdrop = backdropRef.current;
    const content = containerRef.current;
    if (!backdrop || !content) return;

    const backdropRect = backdrop.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    if (
      backdropRect.width === 0 ||
      backdropRect.height === 0 ||
      contentRect.width === 0 ||
      contentRect.height === 0
    ) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }

    const unscaledWidth = contentRect.width / zoom;
    const unscaledHeight = contentRect.height / zoom;

    const padding = 64;
    const availableWidth = Math.max(100, backdropRect.width - padding);
    const availableHeight = Math.max(100, backdropRect.height - padding);

    const scaleX = availableWidth / unscaledWidth;
    const scaleY = availableHeight / unscaledHeight;
    const computedScale = Math.min(scaleX, scaleY);

    const clampedScale = Math.min(2.0, Math.max(0.5, +computedScale.toFixed(2)));

    setZoom(clampedScale);
    setPan({ x: 0, y: 0 });
  };

  const activeCrossLinkNodeId = focusedCrossLinkNodeId ?? hoveredNodeId;

  useEffect(() => {
    if (!focusedCrossLinkNodeId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusedCrossLinkNodeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusedCrossLinkNodeId]);

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
    const isSearchActive = matchingNodeIds !== null && matchingNodeIds !== undefined;
    const isSearchMatch = isSearchActive && matchingNodeIds.has(node.id);
    const isSearchDimmed = isSearchActive && !isSearchMatch;
    const isFocused = focusedNodeId === node.id;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFocusedNodeId(node.id);
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
        data-focused={isFocused ? "true" : undefined}
        data-highlighted={isHighlighted ? "true" : undefined}
        data-peer-highlighted={isPeerHighlighted ? "true" : undefined}
        data-search-match={isSearchMatch ? "true" : undefined}
        data-search-dim={isSearchDimmed ? "true" : undefined}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={handleClick}
        className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
          isFocused
            ? "ring-2 ring-amber-500 shadow-md ring-offset-2 dark:ring-offset-stone-900 bg-amber-50/90 dark:bg-amber-950/60 border-amber-500"
            : isHighlighted
              ? "ring-2 ring-amber-500 shadow-md bg-amber-100/90 dark:bg-amber-900/60 border-amber-500 animate-pulse"
              : isSearchMatch
                ? "ring-2 ring-amber-500 shadow-md bg-amber-100/90 dark:bg-amber-900/60 border-amber-500"
                : isPeerHighlighted
                  ? "ring-2 ring-amber-400/80 dark:ring-amber-500/80 shadow-xs bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600"
                  : isRoot
                    ? "bg-amber-50/90 dark:bg-amber-950/50 border-amber-400/80 dark:border-amber-600/80 shadow-xs ring-1 ring-amber-400/30"
                    : isTopic
                      ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-500/60 dark:hover:border-amber-500/60"
                      : "bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/60 dark:border-stone-800/60"
        } ${
          isSearchDimmed ? "opacity-35" : ""
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

        {/* Node Title / Inline Editor */}
        {isEditable && editingNodeId === node.id ? (
          <InlineNodeEditor
            nodeId={node.id}
            initialTitle={node.title}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
          />
        ) : (
          <div className="font-semibold text-xs text-stone-800 dark:text-stone-200 line-clamp-2 leading-snug">
            {node.title}
          </div>
        )}

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

        {/* Phase P2: Interactive Node Editing Toolbar */}
        {isEditable && editingNodeId !== node.id && (
          <div
            className="mt-2 pt-1.5 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-testid={`btn-edit-node-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onStartRename) onStartRename(node.id);
              }}
              title="Đổi tên nút"
              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              data-testid={`btn-add-child-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onAddChild) onAddChild(node.id);
              }}
              title="Thêm nút con"
              className="p-1 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              data-testid={`btn-ai-expand-node-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onRequestAiExpand) onRequestAiExpand(node.id);
              }}
              title="Mở rộng nhánh bằng AI"
              className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
            </button>
            {!isRoot && (
              <>
                <button
                  type="button"
                  data-testid={`btn-move-up-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveUp) onMoveUp(node.id);
                  }}
                  title="Di chuyển lên"
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  data-testid={`btn-move-down-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveDown) onMoveDown(node.id);
                  }}
                  title="Di chuyển xuống"
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  data-testid={`btn-delete-node-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRequestDelete) onRequestDelete(node.id);
                  }}
                  title="Xóa nút"
                  className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
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
    <div
      ref={backdropRef}
      tabIndex={0}
      data-testid="mindmap-canvas-backdrop"
      onClick={() => setFocusedCrossLinkNodeId(null)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full overflow-auto p-8 min-h-[500px] flex items-center justify-center bg-stone-50/50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 focus:outline-none ${
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
    >
      <div
        ref={containerRef}
        data-testid="mindmap-canvas-content"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
        className="relative inline-block transition-transform duration-150"
      >
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

      {/* Floating Minimap Overview Radar */}
      <MindMapMinimap
        tree={tree}
        layoutMode={layoutMode}
        collapsedNodeIds={collapsedNodeIds}
        zoom={zoom}
        pan={pan}
        backdropRef={backdropRef}
        containerRef={containerRef}
        onPanChange={setPan}
      />

      {/* Floating Zoom Controls Widget */}
      <div
        data-testid="mindmap-zoom-controls"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-lg p-1 shadow-sm"
      >
        <button
          type="button"
          data-testid="btn-zoom-out"
          disabled={zoom <= 0.5}
          onClick={handleZoomOut}
          title="Thu nhỏ (-10%)"
          aria-label="Thu nhỏ (-10%)"
          className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-stone-600 dark:text-stone-300"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          data-testid="btn-zoom-reset"
          onClick={handleZoomReset}
          title="Khôi phục 100%"
          aria-label="Khôi phục tỷ lệ 100%"
          className="px-2 py-1 text-xs font-mono font-medium rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer text-stone-700 dark:text-stone-200"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          data-testid="btn-zoom-in"
          disabled={zoom >= 2.0}
          onClick={handleZoomIn}
          title="Phóng to (+10%)"
          aria-label="Phóng to (+10%)"
          className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-stone-600 dark:text-stone-300"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-stone-200 dark:bg-stone-800 my-auto" />

        <button
          type="button"
          data-testid="btn-zoom-fit"
          onClick={handleFitToViewport}
          title="Vừa khung nhìn (Fit to Viewport)"
          aria-label="Vừa khung nhìn"
          className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer text-stone-600 dark:text-stone-300"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
