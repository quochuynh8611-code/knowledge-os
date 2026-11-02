-- Migration: 20261102100000_add_resource_open_target
-- Context: Resource Persistence Slice 1 (ADR-118)
--
-- RATIONALE & ARCHITECTURAL DECISIONS:
-- 1. Adds nullable `openTarget` to `Resource` table to preserve reader/viewer target overrides.
-- 2. Strictly adheres to Zero-Default and non-destructive additive schema evolution.
-- 3. In ANSI SQL / PostgreSQL, adding a nullable column without default is instant and does not require table rewrite.

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "openTarget" TEXT;
