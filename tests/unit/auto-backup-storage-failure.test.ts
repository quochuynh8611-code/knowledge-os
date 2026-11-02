import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runGuardedAutoBackup,
  getAutoBackupSnapshots,
  AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';
import * as storageModule from '../../src/lib/storage';

describe('RED Check A: Auto-Backup Engine Storage Failure Contract', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const validPayload: WorkspaceBackupPayload = {
    categories: [{ id: 'cat-1', name: 'Philosophy' }],
    topics: [{ id: 'top-1', title: 'Epistemology', categoryId: 'cat-1' }],
    notes: [{ id: 'note-1', title: 'Study Note', content: 'Valid content' }],
    resources: [{ id: 'res-1', title: 'Resource A' }],
    tags: [{ id: 'tag-1', name: 'core' }],
  };

  it('Scenario K1: returns status "storage-failed" when safeSetLocalStorageItem returns false', () => {
    // Seed an existing snapshot
    const initialResult = runGuardedAutoBackup(validPayload, { trigger: 'manual' });
    expect(initialResult.status).toBe('created');
    const originalSnapshots = getAutoBackupSnapshots();
    expect(originalSnapshots).toHaveLength(1);

    // Mock storage failure (e.g., localStorage quota exceeded)
    vi.spyOn(storageModule, 'safeSetLocalStorageItem').mockReturnValue(false);

    const mutatedPayload: WorkspaceBackupPayload = {
      ...validPayload,
      notes: [{ id: 'note-2', title: 'New Note', content: 'Brand new note' }],
    };

    // Execute backup with mutated content
    const result = runGuardedAutoBackup(mutatedPayload, { trigger: 'auto' });

    // EXPECTED BEHAVIORAL RED: Currently the engine returns 'created' because it ignores safeSetLocalStorageItem's return value.
    expect(result.status).toBe('storage-failed');
    expect(result.reason).toMatch(/lưu trữ|localStorage|đầy/i);
    expect(result.snapshot).toBeUndefined();

    // Verify original snapshot history was preserved intact
    const afterSnapshots = getAutoBackupSnapshots();
    expect(afterSnapshots).toHaveLength(1);
    expect(afterSnapshots[0].id).toBe(originalSnapshots[0].id);
  });

  it('Scenario K2: returns status "storage-failed" when safeSetLocalStorageItem throws an exception', () => {
    vi.spyOn(storageModule, 'safeSetLocalStorageItem').mockImplementation(() => {
      throw new Error('Disk IO or SecurityError');
    });

    const result = runGuardedAutoBackup(validPayload, { trigger: 'auto' });

    // EXPECTED BEHAVIORAL RED: Should return 'storage-failed' and not report 'created'
    expect(result.status).toBe('storage-failed');
    expect(result.snapshot).toBeUndefined();
  });
});
