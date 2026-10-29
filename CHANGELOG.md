# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [0.2.0] — Phase 25 UX Polish & Product Experience

### Added
- Explicit confirmation gate before restoring auto-backup snapshots.
- Distinct flashcard creation feedback for newly created and already-existing cards.
- Five-state NotebookLM artifact synchronization status:
  Pending, Synced, Failed, Retrying, AlreadySynchronized.
- MindMap empty states and minimal onboarding for zero-topic and topic-without-mindmap cases.
- MindMap keyboard shortcut overlay for discovering existing shortcuts.

### Improved
- Auto-backup restore now requires explicit destructive-action confirmation.
- Flashcard creation prevents confusing success feedback for idempotent duplicate submissions.
- Artifact sync now distinguishes successful sync from already-synchronized artifacts.
- MindMap onboarding now provides clear next actions instead of a dead-end error message.
- MindMap shortcuts are now discoverable through a dedicated overlay.

### Safety
- No database schema changes.
- No database migrations.
- No production deployment included in this release preparation.

## [0.1.1] - 2026-10-29

### Added
- Added production migration safety guard (`scripts/safe-prisma-db-push.mjs`) preventing accidental `prisma db push` in production.
- Added v0.1.0/v0.1.1 deployment runbook (`docs/release/deployment-v0.1.1.md`) with migration, verification, and rollback procedures.
- Added structured logs (`FLASHCARD_P2002_RECOVERED`, `ARTIFACT_INGEST_DUPLICATE`, `ARTIFACT_INGEST_FALLBACK`) with credential redaction.
- Added automated database backup (`scripts/backup-database.mjs`) with SHA-256 checksum generation and verification (`scripts/verify-backup.mjs`).
- Added backup retention policy enforcer (`scripts/prune-backups.mjs`) protecting newest backups with `BACKUP_MIN_KEEP`.
- Added standalone health probe script (`scripts/health-probe.mjs`) with optional webhook alerting.
- Added Docker Compose maintenance profile for off-path backup execution.

## [0.1.0] - 2026-10-29

### Added
- Added nullable unique `idempotencyKey` to `Flashcard` with a PostgreSQL unique index.
- Added idempotent flashcard creation, including concurrent-request recovery for Prisma `P2002`.
- Preserved `idempotencyKey` across backup export and both replace/merge restore paths.
- Expanded the NotebookLM artifact ingest contract to accept all Studio artifact types.
- Added ADRs for flashcard idempotency and NotebookLM artifact type contract.
- Added integration coverage for flashcard idempotency and artifact ingest contracts.

### Fixed
- Prevented duplicate flashcards when creating cards from the same MindMap node through double-click, retry, or reload.
- Fixed HTTP 400 failures when syncing `mindmap_outline` artifacts from NotebookLM Studio.
- Preserved semantic artifact types instead of downcasting them to legacy types.

### Changed
- Expanded `ArtifactTypeEnum` and `ArtifactType` from 4 to 10 supported values:
  `study_guide`, `briefing_doc`, `qa_pair`, `raw_markdown`,
  `audio_overview_summary`, `faq`, `dialectic_matrix`,
  `socratic_inquiry`, `mindmap_outline`, and `source_pack`.

### Compatibility
- Existing flashcards remain valid with `idempotencyKey = NULL`.
- Existing artifact types remain fully supported.
- No database migration is required for the NotebookLM artifact contract change.
- The flashcard idempotency migration is additive and backward compatible.

