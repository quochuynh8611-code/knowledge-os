import { MindMapTreeNode } from "./mindmapProjection";

export interface MindMapHistoryState {
  past: MindMapTreeNode[];
  present: MindMapTreeNode;
  future: MindMapTreeNode[];
  maxDepth: number;
  savedBaseline: MindMapTreeNode;
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
export function canUndo(history: MindMapHistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Checks if redo operation is available.
 */
export function canRedo(history: MindMapHistoryState): boolean {
  return history.future.length > 0;
}

/**
 * Checks if present tree is dirty compared to saved baseline.
 */
export function isHistoryDirty(history: MindMapHistoryState): boolean {
  return history.present !== history.savedBaseline;
}

/**
 * Sets saved baseline to present tree (called after successful save).
 */
export function commitHistorySave(
  history: MindMapHistoryState
): MindMapHistoryState {
  return {
    ...history,
    savedBaseline: history.present,
  };
}

/**
 * Resets present tree and history back to saved baseline (discard changes).
 */
export function resetHistoryToSavedBaseline(
  history: MindMapHistoryState
): MindMapHistoryState {
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
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
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
