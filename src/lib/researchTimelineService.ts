/**
 * Research Timeline Service (Phase F7.0 Task 3)
 *
 * Consolidates notes, flashcards, reviews, and resources into a unified,
 * chronological event stream grouped into human-readable date buckets.
 *
 * Strictly zero database migrations: calculated purely at runtime.
 */

import type { Note, Resource, Topic } from "../types";
import type { Flashcard, FlashcardReview } from "../types/flashcard";

export type ResearchEventType =
  | "NOTE_CREATED"
  | "NOTE_UPDATED"
  | "FLASHCARD_CREATED"
  | "REVIEW_COMPLETED"
  | "RESOURCE_ADDED";

export interface ResearchTimelineEvent {
  id: string;
  type: ResearchEventType;
  title: string;
  snippet?: string;
  timestamp: string; // ISO 8601
  topicId: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export type TimelineDateBucketKey =
  | "Hôm nay"
  | "Hôm qua"
  | "Tuần này"
  | "Tháng này"
  | "Cũ hơn";

export interface TimelineDateBucket {
  key: TimelineDateBucketKey;
  label: string;
  events: ResearchTimelineEvent[];
}

export interface BuildTimelineOptions {
  topicId?: string;
  eventTypes?: ResearchEventType[];
  startDate?: string;
  endDate?: string;
  notes?: Note[];
  flashcards?: Flashcard[];
  reviews?: FlashcardReview[];
  resources?: Resource[];
  now?: Date;
}

/**
 * Builds a chronological event stream from all research assets.
 */
export function buildResearchTimeline(
  options: BuildTimelineOptions
): ResearchTimelineEvent[] {
  const events: ResearchTimelineEvent[] = [];
  const {
    topicId,
    eventTypes,
    startDate,
    endDate,
    notes = [],
    flashcards = [],
    reviews = [],
    resources = [],
  } = options;

  const startMs = startDate ? new Date(startDate).getTime() : 0;
  const endMs = endDate ? new Date(endDate).getTime() : Infinity;

  // 1. Process Notes
  for (const note of notes) {
    const noteTopicId = note.topicId || (note.topicIds && note.topicIds[0]) || "";
    if (topicId && noteTopicId !== topicId && !(note.topicIds && note.topicIds.includes(topicId))) {
      continue;
    }

    if (note.createdAt) {
      events.push({
        id: `evt-note-created-${note.id}`,
        type: "NOTE_CREATED",
        title: note.title || "Ghi chú mới",
        snippet: (note.content || "").slice(0, 150),
        timestamp: note.createdAt,
        topicId: noteTopicId,
        entityId: note.id,
        metadata: { tags: note.tags, isPrivate: note.isPrivate },
      });
    }

    // Include NOTE_UPDATED if modified after created by > 2 minutes
    if (note.updatedAt && note.createdAt) {
      const createdTime = new Date(note.createdAt).getTime();
      const updatedTime = new Date(note.updatedAt).getTime();
      if (updatedTime - createdTime > 120000) {
        events.push({
          id: `evt-note-updated-${note.id}-${updatedTime}`,
          type: "NOTE_UPDATED",
          title: `Cập nhật: ${note.title || "Ghi chú"}`,
          snippet: (note.content || "").slice(0, 150),
          timestamp: note.updatedAt,
          topicId: noteTopicId,
          entityId: note.id,
          metadata: { tags: note.tags },
        });
      }
    }
  }

  // 2. Process Flashcards
  const cardTopicMap = new Map<string, string>();
  for (const card of flashcards) {
    cardTopicMap.set(card.id, card.topicId);
    if (topicId && card.topicId !== topicId) {
      continue;
    }

    if (card.createdAt) {
      events.push({
        id: `evt-card-created-${card.id}`,
        type: "FLASHCARD_CREATED",
        title: card.front || "Thẻ flashcard mới",
        snippet: (card.back || "").slice(0, 120),
        timestamp: card.createdAt,
        topicId: card.topicId,
        entityId: card.id,
        metadata: { type: card.type, state: card.schedule?.state },
      });
    }
  }

  // 3. Process Reviews
  for (const rev of reviews) {
    const revTopicId =
      rev.topicId || (rev.flashcardId ? cardTopicMap.get(rev.flashcardId) : "") || "";
    if (topicId && revTopicId !== topicId) {
      continue;
    }

    if (rev.reviewedAt) {
      const ratingLabel =
        rev.rating === 4
          ? "Rất dễ (Easy)"
          : rev.rating === 3
          ? "Tốt (Good)"
          : rev.rating === 2
          ? "Khó (Hard)"
          : "Quên (Again)";

      events.push({
        id: `evt-rev-${rev.id}`,
        type: "REVIEW_COMPLETED",
        title: `Ôn tập thẻ: ${ratingLabel}`,
        snippet: `Thời lượng: ${(rev.reviewDurationMs / 1000).toFixed(1)}s • Điểm: ${rev.rating}/4`,
        timestamp: rev.reviewedAt,
        topicId: revTopicId,
        entityId: rev.flashcardId || rev.cardId || rev.id,
        metadata: {
          rating: rev.rating,
          stateBefore: rev.stateBefore,
          stateAfter: rev.stateAfter,
          reviewDurationMs: rev.reviewDurationMs,
        },
      });
    }
  }

  // 4. Process Resources
  for (const res of resources) {
    if (topicId && res.topicId !== topicId) {
      continue;
    }

    if (res.createdAt) {
      events.push({
        id: `evt-res-created-${res.id}`,
        type: "RESOURCE_ADDED",
        title: res.title || "Tài liệu mới",
        snippet: res.notes || res.url || res.filePath || "",
        timestamp: res.createdAt,
        topicId: res.topicId,
        entityId: res.id,
        metadata: { type: res.type, author: res.author, url: res.url },
      });
    }
  }

  // Apply filters
  let filtered = events;

  // Filter by eventTypes
  if (eventTypes && eventTypes.length > 0) {
    const typeSet = new Set(eventTypes);
    filtered = filtered.filter((e) => typeSet.has(e.type));
  }

  // Filter by date range
  if (startMs > 0 || endMs < Infinity) {
    filtered = filtered.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= startMs && t <= endMs;
    });
  }

  // Sort chronologically descending (newest first)
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return filtered;
}

/**
 * Groups events into relative human-readable date buckets:
 * - "Hôm nay" (Today)
 * - "Hôm qua" (Yesterday)
 * - "Tuần này" (Past 7 days)
 * - "Tháng này" (Past 30 days)
 * - "Cũ hơn" (Older)
 */
export function groupTimelineByDateBuckets(
  events: ResearchTimelineEvent[],
  now: Date = new Date()
): TimelineDateBucket[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;
  const monthStart = todayStart - 29 * 86400000;

  const buckets: Record<TimelineDateBucketKey, ResearchTimelineEvent[]> = {
    "Hôm nay": [],
    "Hôm qua": [],
    "Tuần này": [],
    "Tháng này": [],
    "Cũ hơn": [],
  };

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime();
    if (eventTime >= todayStart) {
      buckets["Hôm nay"].push(event);
    } else if (eventTime >= yesterdayStart) {
      buckets["Hôm qua"].push(event);
    } else if (eventTime >= weekStart) {
      buckets["Tuần này"].push(event);
    } else if (eventTime >= monthStart) {
      buckets["Tháng này"].push(event);
    } else {
      buckets["Cũ hơn"].push(event);
    }
  }

  const result: TimelineDateBucket[] = [];
  const keys: TimelineDateBucketKey[] = [
    "Hôm nay",
    "Hôm qua",
    "Tuần này",
    "Tháng này",
    "Cũ hơn",
  ];

  for (const key of keys) {
    if (buckets[key].length > 0) {
      result.push({
        key,
        label: key,
        events: buckets[key],
      });
    }
  }

  return result;
}
