import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import * as flashcardController from "../controllers/flashcardController";

/**
 * Creates and configures Express router for Flashcard subsystem.
 */
export function createFlashcardRouter(_prisma?: PrismaClient | any): Router {
  const router = Router();

  // Specific query endpoints (MUST come before /flashcards/:id to avoid parameter collision)
  router.get("/flashcards/due", flashcardController.getDueFlashcards);
  router.get("/flashcards/progress", flashcardController.getProgress);
  router.get("/flashcards/duplicates", flashcardController.getDuplicates);

  // Spaced Repetition Review (Option A Idempotency)
  router.post("/flashcards/review", flashcardController.recordReview);

  // Standard Flashcard CRUD endpoints
  router.get("/flashcards", flashcardController.getFlashcards);
  router.get("/flashcards/:id/reviews", flashcardController.getReviewsByFlashcardId);
  router.get("/flashcards/:id", flashcardController.getFlashcardById);
  router.post("/flashcards", flashcardController.createFlashcard);

  // F6.9.2: Scoped suspend-duplicate action (MUST be before generic PATCH /:id to avoid shadowing)
  // Uses FlashcardSuspendDuplicateSchema — only accepts lifecycleStatus = "suspended"
  // Enforces topic-context integrity guard when expectedTopicId is provided
  router.post("/flashcards/:id/suspend-duplicate", flashcardController.suspendDuplicate);

  router.put("/flashcards/:id", flashcardController.updateFlashcard);
  router.patch("/flashcards/:id", flashcardController.updateFlashcard);
  router.delete("/flashcards/:id", flashcardController.deleteFlashcard);

  return router;
}
