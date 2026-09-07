import React, { useState, useMemo } from "react";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  calculateStabilityFromReviews,
  calculateEbbinghausCurve,
  aggregateEmpiricalRetention,
  inferCardDifficulty,
  type CardDifficultyLevel,
} from "../../lib/srsAlgorithmTuning";
import { Brain, HelpCircle, Activity, Filter, Clock } from "lucide-react";

export interface RetentionCurveChartProps {
  reviews?: FlashcardReview[];
  cards?: Flashcard[];
  initialMaxDays?: number;
  onClose?: () => void;
}

export function RetentionCurveChart({
  reviews = [],
  cards = [],
  initialMaxDays = 30,
  onClose,
}: RetentionCurveChartProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "all" | CardDifficultyLevel
  >("all");
  const [maxDays, setMaxDays] = useState<number>(initialMaxDays);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    day: number;
    retentionRate: number;
    count?: number;
    type: "theoretical" | "empirical";
  } | null>(null);

  // Map cards by ID for fast lookup
  const cardMap = useMemo(() => {
    const map = new Map<string, Flashcard>();
    cards.forEach((c) => map.set(c.id, c));
    return map;
  }, [cards]);

  // Filter reviews by difficulty if selected
  const filteredReviews = useMemo(() => {
    if (selectedDifficulty === "all") return reviews;
    return reviews.filter((r) => {
      const cardId = r.flashcardId || r.cardId;
      if (!cardId) return true;
      const card = cardMap.get(cardId);
      if (!card) return true;
      const diff = inferCardDifficulty(card);
      return diff.difficulty === selectedDifficulty;
    });
  }, [reviews, selectedDifficulty, cardMap]);

  // Calculate stability S from filtered reviews
  const stability = useMemo(() => {
    return calculateStabilityFromReviews(filteredReviews);
  }, [filteredReviews]);

  // Theoretical Ebbinghaus curve
  const theoreticalCurve = useMemo(() => {
    return calculateEbbinghausCurve(stability, maxDays);
  }, [stability, maxDays]);

  // Empirical data points
  const empiricalPoints = useMemo(() => {
    const raw = aggregateEmpiricalRetention(filteredReviews);
    return raw.filter((p) => p.day <= maxDays);
  }, [filteredReviews, maxDays]);

  // Chart SVG coordinate system
  const width = 640;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Coordinate mappers
  const getX = (day: number) => padding.left + (day / maxDays) * chartWidth;
  const getY = (rate: number) =>
    padding.top + (1.0 - Math.max(0, Math.min(1, rate))) * chartHeight;

  // Build SVG path for theoretical curve
  const theoreticalPath = useMemo(() => {
    if (theoreticalCurve.length === 0) return "";
    return theoreticalCurve.reduce((acc, pt, index) => {
      const px = getX(pt.day);
      const py = getY(pt.retentionRate);
      return index === 0 ? `M ${px},${py}` : `${acc} L ${px},${py}`;
    }, "");
  }, [theoreticalCurve, maxDays]);

  // Build filled area below theoretical curve
  const areaPath = useMemo(() => {
    if (theoreticalCurve.length === 0) return "";
    const startX = getX(0);
    const endX = getX(maxDays);
    const bottomY = getY(0);
    return `${theoreticalPath} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
  }, [theoreticalPath, maxDays]);

  // Y-axis grid ticks (0%, 20%, 40%, 60%, 80%, 100%)
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // X-axis day ticks based on maxDays
  const xTicks = useMemo(() => {
    const step = maxDays <= 14 ? 2 : maxDays <= 30 ? 5 : 10;
    const ticks: number[] = [];
    for (let d = 0; d <= maxDays; d += step) {
      ticks.push(d);
    }
    return ticks;
  }, [maxDays]);

  const hasEmpiricalData = empiricalPoints.length > 0;

  return (
    <div
      data-testid="retention-curve-chart"
      className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Đường Cong Quên Lãng (Retention Curve)</span>
                <span
                  data-testid="stability-badge"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                >
                  S = {stability.toFixed(1)} ngày
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Mô hình Ebbinghaus R(t) = e^(-t/S) kết hợp dữ liệu ôn tập thực tế
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Difficulty Filter */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {(["all", "easy", "medium", "hard"] as const).map((level) => (
              <button
                key={level}
                data-testid={`filter-difficulty-${level}`}
                onClick={() => setSelectedDifficulty(level)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedDifficulty === level
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                {level === "all"
                  ? "Tất cả"
                  : level === "easy"
                  ? "Dễ"
                  : level === "medium"
                  ? "Vừa"
                  : "Khó"}
              </button>
            ))}
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {([14, 30, 60] as const).map((days) => (
              <button
                key={days}
                data-testid={`filter-horizon-${days}`}
                onClick={() => setMaxDays(days)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                  maxDays === days
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[300px] select-none"
          role="img"
          aria-label="Biểu đồ đường cong quên lãng Ebbinghaus"
        >
          <defs>
            <linearGradient id="ebbinghausArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines & Y-labels */}
          {yTicks.map((rate) => {
            const y = getY(rate);
            return (
              <g key={`y-${rate}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-stone-200 dark:text-stone-800"
                  strokeDasharray={rate === 0.8 ? "4 4" : undefined}
                  strokeWidth={rate === 0.8 ? 1.5 : 1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className={`text-[10px] ${
                    rate === 0.8
                      ? "fill-amber-500 font-bold"
                      : "fill-stone-400 dark:fill-stone-500"
                  }`}
                >
                  {Math.round(rate * 100)}%
                </text>
              </g>
            );
          })}

          {/* 80% Threshold Annotation */}
          <text
            x={width - padding.right}
            y={getY(0.8) - 6}
            textAnchor="end"
            className="text-[10px] fill-amber-500 font-semibold"
          >
            Ngưỡng ôn tập tối ưu (80%)
          </text>

          {/* X-axis Ticks & Labels */}
          {xTicks.map((day) => {
            const x = getX(day);
            return (
              <g key={`x-${day}`}>
                <line
                  x1={x}
                  y1={height - padding.bottom}
                  x2={x}
                  y2={height - padding.bottom + 5}
                  stroke="currentColor"
                  className="text-stone-300 dark:text-stone-700"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-stone-400 dark:fill-stone-500"
                >
                  {day === 0 ? "0" : `${day}d`}
                </text>
              </g>
            );
          })}

          {/* Theoretical Curve Fill Area */}
          <path d={areaPath} fill="url(#ebbinghausArea)" />

          {/* Theoretical Curve Stroke Path */}
          <path
            data-testid="ebbinghaus-path"
            d={theoreticalPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Empirical Scatter Dots */}
          {empiricalPoints.map((pt) => {
            const cx = getX(pt.day);
            const cy = getY(pt.retentionRate);
            return (
              <g key={`emp-${pt.day}`}>
                <circle
                  data-testid={`empirical-point-${pt.day}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  className="fill-blue-500 stroke-white dark:stroke-stone-900 cursor-pointer transition-transform hover:scale-125"
                  strokeWidth={2}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      x: cx,
                      y: cy,
                      day: pt.day,
                      retentionRate: pt.retentionRate,
                      count: pt.count,
                      type: "empirical",
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-full mb-2 z-20 pointer-events-none px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs shadow-lg space-y-0.5 whitespace-nowrap"
          >
            <div className="font-bold flex items-center gap-1">
              <span>Ngày {hoveredPoint.day}</span>
              <span className="text-emerald-400">
                {Math.round(hoveredPoint.retentionRate * 100)}%
              </span>
            </div>
            {hoveredPoint.count !== undefined && (
              <div className="text-[10px] text-stone-300">
                {hoveredPoint.count} lượt ôn tập thực tế
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded bg-emerald-500 inline-block" />
            <span>Lý thuyết Ebbinghaus</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Dữ liệu thực nghiệm ({empiricalPoints.length} điểm)</span>
          </div>
        </div>

        {!hasEmpiricalData && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Chưa có đủ lượt ôn thực tế — hiển thị mô hình lý thuyết</span>
          </div>
        )}
      </div>
    </div>
  );
}
