# ADR-110: Phase 6 — Guarded Auto-Backup Engine, Retention Rotation & Strict Integrity Verification

## Status
Accepted

## Context
Across academic research workflows, researchers continuously create, modify, and link literature references, notes, PDF excerpts, and spaced-repetition flashcards. A catastrophic data loss event (such as accidental browser storage eviction, failed schema restore, or an empty workspace overwrite) would destroy months of intellectual synthesis.

While manual export and preflight restore validation exist in Knowledge OS (`src/lib/backupVerification.ts` and `src/lib/validation.ts`), automated background protection and local snapshot rotation were missing:
1. Without a safety guard, automated scheduled backups could capture an uninitialized or empty session (`totalEntities === 0`) and overwrite valid snapshots in history.
2. Without deterministic fingerprint deduplication, periodic auto-backups would create redundant copies every few minutes even when research data remains completely static, inflating browser storage.
3. Without an atomic verify-before-rotate ring buffer, corrupted candidate payloads could prune valid historical backups before verifying that the replacement payload is intact.
4. Without hermetic test scheduling, timer-based background loops (`setInterval`) could leak across test runs, violating ADR-077.

## Decision

We implement the core reliability engine in `src/lib/autoBackupScheduler.ts` governed by 4 core architectural invariants:

### 1. Zero-Data Overwrite Guard (Critical Data Safety Invariant)
Automated backups (`trigger: 'auto'`) or unforced snapshots MUST refuse to record or rotate existing snapshots when candidate workspace payload has `totalEntities === 0` (`categories + topics + notes + flashcards + resources + tags === 0`).
The engine returns:
```ts
{
  status: 'skipped-empty',
  reason: 'Workspace is empty (0 entities). Auto-backup refused to overwrite history.',
  retainedCount: number
}
```
Unless `options.forceEmpty === true` is explicitly provided by the user in manual operations, historical snapshots are preserved 100% intact.

### 2. Deterministic Content Fingerprint & Deduplication
The engine computes a deterministic content fingerprint (`computeSnapshotFingerprint`) derived from entity counts, entity IDs, and `updatedAt` timestamps in canonical sorting order (integrating with `calculateBackupChecksum` / SHA-256).
If the computed fingerprint matches the most recent retained snapshot in the ring buffer:
```ts
{
  status: 'skipped-unchanged',
  fingerprint: string,
  retainedCount: number
}
```
No redundant snapshot is created.

### 3. Atomic Verify-Before-Rotate Retention Policy ($N$ Snapshots Ring Buffer)
The local snapshot ring buffer is stored in `localStorage` under the key `knowledge_os_auto_backup_snapshots_v1`.
- Candidate payloads undergo preflight schema verification (`inspectAutoBackupCandidate`) ensuring all entity collections are valid arrays and structure matches either Flat or Semver 2.0 enveloped backup formats.
- Invalid or corrupted payloads are rejected immediately with `{ status: 'rejected-invalid' }` without touching existing history.
- Pruning older snapshots beyond `maxSnapshots` (default `10`, clamped between `[3, 50]`) occurs **strictly after** the new snapshot passes integrity verification and is prepended.
- Pre-restore safety snapshots (`trigger: 'pre-restore'`) are captured before destructive restores to allow instant rollback.

### 4. Hermetic Test Guard Compliance (ADR-077)
Scheduling calculations (`isAutoBackupDue(lastBackupIso, prefs, now)`) are pure deterministic timestamp evaluations. Preferences (`getAutoBackupPreferences()`, `saveAutoBackupPreferences()`) default to `intervalMinutes: 30`, `maxSnapshots: 10`, `enabled: true`. No active `setInterval` or polling loops are leaked during test execution.

## Consequences

### Positive
- **Ironclad Data Protection**: Zero risk of empty workspace clobbering existing backups.
- **Efficient Local Storage**: Fingerprint deduplication avoids redundant writes to `localStorage`.
- **Atomic Reliability**: Corrupted data cannot evict healthy snapshots.
- **Instant Rollback**: Every destructive action (e.g. restore or replace) can be preceded by a `pre-restore` snapshot.
- **Full Test Hermeticity**: Test suites execute deterministically without asynchronous timers or flaky waits.

### Neutral / Trade-offs
- `localStorage` capacity (~5MB-10MB depending on browser) limits snapshot payload size. Large attachments should be stored in the file library rather than embedded inside JSON payloads.
