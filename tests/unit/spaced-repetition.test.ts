import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateNextReview,
  getReviewQueue,
  formatMinutesToHours,
  formatTimeAgo,
} from "../../src/lib/spaced-repetition";
import { Topic } from "../../src/types";

describe("Spaced Repetition (SM-2 Algorithm)", () => {
  describe("calculateNextReview - Toán học và chu kỳ lặp lại", () => {
    it("Chất lượng 5 (Nhớ hoàn hảo lần đầu): interval phải là 1 ngày, ease factor tăng", () => {
      const schedule = calculateNextReview(0, 2.5, 0, 5);
      expect(schedule.interval).toBe(1);
      expect(schedule.repetitions).toBe(1);
      expect(schedule.easeFactor).toBeGreaterThanOrEqual(2.6); // 2.5 + (0.1 - 0) = 2.6
    });

    it("Chất lượng 4 (Nhớ tốt lần 2): interval phải là 6 ngày", () => {
      const schedule = calculateNextReview(1, 2.6, 1, 4);
      expect(schedule.interval).toBe(6);
      expect(schedule.repetitions).toBe(2);
      expect(schedule.easeFactor).toBeCloseTo(2.6, 1);
    });

    it("Chất lượng 5 (Nhớ tốt lần 3): interval = round(6 * 2.6) = 16 ngày", () => {
      const schedule = calculateNextReview(6, 2.6, 2, 5);
      expect(schedule.interval).toBe(16);
      expect(schedule.repetitions).toBe(3);
      expect(schedule.easeFactor).toBeGreaterThan(2.6);
    });

    it("Chất lượng < 3 (Quên hoặc nhớ sai): reset interval về 1, repetitions về 0, easeFactor giảm", () => {
      const schedule = calculateNextReview(16, 2.6, 3, 2);
      expect(schedule.interval).toBe(1);
      expect(schedule.repetitions).toBe(0);
      expect(schedule.easeFactor).toBeLessThan(2.6);
    });

    it("Hệ số Dễ dàng (Ease Factor) không bao giờ được nhỏ hơn mức sàn 1.3", () => {
      let ease = 1.4;
      for (let i = 0; i < 5; i++) {
        const schedule = calculateNextReview(1, ease, 0, 0); // Chất lượng 0 liên tục
        ease = schedule.easeFactor;
      }
      expect(ease).toBe(1.3);
    });

    it("nextReview phải là chuỗi ngày ISO hợp lệ trong tương lai", () => {
      const schedule = calculateNextReview(0, 2.5, 0, 4);
      const nextDate = new Date(schedule.nextReview);
      expect(isNaN(nextDate.getTime())).toBe(false);
      expect(nextDate.getTime()).toBeGreaterThan(Date.now() - 10000);
    });
  });

  describe("getReviewQueue - Lọc hàng đợi ôn tập theo hạn (Due Queue)", () => {
    const mockTopics: Topic[] = [
      {
        id: "t1",
        title: "Chủ đề quá hạn ôn tập",
        slug: "t1",
        categoryId: "c1",
        type: "phat-hoc",
        description: "",
        content: "",
        tags: [],
        links: [],
        createdAt: "",
        updatedAt: "",
        studyProgress: {
          topicId: "t1",
          status: "in_progress",
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 30,
          nextReview: new Date(Date.now() - 86400000 * 2).toISOString(), // Quá hạn 2 ngày
        },
      },
      {
        id: "t2",
        title: "Chủ đề chưa đến hạn ôn tập",
        slug: "t2",
        categoryId: "c1",
        type: "phat-hoc",
        description: "",
        content: "",
        tags: [],
        links: [],
        createdAt: "",
        updatedAt: "",
        studyProgress: {
          topicId: "t2",
          status: "in_progress",
          progress: 50,
          interval: 10,
          easeFactor: 2.5,
          repetitions: 2,
          totalNotes: 0,
          timeSpent: 30,
          nextReview: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 ngày nữa mới đến hạn
        },
      },
      {
        id: "t3",
        title: "Chủ đề chưa từng thiết lập ôn tập",
        slug: "t3",
        categoryId: "c1",
        type: "phat-hoc",
        description: "",
        content: "",
        tags: [],
        links: [],
        createdAt: "",
        updatedAt: "",
        studyProgress: {
          topicId: "t3",
          status: "not_started",
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      },
    ];

    it("Chỉ trả về các chủ đề quá hạn hoặc đến hạn hôm nay", () => {
      const queue = getReviewQueue(mockTopics);
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe("t1");
    });
  });

  describe("Định dạng thời gian", () => {
    it("formatMinutesToHours định dạng đúng phút và giờ", () => {
      expect(formatMinutesToHours(0)).toBe("0 phút");
      expect(formatMinutesToHours(45)).toBe("45 phút");
      expect(formatMinutesToHours(60)).toBe("1 giờ");
      expect(formatMinutesToHours(125)).toBe("2g 5p");
    });

    it("formatTimeAgo định dạng thời gian vừa xong", () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now)).toBe("Vừa xong");
    });
  });
});
