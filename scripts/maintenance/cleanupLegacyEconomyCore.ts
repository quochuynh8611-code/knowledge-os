/**
 * Immutable canonical root category IDs targeted for cleanup.
 * Policy: DELETE, DO NOT MERGE, DO NOT RENAME, DO NOT REHOME.
 */
export const TARGET_ROOT_CATEGORY_IDS: readonly string[] = Object.freeze([
  "cat-root-kinh-te",
  "cat-root-kinh-te-hoc",
]);

export interface CleanupExecutionOptions {
  dryRun?: boolean;
  databaseTarget?: string;
}

export interface CleanupResultSummary {
  mode: "dry-run" | "execute";
  success: boolean;
  alreadyClean: boolean;
  database: string;
  timestamp: string;
  targets: {
    rootCategoryIds: string[];
    deletedCategoryIds: string[];
    deletedTopicIds: string[];
  };
  counts: {
    categoriesDeleted: number;
    topicsDeleted: number;
    exclusiveNotesDeleted: number;
    sharedNotesPreserved: number;
    sharedNoteLinksRemoved: number;
    primaryTopicReferencesRepaired: number;
  };
}

export interface CleanupDbClient {
  category: {
    findMany: (args?: {
      select?: { id?: boolean; parentId?: boolean };
    }) => Promise<Array<{ id: string; parentId: string | null }>>;
    deleteMany?: (args?: {
      where?: { id?: { in?: string[] } };
    }) => Promise<{ count: number }>;
  };
  topic: {
    findMany: (args?: {
      where?: { categoryId?: { in?: string[] } };
      select?: { id?: boolean; categoryId?: boolean };
    }) => Promise<Array<{ id: string; categoryId: string }>>;
    deleteMany?: (args?: {
      where?: { id?: { in?: string[] } };
    }) => Promise<{ count: number }>;
  };
  note: {
    findMany: (args?: {
      select?: { id?: boolean; topicId?: boolean };
    }) => Promise<Array<{ id: string; topicId: string }>>;
    update?: (args: {
      where: { id: string };
      data: { topicId: string };
    }) => Promise<unknown>;
    deleteMany?: (args?: {
      where?: { id?: { in?: string[] } };
    }) => Promise<{ count: number }>;
  };
  noteTopicLink: {
    findMany: (args?: {
      select?: { noteId?: boolean; topicId?: boolean };
    }) => Promise<Array<{ noteId: string; topicId: string }>>;
    deleteMany?: (args?: {
      where?: { topicId?: { in?: string[] } };
    }) => Promise<{ count: number }>;
  };
  $transaction?: (
    fn: (tx: CleanupDbClient) => Promise<CleanupResultSummary>
  ) => Promise<CleanupResultSummary>;
}

export type PrismaTransactionable = CleanupDbClient;

interface ComputedPlan {
  deletedCategoryIds: string[];
  deletedTopicIds: string[];
  exclusiveNoteIds: string[];
  sharedNotesToRepair: Array<{ noteId: string; newPrimaryTopicId: string }>;
  sharedNoteLinksToRemoveCount: number;
  sharedNotesPreservedCount: number;
}

/**
 * Computes all affected category IDs, topic IDs, and handles shared vs exclusive note segregation.
 */
async function computeCleanupPlan(db: CleanupDbClient): Promise<ComputedPlan> {
  const allCategories = await db.category.findMany({
    select: { id: true, parentId: true },
  });

  const deletedCategoryIdsSet = new Set<string>();
  for (const rootId of TARGET_ROOT_CATEGORY_IDS) {
    if (allCategories.some((c) => c.id === rootId)) {
      deletedCategoryIdsSet.add(rootId);
    }
  }

  // Traverse hierarchy to collect all descendant categories
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const cat of allCategories) {
      if (
        cat.parentId &&
        deletedCategoryIdsSet.has(cat.parentId) &&
        !deletedCategoryIdsSet.has(cat.id)
      ) {
        deletedCategoryIdsSet.add(cat.id);
        expanded = true;
      }
    }
  }

  const deletedCategoryIds = Array.from(deletedCategoryIdsSet);

  if (deletedCategoryIds.length === 0) {
    return {
      deletedCategoryIds: [],
      deletedTopicIds: [],
      exclusiveNoteIds: [],
      sharedNotesToRepair: [],
      sharedNoteLinksToRemoveCount: 0,
      sharedNotesPreservedCount: 0,
    };
  }

  const affectedTopics = await db.topic.findMany({
    where: { categoryId: { in: deletedCategoryIds } },
    select: { id: true, categoryId: true },
  });

  const deletedTopicIds = affectedTopics
    .filter((t) => deletedCategoryIdsSet.has(t.categoryId))
    .map((t) => t.id);
  const deletedTopicIdsSet = new Set(deletedTopicIds);

  if (deletedTopicIds.length === 0) {
    return {
      deletedCategoryIds,
      deletedTopicIds: [],
      exclusiveNoteIds: [],
      sharedNotesToRepair: [],
      sharedNoteLinksToRemoveCount: 0,
      sharedNotesPreservedCount: 0,
    };
  }

  // Query notes and multi-topic links to determine shared vs exclusive notes
  const [allNotes, allLinks] = await Promise.all([
    db.note.findMany({
      select: { id: true, topicId: true },
    }),
    db.noteTopicLink.findMany({
      select: { noteId: true, topicId: true },
    }),
  ]);

  // Group links by noteId
  const noteLinksMap = new Map<string, Set<string>>();
  for (const link of allLinks) {
    const existing = noteLinksMap.get(link.noteId) || new Set<string>();
    existing.add(link.topicId);
    noteLinksMap.set(link.noteId, existing);
  }

  const exclusiveNoteIds: string[] = [];
  const sharedNotesToRepair: Array<{ noteId: string; newPrimaryTopicId: string }> = [];
  let sharedNoteLinksToRemoveCount = 0;
  let sharedNotesPreservedCount = 0;

  for (const note of allNotes) {
    const linkedTopics = new Set<string>(noteLinksMap.get(note.id) || []);
    if (note.topicId) {
      linkedTopics.add(note.topicId);
    }

    // Check if this note is associated with any deleted topic
    const hasDeletedTopicAssociation = Array.from(linkedTopics).some((tid) =>
      deletedTopicIdsSet.has(tid)
    );

    if (!hasDeletedTopicAssociation) {
      continue;
    }

    // Find surviving topics that are NOT deleted
    const survivingTopicIds = Array.from(linkedTopics).filter(
      (tid) => !deletedTopicIdsSet.has(tid)
    );

    if (survivingTopicIds.length === 0) {
      // Exclusive note — belongs only to deleted topic(s)
      exclusiveNoteIds.push(note.id);
    } else {
      // Shared note — belongs to at least one valid surviving topic
      sharedNotesPreservedCount++;

      // Count links to be deleted for this shared note
      const linksToDelete = Array.from(linkedTopics).filter((tid) =>
        deletedTopicIdsSet.has(tid)
      );
      sharedNoteLinksToRemoveCount += linksToDelete.length;

      // If note's primary topicId is in deleted topics, repair FK to surviving topic
      if (deletedTopicIdsSet.has(note.topicId)) {
        sharedNotesToRepair.push({
          noteId: note.id,
          newPrimaryTopicId: survivingTopicIds[0],
        });
      }
    }
  }

  return {
    deletedCategoryIds,
    deletedTopicIds,
    exclusiveNoteIds,
    sharedNotesToRepair,
    sharedNoteLinksToRemoveCount,
    sharedNotesPreservedCount,
  };
}

/**
 * Pure execution function for Legacy Economy Domain Cleanup.
 * Supports Dry-Run preview and atomic Transactional execution.
 */
export async function executeLegacyEconomyCleanup(
  db: CleanupDbClient,
  options: CleanupExecutionOptions = {}
): Promise<CleanupResultSummary> {
  const dryRun = options.dryRun !== false;
  const database = options.databaseTarget || "localhost:5432/knowledge_os";
  const timestamp = new Date().toISOString();

  if (dryRun) {
    const plan = await computeCleanupPlan(db);
    const alreadyClean =
      plan.deletedCategoryIds.length === 0 && plan.deletedTopicIds.length === 0;

    return {
      mode: "dry-run",
      success: true,
      alreadyClean,
      database,
      timestamp,
      targets: {
        rootCategoryIds: Array.from(TARGET_ROOT_CATEGORY_IDS),
        deletedCategoryIds: plan.deletedCategoryIds,
        deletedTopicIds: plan.deletedTopicIds,
      },
      counts: {
        categoriesDeleted: plan.deletedCategoryIds.length,
        topicsDeleted: plan.deletedTopicIds.length,
        exclusiveNotesDeleted: plan.exclusiveNoteIds.length,
        sharedNotesPreserved: plan.sharedNotesPreservedCount,
        sharedNoteLinksRemoved: plan.sharedNoteLinksToRemoveCount,
        primaryTopicReferencesRepaired: plan.sharedNotesToRepair.length,
      },
    };
  }

  // Execute Mode: Perform within atomic transaction with real-time recomputed plan
  if (!db.$transaction) {
    throw new Error(
      "Database client with $transaction support is required for execution mode"
    );
  }

  return db.$transaction(async (tx) => {
    const plan = await computeCleanupPlan(tx);

    const alreadyClean =
      plan.deletedCategoryIds.length === 0 && plan.deletedTopicIds.length === 0;

    if (alreadyClean) {
      return {
        mode: "execute",
        success: true,
        alreadyClean: true,
        database,
        timestamp,
        targets: {
          rootCategoryIds: Array.from(TARGET_ROOT_CATEGORY_IDS),
          deletedCategoryIds: [],
          deletedTopicIds: [],
        },
        counts: {
          categoriesDeleted: 0,
          topicsDeleted: 0,
          exclusiveNotesDeleted: 0,
          sharedNotesPreserved: 0,
          sharedNoteLinksRemoved: 0,
          primaryTopicReferencesRepaired: 0,
        },
      };
    }

    // 1. Repair shared notes primary topic FK first to avoid CASCADE deletion
    if (tx.note.update) {
      for (const repair of plan.sharedNotesToRepair) {
        await tx.note.update({
          where: { id: repair.noteId },
          data: { topicId: repair.newPrimaryTopicId },
        });
      }
    }

    // 2. Remove shared note links to affected topics
    if (tx.noteTopicLink.deleteMany && plan.deletedTopicIds.length > 0) {
      await tx.noteTopicLink.deleteMany({
        where: { topicId: { in: plan.deletedTopicIds } },
      });
    }

    // 3. Delete exclusive notes safely
    if (tx.note.deleteMany && plan.exclusiveNoteIds.length > 0) {
      await tx.note.deleteMany({
        where: { id: { in: plan.exclusiveNoteIds } },
      });
    }

    // 4. Delete root and descendant categories (FK cascade removes topics, resources, SRS, etc.)
    if (tx.category.deleteMany && plan.deletedCategoryIds.length > 0) {
      await tx.category.deleteMany({
        where: { id: { in: plan.deletedCategoryIds } },
      });
    }

    return {
      mode: "execute",
      success: true,
      alreadyClean: false,
      database,
      timestamp,
      targets: {
        rootCategoryIds: Array.from(TARGET_ROOT_CATEGORY_IDS),
        deletedCategoryIds: plan.deletedCategoryIds,
        deletedTopicIds: plan.deletedTopicIds,
      },
      counts: {
        categoriesDeleted: plan.deletedCategoryIds.length,
        topicsDeleted: plan.deletedTopicIds.length,
        exclusiveNotesDeleted: plan.exclusiveNoteIds.length,
        sharedNotesPreserved: plan.sharedNotesPreservedCount,
        sharedNoteLinksRemoved: plan.sharedNoteLinksToRemoveCount,
        primaryTopicReferencesRepaired: plan.sharedNotesToRepair.length,
      },
    };
  });
}
