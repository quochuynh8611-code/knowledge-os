import { useState, useEffect, useCallback, useMemo } from "react";
import { SyncQueueService, type FlushResult } from "../services/syncQueue";
import type { SyncMutation } from "../lib/syncQueue";
import {
  type SyncTelemetryEvent,
  type SyncTelemetryStats,
  type SyncHealthReport,
  evaluateSyncHealth,
} from "../lib/syncTelemetry";

export interface UseSyncQueueReturn {
  queue: SyncMutation[];
  pendingCount: number;
  failedCount: number;
  isFlushing: boolean;
  isOnline: boolean;
  telemetryEvents: SyncTelemetryEvent[];
  telemetryStats: SyncTelemetryStats;
  syncHealth: SyncHealthReport;
  flush: () => Promise<FlushResult>;
  discardFailedMutation: (mutationId: string) => boolean;
}

const defaultSyncQueueService = new SyncQueueService();

export function useSyncQueue(
  syncQueueService: SyncQueueService = defaultSyncQueueService,
  apiBaseUrl = "/api"
): UseSyncQueueReturn {
  const [queue, setQueue] = useState<SyncMutation[]>(() =>
    syncQueueService.getQueue()
  );
  const [isFlushing, setIsFlushing] = useState<boolean>(() =>
    syncQueueService.getIsFlushing()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [telemetryEvents, setTelemetryEvents] = useState<SyncTelemetryEvent[]>(
    () => syncQueueService.getTelemetryEvents()
  );
  const [telemetryStats, setTelemetryStats] = useState<SyncTelemetryStats>(
    () => syncQueueService.getTelemetryStats()
  );

  // Sync state with SyncQueueService subscription
  useEffect(() => {
    const updateState = () => {
      setQueue(syncQueueService.getQueue());
      setIsFlushing(syncQueueService.getIsFlushing());
      setTelemetryEvents(syncQueueService.getTelemetryEvents());
      setTelemetryStats(syncQueueService.getTelemetryStats());
    };

    // Initial sync
    updateState();

    const unsubscribe = syncQueueService.subscribe(updateState);
    return unsubscribe;
  }, [syncQueueService]);

  // Sync state with Browser online/offline events & debounced auto-sync trigger
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let reconnectTimer: NodeJS.Timeout | number | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(() => {
        syncQueueService.flushQueue(apiBaseUrl, { bypassBackoff: false });
      }, 300);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueueService, apiBaseUrl]);

  // Scheduled auto-retry when earliest failed mutation cooldown expires
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const futureRetries = queue
      .filter((m) => m.status === "failed" && m.nextRetryAt)
      .map((m) => new Date(m.nextRetryAt!).getTime())
      .filter((time) => time > Date.now());

    if (futureRetries.length === 0) {
      return;
    }

    const earliestNextRetryAt = Math.min(...futureRetries);
    const delayMs = Math.max(0, earliestNextRetryAt - Date.now());

    const timer = setTimeout(() => {
      syncQueueService.flushQueue(apiBaseUrl, { bypassBackoff: false });
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [queue, syncQueueService, apiBaseUrl]);

  const pendingCount = useMemo(
    () => queue.filter((m) => m.status === "pending").length,
    [queue]
  );

  const failedCount = useMemo(
    () =>
      queue.filter((m) => m.status === "failed" || m.status === "exhausted")
        .length,
    [queue]
  );

  const syncHealth = useMemo(
    () => evaluateSyncHealth(queue, telemetryStats, telemetryEvents),
    [queue, telemetryStats, telemetryEvents]
  );

  const flush = useCallback(async (): Promise<FlushResult> => {
    return syncQueueService.flushQueue(apiBaseUrl);
  }, [syncQueueService, apiBaseUrl]);

  const discardFailedMutation = useCallback(
    (mutationId: string): boolean => {
      return syncQueueService.discard(mutationId);
    },
    [syncQueueService]
  );

  return {
    queue,
    pendingCount,
    failedCount,
    isFlushing,
    isOnline,
    telemetryEvents,
    telemetryStats,
    syncHealth,
    flush,
    discardFailedMutation,
  };
}
