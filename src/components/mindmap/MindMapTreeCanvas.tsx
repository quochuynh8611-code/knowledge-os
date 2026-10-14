import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
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
import { shouldIgnoreCanvasShortcut } from "../../lib/mindmapHistory";
import { validateCrossLinkMutation } from "../../lib/mindmapCrossLinks";
import { MindMapDocumentEdge } from "../../types/mindmapDocument";
import { LinkType } from "../../types";

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

  // Phase P2 & M3: Interactive Editing Props
  isEditable?: boolean;
  isDrawerOpen?: boolean;
  focusedNodeId?: string | null;
  onFocusNodeIdChange?: (nodeId: string | null) => void;
  editingNodeId?: string | null;
  onStartRename?: (nodeId: string) => void;
  onCommitRename?: (nodeId: string, newTitle: string) => void;
  onCancelRename?: () => void;
  onAddChild?: (parentNodeId: string, options?: { title?: string }) => void;
  onAddSibling?: (targetNodeId: string, options?: { title?: string }) => void;
  onDeleteNodeDirectly?: (nodeId: string) => void;
  onRequestDelete?: (nodeId: string) => void;
  onMoveUp?: (nodeId: string) => void;
  onMoveDown?: (nodeId: string) => void;

  // Phase P3: AI Expansion Props
  onRequestAiExpand?: (nodeId: string) => void;

  // Phase P4: Drag-and-Drop Reparenting Props
  onReparentNode?: (sourceNodeId: string, targetParentId: string, targetIndex?: number) => void;

  // Phase P6a & P6b.1: Multi-Node Selection Props
  selectedNodeIds?: Set<string>;
  onToggleSelectNode?: (nodeId: string, isModifier: boolean) => void;
  onClearSelection?: () => void;
  onBatchDelete?: () => void;

  // Phase P7.A & P7.B: Marquee Selection Props
  onSelectMultipleNodes?: (nodeIds: string[], mode?: MarqueeSelectionMode) => void;

  // Phase M5b: Direct Drag-to-Connect Props
  onAddCrossLink?: (edge: {
    sourceNodeId: string;
    targetNodeId: string;
    edgeType?: LinkType;
    label?: string;
  }) => void;

  // Phase M7a / M8a: Direct On-Canvas Cross-Link Inspection & Quick Action
  onDeleteCrossLink?: (edgeId: string | string[]) => void;
  onOpenDrawerForNode?: (nodeId: string) => void;

  // Phase M7b: Inline Cross-Link edgeType Mutation
  onUpdateCrossLinkType?: (edgeId: string, newType: LinkType) => void;

  // Phase M7c: Inline Cross-Link Label Renaming
  onUpdateCrossLinkLabel?: (edgeId: string, newLabel: string | undefined) => void;
}

export type MarqueeSelectionMode = "replace" | "add" | "subtract";

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

/**
 * Clamps zoom scale to strictly bounded [min, max] interval.
 */
export function clampZoom(zoom: number, min = 0.5, max = 2.0): number {
  if (isNaN(zoom)) return 1.0;
  return Math.min(max, Math.max(min, +zoom.toFixed(2)));
}

/**
 * Formats zoom scale into integer percentage string (e.g. 1.0 -> "100%", 1.15 -> "115%").
 */
export function formatZoomPercent(zoom: number): string {
  if (isNaN(zoom)) return "100%";
  return `${Math.round(zoom * 100)}%`;
}

/**
 * Computes fit-to-viewport scale and pan offset with fail-closed zero-size geometry handling.
 */
export function computeFitScale(
  backdropWidth: number,
  backdropHeight: number,
  contentWidth: number,
  contentHeight: number,
  currentZoom: number,
  padding = 64
): { scale: number; pan: { x: number; y: number } } {
  if (
    backdropWidth <= 0 ||
    backdropHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    isNaN(backdropWidth) ||
    isNaN(backdropHeight) ||
    isNaN(contentWidth) ||
    isNaN(contentHeight)
  ) {
    return { scale: 1.0, pan: { x: 0, y: 0 } };
  }

  const safeZoom = currentZoom > 0 && !isNaN(currentZoom) ? currentZoom : 1.0;
  const unscaledWidth = contentWidth / safeZoom;
  const unscaledHeight = contentHeight / safeZoom;

  const availableWidth = Math.max(100, backdropWidth - padding);
  const availableHeight = Math.max(100, backdropHeight - padding);

  const scaleX = availableWidth / unscaledWidth;
  const scaleY = availableHeight / unscaledHeight;
  const computedScale = Math.min(scaleX, scaleY);

  const clampedScale = clampZoom(computedScale, 0.5, 2.0);

  return {
    scale: clampedScale,
    pan: { x: 0, y: 0 },
  };
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
  isDrawerOpen,
  focusedNodeId: propFocusedNodeId,
  onFocusNodeIdChange,
  editingNodeId,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onAddChild,
  onAddSibling,
  onDeleteNodeDirectly,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  onRequestAiExpand,
  onReparentNode,
  selectedNodeIds,
  onToggleSelectNode,
  onClearSelection,
  onBatchDelete,
  onSelectMultipleNodes,
  onAddCrossLink,
  onDeleteCrossLink,
  onOpenDrawerForNode,
  onUpdateCrossLinkType,
  onUpdateCrossLinkLabel,
}: MindMapTreeCanvasProps) {
  const isHorizontal = layoutMode === "tree_horizontal";
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedCrossLinkNodeId, setFocusedCrossLinkNodeId] = useState<string | null>(null);
  const [internalFocusedNodeId, setInternalFocusedNodeId] = useState<string | null>(null);
  const focusedNodeId = propFocusedNodeId !== undefined ? propFocusedNodeId : internalFocusedNodeId;

  // Phase M7a & M8a: Cross-Link Inspection, Selection & Quick Action State
  const [selectedCrossLinkIds, setSelectedCrossLinkIds] = useState<Set<string>>(new Set());
  const selectedCrossLinkId = selectedCrossLinkIds.size === 1 ? Array.from(selectedCrossLinkIds)[0] : null;
  const [selectedCrossLinkMidPos, setSelectedCrossLinkMidPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Phase M5b: Direct Drag-to-Connect State
  interface ConnectingState {
    sourceNodeId: string;
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
    candidateTargetId: string | null;
    candidateRejectReason?: string;
    isValid: boolean;
  }

  const [connectingState, setConnectingState] = useState<ConnectingState | null>(null);
  const connectingStateRef = useRef<ConnectingState | null>(null);

  useEffect(() => {
    if (!connectingState) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        connectingStateRef.current = null;
        setConnectingState(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [connectingState]);

  const handleConnectPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    sourceNodeId: string
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore in test/JSDOM environments without pointer capture
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const startX = rect ? rect.left + rect.width / 2 : e.clientX;
    const startY = rect ? rect.top + rect.height / 2 : e.clientY;

    const initialState: ConnectingState = {
      sourceNodeId,
      startPos: { x: startX, y: startY },
      currentPos: { x: e.clientX, y: e.clientY },
      candidateTargetId: null,
      candidateRejectReason: undefined,
      isValid: false,
    };

    connectingStateRef.current = initialState;
    setConnectingState(initialState);
  };

  const handleConnectPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!connectingStateRef.current) return;
    e.stopPropagation();

    const currentPos = { x: e.clientX, y: e.clientY };

    const targetEl = document.elementFromPoint?.(e.clientX, e.clientY) as HTMLElement | null;
    const targetCard = targetEl?.closest?.("[data-node-id]") as HTMLElement | null;
    const candidateTargetId = targetCard?.getAttribute("data-node-id") || null;

    let isValid = false;
    let candidateRejectReason: string | undefined = undefined;

    if (candidateTargetId) {
      const existingDocEdges: MindMapDocumentEdge[] = (crossEdges || []).map((edge) => ({
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        edgeType: (edge as any).edgeType || (edge as any).type || "related",
        label: edge.label,
      }));

      const result = validateCrossLinkMutation(
        connectingStateRef.current.sourceNodeId,
        candidateTargetId,
        "related",
        existingDocEdges,
        tree
      );

      isValid = result.valid;
      candidateRejectReason = result.error;
    }

    const nextState: ConnectingState = {
      ...connectingStateRef.current,
      currentPos,
      candidateTargetId,
      candidateRejectReason,
      isValid,
    };
    connectingStateRef.current = nextState;
    setConnectingState(nextState);
  };

  const handleConnectPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const state = connectingStateRef.current;
    if (!state) return;
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    if (state.candidateTargetId && state.isValid && onAddCrossLink) {
      onAddCrossLink({
        sourceNodeId: state.sourceNodeId,
        targetNodeId: state.candidateTargetId,
        edgeType: "related",
      });
    }

    connectingStateRef.current = null;
    setConnectingState(null);
  };

  const handleConnectPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    connectingStateRef.current = null;
    setConnectingState(null);
  };

  const setFocusedNodeId = (
    idOrUpdater: string | null | ((prev: string | null) => string | null)
  ) => {
    setInternalFocusedNodeId((prev) => {
      const next = typeof idOrUpdater === "function" ? idOrUpdater(prev) : idOrUpdater;
      if (onFocusNodeIdChange) {
        onFocusNodeIdChange(next);
      }
      return next;
    });
  };

  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

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
    if (shouldIgnoreCanvasShortcut(e.target)) {
      return;
    }

    if (
      typeof document !== "undefined" &&
      document.activeElement &&
      document.activeElement !== document.body &&
      document.activeElement !== backdropRef.current &&
      shouldIgnoreCanvasShortcut(document.activeElement)
    ) {
      return;
    }

    const currentId = focusedNodeId || tree.id;
    const currentNode = nodeMap.get(currentId);

    // Phase M7a & M8a: Cross-link selection keyboard precedence
    if (selectedCrossLinkIds.size > 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation?.();
        setSelectedCrossLinkIds(new Set());
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation?.();
        if (onDeleteCrossLink) {
          const ids = Array.from(selectedCrossLinkIds);
          onDeleteCrossLink(ids.length === 1 ? ids[0] : ids);
        }
        setSelectedCrossLinkIds(new Set());
        return;
      }
    }

    if (e.key === "Escape") {
      e.stopPropagation();
      setFocusedNodeId(null);
      if (onClearSelection && selectedNodeIds && selectedNodeIds.size > 0) {
        onClearSelection();
      }
      return;
    }

    // Phase P7.A: Cmd+A / Ctrl+A shortcut for selecting all logical-visible nodes
    if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      if (onSelectMultipleNodes) {
        const visibleIds: string[] = [];
        const collectVisible = (node: MindMapTreeNode) => {
          visibleIds.push(node.id);
          if (!collapsedNodeIds?.has(node.id)) {
            for (const child of node.children) {
              collectVisible(child);
            }
          }
        };
        collectVisible(tree);
        onSelectMultipleNodes(visibleIds);
      }
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
      if (isEditable) {
        // Phase M3: Enter creates sibling if not root, strict no-op on root
        if (currentId !== tree.id && onAddSibling) {
          onAddSibling(currentId, { title: "New node" });
        }
        return;
      }

      if (focusedNodeId && currentNode && currentNode.type === "topic" && onSelectTopic) {
        onSelectTopic(focusedNodeId);
      }
      return;
    }

    // Phase P2.x & M3: Keyboard shortcuts for editing mode
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
          if (onAddSibling) {
            onAddChild(currentId, { title: "New node" });
          } else {
            onAddChild(currentId);
          }
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedNodeIds && selectedNodeIds.size >= 2 && onBatchDelete) {
          onBatchDelete();
          return;
        }

        if (currentId === tree.id) {
          // Phase M3: Root cannot be deleted
          return;
        }

        if (currentId && onDeleteNodeDirectly) {
          onDeleteNodeDirectly(currentId);
          return;
        }

        if (currentId && onRequestDelete) {
          onRequestDelete(currentId);
          return;
        }
        return;
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

  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    mode: MarqueeSelectionMode;
  } | null>(null);
  const isMarqueeDraggingRef = useRef(false);
  const marqueeModeRef = useRef<MarqueeSelectionMode>("replace");
  const marqueeStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const wasMarqueeRef = useRef(false);

  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);

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

    dragDistanceRef.current = 0;
    wasMarqueeRef.current = false;

    if (e.shiftKey) {
      // Ambiguity check: if both Cmd/Ctrl AND Alt/Option are held with Shift -> fail-closed!
      const hasCmdOrCtrl = Boolean(e.metaKey || e.ctrlKey);
      const hasAlt = Boolean(e.altKey);
      if (hasCmdOrCtrl && hasAlt) {
        return;
      }

      let mode: MarqueeSelectionMode = "replace";
      if (hasCmdOrCtrl) {
        mode = "add";
      } else if (hasAlt) {
        mode = "subtract";
      }

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore in test/JSDOM environments without pointer capture
      }
      isMarqueeDraggingRef.current = true;
      marqueeModeRef.current = mode;
      marqueeStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
      };
      setMarqueeBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        mode,
      });
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
    if (connectingStateRef.current) return;

    if (isMarqueeDraggingRef.current && marqueeStartRef.current) {
      const dx = e.clientX - marqueeStartRef.current.clientX;
      const dy = e.clientY - marqueeStartRef.current.clientY;
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(dx, dy));
      setMarqueeBox({
        startX: marqueeStartRef.current.clientX,
        startY: marqueeStartRef.current.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        mode: marqueeModeRef.current,
      });
      return;
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(dx, dy));
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (connectingStateRef.current) return;

    if (isMarqueeDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const dist = dragDistanceRef.current;
      if (dist > 5 && marqueeStartRef.current) {
        wasMarqueeRef.current = true;
        const boxLeft = Math.min(marqueeStartRef.current.clientX, e.clientX);
        const boxRight = Math.max(marqueeStartRef.current.clientX, e.clientX);
        const boxTop = Math.min(marqueeStartRef.current.clientY, e.clientY);
        const boxBottom = Math.max(marqueeStartRef.current.clientY, e.clientY);

        const nodeEls = backdropRef.current?.querySelectorAll<HTMLElement>("[data-node-id]");
        const intersectedIds: string[] = [];
        if (nodeEls) {
          nodeEls.forEach((el) => {
            const nodeId = el.getAttribute("data-node-id");
            if (!nodeId) return;
            const nodeRect = el.getBoundingClientRect();
            const isIntersecting = !(
              nodeRect.right < boxLeft ||
              nodeRect.left > boxRight ||
              nodeRect.bottom < boxTop ||
              nodeRect.top > boxBottom
            );
            if (isIntersecting) {
              intersectedIds.push(nodeId);
            }
          });
        }
        if (onSelectMultipleNodes) {
          if (marqueeModeRef.current === "replace") {
            onSelectMultipleNodes(intersectedIds);
          } else {
            onSelectMultipleNodes(intersectedIds, marqueeModeRef.current);
          }
        }
      }
      isMarqueeDraggingRef.current = false;
      marqueeStartRef.current = null;
      setMarqueeBox(null);
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMarqueeDraggingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      isMarqueeDraggingRef.current = false;
      marqueeStartRef.current = null;
      setMarqueeBox(null);
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => clampZoom(prev + 0.1));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => clampZoom(prev - 0.1));
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

    const fitResult = computeFitScale(
      backdropRect.width,
      backdropRect.height,
      contentRect.width,
      contentRect.height,
      zoom,
      64
    );

    setZoom(fitResult.scale);
    setPan(fitResult.pan);
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

  // Phase M7a & M8a: Auto-dismiss cross-link popover when edges no longer exist in crossEdges
  useEffect(() => {
    if (selectedCrossLinkIds.size > 0 && crossEdges) {
      const activeIds = new Set(crossEdges.map((e) => e.id));
      const remainingIds = new Set(Array.from(selectedCrossLinkIds).filter((id) => activeIds.has(id)));
      if (remainingIds.size !== selectedCrossLinkIds.size) {
        setSelectedCrossLinkIds(remainingIds);
      }
    }
  }, [selectedCrossLinkIds, crossEdges]);

  // Phase M7c: Local Draft State for Cross-Link Label Renaming
  const [draftLabel, setDraftLabel] = useState<string>("");
  const committedLabelRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedCrossLinkId || !crossEdges) {
      setDraftLabel("");
      committedLabelRef.current = undefined;
      return;
    }
    const edge = crossEdges.find((e) => e.id === selectedCrossLinkId);
    const norm = edge?.label ? edge.label.trim() || undefined : undefined;
    setDraftLabel(edge?.label || "");
    committedLabelRef.current = norm;
  }, [selectedCrossLinkId, crossEdges]);

  const handleCommitCrossLinkLabel = useCallback(() => {
    if (!selectedCrossLinkId) return;
    const trimmed = draftLabel.trim() || undefined;
    if (trimmed === committedLabelRef.current) return;
    committedLabelRef.current = trimmed;
    onUpdateCrossLinkLabel?.(selectedCrossLinkId, trimmed);
  }, [selectedCrossLinkId, draftLabel, onUpdateCrossLinkLabel]);

  // Phase M7a & M8a Protection: Window listener for cross-link selection shortcuts
  useEffect(() => {
    if (selectedCrossLinkIds.size === 0) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreCanvasShortcut(e.target)) return;
      if (
        typeof document !== "undefined" &&
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement !== backdropRef.current &&
        shouldIgnoreCanvasShortcut(document.activeElement)
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedCrossLinkIds(new Set());
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        if (onDeleteCrossLink) {
          const ids = Array.from(selectedCrossLinkIds);
          onDeleteCrossLink(ids.length === 1 ? ids[0] : ids);
        }
        setSelectedCrossLinkIds(new Set());
        return;
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [selectedCrossLinkIds, onDeleteCrossLink]);

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
    const isSelected = Boolean(selectedNodeIds?.has(node.id));
    const isHighlighted = highlightedNodeId === node.id;
    const isPeerHighlighted = peerNodeIds.has(node.id);
    const isSearchActive = matchingNodeIds !== null && matchingNodeIds !== undefined;
    const isSearchMatch = isSearchActive && matchingNodeIds.has(node.id);
    const isSearchDimmed = isSearchActive && !isSearchMatch;
    const isFocused = focusedNodeId === node.id;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const isModifier = Boolean(e.shiftKey || e.metaKey || e.ctrlKey);
      if (onToggleSelectNode) {
        onToggleSelectNode(node.id, isModifier);
      }
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

    const canDrag = Boolean(isEditable && !isRoot);
    const isDragOverTarget = Boolean(
      isEditable && dragOverNodeId === node.id && draggingNodeId !== node.id
    );

    const isConnectCandidate = connectingState?.candidateTargetId === node.id;
    const isConnectValid = Boolean(isConnectCandidate && connectingState?.isValid);
    const connectRejectReason =
      isConnectCandidate && !connectingState?.isValid
        ? connectingState?.candidateRejectReason
        : undefined;

    const handleDragStart = (e: React.DragEvent) => {
      if (!canDrag) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      setDraggingNodeId(node.id);
      e.dataTransfer.setData("application/x-mindmap-node", node.id);
      e.dataTransfer.setData("text/plain", node.id);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {
      setDraggingNodeId(null);
      setDragOverNodeId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      if (draggingNodeId !== node.id) {
        e.dataTransfer.dropEffect = "move";
        if (dragOverNodeId !== node.id) {
          setDragOverNodeId(node.id);
        }
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.stopPropagation();
      if (dragOverNodeId === node.id) {
        setDragOverNodeId(null);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      if (!isEditable) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverNodeId(null);
      setDraggingNodeId(null);
      const sourceId =
        e.dataTransfer.getData("application/x-mindmap-node") ||
        e.dataTransfer.getData("text/plain");
      if (sourceId && sourceId !== node.id && onReparentNode) {
        onReparentNode(sourceId, node.id);
      }
    };

    return (
      <div
        data-node-id={node.id}
        data-testid={`node-card-${node.id}`}
        data-connect-accept={isConnectValid ? "true" : undefined}
        data-connect-reject={connectRejectReason || undefined}
        data-selected={isSelected ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-highlighted={isHighlighted ? "true" : undefined}
        data-peer-highlighted={isPeerHighlighted ? "true" : undefined}
        data-search-match={isSearchMatch ? "true" : undefined}
        data-search-dim={isSearchDimmed ? "true" : undefined}
        draggable={canDrag ? true : undefined}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={handleClick}
        className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-200 ${
          isConnectValid
            ? "ring-2 ring-indigo-500 shadow-lg bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500"
            : connectRejectReason
              ? "ring-2 ring-rose-500 shadow-lg bg-rose-50/90 dark:bg-rose-950/60 border-rose-500"
              : isDragOverTarget
                ? "ring-2 ring-sky-500 shadow-lg bg-sky-50/90 dark:bg-sky-950/60 border-sky-500"
            : isSelected
              ? "ring-2 ring-amber-500 shadow-md ring-offset-2 dark:ring-offset-stone-900 bg-amber-50/90 dark:bg-amber-950/60 border-amber-500"
              : isFocused
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

        {/* Phase M5b: Dedicated Connection Handle */}
        {isEditable && (
          <div
            role="button"
            data-testid={`connector-handle-${node.id}`}
            aria-label={`Kéo để kết nối từ nút ${node.title}`}
            title="Kéo để liên kết chéo (Drag to connect)"
            onPointerDown={(e) => handleConnectPointerDown(e, node.id)}
            onPointerMove={handleConnectPointerMove}
            onPointerUp={handleConnectPointerUp}
            onPointerCancel={handleConnectPointerCancel}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center cursor-crosshair shadow-sm ring-2 ring-white dark:ring-stone-900 z-10 transition-transform hover:scale-125"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white pointer-events-none" />
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
      onClick={() => {
        setSelectedCrossLinkIds(new Set());
        setFocusedCrossLinkNodeId(null);
        const wasPanOrMarquee = dragDistanceRef.current > 5 || wasMarqueeRef.current;
        wasMarqueeRef.current = false;
        dragDistanceRef.current = 0;
        if (!wasPanOrMarquee && onClearSelection) {
          onClearSelection();
        }
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`relative w-full overflow-auto p-8 min-h-[500px] flex items-center justify-center bg-stone-50/50 dark:bg-stone-950/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 focus:outline-none ${
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
    >
      {marqueeBox && (() => {
        const backdropRect = backdropRef.current?.getBoundingClientRect();
        const scrollLeft = backdropRef.current?.scrollLeft ?? 0;
        const scrollTop = backdropRef.current?.scrollTop ?? 0;
        const backdropLeft = backdropRect?.left ?? 0;
        const backdropTop = backdropRect?.top ?? 0;
        const left = Math.min(marqueeBox.startX, marqueeBox.currentX) - backdropLeft + scrollLeft;
        const top = Math.min(marqueeBox.startY, marqueeBox.currentY) - backdropTop + scrollTop;
        const width = Math.abs(marqueeBox.currentX - marqueeBox.startX);
        const height = Math.abs(marqueeBox.currentY - marqueeBox.startY);
        const colorClasses =
          marqueeBox.mode === "add"
            ? "border-emerald-500 bg-emerald-500/15"
            : marqueeBox.mode === "subtract"
            ? "border-rose-500 bg-rose-500/15"
            : "border-indigo-500 bg-indigo-500/15";
        return (
          <div
            data-testid="mindmap-marquee-box"
            className={`absolute border border-dashed ${colorClasses} pointer-events-none z-50 rounded-xs`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          />
        );
      })()}
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
            selectedEdgeId={selectedCrossLinkId}
            selectedEdgeIds={selectedCrossLinkIds}
            onSelectEdge={(edgeId, midPos, modifiers) => {
              if (modifiers?.shiftKey || modifiers?.metaKey || modifiers?.ctrlKey) {
                const next = new Set(selectedCrossLinkIds);
                if (next.has(edgeId)) {
                  next.delete(edgeId);
                } else {
                  next.add(edgeId);
                }
                setSelectedCrossLinkIds(next);
              } else {
                setSelectedCrossLinkIds(new Set([edgeId]));
              }
              setSelectedCrossLinkMidPos(midPos);
            }}
            isConnecting={Boolean(connectingState)}
          />
        )}
        {isHorizontal ? renderHorizontalTree(tree) : renderVerticalTree(tree)}

        {/* Phase M7a: Floating On-Canvas Cross-Link Quick Inspect Popover */}
        {(() => {
          if (!selectedCrossLinkId || !crossEdges) return null;
          const selectedEdge = crossEdges.find((e) => e.id === selectedCrossLinkId);
          if (!selectedEdge) return null;
          if (
            collapsedNodeIds?.has(selectedEdge.sourceNodeId) ||
            collapsedNodeIds?.has(selectedEdge.targetNodeId)
          ) {
            return null;
          }

          const sourceTitle =
            selectedEdge.sourceTitle ||
            nodeMap.get(selectedEdge.sourceNodeId)?.title ||
            selectedEdge.sourceNodeId;
          const targetTitle =
            selectedEdge.targetTitle ||
            nodeMap.get(selectedEdge.targetNodeId)?.title ||
            selectedEdge.targetNodeId;

          return (
            <div
              data-testid="crosslink-quick-actions"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: `${selectedCrossLinkMidPos.x}px`,
                top: `${selectedCrossLinkMidPos.y}px`,
                transform: "translate(-50%, -120%)",
              }}
              className="z-30 min-w-[220px] max-w-[320px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 p-2.5 text-xs text-stone-800 dark:text-stone-200 pointer-events-auto select-none"
            >
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-1.5 mb-1.5">
                <select
                  data-testid="crosslink-type-select"
                  value={selectedEdge.type || "related"}
                  onChange={(e) => {
                    const newType = e.target.value as LinkType;
                    if (newType === (selectedEdge.type || "related")) return;
                    onUpdateCrossLinkType?.(selectedEdge.id, newType);
                  }}
                  className="px-1.5 py-0.5 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="related">Liên quan</option>
                  <option value="prerequisite">Tiên quyết</option>
                  <option value="advanced">Nâng cao</option>
                  <option value="contradicts">Đối chiếu</option>
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="crosslink-open-drawer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenDrawerForNode) {
                        onOpenDrawerForNode(selectedEdge.sourceNodeId);
                        setSelectedCrossLinkIds(new Set());
                      }
                    }}
                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition cursor-pointer"
                    title="Mở chi tiết liên kết trong Drawer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="crosslink-quick-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteCrossLink) {
                        onDeleteCrossLink(selectedEdge.id);
                      }
                      setSelectedCrossLinkIds(new Set());
                    }}
                    className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                    title="Xóa liên kết"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="crosslink-close-popover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCrossLinkIds(new Set());
                    }}
                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition cursor-pointer"
                    title="Đóng popover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-xs text-stone-900 dark:text-stone-100">
                <span className="truncate max-w-[120px]" title={sourceTitle}>
                  {sourceTitle}
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate max-w-[120px]" title={targetTitle}>
                  {targetTitle}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <label
                    htmlFor={`crosslink-label-input-${selectedEdge.id}`}
                    className="text-[10px] text-stone-500 dark:text-stone-400 block"
                  >
                    Nhãn:
                  </label>
                  {selectedEdge.label && (
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium truncate max-w-[150px]">
                      {selectedEdge.label}
                    </span>
                  )}
                </div>
                <input
                  id={`crosslink-label-input-${selectedEdge.id}`}
                  data-testid="crosslink-label-input"
                  type="text"
                  maxLength={60}
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCommitCrossLinkLabel();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      const edge = crossEdges?.find((edgeItem) => edgeItem.id === selectedCrossLinkId);
                      setDraftLabel(edge?.label || "");
                    }
                  }}
                  onBlur={handleCommitCrossLinkLabel}
                  placeholder="Nhập nhãn..."
                  className="w-full px-2 py-1 text-xs bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-stone-800 transition"
                />
              </div>
            </div>
          );
        })()}
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
        onPointerDown={(e) => e.stopPropagation()}
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
          {formatZoomPercent(zoom)}
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

      {/* Phase M5b: Drag-to-Connect Preview Overlay */}
      {connectingState && (
        <svg
          data-testid="mindmap-connect-preview-layer"
          className="fixed inset-0 pointer-events-none z-50 w-full h-full"
          style={{ position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh" }}
        >
          <path
            data-testid="mindmap-connect-preview-line"
            data-valid={connectingState.isValid ? "true" : "false"}
            d={`M ${connectingState.startPos.x} ${connectingState.startPos.y} C ${(connectingState.startPos.x + connectingState.currentPos.x) / 2} ${connectingState.startPos.y}, ${(connectingState.startPos.x + connectingState.currentPos.x) / 2} ${connectingState.currentPos.y}, ${connectingState.currentPos.x} ${connectingState.currentPos.y}`}
            fill="none"
            stroke={connectingState.isValid ? "#6366f1" : "#f43f5e"}
            strokeWidth={2.5}
            strokeDasharray={connectingState.isValid ? undefined : "6 4"}
            className="transition-colors duration-150"
          />
        </svg>
      )}
    </div>
  );
}
