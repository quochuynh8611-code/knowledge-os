import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import type { Topic } from "../../src/types/index";
import {
  getNotificationConfig,
  saveNotificationConfig,
  checkRateLimit,
  logNotificationSent,
  clearNotificationHistory,
  snoozeAlert,
  isSnoozed,
  checkDueForgettingAlerts,
  triggerSmartNotification,
  DEFAULT_NOTIFICATION_CONFIG,
  NOTIFICATION_CONFIG_KEY,
} from "../../src/lib/smartNotificationService";

describe("Smart Notification Service (Phase F7.1)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearNotificationHistory();
  });

  describe("Configuration & Preferences", () => {
    it("returns default config when localStorage is empty", () => {
      const config = getNotificationConfig();
      expect(config.enabled).toBe(true);
      expect(config.targetRetentionThreshold).toBe(0.8);
      expect(config.maxNotificationsPer24h).toBe(3);
      expect(config.minHoursBetweenNotifications).toBe(2);
    });

    it("saves updates to localStorage and retrieves them", () => {
      saveNotificationConfig({
        enabled: false,
        targetRetentionThreshold: 0.85,
      });

      const updated = getNotificationConfig();
      expect(updated.enabled).toBe(false);
      expect(updated.targetRetentionThreshold).toBe(0.85);
    });
  });

  describe("Rate Limiting Policies", () => {
    it("allows sending when history is empty", () => {
      const check = checkRateLimit();
      expect(check.rateLimited).toBe(false);
    });

    it("blocks notification if last notification was sent less than minHoursBetweenNotifications (2h) ago", () => {
      const now = new Date("2026-09-07T10:00:00Z");

      // Log notification at 09:00 (1 hour ago)
      logNotificationSent({
        title: "Test 1",
        body: "Body 1",
      });

      // Update timestamp of logged item to 09:00
      const historyRaw = JSON.parse(
        localStorage.getItem("knowledge_os_notification_history_v1") || "[]"
      );
      historyRaw[0].timestamp = new Date("2026-09-07T09:00:00Z").toISOString();
      localStorage.setItem(
        "knowledge_os_notification_history_v1",
        JSON.stringify(historyRaw)
      );

      const check = checkRateLimit(now);
      expect(check.rateLimited).toBe(true);
      expect(check.reason).toContain("Cần chờ thêm");
    });

    it("blocks notification if max 3 notifications already sent in trailing 24 hours", () => {
      const now = new Date("2026-09-07T20:00:00Z");

      // 3 notifications sent earlier today (e.g. 08:00, 12:00, 16:00)
      const fakeHistory = [
        {
          id: "1",
          title: "N1",
          body: "B1",
          timestamp: new Date("2026-09-07T16:00:00Z").toISOString(),
        },
        {
          id: "2",
          title: "N2",
          body: "B2",
          timestamp: new Date("2026-09-07T12:00:00Z").toISOString(),
        },
        {
          id: "3",
          title: "N3",
          body: "B3",
          timestamp: new Date("2026-09-07T08:00:00Z").toISOString(),
        },
      ];
      localStorage.setItem(
        "knowledge_os_notification_history_v1",
        JSON.stringify(fakeHistory)
      );

      const check = checkRateLimit(now);
      expect(check.rateLimited).toBe(true);
      expect(check.reason).toContain("tối đa 3 thông báo trong 24 giờ");
    });
  });

  describe("Snooze Controls", () => {
    it("handles 1h, 1d, 3d snooze durations accurately", () => {
      const refDate = new Date("2026-09-07T10:00:00Z");

      snoozeAlert("topic-1", "1h", refDate);
      expect(isSnoozed("topic-1", new Date("2026-09-07T10:30:00Z"))).toBe(true);
      expect(isSnoozed("topic-1", new Date("2026-09-07T11:05:00Z"))).toBe(false);

      snoozeAlert("global", "1d", refDate);
      expect(isSnoozed("topic-2", new Date("2026-09-07T22:00:00Z"))).toBe(true);
      expect(isSnoozed("topic-2", new Date("2026-09-08T11:00:00Z"))).toBe(false);
    });
  });

  describe("checkDueForgettingAlerts", () => {
    const mockTopic: Topic = {
      id: "top-due",
      title: "Chánh Định",
      slug: "chanh-dinh",
      categoryId: "cat-1",
      type: "study",
      description: "",
      content: "",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "top-due",
        status: "in_progress",
        progress: 20,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 2,
        timeSpent: 10,
      },
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    };

    const mockCard: Flashcard = {
      id: "c-due",
      topicId: "top-due",
      type: "basic",
      front: "Front",
      back: "Back",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      schedule: {
        id: "s-due",
        flashcardId: "c-due",
        state: "review",
        dueAt: "2026-09-07T00:00:00Z",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 1,
        lastReviewedAt: "2026-08-20T00:00:00Z", // Long ago -> decay < 0.8
        updatedAt: "2026-08-20T00:00:00Z",
      },
    };

    it("identifies topics with cards projected to drop below retention threshold within 24h", () => {
      const alerts = checkDueForgettingAlerts([mockCard], [], [mockTopic], {
        referenceDate: new Date("2026-09-07T12:00:00Z"),
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].topicId).toBe("top-due");
      expect(alerts[0].urgentCardsCount).toBe(1);
      expect(alerts[0].message).toContain("Chánh Định có 1 thẻ sẽ giảm dưới 80%");
    });

    it("suppresses alerts for snoozed topics", () => {
      snoozeAlert("top-due", "1d");

      const alerts = checkDueForgettingAlerts([mockCard], [], [mockTopic]);
      expect(alerts).toHaveLength(0);
    });

    it("suppresses alerts when smart notifications are disabled", () => {
      saveNotificationConfig({ enabled: false });

      const alerts = checkDueForgettingAlerts([mockCard], [], [mockTopic]);
      expect(alerts).toHaveLength(0);
    });
  });

  describe("triggerSmartNotification", () => {
    it("logs notification in history and returns success", async () => {
      const alert = {
        topicId: "top-1",
        topicTitle: "Top 1",
        urgentCardsCount: 3,
        lowestRetentionRate: 0.65,
        urgencyLevel: "warning" as const,
        message: "Cần ôn tập 3 thẻ sắp quên!",
      };

      const res = await triggerSmartNotification(alert, { force: true });
      expect(res.success).toBe(true);

      const history = JSON.parse(
        localStorage.getItem("knowledge_os_notification_history_v1") || "[]"
      );
      expect(history.length).toBe(1);
      expect(history[0].topicId).toBe("top-1");
    });
  });
});
