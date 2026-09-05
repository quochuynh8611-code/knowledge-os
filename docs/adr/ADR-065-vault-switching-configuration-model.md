# ADR-065: Managed Vault Profile Registry & Safe Vault Switching Architecture

- **Status: Proposed**
- **Implementation: Not started**
- **Architecture Decision Record:** ADR-065
- **Date:** 2026-09-05
- **Authors:** Staff Software Engineer / Technical Architect
- **Scope:**
  - `docs/adr/ADR-065-vault-switching-configuration-model.md`
  - `docs/specs/phase-p4-3a-vault-switching.md`
  - `docs/gherkin/phase-p4-3a-vault-switching.feature`

---

## 1. Context and Problem Statement

Knowledge OS provides a read-only bridge to local Obsidian vaults (P4.1 through P4.2G) covering document viewing, tree browsing, search, wiki-links, transclusion, and SSE file watching. Currently, the local server binds to a single configured vault root at startup.

Researchers often maintain multiple separate research vaults. Users desire the ability to change the active vault displayed in the user interface. However, accepting arbitrary filesystem paths from client requests introduces severe security risks:
- Directory traversal and jailbreak outside permitted boundaries.
- Unauthorized reading of sensitive system or user files.
- Symlink traversal and race conditions (TOCTOU).
- Stale index and watcher leakages across vault boundaries.

This ADR defines the configuration model, security boundaries, and lifecycle state machine for switching vaults safely.

> Note: Proposed contract; not implemented in P4.3A.

---

## 2. Deployment and Authorization Assumptions

The design operates under the following deployment and authorization assumptions:
- The design currently assumes a local, single-user deployment environment unless explicit repository documentation proves otherwise.
- If the server is exposed beyond localhost or provides multi-user access, the runtime switching endpoint must be disabled by default or must require explicit server-side authentication and authorization.
- Client-side visibility in the UI does not substitute for server-side authorization.
- Remote and multi-tenant access models remain deferred open questions.

---

## 3. Managed Vault Profile Model

To prevent arbitrary filesystem access, the client must never supply raw filesystem paths. All interactions use an opaque, stable identifier:

```typescript
type ManagedVaultProfile = {
  vaultId: string;  // Stable opaque key; client input.
  label: string;    // Display-only; never an authorization key.
  rootPath: string; // Server-only; never returned to client.
};
```

### Invariants for Vault Identifiers
- `vaultId` is the sole input for client switch requests.
- `label` is display-only for user interface rendering.
- `rootPath` exists server-side only and must never be exposed across the network.
- The client must not provide raw filesystem paths.
- The client must not use display labels or arbitrary names for authorization or switching.

---

## 4. Explicit Managed Vault Profile Registry

The system must use an:

```text
Explicit managed Vault profile registry / server-side allowlist
```

### Registry Rules
- The server must not automatically discover all directories in a parent folder.
- The server must not implicitly trust sibling directories.
- Scanning parent or adjacent directories must not serve as an authorization mechanism.
- Discovery may be an optional administrative pre-validation activity. It is not the authorization mechanism for the runtime switch API.
- The registry server-side mapping structure is: `vaultId → label → rootPath`.
- The exact storage format and file location of the administrative registry are deferred decisions.
- Database or Prisma models must not be used for this registry in P4.3A.
- The registry is strictly an administrative server configuration.

---

## 5. Active Vault Runtime Model

- **Global Active Vault**: The system maintains a single global active Vault runtime state suitable for local single-user operation.
- **No Per-Request Parameter**: The endpoints must not accept `?vault=...` parameters. Per-request vault context is deferred to avoid cross-vault state leakage and increased complexity.
- **Single Active Index and Watcher**: The system maintains exactly one active index and one active file watcher for the active Vault. Persistent multi-vault caching is deferred until future benchmarking justifies the resource cost.

---

## 6. Serialized Switch State Machine & Candidate Preparation

To eliminate partial initialization failures and race conditions, vault switching must execute under candidate preparation before publishing:

```text
[Switch Request: { vaultId }]
           │
           ▼
1. Acquire serialized switch lock
           │
           ▼
2. Validate vaultId against explicit managed registry
           │
           ▼
3. Validate candidate rootPath (exists, directory, read access, realpath, symlink policy)
           │
           ▼
4. Candidate preparation: initialize candidate index & watcher resources
     ├── Failure ──► Dispose candidate resources; retain the currently active
     │               Vault, watcher, and index unchanged; release lock; return error
     │               (Fallback: If new initialization fails, restore the prior root
     │                and critical prior services before reporting failure)
     ▼ Success
5. Atomically publish candidate as the active runtime state
           │
           ▼
6. Retire prior watcher and prior index only after candidate is verified usable
           │
           ▼
7. Broadcast switch transition: reset Browser/search caches, enforce stale Viewer policy
           │
           ▼
8. Release serialized switch lock
```

### Sequential Execution Steps
1. **Acquire a serialized switch lock**: Concurrent switch requests must be queued or rejected according to the validation policy.
2. **Validate requested `vaultId` against the explicit managed registry**: Reject unknown identifiers immediately.
3. **Resolve and validate candidate root**: Confirm the directory exists, read access is granted, canonical realpath is resolved, and symlink policies are satisfied.
4. **Prepare candidate runtime resources before publishing the active root**: Build candidate index and candidate watcher plan prior to updating active references.
5. **Handle preparation failures safely**: If candidate preparation fails, dispose candidate resources, retain the currently active Vault, watcher, and index unchanged, and return a safe redacted error. If new initialization fails, restore the prior root and critical prior services before reporting failure.
6. **Atomically publish candidate**: Update internal active references in a single step.
7. **Retire prior resources**: Retire prior watcher and prior index only after the candidate state is confirmed usable.
8. **Stale state enforcement**: Close the document Viewer or mark it stale; reset Browser tree and search caches; terminate or redirect SSE streams safely.
9. **Release switch lock**: Conclude the switch cycle.

---

## 7. Stale State Management for UI and Watchers

When switching active vaults:
- **Document Viewer**: Viewers opened under the previous Vault must not automatically read the same relative path against the newly activated Vault. The Viewer must close or transition to a stale display indicating reload is required.
- **Vault Browser**: Directory tree caches, search inputs, and search result caches must reset immediately.
- **Server-Sent Events (SSE)**: SSE watchers associated with the prior Vault must terminate with a safe closure code. Watcher events from the old Vault must not trigger refreshes in the new Vault context.

---

## 8. Client Storage Policy

- Server runtime state managed by ObsidianVaultManager is authoritative. No localStorage state is required for the initial runtime-switch design.
- The UI may persist the last server-confirmed vaultId as a non-authoritative display preference only. It cannot select, authorize, or automatically switch the active Vault. It must not persist a raw filesystem path.

---

## 9. Consequences and Verification

- **Security**: Raw filesystem paths never reach the network layer. Switching is constrained to administrative allowlists.
- **Stability**: Candidate preparation and rollback prevent broken server states during invalid switch attempts.
- **Clarity**: Single global active state matches the local single-user model without cross-request leakage.
- **Coverage**: All critical behaviors are covered by explicit test scenarios in the corresponding feature specification.
