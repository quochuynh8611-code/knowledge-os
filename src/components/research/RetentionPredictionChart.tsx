import React, { useState, useMemo } from "react";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  generateForgettingCurveForecast,
  predictCardRetention,
  type ForgettingCurvePoint,
  type RetentionPredictionResult,
} from "../../lib/retentionPredictionEngine";

export interface RetentionPredictionChartProps {
  card?: Flashcard;
  reviews?: FlashcardReview[];
  points?: ForgettingCurvePoint[];
  prediction?: RetentionPredictionResult;
  maxDays?: number;
  targetRetention?: number;
  showLegend?: boolean;
  showHorizonPills?: boolean;
  className?: string;
}

export const RetentionPredictionChart: React.FC<RetentionPredictionChartProps> = ({
  card,
  reviews = [],
  points: providedPoints,
  prediction: providedPrediction,
  maxDays = 30,
  targetRetention = 0.8,
  showLegend = true,
  showHorizonPills = true,
  className = "",
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ForgettingCurvePoint | null>(null);

  // Derive points and prediction if not provided directly
  const { curvePoints, predictionResult } = useMemo(() => {
    let pts: ForgettingCurvePoint[] = [];
    let pred: RetentionPredictionResult | null = providedPrediction || null;

    if (providedPoints && providedPoints.length > 0) {
      pts = providedPoints;
    } else if (card) {
      pts = generateForgettingCurveForecast(card, reviews, maxDays, { targetRetention });
    }

    if (!pred && card) {
      pred = predictCardRetention(card, reviews, 0, { targetRetention });
    }

    return { curvePoints: pts, predictionResult: pred };
  }, [card, reviews, providedPoints, providedPrediction, maxDays, targetRetention]);

  // Chart dimensions & padding
  const svgWidth = 650;
  const svgHeight = 260;
  const pad = { top: 25, right: 35, bottom: 40, left: 50 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;

  // Coordinate scales
  const effectiveMaxDays = Math.max(1, maxDays);

  const getX = (day: number) => pad.left + (day / effectiveMaxDays) * chartW;
  const getY = (rate: number) => pad.top + ((1 - Math.max(0, Math.min(1, rate))) * chartH);

  // SVG Paths
  const mainLinePath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    return curvePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.day).toFixed(1)} ${getY(p.retentionRate).toFixed(1)}`)
      .join(" ");
  }, [curvePoints, chartW, chartH]);

  // 95% Confidence Band Polygon Area
  const ci95AreaPath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    const topPath = curvePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.day).toFixed(1)} ${getY(p.ci95Upper).toFixed(1)}`)
      .join(" ");
    const bottomPath = [...curvePoints]
      .reverse()
      .map((p) => `L ${getX(p.day).toFixed(1)} ${getY(p.ci95Lower).toFixed(1)}`)
      .join(" ");
    return `${topPath} ${bottomPath} Z`;
  }, [curvePoints, chartW, chartH]);

  // 80% Confidence Band Polygon Area
  const ci80AreaPath = useMemo(() => {
    if (curvePoints.length === 0) return "";
    const topPath = curvePoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.day).toFixed(1)} ${getY(p.ci80Upper).toFixed(1)}`)
      .join(" ");
    const bottomPath = [...curvePoints]
      .reverse()
      .map((p) => `L ${getX(p.day).toFixed(1)} ${getY(p.ci80Lower).toFixed(1)}`)
      .join(" ");
    return `${topPath} ${bottomPath} Z`;
  }, [curvePoints, chartW, chartH]);

  // Target retention Y position
  const targetY = getY(targetRetention);

  // Optimal point coordinates
  const optimalReviewDays = predictionResult?.optimalReviewDays ?? null;
  const optimalCoords = useMemo(() => {
    if (optimalReviewDays === null || optimalReviewDays > effectiveMaxDays) return null;
    return {
      x: getX(optimalReviewDays),
      y: getY(targetRetention),
    };
  }, [optimalReviewDays, effectiveMaxDays, chartW, chartH, targetRetention]);

  // X ticks: 0, 5, 10, 15, 20, 25, 30
  const xTicks = [0, 5, 10, 15, 20, 25, 30].filter((d) => d <= effectiveMaxDays);
  // Y ticks: 0%, 20%, 40%, 60%, 80%, 100%
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  if (curvePoints.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 ${className}`}>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Chưa có dữ liệu dự báo suy giảm trí nhớ cho thẻ này.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="retention-prediction-chart"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header with Title and Optimal Date Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📉</span> Dự Báo Đường Cong Quên Lãng (Forgetting Curve)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mô hình phân rã lũy thừa R(t) = e^(-t/S) kết hợp khoảng tin cậy thống kê 80% & 95%
          </p>
        </div>

        {predictionResult && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300">
            <span className="font-medium">Thời điểm ôn tối ưu:</span>
            <span className="font-bold">
              {predictionResult.optimalReviewDays === 0
                ? "Hôm nay (Cần ôn ngay)"
                : `Sau ${predictionResult.optimalReviewDays} ngày`}
            </span>
            <span className="text-slate-400 dark:text-slate-500">|</span>
            <span>Độ ổn định: S = {predictionResult.stability}d</span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Biểu đồ dự báo suy giảm trí nhớ"
        >
          <defs>
            <linearGradient id="gradientCi95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="gradientCi80" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.10" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines & Y Labels */}
          {yTicks.map((val) => {
            const yPos = getY(val);
            return (
              <g key={`y-grid-${val}`}>
                <line
                  x1={pad.left}
                  y1={yPos}
                  x2={svgWidth - pad.right}
                  y2={yPos}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80"
                  strokeWidth="1"
                />
                <text
                  x={pad.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  {Math.round(val * 100)}%
                </text>
              </g>
            );
          })}

          {/* X Grid Lines & Labels */}
          {xTicks.map((d) => {
            const xPos = getX(d);
            return (
              <g key={`x-grid-${d}`}>
                <line
                  x1={xPos}
                  y1={pad.top}
                  x2={xPos}
                  y2={svgHeight - pad.bottom}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/60"
                  strokeWidth="1"
                />
                <text
                  x={xPos}
                  y={svgHeight - pad.bottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-slate-400 dark:fill-slate-500"
                >
                  {d}d
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            fontSize="10"
            className="fill-slate-400 dark:fill-slate-500 font-medium"
          >
            Số ngày trôi qua (Days Elapsed)
          </text>

          {/* 95% Confidence Interval Area */}
          {ci95AreaPath && (
            <path
              data-testid="ci95-band"
              d={ci95AreaPath}
              fill="url(#gradientCi95)"
              className="transition-all duration-300"
            />
          )}

          {/* 80% Confidence Interval Area */}
          {ci80AreaPath && (
            <path
              data-testid="ci80-band"
              d={ci80AreaPath}
              fill="url(#gradientCi80)"
              className="transition-all duration-300"
            />
          )}

          {/* Target Retention Threshold Line (e.g. 80%) */}
          <line
            data-testid="target-threshold-line"
            x1={pad.left}
            y1={targetY}
            x2={svgWidth - pad.right}
            y2={targetY}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-80"
          />
          <text
            x={svgWidth - pad.right}
            y={targetY - 5}
            textAnchor="end"
            fontSize="10"
            fill="#d97706"
            className="font-medium"
          >
            Ngưỡng mục tiêu: {Math.round(targetRetention * 100)}%
          </text>

          {/* Main Predicted Retention Curve Path */}
          <path
            data-testid="main-curve-path"
            d={mainLinePath}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Optimal Review Point Indicator */}
          {optimalCoords && (
            <g data-testid="optimal-point-marker">
              <circle
                cx={optimalCoords.x}
                cy={optimalCoords.y}
                r="6"
                fill="#ef4444"
                className="animate-pulse opacity-90"
              />
              <circle
                cx={optimalCoords.x}
                cy={optimalCoords.y}
                r="3"
                fill="#ffffff"
              />
              <line
                x1={optimalCoords.x}
                y1={optimalCoords.y}
                x2={optimalCoords.x}
                y2={svgHeight - pad.bottom}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Interactive Hover Area Dots */}
          {curvePoints.map((pt) => {
            const cx = getX(pt.day);
            const cy = getY(pt.retentionRate);
            const isHovered = hoveredPoint?.day === pt.day;

            return (
              <g key={`point-${pt.day}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 2}
                  fill={isHovered ? "#4338ca" : "#6366f1"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 0}
                  className="transition-all duration-150"
                />
                <rect
                  x={cx - (chartW / effectiveMaxDays) / 2}
                  y={pad.top}
                  width={chartW / effectiveMaxDays}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            data-testid="chart-tooltip"
            className="absolute z-10 bg-slate-900/90 dark:bg-slate-950/95 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 pointer-events-none transition-all duration-150"
            style={{
              left: `${(getX(hoveredPoint.day) / svgWidth) * 100}%`,
              top: `${(getY(hoveredPoint.retentionRate) / svgHeight) * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="font-semibold text-indigo-300">
              Ngày thứ {hoveredPoint.day}
            </div>
            <div className="mt-0.5">
              Dự báo nhớ: <span className="font-bold text-white">{(hoveredPoint.retentionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              CI 80%: [{(hoveredPoint.ci80Lower * 100).toFixed(1)}% - {(hoveredPoint.ci80Upper * 100).toFixed(1)}%]
            </div>
            <div className="text-[10px] text-slate-400">
              CI 95%: [{(hoveredPoint.ci95Lower * 100).toFixed(1)}% - {(hoveredPoint.ci95Upper * 100).toFixed(1)}%]
            </div>
          </div>
        )}
      </div>

      {/* Quick Horizon Pills (1d, 3d, 7d, 14d, 30d) */}
      {showHorizonPills && predictionResult && (
        <div data-testid="horizon-pills-container" className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Xác suất ghi nhớ theo các mốc thời gian:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {predictionResult.horizons.map((h) => {
              const pct = Math.round(h.retentionProbability * 100);
              const isUrgent = pct < targetRetention * 100;
              return (
                <div
                  key={`horizon-${h.horizonDays}`}
                  className={`px-2.5 py-2 rounded-lg border text-center ${
                    isUrgent
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60"
                  }`}
                >
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Sau {h.horizonDays} ngày
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      isUrgent
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {pct}%
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500">
                    CI80: {Math.round(h.confidenceInterval80[0] * 100)}%-{Math.round(h.confidenceInterval80[1] * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            <span>Đường dự báo suy giảm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-indigo-500/30 rounded" />
            <span>Khoảng tin cậy 80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-indigo-400/15 rounded" />
            <span>Khoảng tin cậy 95%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-amber-500" />
            <span>Mục tiêu ({Math.round(targetRetention * 100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            <span>Điểm nên ôn lại</span>
          </div>
        </div>
      )}
    </div>
  );
};
