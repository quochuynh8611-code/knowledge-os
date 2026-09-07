# 🚀 Release Notes — Phase F7.0: Research Dashboard (Multi-Domain)

**Version**: `v0.13.0`  
**Date**: 2026-09-07  
**Branch**: `neh1`  
**Tests**: 224/224 PASS (100%)  
**TypeScript**: 0 errors

---

## 🌟 Overview

Phase F7.0 delivers the **Research Dashboard (Multi-Domain Knowledge Aggregator)** into Knowledge OS, consolidating Notes, Flashcards, Source Resources, and Spaced Repetition Learning Progress into an integrated study hub for each topic.

---

## 🎯 What's New

### 1. 📊 Topic Dashboard & KPI Aggregator
- **6 KPI Summary Cards**:
  - Ghi Chú: Total notes count.
  - Flashcards: Total cards, active vs due cards.
  - Tài Liệu: Total source resources.
  - Tỷ Lệ Nhớ: Realized retention rate (%) based on review history.
  - Chuỗi Học: Daily review streak count.
  - Thời Gian: Total accumulated study time in minutes/hours.
- **Interactive SVG Retention Trend Chart**:
  - 0% to 100% Y-axis with target 80% reference watermark line.
  - Smooth line chart with purple gradient filled under the curve.
  - Time range selector: 7 ngày, 30 ngày, 90 ngày, Tất cả.
  - Hover tooltips showing exact date, retention rate, and successful recall count.
- **Recent Research Activities**:
  - List of the 10 most recent creations and review events with domain-specific badges and relative timestamps.

### 2. ⏳ Cross-Domain Research Timeline
- Consolidated event stream combining notes (`NOTE_CREATED`, `NOTE_UPDATED`), flashcards (`FLASHCARD_CREATED`), reviews (`REVIEW_COMPLETED`), and resources (`RESOURCE_ADDED`).
- Grouped into relative date buckets: `Hôm nay`, `Hôm qua`, `Tuần này`, `Tháng này`, `Cũ hơn`.
- Full filtering support: search term query and type filter chips (`Tất cả`, `Ghi chú`, `Flashcards`, `Ôn tập`, `Tài liệu`).
- Interactive click-to-preview event modal displaying snippet content and direct navigation.

### 3. 🔍 Cross-Domain Full-Text Search (BM25 Engine)
- In-memory **Okapi BM25 Ranking Algorithm** ($k_1 = 1.2, b = 0.75$) with length normalization and IDF scoring.
- **Multi-lingual Accent Normalization**: Seamlessly normalizes Vietnamese diacritics and Pāli/Sanskrit IAST characters (`normalizeScholarText`). For example, query "satipatthana" accurately matches "Satipaṭṭhāna" and "Mahāsatipaṭṭhāna".
- Keyword match highlighting with `<mark>` tags in titles and snippet context windows.
- Filter by entity type: Notes, Flashcards, Resources, or All.
- Global keyboard shortcut: `Ctrl+Shift+F` / `Cmd+Shift+F`.

### 4. 📄 Export Research Report
- Synthesizes comprehensive Markdown reports with YAML frontmatter.
- Includes overview statistics table, note excerpts, flashcards SRS state table, source resources, and timeline milestones.
- Live Markdown preview and customizable section checkboxes.
- One-click `.md` download with **UTF-8 BOM** (`\uFEFF`) for flawless Vietnamese character display on all platforms.
- Native Print / PDF export and Copy to Clipboard support.

### 5. 🧩 TopicDetail Integration
- Added dedicated **"Nghiên cứu"** tab in `TopicDetail.tsx`.
- Deep-link support via `navigation.subView === "research"`.

---

## 🛡️ Technical Architecture & Standards

- **Zero Database Schema Migrations**: All metrics, timeline streams, and BM25 indexes are calculated purely at runtime.
- **Zero Heavy External Libraries**: Lightweight React SVG rendering and pure TypeScript BM25 search.
- **Defensive Collections**: Robust `Array.isArray` fallback handling on all external API responses.

---

## 🧪 Verification & Test Results

- **Unit Tests**:
  - `tests/unit/research-aggregation-service.test.ts`: 5/5 PASS
  - `tests/unit/topic-dashboard.test.tsx`: 4/4 PASS
  - `tests/unit/research-timeline.test.tsx`: 7/7 PASS
  - `tests/unit/research-search-engine.test.tsx`: 7/7 PASS
  - `tests/unit/research-report-generator.test.tsx`: 5/5 PASS
- **Integration Tests**:
  - `tests/integration/research-dashboard-integration.test.tsx`: 3/3 PASS
  - `tests/unit/topic-detail-flashcards.test.tsx`: 5/5 PASS
  - `tests/integration/srs-tuning-integration.test.tsx`: 3/3 PASS
- **TypeScript Typecheck**: `npx tsc --noEmit` -> 0 errors.
