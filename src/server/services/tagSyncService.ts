import type { Prisma } from "@prisma/client";
import {
  normalizeTopicTags,
  generateTagSlug,
} from "../../lib/researchStorageHelpers";

/**
 * Canonical Topic Tag Synchronization Service (ADR-079 / PR-2)
 *
 * Guarantees:
 * 1. TopicTag join table is the canonical source of truth for Topic <-> Tag relations.
 * 2. Topic.tags String[] is strictly a synchronized denormalized read projection.
 * 3. Prunes all obsolete relations when tags are removed or cleared ([]).
 * 4. Idempotent: replay with the same tag set avoids redundant deletions or insertions.
 * 5. Sanitizes whitespace, strips empty entries, and deduplicates tags.
 */
export async function syncTopicTags(
  tx: Prisma.TransactionClient | any,
  topicId: string,
  rawTags: string[],
): Promise<string[]> {
  const normalizedTags = normalizeTopicTags(rawTags || []);

  if (!tx.tag || !tx.topicTag) {
    if (tx.topic?.update) {
      await tx.topic.update({
        where: { id: topicId },
        data: { tags: normalizedTags },
      });
    }
    return normalizedTags;
  }

  // 1. Upsert all active tags and gather records
  const tagRecords: { id: string; slug: string; name: string }[] = [];
  for (const tagName of normalizedTags) {
    const slug = generateTagSlug(tagName);
    const tag = await tx.tag.upsert({
      where: { slug },
      create: {
        id: `tag-${slug}`,
        name: tagName,
        slug,
        color: "#D97706",
        count: 0,
      },
      update: {
        name: tagName,
      },
    });
    tagRecords.push(tag);
  }

  const currentTagIds = new Set(tagRecords.map((t) => t.id));

  // 2. Find existing TopicTag relations for this topic
  const existingLinks = (await tx.topicTag.findMany({
    where: { topicId },
  })) || [];

  // 3. Prune obsolete TopicTag relations (including when normalizedTags is empty)
  const linksToDelete = existingLinks.filter(
    (link: any) => !currentTagIds.has(link.tagId),
  );
  if (linksToDelete.length > 0) {
    await tx.topicTag.deleteMany({
      where: {
        topicId,
        tagId: { in: linksToDelete.map((l: any) => l.tagId) },
      },
    });
  }

  // 4. Create new TopicTag relations that do not exist yet
  const existingTagIds = new Set(existingLinks.map((l: any) => l.tagId));
  for (const tag of tagRecords) {
    if (!existingTagIds.has(tag.id)) {
      await tx.topicTag.upsert({
        where: {
          topicId_tagId: {
            topicId,
            tagId: tag.id,
          },
        },
        create: {
          topicId,
          tagId: tag.id,
        },
        update: {},
      });
    }
  }

  // 5. Synchronize Topic.tags denormalized projection
  if (tx.topic?.update) {
    await tx.topic.update({
      where: { id: topicId },
      data: {
        tags: normalizedTags,
      },
    });
  }

  return normalizedTags;
}
