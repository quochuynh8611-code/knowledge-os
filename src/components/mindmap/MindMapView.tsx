import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useData } from "../../context/DataContext";
import {
  projectToMindMapTree,
  exportMindMapToMarkdown,
  getSemanticEdgeLabel,
  MindMapLayoutMode,
  MindMapTreeNode,
  MindMapTreeProjection,
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
  sanitizeCollapsedIds,
} from "../../lib/mindmapStorage";
import {
  listMindMapDocuments,
  getMindMapDocumentSummary,
  getMindMapVersion,
  createMindMapDocument,
  appendMindMapVersion,
  renameMindMapDocument,
  archiveMindMapDocument,
  projectedTreeToDocumentTree,
  documentTreeToProjectedTree,
} from "../../lib/mindmapDocumentStorage";
import { MindMapDocumentSummary } from "../../types/mindmapDocument";
import { MindMapTreeCanvas } from "./MindMapTreeCanvas";
import { MindMapImportPreviewModal } from "./MindMapImportPreviewModal";
import { MindMapSaveModal } from "./MindMapSaveModal";
import { MindMapDocumentBrowserModal } from "./MindMapDocumentBrowserModal";
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
  Search,
  X,
  Save,
  FolderOpen,
  ArrowLeft,
  FileText,
  RotateCcw,
  Trash2,
  Undo2,
  Redo2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  MindMapHistoryState,
  createMindMapHistory,
  pushHistoryMutation,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  isHistoryDirty,
  commitHistorySave,
  resetHistoryToSavedBaseline,
  shouldIgnoreCanvasShortcut,
} from "../../lib/mindmapHistory";
import {
  renameNodeTitle,
  insertChildNode,
  deleteNode,
  deleteBatchNodes,
  moveNodeWithinParent,
  findNodeById,
  countTreeNodes,
  insertBatchChildNodes,
  reparentNode,
} from "../../lib/mindmapTreeMutations";
import { MindMapAiExpansionModal } from "./MindMapAiExpansionModal";
import { AiExpansionContext, AiCandidateNode } from "../../types/mindmapAi";

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

function collectTreeNodeIds(node: MindMapTreeNode): Set<string> {
  const ids = new Set<string>();
  const traverse = (n: MindMapTreeNode) => {
    ids.add(n.id);
    for (const child of n.children) {
      traverse(child);
    }
  };
  traverse(node);
  return ids;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [internalTopicId, setInternalTopicId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistence State (Phase P1)
  const [activeMode, setActiveMode] =
    useState<"live-topic" | "saved-document">("live-topic");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState<boolean>(false);
  const [isVolatileStorage, setIsVolatileStorage] = useState<boolean>(false);
  const [savedDocsRevision, setSavedDocsRevision] = useState<number>(0);

  // Working Copy State & History (Phase P2 & Phase P5)
  const [workingDocumentTree, setWorkingDocumentTree] =
    useState<MindMapTreeNode | null>(null);
  const [historyState, setHistoryState] =
    useState<MindMapHistoryState | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(
    null
  );
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState<
    "live-topic" | { type: "open-document"; documentId: string } | null
  >(null);

  // Multi-Node Selection State (Phase P6a)
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // AI Expansion State (Phase P3)
  const [aiExpansionTargetNodeId, setAiExpansionTargetNodeId] = useState<
    string | null
  >(null);

  const savedDocuments = useMemo(() => {
    return listMindMapDocuments();
  }, [savedDocsRevision]);

  const activeDocumentSummary = useMemo(() => {
    if (!activeDocumentId) return null;
    return getMindMapDocumentSummary(activeDocumentId);
  }, [activeDocumentId, savedDocsRevision]);

  const activeDocumentVersion = useMemo(() => {
    if (!activeDocumentId) return null;
    return getMindMapVersion(activeDocumentId);
  }, [activeDocumentId, savedDocsRevision]);

  // Synchronize working tree and history when active saved document version changes
  useEffect(() => {
    if (activeMode === "saved-document" && activeDocumentVersion) {
      const initial = documentTreeToProjectedTree(
        activeDocumentVersion.treeData,
        layoutMode
      );
      setWorkingDocumentTree(initial);
      setHistoryState(createMindMapHistory(initial));
      setIsDirty(false);
      setEditingNodeId(null);
    } else {
      setWorkingDocumentTree(null);
      setHistoryState(null);
      setIsDirty(false);
      setEditingNodeId(null);
    }
  }, [activeDocumentId, activeDocumentVersion, activeMode]);

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
    if (activeMode === "saved-document") return;
    setActiveEdgeTypeFilter("all");
    setSearchQuery("");
    setSelectedNodeIds(new Set());
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
  }, [activeRootTopicId, activeMode]);

  // Derive mind map projection (supports both Live Topic and Saved Document working copy)
  const projection: MindMapTreeProjection | null = useMemo(() => {
    if (activeMode === "saved-document" && activeDocumentVersion) {
      const tree =
        workingDocumentTree ||
        documentTreeToProjectedTree(activeDocumentVersion.treeData, layoutMode);
      return {
        rootNodeId: tree.id,
        rootTitle: tree.title,
        layoutMode,
        maxDepthReached: 3,
        totalNodesCount: countTreeNodes(tree),
        hasTruncatedBranches: false,
        hasCyclesDetected: false,
        generatedAt: activeDocumentVersion.createdAt || new Date().toISOString(),
        tree,
        crossEdges: (activeDocumentVersion.crossLinks || []).map((edge) => ({
          id: edge.id,
          sourceNodeId: edge.sourceNodeId,
          sourceTitle: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          targetTitle: edge.targetNodeId,
          type: edge.edgeType,
          strength: 3,
          label: edge.label || getSemanticEdgeLabel(edge.edgeType),
          isCycle: false,
        })),
        cycleAnnotations: [],
      };
    }

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
  }, [
    activeMode,
    activeDocumentVersion,
    activeDocumentSummary,
    topics,
    notes,
    resources,
    activeRootTopicId,
    layoutMode,
  ]);

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
    return collectTreeNodeIds(projection.tree);
  }, [projection]);

  // Compute search matching nodes and their ancestor paths
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !projection?.tree) {
      return null;
    }

    const lowerQuery = trimmed.toLowerCase();
    const matchingIds = new Set<string>();
    const neededAncestorIds = new Set<string>();

    const traverse = (node: MindMapTreeNode) => {
      if (node.title.toLowerCase().includes(lowerQuery)) {
        matchingIds.add(node.id);
        const ancestors = findAncestorIds(projection.tree, node.id);
        if (ancestors) {
          for (const aId of ancestors) {
            neededAncestorIds.add(aId);
          }
        }
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(projection.tree);

    return {
      matchingIds,
      neededAncestorIds,
    };
  }, [searchQuery, projection?.tree]);

  const matchingNodeIds = useMemo(() => {
    return searchResults ? searchResults.matchingIds : null;
  }, [searchResults]);

  // Ephemeral effective collapsed node IDs: uncollapses ancestors of matching nodes without persisting
  const effectiveCollapsedNodeIds = useMemo(() => {
    if (!searchResults) {
      return collapsedNodeIds;
    }
    const next = new Set<string>();
    for (const id of collapsedNodeIds) {
      if (!searchResults.neededAncestorIds.has(id)) {
        next.add(id);
      }
    }
    return next;
  }, [collapsedNodeIds, searchResults]);

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
      }, 50);
    },
    [projection, activeRootTopicId, layoutMode, showCrossLinks, validNodeIds]
  );

  const defaultSaveTitle = useMemo(() => {
    if (activeMode === "saved-document" && activeDocumentSummary) {
      return activeDocumentSummary.title;
    }
    if (projection?.rootTitle) {
      return `Sơ đồ tư duy - ${projection.rootTitle}`;
    }
    return "Sơ đồ tư duy mới";
  }, [activeMode, activeDocumentSummary, projection?.rootTitle]);

  // Interactive Canvas Editing Actions (Phase P2 & Phase P5 History)
  const applyTreeMutation = useCallback((nextTree: MindMapTreeNode) => {
    setWorkingDocumentTree(nextTree);
    setHistoryState((prevHistory) => {
      const baseHistory = prevHistory || createMindMapHistory(nextTree);
      const updated = pushHistoryMutation(baseHistory, nextTree);
      setIsDirty(isHistoryDirty(updated));
      return updated;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryState((prev) => {
      if (!prev || !canUndo(prev)) return prev;
      const next = undoHistory(prev);
      setWorkingDocumentTree(next.present);
      setIsDirty(isHistoryDirty(next));
      return next;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryState((prev) => {
      if (!prev || !canRedo(prev)) return prev;
      const next = redoHistory(prev);
      setWorkingDocumentTree(next.present);
      setIsDirty(isHistoryDirty(next));
      return next;
    });
  }, []);

  // Keyboard shortcut listener for Canvas Undo / Redo (Cmd/Ctrl + Z, Cmd/Ctrl + Shift + Z, Cmd/Ctrl + Y)
  useEffect(() => {
    if (activeMode !== "saved-document") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreCanvasShortcut(e.target)) return;

      const isMac =
        typeof navigator !== "undefined" &&
        navigator.platform &&
        navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : (e.ctrlKey || e.metaKey);

      if (!isCmdOrCtrl) return;

      // Undo: Cmd+Z or Ctrl+Z without Shift
      if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd+Shift+Z, Ctrl+Shift+Z, or Ctrl+Y / Cmd+Y
      if (
        ((e.key === "z" || e.key === "Z") && e.shiftKey) ||
        e.key === "y" ||
        e.key === "Y"
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMode, handleUndo, handleRedo]);

  const handleStartRename = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleCommitRename = useCallback(
    (nodeId: string, nextTitle: string) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      const res = renameNodeTitle(currentTree, nodeId, nextTitle);
      if (res.ok && res.tree) {
        applyTreeMutation(res.tree);
        setEditingNodeId(null);
      }
    },
    [workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  const handleCancelRename = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const handleAddChild = useCallback(
    (parentNodeId: string) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      const res = insertChildNode(currentTree, parentNodeId);
      if (res.ok && res.tree) {
        applyTreeMutation(res.tree);
        const parent = findNodeById(res.tree, parentNodeId);
        if (parent && parent.children.length > 0) {
          const newChild = parent.children[parent.children.length - 1];
          setEditingNodeId(newChild.id);
        }
      }
    },
    [workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  const handleRequestDelete = useCallback(
    (nodeId: string) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      if (nodeId === currentTree.id) return; // Protect root node
      setPendingDeleteNodeId(nodeId);
    },
    [workingDocumentTree, projection?.tree]
  );

  const handleConfirmDelete = useCallback(() => {
    const currentTree = workingDocumentTree || projection?.tree;
    if (!currentTree || !pendingDeleteNodeId) return;
    const res = deleteNode(currentTree, pendingDeleteNodeId);
    if (res.ok && res.tree) {
      const nextValidIds = collectTreeNodeIds(res.tree);
      setCollapsedNodeIds((prev) => new Set(sanitizeCollapsedIds(Array.from(prev), nextValidIds)));
      applyTreeMutation(res.tree);
      setPendingDeleteNodeId(null);
    }
  }, [workingDocumentTree, projection?.tree, pendingDeleteNodeId, applyTreeMutation]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteNodeId(null);
  }, []);

  const handleMoveUp = useCallback(
    (nodeId: string) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      const res = moveNodeWithinParent(currentTree, nodeId, "up");
      if (res.ok && res.tree) {
        applyTreeMutation(res.tree);
      }
    },
    [workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  const handleMoveDown = useCallback(
    (nodeId: string) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      const res = moveNodeWithinParent(currentTree, nodeId, "down");
      if (res.ok && res.tree) {
        applyTreeMutation(res.tree);
      }
    },
    [workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  const handleReparentNode = useCallback(
    (sourceNodeId: string, targetParentId: string, targetIndex?: number) => {
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;
      const res = reparentNode(currentTree, sourceNodeId, targetParentId, targetIndex);
      if (res.ok && res.tree) {
        const nextValidIds = collectTreeNodeIds(res.tree);
        // Automatically uncollapse target parent so newly reparented child is visible
        setCollapsedNodeIds((prev) => {
          const cleaned = new Set(sanitizeCollapsedIds(Array.from(prev), nextValidIds));
          cleaned.delete(targetParentId);
          return cleaned;
        });
        applyTreeMutation(res.tree);
      }
    },
    [workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  // Multi-Node Selection & Batch Operations (Phase P6a)
  const handleToggleSelectNode = useCallback(
    (nodeId: string, isModifier: boolean) => {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (isModifier) {
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
        } else {
          next.clear();
          next.add(nodeId);
        }
        return next;
      });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  const handleSelectMultipleNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(new Set(nodeIds));
  }, []);

  const handleBatchDelete = useCallback(() => {
    const currentTree = workingDocumentTree || projection?.tree;
    if (!currentTree || selectedNodeIds.size === 0) return;
    const res = deleteBatchNodes(currentTree, Array.from(selectedNodeIds));
    if (res.ok && res.tree) {
      const nextValidIds = collectTreeNodeIds(res.tree);
      setCollapsedNodeIds((prev) => new Set(sanitizeCollapsedIds(Array.from(prev), nextValidIds)));
      applyTreeMutation(res.tree);
      setSelectedNodeIds(new Set());
    }
  }, [workingDocumentTree, projection?.tree, selectedNodeIds, applyTreeMutation]);

  const handleBatchCollapse = useCallback(() => {
    const currentTree = workingDocumentTree || projection?.tree;
    if (!currentTree || selectedNodeIds.size === 0) return;

    // Collect IDs in selectedNodeIds that have children.length > 0 (ignore leaf nodes)
    const collapsibleIds: string[] = [];
    const checkNode = (node: MindMapTreeNode) => {
      if (selectedNodeIds.has(node.id) && Array.isArray(node.children) && node.children.length > 0) {
        collapsibleIds.push(node.id);
      }
      for (const child of node.children) {
        checkNode(child);
      }
    };
    checkNode(currentTree);

    if (collapsibleIds.length === 0) return;

    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      for (const id of collapsibleIds) {
        next.add(id);
      }
      if (activeMode === "live-topic" && activeRootTopicId) {
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
  }, [
    workingDocumentTree,
    projection?.tree,
    selectedNodeIds,
    activeMode,
    activeRootTopicId,
    layoutMode,
    showCrossLinks,
    validNodeIds,
  ]);

  const handleBatchExpand = useCallback(() => {
    if (selectedNodeIds.size === 0) return;

    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedNodeIds) {
        next.delete(id);
      }
      if (activeMode === "live-topic" && activeRootTopicId) {
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
  }, [
    selectedNodeIds,
    activeMode,
    activeRootTopicId,
    layoutMode,
    showCrossLinks,
    validNodeIds,
  ]);

  const handleDiscardChanges = useCallback(() => {
    setSelectedNodeIds(new Set());
    if (historyState) {
      const reset = resetHistoryToSavedBaseline(historyState);
      setWorkingDocumentTree(reset.present);
      setHistoryState(reset);
      setIsDirty(isHistoryDirty(reset));
      setEditingNodeId(null);
    } else if (activeDocumentVersion) {
      const initial = documentTreeToProjectedTree(
        activeDocumentVersion.treeData,
        layoutMode
      );
      setWorkingDocumentTree(initial);
      setHistoryState(createMindMapHistory(initial));
      setIsDirty(false);
      setEditingNodeId(null);
    }
  }, [historyState, activeDocumentVersion, layoutMode]);

  // AI Node Expansion Actions (Phase P3)
  const handleRequestAiExpand = useCallback((nodeId: string) => {
    setAiExpansionTargetNodeId(nodeId);
  }, []);

  const handleInsertAiCandidates = useCallback(
    (candidates: AiCandidateNode[]) => {
      if (!aiExpansionTargetNodeId) return;
      const currentTree = workingDocumentTree || projection?.tree;
      if (!currentTree) return;

      const res = insertBatchChildNodes(
        currentTree,
        aiExpansionTargetNodeId,
        candidates.map((c) => ({
          title: c.title,
          type: c.nodeType,
        }))
      );

      if (res.ok && res.tree) {
        applyTreeMutation(res.tree);
        // Automatically uncollapse target node so newly inserted children are visible
        setCollapsedNodeIds((prev) => {
          if (!prev.has(aiExpansionTargetNodeId)) return prev;
          const next = new Set(prev);
          next.delete(aiExpansionTargetNodeId);
          return next;
        });
        setAiExpansionTargetNodeId(null);
      }
    },
    [aiExpansionTargetNodeId, workingDocumentTree, projection?.tree, applyTreeMutation]
  );

  const aiExpansionContext = useMemo((): AiExpansionContext | null => {
    if (!aiExpansionTargetNodeId) return null;
    const currentTree = workingDocumentTree || projection?.tree;
    if (!currentTree) return null;

    const target = findNodeById(currentTree, aiExpansionTargetNodeId);
    if (!target) return null;

    const ancestorIds = findAncestorIds(currentTree, aiExpansionTargetNodeId) || [];
    const ancestorTitles = ancestorIds
      .map((id) => findNodeById(currentTree, id)?.title)
      .filter((t): t is string => Boolean(t));

    // Candidates will be inserted as children of target, so target's current children are the siblings
    const existingSiblingTitles = target.children.map((c) => c.title);

    return {
      targetNodeId: target.id,
      targetNodeTitle: target.title,
      rootTopicTitle: currentTree.title,
      ancestorTitles,
      existingSiblingTitles,
      preset: "sub_components",
      language: "vi",
    };
  }, [aiExpansionTargetNodeId, workingDocumentTree, projection?.tree]);

  // Persistence Actions (Phase P1 & P2)
  const handleSaveNewDocument = useCallback(
    (title: string, description?: string, changeSummary?: string) => {
      if (!projection?.tree) return;
      const docTree = projectedTreeToDocumentTree(projection.tree);
      const currentValidIds = collectTreeNodeIds(projection.tree);
      const sanitizedCollapsed = sanitizeCollapsedIds(Array.from(collapsedNodeIds), currentValidIds);
      const crossLinks = (projection.crossEdges || []).map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        edgeType: (e.type === "prerequisite" ||
        e.type === "advanced" ||
        e.type === "contradicts"
          ? e.type
          : "related") as LinkType,
        label: e.label,
      }));

      const result = createMindMapDocument({
        title,
        description,
        rootTopicId: activeRootTopicId || undefined,
        treeData: docTree,
        crossLinks,
        changeSummary,
        viewState: {
          layoutMode,
          collapsedNodeIds: sanitizedCollapsed,
          showCrossLinks,
        },
      });

      if (result.success && result.data) {
        setActiveDocumentId(result.data.document.id);
        setActiveMode("saved-document");
        setIsVolatileStorage(result.isVolatile);
        setHistoryState((prev) =>
          prev
            ? commitHistorySave(prev)
            : projection?.tree
            ? createMindMapHistory(projection.tree)
            : null
        );
        setIsDirty(false);
        setSavedDocsRevision((r) => r + 1);
        setIsSaveModalOpen(false);
      }
    },
    [projection, activeRootTopicId, layoutMode, collapsedNodeIds, showCrossLinks]
  );

  const handleSaveVersion = useCallback(
    (changeSummary: string) => {
      if (!activeDocumentId || !projection?.tree) return;
      const docTree = projectedTreeToDocumentTree(projection.tree);
      const currentValidIds = collectTreeNodeIds(projection.tree);
      const sanitizedCollapsed = sanitizeCollapsedIds(Array.from(collapsedNodeIds), currentValidIds);
      const crossLinks = (projection.crossEdges || []).map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        edgeType: (e.type === "prerequisite" ||
        e.type === "advanced" ||
        e.type === "contradicts"
          ? e.type
          : "related") as LinkType,
        label: e.label,
      }));

      const result = appendMindMapVersion({
        documentId: activeDocumentId,
        changeSummary,
        treeData: docTree,
        crossLinks,
        viewState: {
          layoutMode,
          collapsedNodeIds: sanitizedCollapsed,
          showCrossLinks,
        },
      });

      if (result.success) {
        setIsVolatileStorage(result.isVolatile);
        setHistoryState((prev) =>
          prev
            ? commitHistorySave(prev)
            : projection?.tree
            ? createMindMapHistory(projection.tree)
            : null
        );
        setIsDirty(false);
        setSavedDocsRevision((r) => r + 1);
        setIsSaveModalOpen(false);
      }
    },
    [activeDocumentId, projection, layoutMode, collapsedNodeIds, showCrossLinks]
  );

  const handleOpenSavedDocument = useCallback(
    (documentId: string) => {
      if (isDirty && activeDocumentId !== documentId) {
        setPendingLeaveTarget({ type: "open-document", documentId });
        return;
      }
      const version = getMindMapVersion(documentId);
      if (version) {
        setActiveDocumentId(documentId);
        setActiveMode("saved-document");
        setSelectedNodeIds(new Set());
        setLayoutMode(version.viewState.layoutMode);
        setCollapsedNodeIds(new Set(version.viewState.collapsedNodeIds));
        setShowCrossLinks(Boolean(version.viewState.showCrossLinks));
        setIsBrowserModalOpen(false);
      }
    },
    [isDirty, activeDocumentId]
  );

  const handleRenameDocument = useCallback((documentId: string, newTitle: string) => {
    renameMindMapDocument(documentId, newTitle);
    setSavedDocsRevision((r) => r + 1);
  }, []);

  const handleArchiveDocument = useCallback(
    (documentId: string) => {
      archiveMindMapDocument(documentId);
      setSavedDocsRevision((r) => r + 1);
      if (activeDocumentId === documentId) {
        setActiveMode("live-topic");
        setActiveDocumentId(null);
        setWorkingDocumentTree(null);
        setSelectedNodeIds(new Set());
        setIsDirty(false);
        if (activeRootTopicId) {
          const savedState = loadMindMapViewState(activeRootTopicId);
          setLayoutMode(savedState.layoutMode);
          setCollapsedNodeIds(new Set(savedState.collapsedNodeIds));
          setShowCrossLinks(Boolean(savedState.showCrossLinks));
        }
      }
    },
    [activeDocumentId, activeRootTopicId]
  );

  const handleReturnToLiveMode = useCallback(() => {
    if (isDirty) {
      setPendingLeaveTarget("live-topic");
      return;
    }
    setActiveMode("live-topic");
    setActiveDocumentId(null);
    setWorkingDocumentTree(null);
    setSelectedNodeIds(new Set());
    setIsDirty(false);
    if (activeRootTopicId) {
      const savedState = loadMindMapViewState(activeRootTopicId);
      setLayoutMode(savedState.layoutMode);
      setCollapsedNodeIds(new Set(savedState.collapsedNodeIds));
      setShowCrossLinks(Boolean(savedState.showCrossLinks));
    }
  }, [isDirty, activeRootTopicId]);

  const handleConfirmDiscardAndLeave = useCallback(() => {
    if (pendingLeaveTarget === "live-topic") {
      setActiveMode("live-topic");
      setActiveDocumentId(null);
      setWorkingDocumentTree(null);
      setSelectedNodeIds(new Set());
      setIsDirty(false);
      setPendingLeaveTarget(null);
      if (activeRootTopicId) {
        const savedState = loadMindMapViewState(activeRootTopicId);
        setLayoutMode(savedState.layoutMode);
        setCollapsedNodeIds(new Set(savedState.collapsedNodeIds));
        setShowCrossLinks(Boolean(savedState.showCrossLinks));
      }
    } else if (
      pendingLeaveTarget &&
      typeof pendingLeaveTarget === "object" &&
      pendingLeaveTarget.type === "open-document"
    ) {
      const docId = pendingLeaveTarget.documentId;
      setPendingLeaveTarget(null);
      setIsDirty(false);
      const version = getMindMapVersion(docId);
      if (version) {
        setActiveDocumentId(docId);
        setActiveMode("saved-document");
        setSelectedNodeIds(new Set());
        setLayoutMode(version.viewState.layoutMode);
        setCollapsedNodeIds(new Set(version.viewState.collapsedNodeIds));
        setShowCrossLinks(Boolean(version.viewState.showCrossLinks));
        setIsBrowserModalOpen(false);
      }
    }
  }, [pendingLeaveTarget, activeRootTopicId]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Volatile Storage Warning Banner */}
      {isVolatileStorage && (
        <div
          data-testid="volatile-storage-banner"
          className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Lưu trữ tạm thời:</strong> Trình duyệt không cấp quyền truy cập localStorage (Private Mode hoặc Storage Disabled). Dữ liệu sơ đồ đang được lưu trong bộ nhớ tạm thời (RAM) và sẽ mất khi tải lại trang.
          </span>
        </div>
      )}

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
          {/* In-Canvas Search Bar */}
          <div className="relative flex items-center bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-500/50">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0 mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setSearchQuery("");
                }
              }}
              placeholder="Tìm nút trong sơ đồ..."
              aria-label="Tìm kiếm nút trong sơ đồ"
              className="bg-transparent text-xs font-medium text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden w-28 sm:w-36 md:w-44"
            />
            {searchQuery.trim() && (
              <span className="ml-1 text-[10px] font-medium font-mono text-stone-500 dark:text-stone-400 shrink-0">
                {matchingNodeIds && matchingNodeIds.size > 0
                  ? `${matchingNodeIds.size} khớp`
                  : "0 kết quả"}
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="ml-1 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded cursor-pointer transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

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

          {/* Save Document / Save Version CTA */}
          <button
            type="button"
            data-testid="btn-save-mindmap"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!projection}
            title={
              activeMode === "saved-document"
                ? "Lưu phiên bản mới cho sơ đồ hiện tại"
                : "Lưu sơ đồ tư duy thành tài liệu độc lập"
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Save className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">
              {activeMode === "saved-document" ? "Lưu phiên bản" : "Lưu sơ đồ"}
            </span>
            <span className="sm:hidden">Lưu</span>
          </button>

          {/* Saved Documents Browser Modal Opener */}
          <button
            type="button"
            data-testid="btn-open-mindmap-browser"
            onClick={() => setIsBrowserModalOpen(true)}
            title="Duyệt và mở các sơ đồ tư duy đã lưu"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Sơ đồ đã lưu</span>
            <span className="sm:hidden">Đã lưu</span>
            {savedDocuments.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-mono font-bold">
                {savedDocuments.length}
              </span>
            )}
          </button>

          {/* Undo / Redo Actions (Phase P5) */}
          {activeMode === "saved-document" && (
            <div className="flex items-center bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl p-0.5">
              <button
                type="button"
                data-testid="mindmap-undo-button"
                onClick={handleUndo}
                disabled={!historyState || !canUndo(historyState)}
                title="Hoàn tác (Cmd/Ctrl + Z)"
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="mindmap-redo-button"
                onClick={handleRedo}
                disabled={!historyState || !canRedo(historyState)}
                title="Làm lại (Cmd/Ctrl + Shift + Z hoặc Cmd/Ctrl + Y)"
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Saved Document Badge & Back to Live Button */}
          {activeMode === "saved-document" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs">
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-900 dark:text-amber-200 truncate max-w-[150px]">
                {activeDocumentSummary?.title || "Sơ đồ đã lưu"}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-md">
                v{activeDocumentSummary?.currentVersionNumber || 1}
              </span>
              <button
                type="button"
                data-testid="btn-return-live-mode"
                onClick={handleReturnToLiveMode}
                title="Quay lại chế độ xem Topic từ đồ thị"
                className="ml-1 p-1 hover:bg-amber-200/80 dark:hover:bg-amber-900 rounded text-amber-800 dark:text-amber-300 cursor-pointer transition flex items-center gap-1 text-[11px]"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Xem Topic</span>
              </button>
            </div>
          )}

          {/* Unsaved Changes Warning Badge & Discard CTA */}
          {activeMode === "saved-document" && isDirty && (
            <div className="flex items-center gap-1.5">
              <div
                data-testid="unsaved-changes-badge"
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-600 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Có thay đổi chưa lưu</span>
              </div>
              <button
                type="button"
                data-testid="btn-discard-changes"
                onClick={handleDiscardChanges}
                title="Hủy bỏ thay đổi chưa lưu và khôi phục bản đã lưu"
                className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-stone-200 dark:border-stone-700 shadow-2xs"
              >
                <RotateCcw className="w-3 h-3 text-stone-500" />
                <span className="hidden sm:inline">Hủy thay đổi</span>
              </button>
            </div>
          )}

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
          collapsedNodeIds={effectiveCollapsedNodeIds}
          matchingNodeIds={matchingNodeIds}
          crossEdges={filteredCrossEdges}
          cycleAnnotations={projection.cycleAnnotations}
          showCrossLinks={showCrossLinks}
          highlightedNodeId={highlightedNodeId}
          onToggleCollapse={handleToggleCollapse}
          onSelectTopic={(topicId) => openTopicDetail(topicId)}
          onFocusNode={handleFocusNode}
          isEditable={activeMode === "saved-document"}
          editingNodeId={editingNodeId}
          onStartRename={handleStartRename}
          onCommitRename={handleCommitRename}
          onCancelRename={handleCancelRename}
          onAddChild={handleAddChild}
          onRequestDelete={handleRequestDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onRequestAiExpand={handleRequestAiExpand}
          onReparentNode={handleReparentNode}
          selectedNodeIds={selectedNodeIds}
          onToggleSelectNode={handleToggleSelectNode}
          onClearSelection={handleClearSelection}
          onBatchDelete={handleBatchDelete}
          onSelectMultipleNodes={handleSelectMultipleNodes}
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

      {/* Save Document / Version Modal */}
      <MindMapSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveNew={handleSaveNewDocument}
        onSaveVersion={handleSaveVersion}
        activeDocument={activeMode === "saved-document" ? activeDocumentSummary : null}
        defaultTitle={defaultSaveTitle}
        isVolatile={isVolatileStorage}
        nodesCount={projection?.totalNodesCount || 1}
        layoutMode={layoutMode}
      />

      {/* Saved Documents Browser Modal */}
      <MindMapDocumentBrowserModal
        isOpen={isBrowserModalOpen}
        onClose={() => setIsBrowserModalOpen(false)}
        documents={savedDocuments}
        activeDocumentId={activeDocumentId}
        onOpenDocument={handleOpenSavedDocument}
        onRenameDocument={handleRenameDocument}
        onArchiveDocument={handleArchiveDocument}
      />

      {/* Delete Node Confirmation Modal */}
      {pendingDeleteNodeId && (
        <div
          data-testid="confirm-delete-node-modal"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              handleCancelDelete();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Xác nhận xóa nhánh sơ đồ
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa nút{" "}
              <strong className="text-stone-900 dark:text-stone-100">
                "{findNodeById(workingDocumentTree || projection?.tree!, pendingDeleteNodeId)?.title}"
              </strong>{" "}
              {(() => {
                const target = findNodeById(
                  workingDocumentTree || projection?.tree!,
                  pendingDeleteNodeId
                );
                return target && target.children.length > 0
                  ? `và toàn bộ ${target.children.length} nhánh con bên dưới?`
                  : "khỏi sơ đồ hiện tại?";
              })()}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-delete-node"
                onClick={handleCancelDelete}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-node"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Leave Guard Confirmation Dialog */}
      {pendingLeaveTarget && (
        <div
          data-testid="unsaved-changes-confirm-dialog"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setPendingLeaveTarget(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/80 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Thay đổi chưa được lưu
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Sơ đồ đang có các chỉnh sửa chưa lưu thành phiên bản mới. Nếu rời đi bây giờ, mọi thay đổi chưa lưu sẽ bị hủy bỏ.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-leave"
                onClick={() => setPendingLeaveTarget(null)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Ở lại chỉnh sửa
              </button>
              <button
                type="button"
                data-testid="btn-confirm-discard-and-leave"
                onClick={handleConfirmDiscardAndLeave}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Hủy thay đổi & Rời đi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Node Expansion Modal (Phase P3) */}
      {aiExpansionContext && (
        <MindMapAiExpansionModal
          isOpen={Boolean(aiExpansionTargetNodeId)}
          context={aiExpansionContext}
          onClose={() => setAiExpansionTargetNodeId(null)}
          onInsertCandidates={handleInsertAiCandidates}
        />
      )}

      {/* Floating Batch Action Bar (Phase P6a) */}
      {selectedNodeIds.size >= 2 && (
        <div
          data-testid="mindmap-batch-action-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-2.5 shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center gap-2">
            <span
              data-testid="batch-selection-count"
              className="text-xs font-semibold text-stone-800 dark:text-stone-200"
            >
              Đã chọn {selectedNodeIds.size} nút
            </span>
          </div>
          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-batch-collapse"
              onClick={handleBatchCollapse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Thu gọn</span>
            </button>
            <button
              type="button"
              data-testid="btn-batch-expand"
              onClick={handleBatchExpand}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Mở rộng</span>
            </button>
            <button
              type="button"
              data-testid="btn-batch-delete"
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa các nút</span>
            </button>
            <button
              type="button"
              data-testid="btn-batch-deselect"
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
