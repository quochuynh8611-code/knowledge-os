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
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useSyncQueue } from "../../hooks/useSyncQueue";
import { SyncQueueService } from "../../services/syncQueue";
import type { SyncMutation } from "../../lib/syncQueue";
import type {
  SyncHealthLevel,
  SyncTelemetryEventType,
} from "../../lib/syncTelemetry";
import { sanitizeSyncError } from "../../lib/syncErrorSanitizer";

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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
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

  const getBackoffStatusText = (
    mutation: SyncMutation,
    currentNowMs: number
  ): string | null => {
    if (mutation.status !== "failed" && mutation.status !== "exhausted") {
      return null;
    }
    if (mutation.status === "exhausted" || mutation.isPermanent) {
      return "Tạm dừng thử lại";
    }
    if (!mutation.nextRetryAt) {
      return "Sẵn sàng gửi lại";
    }
    const nextRetryMs = new Date(mutation.nextRetryAt).getTime();
    if (currentNowMs >= nextRetryMs) {
      return "Sẵn sàng gửi lại";
    }
    const remainingSec = Math.max(
      1,
      Math.ceil((nextRetryMs - currentNowMs) / 1000)
    );
    if (remainingSec >= 60) {
      return "Tự thử lại sau 1 phút";
    }
    return `Tự thử lại sau ${remainingSec}s`;
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
        return { label: "Tiến độ học tập", icon: Brain };
      default:
        return { label: entityType, icon: FileText };
    }
  };

  const getTelemetryEventBadge = (type: SyncTelemetryEventType) => {
    switch (type) {
      case "MUTATION_ENQUEUED":
        return {
          label: "Thêm mới",
          color:
            "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300",
        };
      case "REPLAY_SUCCESS":
        return {
          label: "Thành công",
          color:
            "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300",
        };
      case "REPLAY_FAILED":
        return {
          label: "Thất bại",
          color:
            "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300",
        };
      case "MUTATION_DISCARDED":
        return {
          label: "Đã bỏ qua",
          color:
            "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300",
        };
      case "QUEUE_FLUSH_COMPLETED":
        return {
          label: "Đồng bộ xong",
          color:
            "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300",
        };
      default:
        return {
          label: type,
          color:
            "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
        };
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

  // ─── 3. Navbar Badge Rendering ────────────────────────────────────────────

  const renderBadgeContent = () => {
    if (isFlushing) {
      return (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline font-medium">Đang lưu...</span>
        </>
      );
    }

    if (failedCount > 0) {
      return (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline font-medium">
            Chưa lưu ({failedCount})
          </span>
          <button
            type="button"
            aria-label="Thử lại"
            onClick={(e) => {
              e.stopPropagation();
              flush();
            }}
            className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold bg-amber-200 dark:bg-amber-900/80 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-200 rounded-md transition cursor-pointer"
          >
            Thử lại
          </button>
        </>
      );
    }

    if (!isOnline) {
      return (
        <>
          <CloudOff className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          <span className="hidden sm:inline font-medium">
            Ngoại tuyến{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </span>
        </>
      );
    }

    if (pendingCount > 0) {
      return (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline font-medium">
            Chờ lưu ({pendingCount})
          </span>
        </>
      );
    }

    return (
      <>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline font-medium text-stone-700 dark:text-stone-300">
          Đã lưu
        </span>
      </>
    );
  };

  const getBadgeStyle = () => {
    if (isFlushing) {
      return "bg-blue-50/90 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
    if (failedCount > 0) {
      return "bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800";
    }
    if (!isOnline) {
      return "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700";
    }
    if (pendingCount > 0) {
      return "bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
    return "bg-stone-50/70 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700";
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Badge Button on Navbar */}
      <div
        data-testid="sync-status-badge"
        role="button"
        tabIndex={0}
        aria-label="Xem trạng thái lưu và đồng bộ"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded-xl transition cursor-pointer select-none ${getBadgeStyle()} ${className}`}
        title="Nhấp để xem trạng thái lưu trữ & đồng bộ"
      >
        {renderBadgeContent()}
      </div>

      {/* ─── 4. User-Facing Sync Popover ─────────────────────────────────── */}
      {isOpen && (
        <div
          data-testid="sync-queue-popover"
          className="absolute right-0 mt-2 w-80 sm:w-[390px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 p-4 text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header with reassuring message */}
          <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Trạng Thái Lưu Trữ
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                {isOnline
                  ? "Thay đổi được lưu an toàn trên máy và tự động đồng bộ."
                  : "Đang ngoại tuyến. Mọi thay đổi vẫn an toàn và sẽ tự gửi lại khi có mạng."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 -mr-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick status summary row */}
          <div className="flex items-center justify-between py-2 px-2.5 my-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl text-[11px] text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              <span className="font-semibold">
                {isOnline ? "Đã kết nối" : "Ngoại tuyến"}
              </span>
            </div>
            <div className="text-stone-500 dark:text-stone-400">
              {queue.length === 0
                ? "Không có thay đổi chờ gửi"
                : `${pendingCount} đang chờ • ${failedCount} cần thử lại`}
            </div>
          </div>

          {/* User-facing Queue List */}
          <div className="py-1 max-h-64 overflow-y-auto space-y-2">
            {queue.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-stone-700 dark:text-stone-300">
                  Đã lưu toàn bộ dữ liệu an toàn.
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                  Không có thay đổi nào tồn đọng trong hàng đợi.
                </p>
              </div>
            ) : (
              queue.map((mutation) => {
                const { label: entityLabel, icon: EntityIcon } = getEntityInfo(
                  mutation.entityType
                );
                const isFailed =
                  mutation.status === "failed" ||
                  mutation.status === "exhausted";
                const sanitized = sanitizeSyncError(mutation.lastError);
                const backoffText = getBackoffStatusText(mutation, nowMs);

                return (
                  <div
                    key={mutation.id}
                    data-testid="sync-queue-item"
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      isFailed
                        ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/60"
                        : "bg-stone-50/80 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800"
                    }`}
                  >
                    {/* Item header */}
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
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                              : "bg-stone-200/80 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          {isFailed
                            ? mutation.status === "exhausted"
                              ? "Tạm dừng"
                              : "Chờ thử lại"
                            : "Đang chờ"}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp & Backoff subtext */}
                    <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>{formatTimestamp(mutation.clientTimestamp)}</span>
                      {backoffText && (
                        <span className="text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                          {backoffText}
                        </span>
                      )}
                    </div>

                    {/* Sanitized friendly error box in default view */}
                    {isFailed && (
                      <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 rounded-lg text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{sanitized.userMessage}</span>
                      </div>
                    )}

                    {/* Failed Mutation Operator Discard Control */}
                    {isFailed && (
                      <div className="mt-2 pt-1.5 border-t border-amber-200/40 dark:border-amber-900/40">
                        {confirmingDiscardId === mutation.id ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                              Bỏ qua thay đổi này?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  discardFailedMutation(mutation.id);
                                  setConfirmingDiscardId(null);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-md transition cursor-pointer"
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
                            onClick={() => setConfirmingDiscardId(mutation.id)}
                            className="text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            Bỏ qua thay đổi này
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* User Flush Action */}
          {queue.length > 0 && isOnline && (
            <div className="pt-2.5 mt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => flush()}
                disabled={isFlushing}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFlushing ? "animate-spin" : ""}`}
                />
                <span>{isFlushing ? "Đang lưu..." : "Lưu tất cả ngay"}</span>
              </button>
            </div>
          )}

          {/* ─── 5. Diagnostics Disclosure (Toggleable) ─────────────────── */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              data-testid="sync-diagnostics-toggle"
              aria-expanded={showDiagnostics}
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 py-1 cursor-pointer select-none transition"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Xem chi tiết kỹ thuật</span>
              </span>
              {showDiagnostics ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showDiagnostics && (
              <div
                data-testid="sync-telemetry-panel"
                className="mt-2.5 space-y-2.5 pt-2 border-t border-dashed border-stone-200 dark:border-stone-800 animate-in fade-in duration-150"
              >
                {/* Health Status Banner */}
                {(() => {
                  const healthStyle = getHealthBadgeStyle(syncHealth?.level);
                  return (
                    <div
                      data-testid="sync-health-banner"
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${healthStyle.bg}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${healthStyle.indicator}`}
                        />
                        <div className="truncate">
                          <span
                            className={`text-xs font-bold ${healthStyle.text}`}
                          >
                            {syncHealth?.label || "Chưa có dữ liệu"}
                          </span>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                            {syncHealth?.reasons &&
                            syncHealth.reasons.length > 0
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <div className="p-1.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                    <span className="text-[9px] text-stone-500 dark:text-stone-400 block font-medium">
                      Tỉ lệ thành công
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {telemetryStats.successRate}%
                    </span>
                  </div>
                  <div className="p-1.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                    <span className="text-[9px] text-stone-500 dark:text-stone-400 block font-medium">
                      Đã đồng bộ
                    </span>
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      {telemetryStats.successCount}
                    </span>
                  </div>
                  <div className="p-1.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                    <span className="text-[9px] text-stone-500 dark:text-stone-400 block font-medium">
                      Lỗi
                    </span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {telemetryStats.failureCount}
                    </span>
                  </div>
                  <div className="p-1.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-center">
                    <span className="text-[9px] text-stone-500 dark:text-stone-400 block font-medium">
                      Đã bỏ qua
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {telemetryStats.discardedCount}
                    </span>
                  </div>
                </div>

                {/* Raw Events List (Max 10) */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    Sự kiện gần đây ({Math.min(10, telemetryEvents.length)}/10)
                  </h4>
                  <div className="max-h-44 overflow-y-auto space-y-1.5">
                    {telemetryEvents.length === 0 ? (
                      <div className="py-4 text-center text-[11px] text-stone-400 dark:text-stone-500">
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
                              className="p-1.5 rounded-lg border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-bold ${badge.color}`}
                                  >
                                    {badge.label}
                                  </span>
                                  {entityLabel && (
                                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                                      {entityLabel}
                                    </span>
                                  )}
                                  {evt.entityId && (
                                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                                      {evt.entityId}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-stone-400 dark:text-stone-500 shrink-0 font-mono">
                                  {formatTimestamp(evt.timestamp)}
                                </span>
                              </div>
                              {evt.error && (
                                <div className="mt-1 p-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded text-rose-800 dark:text-rose-300 text-[10px] font-mono break-all">
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
        </div>
      )}
    </div>
  );
}
