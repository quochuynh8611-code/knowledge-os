import { useState, useEffect, useCallback, useMemo } from "react";
import { SyncQueueService, type FlushResult } from "../services/syncQueue";
import type { SyncMutation } from "../lib/syncQueue";

export interface UseSyncQueueReturn {
  queue: SyncMutation[];
  pendingCount: number;
  failedCount: number;
  isFlushing: boolean;
  isOnline: boolean;
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

  // Sync state with SyncQueueService subscription
  useEffect(() => {
    const updateState = () => {
      setQueue(syncQueueService.getQueue());
      setIsFlushing(syncQueueService.getIsFlushing());
    };

    // Initial sync
    updateState();

    const unsubscribe = syncQueueService.subscribe(updateState);
    return unsubscribe;
  }, [syncQueueService]);

  // Sync state with Browser online/offline events
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const pendingCount = useMemo(
    () => queue.filter((m) => m.status === "pending").length,
    [queue]
  );

  const failedCount = useMemo(
    () => queue.filter((m) => m.status === "failed").length,
    [queue]
  );

  const flush = useCallback(async (): Promise<FlushResult> => {
    return syncQueueService.flushQueue(apiBaseUrl);
  }, [syncQueueService, apiBaseUrl]);

  const discardFailedMutation = useCallback(
    (mutationId: string): boolean => {
      const currentQueue = syncQueueService.getQueue();
      const target = currentQueue.find((m) => m.id === mutationId);
      if (!target || target.status !== "failed") {
        return false;
      }
      syncQueueService.remove(mutationId);
      return true;
    },
    [syncQueueService]
  );

  return {
    queue,
    pendingCount,
    failedCount,
    isFlushing,
    isOnline,
    flush,
    discardFailedMutation,
  };
}
