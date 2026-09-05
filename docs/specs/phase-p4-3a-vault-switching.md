# Phase P4.3A Technical Specification: Safe Obsidian Vault Switching Architecture

- **Status: Proposed**
- **Implementation: Not started**
- **Feature Code:** P4.3A
- **Target Release:** Knowledge OS Local Enterprise
- **Associated ADR:** [`ADR-065`](../adr/ADR-065-vault-switching-configuration-model.md)
- **Associated Feature File:** [`phase-p4-3a-vault-switching.feature`](../gherkin/phase-p4-3a-vault-switching.feature)

---

## 1. Executive Summary & Design Scope

This specification defines the architecture, data structures, and state transitions required to support safe switching between multiple pre-approved Obsidian vaults within Knowledge OS.

> Note: Proposed contract; not implemented in P4.3A.

### Core Architectural Invariants
1. **Explicit Managed Registry**: The server only operates on vaults explicitly declared in an administrative server-side allowlist.
2. **Opaque Client Identifiers**: The client identifies target vaults strictly by `vaultId`. Client-supplied filesystem paths are rejected according to the validation policy.
3. **Single Global Active Vault**: A single active vault reference is maintained in server runtime memory for local single-user usage.
4. **Candidate Preparation Before Publishing**: New vault resources must be validated and prepared before replacing the active vault.
5. **Stale State Isolation**: Viewers, file tree caches, search indices, and SSE channels must be invalidated or closed upon switching to avoid cross-vault data contamination.

---

## 2. Deployment and Authorization Assumptions

- The design assumes a local single-user deployment environment unless explicit repository documentation proves otherwise.
- If the server is exposed outside localhost or provides multi-user access, the runtime switching endpoint must be disabled by default or must require explicit server-side authentication and authorization.
- Client-side visibility in the UI does not substitute for server-side authorization.
- Broader multi-tenant authorization boundaries remain deferred open questions.

---

## 3. Managed Vault Profile Model

```typescript
type ManagedVaultProfile = {
  vaultId: string;  // Stable opaque key; client input.
  label: string;    // Display-only; never an authorization key.
  rootPath: string; // Server-only; never returned to client.
};
```

### Profile Field Invariants
- `vaultId`: The sole identifier acceptable in client switch requests.
- `label`: Display text for the UI dropdown; must not be treated as an authorization token.
- `rootPath`: Resolved filesystem path maintained exclusively server-side.
- Raw filesystem paths must never be returned to or accepted from the client.

---

## 4. Explicit Managed Vault Profile Registry

The system employs an:

```text
Explicit managed Vault profile registry / server-side allowlist
```

### Discovery and Registry Policies
- Auto-discovery across entire parent directories is prohibited.
- Sibling directories are not automatically trusted.
- Scanning parent or adjacent directories must not be used as an authorization mechanism.
- Discovery may be an optional administrative pre-validation activity. It is not the authorization mechanism for the runtime switch API.
- The server maps: `vaultId → label → rootPath`.
- Format and storage location of the administrative registry are deferred decisions.
- Database models and Prisma schemas must not be introduced for this registry in P4.3A.

---

## 5. Active Vault Runtime Model

- **Global Runtime State**: A single global active Vault is maintained in memory by `ObsidianVaultManager`.
- **No Per-Request Parameter**: Endpoints do not accept `?vault=...` parameters. Per-request scoping is deferred to prevent cross-vault state leakage.
- **Single Active Index & Watcher**: Exactly one index and one file watcher are active at any given time. Multi-vault concurrent caching is deferred until benchmark evidence demonstrates necessity.

---

## 6. Serialized Switch State Machine & Candidate Preparation

All vault transitions must execute under candidate preparation before publishing:

```text
1. Acquire a serialized switch lock
2. Validate requested vaultId against the explicit managed registry
3. Resolve and validate candidate root (exists, directory, read access, realpath, symlink policy)
4. Prepare candidate runtime resources (candidate index & candidate watcher plan)
     ├── On Failure: Dispose candidate resources; retain the currently active
     │               Vault, watcher, and index unchanged; release lock; return error
     │               (If new initialization fails, restore the prior root
     │                and critical prior services before reporting failure)
     └── On Success:
5. Atomically publish candidate as active runtime state
6. Retire prior watcher and prior index only after candidate is verified usable
7. Invalidate client caches: reset Browser tree, clear search, close/stale Viewer, disconnect old SSE
8. Release serialized switch lock
```

### Transition Steps in Detail
1. **Lock Acquisition**: Acquire a serialized switch lock to prevent concurrent execution conflicts.
2. **Registry Lookup**: Verify that `vaultId` exists in the administrative registry; reject with `404 VAULT_NOT_FOUND` if absent.
3. **Candidate Validation**: Verify that the resolved directory exists, has read permissions, is not a symbolic link, and satisfies vault structure checks.
4. **Candidate Preparation**: Initialize candidate index and watcher resources in isolation.
5. **Rollback on Failure**: If candidate preparation fails, dispose candidate resources, retain the currently active Vault, watcher, and index unchanged, and return a safe error code. If new initialization fails, restore the prior root and critical prior services before reporting failure.
6. **Atomic Publication**: Update active pointers in server memory in one synchronous step.
7. **Retirement**: Retire prior watcher and prior index only after candidate components are verified usable.
8. **Stale State Handling**: Evict old directory trees, search caches, and close prior document viewers.
9. **Lock Release**: Release the switch lock and return confirmation to the client.

---

## 7. Proposed API Contracts

> Proposed contract; not implemented in P4.3A.

### 7.1. List Available Vaults
- **Endpoint**: `GET /api/obsidian/vaults`
- **Response (200 OK)**:
  ```json
  {
    "activeVaultId": "research-main",
    "vaults": [
      {
        "vaultId": "research-main",
        "label": "Main Research Vault",
        "isCurrent": true
      },
      {
        "vaultId": "archive-vault",
        "label": "Archived Knowledge",
        "isCurrent": false
      }
    ]
  }
  ```
- No filesystem paths may appear in the response.

### 7.2. Switch Active Vault
- **Endpoint**: `POST /api/obsidian/vault/switch`
- **Request Body**:
  ```json
  {
    "vaultId": "archive-vault"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "activeVaultId": "archive-vault",
    "label": "Archived Knowledge"
  }
  ```
- **Error Codes**:
  - `400 MISSING_VAULT_ID`: The `vaultId` property was omitted.
  - `400 INVALID_VAULT_ID`: The identifier contains invalid characters or path separators.
  - `404 VAULT_NOT_FOUND`: The identifier is not registered in the managed profile registry.
  - `409 SWITCH_IN_PROGRESS`: A concurrent switch request is already in progress.
  - `500 SWITCH_FAILED`: Candidate preparation failed; prior vault was preserved.

### 7.3. Vault Status
- **Endpoint**: `GET /api/obsidian/vault/status`
- **Response (200 OK)**:
  ```json
  {
    "configured": true,
    "activeVaultId": "archive-vault",
    "label": "Archived Knowledge",
    "accessible": true
  }
  ```

---

## 8. Stale State Policies for UI and File Watchers

- **Document Viewer**: The document Viewer must not read the same relative path against the new Vault. The Viewer must close or transition to a stale indicator requiring explicit user re-selection.
- **Vault Browser**: Directory tree nodes, expanded folder sets, search queries, and search result caches must reset immediately.
- **Server-Sent Events (SSE)**: SSE streams bound to the prior root must close cleanly. Watcher notifications from the prior Vault must not trigger refreshes in the new Vault context.

---

## 9. Client Storage Policy

- Server runtime state managed by ObsidianVaultManager is authoritative. No localStorage state is required for the initial runtime-switch design.
- The UI may persist the last server-confirmed vaultId as a non-authoritative display preference only. It cannot select, authorize, or automatically switch the active Vault. It must not persist a raw filesystem path.
