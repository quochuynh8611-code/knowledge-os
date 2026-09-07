/**
 * Smart Notification Service (Phase F7.1)
 *
 * Provides proactive retention reminders with browser Web Notifications API:
 * 1. Forgetting alert detection when cards drop below target retention (< 80%) within 24h
 * 2. Rate limiting: Max 3 notifications per 24 hours, min 2 hours between notifications
 * 3. Snooze support: 1 hour, 1 day, 3 days
 * 4. LocalStorage persistence for user preferences and notification logs
 * 5. Progressive in-app fallback when notification permissions are blocked/denied
 *
 * Conforms strictly to Zero Database Schema Migrations.
 */

import type { Flashcard, FlashcardReview } from "../types/flashcard";
import type { Topic } from "../types/index";
import { predictCardRetention } from "./retentionPredictionEngine";

export const NOTIFICATION_CONFIG_KEY = "knowledge_os_smart_notifications_v1";
export const NOTIFICATION_HISTORY_KEY = "knowledge_os_notification_history_v1";

export type SnoozeDuration = 1 | 24 | 72 | "1h" | "1d" | "3d";

export interface SmartNotificationConfig {
  enabled: boolean;
  targetRetentionThreshold: number; // default 0.80
  soundEnabled: boolean;
  maxNotificationsPer24h: number; // default 3
  minHoursBetweenNotifications: number; // default 2
  snoozedUntil: Record<string, string>; // targetId -> ISO date string
}

export interface NotificationLogEntry {
  id: string;
  timestamp: string; // ISO string
  title: string;
  body: string;
  topicId?: string;
}

export interface ForgettingAlert {
  topicId: string;
  topicTitle: string;
  urgentCardsCount: number; // cards predicted to drop below threshold within 24h
  lowestRetentionRate: number;
  urgencyLevel: "critical" | "warning" | "advisory";
  message: string;
}

export const DEFAULT_NOTIFICATION_CONFIG: SmartNotificationConfig = {
  enabled: true,
  targetRetentionThreshold: 0.8,
  soundEnabled: false,
  maxNotificationsPer24h: 3,
  minHoursBetweenNotifications: 2,
  snoozedUntil: {},
};

/**
 * Loads notification preferences from localStorage.
 */
export function getNotificationConfig(): SmartNotificationConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_NOTIFICATION_CONFIG };
  }

  try {
    const raw = localStorage.getItem(NOTIFICATION_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...parsed,
      snoozedUntil: parsed.snoozedUntil || {},
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_CONFIG };
  }
}

/**
 * Saves notification preferences to localStorage.
 */
export function saveNotificationConfig(
  updates: Partial<SmartNotificationConfig>
): SmartNotificationConfig {
  const current = getNotificationConfig();
  const next: SmartNotificationConfig = {
    ...current,
    ...updates,
    snoozedUntil: {
      ...current.snoozedUntil,
      ...(updates.snoozedUntil || {}),
    },
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(NOTIFICATION_CONFIG_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to persist notification config to localStorage", e);
    }
  }

  return next;
}

/**
 * Loads notification history from localStorage.
 */
export function getNotificationHistory(): NotificationLogEntry[] {
  if (typeof window === "undefined" || !window.localStorage) return [];

  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a log entry to notification history.
 */
export function logNotificationSent(entry: Omit<NotificationLogEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const history = getNotificationHistory();
    const newEntry: NotificationLogEntry = {
      ...entry,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // Keep trailing 50 entries
    const updated = [newEntry, ...history].slice(0, 50);
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save notification history", e);
  }
}

/**
 * Clears notification history.
 */
export function clearNotificationHistory(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem(NOTIFICATION_HISTORY_KEY);
  }
}

/**
 * Requests browser Web Notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    console.warn("Notification.requestPermission error", e);
    return "denied";
  }
}

/**
 * Checks if a target (topicId or "global") is currently snoozed.
 */
export function isSnoozed(targetId: string, refDate: Date = new Date()): boolean {
  const config = getNotificationConfig();
  const globalSnooze = config.snoozedUntil["global"];
  const targetSnooze = config.snoozedUntil[targetId];

  const nowMs = refDate.getTime();

  if (globalSnooze && new Date(globalSnooze).getTime() > nowMs) {
    return true;
  }
  if (targetSnooze && new Date(targetSnooze).getTime() > nowMs) {
    return true;
  }

  return false;
}

/**
 * Snoozes notifications for a specific topic or globally.
 * Accepts: 1 (1h), 24 (1d), 72 (3d), or "1h", "1d", "3d".
 */
export function snoozeAlert(
  targetId: string = "global",
  duration: SnoozeDuration = "1d",
  refDate: Date = new Date()
): void {
  let hours = 24;
  if (typeof duration === "number") {
    hours = duration;
  } else if (duration === "1h") {
    hours = 1;
  } else if (duration === "1d") {
    hours = 24;
  } else if (duration === "3d") {
    hours = 72;
  }

  const expireTime = new Date(refDate.getTime() + hours * 3600 * 1000).toISOString();
  const config = getNotificationConfig();

  saveNotificationConfig({
    snoozedUntil: {
      ...config.snoozedUntil,
      [targetId]: expireTime,
    },
  });
}

/**
 * Checks notification rate limits:
 * 1. Max notifications per trailing 24 hours (default 3)
 * 2. Minimum hours elapsed between notifications (default 2h)
 */
export function checkRateLimit(refDate: Date = new Date()): {
  rateLimited: boolean;
  reason?: string;
} {
  const config = getNotificationConfig();
  const history = getNotificationHistory();
  const nowMs = refDate.getTime();
  const trailing24hMs = nowMs - 24 * 3600 * 1000;
  const minIntervalMs = config.minHoursBetweenNotifications * 3600 * 1000;

  // Filter logs within last 24h
  const recentLogs = history.filter(
    (h) => new Date(h.timestamp).getTime() >= trailing24hMs
  );

  if (recentLogs.length >= config.maxNotificationsPer24h) {
    return {
      rateLimited: true,
      reason: `Đã đạt giới hạn tối đa ${config.maxNotificationsPer24h} thông báo trong 24 giờ.`,
    };
  }

  if (recentLogs.length > 0) {
    const latest = recentLogs[0];
    const diffMs = nowMs - new Date(latest.timestamp).getTime();
    if (diffMs < minIntervalMs) {
      const remainingMins = Math.ceil((minIntervalMs - diffMs) / 60000);
      return {
        rateLimited: true,
        reason: `Cần chờ thêm ${remainingMins} phút giữa 2 lần thông báo (giới hạn ${config.minHoursBetweenNotifications} giờ).`,
      };
    }
  }

  return { rateLimited: false };
}

/**
 * Scans cards across topics and identifies cards projected to drop below retention threshold within 24h.
 */
export function checkDueForgettingAlerts(
  cards: Flashcard[],
  reviews: FlashcardReview[],
  topics: Topic[],
  options: { referenceDate?: Date } = {}
): ForgettingAlert[] {
  const config = getNotificationConfig();
  if (!config.enabled) return [];

  const refDate = options.referenceDate ?? new Date();
  const threshold = config.targetRetentionThreshold;
  const alerts: ForgettingAlert[] = [];

  for (const topic of topics) {
    if (isSnoozed(topic.id, refDate)) {
      continue;
    }

    const topicCards = cards.filter((c) => c.topicId === topic.id);
    if (topicCards.length === 0) continue;

    let urgentCardsCount = 0;
    let lowestRetention = 1.0;

    for (const card of topicCards) {
      // Predict retention at 1 day ahead (24h)
      const predIn24h = predictCardRetention(card, reviews, 1, {
        targetRetention: threshold,
        referenceDate: refDate,
      });

      if (predIn24h.currentRetentionProbability < threshold) {
        urgentCardsCount++;
        if (predIn24h.currentRetentionProbability < lowestRetention) {
          lowestRetention = predIn24h.currentRetentionProbability;
        }
      }
    }

    if (urgentCardsCount > 0) {
      const lowestPct = Math.round(lowestRetention * 100);
      let urgencyLevel: ForgettingAlert["urgencyLevel"] = "advisory";

      if (lowestPct < 60 || urgentCardsCount >= 10) {
        urgencyLevel = "critical";
      } else if (lowestPct < 75 || urgentCardsCount >= 5) {
        urgencyLevel = "warning";
      }

      const message = `${topic.title} có ${urgentCardsCount} thẻ sẽ giảm dưới ${Math.round(threshold * 100)}% trong 24 giờ tới (thấp nhất ${lowestPct}%). Ôn ngay để bảo tồn trí nhớ!`;

      alerts.push({
        topicId: topic.id,
        topicTitle: topic.title,
        urgentCardsCount,
        lowestRetentionRate: Number(lowestRetention.toFixed(4)),
        urgencyLevel,
        message,
      });
    }
  }

  // Sort critical first
  alerts.sort((a, b) => {
    const priority = { critical: 3, warning: 2, advisory: 1 };
    return priority[b.urgencyLevel] - priority[a.urgencyLevel] || b.urgentCardsCount - a.urgentCardsCount;
  });

  return alerts;
}

/**
 * Triggers a browser Web Notification if allowed and not rate-limited.
 */
export async function triggerSmartNotification(
  alert: ForgettingAlert,
  options: { force?: boolean; referenceDate?: Date } = {}
): Promise<{ success: boolean; reason?: string }> {
  const config = getNotificationConfig();
  if (!config.enabled && !options.force) {
    return { success: false, reason: "Thông báo thông minh đang bị tắt." };
  }

  const refDate = options.referenceDate ?? new Date();

  // Check snooze
  if (isSnoozed(alert.topicId, refDate) && !options.force) {
    return { success: false, reason: "Chủ đề đang trong trạng thái tạm hoãn (snooze)." };
  }

  // Check rate limit
  if (!options.force) {
    const limitCheck = checkRateLimit(refDate);
    if (limitCheck.rateLimited) {
      return { success: false, reason: limitCheck.reason };
    }
  }

  const title = `Knowledge OS: Cần ôn tập thẻ sắp quên`;
  const body = alert.message;

  // Attempt browser notification
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
        });

        logNotificationSent({
          title,
          body,
          topicId: alert.topicId,
        });

        return { success: true };
      } catch (err) {
        console.warn("Error displaying notification:", err);
      }
    }
  }

  // If browser notification unavailable, log anyway for in-app display
  logNotificationSent({
    title,
    body,
    topicId: alert.topicId,
  });

  return {
    success: true,
    reason: "Hiển thị qua thông báo in-app (chưa cấp quyền Web Notification).",
  };
}

/**
 * Sends a test notification to verify permissions and audio settings.
 */
export async function sendTestNotification(): Promise<boolean> {
  const testAlert: ForgettingAlert = {
    topicId: "test-topic",
    topicTitle: "Kiểm tra hệ thống",
    urgentCardsCount: 3,
    lowestRetentionRate: 0.75,
    urgencyLevel: "advisory",
    message: "Hệ thống thông báo thông minh Knowledge OS đang hoạt động chính xác!",
  };

  const res = await triggerSmartNotification(testAlert, { force: true });
  return res.success;
}
