import React, { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  AlertCircle,
  CloudOff,
  CheckCircle2,
  FileText,
  BookOpen,
  FolderTree,
  Link2,
  Brain,
  X,
} from "lucide-react";
import { useSyncQueue } from "../../hooks/useSyncQueue";
import { SyncQueueService } from "../../services/syncQueue";
import type { SyncMutation } from "../../lib/syncQueue";
import type { SyncHealthLevel } from "../../lib/syncTelemetry";

export interface SyncStatusBadgeProps {
  syncQueueService?: SyncQueueService;
  apiBaseUrl?: string;
  className?: string;
}

function getHealthBadgeStyle(level?: SyncHealthLevel) {
  switch (level) {
    case "healthy":
      return {
        bg: "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60",
        text: "text-emerald-800 dark:text-emerald-300",
        indicator: "bg-emerald-500",
      };
    case "degraded":
      return {
        bg: "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60",
        text: "text-amber-800 dark:text-amber-300",
        indicator: "bg-amber-500",
      };
    case "critical":
      return {
        bg: "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60",
        text: "text-rose-800 dark:text-rose-300",
        indicator: "bg-rose-500",
      };
    case "unknown":
    default:
      return {
        bg: "bg-stone-50 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800",
        text: "text-stone-700 dark:text-stone-300",
        indicator: "bg-stone-400",
      };
  }
}

export function SyncStatusBadge({
  syncQueueService,
  apiBaseUrl = "/api",
  className = "",
}: SyncStatusBadgeProps) {
  const {
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
  } = useSyncQueue(syncQueueService, apiBaseUrl);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "telemetry">("queue");
  const [confirmingDiscardId, setConfirmingDiscardId] = useState<string | null>(
    null
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── 1. Keyboard & Click Outside Handlers ──────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setConfirmingDiscardId(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setConfirmingDiscardId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  // ─── 1b. Scoped Live Ticker (1s Interval) ──────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const hasCooldown = queue.some((m) => {
      if (m.status !== "failed" || !m.nextRetryAt) return false;
      return new Date(m.nextRetryAt).getTime() > Date.now();
    });

    if (!hasCooldown) return;

    setNowMs(Date.now());

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, queue]);

  // ─── 2. Entity Icon / Label & Backoff Helper ──────────────────────────────

  const getBackoffStatusText = (mutation: SyncMutation, currentNowMs: number): string | null => {
    if (mutation.status !== "failed") {
      return null;
    }
    if (!mutation.nextRetryAt) {
      return "Sẵn sàng thử lại";
    }
    const nextRetryMs = new Date(mutation.nextRetryAt).getTime();
    if (currentNowMs >= nextRetryMs) {
      return "Sẵn sàng thử lại";
    }
    const remainingSec = Math.max(1, Math.ceil((nextRetryMs - currentNowMs) / 1000));
    if (remainingSec >= 60) {
      return "Thử lại sau 1 phút";
    }
    return `Thử lại sau ${remainingSec}s`;
  };

  const getEntityInfo = (entityType: SyncMutation["entityType"]) => {
    switch (entityType) {
      case "note":
        return { label: "Ghi chú", icon: FileText };
      case "topic":
        return { label: "Chủ đề", icon: BookOpen };
      case "category":
        return { label: "Danh mục", icon: FolderTree };
      case "resource":
        return { label: "Tài liệu", icon: Link2 };
      case "studyProgress":
        return { label: "Tiến độ SM-2", icon: Brain };
      default:
        return { label: entityType, icon: FileText };
    }
  };

  const getTelemetryEventBadge = (type: string) => {
    switch (type) {
      case "MUTATION_ENQUEUED":
        return { label: "Thêm mới", color: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300" };
      case "REPLAY_SUCCESS":
        return { label: "Thành công", color: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300" };
      case "REPLAY_FAILED":
        return { label: "Thất bại", color: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300" };
      case "MUTATION_DISCARDED":
        return { label: "Đã bỏ qua", color: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300" };
      case "QUEUE_FLUSH_COMPLETED":
        return { label: "Đồng bộ xong", color: "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300" };
      default:
        return { label: type, color: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300" };
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // ─── 3. Dynamic Status Rendering ──────────────────────────────────────────

  const renderBadgeContent = () => {
    if (isFlushing) {
      return (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Đang đồng bộ...</span>
        </>
      );
    }

    if (failedCount > 0) {
      return (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span className="hidden sm:inline">{failedCount} lỗi</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              flush();
            }}
            className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold bg-rose-200 dark:bg-rose-900/80 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-200 rounded-md transition cursor-pointer"
          >
            Thử lại
          </button>
        </>
      );
    }

    if (!isOnline) {
      return (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Ngoại tuyến ({pendingCount})</span>
        </>
      );
    }

    if (pendingCount > 0) {
      return (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Chờ đồng bộ ({pendingCount})</span>
        </>
      );
    }

    return (
      <>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">Đã đồng bộ</span>
      </>
    );
  };

  const getBadgeStyle = () => {
    if (isFlushing) {
      return "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
    if (failedCount > 0) {
      return "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    }
    if (!isOnline) {
      return "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
    return "bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60";
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Badge Button */}
      <div
        data-testid="sync-status-badge"
        role="button"
        tabIndex={0}
        aria-label="Xem chi tiết hàng đợi đồng bộ"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-xl transition cursor-pointer select-none ${getBadgeStyle()} ${className}`}
        title="Nhấp để xem chi tiết hàng đợi đồng bộ"
      >
        {renderBadgeContent()}
      </div>

      {/* ─── 4. Read-Only Sync Queue Popover ────────────────────────────── */}
      {isOpen && (
        <div
          data-testid="sync-queue-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 p-4 text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Hàng Đợi Đồng Bộ
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isOnline ? "Trực tuyến" : "Ngoại tuyến"} • {pendingCount} đang
                chờ • {failedCount} lỗi
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div
            role="tablist"
            className="flex items-center gap-1 my-2.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-semibold"
          >
            <button
              type="button"
              role="tab"
              id="tab-queue"
              aria-selected={activeTab === "queue"}
              aria-controls="panel-queue"
              onClick={() => setActiveTab("queue")}
              className={`flex-1 py-1 px-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeTab === "queue"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Hàng đợi ({queue.length})
            </button>
            <button
              type="button"
              role="tab"
              id="tab-telemetry"
              aria-selected={activeTab === "telemetry"}
              aria-controls="panel-telemetry"
              onClick={() => setActiveTab("telemetry")}
              className={`flex-1 py-1 px-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeTab === "telemetry"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              Nhật ký & Thống kê
            </button>
          </div>

          {/* Tab 1: Queue View */}
          {activeTab === "queue" && (
            <div id="panel-queue" role="tabpanel" aria-labelledby="tab-queue">
              <div className="py-2 max-h-64 overflow-y-auto space-y-2">
                {queue.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    Hàng đợi trống. Toàn bộ dữ liệu đã được đồng bộ an toàn.
                  </div>
                ) : (
                  queue.map((mutation) => {
                    const { label: entityLabel, icon: EntityIcon } = getEntityInfo(
                      mutation.entityType
                    );
                    const isFailed = mutation.status === "failed";

                    return (
                      <div
                        key={mutation.id}
                        data-testid="sync-queue-item"
                        className={`p-2.5 rounded-xl border text-xs transition ${
                          isFailed
                            ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80"
                            : "bg-stone-50/80 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <EntityIcon className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {entityLabel}
                            </span>
                            <span className="text-stone-400 dark:text-stone-500">
                              •
                            </span>
                            <span className="text-stone-600 dark:text-stone-300 uppercase text-[10px] font-bold">
                              {mutation.action === "save" ? "Lưu" : "Xóa"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                isFailed
                                  ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                                  : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {isFailed
                                ? mutation.retryCount > 0
                                  ? `Lỗi (${mutation.retryCount} lần)`
                                  : "Lỗi"
                                : "Chờ đồng bộ"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                          <span>
                            ID: {mutation.entityId}
                            {isFailed && mutation.retryCount > 0 && (
                              <span className="ml-1 text-rose-600 dark:text-rose-400 font-sans font-normal">
                                • Đã thử {mutation.retryCount} lần
                              </span>
                            )}
                            {isFailed && (
                              <span className="ml-1 text-stone-500 dark:text-stone-400 font-sans font-normal">
                                • {getBackoffStatusText(mutation, nowMs)}
                              </span>
                            )}
                          </span>
                          <span>{formatTimestamp(mutation.clientTimestamp)}</span>
                        </div>

                        {isFailed && mutation.lastError && (
                          <div className="mt-1.5 p-1.5 bg-rose-100/70 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-300 text-[11px]">
                            <strong>Lỗi:</strong> {mutation.lastError}
                          </div>
                        )}

                        {/* Failed Mutation Operator Discard Control */}
                        {isFailed && (
                          <div className="mt-2 pt-1.5 border-t border-rose-200/50 dark:border-rose-900/50">
                            {confirmingDiscardId === mutation.id ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                                  Bỏ qua mục này?
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      discardFailedMutation(mutation.id);
                                      setConfirmingDiscardId(null);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition cursor-pointer"
                                  >
                                    Xác nhận bỏ qua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDiscardId(null)}
                                    className="px-2 py-0.5 text-[10px] font-medium bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-md transition cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmingDiscardId(mutation.id)
                                }
                                className="text-[11px] font-medium text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                Bỏ qua mục lỗi này
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Action */}
              {queue.length > 0 && isOnline && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => flush()}
                    disabled={isFlushing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isFlushing ? "animate-spin" : ""}`}
                    />
                    <span>{isFlushing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Telemetry Read Model & Debug Panel */}
          {activeTab === "telemetry" && (
            <div
              id="panel-telemetry"
              role="tabpanel"
              aria-labelledby="tab-telemetry"
              data-testid="sync-telemetry-panel"
            >
              {/* Health Status Banner */}
              {(() => {
                const healthStyle = getHealthBadgeStyle(syncHealth?.level);
                return (
                  <div
                    data-testid="sync-health-banner"
                    className={`p-2.5 rounded-xl border mt-1 mb-2 flex items-center justify-between gap-2 ${healthStyle.bg}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${healthStyle.indicator}`}
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${healthStyle.text}`}
                          >
                            {syncHealth?.label || "Chưa có dữ liệu"}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {syncHealth?.reasons && syncHealth.reasons.length > 0
                            ? syncHealth.reasons[0]
                            : syncHealth?.summary}
                        </p>
                      </div>
                    </div>
                    {syncHealth?.level !== "unknown" && (
                      <span className="text-[11px] font-mono font-semibold text-stone-500 dark:text-stone-400 shrink-0">
                        {syncHealth?.successRate}%
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 py-1">
                <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-medium">
                    Tỉ lệ thành công
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {telemetryStats.successRate}%
                  </span>
                </div>
                <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-medium">
                    Đã đồng bộ
                  </span>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    {telemetryStats.successCount}
                  </span>
                </div>
                <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-medium">
                    Lỗi
                  </span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {telemetryStats.failureCount}
                  </span>
                </div>
                <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-medium">
                    Đã bỏ qua
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {telemetryStats.discardedCount}
                  </span>
                </div>
              </div>

              {/* Recent Events List (Max 10, Newest on Top) */}
              <div className="pt-1 pb-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Sự kiện gần đây ({Math.min(10, telemetryEvents.length)}/10)
                </h4>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {telemetryEvents.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                      Chưa có sự kiện nào được ghi nhận.
                    </div>
                  ) : (
                    [...telemetryEvents]
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime()
                      )
                      .slice(0, 10)
                      .map((evt) => {
                        const badge = getTelemetryEventBadge(evt.type);
                        const entityLabel = evt.entityType
                          ? getEntityInfo(evt.entityType).label
                          : null;
                        return (
                          <div
                            key={evt.id}
                            data-testid="sync-telemetry-item"
                            className="p-2 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                                {entityLabel && (
                                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                                    {entityLabel}
                                  </span>
                                )}
                                {evt.entityId && (
                                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                                    {evt.entityId}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0 font-mono">
                                {formatTimestamp(evt.timestamp)}
                              </span>
                            </div>
                            {evt.error && (
                              <div className="mt-1 p-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded text-rose-800 dark:text-rose-300 text-[10px]">
                                {evt.error}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
