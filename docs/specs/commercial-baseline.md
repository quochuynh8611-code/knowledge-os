# Specification: Commercial Baseline Architecture & Product Scope

**Document Status**: Active / Canonical Baseline
**Date**: 2026-09-15
**Replaces**: Legacy Fixed Multi-Domain Registry Specs (P12.x, Scholar Suite Registry)

---

## 1. Overview & System Goals

Knowledge OS provides a clean, local-first knowledge management foundation that allows learners and researchers to define their own dynamic taxonomy. The system eliminates hard-coded domain registries in favor of a flexible database-backed data model.

---

## 2. Core Functional Requirements

### 2.1 Dynamic Taxonomy & Hierarchy
- **Category Model**: Categories represent top-level study fields (`id`, `name`, `slug`, `type`, `description`, `icon`, `color`, `order`).
- **Topic Model**: Topics belong to exactly one category (`categoryId`) and can optionally nest under parent topics.
- **Initial Seed**:
  - Exactly 1 Category: `cat-root-dong-y` ("Đông Y", `slug: dong-y`).
  - Exactly 1 Topic: `topic-dong-y-co-ban` ("Lý Luận Cơ Bản Đông Y", `slug: ly-luan-co-ban-dong-y`).
  - Exactly 1 Note: `note-commercial-onboarding` ("Hướng dẫn bắt đầu sử dụng Knowledge OS").
  - Exactly 2 Starter Flashcards: `card-commercial-1`, `card-commercial-2`.

### 2.2 Server-Canonical Startup Hydration
- **Single Source of Truth (SSOT)**: When the application loads, the client queries `/api/categories` and `/api/topics` as canonical state.
- **Client Cache Reconciliation**: Local storage items not present in the server's canonical response are pruned, preventing deleted records from re-appearing.
- **Sync Guard**: The `/api/sync/hydrate` and sync endpoints reject creation of categories with unknown legacy IDs from stale clients.

### 2.3 Thư Viện Sách (EPUB Reader Experience)
- **Local Book Discovery**:
  - Scans `docs/books` for `.epub` files via backend `/api/docs/files`.
  - Discovers EPUB files inside linked Obsidian Vaults.
- **In-Memory Sanitizer**:
  - Inspects `.xhtml`, `.html`, `.htm` chapters in the EPUB archive.
  - Converts HTML named entities (e.g. `&times;`, `&nbsp;`) to valid XML character entities.
  - Fixes unescaped bare ampersands (`&`) and bare `<` characters.
  - Never mutates the source file on disk.
- **Reading Controls**:
  - Persistent CFI bookmarking in `localStorage`.
  - Font size controls (12px to 28px).
  - Single-page / double-page spread toggle.

### 2.4 Guarded Maintenance Tools
- `scripts/maintenance/commercial-reset-backup.ts`: Produces timestamped JSON snapshot and SQL dump with SHA-256 validation.
- `scripts/maintenance/commercial-reset-db.ts`: Dry-run by default; requires `--execute --confirm="XOA TOAN BO DATA CA NHAN"` for mutation.
- `scripts/maintenance/commercial-reset-audit.ts`: Validates invariants post-execution.
