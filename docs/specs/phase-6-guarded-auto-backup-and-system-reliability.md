# Phase 6 Technical Specification: Guarded Auto-Backup Engine & System Reliability

## Feature: Guarded Auto-Backup Engine and Snapshot Retention Rotation

As a researcher using Knowledge OS
I want automated, guarded background backups with deterministic deduplication and ring-buffer rotation
So that my research data is continuously protected against accidental loss without corrupting backup history or exhausting browser storage.

### Rule 1: Zero-Data Overwrite Guard
Automated backup runs MUST refuse to create a snapshot or rotate existing valid snapshots when the workspace has 0 entities, unless explicitly forced.

Scenario: Automated backup skips when workspace has 0 entities
  Given an empty workspace payload with 0 categories, 0 topics, 0 notes, 0 flashcards, 0 resources, 0 tags
  And non-empty snapshots already exist in snapshot history
  When runGuardedAutoBackup is executed with trigger "auto"
  Then the result status is "skipped-empty"
  And the existing snapshots in history remain completely untouched

Scenario: Manual backup allows empty workspace snapshot when forceEmpty is true
  Given an empty workspace payload with 0 entities
  When runGuardedAutoBackup is executed with trigger "manual" and forceEmpty set to true
  Then the result status is "created"
  And a new snapshot with totalEntities equal to 0 is recorded in history

### Rule 2: Deterministic Content Fingerprint & Deduplication
Consecutive backup requests with unchanged workspace content MUST NOT create duplicate snapshots.

Scenario: Backup skips when workspace content is unchanged
  Given a workspace payload with existing research entities
  And an initial snapshot has been successfully recorded
  When runGuardedAutoBackup is executed again with identical workspace entities
  Then the result status is "skipped-unchanged"
  And the snapshot history length does not increase
  And the returned fingerprint matches the previous snapshot's fingerprint

Scenario: Backup triggers when workspace content is mutated or added
  Given a workspace payload with a note
  And an initial snapshot has been recorded
  When a note content or timestamp is updated, or a new flashcard is added
  And runGuardedAutoBackup is executed
  Then a new fingerprint is computed
  And the result status is "created"
  And the snapshot history contains the new snapshot at index 0

### Rule 3: Atomic Verify-Before-Rotate Retention Policy ($N$ Snapshots Ring Buffer)
Candidate payloads must be strictly validated before recording. Pruning of the oldest snapshots beyond maxSnapshots happens only after the new snapshot is verified.

Scenario: Invalid payload is rejected without affecting history
  Given an invalid payload with corrupted entity structures
  And existing snapshots in history
  When runGuardedAutoBackup is executed
  Then the result status is "rejected-invalid"
  And the snapshot history is preserved unchanged

Scenario: Retention rotates oldest snapshots beyond maxSnapshots in reverse-chronological order
  Given a maxSnapshots configuration of 3
  When 5 distinct valid backups are created sequentially
  Then exactly 3 snapshots are retained in history
  And the newest snapshot is at index 0
  And the 2 oldest snapshots are pruned

### Rule 4: Hermetic Scheduling & Preferences
Preference management and schedule due checks operate deterministically via pure timestamp math without background setInterval timer leaks.

Scenario: Backup due check calculates interval expiration accurately
  Given an auto-backup preference interval of 30 minutes
  When lastBackupAt was 31 minutes ago
  Then isAutoBackupDue returns true
  When lastBackupAt was 10 minutes ago
  Then isAutoBackupDue returns false
  When lastBackupAt is undefined or null
  Then isAutoBackupDue returns true

Scenario: Snapshot retrieval and deletion by ID
  Given an existing snapshot with a known ID in history
  When getAutoBackupSnapshotById is called with that ID
  Then the snapshot record is returned with its complete payload
  When deleteAutoBackupSnapshot is called with that ID
  Then that snapshot is removed from history
