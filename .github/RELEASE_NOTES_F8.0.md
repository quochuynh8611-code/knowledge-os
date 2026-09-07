# 🚀 Release Notes — Phase F8.0: Google NotebookLM Research Hub v2.1 & Unified Design System

**Version**: `v0.15.0`  
**Date**: 2026-09-07  
**Branch**: `main`  
**Tests**: 297/297 suites PASS (1,912 tests passing, 100%)  
**TypeScript**: 0 errors (`npx tsc --noEmit`)

---

## 🌟 Overview

Phase F8.0 delivers the **Google NotebookLM Research Hub v2.1** pipeline and a complete **Unified Design System (100% Dark Mode)** for Knowledge OS. The system transitions from fragile client-side `localStorage` to a persistent, relational PostgreSQL data store (via Prisma ORM), while introducing deep artifact review, citation extraction, independent note/flashcard generation, and full headless Antigravity 2.0 CLI handoff.

---

## 🎯 What's New

### 1. 🗄️ Relational Data Persistence & Provenance Architecture (Prisma ORM)
- **7 Relational Models Added**:
  - `ResearchSession`: Topic-level research container.
  - `SourcePackage`: 1-to-N versioned source bundles (`v1`, `v2`).
  - `TaskPrompt`: Versioned task prompts with Antigravity CLI command hints.
  - `GroundedArtifact`: Ingested research deliverables with SHA-256 idempotency deduplication.
  - `ArtifactCitation`: Structured source citation markers (`[1]`, `[2]`).
  - `ArtifactImport`: Immutable audit trail for Note and Flashcard generation.
  - `ResearchTimelineEvent`: System-wide chronological event stream.
- **Architectural Decision 1 (Option A — Version Traceability)**: Older artifacts remain linked to their original SourcePackage version with explicit UI badges (`Source package v1`) and are never auto-archived upon upgrading.
- **SHA-256 Idempotency Guard**: Prevents duplicate artifact ingestion using deterministic content hashing (`contentHash`).

### 2. 🔍 Dedicated Review Drawer (`ArtifactReviewDrawer.tsx`)
- **Architectural Decision 2 (Option B — Dedicated Review Drawer)**: Review and deep exegesis are separated from the main modal into an ergonomic sliding drawer.
- **3-Tab Deep Review Layout**:
  - **Nội dung Markdown**: Raw syntax inspection with syntax selection highlighting.
  - **Trích dẫn nguồn (Citations)**: Numbered source citations `[1]` with exact blockquotes.
  - **Lịch sử chuyển nạp (Imports)**: Audit log of all created Notes and generated Flashcards.
- **Direct Validation Workflow**: One-click *"Thẩm định"* validation and archiving transitions.
- **Independent Ingestion**:
  - **Nhập thành Note**: Sub-form for note title, type (`insight`, `study`, `summary`, `question`), and tag classification.
  - **Sinh Flashcards SRS**: Dynamic multi-card creator with front/back extraction and validation.

### 3. ⚡ Orchestrator & CLI Handoff Pipeline (`NotebookLMStudioModal.tsx` & `AntigravityHandoffModal.tsx`)
- **Interactive Source Packager**: Instant source bundle compilation across Buddhism, Metaphysics, TCM, and Linguistics.
- **Antigravity CLI Headless Command (`agy -p`)**: Direct task prompt copying and job tracking.
- **Artifact Locker**: Multi-artifact storage with Markdown file drag-and-drop / upload support.

### 4. 🎨 100% Dark Mode & Unified Design System
- Standardized `stone` color palette across all integration modals and review drawers:
  - Backgrounds: `bg-white dark:bg-stone-900`
  - Borders: `border-stone-200 dark:border-stone-800`
  - Text: `text-stone-900 dark:text-stone-100` / `text-stone-500 dark:text-stone-400`
  - Focus rings: `focus:ring-2 focus:ring-blue-500/40`
  - Status Badges:
    - `validated`: Emerald (`dark:bg-emerald-950/80 dark:text-emerald-300`)
    - `imported`: Blue (`dark:bg-blue-950/80 dark:text-blue-300`)
    - `received`: Amber (`dark:bg-amber-950/80 dark:text-amber-300`)
    - `archived`: Stone (`dark:bg-stone-800 dark:text-stone-300`)

---

## 🛠️ REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/research-sessions` | Create or retrieve active session for topic |
| `POST` | `/api/research-sessions/:id/package-sources` | Create new versioned source package |
| `POST` | `/api/research-sessions/:id/task-prompt` | Save task prompt with CLI command hint |
| `POST` | `/api/artifacts/ingest` | Ingest grounded artifact with SHA-256 deduplication |
| `PATCH` | `/api/artifacts/:id/review` | Update artifact review status (`validated`, `archived`) |
| `POST` | `/api/artifacts/:id/import-note` | Transactionally create Note from artifact |
| `POST` | `/api/artifacts/:id/import-flashcards` | Transactionally generate Flashcards from artifact |

---

## 🧪 Test & Validation Metrics

- **Unit & Service Tests**:
  - `tests/unit/research-hub-services.test.ts` (7/7 passed)
  - `tests/unit/artifact-review-drawer.test.tsx` (3/3 passed)
  - `tests/unit/antigravity-handoff-integration.test.tsx` (4/4 passed)
- **Full Test Suite Status**: **297 test files, 1,912 tests (100% PASSED)**
- **TypeScript**: 0 errors (`npx tsc --noEmit`)
