# ADR-066: Backend Vault Profile Manager Implementation

- **Status: Accepted**
- **Implementation: In progress (P4.3B)**
- **Architecture Decision Record:** ADR-066
- **Date:** 2026-09-05
- **Authors:** Staff Software Engineer / Technical Architect
- **Associated Documents:**
  - [`ADR-065: Managed Vault Profile Registry & Safe Vault Switching Architecture`](./ADR-065-vault-switching-configuration-model.md)
  - [`P4.3A Technical Specification`](../specs/phase-p4-3a-vault-switching.md)
  - [`phase-p4-3a-vault-switching.feature`](../gherkin/phase-p4-3a-vault-switching.feature)

---

## 1. Context & Problem Statement

Phase P4.3A established the high-level design model (ADR-065) for safe Obsidian vault switching. P4.3B focuses on the backend runtime implementation:
- How to structure `ObsidianVaultManager` to handle lifecycle, candidate preparation, and atomicity.
- How to implement the managed profile registry without database schema changes.
- How to implement a serialized switch lock to prevent concurrent race conditions.
- How to strictly enforce DTO boundary protection (never leaking filesystem paths to HTTP responses).
- How to seamlessly integrate with existing Express routers (`createObsidianVaultRouter`, `createObsidianSearchRouter`, `createObsidianWatcherRouter`, `createObsidianVaultTreeRouter`, `createObsidianAttachmentRouter`).

---

## 2. Decision & Technical Architecture

### 2.1. In-Memory Registry Configuration (Phase 1)
- The registry is an in-memory array of `ManagedVaultProfile`:
  ```typescript
  export interface ManagedVaultProfile {
    vaultId: string;
    label: string;
    rootPath: string; // Server-only, strictly unexposed
  }
  ```
- Profiles can be initialized via environment configuration or default registry (fallback to `process.env.OBSIDIAN_VAULT_ROOT`).
- Database models and Prisma schemas are strictly prohibited for this phase.

### 2.2. Opaque Identifier Validation
- Client input `vaultId` must be sanitized and validated:
  - Non-empty string.
  - No path traversal characters (`..`, `/`, `\`, null-byte).
  - Must exist in the registered profile list.

### 2.3. Serialized Switch Lock (Mutex)
- `ObsidianVaultManager` maintains an internal `isSwitching` boolean flag.
- Any switch request arriving while `isSwitching === true` is rejected immediately with `409 SWITCH_IN_PROGRESS` (or queued deterministically).
- Lock release is guaranteed via `finally` block.

### 2.4. Candidate Preparation & Atomic Publication
1. Candidate root resolution: canonical path resolution, verifying existence, directory check, readable access, and symlink prohibition.
2. Candidate resource preparation: instantiate and build candidate index (`ObsidianVaultIndex.build(candidateRoot)`).
3. On failure: candidate resources are cleanly disposed, the currently active vault/watcher/index remain 100% untouched, and `500 SWITCH_FAILED` is returned.
4. On success:
   - Synchronously assign active vault profile, active index, and active watcher.
   - Gracefully terminate prior watcher (`closeAll()`).

### 2.5. Error Taxonomy & Response Codes
- `400 MISSING_VAULT_ID`: Body omitted or missing `vaultId`.
- `400 INVALID_VAULT_ID`: `vaultId` contains illegal characters or path separators.
- `404 VAULT_NOT_FOUND`: `vaultId` not found in the registry.
- `409 SWITCH_IN_PROGRESS`: A vault switch operation is currently running.
- `500 SWITCH_FAILED`: Candidate preparation or initialization failed; prior state preserved.

### 2.6. Strict DTO Boundary Protection
- Endpoints `GET /api/obsidian/vaults`, `POST /api/obsidian/vault/switch`, and `GET /api/obsidian/vault/status` must never expose `rootPath`.
- Output is strictly projected into public DTOs:
  - `VaultSummaryDto`: `{ vaultId: string; label: string; isCurrent: boolean }`
  - `VaultSwitchResponse`: `{ success: true; activeVaultId: string; label: string }`
  - `VaultStatusResponse`: `{ configured: boolean; activeVaultId: string | null; label: string | null; accessible: boolean }`

---

## 3. Consequences & Blast Radius

- **Security**: Complete prevention of arbitrary directory traversal and path reconnaissance.
- **Resilience**: Zero partial failures; active runtime is never broken by an invalid switch target.
- **Compatibility**: Integrates via existing `getVaultRoot: () => string | null | undefined` pattern.
