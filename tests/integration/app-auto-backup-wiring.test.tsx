import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from '../../src/App';
import {
  getAutoBackupSnapshots,
  saveAutoBackupPreferences,
  runGuardedAutoBackup,
  AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY,
} from '../../src/lib/autoBackupScheduler';
import {
  STORAGE_VERSION_KEY,
  CURRENT_STORAGE_VERSION,
  STORAGE_ROOT_KEY,
} from '../../src/lib/storage';

describe('RED Check B: App-Level Auto-Backup Runtime Wiring Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Ensure storage compatibility version is set so harness data is not wiped by ensureStorageVersionCompatibility
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));

    // Seed local storage with valid non-empty workspace entities
    const seedCategories = [{ id: 'cat-wiring-1', name: 'Knowledge Architecture', slug: 'knowledge-architecture', type: 'general' }];
    const seedTopics = [{ id: 'top-wiring-1', title: 'System Resilience', slug: 'system-resilience', categoryId: 'cat-wiring-1', type: 'general' }];
    const seedNotes = [{ id: 'note-wiring-1', title: 'Runtime Wiring', content: 'Testing auto-backup hook in App', topicId: 'top-wiring-1' }];
    const seedResources = [{ id: 'res-wiring-1', title: 'ADR-110', type: 'book', topicId: 'top-wiring-1' }];
    const seedTags = [{ id: 'tag-wiring-1', name: 'architecture', slug: 'architecture' }];

    localStorage.setItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify(seedCategories));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_topics`, JSON.stringify(seedTopics));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_notes`, JSON.stringify(seedNotes));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_resources`, JSON.stringify(seedResources));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_tags`, JSON.stringify(seedTags));

    // Seed preferences: enabled = true, interval = 30 minutes
    saveAutoBackupPreferences({ enabled: true, intervalMinutes: 30, maxSnapshots: 10 });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Test B1 (Cold-Start): triggers automated baseline snapshot upon readiness when history is empty and modal is closed', async () => {
    expect(getAutoBackupSnapshots()).toHaveLength(0);

    // Render full App without opening Export/Import modal
    const { unmount } = render(<App />);

    // Allow async loadInitialData promise to resolve and trigger setIsHydrated(true)
    await act(async () => {
      await Promise.resolve();
    });

    // Advance 35 seconds for the tick to evaluate
    await act(async () => {
      vi.advanceTimersByTime(35 * 1000);
    });

    const snapshots = getAutoBackupSnapshots();

    // EXPECTED BEHAVIORAL RED: Currently App.tsx has no useAutoBackupScheduler hook mounted.
    // Length is 0 instead of 1.
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].trigger).toBe('auto');
    expect(snapshots[0].totalEntities).toBe(5);
    expect((snapshots[0].payload.notes as any[])[0].title).toBe('Runtime Wiring');

    unmount();
  });

  it('Test B2 (Warm-Start Due): respects interval deadline, not running before due, and running after deadline', async () => {
    // Seed an initial snapshot taken 5 minutes ago
    const olderTime = new Date(Date.now() - 5 * 60 * 1000);
    runGuardedAutoBackup(
      {
        categories: [{ id: 'cat-wiring-1', name: 'Knowledge Architecture', slug: 'knowledge-architecture', type: 'general' }],
        topics: [{ id: 'top-wiring-1', title: 'System Resilience', slug: 'system-resilience', categoryId: 'cat-wiring-1', type: 'general' }],
        notes: [{ id: 'note-wiring-1', title: 'Older Version', content: 'Old content', topicId: 'top-wiring-1' }],
        resources: [{ id: 'res-wiring-1', title: 'ADR-110', type: 'book', topicId: 'top-wiring-1' }],
        tags: [{ id: 'tag-wiring-1', name: 'architecture', slug: 'architecture' }],
      },
      { trigger: 'manual', now: olderTime }
    );

    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // Render full App without opening modal
    const { unmount } = render(<App />);

    // Advance 10 minutes (total elapsed = 15m, which is < 30m interval)
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    // Should NOT have created a new snapshot yet
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // Advance another 25 minutes (total elapsed = 40m, which is > 30m interval)
    await act(async () => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    const snapshots = getAutoBackupSnapshots();

    // EXPECTED BEHAVIORAL RED: Currently App.tsx has no scheduler hook wired,
    // so no auto snapshot is triggered after deadline. Length remains 1 instead of 2.
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    const newest = snapshots[0];
    expect(newest.trigger).toBe('auto');
    expect((newest.payload.notes as any[])[0].title).toBe('Runtime Wiring');

    unmount();
  });
});
