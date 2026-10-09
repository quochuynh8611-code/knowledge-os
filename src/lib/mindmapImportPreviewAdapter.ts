import { MindMapImportNode } from "./mindmapImportParser";
import { MindMapTreeNode } from "./mindmapProjection";
import { TopicStatus } from "../types";

/**
 * Pure function to map a MindMapImportNode AST node into a MindMapTreeNode
 * compatible with MindMapTreeCanvas for ephemeral in-memory rendering.
 *
 * ZERO dependencies, ZERO DOM/React state, ZERO database/DataContext mutations.
 */
export function convertImportAstToMindMapTreeNode(
  importNode: MindMapImportNode,
  domain: string = "general"
): MindMapTreeNode {
  let studyStatus: TopicStatus | undefined = undefined;

  if (importNode.progressPercent !== undefined && importNode.progressPercent !== null) {
    if (importNode.progressPercent >= 100) {
      studyStatus = "completed";
    } else if (importNode.progressPercent > 0) {
      studyStatus = "in_progress";
    } else {
      studyStatus = "not_started";
    }
  } else if (importNode.studyStatusText) {
    const lower = importNode.studyStatusText.toLowerCase();
    if (lower.includes("hoàn thành") || lower.includes("completed")) {
      studyStatus = "completed";
    } else if (lower.includes("đang học") || lower.includes("in_progress")) {
      studyStatus = "in_progress";
    } else if (lower.includes("ôn tập") || lower.includes("reviewing")) {
      studyStatus = "reviewing";
    } else if (lower.includes("chưa học") || lower.includes("not_started")) {
      studyStatus = "not_started";
    }
  }

  return {
    id: importNode.id,
    title: importNode.title,
    type: importNode.nodeType,
    domain,
    hopDistance: importNode.depth,
    edgeTypeToParent: importNode.edgeTypeToParent,
    edgeStrength: 3,
    studyStatus,
    progress: importNode.progressPercent,
    tags: [],
    children: importNode.children.map((child) =>
      convertImportAstToMindMapTreeNode(child, domain)
    ),
  };
}
