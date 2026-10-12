import { MindMapTreeNode } from "./mindmapProjection";
import { MindMapDocumentEdge } from "../types/mindmapDocument";
export { pruneDanglingCrossLinks } from "./mindmapCrossLinks";

export interface MindMapHistoryState {
  past: MindMapTreeNode[];
  present: MindMapTreeNode;
  future: MindMapTreeNode[];
  maxDepth: number;
  savedBaseline: MindMapTreeNode;
}

export interface MindMapDocumentSnapshot {
  tree: MindMapTreeNode;
  crossLinks: MindMapDocumentEdge[];
}

export interface MindMapDocumentHistoryState {
  past: MindMapDocumentSnapshot[];
  present: MindMapDocumentSnapshot;
  future: MindMapDocumentSnapshot[];
  maxDepth: number;
  savedBaseline: MindMapDocumentSnapshot;
}

export const DEFAULT_MAX_HISTORY_DEPTH = 40;

/**
 * Creates a new mind map history state from an initial tree.
 */
export function createMindMapHistory(
  initialTree: MindMapTreeNode,
  maxDepth: number = DEFAULT_MAX_HISTORY_DEPTH
): MindMapHistoryState {
  return {
    past: [],
    present: initialTree,
    future: [],
    maxDepth: maxDepth > 0 ? maxDepth : DEFAULT_MAX_HISTORY_DEPTH,
    savedBaseline: initialTree,
  };
}

/**
 * Pushes a new tree mutation snapshot to history.
 * Adds current present to past (respecting maxDepth FIFO limit) and clears future.
 */
export function pushHistoryMutation(
  history: MindMapHistoryState,
  nextTree: MindMapTreeNode
): MindMapHistoryState {
  if (history.present === nextTree) {
    return history;
  }

  const updatedPast = [...history.past, history.present];
  const boundedPast =
    updatedPast.length > history.maxDepth
      ? updatedPast.slice(updatedPast.length - history.maxDepth)
      : updatedPast;

  return {
    ...history,
    past: boundedPast,
    present: nextTree,
    future: [],
  };
}

/**
 * Undoes the most recent mutation step.
 */
export function undoHistory(history: MindMapHistoryState): MindMapHistoryState {
  if (history.past.length === 0) {
    return history;
  }

  const prevTree = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  const newFuture = [history.present, ...history.future];

  return {
    ...history,
    past: newPast,
    present: prevTree,
    future: newFuture,
  };
}

/**
 * Redoes the previously undone mutation step.
 */
export function redoHistory(history: MindMapHistoryState): MindMapHistoryState {
  if (history.future.length === 0) {
    return history;
  }

  const nextTree = history.future[0];
  const newFuture = history.future.slice(1);
  const updatedPast = [...history.past, history.present];
  const boundedPast =
    updatedPast.length > history.maxDepth
      ? updatedPast.slice(updatedPast.length - history.maxDepth)
      : updatedPast;

  return {
    ...history,
    past: boundedPast,
    present: nextTree,
    future: newFuture,
  };
}

/**
 * Checks if undo operation is available.
 */
export function canUndo(
  history: MindMapHistoryState | MindMapDocumentHistoryState
): boolean {
  return history.past.length > 0;
}

/**
 * Checks if redo operation is available.
 */
export function canRedo(
  history: MindMapHistoryState | MindMapDocumentHistoryState
): boolean {
  return history.future.length > 0;
}

/**
 * Checks if present is dirty compared to saved baseline.
 */
export function isHistoryDirty(
  history: MindMapHistoryState | MindMapDocumentHistoryState
): boolean {
  if ("tree" in history.present) {
    const docPresent = history.present as MindMapDocumentSnapshot;
    const docBaseline = history.savedBaseline as MindMapDocumentSnapshot;
    return (
      docPresent.tree !== docBaseline.tree ||
      docPresent.crossLinks !== docBaseline.crossLinks
    );
  }
  return history.present !== history.savedBaseline;
}

/**
 * Sets saved baseline to present (called after successful save).
 */
export function commitHistorySave<
  T extends MindMapHistoryState | MindMapDocumentHistoryState
>(history: T): T {
  return {
    ...history,
    savedBaseline: history.present,
  };
}

/**
 * Resets present and history back to saved baseline (discard changes).
 */
export function resetHistoryToSavedBaseline<
  T extends MindMapHistoryState | MindMapDocumentHistoryState
>(history: T): T {
  return {
    ...history,
    past: [],
    present: history.savedBaseline,
    future: [],
  };
}

// ============================================================
// Phase M5a — Composite Document History (Tree + CrossLinks)
// ============================================================

/**
 * Creates a new composite document history state.
 */
export function createMindMapDocumentHistory(
  initialTree: MindMapTreeNode,
  initialCrossLinks: MindMapDocumentEdge[] = [],
  maxDepth: number = DEFAULT_MAX_HISTORY_DEPTH
): MindMapDocumentHistoryState {
  const initialSnapshot: MindMapDocumentSnapshot = {
    tree: initialTree,
    crossLinks: initialCrossLinks,
  };

  return {
    past: [],
    present: initialSnapshot,
    future: [],
    maxDepth: maxDepth > 0 ? maxDepth : DEFAULT_MAX_HISTORY_DEPTH,
    savedBaseline: initialSnapshot,
  };
}

/**
 * Pushes a new mutation snapshot (tree + crossLinks) to composite history.
 */
export function pushDocumentHistoryMutation(
  history: MindMapDocumentHistoryState,
  nextTree: MindMapTreeNode,
  nextCrossLinks: MindMapDocumentEdge[]
): MindMapDocumentHistoryState {
  if (
    history.present.tree === nextTree &&
    history.present.crossLinks === nextCrossLinks
  ) {
    return history;
  }

  const nextSnapshot: MindMapDocumentSnapshot = {
    tree: nextTree,
    crossLinks: nextCrossLinks,
  };

  const updatedPast = [...history.past, history.present];
  const boundedPast =
    updatedPast.length > history.maxDepth
      ? updatedPast.slice(updatedPast.length - history.maxDepth)
      : updatedPast;

  return {
    ...history,
    past: boundedPast,
    present: nextSnapshot,
    future: [],
  };
}

/**
 * Undoes the most recent composite snapshot step.
 */
export function undoDocumentHistory(
  history: MindMapDocumentHistoryState
): MindMapDocumentHistoryState {
  if (history.past.length === 0) {
    return history;
  }

  const prevSnapshot = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  const newFuture = [history.present, ...history.future];

  return {
    ...history,
    past: newPast,
    present: prevSnapshot,
    future: newFuture,
  };
}

/**
 * Redoes the previously undone composite snapshot step.
 */
export function redoDocumentHistory(
  history: MindMapDocumentHistoryState
): MindMapDocumentHistoryState {
  if (history.future.length === 0) {
    return history;
  }

  const nextSnapshot = history.future[0];
  const newFuture = history.future.slice(1);
  const updatedPast = [...history.past, history.present];
  const boundedPast =
    updatedPast.length > history.maxDepth
      ? updatedPast.slice(updatedPast.length - history.maxDepth)
      : updatedPast;

  return {
    ...history,
    past: boundedPast,
    present: nextSnapshot,
    future: newFuture,
  };
}

export function canUndoDocument(history: MindMapDocumentHistoryState): boolean {
  return history.past.length > 0;
}

export function canRedoDocument(history: MindMapDocumentHistoryState): boolean {
  return history.future.length > 0;
}

export function isDocumentHistoryDirty(
  history: MindMapDocumentHistoryState
): boolean {
  return (
    history.present.tree !== history.savedBaseline.tree ||
    history.present.crossLinks !== history.savedBaseline.crossLinks
  );
}

export function commitDocumentHistorySave(
  history: MindMapDocumentHistoryState
): MindMapDocumentHistoryState {
  return {
    ...history,
    savedBaseline: history.present,
  };
}

export function resetDocumentHistoryToSavedBaseline(
  history: MindMapDocumentHistoryState
): MindMapDocumentHistoryState {
  return {
    ...history,
    past: [],
    present: history.savedBaseline,
    future: [],
  };
}

/**
 * Checks if canvas keyboard shortcut should be ignored due to active text input or modal.
 */
export function shouldIgnoreCanvasShortcut(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();
  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    tagName === "BUTTON" ||
    Boolean(target.closest("button"))
  ) {
    return true;
  }

  if (
    target.isContentEditable ||
    target.contentEditable === "true" ||
    target.getAttribute("contenteditable") === "true" ||
    target.getAttribute("contenteditable") === ""
  ) {
    return true;
  }

  if (target.closest("[role='dialog'], [data-modal]")) {
    return true;
  }

  return false;
}
