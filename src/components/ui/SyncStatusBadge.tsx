import React from "react";
import { RefreshCw, AlertCircle, CloudOff, CheckCircle2 } from "lucide-react";
import { useSyncQueue } from "../../hooks/useSyncQueue";
import { SyncQueueService } from "../../services/syncQueue";

export interface SyncStatusBadgeProps {
  syncQueueService?: SyncQueueService;
  apiBaseUrl?: string;
  className?: string;
}

export function SyncStatusBadge({
  syncQueueService,
  apiBaseUrl = "/api",
  className = "",
}: SyncStatusBadgeProps) {
  const { pendingCount, failedCount, isFlushing, isOnline, flush } =
    useSyncQueue(syncQueueService, apiBaseUrl);

  // ─── 1. State Priority Rendering ──────────────────────────────────────────

  // 1. Flushing state
  if (isFlushing) {
    return (
      <div
        data-testid="sync-status-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl transition ${className}`}
        title="Đang đồng bộ dữ liệu lên máy chủ"
      >
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
        <span className="hidden sm:inline">Đang đồng bộ...</span>
      </div>
    );
  }

  // 2. Failed state
  if (failedCount > 0) {
    return (
      <div
        data-testid="sync-status-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl transition ${className}`}
        title={`${failedCount} đột biến chưa thể đồng bộ`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        <span className="hidden sm:inline">{failedCount} lỗi</span>
        {isOnline && (
          <button
            type="button"
            onClick={() => flush()}
            className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold bg-rose-200 dark:bg-rose-900/80 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-200 rounded-md transition cursor-pointer"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  // 3. Offline state
  if (!isOnline) {
    return (
      <div
        data-testid="sync-status-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl transition ${className}`}
        title="Đang hoạt động ngoại tuyến"
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span className="hidden sm:inline">
          Ngoại tuyến {pendingCount > 0 ? `(${pendingCount})` : ""}
        </span>
      </div>
    );
  }

  // 4. Default Synced state
  return (
    <div
      data-testid="sync-status-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl transition ${className}`}
      title="Toàn bộ dữ liệu đã được đồng bộ an toàn"
    >
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="hidden sm:inline">Đã đồng bộ</span>
    </div>
  );
}
