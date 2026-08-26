-- ============================================================================
-- SCRIPT: Data Fix for Category and Topic Domain Type Mismatch
-- Purpose: Standardize existing Category and Topic records in PostgreSQL
--          so dynamic domains (e.g. "Kinh Tế") have type matching their slug
--          instead of erroneously falling back to 'huyen-hoc'.
-- ============================================================================

BEGIN;

-- 1. Fix Root Categories where type was defaulted to 'huyen-hoc' instead of its own slug
UPDATE "Category"
SET "type" = "slug", "updatedAt" = NOW()
WHERE "parentId" IS NULL
  AND "slug" NOT IN ('phat-hoc', 'huyen-hoc')
  AND ("type" = 'huyen-hoc' OR "type" IS NULL OR "type" = '');

-- 2. Fix Child Categories to inherit type from their parent/root category
UPDATE "Category" c
SET "type" = r."type", "updatedAt" = NOW()
FROM "Category" r
WHERE c."parentId" = r."id"
  AND r."type" IS NOT NULL
  AND (c."type" != r."type" OR c."type" IS NULL);

-- 3. Fix Topics to match their category's resolved type
UPDATE "Topic" t
SET "type" = c."type", "updatedAt" = NOW()
FROM "Category" c
WHERE t."categoryId" = c."id"
  AND c."type" IS NOT NULL
  AND (t."type" != c."type" OR t."type" IS NULL);

COMMIT;
