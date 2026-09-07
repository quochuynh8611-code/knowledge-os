/**
 * Pure Utility functions for Flashcard Review Session (Phase F6.11).
 *
 * Provides:
 * 1. calculateStreakDays: Calendar-day consecutive streak computation
 * 2. isLowRetention: Weighted scoring evaluation for struggling cards
 * 3. calculateCardRetentionRate: Pure retention rate (0.0 - 1.0) calculation from reviews
 * 4. generateReviewSessionCSV: RFC 4180 compliant CSV generator with UTF-8 BOM
 * 5. downloadCSV: Browser download helper
 */

import type {
  Flashcard,
  FlashcardReview,
  FlashcardWithSchedule,
} from "../types/flashcard";

/**
 * Formats a Date object to local calendar date key: "YYYY-MM-DD".
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 1. Computes the consecutive day review streak from review timestamps.
 * If user reviewed today, streak starts from today.
 * If user has not reviewed today but reviewed yesterday, yesterday's streak is retained.
 * Otherwise, streak is 0.
 */
export function calculateStreakDays(
  reviews: Array<{ reviewedAt: string | Date }>,
  now: Date = new Date()
): number {
  if (!reviews || reviews.length === 0) return 0;

  const uniqueDateKeys = new Set<string>();

  for (const r of reviews) {
    if (!r.reviewedAt) continue;
    const d = r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt);
    if (isNaN(d.getTime())) continue;
    uniqueDateKeys.add(formatLocalDateKey(d));
  }

  if (uniqueDateKeys.size === 0) return 0;

  const todayKey = formatLocalDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = formatLocalDateKey(yesterday);

  let cursorDate: Date;

  if (uniqueDateKeys.has(todayKey)) {
    cursorDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (uniqueDateKeys.has(yesterdayKey)) {
    cursorDate = yesterday;
  } else {
    return 0; // Streak broken
  }

  let streak = 0;
  while (uniqueDateKeys.has(formatLocalDateKey(cursorDate))) {
    streak++;
    cursorDate = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      cursorDate.getDate() - 1
    );
  }

  return streak;
}

/**
 * 2. Checks if a flashcard has low retention using weighted scoring:
 * - lapses >= 2: +0.4
 * - easeFactor <= 2.0: +0.3
 * - retentionRate < 0.6: +0.3
 * Returns true if total score >= 0.4.
 */
export function isLowRetention(
  card: FlashcardWithSchedule | Flashcard
): boolean {
  if (!card.schedule) return false;

  const lapses = card.schedule.lapses ?? 0;
  const easeFactor = card.schedule.easeFactor ?? 2.5;
  const retentionRate = card.schedule.retentionRate;

  let score = 0;
  if (lapses >= 2) score += 0.4;
  if (easeFactor <= 2.0) score += 0.3;
  if (retentionRate !== undefined && retentionRate < 0.6) score += 0.3;

  return score >= 0.4;
}

/**
 * 3. Calculates retention rate for a card from its review history (0.0 to 1.0).
 * rating 3 (Good) or 4 (Easy) counts as successful recall.
 * Returns 1.0 if no reviews exist.
 */
export function calculateCardRetentionRate(
  reviews: FlashcardReview[]
): number {
  if (!reviews || reviews.length === 0) return 1.0;
  const remembered = reviews.filter((r) => r.rating === 3 || r.rating === 4).length;
  return remembered / reviews.length;
}

/**
 * Escapes a single CSV field value according to RFC 4180.
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 4. Generates an RFC 4180 compliant CSV string for review sessions with UTF-8 BOM.
 */
export function generateReviewSessionCSV(
  reviews: FlashcardReview[],
  cardsMap?: Map<string, Flashcard> | Record<string, Flashcard>
): string {
  const headers = [
    "Thời gian (ISO)",
    "ID thẻ",
    "ID chủ đề",
    "Đánh giá (1-4)",
    "Trạng thái trước",
    "Trạng thái sau",
    "Khoảng cách mới (ngày)",
    "Ease Factor mới",
    "Hạn tiếp theo",
    "Thời lượng làm (giây)",
    "Mặt trước (câu hỏi)",
  ];

  const getCard = (cardId: string): Flashcard | undefined => {
    if (!cardsMap) return undefined;
    if (cardsMap instanceof Map) {
      return cardsMap.get(cardId);
    }
    return (cardsMap as Record<string, Flashcard>)[cardId];
  };

  const rows: string[] = [headers.map(escapeCSVField).join(",")];

  for (const rev of reviews) {
    const cardId = rev.flashcardId || rev.cardId || "";
    const card = getCard(cardId);
    const frontText = card ? card.front : "";
    const durationSec = rev.reviewDurationMs
      ? (rev.reviewDurationMs / 1000).toFixed(1)
      : "0";
    const easeStr =
      rev.easeFactorAfter !== undefined ? rev.easeFactorAfter.toFixed(2) : "";

    const row = [
      rev.reviewedAt || "",
      cardId,
      rev.topicId || "",
      rev.rating ?? "",
      rev.stateBefore || "",
      rev.stateAfter || "",
      rev.intervalAfter ?? "",
      easeStr,
      rev.dueAfterAt || rev.dueAfter || "",
      durationSec,
      frontText,
    ];

    rows.push(row.map(escapeCSVField).join(","));
  }

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  return "\uFEFF" + rows.join("\r\n");
}

/**
 * 5. Client-side browser file download utility for CSV files.
 */
export function downloadCSV(content: string, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
