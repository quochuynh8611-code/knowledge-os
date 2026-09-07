import React, { useMemo } from "react";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import { calculateVariantComparison } from "../../lib/srsAlgorithmTuning";
import {
  GitCompare,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  Clock,
  HelpCircle,
} from "lucide-react";

export interface SrsVariantComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews?: FlashcardReview[];
  cards?: Flashcard[];
}

export function SrsVariantComparisonModal({
  isOpen,
  onClose,
  reviews = [],
  cards = [],
}: SrsVariantComparisonModalProps) {
  // Map cards by ID
  const cardsMap = useMemo(() => {
    const map = new Map<string, Flashcard>();
    cards.forEach((c) => map.set(c.id, c));
    return map;
  }, [cards]);

  // Compute A/B test comparison
  const comparison = useMemo(() => {
    return calculateVariantComparison(reviews, cardsMap);
  }, [reviews, cardsMap]);

  if (!isOpen) return null;

  const { variantA, variantB, effectSize, zScore, pValue, isSignificant } =
    comparison;

  const effectPercent = Number((effectSize * 100).toFixed(1));

  return (
    <div
      data-testid="srs-variant-comparison-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ab-test-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="ab-test-modal-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                <span>A/B Testing: SM-2 Classic vs Adaptive SRS</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Thử nghiệm phân hoạch thẻ ngẫu nhiên xác định (Deterministic Card-Level Split)
              </p>
            </div>
          </div>
          <button
            data-testid="btn-close-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Significance Verdict Banner */}
          <div
            data-testid="significance-verdict"
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isSignificant
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100"
                : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60 text-stone-800 dark:text-stone-200"
            }`}
          >
            {isSignificant ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm">
                {isSignificant
                  ? "Sự khác biệt có ý nghĩa thống kê (p < 0.05)"
                  : "Chưa đủ dữ liệu để kết luận ý nghĩa thống kê"}
              </div>
              <p className="opacity-90">
                {isSignificant
                  ? `Thuật toán Adaptive SRS cho kết quả ghi nhớ cao hơn ${Math.abs(
                      effectPercent
                    )}% so với SM-2 tiêu chuẩn (Z = ${zScore}, p = ${pValue}).`
                  : `Hiện tại p-value = ${pValue} (Z = ${zScore}). Cần tích lũy thêm tối thiểu 10 lượt ôn tập cho mỗi nhóm để khẳng định tính ưu việt.`}
              </p>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Variant A: SM-2 */}
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    VARIANT A (Control)
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                    SM-2 Tiêu Chuẩn
                  </h3>
                </div>
                <div className="text-right">
                  <div
                    data-testid="metric-variant-a-retention"
                    className="text-2xl font-black text-stone-800 dark:text-stone-200"
                  >
                    {Math.round(variantA.retentionRate * 100)}%
                  </div>
                  <div className="text-[10px] text-stone-400">Tỷ lệ nhớ</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Tổng lượt ôn tập:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {variantA.totalReviews}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Số lượt nhớ thành công:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {variantA.rememberedReviews}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Số lần quên (Lapses):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {variantA.totalLapses} (
                    {Math.round(variantA.lapseRate * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Thời gian nhớ trung bình:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {(variantA.avgDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Variant B: Adaptive */}
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    VARIANT B (Adaptive)
                  </span>
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 mt-1 flex items-center gap-1">
                    <span>Adaptive SRS</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </h3>
                </div>
                <div className="text-right">
                  <div
                    data-testid="metric-variant-b-retention"
                    className="text-2xl font-black text-amber-700 dark:text-amber-400"
                  >
                    {Math.round(variantB.retentionRate * 100)}%
                  </div>
                  <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                    {effectPercent >= 0 ? `+${effectPercent}%` : `${effectPercent}%`}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Tổng lượt ôn tập:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {variantB.totalReviews}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Số lượt nhớ thành công:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {variantB.rememberedReviews}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Số lần quên (Lapses):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {variantB.totalLapses} (
                    {Math.round(variantB.lapseRate * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Thời gian nhớ trung bình:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {(variantB.avgDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Methodology Note */}
          <div className="p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-800/40 text-xs text-stone-500 dark:text-stone-400 space-y-1.5">
            <div className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Nguyên lý phân nhóm & kiểm định thống kê:</span>
            </div>
            <p>
              Mỗi thẻ flashcard được gán cố định vào nhóm A hoặc B thông qua hàm băm
              FNV-1a từ ID thẻ. Thuật toán phân tích sử dụng kiểm định Two-Proportion
              Z-test để kiểm tra xem tỷ lệ ghi nhớ của nhóm Adaptive có vượt trội hơn
              ngẫu nhiên hay không (ngưỡng α = 0.05).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 flex justify-end bg-stone-50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 transition-colors shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
