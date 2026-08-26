import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateRetentionMetrics,
  calculateReviewForecast,
  calculateDomainRetentionSummary,
  generateForgettingCurveProjection,
  RetentionMetrics,
  DailyForecast,
  ForgettingCurvePoint,
} from "../../src/lib/studyAnalytics";
import { Topic } from "../../src/types";

describe("Workstream 5B: Spaced Repetition (SM-2) Study Session Analytics", () => {
  const FIXED_NOW = new Date("2026-08-26T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Mock canonical topics fixture factory
  function getMockTopics(): Topic[] {
    return [
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
  }

  describe("1. calculateRetentionMetrics", () => {
    it("computes estimated retention metrics and validates mastery stage distribution", () => {
      const mockTopics = getMockTopics();
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
      const unstartedTopics = getMockTopics().map((t) => ({
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
      const forecast: DailyForecast[] = calculateReviewForecast(getMockTopics(), 7);

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
      const forecast = calculateReviewForecast(getMockTopics());
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

  describe("4. Multi-Domain Generalization & Dynamic Domain Breakdown", () => {
    const multiDomainCategories = [
      { id: "cat-phat-hoc", name: "Phật Học", slug: "phat-hoc", parentId: null },
      { id: "cat-huyen-hoc", name: "Huyền Học", slug: "huyen-hoc", parentId: null },
      { id: "cat-triet-hoc", name: "Triết Học Tây Phương", slug: "triet-hoc", parentId: null },
      { id: "cat-khoa-hoc", name: "Khoa Học Tự Nhiên", slug: "khoa-hoc", parentId: null },
    ];

    function getMultiDomainTopics(): Topic[] {
      return [
        ...getMockTopics(),
        {
          id: "topic-5",
          title: "Hiện tượng học Tinh thần",
          slug: "hien-tuong-hoc-tinh-than",
          type: "triet-hoc",
          categoryId: "cat-triet-hoc",
          description: "Triết học Hegel",
          content: "",
          tags: ["triet-hoc"],
          links: [],
          studyProgress: {
            topicId: "topic-5",
            status: "in_progress",
            progress: 50,
            repetitions: 2,
            interval: 2,
            easeFactor: 2.5,
            nextReview: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // due tomorrow (D+1)
            totalNotes: 1,
            timeSpent: 40,
          },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "topic-6",
          title: "Vật lý Lượng tử Khảo luận",
          slug: "vat-ly-luong-tu",
          type: "khoa-hoc",
          categoryId: "cat-khoa-hoc",
          description: "Vật lý hiện đại",
          content: "",
          tags: ["vat-ly"],
          links: [],
          studyProgress: {
            topicId: "topic-6",
            status: "completed",
            progress: 100,
            repetitions: 5,
            interval: 10,
            easeFactor: 2.6,
            nextReview: new Date().toISOString(), // due today (D+0)
            totalNotes: 3,
            timeSpent: 90,
          },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "topic-7",
          title: "Chủ đề Không Gán Nhóm",
          slug: "chu-de-khong-nhom",
          type: "" as any,
          categoryId: "",
          description: "Chủ đề thử nghiệm",
          content: "",
          tags: [],
          links: [],
          studyProgress: {
            topicId: "topic-7",
            status: "in_progress",
            progress: 10,
            repetitions: 1,
            interval: 1,
            easeFactor: 2.5,
            nextReview: new Date().toISOString(), // due today (D+0)
            totalNotes: 0,
            timeSpent: 10,
          },
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];
    }

    it("1. aggregates three root domains and fourth domain independently in review forecast", () => {
      const forecast = calculateReviewForecast(getMultiDomainTopics(), 7, multiDomainCategories as any);

      const today = forecast[0];
      expect(today.domainCounts).toBeDefined();
      expect(today.domainCounts["khoa-hoc"]).toBe(1); // topic-6
      expect(today.domainCounts["other"]).toBe(1); // topic-7 without domain

      const tomorrow = forecast[1];
      expect(tomorrow.domainCounts["huyen-hoc"]).toBe(1); // topic-3
      expect(tomorrow.domainCounts["triet-hoc"]).toBe(1); // topic-5
    });

    it("2. does not silently count unknown or empty domains into phat-hoc or huyen-hoc", () => {
      const forecast = calculateReviewForecast(getMultiDomainTopics(), 7, multiDomainCategories as any);
      const today = forecast[0];

      // topic-7 is unassigned; it should be categorized under 'other', not 'phat-hoc' or 'huyen-hoc'
      expect(today.domainCounts["other"]).toBe(1);
      expect(today.phatHocCount).toBe(0);
      expect(today.huyenHocCount).toBe(0);
    });

    it("3. preserves legacy two-domain fields for backward compatibility", () => {
      const legacyForecast = calculateReviewForecast(getMockTopics(), 7);

      expect(legacyForecast[1].huyenHocCount).toBe(1); // topic-3
      expect(legacyForecast[3].phatHocCount).toBe(1); // topic-2
    });

    it("4. handles empty input gracefully with safe empty domainCounts structure", () => {
      const emptyForecast = calculateReviewForecast([], 7);
      expect(emptyForecast.length).toBe(7);
      emptyForecast.forEach((day) => {
        expect(day.totalCount).toBe(0);
        expect(day.domainCounts).toEqual({});
      });
    });

    it("5. ensures deterministic ordering of returned domain summaries", () => {
      const forecast = calculateReviewForecast(getMultiDomainTopics(), 7, multiDomainCategories as any);
      const tomorrow = forecast[1];

      expect(tomorrow.domains).toBeDefined();
      const domainKeys = tomorrow.domains!.map((d) => d.domain);
      // Alphabetically sorted: 'huyen-hoc', 'triet-hoc'
      expect(domainKeys).toEqual(["huyen-hoc", "triet-hoc"]);
    });

    it("6. calculateDomainRetentionSummary calculates deterministic per-domain retention metrics", () => {
      const summary = calculateDomainRetentionSummary(getMultiDomainTopics(), multiDomainCategories as any);

      // Must be deterministically sorted by domain key: ['huyen-hoc', 'khoa-hoc', 'other', 'phat-hoc', 'triet-hoc']
      expect(summary.map((s) => s.domain)).toEqual([
        "huyen-hoc",
        "khoa-hoc",
        "other",
        "phat-hoc",
        "triet-hoc",
      ]);

      const phatHoc = summary.find((s) => s.domain === "phat-hoc");
      expect(phatHoc?.totalTopics).toBe(2);
      expect(phatHoc?.masteredCount).toBe(1);
      expect(phatHoc?.consolidatingCount).toBe(1);

      const khoaHoc = summary.find((s) => s.domain === "khoa-hoc");
      expect(khoaHoc?.totalTopics).toBe(1);
      expect(khoaHoc?.masteredCount).toBe(1);

      // Empty input test
      expect(calculateDomainRetentionSummary([])).toEqual([]);
    });
  });
});
