import { describe, it, expect } from "vitest";
import {
  calculateRetentionMetrics,
  calculateReviewForecast,
  generateForgettingCurveProjection,
  RetentionMetrics,
  DailyForecast,
  ForgettingCurvePoint,
} from "../../src/lib/studyAnalytics";
import { Topic } from "../../src/types";

describe("Workstream 5B: Spaced Repetition (SM-2) Study Session Analytics", () => {
  // Mock canonical topics fixture
  const mockTopics: Topic[] = [
    {
      id: "topic-1",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      type: "phat-hoc",
      categoryId: "cat-phat-hoc",
      description: "Căn bản Phật học",
      content: "",
      tags: ["co-ban"],
      links: [],
      studyProgress: {
        topicId: "topic-1",
        status: "completed",
        progress: 100,
        repetitions: 6, // Mastered (>= 5)
        interval: 15,
        easeFactor: 2.6,
        lastStudied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        nextReview: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
        totalNotes: 2,
        timeSpent: 120,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-2",
      title: "Bát Chánh Đạo",
      slug: "bat-chanh-dao",
      type: "phat-hoc",
      categoryId: "cat-phat-hoc",
      description: "Con đường tám nhánh",
      content: "",
      tags: ["dao-de"],
      links: [],
      studyProgress: {
        topicId: "topic-2",
        status: "in_progress",
        progress: 60,
        repetitions: 3, // Consolidating (3-4)
        interval: 4,
        easeFactor: 2.4,
        lastStudied: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        nextReview: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // due in 3 days
        totalNotes: 1,
        timeSpent: 45,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-3",
      title: "Kỳ Môn Độn Giáp Khởi Đầu",
      slug: "ky-mon-don-giap-khoi-dau",
      type: "huyen-hoc",
      categoryId: "cat-huyen-hoc",
      description: "Căn bản Kỳ Môn",
      content: "",
      tags: ["ky-mon"],
      links: [],
      studyProgress: {
        topicId: "topic-3",
        status: "in_progress",
        progress: 25,
        repetitions: 1, // Learning (1-2)
        interval: 1,
        easeFactor: 2.2,
        lastStudied: new Date().toISOString(), // today
        nextReview: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // due tomorrow (D+1)
        totalNotes: 0,
        timeSpent: 30,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "topic-4",
      title: "Thái Ất Thần Số",
      slug: "thai-at-than-so",
      type: "huyen-hoc",
      categoryId: "cat-huyen-hoc",
      description: "Khảo luận Thái Ất",
      content: "",
      tags: ["thai-at"],
      links: [],
      studyProgress: {
        topicId: "topic-4",
        status: "not_started",
        progress: 0,
        repetitions: 0, // Unstarted (0)
        interval: 0,
        easeFactor: 2.5,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  describe("1. calculateRetentionMetrics", () => {
    it("computes estimated retention metrics and validates mastery stage distribution", () => {
      const metrics: RetentionMetrics = calculateRetentionMetrics(mockTopics);

      // Estimated retention rate must be a bounded percentage [0, 100]
      expect(metrics.estimatedRetentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.estimatedRetentionRate).toBeLessThanOrEqual(100);

      // Mastery stage grouping count
      expect(metrics.masteredCount).toBe(1); // topic-1
      expect(metrics.consolidatingCount).toBe(1); // topic-2
      expect(metrics.learningCount).toBe(1); // topic-3
      expect(metrics.unstartedCount).toBe(1); // topic-4

      // Sum of mastery distribution must exactly equal total topics
      const sumStages =
        metrics.masteredCount +
        metrics.consolidatingCount +
        metrics.learningCount +
        metrics.unstartedCount;
      expect(sumStages).toBe(mockTopics.length);

      // Active studied topics and time spent
      expect(metrics.totalStudiedTopics).toBe(3);
      expect(metrics.totalTimeSpentMinutes).toBe(195);
    });

    it("handles empty topic dataset gracefully without NaN or Infinity", () => {
      const emptyMetrics = calculateRetentionMetrics([]);

      expect(emptyMetrics.estimatedRetentionRate).toBe(0);
      expect(emptyMetrics.masteredCount).toBe(0);
      expect(emptyMetrics.consolidatingCount).toBe(0);
      expect(emptyMetrics.learningCount).toBe(0);
      expect(emptyMetrics.unstartedCount).toBe(0);
      expect(emptyMetrics.totalStudiedTopics).toBe(0);
      expect(emptyMetrics.totalTimeSpentMinutes).toBe(0);
      expect(Number.isNaN(emptyMetrics.estimatedRetentionRate)).toBe(false);
    });

    it("handles all unstarted topics without division-by-zero errors", () => {
      const unstartedTopics = mockTopics.map((t) => ({
        ...t,
        studyProgress: {
          ...t.studyProgress,
          status: "not_started" as const,
          repetitions: 0,
          interval: 0,
          lastStudied: undefined,
          nextReview: undefined,
        },
      }));

      const metrics = calculateRetentionMetrics(unstartedTopics);
      expect(metrics.estimatedRetentionRate).toBe(0);
      expect(metrics.unstartedCount).toBe(unstartedTopics.length);
      expect(metrics.totalStudiedTopics).toBe(0);
    });
  });

  describe("2. calculateReviewForecast (7-Day Forecast)", () => {
    it("generates daily review forecast with domain separation for 7 days ahead", () => {
      const forecast: DailyForecast[] = calculateReviewForecast(mockTopics, 7);

      expect(forecast.length).toBe(7);

      // Day 0 is today, Day 1 is tomorrow
      const todayForecast = forecast[0];
      expect(todayForecast).toBeDefined();
      expect(todayForecast.dateStr).toBeDefined();
      expect(todayForecast.dayLabel).toBeDefined();
      expect(typeof todayForecast.phatHocCount).toBe("number");
      expect(typeof todayForecast.huyenHocCount).toBe("number");
      expect(todayForecast.totalCount).toBe(
        todayForecast.phatHocCount + todayForecast.huyenHocCount
      );

      // Total count across all forecast days must be non-negative integer
      forecast.forEach((day) => {
        expect(day.totalCount).toBeGreaterThanOrEqual(0);
      });
    });

    it("returns default 7 days when daysAhead is omitted", () => {
      const forecast = calculateReviewForecast(mockTopics);
      expect(forecast.length).toBe(7);
    });
  });

  describe("3. generateForgettingCurveProjection", () => {
    it("generates 30-day theoretical decay projection points with monotonic decrease", () => {
      const projection: ForgettingCurvePoint[] = generateForgettingCurveProjection();

      expect(projection.length).toBe(31); // day 0 to day 30

      // At Day 0, all retention levels start at 100%
      expect(projection[0].day).toBe(0);
      expect(projection[0].masteredRetention).toBe(100);
      expect(projection[0].moderateRetention).toBe(100);
      expect(projection[0].strugglingRetention).toBe(100);

      // Monotonic decay check: retention at Day t+1 <= retention at Day t
      for (let i = 0; i < projection.length - 1; i++) {
        const current = projection[i];
        const next = projection[i + 1];

        expect(next.masteredRetention).toBeLessThanOrEqual(current.masteredRetention);
        expect(next.moderateRetention).toBeLessThanOrEqual(current.moderateRetention);
        expect(next.strugglingRetention).toBeLessThanOrEqual(current.strugglingRetention);

        // Mastered retention should decay slower than struggling retention
        expect(next.masteredRetention).toBeGreaterThanOrEqual(next.strugglingRetention);
      }
    });
  });
});
