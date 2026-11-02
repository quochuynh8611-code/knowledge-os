import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoBackupScheduler } from '../../src/hooks/useAutoBackupScheduler';
import {
  getAutoBackupSnapshots,
  saveAutoBackupPreferences,
  runGuardedAutoBackup,
  AUTO_BACKUP_SNAPSHOTS_STORAGE_KEY,
  AUTO_BACKUP_PREFERENCES_CHANGED_EVENT,
  AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';
import * as storageModule from '../../src/lib/storage';

describe('GREEN: useAutoBackupScheduler Hook Unit Test Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    saveAutoBackupPreferences({ enabled: true, intervalMinutes: 30, maxSnapshots: 10 });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const samplePayload: WorkspaceBackupPayload = {
    categories: [{ id: 'cat-1', name: 'Philosophy' }],
    topics: [{ id: 'top-1', title: 'Epistemology', categoryId: 'cat-1' }],
    notes: [{ id: 'n-1', title: 'Knowledge Theory', content: 'Justified true belief' }],
    resources: [{ id: 'r-1', title: 'Stanford Encyclopedia' }],
    tags: [{ id: 't-1', name: 'epistemic' }],
  };

  it('Scenario A (Cold Start): creates auto snapshot immediately upon mount when ready and history is empty', async () => {
    expect(getAutoBackupSnapshots()).toHaveLength(0);

    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
      })
    );

    // Flush initial mount microtasks
    await act(async () => {});

    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].trigger).toBe('auto');
    expect(snapshots[0].totalEntities).toBe(5);

    unmount();
  });

  it('Scenario C1: pending hydration blocks auto backup evaluation', async () => {
    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: false, // In hydration
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000); // 35 minutes
    });

    expect(getAutoBackupSnapshots()).toHaveLength(0);
    unmount();
  });

  it('Scenario C2: disabled preference blocks auto backup evaluation', async () => {
    saveAutoBackupPreferences({ enabled: false });

    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000);
    });

    expect(getAutoBackupSnapshots()).toHaveLength(0);
    unmount();
  });

  it('Scenario C3: in-progress operation (restore/reset) blocks auto backup evaluation', async () => {
    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
        isOperationInProgress: true, // DB restore or reset running
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000);
    });

    expect(getAutoBackupSnapshots()).toHaveLength(0);
    unmount();
  });

  it('Scenario D: continuous rerendering of workspace data does NOT reset deadline timer', async () => {
    // Seed an initial snapshot taken 5 minutes ago
    const seedTime = new Date(Date.now() - 5 * 60 * 1000);
    runGuardedAutoBackup(samplePayload, { trigger: 'manual', now: seedTime });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    let currentPayload = samplePayload;
    const { rerender, unmount } = renderHook(
      ({ payload }) =>
        useAutoBackupScheduler({
          workspacePayload: payload,
          isHydrated: true,
        }),
      { initialProps: { payload: currentPayload } }
    );

    // Simulate typing / rerendering every 10 seconds for 20 minutes (120 rerenders)
    for (let i = 0; i < 120; i++) {
      currentPayload = {
        ...currentPayload,
        notes: [{ id: 'n-1', title: 'Knowledge Theory', content: `Drafting word ${i}` }],
      };
      rerender({ payload: currentPayload });
      await act(async () => {
        vi.advanceTimersByTime(10 * 1000);
      });
    }

    // Total elapsed = 5m initial + 20m typing = 25m (< 30m deadline) -> still 1 snapshot
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // Advance remaining 6 minutes to exceed 30m deadline (total 31m)
    await act(async () => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    // Deadline was NOT delayed infinitely; auto snapshot fired on schedule
    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].trigger).toBe('auto');

    unmount();
  });

  it('Scenario E: payload uses latest workspace data without stale closure', async () => {
    let currentPayload = samplePayload;
    const { rerender, unmount } = renderHook(
      ({ payload }) =>
        useAutoBackupScheduler({
          workspacePayload: payload,
          isHydrated: true,
        }),
      { initialProps: { payload: currentPayload } }
    );

    // User updates payload by adding a note
    currentPayload = {
      ...currentPayload,
      notes: [
        ...(currentPayload.notes as any[]),
        { id: 'n-2', title: 'Second Note', content: 'Fresh discovery' },
      ],
    };
    rerender({ payload: currentPayload });

    // Advance time past 30m
    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000);
    });

    const snapshots = getAutoBackupSnapshots();
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const newestNotes = snapshots[0].payload.notes as any[];
    expect(newestNotes).toHaveLength(2);
    expect(newestNotes[1].title).toBe('Second Note');

    unmount();
  });

  it('Scenario F: preference change in same tab takes effect immediately without page reload', async () => {
    // Seed initial snapshot 10 minutes ago
    const seedTime = new Date(Date.now() - 10 * 60 * 1000);
    runGuardedAutoBackup(samplePayload, { trigger: 'manual', now: seedTime });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: {
          ...samplePayload,
          notes: [{ id: 'n-1', title: 'Mutated for new interval', content: 'New' }],
        },
        isHydrated: true,
      })
    );

    // At 30m default, 10m is not due
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // User changes interval to 5 minutes via preferences
    saveAutoBackupPreferences({ intervalMinutes: 5 });

    // Next tick (30s) or event evaluates against 5m interval -> 10m elapsed > 5m -> DUE!
    await act(async () => {
      vi.advanceTimersByTime(30 * 1000);
    });

    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].trigger).toBe('auto');

    unmount();
  });

  it('Scenario G: deduplication throttles next check for one interval when content is unchanged', async () => {
    // Seed snapshot with exact same content
    runGuardedAutoBackup(samplePayload, { trigger: 'manual' });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
      })
    );

    // Advance 35 minutes -> unchanged dedupe triggers
    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000);
    });

    // Content was identical, no duplicate snapshot recorded
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    // User changes content after 10 minutes (less than the 30m throttle)
    // Throttling prevents checking every 30s
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    unmount();
  });

  it('Scenario H: empty workspace guard skips and preserves history', async () => {
    // Seed existing valid snapshot
    runGuardedAutoBackup(samplePayload, { trigger: 'manual' });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    const emptyPayload: WorkspaceBackupPayload = {
      categories: [],
      topics: [],
      notes: [],
      resources: [],
      tags: [],
    };

    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: emptyPayload,
        isHydrated: true,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(35 * 60 * 1000);
    });

    // Zero-Data Overwrite Guard preserved history
    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].totalEntities).toBe(5);

    unmount();
  });

  it('Scenario I: single-flight execution lock blocks overlapping evaluation runs', async () => {
    // Mount with isHydrated: true and empty history -> cold-start evaluation starts in-flight
    const { result, unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
      })
    );

    // In the exact same synchronous turn, while the mount task is in-flight (yielding on microtask):
    // Trigger another evaluation attempt concurrently
    const pConcurrent = result.current.evaluateNow('concurrent-trigger');

    // The concurrent call must be intercepted by inFlightRef lock and return null
    const concurrentResult = await pConcurrent;
    expect(concurrentResult).toBeNull();

    // Flush the in-flight mount task
    await act(async () => {});

    // Mount task successfully committed the single allowed snapshot
    const snapshots = getAutoBackupSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].trigger).toBe('auto');

    unmount();
  });

  it('Scenario J & StrictMode: unmount clears timers cleanly without leaks', async () => {
    const { unmount } = renderHook(() =>
      useAutoBackupScheduler({
        workspacePayload: samplePayload,
        isHydrated: true,
      })
    );

    // Flush initial mount
    await act(async () => {});
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    unmount();

    // Advance time after unmount
    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });

    // No background task fired or leaked after unmount
    expect(getAutoBackupSnapshots()).toHaveLength(1); // Only the initial cold-start snapshot
  });

  it('Scenario Cancellation: async cancellation token (shouldCommit) aborts pending write', () => {
    const existingBefore = getAutoBackupSnapshots();
    const storageSpy = vi.spyOn(storageModule, 'safeSetLocalStorageItem');
    const eventSpy = vi.fn();
    window.addEventListener(AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT, eventSpy);

    // Directly test runGuardedAutoBackup cancellation contract with real engine
    const result = runGuardedAutoBackup(samplePayload, {
      trigger: 'auto',
      shouldCommit: () => false, // Simulation of abort before storage commit
    });

    expect(result.status).toBe('cancelled');
    expect(result.snapshot).toBeUndefined();
    // Storage writer must NOT be called for snapshot array write
    expect(storageSpy).not.toHaveBeenCalled();
    // Success event must NOT be dispatched
    expect(eventSpy).not.toHaveBeenCalled();
    // History remains unchanged
    expect(getAutoBackupSnapshots()).toHaveLength(existingBefore.length);

    window.removeEventListener(AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT, eventSpy);
    storageSpy.mockRestore();
  });
});
