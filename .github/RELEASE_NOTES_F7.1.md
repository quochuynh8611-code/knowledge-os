# 🚀 Release Notes — Phase F7.1: AI-Powered Insights & Predictive Analytics

**Version**: `v0.14.0`  
**Date**: 2026-09-07  
**Branch**: `neh1`  
**Tests**: 63/63 PASS (100% Phase F7.1 suites)  
**TypeScript**: 0 errors (`npx tsc --noEmit`)

---

## 🌟 Overview

Phase F7.1 introduces **AI-Powered Insights & Predictive Analytics** into Knowledge OS, transforming reactive review queues into proactive, intelligent learning experiences. The system now forecasts when you will forget specific knowledge, recommends high-impact topics based on your available study time, uncovers your cognitive peak hours, and provides polite browser notifications before knowledge fades.

---

## 🎯 What's New

### 1. 📉 Retention Predictions & Forgetting Curve Forecasting
- **Exponential Decay Memory Model**: Computes recall probability $R(t) = e^{-t / S}$ across future horizons (1d, 3d, 7d, 14d, 30d).
- **Statistical Confidence Bands**: Computes 80% and 95% confidence intervals from empirical review variance ($Z_{80} = 1.282$, $Z_{95} = 1.960$).
- **Optimal Next Review Date**: Accurately calculates the exact day when memory retention crosses below the target threshold (default 80%).
- **Model Calibration**: Implements `calibrateRetentionModel(reviews)` to optimize decay rates against actual review outcomes.
- **Interactive SVG Forgetting Curve (`RetentionPredictionChart.tsx`)**:
  - Continuous decay curve with shaded 80% and 95% confidence intervals.
  - Dashed 80% target threshold benchmark line.
  - Optimal review date marker indicator.
  - Hover tooltip with exact day, projected retention %, and confidence intervals.
  - Quick horizon pill summary (1d, 3d, 7d, 14d, 30d).

### 2. 🎯 Multi-Criteria Study Recommendations (`TopicRecommendations.tsx`)
- **Composite Utility Scoring**:
  - Urgency (40%): Ratio of due and overdue cards.
  - Weak Retention (35%): Frequency of lapses and empirical retention below 80%.
  - Exam/Goal Proximity (15%): Escalates priority as exam dates approach.
  - Time Budget Fit (10%): Matches topic review load to selected time duration.
- **Explainable AI Rationales**: Generates clear, human-readable explanations (e.g. *"Có 14 thẻ đến hạn ôn • Tỷ lệ nhớ 68% (dưới chuẩn 80%, cần củng cố) • Thời lượng ước tính ~12 phút (khớp phiên 15m)"*).
- **Time-Budget Filtering**: Toggle between 15 phút (~30 thẻ), 30 phút (~60 thẻ), and 60 phút (~120 thẻ) sessions.
- **Anti-Fatigue Diversity**: Applies a 0.8x recency dampener to topics reviewed in the preceding session to encourage healthy topic rotation.
- **Hero "Next Best Topic" Card**: Prominently highlights the highest priority subject with a one-click *"Bắt đầu ôn tập"* CTA button.

### 3. ⏰ Circadian Study Pattern Detection & Heatmap (`StudyPatternsHeatmap.tsx`)
- **24-Hour × 7-Day Matrix**: Aggregates all historical flashcard reviews across weekdays (T2–CN) and hourly slots (0h–23h).
- **Color-Coded Heatmap**: Cell intensity maps retention health (< 70% amber, 70%–85% indigo, > 85% emerald).
- **Cognitive Peak Window Detection**: Identifies the hour of day with highest retention rate ($\ge 5$ reviews threshold) and displays a *"Khung giờ vàng: 09:00 - 10:00 (+15% retention vs baseline)"* badge.
- **Interactive Tooltip**: Hovering over any cell displays total reviews, retention rate, and average review duration.
- **Graceful Insufficient Data Notice**: Explains progress until 10 reviews are accumulated across time slots.

### 4. 🔔 Smart Notifications & Rate Limiting (`NotificationSettingsModal.tsx`)
- **Browser Web Notification API**: Seamless integration with `Notification.requestPermission()`.
- **Proactive Forgetting Alerts**: Scans cards and triggers warnings when cards are predicted to drop below 80% retention within 24 hours.
- **Anti-Spam Rate Limiting**:
  - Maximum 3 notifications per 24 hours.
  - Minimum 2 hours between notifications.
- **Snooze Support**: Quick snooze buttons for 1 hour, 1 day, or 3 days.
- **Settings Modal Dialog**: Configure alert threshold (60%–90%), toggle notifications, send test notification, and view recent notification history.
- **In-App Fallback**: Automatically falls back to header badge alerts if browser notification permissions are blocked or denied.

### 5. 🧩 TopicDashboard Integration
- Added *"Thông báo"* button with real-time pending alert counter badge in the dashboard header.
- Added dedicated **"Phân Tích Thông Minh & Dự Báo (AI-Powered Insights)"** section.
- Card selector dropdown to inspect individual card forgetting curves or topic-level forecasts.

---

## 🛡️ Technical Architecture & Standards

- **Zero Database Schema Migrations**: 100% computed client-side at runtime on existing `Flashcard`, `FlashcardReview`, and `Topic` tables.
- **Zero Heavy External ML Bloat**: Pure TypeScript mathematical formulations of exponential decay and normal distributions; sub-10ms execution time.
- **Pure React SVG Visualizations**: Native vector graphics responsive to light and dark themes with zero charting dependencies.
- **Privacy First**: All cognitive analytics and notification scheduling run locally in the browser.

---

## 🧪 Verification & Test Results

- **Unit Tests (F7.1 Engine & Components)**: 59/59 PASS (100%)
- **Integration Tests (F7.1 Dashboard Integration)**: 4/4 PASS (100%)
- **TypeScript Verification**: `npx tsc --noEmit` exited with 0 errors.
- **Full Regression**: All 291 active test suites pass cleanly.

---

## 📦 Delivered Files

- `src/lib/retentionPredictionEngine.ts` (new)
- `src/lib/studyRecommendationEngine.ts` (new)
- `src/lib/studyPatternEngine.ts` (new)
- `src/lib/smartNotificationService.ts` (new)
- `src/components/research/RetentionPredictionChart.tsx` (new)
- `src/components/research/TopicRecommendations.tsx` (new)
- `src/components/research/StudyPatternsHeatmap.tsx` (new)
- `src/components/research/NotificationSettingsModal.tsx` (new)
- `src/components/research/TopicDashboard.tsx` (modified)
- `src/components/research/index.ts` (modified)
- `docs/specs/phase-f7-1-ai-powered-insights.md` (new)
- `docs/adr/f7.1-ai-powered-insights.md` (new)
- `docs/implementation-plans/f7.1-ai-powered-insights.md` (new)
- `tests/unit/retention-prediction-engine.test.ts` (new)
- `tests/unit/retention-prediction-chart.test.tsx` (new)
- `tests/unit/study-recommendation-engine.test.ts` (new)
- `tests/unit/topic-recommendations-component.test.tsx` (new)
- `tests/unit/study-patterns.test.tsx` (new)
- `tests/unit/smart-notifications.test.ts` (new)
- `tests/unit/notification-settings-modal.test.tsx` (new)
- `tests/integration/f7.1-insights-integration.test.tsx` (new)
