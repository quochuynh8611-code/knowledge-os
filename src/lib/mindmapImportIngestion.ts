import { MindMapImportNode } from "./mindmapImportParser";
import { Topic, KnowledgeLink, LinkType } from "../types";

export type DedupeStrategy = "skip-and-reuse" | "create-with-suffix" | "strict-abort";

export interface IngestionOptions {
  targetCategoryId: string;
  targetCategoryType?: string;
  dedupeStrategy?: DedupeStrategy;
}

export interface IngestionPort {
  getExistingTopics: () => Topic[];
  createTopic: (
    topicData: Omit<Topic, "id" | "createdAt" | "updatedAt" | "studyProgress" | "links">
  ) => string | Promise<string>;
  deleteTopic: (id: string) => void | Promise<void>;
  createKnowledgeLink: (linkData: Omit<KnowledgeLink, "id">) => void | Promise<void>;
  deleteKnowledgeLink?: (linkId: string) => void | Promise<void>;
}

export interface IngestionResult {
  success: boolean;
  createdTopicIds: string[];
  reusedTopicIds: string[];
  createdLinkCount: number;
  errorMessage?: string;
}

/**
 * Validates if the tree contains duplicates when strict-abort is chosen
 */
function findDuplicateTitles(
  ast: MindMapImportNode,
  existingTitlesMap: Map<string, Topic>
): string | null {
  const normalizedTitle = ast.title.trim().toLowerCase();
  if (existingTitlesMap.has(normalizedTitle)) {
    return ast.title;
  }
  for (const child of ast.children) {
    const dup = findDuplicateTitles(child, existingTitlesMap);
    if (dup) return dup;
  }
  return null;
}

/**
 * Pure Ingestion Engine for Mind Map Import (Phase I3)
 * Implements topological ordering, deduplication strategies, and compensation rollback.
 */
export async function ingestMindMapAst(
  ast: MindMapImportNode,
  options: IngestionOptions,
  port: IngestionPort
): Promise<IngestionResult> {
  const dedupeStrategy: DedupeStrategy = options.dedupeStrategy || "skip-and-reuse";
  const existingTopics = port.getExistingTopics();
  const existingTitlesMap = new Map<string, Topic>();

  for (const topic of existingTopics) {
    existingTitlesMap.set(topic.title.trim().toLowerCase(), topic);
  }

  // Pre-check for strict-abort strategy
  if (dedupeStrategy === "strict-abort") {
    const duplicate = findDuplicateTitles(ast, existingTitlesMap);
    if (duplicate) {
      throw new Error(
        `Phát hiện chủ đề trùng lặp: "${duplicate}" với chính sách strict-abort. Quá trình nhập bị hủy bỏ.`
      );
    }
  }

  const createdTopicIds: string[] = [];
  const reusedTopicIds: string[] = [];
  let createdLinkCount = 0;

  try {
    async function processNode(
      node: MindMapImportNode,
      parentPersistentId: string | null
    ): Promise<void> {
      const normalizedTitle = node.title.trim().toLowerCase();
      const existingTopic = existingTitlesMap.get(normalizedTitle);
      let persistentId: string;

      if (existingTopic && dedupeStrategy === "skip-and-reuse") {
        persistentId = existingTopic.id;
        if (!reusedTopicIds.includes(persistentId)) {
          reusedTopicIds.push(persistentId);
        }
      } else {
        const titleToCreate =
          existingTopic && dedupeStrategy === "create-with-suffix"
            ? `${node.title} (Nhập mới)`
            : node.title;

        persistentId = await port.createTopic({
          title: titleToCreate,
          slug: titleToCreate
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          categoryId: options.targetCategoryId,
          type: options.targetCategoryType || "phat_hoc",
          parentId: parentPersistentId || null,
          description: "",
          content: "",
          tags: [],
          visibility: "active",
        });

        createdTopicIds.push(persistentId);
      }

      // If there is a parent, create a KnowledgeLink connecting parent -> child
      if (parentPersistentId && parentPersistentId !== persistentId) {
        const validLinkTypes: LinkType[] = [
          "prerequisite",
          "advanced",
          "related",
          "contradicts",
        ];
        const linkType: LinkType =
          node.edgeTypeToParent &&
          validLinkTypes.includes(node.edgeTypeToParent as LinkType)
            ? (node.edgeTypeToParent as LinkType)
            : "related";

        await port.createKnowledgeLink({
          sourceId: parentPersistentId,
          targetId: persistentId,
          linkType,
          strength: 3,
        });
        createdLinkCount++;
      }

      // Process children in topological order (parent first, then children)
      for (const child of node.children) {
        await processNode(child, persistentId);
      }
    }

    await processNode(ast, null);

    return {
      success: true,
      createdTopicIds,
      reusedTopicIds,
      createdLinkCount,
    };
  } catch (error: any) {
    // Compensation Action Rollback: Delete any topics created in reverse order
    for (const id of createdTopicIds.slice().reverse()) {
      try {
        await port.deleteTopic(id);
      } catch (rollbackErr) {
        console.error(`[IngestionRollback] Failed to rollback topic ${id}:`, rollbackErr);
      }
    }
    throw error;
  }
}
