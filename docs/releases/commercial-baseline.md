# Commercial Baseline Release Notes

**Release Date**: 2026-09-15
**Version**: `v0.16.0-commercial-baseline`
**Target Environment**: macOS Local-First / Web Application (Express + Vite + PostgreSQL)

---

## 🎯 Scope & Objectives

The Commercial Baseline transition refactors Knowledge OS from a personal research sandbox into a clean, multi-domain, commercial-grade knowledge management application.

### Key Deliverables:
1. **Dynamic Category & Topic Taxonomy Baseline**:
   - Replaced fixed, personal domain datasets with a single starter category (**Đông Y**) and initial onboarding topic (**Lý Luận Cơ Bản Đông Y**).
   - Enabled flexible, user-driven creation of custom categories and sub-topics across any field of study.
2. **Pruned Legacy Personal Analysis Modules**:
   - Removed obsolete personal analysis modules (Abhidharma Matrix, Divination Matrix, and Multilingual Lexicon registries) from the navigation, UI components, data structures, and command palette.
3. **Thư Viện Sách (EPUB Reader Experience)**:
   - Repurposed the former documentation explorer into a focused **Thư Viện Sách** (EPUB Book Library).
   - Added two primary book access modes: local directory scanning (`docs/books`) and direct file selection from a connected Obsidian Vault.
   - Built an in-memory XHTML/XML sanitizer for EPUB parsing safety without modifying original files.
4. **Stale-State Anti-Regeneration & Server-Canonical Hydration**:
   - Implemented server-as-single-source-of-truth (SSOT) hydration during application startup.
   - Guarded `/api/sync/hydrate` against resurrecting stale or unknown categories from legacy client caches.
   - Added automatic storage schema versioning (`v2`) and invalidation in `storage.ts`.
5. **Guarded Database Maintenance Suite**:
   - Built a 4-step guarded maintenance pipeline (`backup` → `dry-run` → `execute with explicit confirmation` → `audit invariants`).

---

## 🚫 Explicit Non-Goals

- **No Multi-Tenant / User Authentication**: The application remains a local-first, single-user system. No multi-tenant architecture is claimed.
- **No Hosted SaaS / Cloud Billing**: No cloud hosting, subscription management, or payment gateway is implemented.
- **No Server-Side EPUB Upload**: EPUB files are loaded locally from `docs/books` or via local Obsidian vault integration; no direct server upload endpoint is provided.
- **No Automatic Cloud Backup**: Backups are stored strictly on the local machine and excluded from version control.

---

## 🔒 Security & Data Safety Invariants

- **Safe In-Memory Sanitization**: EPUB XML corrections (named entities, bare `&`, `<`) occur strictly in-memory during decompression; the original `.epub` file on disk remains completely untouched.
- **Deterministic Maintenance Guardrails**: Reset scripts reject unconfirmed execution and require exact confirmation strings (`--confirm="XOA TOAN BO DATA CA NHAN"`).
- **Local-Only Backup Artifacts**: Database dumps and JSON snapshots in `backups/` are ignored in `.gitignore` and never committed to version control.
- **Credential Protection**: Database logs and audit outputs sanitize credentials, displaying only `host:port/database`.

---

## 🧪 Verification Summary

- **Typecheck**: `npm run typecheck` (0 errors).
- **Lint**: `npm run lint` (0 errors).
- **Unit & Integration Tests**: 100% passing across active test suites.
- **E2E & Browser Verification**:
  - Verified `/api/categories` returns only `cat-root-dong-y`.
  - Verified `/api/topics` returns only `topic-dong-y-co-ban`.
  - Hard-reloaded Chrome session twice at `http://localhost:3000` to confirm Sidebar renders only `Đông Y (1)`.
  - Successfully read real EPUB (`Chon_Ly_Toan_Tap_To_Su_Minh_Dang_Quang.epub`) and verified XML sanitization.

---

## ⚠️ Known Limitations

1. **Book File Location**: Books must reside within `docs/books` or within a designated Obsidian Vault.
2. **Direct Server Upload**: Drag-and-drop server upload is not implemented; users must place files in the supported directories.
3. **Database Reset Script**: The reset script is destructive and reserved strictly for local maintainers.
