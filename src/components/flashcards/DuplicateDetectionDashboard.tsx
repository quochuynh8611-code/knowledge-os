import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Flashcard } from "../../types/flashcard";
import {
  detectDuplicateGroups,
  saveDuplicateAuditLog,
  getDuplicateAuditLogs,
  type DuplicateCandidateGroup,
  type DuplicateAuditLogEntry,
} from "../../lib/duplicateDetectionLogic";
import { useData } from "../../context/DataContext";
import {
  Copy,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  ArrowRightLeft,
  X,
  History,
  ShieldCheck,
  Search,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export interface DuplicateDetectionDashboardProps {
  topicId?: string;
  cards?: Flashcard[];
  onSuspendCard?: (cardId: string, expectedTopicId?: string) => Promise<void> | void;
}

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
      openFlashcardReview: undefined,
      openCardBrowser: undefined,
      openStudyLauncher: undefined,
    };
  }
}

export function DuplicateDetectionDashboard({
  topicId,
  cards: propCards,
  onSuspendCard,
}: DuplicateDetectionDashboardProps) {
  const { topics, openCardBrowser, openStudyLauncher } = useSafeData();

  const [internalCards, setInternalCards] = useState<Flashcard[]>(propCards || []);
  const [loading, setLoading] = useState(!propCards);
  const [dismissedGroupIds, setDismissedGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [confirmModalData, setConfirmModalData] = useState<{
    group: DuplicateCandidateGroup;
    cardToSuspend: Flashcard;
    cardToKeep: Flashcard;
  } | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<DuplicateAuditLogEntry[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const topicTitle = useMemo(() => {
    if (!topicId) return null;
    return topics?.find((t) => t.id === topicId)?.title || null;
  }, [topicId, topics]);

  // Load cards from API if not passed via props
  useEffect(() => {
    if (propCards) {
      setInternalCards(propCards);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadCards() {
      setLoading(true);
      try {
        const url = topicId
          ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}`
          : "/api/flashcards";
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const data = await res.json();
          setInternalCards(data);
        }
      } catch (err) {
        console.error("Failed to load cards for duplicate detection:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCards();
    return () => {
      isMounted = false;
    };
  }, [topicId, propCards]);

  const [primaryOverrides, setPrimaryOverrides] = useState<Record<string, string>>({});

  // Refresh audit logs
  useEffect(() => {
    setAuditLogs(getDuplicateAuditLogs());
  }, []);

  // Compute duplicate groups
  const duplicateGroups = useMemo(() => {
    const rawGroups = detectDuplicateGroups(internalCards, topicId);
    return rawGroups
      .filter((g) => !dismissedGroupIds.has(g.id))
      .map((g) => {
        const overridePrimaryId = primaryOverrides[g.id];
        if (!overridePrimaryId || g.primaryCard.id === overridePrimaryId) {
          return g;
        }
        const targetCard = g.duplicateCards.find((c) => c.id === overridePrimaryId);
        if (!targetCard) return g;
        return {
          ...g,
          primaryCard: targetCard,
          duplicateCards: [g.primaryCard, ...g.duplicateCards.filter((c) => c.id !== overridePrimaryId)],
        };
      });
  }, [internalCards, topicId, dismissedGroupIds, primaryOverrides]);

  // Swap primary and duplicate card
  const handleSwapPrimary = useCallback(
    (group: DuplicateCandidateGroup, newPrimary: Flashcard) => {
      setPrimaryOverrides((prev) => ({
        ...prev,
        [group.id]: newPrimary.id,
      }));
      setFeedbackMessage("Đã chọn thẻ này làm thẻ gốc của nhóm.");
      setTimeout(() => setFeedbackMessage(null), 3000);
    },
    []
  );

  // Suspend action
  const handleConfirmSuspend = async () => {
    if (!confirmModalData) return;
    const { cardToSuspend, cardToKeep, group } = confirmModalData;

    // Topic-scoped integrity guard: never mutate if card does not belong to active topic context
    if (topicId && cardToSuspend.topicId !== topicId) {
      setFeedbackMessage("Lỗi phạm vi: Thẻ không thuộc chủ đề hiện tại.");
      setConfirmModalData(null);
      return;
    }

    try {
      if (onSuspendCard) {
        await onSuspendCard(cardToSuspend.id, topicId);
      } else {
        // F6.9.2: Use dedicated suspend-duplicate route with topic-context integrity guard.
        // In topic-scoped mode, expectedTopicId comes from the dashboard's topicId prop
        // (the active route context), NOT from cardToSuspend.topicId.
        // In global mode (topicId is undefined), expectedTopicId is omitted.
        const body: Record<string, string> = { lifecycleStatus: "suspended" };
        if (topicId) {
          body.expectedTopicId = topicId;
        }
        const response = await fetch(`/api/flashcards/${cardToSuspend.id}/suspend-duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`suspend-duplicate failed: HTTP ${response.status}`);
        }
      }

      // Update in-memory state
      setInternalCards((prev) =>
        prev.map((c) =>
          c.id === cardToSuspend.id
            ? { ...c, lifecycleStatus: "suspended" }
            : c
        )
      );

      // Record audit log
      const logEntry: DuplicateAuditLogEntry = {
        id: `audit-${Date.now()}`,
        topicId: cardToSuspend.topicId,
        action: "suspend_duplicate",
        primaryCardId: cardToKeep.id,
        duplicateCardId: cardToSuspend.id,
        reason: "Xác nhận trùng lặp nội dung",
        resolvedAt: new Date().toISOString(),
      };
      saveDuplicateAuditLog(logEntry);
      setAuditLogs(getDuplicateAuditLogs());
      setFeedbackMessage("Đã tạm ngưng thẻ trùng lặp thành công.");
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error("Failed to suspend duplicate card:", err);
    } finally {
      setConfirmModalData(null);
    }
  };

  // Skip group
  const handleSkipGroup = useCallback((group: DuplicateCandidateGroup) => {
    setDismissedGroupIds((prev) => new Set([...prev, group.id]));
    const logEntry: DuplicateAuditLogEntry = {
      id: `audit-${Date.now()}`,
      topicId: group.primaryCard.topicId,
      action: "skip",
      primaryCardId: group.primaryCard.id,
      duplicateCardId: group.duplicateCards[0]?.id || "",
      reason: "Người dùng bỏ qua cặp thẻ",
      resolvedAt: new Date().toISOString(),
    };
    saveDuplicateAuditLog(logEntry);
    setAuditLogs(getDuplicateAuditLogs());
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-40 bg-stone-100 dark:bg-stone-900 rounded-3xl flex items-center justify-center text-sm text-stone-400">
          Đang quét và phân tích các thẻ trùng lặp...
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="duplicate-detection-dashboard"
      className="p-4 md:p-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <span>Phát Hiện &amp; Xử Lý Thẻ Trùng Lặp</span>
            </h1>
            {topicTitle && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {topicTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Tự động đối chiếu chuẩn hóa tiếng Việt và nội dung để phát hiện các thẻ trùng lặp, bảo đảm tối ưu thời gian ôn tập.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="btn-view-audit-logs"
            onClick={() => setShowAuditModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-stone-400" />
            <span>Nhật ký thiết bị ({auditLogs.length})</span>
          </button>
          {openCardBrowser && (
            <button
              onClick={() => openCardBrowser(topicId || null)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              Danh sách thẻ
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          data-testid="duplicate-feedback-banner"
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Duplicate Candidates Status */}
      {duplicateGroups.length === 0 ? (
        <div
          data-testid="no-duplicates-state"
          className="p-10 text-center rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 space-y-3 shadow-2xs"
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Không Tìm Thấy Thẻ Trùng Lặp
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Kho thẻ của bạn hoàn toàn sạch sẽ. Mọi nội dung đã được chuẩn hóa và không có thẻ trùng nào được phát hiện.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Tìm thấy {duplicateGroups.length} nhóm thẻ trùng lặp
            </span>
          </div>

          {/* Groups List */}
          <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
            Các cặp đã bỏ qua sẽ xuất hiện lại khi tải lại trang.
          </p>
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <div
                key={group.id}
                data-testid={`duplicate-group-${group.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-4"
              >
                {/* Group Top Meta */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {group.similarityScore}% Trùng khớp
                    </span>
                    <span className="text-xs text-stone-400">
                      Loại: {group.primaryCard.type}
                    </span>
                  </div>
                  <button
                    data-testid={`btn-skip-duplicate-${group.id}`}
                    onClick={() => handleSkipGroup(group)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Các cặp đã bỏ qua sẽ xuất hiện lại khi tải lại trang."
                  >
                    <span>Bỏ qua trong phiên này</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Primary Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Thẻ Gốc (Giữ lại)</span>
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {group.primaryCard.schedule?.repetitions || 0} lần ôn
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {group.primaryCard.front}
                      </div>
                      <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 border-t border-emerald-100 dark:border-emerald-900/40 pt-1">
                        {group.primaryCard.back}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-400 pt-1 font-mono">
                      ID: {group.primaryCard.id.slice(0, 8)}... • Tạo:{" "}
                      {new Date(group.primaryCard.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  {/* Duplicate Cards */}
                  {group.duplicateCards.map((dupCard) => (
                    <div
                      key={dupCard.id}
                      className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/60 flex flex-col justify-between space-y-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Thẻ Trùng Lặp</span>
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">
                            {dupCard.schedule?.repetitions || 0} lần ôn
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {dupCard.front}
                        </div>
                        <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 border-t border-rose-100 dark:border-rose-900/40 pt-1">
                          {dupCard.back}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-rose-100 dark:border-rose-900/40 gap-2">
                        <button
                          data-testid={`btn-swap-primary-${dupCard.id}`}
                          onClick={() => handleSwapPrimary(group, dupCard)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-stone-400" />
                          <span>Chọn làm thẻ gốc</span>
                        </button>

                        <button
                          data-testid={`btn-suspend-duplicate-${dupCard.id}`}
                          onClick={() =>
                            setConfirmModalData({
                              group,
                              cardToSuspend: dupCard,
                              cardToKeep: group.primaryCard,
                            })
                          }
                          className="px-3 py-1 text-[11px] font-bold rounded-lg bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Tạm ngưng thẻ này</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalData && (
        <div
          data-testid="suspend-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 max-w-md w-full space-y-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <PauseCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Xác Nhận Tạm Ngưng Thẻ Trùng
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Thẻ trùng sẽ được chuyển sang trạng thái <strong>Tạm ngưng (Suspended)</strong>. Thẻ này sẽ không còn xuất hiện trong các phiên ôn tập, nhưng toàn bộ lịch sử ôn tập vẫn được bảo tồn.
            </p>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1">
              <div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Thẻ giữ lại:
                </span>{" "}
                {confirmModalData.cardToKeep.front}
              </div>
              <div>
                <span className="font-semibold text-rose-700 dark:text-rose-400">
                  Thẻ tạm ngưng:
                </span>{" "}
                {confirmModalData.cardToSuspend.front}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmModalData(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                data-testid="btn-confirm-suspend-action"
                onClick={handleConfirmSuspend}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-700 hover:bg-rose-800 text-white shadow-2xs cursor-pointer"
              >
                Xác nhận tạm ngưng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditModal && (
        <div
          data-testid="audit-trail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 max-w-lg w-full space-y-3.5 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700" />
                <span>Nhật ký hoạt động trên thiết bị</span>
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl px-3 py-2 border border-stone-200/60 dark:border-stone-750">
              Nhật ký được lưu cục bộ trên trình duyệt này và có thể mất khi xóa dữ liệu trình duyệt.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">
                  Chưa có thao tác xử lý trùng lặp nào được ghi nhận.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold ${
                          log.action === "suspend_duplicate"
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-stone-600 dark:text-stone-400"
                        }`}
                      >
                        {log.action === "suspend_duplicate"
                          ? "Tạm ngưng thẻ trùng"
                          : "Bỏ qua nhóm"}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.resolvedAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      Gốc: {log.primaryCardId.slice(0, 8)}... | Trùng:{" "}
                      {log.duplicateCardId.slice(0, 8)}...
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
