/**
 * Legacy Economy Domain Cleanup Core Logic.
 * Policy: DELETE, DO NOT MERGE, DO NOT RENAME, DO NOT REHOME.
 */

export interface LegacyTargetIdentitySpec {
  readonly canonicalId: string;
  readonly name: string;
  readonly slug: string;
  readonly expectedType: string;
}

/**
 * Immutable identity specifications for legacy economy targets.
 */
export const IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST: readonly LegacyTargetIdentitySpec[] = Object.freeze([
  Object.freeze({
    canonicalId: "cat-root-kinh-te",
    name: "Kinh Tế",
    slug: "kinh-te",
    expectedType: "kinh-te",
  }),
  Object.freeze({
    canonicalId: "cat-root-kinh-te-hoc",
    name: "Kinh Tế Học",
    slug: "kinh-te-hoc",
    expectedType: "kinh-te-hoc",
  }),
]);

/**
 * Protected category identities that must never be selected, altered, or deleted.
 */
export const PROTECTED_CATEGORY_IDENTIFIERS = Object.freeze({
  ids: Object.freeze(["cat-1772360000100", "cat-root-kinh-te-tai-chinh"]),
  names: Object.freeze(["Kinh Tế & Tài Chính"]),
  slugs: Object.freeze(["kinh-te-tai-chinh"]),
});

export interface MatchedRootItem {
  id: string;
  name: string;
  slug: string;
  matchReason: "canonical-id" | "exact-name-and-slug";
}

export interface AmbiguousRootItem {
  id: string;
  name: string;
  slug: string;
  reason: string;
}

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
  matchedRoots: MatchedRootItem[];
  ambiguousRoots: AmbiguousRootItem[];
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

export interface CategoryRecord {
  id: string;
  name?: string | null;
  slug?: string | null;
  type?: string | null;
  parentId: string | null;
}

export interface CleanupDbClient {
  category: {
    findMany: (args?: {
      select?: {
        id?: boolean;
        name?: boolean;
        slug?: boolean;
        type?: boolean;
        parentId?: boolean;
      };
    }) => Promise<CategoryRecord[]>;
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

interface TargetResolutionResult {
  matchedRoots: MatchedRootItem[];
  ambiguousRoots: AmbiguousRootItem[];
}

/**
 * Pure target matcher algorithm implementing identity allowlist, canonical safety,
 * explicit protection exclusion, and fail-closed ambiguity checks.
 */
export function resolveTargetRootCategories(
  categories: CategoryRecord[]
): TargetResolutionResult {
  const matchedRoots: MatchedRootItem[] = [];
  const ambiguousRoots: AmbiguousRootItem[] = [];

  const isProtected = (cat: CategoryRecord): boolean => {
    const name = cat.name ? cat.name.trim() : "";
    const slug = cat.slug ? cat.slug.trim() : "";
    return (
      PROTECTED_CATEGORY_IDENTIFIERS.ids.includes(cat.id) ||
      PROTECTED_CATEGORY_IDENTIFIERS.names.includes(name) ||
      PROTECTED_CATEGORY_IDENTIFIERS.slugs.includes(slug)
    );
  };

  // Only consider root candidates (parentId is null, undefined, or empty)
  const rootCandidates = categories.filter(
    (c) => !c.parentId || c.parentId.trim() === ""
  );

  for (const cat of rootCandidates) {
    if (isProtected(cat)) {
      continue;
    }

    const name = cat.name ? cat.name.trim() : "";
    const slug = cat.slug ? cat.slug.trim() : "";
    const type = cat.type ? cat.type.trim() : "";

    // 1. Check if ID matches a canonical spec
    const canonicalSpec = IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST.find(
      (spec) => spec.canonicalId === cat.id
    );

    if (canonicalSpec) {
      const hasNameConflict = name !== "" && name !== canonicalSpec.name;
      const hasSlugConflict = slug !== "" && slug !== canonicalSpec.slug;
      const hasTypeConflict = type !== "" && type !== canonicalSpec.expectedType;

      if (hasNameConflict || hasSlugConflict || hasTypeConflict) {
        ambiguousRoots.push({
          id: cat.id,
          name,
          slug,
          reason: `Canonical ID ${cat.id} has contradictory metadata (name="${name}", slug="${slug}", type="${type}")`,
        });
      } else {
        matchedRoots.push({
          id: cat.id,
          name: name || canonicalSpec.name,
          slug: slug || canonicalSpec.slug,
          matchReason: "canonical-id",
        });
      }
      continue;
    }

    // 2. Check dynamic IDs against semantic identity specs
    let matchedSemanticSpec: LegacyTargetIdentitySpec | null = null;
    let hasSemanticAmbiguity = false;

    for (const spec of IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST) {
      const isExactNameAndSlug = name === spec.name && slug === spec.slug;

      if (isExactNameAndSlug) {
        if (type === "" || type === spec.expectedType) {
          matchedSemanticSpec = spec;
        } else {
          ambiguousRoots.push({
            id: cat.id,
            name,
            slug,
            reason: `Category ${cat.id} matched name and slug for "${spec.name}" but has incompatible type "${type}" (expected "${spec.expectedType}")`,
          });
          hasSemanticAmbiguity = true;
        }
        break;
      }

      // Partial / conflicting match against this spec
      if (name === spec.name && slug !== spec.slug) {
        ambiguousRoots.push({
          id: cat.id,
          name,
          slug,
          reason: `Category ${cat.id} has matching name "${name}" but conflicting slug "${slug}" (expected "${spec.slug}")`,
        });
        hasSemanticAmbiguity = true;
        break;
      }

      if (slug === spec.slug && name !== spec.name) {
        ambiguousRoots.push({
          id: cat.id,
          name,
          slug,
          reason: `Category ${cat.id} has matching slug "${slug}" but conflicting name "${name}" (expected "${spec.name}")`,
        });
        hasSemanticAmbiguity = true;
        break;
      }
    }

    if (matchedSemanticSpec && !hasSemanticAmbiguity) {
      matchedRoots.push({
        id: cat.id,
        name,
        slug,
        matchReason: "exact-name-and-slug",
      });
    }
  }

  return {
    matchedRoots,
    ambiguousRoots,
  };
}

interface ComputedPlan {
  matchedRoots: MatchedRootItem[];
  ambiguousRoots: AmbiguousRootItem[];
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
    select: { id: true, name: true, slug: true, type: true, parentId: true },
  });

  const { matchedRoots, ambiguousRoots } = resolveTargetRootCategories(allCategories);

  if (ambiguousRoots.length > 0 || matchedRoots.length === 0) {
    return {
      matchedRoots,
      ambiguousRoots,
      deletedCategoryIds: [],
      deletedTopicIds: [],
      exclusiveNoteIds: [],
      sharedNotesToRepair: [],
      sharedNoteLinksToRemoveCount: 0,
      sharedNotesPreservedCount: 0,
    };
  }

  const deletedCategoryIdsSet = new Set<string>(matchedRoots.map((r) => r.id));

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
      matchedRoots,
      ambiguousRoots,
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
    matchedRoots,
    ambiguousRoots,
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
      plan.ambiguousRoots.length === 0 &&
      plan.deletedCategoryIds.length === 0 &&
      plan.deletedTopicIds.length === 0;

    return {
      mode: "dry-run",
      success: true,
      alreadyClean,
      database,
      timestamp,
      matchedRoots: plan.matchedRoots,
      ambiguousRoots: plan.ambiguousRoots,
      targets: {
        rootCategoryIds: plan.matchedRoots.map((r) => r.id),
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

  // Pre-check plan before transaction to fail closed on ambiguity with zero writes
  const initialPlan = await computeCleanupPlan(db);
  if (initialPlan.ambiguousRoots.length > 0) {
    throw new Error(
      `Ambiguous root categories detected: ${initialPlan.ambiguousRoots
        .map((r) => `${r.id} (${r.reason})`)
        .join("; ")}`
    );
  }

  // Execute Mode: Perform within atomic transaction with real-time recomputed plan
  if (!db.$transaction) {
    throw new Error(
      "Database client with $transaction support is required for execution mode"
    );
  }

  return db.$transaction(async (tx) => {
    const plan = await computeCleanupPlan(tx);

    if (plan.ambiguousRoots.length > 0) {
      throw new Error(
        `Ambiguous root categories detected: ${plan.ambiguousRoots
          .map((r) => `${r.id} (${r.reason})`)
          .join("; ")}`
      );
    }

    const alreadyClean =
      plan.deletedCategoryIds.length === 0 && plan.deletedTopicIds.length === 0;

    if (alreadyClean) {
      return {
        mode: "execute",
        success: true,
        alreadyClean: true,
        database,
        timestamp,
        matchedRoots: plan.matchedRoots,
        ambiguousRoots: [],
        targets: {
          rootCategoryIds: plan.matchedRoots.map((r) => r.id),
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
      matchedRoots: plan.matchedRoots,
      ambiguousRoots: [],
      targets: {
        rootCategoryIds: plan.matchedRoots.map((r) => r.id),
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
