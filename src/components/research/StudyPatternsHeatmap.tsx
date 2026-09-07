import React, { useState, useMemo } from "react";
import type { FlashcardReview } from "../../types/flashcard";
import {
  analyzeStudyPatterns,
  DAY_NAMES_VI,
  DAY_NAMES_FULL_VI,
  type HeatmapCell,
  type StudyPatternAnalysisResult,
} from "../../lib/studyPatternEngine";

export interface StudyPatternsHeatmapProps {
  reviews: FlashcardReview[];
  className?: string;
}

export const StudyPatternsHeatmap: React.FC<StudyPatternsHeatmapProps> = ({
  reviews,
  className = "",
}) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const analysis: StudyPatternAnalysisResult = useMemo(() => {
    return analyzeStudyPatterns(reviews);
  }, [reviews]);

  const {
    cells,
    peakHour,
    peakDay,
    bestStudyTimeMessage,
    avgReviewDurationMs,
    baselineRetentionRate,
    hasSufficientData,
    totalReviews,
  } = analysis;

  // Color mapping helper based on cell retention rate and total reviews
  const getCellColorClass = (cell: HeatmapCell): string => {
    if (cell.totalReviews === 0) {
      return "fill-slate-100 dark:fill-slate-800/50";
    }
    if (cell.retentionRate < 0.7) {
      return "fill-amber-300 dark:fill-amber-600/70";
    }
    if (cell.retentionRate < 0.85) {
      return "fill-indigo-400 dark:fill-indigo-500";
    }
    return "fill-emerald-500 dark:fill-emerald-500";
  };

  // SVG Heatmap Layout
  const cellSize = 20;
  const cellGap = 3;
  const leftPad = 40;
  const topPad = 25;
  const rightPad = 15;
  const bottomPad = 15;

  const svgWidth = leftPad + 24 * (cellSize + cellGap) + rightPad;
  const svgHeight = topPad + 7 * (cellSize + cellGap) + bottomPad;

  // Selected hour ticks: 0, 3, 6, 9, 12, 15, 18, 21
  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div
      data-testid="study-patterns-heatmap"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header with Title & Peak Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>⏰</span> Nhịp Sinh Học Học Tập (Study Patterns & Heatmap)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phân bổ 24 giờ × 7 ngày: Mật độ ôn tập và tỷ lệ giữ vững kiến thức
          </p>
        </div>

        {/* Insight Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {peakHour && (
            <div
              data-testid="peak-study-time-badge"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{bestStudyTimeMessage}</span>
            </div>
          )}

          {peakDay && hasSufficientData && (
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Ngày hiệu quả: <span className="font-bold">{peakDay.fullDayName}</span> ({Math.round(peakDay.retentionRate * 100)}%)
            </div>
          )}
        </div>
      </div>

      {/* Insufficient Data Warning Notice */}
      {!hasSufficientData && (
        <div
          data-testid="insufficient-data-notice"
          className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2"
        >
          <span>💡</span>
          <span>
            Hệ thống đã ghi nhận <strong>{totalReviews}</strong> lượt ôn tập. Hãy thực hiện ít nhất <strong>10</strong> lượt ôn tập qua các khung giờ để mở khóa phân tích nhịp sinh học cá nhân hóa.
          </span>
        </div>
      )}

      {/* 24x7 SVG Heatmap */}
      <div className="relative overflow-x-auto w-full pt-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[580px] select-none"
          role="img"
          aria-label="Ma trận nhịp sinh học học tập 24 giờ 7 ngày"
        >
          {/* Hour Labels at Top */}
          {hourTicks.map((h) => {
            const x = leftPad + h * (cellSize + cellGap) + cellSize / 2;
            return (
              <text
                key={`h-label-${h}`}
                x={x}
                y={topPad - 8}
                textAnchor="middle"
                fontSize="10"
                className="fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {String(h).padStart(2, "0")}h
              </text>
            );
          })}

          {/* Day of Week Labels at Left */}
          {DAY_NAMES_VI.map((name, d) => {
            const y = topPad + d * (cellSize + cellGap) + cellSize / 2 + 3;
            return (
              <text
                key={`d-label-${d}`}
                x={leftPad - 8}
                y={y}
                textAnchor="end"
                fontSize="10"
                className="fill-slate-500 dark:fill-slate-400 font-medium"
              >
                {name}
              </text>
            );
          })}

          {/* Heatmap Grid Cells */}
          {cells.map((cell) => {
            const x = leftPad + cell.hour * (cellSize + cellGap);
            const y = topPad + cell.dayOfWeek * (cellSize + cellGap);
            const isHovered =
              hoveredCell?.hour === cell.hour &&
              hoveredCell?.dayOfWeek === cell.dayOfWeek;

            return (
              <rect
                key={`cell-${cell.dayOfWeek}-${cell.hour}`}
                data-testid={`heatmap-cell-${cell.dayOfWeek}-${cell.hour}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={3}
                ry={3}
                className={`${getCellColorClass(cell)} transition-all duration-150 cursor-pointer ${
                  isHovered ? "stroke-indigo-600 dark:stroke-white stroke-2" : ""
                }`}
                onMouseEnter={() => setHoveredCell(cell)}
                onMouseLeave={() => setHoveredCell(null)}
              />
            );
          })}
        </svg>

        {/* Interactive Hover Tooltip */}
        {hoveredCell && (
          <div
            data-testid="heatmap-tooltip"
            className="absolute z-20 bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none transition-opacity duration-150"
            style={{
              left: `${((leftPad + hoveredCell.hour * (cellSize + cellGap)) / svgWidth) * 100}%`,
              top: `${((topPad + hoveredCell.dayOfWeek * (cellSize + cellGap)) / svgHeight) * 100}%`,
              transform: "translate(-50%, -125%)",
            }}
          >
            <div className="font-semibold text-indigo-300">
              {DAY_NAMES_FULL_VI[hoveredCell.dayOfWeek]} lúc {String(hoveredCell.hour).padStart(2, "0")}:00
            </div>
            {hoveredCell.totalReviews > 0 ? (
              <div className="mt-1 space-y-0.5">
                <div>
                  Lượt ôn: <span className="font-bold text-white">{hoveredCell.totalReviews}</span> thẻ
                </div>
                <div>
                  Tỷ lệ nhớ:{" "}
                  <span
                    className={`font-bold ${
                      hoveredCell.retentionRate >= 0.8
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {Math.round(hoveredCell.retentionRate * 100)}%
                  </span>
                </div>
                {hoveredCell.avgDurationMs > 0 && (
                  <div className="text-[10px] text-slate-300">
                    Thời gian TB: {(hoveredCell.avgDurationMs / 1000).toFixed(1)}s / thẻ
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 mt-0.5">Chưa có lượt ôn nào</div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Tỷ lệ trung bình toàn cục:{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {Math.round(baselineRetentionRate * 100)}%
            </strong>
          </span>
          {avgReviewDurationMs > 0 && (
            <span>
              Tốc độ TB:{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {(avgReviewDurationMs / 1000).toFixed(1)}s / thẻ
              </strong>
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700" />
            <span>Chưa ôn</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-300 dark:bg-amber-600" />
            <span>&lt; 70%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-indigo-400 dark:bg-indigo-500" />
            <span>70% - 85%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>&gt; 85%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
