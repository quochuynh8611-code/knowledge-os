-- Migration: 20261028134700_add_flashcard_idempotency_key
-- Context: Phase 11 - Fix P1 Flashcard idempotency end-to-end
--
-- RATIONALE & ARCHITECTURAL DECISIONS:
-- 1. Adds nullable `idempotencyKey` to `Flashcard` table to ensure 1 MindMap node only produces 1 flashcard.
-- 2. Creates a unique index `Flashcard_idempotencyKey_key` on `Flashcard(idempotencyKey)`.
-- 3. In ANSI SQL / PostgreSQL, NULL values are distinct in unique constraints,
--    so existing legacy flashcards with NULL remain completely unaffected.

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Flashcard_idempotencyKey_key" ON "Flashcard"("idempotencyKey");

