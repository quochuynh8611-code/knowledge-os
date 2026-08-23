import { Topic, StudyProgress } from '../types';

export interface ReviewSchedule {
  interval: number; // days
  easeFactor: number;
  repetitions: number;
  nextReview: string; // ISO string
}

/**
 * SM-2 Algorithm (Anki-style spaced repetition)
 * @param previousInterval days
 * @param previousEase ease factor (default 2.5, min 1.3)
 * @param repetitions number of consecutive successful recalls
 * @param quality 0-5 (0=complete blackout, 3=pass with effort, 5=perfect recall)
 */
export function calculateNextReview(
  previousInterval: number = 0,
  previousEase: number = 2.5,
  repetitions: number = 0,
  quality: number
): ReviewSchedule {
  let easeFactor = previousEase || 2.5;
  let interval = previousInterval || 0;
  let newRepetitions = repetitions || 0;

  if (quality >= 3) {
    // Successful recall
    if (newRepetitions === 0) {
      interval = 1;
    } else if (newRepetitions === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
    }
    newRepetitions += 1;
    // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  } else {
    // Failed recall: reset interval
    interval = 1;
    newRepetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  nextDate.setHours(23, 59, 59, 999);

  return {
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions: newRepetitions,
    nextReview: nextDate.toISOString(),
  };
}

export function getReviewQueue(topics: Topic[]): Topic[] {
  const now = new Date();
  return topics
    .filter((topic) => {
      if (!topic.studyProgress?.nextReview) return false;
      const reviewDate = new Date(topic.studyProgress.nextReview);
      return reviewDate <= now || isSameDay(reviewDate, now);
    })
    .sort((a, b) => {
      const aTime = new Date(a.studyProgress.nextReview || 0).getTime();
      const bTime = new Date(b.studyProgress.nextReview || 0).getTime();
      return aTime - bTime;
    });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export function formatMinutesToHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 phút';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}g ${m}p`;
}
