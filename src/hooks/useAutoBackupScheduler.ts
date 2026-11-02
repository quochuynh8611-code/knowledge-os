/**
 * Guarded Auto-Backup Runtime Scheduler Hook (Phase 6 Runtime Wiring)
 *
 * Architecture Invariants:
 * 1. Single App-Level Scheduler: Mounted once at AppContent lifecycle, independent of modals.
 * 2. Deterministic Tick Evaluation: 30-second lightweight periodic ticks without timer drift.
 * 3. Reactive Readiness Guard: Evaluates only after DataContext hydration completes.
 * 4. Operation Safety Guard: Suspended during restore, import, or reset database operations.
 * 5. Async Cancellation & Generation Tokens: Aborts pending writes on unmount, disable, or restore.
 * 6. Non-Resetting Deadline: Rerendering workspace entities does NOT reset scheduling intervals.
 * 7. Single-Flight Concurrency: In-flight execution lock blocks concurrent overlapping runs.
 * 8. Error Backoff & Skip Throttle: 5-minute backoff on storage-failed, 1-interval throttle on unchanged skips.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  WorkspaceBackupPayload,
  AutoBackupPreferences,
  GuardedBackupResult,
  runGuardedAutoBackup,
  isAutoBackupDue,
  getAutoBackupPreferences,
  getAutoBackupSnapshots,
  setLastAutoBackupResult,
  AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT,
  AUTO_BACKUP_PREFERENCES_CHANGED_EVENT,
} from '../lib/autoBackupScheduler';

export interface UseAutoBackupSchedulerOptions {
  workspacePayload: WorkspaceBackupPayload;
  isHydrated?: boolean;
  isOperationInProgress?: boolean;
}

export interface CachedSnapshotMeta {
  id: string;
  createdAt: string;
  fingerprint: string;
}

const STORAGE_FAILURE_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
const PERIODIC_TICK_INTERVAL_MS = 30 * 1000; // 30 seconds

export function useAutoBackupScheduler({
  workspacePayload,
  isHydrated = true,
  isOperationInProgress = false,
}: UseAutoBackupSchedulerOptions) {
  // References ensuring zero stale closure and clean cancellation
  const latestDataRef = useRef(workspacePayload);
  const isHydratedRef = useRef(isHydrated);
  const isOperationInProgressRef = useRef(isOperationInProgress);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const currentRunIdRef = useRef(0);

  // In-memory lightweight cache of last snapshot metadata to avoid parsing full snapshot JSON on every tick
  const lastSnapshotMetaRef = useRef<CachedSnapshotMeta | null | undefined>(undefined);

  // In-memory throttling trackers (reset on full reload as designed in spec)
  const lastAttemptTimeRef = useRef<number>(0);
  const lastFailureTimeRef = useRef<number>(0);

  // Keep latest workspace data updated on every render without triggering effect re-runs
  useEffect(() => {
    latestDataRef.current = workspacePayload;
  });

  useEffect(() => {
    isHydratedRef.current = isHydrated;
  }, [isHydrated]);

  useEffect(() => {
    isOperationInProgressRef.current = isOperationInProgress;
    if (isOperationInProgress) {
      // Invalidate any in-flight task immediately when restore or reset starts
      currentRunIdRef.current++;
    }
  }, [isOperationInProgress]);

  /**
   * Helper to retrieve or refresh cached metadata of the latest snapshot in ring buffer.
   */
  const getLatestSnapshotMeta = useCallback((): CachedSnapshotMeta | null => {
    if (lastSnapshotMetaRef.current !== undefined) {
      return lastSnapshotMetaRef.current;
    }
    const snapshots = getAutoBackupSnapshots();
    if (snapshots.length > 0 && snapshots[0]) {
      lastSnapshotMetaRef.current = {
        id: snapshots[0].id,
        createdAt: snapshots[0].createdAt,
        fingerprint: snapshots[0].fingerprint,
      };
    } else {
      lastSnapshotMetaRef.current = null;
    }
    return lastSnapshotMetaRef.current;
  }, []);

  /**
   * Core evaluation routine executed on ticks, focus, and preference changes.
   */
  const evaluateAutoBackup = useCallback(
    async (_triggerSource?: string): Promise<GuardedBackupResult | null> => {
      // 1. Lifecycle and Readiness Guards
      if (!isMountedRef.current) return null;
      if (!isHydratedRef.current) return null;
      if (isOperationInProgressRef.current) return null;

      // 2. Preferences Check
      const prefs: AutoBackupPreferences = getAutoBackupPreferences();
      if (!prefs.enabled) return null;

      // 3. Single-Flight Concurrency Guard
      if (inFlightRef.current) return null;

      const now = new Date();
      const nowMs = now.getTime();

      // 4. Storage Failure Backoff Guard (5 minutes)
      if (lastFailureTimeRef.current > 0 && nowMs - lastFailureTimeRef.current < STORAGE_FAILURE_BACKOFF_MS) {
        return null;
      }

      // 5. Scheduling Due Evaluation
      const latestMeta = getLatestSnapshotMeta();
      if (latestMeta === null) {
        // Cold-Start: No snapshots exist in history. Evaluate immediately once upon readiness.
        // Zero-Data Overwrite Guard in engine will skip if entities are 0.
      } else {
        // Warm-Start: Check skip throttle
        const intervalMs = prefs.intervalMinutes * 60 * 1000;
        if (lastAttemptTimeRef.current > 0 && nowMs - lastAttemptTimeRef.current < intervalMs) {
          return null;
        }

        // Check if elapsed time has reached preference interval
        const isDue = isAutoBackupDue(latestMeta.createdAt, prefs, now);
        if (!isDue) {
          return null;
        }
      }

      // 6. Acquire Execution Lock & Commit Token
      inFlightRef.current = true;
      const runId = ++currentRunIdRef.current;

      try {
        // Yield to microtask queue to allow single-flight lock to intercept concurrent calls
        await Promise.resolve();

        const payloadToBackup = latestDataRef.current;

        const result = runGuardedAutoBackup(payloadToBackup, {
          trigger: 'auto',
          now,
          shouldCommit: () => {
            return (
              isMountedRef.current &&
              !isOperationInProgressRef.current &&
              runId === currentRunIdRef.current &&
              prefs.enabled
            );
          },
        });

        // 7. Process Outcome & Update Internal State
        if (result.status === 'created' && result.snapshot) {
          lastSnapshotMetaRef.current = {
            id: result.snapshot.id,
            createdAt: result.snapshot.createdAt,
            fingerprint: result.snapshot.fingerprint,
          };
          lastAttemptTimeRef.current = 0;
          lastFailureTimeRef.current = 0;
          setLastAutoBackupResult(result);
        } else if (
          result.status === 'skipped-unchanged' ||
          result.status === 'skipped-empty' ||
          result.status === 'rejected-invalid'
        ) {
          // Throttle next evaluation for one interval
          lastAttemptTimeRef.current = nowMs;
          if (result.status === 'rejected-invalid') {
            setLastAutoBackupResult(result);
          }
        } else if (result.status === 'storage-failed') {
          // Enter 5-minute backoff
          lastFailureTimeRef.current = nowMs;
          setLastAutoBackupResult(result);
        }

        return result;
      } finally {
        inFlightRef.current = false;
      }
    },
    [getLatestSnapshotMeta]
  );

  useEffect(() => {
    isHydratedRef.current = isHydrated;
    if (isHydrated && isMountedRef.current) {
      // Evaluate immediately once readiness is reached (Cold-start / post-hydration policy)
      evaluateAutoBackup('hydration-ready');
    }
  }, [isHydrated, evaluateAutoBackup]);

  useEffect(() => {
    isMountedRef.current = true;

    // Trigger cold-start evaluation once mounted and ready
    evaluateAutoBackup('mount');

    // Periodic tick evaluation every 30 seconds
    const intervalId = setInterval(() => {
      evaluateAutoBackup('interval-tick');
    }, PERIODIC_TICK_INTERVAL_MS);

    // Event listeners
    const handleSnapshotUpdated = () => {
      // Invalidate metadata cache so next evaluation reads fresh state
      lastSnapshotMetaRef.current = undefined;
    };

    const handlePreferencesChanged = () => {
      evaluateAutoBackup('preferences-changed');
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        evaluateAutoBackup('visibility-change');
      }
    };

    const handleFocus = () => {
      evaluateAutoBackup('window-focus');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT, handleSnapshotUpdated);
      window.addEventListener(AUTO_BACKUP_PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
      window.addEventListener('storage', handleSnapshotUpdated);
      window.addEventListener('focus', handleFocus);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      currentRunIdRef.current++;
      clearInterval(intervalId);

      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTO_BACKUP_SNAPSHOT_UPDATED_EVENT, handleSnapshotUpdated);
        window.removeEventListener(AUTO_BACKUP_PREFERENCES_CHANGED_EVENT, handlePreferencesChanged);
        window.removeEventListener('storage', handleSnapshotUpdated);
        window.removeEventListener('focus', handleFocus);
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [evaluateAutoBackup]);

  return {
    evaluateNow: evaluateAutoBackup,
  };
}
