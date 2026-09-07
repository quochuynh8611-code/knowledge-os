/**
 * Study Pattern Detection Engine (Phase F7.1)
 *
 * Analyzes flashcard review logs to uncover cognitive circadian patterns:
 * 1. 24-hour x 7-day retention and volume matrix aggregation
 * 2. Peak performance hour detection with statistical delta vs baseline
 * 3. Daily retention variations across weekdays (Mon - Sun)
 * 4. Average review duration & session insights
 *
 * Conforms strictly to Zero Database Schema Migrations.
 */

import type { FlashcardReview } from "../types/flashcard";

export const DAY_NAMES_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
export const DAY_NAMES_FULL_VI = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
] as const;

export interface HeatmapCell {
  hour: number; // 0 to 23
  dayOfWeek: number; // 0 (Monday) to 6 (Sunday)
  dayName: string;
  totalReviews: number;
  correctReviews: number; // rating >= 3
  retentionRate: number; // 0.0 to 1.0
  avgDurationMs: number;
  intensity: number; // Normalized 0.0 to 1.0 for heatmap rendering
}

export interface HourlyPattern {
  hour: number;
  label: string; // e.g. "09:00"
  totalReviews: number;
  retentionRate: number; // 0.0 to 1.0
  deltaFromBaseline: number; // percentage points e.g. +0.14 (+14%)
}

export interface DailyPattern {
  dayOfWeek: number;
  dayName: string;
  fullDayName: string;
  totalReviews: number;
  retentionRate: number; // 0.0 to 1.0
}

export interface StudyPatternAnalysisResult {
  totalReviews: number;
  baselineRetentionRate: number;
  cells: HeatmapCell[];
  matrix: HeatmapCell[][]; // 7 days x 24 hours
  hourlyPatterns: HourlyPattern[];
  dailyPatterns: DailyPattern[];
  peakHour: HourlyPattern | null;
  peakDay: DailyPattern | null;
  bestStudyTimeMessage: string;
  avgReviewDurationMs: number;
  hasSufficientData: boolean; // >= 10 reviews
}

/**
 * Converts JS Date.getDay() (0=Sun, 1=Mon, ..., 6=Sat) to Monday-based index (0=Mon, ..., 6=Sun).
 */
export function getMondayBasedDayIndex(date: Date): number {
  const jsDay = date.getDay(); // 0 is Sunday, 1 is Monday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Aggregates review logs into a 24x7 cognitive pattern analysis.
 */
export function analyzeStudyPatterns(
  reviews: FlashcardReview[],
  minReviewsForPeak = 5
): StudyPatternAnalysisResult {
  if (!reviews || reviews.length === 0) {
    const emptyCells: HeatmapCell[] = [];
    const emptyMatrix: HeatmapCell[][] = [];

    for (let day = 0; day < 7; day++) {
      const row: HeatmapCell[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const cell: HeatmapCell = {
          hour,
          dayOfWeek: day,
          dayName: DAY_NAMES_VI[day],
          totalReviews: 0,
          correctReviews: 0,
          retentionRate: 0,
          avgDurationMs: 0,
          intensity: 0,
        };
        emptyCells.push(cell);
        row.push(cell);
      }
      emptyMatrix.push(row);
    }

    return {
      totalReviews: 0,
      baselineRetentionRate: 0,
      cells: emptyCells,
      matrix: emptyMatrix,
      hourlyPatterns: [],
      dailyPatterns: [],
      peakHour: null,
      peakDay: null,
      bestStudyTimeMessage: "Chưa có dữ liệu ôn tập để phân tích nhịp sinh học.",
      avgReviewDurationMs: 0,
      hasSufficientData: false,
    };
  }

  // 1. Compute global baseline
  let totalCorrect = 0;
  let totalDuration = 0;

  // 2. Initialize matrix: 7 days x 24 hours
  const matrixAccumulator: Array<
    Array<{ total: number; correct: number; durationSum: number }>
  > = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ total: 0, correct: 0, durationSum: 0 }))
  );

  for (const r of reviews) {
    const isCorrect = r.rating >= 3 ? 1 : 0;
    totalCorrect += isCorrect;
    const dur = Math.max(0, r.reviewDurationMs || 0);
    totalDuration += dur;

    const date = new Date(r.reviewedAt);
    const day = getMondayBasedDayIndex(date);
    const hour = date.getHours();

    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      const slot = matrixAccumulator[day][hour];
      slot.total += 1;
      slot.correct += isCorrect;
      slot.durationSum += dur;
    }
  }

  const baselineRetentionRate = totalCorrect / reviews.length;
  const avgReviewDurationMs = Math.round(totalDuration / reviews.length);

  // 3. Flatten cells & build matrix
  let maxCellReviews = 1;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrixAccumulator[d][h].total > maxCellReviews) {
        maxCellReviews = matrixAccumulator[d][h].total;
      }
    }
  }

  const cells: HeatmapCell[] = [];
  const matrix: HeatmapCell[][] = [];

  for (let d = 0; d < 7; d++) {
    const row: HeatmapCell[] = [];
    for (let h = 0; h < 24; h++) {
      const slot = matrixAccumulator[d][h];
      const retRate = slot.total > 0 ? slot.correct / slot.total : 0;
      const avgDur = slot.total > 0 ? Math.round(slot.durationSum / slot.total) : 0;

      // Intensity incorporates both volume and retention
      const volumeWeight = slot.total / maxCellReviews;
      const intensity = slot.total > 0 ? 0.3 * volumeWeight + 0.7 * retRate : 0;

      const cell: HeatmapCell = {
        hour: h,
        dayOfWeek: d,
        dayName: DAY_NAMES_VI[d],
        totalReviews: slot.total,
        correctReviews: slot.correct,
        retentionRate: Number(retRate.toFixed(4)),
        avgDurationMs: avgDur,
        intensity: Number(intensity.toFixed(4)),
      };

      cells.push(cell);
      row.push(cell);
    }
    matrix.push(row);
  }

  // 4. Hourly patterns aggregation (0..23)
  const hourlyPatterns: HourlyPattern[] = [];
  for (let h = 0; h < 24; h++) {
    let hTotal = 0;
    let hCorrect = 0;

    for (let d = 0; d < 7; d++) {
      hTotal += matrixAccumulator[d][h].total;
      hCorrect += matrixAccumulator[d][h].correct;
    }

    const hRate = hTotal > 0 ? hCorrect / hTotal : 0;
    const delta = hTotal > 0 ? hRate - baselineRetentionRate : 0;
    const label = `${String(h).padStart(2, "0")}:00`;

    hourlyPatterns.push({
      hour: h,
      label,
      totalReviews: hTotal,
      retentionRate: Number(hRate.toFixed(4)),
      deltaFromBaseline: Number(delta.toFixed(4)),
    });
  }

  // 5. Daily patterns aggregation (0..6)
  const dailyPatterns: DailyPattern[] = [];
  for (let d = 0; d < 7; d++) {
    let dTotal = 0;
    let dCorrect = 0;

    for (let h = 0; h < 24; h++) {
      dTotal += matrixAccumulator[d][h].total;
      dCorrect += matrixAccumulator[d][h].correct;
    }

    const dRate = dTotal > 0 ? dCorrect / dTotal : 0;

    dailyPatterns.push({
      dayOfWeek: d,
      dayName: DAY_NAMES_VI[d],
      fullDayName: DAY_NAMES_FULL_VI[d],
      totalReviews: dTotal,
      retentionRate: Number(dRate.toFixed(4)),
    });
  }

  // 6. Identify peak hour (filter by minimum sample threshold)
  const candidateHours = hourlyPatterns.filter((hp) => hp.totalReviews >= minReviewsForPeak);

  let peakHour: HourlyPattern | null = null;
  if (candidateHours.length > 0) {
    candidateHours.sort((a, b) => b.retentionRate - a.retentionRate);
    peakHour = candidateHours[0];
  } else {
    // Fallback if no hour has minReviewsForPeak reviews but reviews exist
    const nonZeroHours = hourlyPatterns.filter((hp) => hp.totalReviews > 0);
    if (nonZeroHours.length > 0) {
      nonZeroHours.sort((a, b) => b.totalReviews - a.totalReviews);
      peakHour = nonZeroHours[0];
    }
  }

  // 7. Identify peak day
  const candidateDays = dailyPatterns.filter((dp) => dp.totalReviews > 0);
  let peakDay: DailyPattern | null = null;
  if (candidateDays.length > 0) {
    candidateDays.sort((a, b) => b.retentionRate - a.retentionRate);
    peakDay = candidateDays[0];
  }

  // 8. Generate actionable best study time message
  const hasSufficientData = reviews.length >= 10;
  let bestStudyTimeMessage = "";

  if (!hasSufficientData) {
    bestStudyTimeMessage = `Đã ghi nhận ${reviews.length} lượt ôn tập. Cần tối thiểu 10 lượt để xác định khung giờ học tối ưu.`;
  } else if (peakHour && peakHour.deltaFromBaseline > 0.05) {
    const deltaPct = Math.round(peakHour.deltaFromBaseline * 100);
    const endHour = String((peakHour.hour + 1) % 24).padStart(2, "0");
    bestStudyTimeMessage = `Khung giờ vàng: ${peakHour.label} - ${endHour}:00 (Bạn nhớ tốt hơn +${deltaPct}% so với mức trung bình)`;
  } else if (peakHour) {
    const endHour = String((peakHour.hour + 1) % 24).padStart(2, "0");
    bestStudyTimeMessage = `Khung giờ tập trung cao nhất: ${peakHour.label} - ${endHour}:00 (${Math.round(peakHour.retentionRate * 100)}% ghi nhớ)`;
  } else {
    bestStudyTimeMessage = "Duy trì lịch ôn tập đều đặn để xác định khung giờ hiệu quả nhất.";
  }

  return {
    totalReviews: reviews.length,
    baselineRetentionRate: Number(baselineRetentionRate.toFixed(4)),
    cells,
    matrix,
    hourlyPatterns,
    dailyPatterns,
    peakHour,
    peakDay,
    bestStudyTimeMessage,
    avgReviewDurationMs,
    hasSufficientData,
  };
}
