# ADR-070: Google NotebookLM Research Hub v2.1 Pipeline & Unified Design System

## Status
**Accepted & Implemented** (Phase F8.0 / Integration Suite)

## Context & Problem Statement
Knowledge OS integrates with Google NotebookLM via Antigravity 2.0 to ground complex multi-domain research across Buddhism, Eastern Metaphysics, Traditional Chinese Medicine, and Classical Linguistics.

In earlier versions:
1. NotebookLM handoff, source packaging, and prompt generation operated purely client-side via `localStorage`.
2. Grounded artifacts generated from NotebookLM (such as Audio Overview summaries, Study Guides, Briefing Docs) were stored as unversioned local text blocks.
3. Ingestion into Knowledge OS lacked idempotency guards, audit trails, and transactional decoupling between Notes and Spaced Repetition (SRS) Flashcards.
4. The integration UI suffered from fragmented visual styling and incomplete Dark Mode support.

## Architectural Decisions

### 1. Decision 1 (Option A): Source Package Versioning & Historical Traceability
- **Decision**: Research sessions support 1-to-N `SourcePackage` and `TaskPrompt` records linked directly to `ResearchSession`.
- **Policy**: When a Source Package is updated (e.g. from `v1` to `v2`), existing `GroundedArtifact` records are **retained** and tagged explicitly with their origin package version (`Source package v1`). They are not automatically archived or hidden, guaranteeing complete historical traceability.

### 2. Decision 2 (Option B): Dedicated Review Drawer (`ArtifactReviewDrawer`)
- **Decision**: Separate review, citation exegesis, and ingestion logic into a dedicated drawer component (`ArtifactReviewDrawer.tsx`).
- **Policy**: `NotebookLMStudioModal.tsx` acts purely as the high-level research orchestrator and artifact locker, delegating deep inspection to `ArtifactReviewDrawer.tsx`.

### 3. Independent Transactional Ingestion
- **Decision**: Ingesting an artifact into a `Note` and generating `Flashcards` are independent, non-blocking operations.
- **Auditing**: Every import operation is recorded in `ArtifactImport` with timestamps, counts, and target IDs (`targetNoteId`), generating immutable `ResearchTimelineEvent` audit logs.

### 4. Idempotency Guard (SHA-256)
- **Decision**: Ingestion uses deterministic SHA-256 content hashing (`contentHash`) and unique idempotency keys (`idempotencyKey`) to reject duplicate insertions while returning the canonical artifact instance.

### 5. Unified Design System & 100% Dark Mode Coverage
- **Decision**: All three integration components (`NotebookLMStudioModal`, `ArtifactReviewDrawer`, `AntigravityHandoffModal`) strictly use the Knowledge OS `stone` color tokens with complete light/dark mode pairs:
  - Containers: `bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100`
  - Secondary / Headers: `bg-stone-50/90 dark:bg-stone-950/90`
  - Form Fields: `bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white`
  - Code / Previews: `bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200`
  - Status Badges: Emerald (`validated`), Blue (`imported`), Amber (`received`), Stone (`archived`), Indigo (`Source package v{n}`).

## Database Schema (Prisma ORM)
The schema adds 7 relational models and 4 enums:
- `ResearchSession`: Topic-level persistent session.
- `SourcePackage`: Versioned source data snapshots.
- `TaskPrompt`: Versioned task prompts with CLI command hints.
- `GroundedArtifact`: Ingested research deliverables with SHA-256 idempotency.
- `ArtifactCitation`: Structured source citation markers `[1]`, `[2]`.
- `ArtifactImport`: Audit trail of Note and Flashcard generation.
- `ResearchTimelineEvent`: Immutable system-wide research event log.

## Verification & Impact
- **Database**: Synced with PostgreSQL via Prisma ORM.
- **REST Endpoints**: `/api/research-sessions` and `/api/artifacts` fully covered by unit & service tests.
- **Zero Breaking Changes**: Offline and `localStorage` compatibility preserved.
- **Test Suite**: 100% passing across all 297 test files (1,912 tests).
