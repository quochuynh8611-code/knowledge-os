import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateFsrsRetrievability,
  calculateFsrsNextInterval,
  calculateFsrsNextReview,
  migrateSm2ToFsrsState,
  syncFsrsToSm2Fields,
  previewCardRatingIntervals,
  getSrsUserConfig,
  setSrsUserConfig,
  DEFAULT_FSRS_WEIGHTS,
} from '../../src/lib/fsrsEngine';
import { calculateFlashcardNextReview } from '../../src/lib/flashcardScheduler';
import type { FlashcardSchedule } from '../../src/types/flashcard';

describe('Phase 3: FSRS v5 Core Spaced Repetition Engine Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // 1. Power-Law Forgetting Curve Tests
  // ---------------------------------------------------------------------------
  describe('1. Power-Law Forgetting Curve R(t, S)', () => {
    it('1.1. Tại thời điểm t = 0 ngày (vừa ôn xong), Retrievability R = 1.0 (100%)', () => {
      const stability = 10.0;
      const r = calculateFsrsRetrievability(0, stability);
      expect(r).toBeCloseTo(1.0, 5);
    });

    it('1.2. Tại thời điểm t = S ngày, Retrievability R(S, S) đúng bằng 0.90 (90%)', () => {
      const stabilities = [1.0, 5.0, 10.0, 30.0, 100.0];
      for (const s of stabilities) {
        const r = calculateFsrsRetrievability(s, s);
        expect(r).toBeCloseTo(0.9, 4);
      }
    });

    it('1.3. Retrievability giảm đơn điệu theo thời gian trôi qua t', () => {
      const s = 15.0;
      const r1 = calculateFsrsRetrievability(1, s);
      const r5 = calculateFsrsRetrievability(5, s);
      const r15 = calculateFsrsRetrievability(15, s);
      const r30 = calculateFsrsRetrievability(30, s);
      const r60 = calculateFsrsRetrievability(60, s);

      expect(r1).toBeGreaterThan(r5);
      expect(r5).toBeGreaterThan(r15);
      expect(r15).toBeGreaterThan(r30);
      expect(r30).toBeGreaterThan(r60);
      expect(r60).toBeGreaterThan(0);
    });

    it('1.4. Xử lý an toàn khi S <= 0 hoặc t < 0', () => {
      expect(calculateFsrsRetrievability(-5, 10)).toBe(1.0);
      expect(calculateFsrsRetrievability(5, 0)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Next Interval Computation with Desired Retention
  // ---------------------------------------------------------------------------
  describe('2. Next Interval Computation I(R_req, S)', () => {
    it('2.1. Với Desired Retention chuẩn R_req = 0.90, Interval đúng bằng round(S)', () => {
      const stabilities = [3.0, 7.4, 12.0, 25.6, 90.0];
      for (const s of stabilities) {
        const interval = calculateFsrsNextInterval(s, 0.9);
        expect(interval).toBe(Math.round(s));
      }
    });

    it('2.2. Desired Retention càng cao thì khoảng cách ôn tập I càng ngắn để củng cố trí nhớ', () => {
      const s = 20.0;
      const i80 = calculateFsrsNextInterval(s, 0.8);
      const i90 = calculateFsrsNextInterval(s, 0.9);
      const i95 = calculateFsrsNextInterval(s, 0.95);

      expect(i80).toBeGreaterThan(i90);
      expect(i90).toBeGreaterThan(i95);
      expect(i95).toBeGreaterThanOrEqual(1);
    });

    it('2.3. Interval luôn >= 1 ngày', () => {
      const tinyStability = 0.1;
      const interval = calculateFsrsNextInterval(tinyStability, 0.97);
      expect(interval).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. FSRS State Transitions across Ratings 1 to 4
  // ---------------------------------------------------------------------------
  describe('3. FSRS State Transitions across Ratings 1..4', () => {
    const newCardSchedule: FlashcardSchedule = {
      id: 'sch-new',
      flashcardId: 'card-1',
      state: 'new',
      dueAt: '2026-10-25T00:00:00Z',
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      updatedAt: '2026-10-25T00:00:00Z',
    };

    it('3.1. Thẻ mới (state === "new"): Đánh giá 1..4 khởi tạo đúng S0 và D0 theo trọng số chuẩn', () => {
      const refDate = new Date('2026-10-25T12:00:00Z');

      const againRes = calculateFsrsNextReview({ currentSchedule: newCardSchedule, rating: 1, referenceDate: refDate });
      const hardRes = calculateFsrsNextReview({ currentSchedule: newCardSchedule, rating: 2, referenceDate: refDate });
      const goodRes = calculateFsrsNextReview({ currentSchedule: newCardSchedule, rating: 3, referenceDate: refDate });
      const easyRes = calculateFsrsNextReview({ currentSchedule: newCardSchedule, rating: 4, referenceDate: refDate });

      // Stability: S(Again) < S(Hard) < S(Good) < S(Easy)
      expect(againRes.nextSchedule.stability).toBeCloseTo(DEFAULT_FSRS_WEIGHTS[0], 2);
      expect(hardRes.nextSchedule.stability).toBeCloseTo(DEFAULT_FSRS_WEIGHTS[1], 2);
      expect(goodRes.nextSchedule.stability).toBeCloseTo(DEFAULT_FSRS_WEIGHTS[2], 2);
      expect(easyRes.nextSchedule.stability).toBeCloseTo(DEFAULT_FSRS_WEIGHTS[3], 2);

      // Difficulty: D(Again) > D(Hard) > D(Good) > D(Easy)
      expect(againRes.nextSchedule.difficulty!).toBeGreaterThan(goodRes.nextSchedule.difficulty!);
      expect(goodRes.nextSchedule.difficulty!).toBeGreaterThan(easyRes.nextSchedule.difficulty!);

      // Bất biến khoảng giá trị Difficulty [1.0, 10.0]
      [againRes, hardRes, goodRes, easyRes].forEach((res) => {
        expect(res.nextSchedule.difficulty).toBeGreaterThanOrEqual(1.0);
        expect(res.nextSchedule.difficulty).toBeLessThanOrEqual(10.0);
      });
    });

    it('3.2. Thẻ đang ôn (Review card): Bất biến thứ tự Interval & Stability qua 4 nút đánh giá', () => {
      const reviewSchedule: FlashcardSchedule = {
        id: 'sch-review',
        flashcardId: 'card-2',
        state: 'review',
        dueAt: '2026-10-25T00:00:00Z',
        interval: 10,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        stability: 10.0,
        difficulty: 5.0,
        lastReviewedAt: '2026-10-15T00:00:00Z', // 10 ngày trước
        updatedAt: '2026-10-15T00:00:00Z',
      };

      const refDate = new Date('2026-10-25T00:00:00Z');

      const againRes = calculateFsrsNextReview({ currentSchedule: reviewSchedule, rating: 1, referenceDate: refDate });
      const hardRes = calculateFsrsNextReview({ currentSchedule: reviewSchedule, rating: 2, referenceDate: refDate });
      const goodRes = calculateFsrsNextReview({ currentSchedule: reviewSchedule, rating: 3, referenceDate: refDate });
      const easyRes = calculateFsrsNextReview({ currentSchedule: reviewSchedule, rating: 4, referenceDate: refDate });

      // Thứ tự Stability
      expect(againRes.nextSchedule.stability!).toBeLessThan(hardRes.nextSchedule.stability!);
      expect(hardRes.nextSchedule.stability!).toBeLessThan(goodRes.nextSchedule.stability!);
      expect(goodRes.nextSchedule.stability!).toBeLessThan(easyRes.nextSchedule.stability!);

      // Thứ tự Intervals
      expect(againRes.nextSchedule.interval).toBeLessThanOrEqual(hardRes.nextSchedule.interval);
      expect(hardRes.nextSchedule.interval).toBeLessThanOrEqual(goodRes.nextSchedule.interval);
      expect(goodRes.nextSchedule.interval).toBeLessThan(easyRes.nextSchedule.interval);

      // Thẻ quên (Again) chuyển sang relearning và tăng lapses
      expect(againRes.nextSchedule.state).toBe('relearning');
      expect(againRes.nextSchedule.lapses).toBe(1);
      expect(goodRes.nextSchedule.lapses).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Zero-Migration SM-2 ↔ FSRS State Bridge
  // ---------------------------------------------------------------------------
  describe('4. Zero-Migration SM-2 ↔ FSRS State Bridge', () => {
    it('4.1. migrateSm2ToFsrsState suy diễn chuẩn xác Difficulty D và Stability S từ thẻ cũ', () => {
      // Thẻ khó: ease thấp (1.3), nhiều lapses (4)
      const hardSm2Card: FlashcardSchedule = {
        id: 'c1',
        flashcardId: 'f1',
        state: 'review',
        dueAt: '2026-10-25T00:00:00Z',
        interval: 3,
        easeFactor: 1.3,
        repetitions: 2,
        lapses: 4,
        updatedAt: '2026-10-25T00:00:00Z',
      };

      const fsrsHard = migrateSm2ToFsrsState(hardSm2Card);
      expect(fsrsHard.difficulty).toBeGreaterThanOrEqual(8.0);
      expect(fsrsHard.stability).toBe(3);

      // Thẻ dễ: ease cao (3.3), 0 lapse
      const easySm2Card: FlashcardSchedule = {
        id: 'c2',
        flashcardId: 'f2',
        state: 'review',
        dueAt: '2026-10-25T00:00:00Z',
        interval: 45,
        easeFactor: 3.3,
        repetitions: 6,
        lapses: 0,
        updatedAt: '2026-10-25T00:00:00Z',
      };

      const fsrsEasy = migrateSm2ToFsrsState(easySm2Card);
      expect(fsrsEasy.difficulty).toBeLessThanOrEqual(3.5);
      expect(fsrsEasy.stability).toBe(45);
    });

    it('4.2. syncFsrsToSm2Fields ánh xạ ngược Difficulty D sang easeFactor tương đương [1.3, 3.5]', () => {
      // D = 1.0 (cực dễ) -> easeFactor tiệm cận 3.50
      const easeEasy = syncFsrsToSm2Fields(1.0);
      expect(easeEasy).toBeCloseTo(3.5, 1);

      // D = 10.0 (cực khó) -> easeFactor tiệm cận 1.30
      const easeHard = syncFsrsToSm2Fields(10.0);
      expect(easeHard).toBeCloseTo(1.3, 1);

      // D = 5.5 (trung bình) -> easeFactor khoảng 2.40
      const easeMid = syncFsrsToSm2Fields(5.5);
      expect(easeMid).toBeGreaterThan(2.0);
      expect(easeMid).toBeLessThan(2.8);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Rating Interval Preview Function
  // ---------------------------------------------------------------------------
  describe('5. previewCardRatingIntervals', () => {
    it('5.1. Trả về đầy đủ preview cho cả 4 nút đánh giá (1..4)', () => {
      const schedule: FlashcardSchedule = {
        id: 'c1',
        flashcardId: 'f1',
        state: 'review',
        dueAt: '2026-10-25T00:00:00Z',
        interval: 12,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
        stability: 12.0,
        difficulty: 4.5,
        updatedAt: '2026-10-25T00:00:00Z',
      };

      const preview = previewCardRatingIntervals(schedule);
      expect(preview).toHaveProperty('1');
      expect(preview).toHaveProperty('2');
      expect(preview).toHaveProperty('3');
      expect(preview).toHaveProperty('4');

      expect(preview[1].intervalDays).toBeLessThanOrEqual(preview[2].intervalDays);
      expect(preview[2].intervalDays).toBeLessThanOrEqual(preview[3].intervalDays);
      expect(preview[3].intervalDays).toBeLessThan(preview[4].intervalDays);

      expect(preview[1].nextStability).toBeLessThan(preview[4].nextStability);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. User Configuration & Backward Compatibility in flashcardScheduler
  // ---------------------------------------------------------------------------
  describe('6. User Config & Backward Compatibility', () => {
    it('6.1. getSrsUserConfig / setSrsUserConfig lưu và đọc đúng từ localStorage', () => {
      expect(getSrsUserConfig()).toEqual({ algorithm: 'fsrs', desiredRetention: 0.9 });

      setSrsUserConfig({ algorithm: 'sm2', desiredRetention: 0.85 });
      expect(getSrsUserConfig()).toEqual({ algorithm: 'sm2', desiredRetention: 0.85 });

      // Clamp desired retention trong [0.70, 0.97]
      setSrsUserConfig({ desiredRetention: 0.5 });
      expect(getSrsUserConfig().desiredRetention).toBe(0.7);

      setSrsUserConfig({ desiredRetention: 0.99 });
      expect(getSrsUserConfig().desiredRetention).toBe(0.97);
    });

    it('6.2. calculateFlashcardNextReview bảo toàn 100% kết quả SM-2 cũ khi không chỉ định algorithm', () => {
      const baseSchedule: FlashcardSchedule = {
        id: 'sch-001',
        flashcardId: 'card-001',
        state: 'new',
        dueAt: '2026-09-06T12:00:00.000Z',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: '2026-09-06T12:00:00.000Z',
      };

      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 1,
        referenceDate: new Date('2026-09-06T12:00:00.000Z'),
      });

      // Kết quả đúng chuẩn SM-2 legacy
      expect(result.nextSchedule.state).toBe('relearning');
      expect(result.nextSchedule.interval).toBe(1);
      expect(result.nextSchedule.easeFactor).toBe(2.3);
      expect(result.nextSchedule.repetitions).toBe(0);
      expect(result.nextSchedule.lapses).toBe(1);
    });

    it('6.3. calculateFlashcardNextReview khi truyền algorithm: "fsrs" thực thi FSRS engine', () => {
      const baseSchedule: FlashcardSchedule = {
        id: 'sch-001',
        flashcardId: 'card-001',
        state: 'new',
        dueAt: '2026-09-06T12:00:00.000Z',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: '2026-09-06T12:00:00.000Z',
      };

      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 3, // Good
        algorithm: 'fsrs',
        desiredRetention: 0.9,
        referenceDate: new Date('2026-09-06T12:00:00.000Z'),
      });

      expect(result.nextSchedule.state).toBe('review');
      expect(result.nextSchedule.stability).toBeDefined();
      expect(result.nextSchedule.difficulty).toBeDefined();
      expect(result.nextSchedule.desiredRetention).toBe(0.9);
      expect(result.nextSchedule.interval).toBeGreaterThanOrEqual(1);
    });
  });
});
