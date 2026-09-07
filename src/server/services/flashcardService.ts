/**
 * Flashcard Service Layer for Knowledge OS.
 * Manages flashcard CRUD, atomic Option A idempotent review processing,
 * due queue queries, and progress analytics.
 */

import { prisma } from "../../lib/prisma";
import { calculateFlashcardNextReview } from "../../lib/flashcardScheduler";
import {
  FlashcardCreateSchema,
  FlashcardUpdateSchema,
  FlashcardReviewInputSchema,
} from "../../lib/validation";
import type {
  Flashcard,
  FlashcardSchedule,
  FlashcardReview,
  FlashcardReviewResponse,
  FlashcardState,
  FlashcardLifecycleStatus,
  FlashcardPriorityFilter,
} from "../../types/flashcard";
import {
  calculateStreakDays,
  isLowRetention,
} from "../../lib/flashcardReviewSessionUtils";
import { Prisma } from "@prisma/client";

export interface FlashcardProgressStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
  retentionRate: number; // percentage (0 - 100)
  streakDays?: number;
}

function mapPrismaFlashcard(record: any): Flashcard {
  return {
    id: record.id,
    topicId: record.topicId,
    noteId: record.noteId ?? undefined,
    resourceId: record.resourceId ?? undefined,
    type: record.type,
    front: record.front,
    back: record.back,
    lifecycleStatus: record.lifecycleStatus as FlashcardLifecycleStatus,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
    updatedAt:
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : record.updatedAt,
    schedule: record.schedule ? mapPrismaSchedule(record.schedule) : undefined,
  };
}

function mapPrismaSchedule(record: any, retentionRate?: number): FlashcardSchedule {
  return {
    id: record.id,
    flashcardId: record.flashcardId,
    cardId: record.flashcardId,
    state: record.state as FlashcardState,
    dueAt:
      record.dueAt instanceof Date
        ? record.dueAt.toISOString()
        : record.dueAt,
    due:
      record.dueAt instanceof Date
        ? record.dueAt.toISOString()
        : record.dueAt,
    interval: record.interval,
    easeFactor: record.easeFactor,
    repetitions: record.repetitions,
    lapses: record.lapses,
    lastReviewedAt:
      record.lastReviewedAt instanceof Date
        ? record.lastReviewedAt.toISOString()
        : record.lastReviewedAt ?? null,
    lastReviewed:
      record.lastReviewedAt instanceof Date
        ? record.lastReviewedAt.toISOString()
        : record.lastReviewedAt ?? null,
    retentionRate: record.retentionRate ?? retentionRate,
    updatedAt:
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : record.updatedAt,
  };
}

function mapPrismaReview(record: any): FlashcardReview {
  return {
    id: record.id,
    clientEventId: record.clientEventId,
    flashcardId: record.flashcardId,
    cardId: record.flashcardId,
    topicId: record.topicId,
    rating: record.rating,
    reviewDurationMs: record.reviewDurationMs,
    reviewedAt:
      record.reviewedAt instanceof Date
        ? record.reviewedAt.toISOString()
        : record.reviewedAt,
    stateBefore: record.stateBefore as FlashcardState,
    stateAfter: record.stateAfter as FlashcardState,
    intervalBefore: record.intervalBefore,
    intervalAfter: record.intervalAfter,
    easeFactorBefore: record.easeFactorBefore,
    easeFactorAfter: record.easeFactorAfter,
    dueBeforeAt:
      record.dueBeforeAt instanceof Date
        ? record.dueBeforeAt.toISOString()
        : record.dueBeforeAt,
    dueBefore:
      record.dueBeforeAt instanceof Date
        ? record.dueBeforeAt.toISOString()
        : record.dueBeforeAt,
    dueAfterAt:
      record.dueAfterAt instanceof Date
        ? record.dueAfterAt.toISOString()
        : record.dueAfterAt,
    dueAfter:
      record.dueAfterAt instanceof Date
        ? record.dueAfterAt.toISOString()
        : record.dueAfterAt,
  };
}

/**
 * Creates a new flashcard with an initial 1:1 schedule record.
 */
export async function createFlashcard(input: unknown): Promise<Flashcard> {
  const validated = FlashcardCreateSchema.parse(input);

  return await prisma.$transaction(async (tx) => {
    const card = await tx.flashcard.create({
      data: {
        topicId: validated.topicId,
        noteId: validated.noteId ?? null,
        resourceId: validated.resourceId ?? null,
        type: validated.type,
        front: validated.front,
        back: validated.back,
        lifecycleStatus: validated.lifecycleStatus,
      },
    });

    const schedule = await tx.flashcardSchedule.create({
      data: {
        flashcardId: card.id,
        state: "new",
        dueAt: new Date(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
      },
    });

    return mapPrismaFlashcard({ ...card, schedule });
  });
}

/**
 * Updates content or lifecycle status of an existing flashcard.
 */
export async function updateFlashcard(
  id: string,
  input: unknown
): Promise<Flashcard> {
  const validated = FlashcardUpdateSchema.parse(input);

  const updated = await prisma.flashcard.update({
    where: { id },
    data: {
      ...(validated.topicId ? { topicId: validated.topicId } : {}),
      ...(validated.noteId !== undefined ? { noteId: validated.noteId } : {}),
      ...(validated.resourceId !== undefined
        ? { resourceId: validated.resourceId }
        : {}),
      ...(validated.type ? { type: validated.type } : {}),
      ...(validated.front ? { front: validated.front } : {}),
      ...(validated.back !== undefined ? { back: validated.back } : {}),
      ...(validated.lifecycleStatus
        ? { lifecycleStatus: validated.lifecycleStatus }
        : {}),
    },
    include: { schedule: true },
  });

  return mapPrismaFlashcard(updated);
}

/**
 * Deletes a flashcard by ID (cascades to schedule and reviews).
 */
export async function deleteFlashcard(id: string): Promise<boolean> {
  await prisma.flashcard.delete({
    where: { id },
  });
  return true;
}

/**
 * Tạm ngưng một thẻ duplicate từ Duplicate Detection Dashboard.
 *
 * Contract:
 * - Nếu `expectedTopicId` có mặt (Topic-scoped mode):
 *   Fetch card → kiểm tra card.topicId === expectedTopicId.
 *   Nếu mismatch → throw TopicScopeMismatchError (HTTP 403).
 *   Không mutate bất kỳ dữ liệu nào.
 * - Nếu `expectedTopicId` không có (Global Duplicate Dashboard):
 *   Chỉ kiểm tra card tồn tại → suspend.
 *
 * Invariants:
 * - Chỉ mutate `lifecycleStatus = "suspended"`.
 * - KHÔNG chạm tới: dueAt, interval, easeFactor, repetitions, lapses.
 * - KHÔNG xóa/sửa FlashcardReview (review history được bảo tồn).
 * - KHÔNG chạm tới FlashcardSchedule.
 */
export async function suspendDuplicateCard(
  cardId: string,
  expectedTopicId?: string
): Promise<Flashcard> {
  // Always fetch card first to guard and verify existence
  const card = await prisma.flashcard.findUnique({
    where: { id: cardId },
    include: { schedule: true },
  });

  if (!card) {
    throw new Error(`Flashcard "${cardId}" không tồn tại`);
  }

  // Topic-scope guard: only runs when expectedTopicId is provided (topic-scoped mode)
  if (expectedTopicId !== undefined && card.topicId !== expectedTopicId) {
    throw new Error(
      `topic-context integrity guard: expectedTopicId "${expectedTopicId}" không khớp với card.topicId "${card.topicId}". ` +
      `Thao tác bị từ chối để bảo vệ tính toàn vẹn phạm vi dữ liệu. (HTTP 403 Forbidden)`
    );
  }

  // Only mutate lifecycleStatus — no other fields
  const updated = await prisma.flashcard.update({
    where: { id: cardId },
    data: { lifecycleStatus: "suspended" },
    include: { schedule: true },
  });

  return mapPrismaFlashcard(updated);
}



/**
 * Records a flashcard review atomically following Option A Idempotency:
 * - Step 1: Query by clientEventId -> If found, return HTTP 200 with duplicate = true and original resulting schedule.
 * - Step 2: Atomic $transaction: write review + update schedule.
 * - Race-safety: If concurrent request triggers unique constraint (P2002), catches and re-reads original review.
 */
export async function recordReviewAtomic(
  input: unknown
): Promise<FlashcardReviewResponse> {
  const validatedInput = FlashcardReviewInputSchema.parse(input);
  const flashcardId = validatedInput.flashcardId || validatedInput.cardId!;
  const clientEventId = validatedInput.clientEventId;

  // Helper to build fast return response from an existing review
  const buildFastReturn = (existing: any): FlashcardReviewResponse => {
    const originalResultingSchedule: FlashcardSchedule = {
      id: existing.flashcard?.schedule?.id || `sch-${existing.flashcardId}`,
      flashcardId: existing.flashcardId,
      cardId: existing.flashcardId,
      state: existing.stateAfter as FlashcardState,
      dueAt:
        existing.dueAfterAt instanceof Date
          ? existing.dueAfterAt.toISOString()
          : existing.dueAfterAt,
      due:
        existing.dueAfterAt instanceof Date
          ? existing.dueAfterAt.toISOString()
          : existing.dueAfterAt,
      interval: existing.intervalAfter,
      easeFactor: existing.easeFactorAfter,
      repetitions: existing.flashcard?.schedule?.repetitions ?? 1,
      lapses: existing.flashcard?.schedule?.lapses ?? 0,
      lastReviewedAt:
        existing.reviewedAt instanceof Date
          ? existing.reviewedAt.toISOString()
          : existing.reviewedAt,
      lastReviewed:
        existing.reviewedAt instanceof Date
          ? existing.reviewedAt.toISOString()
          : existing.reviewedAt,
      updatedAt:
        existing.reviewedAt instanceof Date
          ? existing.reviewedAt.toISOString()
          : existing.reviewedAt,
    };

    return {
      success: true,
      duplicate: true,
      clientEventId: existing.clientEventId,
      review: mapPrismaReview(existing),
      schedule: originalResultingSchedule,
    };
  };

  // Bước 1: Tra cứu theo clientEventId (Fast Return check)
  const existingReview = await prisma.flashcardReview.findUnique({
    where: { clientEventId },
    include: { flashcard: { include: { schedule: true } } },
  });

  if (existingReview) {
    return buildFastReturn(existingReview);
  }

  // Bước 2: Xử lý review mới qua Prisma $transaction với catch unique constraint (P2002)
  try {
    return await prisma.$transaction(async (tx) => {
      const card = await tx.flashcard.findUnique({
        where: { id: flashcardId },
        include: { schedule: true },
      });

      if (!card) {
        throw new Error(`Flashcard với id ${flashcardId} không tồn tại`);
      }

      const currentSchedule: FlashcardSchedule = card.schedule
        ? mapPrismaSchedule(card.schedule)
        : {
            id: `sch-${card.id}`,
            flashcardId: card.id,
            state: "new",
            dueAt: new Date().toISOString(),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            updatedAt: new Date().toISOString(),
          };

      // Tính toán chuyển trạng thái SM-2
      const calculation = calculateFlashcardNextReview({
        currentSchedule,
        rating: validatedInput.rating,
        referenceDate: new Date(),
      });

      // Tạo bản ghi review mới
      const newReviewRecord = await tx.flashcardReview.create({
        data: {
          clientEventId,
          flashcardId: card.id,
          topicId: validatedInput.topicId || card.topicId,
          rating: validatedInput.rating,
          reviewDurationMs: validatedInput.reviewDurationMs,
          reviewedAt: new Date(calculation.reviewPayload.reviewedAt),
          stateBefore: calculation.reviewPayload.stateBefore,
          stateAfter: calculation.reviewPayload.stateAfter,
          intervalBefore: calculation.reviewPayload.intervalBefore,
          intervalAfter: calculation.reviewPayload.intervalAfter,
          easeFactorBefore: calculation.reviewPayload.easeFactorBefore,
          easeFactorAfter: calculation.reviewPayload.easeFactorAfter,
          dueBeforeAt: new Date(calculation.reviewPayload.dueBeforeAt),
          dueAfterAt: new Date(calculation.reviewPayload.dueAfterAt),
        },
      });

      // Cập nhật schedule
      const updatedScheduleRecord = await tx.flashcardSchedule.upsert({
        where: { flashcardId: card.id },
        create: {
          flashcardId: card.id,
          state: calculation.nextSchedule.state,
          dueAt: new Date(calculation.nextSchedule.dueAt),
          interval: calculation.nextSchedule.interval,
          easeFactor: calculation.nextSchedule.easeFactor,
          repetitions: calculation.nextSchedule.repetitions,
          lapses: calculation.nextSchedule.lapses,
          lastReviewedAt: calculation.nextSchedule.lastReviewedAt
            ? new Date(calculation.nextSchedule.lastReviewedAt)
            : null,
        },
        update: {
          state: calculation.nextSchedule.state,
          dueAt: new Date(calculation.nextSchedule.dueAt),
          interval: calculation.nextSchedule.interval,
          easeFactor: calculation.nextSchedule.easeFactor,
          repetitions: calculation.nextSchedule.repetitions,
          lapses: calculation.nextSchedule.lapses,
          lastReviewedAt: calculation.nextSchedule.lastReviewedAt
            ? new Date(calculation.nextSchedule.lastReviewedAt)
            : null,
        },
      });

      return {
        success: true,
        duplicate: false,
        clientEventId,
        review: mapPrismaReview(newReviewRecord),
        schedule: mapPrismaSchedule(updatedScheduleRecord),
      };
    });
  } catch (error) {
    // Xử lý concurrent race condition: nếu gặp lỗi unique constraint (P2002) trên clientEventId
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentReview = await prisma.flashcardReview.findUnique({
        where: { clientEventId },
        include: { flashcard: { include: { schedule: true } } },
      });

      if (concurrentReview) {
        return buildFastReturn(concurrentReview);
      }
    }
    throw error;
  }
}

/**
 * Returns due flashcards for today:
 * - Filtered by lifecycleStatus = 'active'
 * - Filtered by priority:
 *   - 'due' (default): active cards with dueAt <= now
 *   - 'new': active cards with schedule.state == 'new'
 *   - 'low_retention': active cards with weighted scoring isLowRetention() >= 0.4
 * - Sorted deterministically
 */
export async function getDueFlashcards(filters?: {
  topicId?: string;
  now?: Date;
  priority?: FlashcardPriorityFilter;
}): Promise<Flashcard[]> {
  const currentNow = filters?.now || new Date();
  const priority = filters?.priority || "due";

  if (priority === "new") {
    const cards = await prisma.flashcard.findMany({
      where: {
        lifecycleStatus: "active",
        ...(filters?.topicId ? { topicId: filters.topicId } : {}),
        schedule: {
          state: "new",
        },
      },
      include: { schedule: true },
      orderBy: [{ id: "asc" }],
    });
    return cards.map(mapPrismaFlashcard);
  }

  if (priority === "low_retention") {
    const cards = await prisma.flashcard.findMany({
      where: {
        lifecycleStatus: "active",
        ...(filters?.topicId ? { topicId: filters.topicId } : {}),
      },
      include: {
        schedule: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: [{ id: "asc" }],
    });

    const mappedCards = cards.map((card) => {
      let cardRetention = 1.0;
      if (card.reviews && card.reviews.length > 0) {
        const remembered = card.reviews.filter(
          (r) => r.rating === 3 || r.rating === 4
        ).length;
        cardRetention = remembered / card.reviews.length;
      }
      const mapped = mapPrismaFlashcard(card);
      if (mapped.schedule) {
        mapped.schedule.retentionRate = cardRetention;
      }
      return mapped;
    });

    const lowRetentionCards = mappedCards.filter(isLowRetention);

    lowRetentionCards.sort((a, b) => {
      const easeA = a.schedule?.easeFactor ?? 2.5;
      const easeB = b.schedule?.easeFactor ?? 2.5;
      if (easeA !== easeB) return easeA - easeB;
      const lapsesA = a.schedule?.lapses ?? 0;
      const lapsesB = b.schedule?.lapses ?? 0;
      if (lapsesA !== lapsesB) return lapsesB - lapsesA;
      return a.id.localeCompare(b.id);
    });

    return lowRetentionCards;
  }

  // Default: priority === 'due'
  const cards = await prisma.flashcard.findMany({
    where: {
      lifecycleStatus: "active",
      ...(filters?.topicId ? { topicId: filters.topicId } : {}),
      schedule: {
        dueAt: {
          lte: currentNow,
        },
      },
    },
    include: { schedule: true },
    orderBy: [
      { schedule: { dueAt: "asc" } },
      { id: "asc" }, // Deterministic tie-breaker
    ],
  });

  return cards.map(mapPrismaFlashcard);
}

/**
 * Computes in-memory progress statistics for flashcards including streakDays.
 */
export async function getFlashcardProgress(filters?: {
  topicId?: string;
}): Promise<FlashcardProgressStats> {
  const now = new Date();
  const whereFilter = {
    lifecycleStatus: "active",
    ...(filters?.topicId ? { topicId: filters.topicId } : {}),
  };

  const cards = await prisma.flashcard.findMany({
    where: whereFilter,
    include: { schedule: true },
  });

  const totalCards = cards.length;
  let newCards = 0;
  let learningCards = 0;
  let reviewCards = 0;
  let dueToday = 0;

  for (const card of cards) {
    const s = card.schedule;
    if (!s) {
      newCards++;
      continue;
    }
    if (s.state === "new") newCards++;
    else if (s.state === "learning" || s.state === "relearning") learningCards++;
    else if (s.state === "review") reviewCards++;

    if (s.dueAt <= now) {
      dueToday++;
    }
  }

  // Calculate streakDays and retention rate from user reviews
  const allReviews = await prisma.flashcardReview.findMany({
    where: {
      ...(filters?.topicId ? { topicId: filters.topicId } : {}),
    },
    select: {
      rating: true,
      reviewedAt: true,
    },
    orderBy: { reviewedAt: "desc" },
  });

  const streakDays = calculateStreakDays(allReviews, now);

  let retentionRate = 100;
  if (allReviews.length > 0) {
    const recent = allReviews.slice(0, 200);
    const rememberedCount = recent.filter(
      (r) => r.rating === 3 || r.rating === 4
    ).length;
    retentionRate = Math.round((rememberedCount / recent.length) * 100);
  }

  return {
    totalCards,
    newCards,
    learningCards,
    reviewCards,
    dueToday,
    retentionRate,
    streakDays,
  };
}

/**
 * Retrieves all review history events for a specific flashcard.
 */
export async function getFlashcardReviews(
  flashcardId: string
): Promise<FlashcardReview[]> {
  const reviews = await prisma.flashcardReview.findMany({
    where: { flashcardId },
    orderBy: { reviewedAt: "desc" },
  });
  return reviews.map(mapPrismaReview);
}

/**
 * Retrieves all review history events across all cards, with optional filters.
 */
export async function getAllFlashcardReviews(filters?: {
  topicId?: string;
  rating?: number;
  fromDate?: string | Date;
  toDate?: string | Date;
}): Promise<FlashcardReview[]> {
  const where: any = {};
  if (filters?.topicId && filters.topicId !== "all") {
    where.topicId = filters.topicId;
  }
  if (filters?.rating) {
    where.rating = Number(filters.rating);
  }
  if (filters?.fromDate || filters?.toDate) {
    where.reviewedAt = {};
    if (filters.fromDate) {
      where.reviewedAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      const d = new Date(filters.toDate);
      if (typeof filters.toDate === "string" && filters.toDate.length === 10) {
        d.setHours(23, 59, 59, 999);
      }
      where.reviewedAt.lte = d;
    }
  }

  const reviews = await prisma.flashcardReview.findMany({
    where,
    orderBy: { reviewedAt: "desc" },
  });
  return reviews.map(mapPrismaReview);
}

/**
 * Detects duplicate candidate groups using pure duplicate logic.
 */
export async function getDuplicateCandidates(filters?: {
  topicId?: string;
}) {
  const cards = await prisma.flashcard.findMany({
    where: {
      lifecycleStatus: "active",
      ...(filters?.topicId ? { topicId: filters.topicId } : {}),
    },
    include: { schedule: true },
  });

  const domainCards = cards.map(mapPrismaFlashcard);
  const { detectDuplicateGroups } = await import("../../lib/duplicateDetectionLogic");
  return detectDuplicateGroups(domainCards, filters?.topicId);
}


