import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import * as flashcardService from "../services/flashcardService";
import {
  FlashcardCreateSchema,
  FlashcardUpdateSchema,
  FlashcardReviewInputSchema,
  FlashcardSuspendDuplicateSchema,
} from "../../lib/validation";
import { Prisma } from "@prisma/client";

/**
 * Flashcard Controller handling REST endpoints.
 * Enforces Option A Idempotency, Zod validation, and standard HTTP status codes.
 */

export async function getFlashcards(req: Request, res: Response) {
  try {
    const { topicId, lifecycleStatus, noteId } = req.query;
    const cards = await prisma.flashcard.findMany({
      where: {
        ...(topicId ? { topicId: String(topicId) } : {}),
        ...(lifecycleStatus ? { lifecycleStatus: String(lifecycleStatus) } : {}),
        ...(noteId ? { noteId: String(noteId) } : {}),
      },
      include: { schedule: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(cards);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch flashcards";
    res.status(500).json({ error: msg });
  }
}

export async function getFlashcardById(req: Request, res: Response) {
  try {
    const card = await prisma.flashcard.findUnique({
      where: { id: req.params.id },
      include: { schedule: true },
    });
    if (!card) {
      return res
        .status(404)
        .json({ error: `Flashcard không tồn tại: ${req.params.id}` });
    }
    res.json(card);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch flashcard";
    res.status(500).json({ error: msg });
  }
}

export async function createFlashcard(req: Request, res: Response) {
  const parsed = FlashcardCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu tạo flashcard không hợp lệ",
      details: parsed.error.issues,
    });
  }
  try {
    const created = await flashcardService.createFlashcard(parsed.data);
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to create flashcard";
    res.status(500).json({ error: msg });
  }
}

export async function updateFlashcard(req: Request, res: Response) {
  const parsed = FlashcardUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu cập nhật flashcard không hợp lệ",
      details: parsed.error.issues,
    });
  }
  try {
    const updated = await flashcardService.updateFlashcard(
      req.params.id,
      parsed.data
    );
    res.json(updated);
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return res
        .status(404)
        .json({ error: `Không tìm thấy flashcard: ${req.params.id}` });
    }
    const msg =
      err instanceof Error ? err.message : "Failed to update flashcard";
    res.status(500).json({ error: msg });
  }
}

export async function deleteFlashcard(req: Request, res: Response) {
  try {
    await flashcardService.deleteFlashcard(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return res
        .status(404)
        .json({ error: `Không tìm thấy flashcard: ${req.params.id}` });
    }
    const msg =
      err instanceof Error ? err.message : "Failed to delete flashcard";
    res.status(500).json({ error: msg });
  }
}

export async function recordReview(req: Request, res: Response) {
  const parsed = FlashcardReviewInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu review không hợp lệ",
      details: parsed.error.issues,
    });
  }
  try {
    const result = await flashcardService.recordReviewAtomic(parsed.data);
    // Option A Idempotency: Always HTTP 200 with result payload
    res.status(200).json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("không tồn tại")) {
      return res.status(404).json({ error: err.message });
    }
    const msg = err instanceof Error ? err.message : "Failed to record review";
    res.status(500).json({ error: msg });
  }
}

export async function getDueFlashcards(req: Request, res: Response) {
  try {
    const topicId = req.query.topicId ? String(req.query.topicId) : undefined;
    const cards = await flashcardService.getDueFlashcards({ topicId });
    res.json(cards);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch due flashcards";
    res.status(500).json({ error: msg });
  }
}

export async function getProgress(req: Request, res: Response) {
  try {
    const topicId = req.query.topicId ? String(req.query.topicId) : undefined;
    const stats = await flashcardService.getFlashcardProgress({ topicId });
    res.json(stats);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch flashcard progress";
    res.status(500).json({ error: msg });
  }
}

export async function getReviewsByFlashcardId(req: Request, res: Response) {
  try {
    const reviews = await flashcardService.getFlashcardReviews(req.params.id);
    res.json(reviews);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch flashcard reviews";
    res.status(500).json({ error: msg });
  }
}

export async function getDuplicates(req: Request, res: Response) {
  try {
    const topicId = req.query.topicId ? String(req.query.topicId) : undefined;
    const candidates = await flashcardService.getDuplicateCandidates({ topicId });
    res.json(candidates);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch duplicate candidates";
    res.status(500).json({ error: msg });
  }
}

/**
 * POST /api/flashcards/:id/suspend-duplicate
 *
 * Action riêng biệt cho Duplicate Detection Dashboard.
 * Sử dụng FlashcardSuspendDuplicateSchema — chỉ cho phép lifecycleStatus = "suspended".
 *
 * HTTP status codes:
 * - 200: suspend thành công
 * - 400: body malformed (lifecycleStatus sai hoặc expectedTopicId rỗng)
 * - 403: topic-context integrity guard — expectedTopicId mismatch
 * - 404: card không tồn tại
 * - 500: unexpected server error
 *
 * Note: 403 ở đây biểu thị **topic-context integrity guard**, không phải
 * identity-based authorization (repo hiện chưa có auth system).
 */
export async function suspendDuplicate(req: Request, res: Response) {
  const parsed = FlashcardSuspendDuplicateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dữ liệu suspend-duplicate không hợp lệ",
      details: parsed.error.issues,
    });
  }

  try {
    const card = await flashcardService.suspendDuplicateCard(
      req.params.id,
      parsed.data.expectedTopicId
    );
    res.json(card);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      // 404: card does not exist
      if (msg.includes("không tồn tại")) {
        return res.status(404).json({ error: msg });
      }
      // 403: topic-context integrity guard
      if (msg.includes("topic-context integrity guard")) {
        return res.status(403).json({ error: msg });
      }
    }
    // 500: unexpected
    const fallback =
      err instanceof Error ? err.message : "Failed to suspend duplicate card";
    res.status(500).json({ error: fallback });
  }
}
