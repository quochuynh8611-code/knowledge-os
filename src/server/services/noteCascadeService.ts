import type { Prisma } from "@prisma/client";

/**
 * Note Cascade Safety Service (ADR-079 / PR-3)
 *
 * Guarantees:
 * 1. NoteTopicLink is the Canonical Source of Truth for Note <-> Topic relations.
 * 2. Note.topicId is strictly a primary-topic pointer (nullable), not ownership.
 * 3. Deleting a Topic never deletes a Note:
 *    - If Note has secondary topics in NoteTopicLink, reassign Note.topicId to first remaining topic.
 *    - If Note has no secondary topics, set Note.topicId = null (unclassified note).
 * 4. Prunes all NoteTopicLink relations associated with the deleted topic.
 */

/**
 * Pure algorithm for determining the next primary topicId of a note
 * when a topic is deleted.
 */
export function computeNextPrimaryTopic(
  currentPrimaryId: string | null,
  deletedTopicId: string,
  remainingTopicIds: string[],
): string | null {
  // If the deleted topic is not the note's current primary topic, preserve current primary
  if (currentPrimaryId !== deletedTopicId) {
    return currentPrimaryId;
  }

  // Filter out the deleted topic from the remaining list in case it's still present
  const available = (remainingTopicIds || []).filter(
    (tid) => tid && tid !== deletedTopicId,
  );

  // Return the first surviving secondary topic, or null if none remain
  return available.length > 0 ? available[0] : null;
}

/**
 * Safely deletes a topic without cascade-deleting associated notes.
 */
export async function deleteTopicSafely(
  tx: Prisma.TransactionClient | any,
  topicId: string,
): Promise<{ success: boolean; id: string }> {
  // 1. Find all notes where topicId is currently the primary topic
  const primaryNotes =
    typeof tx.note?.findMany === "function"
      ? (await tx.note.findMany({
          where: { topicId },
        })) || []
      : [];

  // 2. For each note whose primary topic is being deleted, reassign or set null
  for (const note of primaryNotes) {
    let secondaryTopicIds: string[] = [];
    if (typeof tx.noteTopicLink?.findMany === "function") {
      const links = await tx.noteTopicLink.findMany({
        where: { noteId: note.id },
      });
      secondaryTopicIds = (links || []).map((l: any) => l.topicId);
    }

    const nextPrimaryId = computeNextPrimaryTopic(
      note.topicId,
      topicId,
      secondaryTopicIds,
    );

    if (typeof tx.note?.update === "function") {
      await tx.note.update({
        where: { id: note.id },
        data: { topicId: nextPrimaryId },
      });
    }
  }

  // 3. Prune all NoteTopicLink relations for this topic
  if (typeof tx.noteTopicLink?.deleteMany === "function") {
    await tx.noteTopicLink.deleteMany({
      where: { topicId },
    });
  }

  // 4. Finally delete the topic itself
  await tx.topic.delete({
    where: { id: topicId },
  });

  return { success: true, id: topicId };
}

/**
 * Canonical synchronization and pruning helper for NoteTopicLink join table.
 */
export async function syncNoteTopicLinks(
  tx: Prisma.TransactionClient | any,
  noteId: string,
  targetTopicIds: string[],
): Promise<string[]> {
  if (!tx.noteTopicLink) return targetTopicIds;

  const existingLinks = (await tx.noteTopicLink.findMany({
    where: { noteId },
  })) || [];

  const existingTopicIds = new Set<string>(
    (existingLinks || []).map((l: any) => String(l.topicId)),
  );
  const newTopicIds = new Set<string>(targetTopicIds);

  // 1. Prune obsolete links
  const toRemove = [...existingTopicIds].filter((tid) => !newTopicIds.has(tid));
  if (toRemove.length > 0) {
    await tx.noteTopicLink.deleteMany({
      where: {
        noteId,
        topicId: { in: toRemove },
      },
    });
  }

  // 2. Create new links that don't exist yet
  for (const tid of targetTopicIds) {
    if (!existingTopicIds.has(tid)) {
      await tx.noteTopicLink.upsert({
        where: {
          noteId_topicId: { noteId, topicId: tid },
        },
        create: {
          noteId,
          topicId: tid,
        },
        update: {},
      });
    }
  }

  return targetTopicIds;
}
