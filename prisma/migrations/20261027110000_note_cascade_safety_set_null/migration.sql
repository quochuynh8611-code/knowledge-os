-- Migration: 20261027110000_note_cascade_safety_set_null
-- Context: ADR-079 PR-3: Note Cascade Safety & Prisma Migration
--
-- RATIONALE & ARCHITECTURAL DECISIONS:
-- 1. Why Data-Repair before Schema Change:
--    Existing records in production may contain orphan notes whose foreign key `topicId`
--    points to non-existent topics or lacks proper nullable constraints. Running data-repair
--    ensures every note either reassigns to a surviving secondary topic from NoteTopicLink
--    or falls back safely to NULL before altering the foreign key constraint.
--
-- 2. Why SetNull instead of Cascade:
--    Under ADR-079, NoteTopicLink is the Canonical Source of Truth for Note <-> Topic relations,
--    while `Note.topicId` is merely a primary-topic pointer. Notes are valuable user artifacts
--    (insights, summaries, study cards) and must NEVER be destroyed simply because a Topic is deleted.
--    Setting `onDelete: SetNull` guarantees note survival and allows orphaned notes to remain accessible.
--
-- 3. Rollback Path:
--    This migration changes a destructive ownership invariant and must not be
--    reversed by synthesizing replacement topic assignments.
--
--    To roll back:
--    1. Stop application traffic or enable maintenance mode.
--    2. Restore the database from a verified pre-migration backup.
--    3. Re-run application-level regression suites against the restored database.
--    4. Do NOT assign arbitrary Topic ids to Notes with NULL topicId.
--    5. Do NOT create an automatic recovery topic.
--    6. Do NOT force topicId back to NOT NULL without a separately reviewed data-repair plan.
--    7. Do NOT restore ON DELETE CASCADE.


-- ============================================================================
-- STEP 1: DATA-REPAIR STEP
-- ============================================================================

-- 1.1. Reassign notes whose topicId is invalid/missing to the first surviving secondary topic in NoteTopicLink
UPDATE "Note" n
SET "topicId" = (
  SELECT ntl."topicId"
  FROM "NoteTopicLink" ntl
  INNER JOIN "Topic" t ON t.id = ntl."topicId"
  WHERE ntl."noteId" = n.id
  ORDER BY ntl."id" ASC
  LIMIT 1
)
WHERE n."topicId" NOT IN (SELECT id FROM "Topic");

-- 1.2. If no valid secondary topic exists in NoteTopicLink, set topicId to NULL
UPDATE "Note"
SET "topicId" = NULL
WHERE "topicId" NOT IN (SELECT id FROM "Topic");

-- ============================================================================
-- STEP 2: SCHEMA ALTERATION STEP
-- ============================================================================

-- 2.1. Drop existing Cascade foreign key constraint on Note.topicId
ALTER TABLE "Note" DROP CONSTRAINT IF EXISTS "Note_topicId_fkey";

-- 2.2. Make Note.topicId nullable
ALTER TABLE "Note" ALTER COLUMN "topicId" DROP NOT NULL;

-- 2.3. Recreate foreign key constraint with ON DELETE SET NULL
ALTER TABLE "Note" ADD CONSTRAINT "Note_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ============================================================================
-- STEP 3: VERIFICATION STEP
-- ============================================================================

-- Verify that no Note has a topicId pointing to a non-existent Topic
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "Note"
  WHERE "topicId" IS NOT NULL
    AND "topicId" NOT IN (SELECT id FROM "Topic");

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration verification failed: Found % notes with invalid topicId references.', orphan_count;
  END IF;
END $$;
