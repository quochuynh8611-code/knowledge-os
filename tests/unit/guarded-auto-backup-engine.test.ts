import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  inspectAutoBackupCandidate,
  computeSnapshotFingerprint,
  runGuardedAutoBackup,
  isAutoBackupDue,
  getAutoBackupPreferences,
  saveAutoBackupPreferences,
  getAutoBackupSnapshots,
  getAutoBackupSnapshotById,
  deleteAutoBackupSnapshot,
  clearAutoBackupSnapshots,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';

describe('Phase 6A: Guarded Auto-Backup Engine, Retention Rotation & Integrity Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Scenario 1: Snapshot Inspection & Deterministic Fingerprinting
  it('accurately inspects candidate payloads and produces deterministic fingerprints invariant to exportedAt jitter', () => {
    const payload1: WorkspaceBackupPayload = {
      version: '2.0.0',
      exportedAt: '2026-10-25T10:00:00.000Z',
      categories: [{ id: 'cat-1', name: 'Methodology' }],
      topics: [{ id: 'top-1', title: 'Empirical Analysis', categoryId: 'cat-1' }],
      notes: [{ id: 'note-1', title: 'Research Memo', content: 'Notes on methodology', updatedAt: '2026-10-25T09:00:00.000Z' }],
      flashcards: [{ id: 'fc-1', front: 'Concept', back: 'Definition', due: '2026-10-26T00:00:00.000Z' }],
      resources: [{ id: 'res-1', title: 'Paper A', url: 'https://doi.org/10.1000/182' }],
      tags: [{ id: 'tag-1', name: 'peer-reviewed' }],
    };

    const payload2WithDifferentTime: WorkspaceBackupPayload = {
      version: '2.0.0',
      exportedAt: '2026-10-25T15:30:00.000Z', // Different export timestamp
      categories: [{ id: 'cat-1', name: 'Methodology' }],
      topics: [{ id: 'top-1', title: 'Empirical Analysis', categoryId: 'cat-1' }],
      notes: [{ id: 'note-1', title: 'Research Memo', content: 'Notes on methodology', updatedAt: '2026-10-25T09:00:00.000Z' }],
      flashcards: [{ id: 'fc-1', front: 'Concept', back: 'Definition', due: '2026-10-26T00:00:00.000Z' }],
      resources: [{ id: 'res-1', title: 'Paper A', url: 'https://doi.org/10.1000/182' }],
      tags: [{ id: 'tag-1', name: 'peer-reviewed' }],
    };

    const inspection1 = inspectAutoBackupCandidate(payload1);
    const inspection2 = inspectAutoBackupCandidate(payload2WithDifferentTime);

    expect(inspection1.valid).toBe(true);
    expect(inspection1.totalEntities).toBe(6);
    expect(inspection1.counts).toEqual({
      categories: 1,
      topics: 1,
      notes: 1,
      flashcards: 1,
      resources: 1,
      tags: 1,
    });

    // Content fingerprints must be identical despite exportedAt timestamp jitter
    expect(inspection1.fingerprint).toBeTruthy();
    expect(inspection1.fingerprint).toBe(inspection2.fingerprint);
  });

  // Scenario 2: Zero-Data Overwrite Guard
  it('refuses to overwrite existing snapshot history when candidate workspace is empty (totalEntities === 0)', () => {
    // 1. Seed a non-empty snapshot
    const validPayload: WorkspaceBackupPayload = {
      categories: [{ id: 'cat-1', name: 'Science' }],
      notes: [{ id: 'n-1', title: 'Note 1', content: 'Substantial content' }],
    };
    const initialResult = runGuardedAutoBackup(validPayload, { trigger: 'manual' });
    expect(initialResult.status).toBe('created');
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // 2. Attempt auto-backup with 0 entities
    const emptyPayload: WorkspaceBackupPayload = {
      categories: [],
      topics: [],
      notes: [],
      flashcards: [],
      resources: [],
      tags: [],
    };
    const emptyResult = runGuardedAutoBackup(emptyPayload, { trigger: 'auto' });

    expect(emptyResult.status).toBe('skipped-empty');
    expect(emptyResult.retainedCount).toBe(1);

    // Snapshot history remains intact
    const currentSnapshots = getAutoBackupSnapshots();
    expect(currentSnapshots).toHaveLength(1);
    expect(currentSnapshots[0].totalEntities).toBe(2);
  });

  // Scenario 3: Explicit Force-Empty Override
  it('allows recording an empty snapshot only when forceEmpty: true is explicitly provided', () => {
    const emptyPayload: WorkspaceBackupPayload = {
      categories: [],
      topics: [],
      notes: [],
      flashcards: [],
      resources: [],
      tags: [],
    };

    // By default without forceEmpty -> skipped-empty
    const deniedResult = runGuardedAutoBackup(emptyPayload, { trigger: 'manual' });
    expect(deniedResult.status).toBe('skipped-empty');
    expect(getAutoBackupSnapshots()).toHaveLength(0);

    // Explicit forceEmpty: true -> created
    const forcedResult = runGuardedAutoBackup(emptyPayload, {
      trigger: 'manual',
      forceEmpty: true,
      label: 'Intentional reset snapshot',
    });

    expect(forcedResult.status).toBe('created');
    expect(forcedResult.snapshot?.totalEntities).toBe(0);
    expect(forcedResult.snapshot?.label).toBe('Intentional reset snapshot');
    expect(getAutoBackupSnapshots()).toHaveLength(1);
  });

  // Scenario 4: Unchanged Workspace Deduplication
  it('skips duplicate backups when workspace entities are unchanged between consecutive runs', () => {
    const payload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-1', title: 'Thesis Draft', content: 'Chapter 1 review', updatedAt: '2026-10-25T12:00:00Z' }],
      resources: [{ id: 'r-1', title: 'Source Reference' }],
    };

    const firstRun = runGuardedAutoBackup(payload, { trigger: 'auto' });
    expect(firstRun.status).toBe('created');
    expect(firstRun.retainedCount).toBe(1);

    // Second run with identical payload
    const secondRun = runGuardedAutoBackup(payload, { trigger: 'auto' });
    expect(secondRun.status).toBe('skipped-unchanged');
    expect(secondRun.fingerprint).toBe(firstRun.snapshot?.fingerprint);
    expect(secondRun.retainedCount).toBe(1);

    // No duplicate snapshot was appended
    expect(getAutoBackupSnapshots()).toHaveLength(1);
  });

  // Scenario 5: Entity Mutation & Addition Detection
  it('detects entity content mutation or addition and records a new snapshot', () => {
    const initialPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-1', title: 'Hypothesis', content: 'Version 1', updatedAt: '2026-10-25T12:00:00Z' }],
    };

    const run1 = runGuardedAutoBackup(initialPayload, { trigger: 'auto' });
    expect(run1.status).toBe('created');

    // Mutate note content and timestamp
    const mutatedPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-1', title: 'Hypothesis', content: 'Version 2 with empirical findings', updatedAt: '2026-10-25T12:30:00Z' }],
    };

    const run2 = runGuardedAutoBackup(mutatedPayload, { trigger: 'auto' });
    expect(run2.status).toBe('created');
    expect(run2.snapshot?.fingerprint).not.toBe(run1.snapshot?.fingerprint);
    expect(getAutoBackupSnapshots()).toHaveLength(2);

    // Add a new entity
    const augmentedPayload: WorkspaceBackupPayload = {
      ...mutatedPayload,
      flashcards: [{ id: 'fc-new', front: 'Q1', back: 'A1' }],
    };

    const run3 = runGuardedAutoBackup(augmentedPayload, { trigger: 'auto' });
    expect(run3.status).toBe('created');
    expect(run3.snapshot?.totalEntities).toBe(2);
    expect(getAutoBackupSnapshots()).toHaveLength(3);
  });

  // Scenario 6: Deterministic Retention Rotation (N Snapshots Ring Buffer)
  it('enforces retention rotation by keeping only the N newest snapshots in reverse-chronological order', () => {
    // Run 5 distinct valid backups with maxSnapshots = 3
    for (let i = 1; i <= 5; i++) {
      const payload: WorkspaceBackupPayload = {
        notes: [{ id: `note-${i}`, title: `Draft ${i}`, content: `Content ${i}` }],
      };
      const res = runGuardedAutoBackup(payload, {
        trigger: 'auto',
        label: `Backup ${i}`,
        maxSnapshots: 3,
        now: new Date(2026, 9, 25, 10, i * 10),
      });
      expect(res.status).toBe('created');
    }

    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(3);

    // Ordered reverse-chronological (newest first)
    expect(snapshots[0].label).toBe('Backup 5');
    expect(snapshots[1].label).toBe('Backup 4');
    expect(snapshots[2].label).toBe('Backup 3');

    // Backups 1 and 2 were pruned
    expect(snapshots.some((s) => s.label === 'Backup 1')).toBe(false);
    expect(snapshots.some((s) => s.label === 'Backup 2')).toBe(false);
  });

  // Scenario 7: Corrupted / Invalid Payload Rejection
  it('rejects invalid or corrupted payloads without modifying existing snapshot history', () => {
    // 1. Establish valid snapshot
    runGuardedAutoBackup({ notes: [{ id: 'valid-1', title: 'Valid' }] }, { trigger: 'manual' });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // 2. Corrupted cases
    const corruptedCases = [
      null,
      undefined,
      'a plain string',
      12345,
      { categories: 'not-an-array' },
      { notes: 42 },
      { topics: { not: 'array' } },
    ];

    for (const badPayload of corruptedCases) {
      const res = runGuardedAutoBackup(badPayload, { trigger: 'auto' });
      expect(res.status).toBe('rejected-invalid');
      expect(res.reason).toBeTruthy();
    }

    // Existing snapshot history remains completely untouched
    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].counts.notes).toBe(1);
  });

  // Scenario 8: Auto-Backup Preferences & Schedule Due Check
  it('manages auto-backup preferences and deterministically checks if a backup is due', () => {
    // Defaults
    const defaultPrefs = getAutoBackupPreferences();
    expect(defaultPrefs.enabled).toBe(true);
    expect(defaultPrefs.intervalMinutes).toBe(30);
    expect(defaultPrefs.maxSnapshots).toBe(10);

    // Save customized clamped preferences
    const saved = saveAutoBackupPreferences({
      enabled: false,
      intervalMinutes: 2, // Should clamp to minimum 5
      maxSnapshots: 100, // Should clamp to maximum 50
    });
    expect(saved.enabled).toBe(false);
    expect(saved.intervalMinutes).toBe(5);
    expect(saved.maxSnapshots).toBe(50);

    // Persistence test
    const reloaded = getAutoBackupPreferences();
    expect(reloaded).toEqual(saved);

    // isAutoBackupDue evaluations
    const activePrefs = { enabled: true, intervalMinutes: 30, maxSnapshots: 10 };
    const now = new Date('2026-10-25T14:30:00.000Z');

    // Never backed up -> due
    expect(isAutoBackupDue(null, activePrefs, now)).toBe(true);
    expect(isAutoBackupDue(undefined, activePrefs, now)).toBe(true);

    // 35 minutes ago -> due
    const past35Min = new Date('2026-10-25T13:55:00.000Z').toISOString();
    expect(isAutoBackupDue(past35Min, activePrefs, now)).toBe(true);

    // 15 minutes ago -> not due
    const past15Min = new Date('2026-10-25T14:15:00.000Z').toISOString();
    expect(isAutoBackupDue(past15Min, activePrefs, now)).toBe(false);

    // Disabled in preferences -> not due
    expect(isAutoBackupDue(past35Min, { ...activePrefs, enabled: false }, now)).toBe(false);
  });

  // Scenario 9: Snapshot Recovery & Deletion
  it('retrieves full snapshot payload by id and deletes specific snapshot cleanly', () => {
    const payload1: WorkspaceBackupPayload = { notes: [{ id: 'n-1', title: 'Note 1' }] };
    const payload2: WorkspaceBackupPayload = { notes: [{ id: 'n-2', title: 'Note 2' }] };

    const snap1 = runGuardedAutoBackup(payload1, { trigger: 'manual', label: 'Snap 1' }).snapshot!;
    const snap2 = runGuardedAutoBackup(payload2, { trigger: 'manual', label: 'Snap 2' }).snapshot!;

    expect(getAutoBackupSnapshots()).toHaveLength(2);

    // Retrieve by ID
    const retrieved = getAutoBackupSnapshotById(snap1.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(snap1.id);
    expect(retrieved?.payload.notes).toHaveLength(1);

    // Non-existent ID
    expect(getAutoBackupSnapshotById('non-existent-id')).toBeNull();

    // Delete single snapshot
    const remaining = deleteAutoBackupSnapshot(snap1.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(snap2.id);
    expect(getAutoBackupSnapshotById(snap1.id)).toBeNull();

    // Clear all snapshots
    clearAutoBackupSnapshots();
    expect(getAutoBackupSnapshots()).toHaveLength(0);
  });
});
