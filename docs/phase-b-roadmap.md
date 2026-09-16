# Phase B: Pilot Workspaces Implementation Roadmap

- **Workspaces in Scope**: Dashboard (`src/components/dashboard/*`) & Topics (`src/components/topics/*`)
- **Archetypes**: 
  - **Overview Archetype**: `DashboardHome.tsx`, `TodayLearningHero.tsx`, `WeeklyCadenceBar.tsx`, `LearningStateCard.tsx`, `ResumeStudyQueue.tsx`
  - **Explorer Archetype**: `TopicTree.tsx`
  - **Workbench Archetype**: `TopicDetail.tsx`, `ResearchToolsDropdown.tsx`, `StudyCTA.tsx`, `NextActionStrip.tsx`

---

## 1. Chi Tiết Các File Sửa & Components Áp Dụng

| File | Thành phần Workbench Áp Dụng | Invariants & Test Selectors Phải Giữ |
| :--- | :--- | :--- |
| **`TodayLearningHero.tsx`** | `SurfaceCard`, `StatusPill`, `ToolbarButton` | `data-testid="today-learning-hero"`, logic phân hạng tier (`review_due`, `in_progress`, `next_step`, `fallback`), các actions `onStartStudy`, `onOpenReviewModal`, `openTopicDetail` |
| **`WeeklyCadenceBar.tsx`** | `SurfaceCard`, micro-pills tokens | `data-testid="weekly-cadence-bar"`, `data-testid="cadence-active-badge"`, `data-testid="cadence-day-${dayLabel}"`, `data-testid="activity-dot-${dayLabel}"`, các thuộc tính `data-active`, `data-today`, `data-future` |
| **`LearningStateCard.tsx`** | `SurfaceCard`, `StatusPill`, `ToolbarButton` | `data-testid="learning-state-card-${rootCategory.id}"`, `data-testid="focus-badge-${rootCategory.id}"`, `data-testid="pin-btn-${rootCategory.id}"`, `onToggleFocus`, `onStartStudyTopic` |
| **`ResumeStudyQueue.tsx`** | `WorkbenchPanel`, `SurfaceCard`, `StatusPill` | `data-testid="resume-study-queue"`, danh sách topic dở dang, nút "Học tiếp" và "Tất cả tiến độ" |
| **`DashboardHome.tsx`** | `SectionHeader`, `SurfaceCard`, `WorkbenchPanel` | Khối Hero, Weekly Cadence, Flashcard Widget, Lĩnh vực nghiên cứu, Resume Study Queue, Recent Notes & Resources, Utility footer section |
| **`TopicTree.tsx`** | `PageHeader`, `FilterBar`, `SurfaceCard`, `StatusPill`, `ToolbarButton` | `data-testid="delete-category-${cat.id}"`, safe-merge logic kinh tế (`FIXED_ECONOMY_MERGE_TARGET_ID`), expand/collapse all, filter search/status/visibility/category/tag |
| **`TopicDetail.tsx`** | `PageHeader`, `Breadcrumbs`, `StatusPill`, `ToolbarButton`, `WorkbenchPanel`, `SurfaceCard` | Sub-tab routing (`content`, `notes`, `resources`, `flashcards`, `links`, `research`), sub-views (`card_browser`, `study_launcher`, `analytics`, `duplicates`), `ResearchToolsDropdown`, `StudyCTA`, `NextActionStrip`, `data-testid="study-cta-btn"`, `data-testid="research-tools-menu-trigger"`, `data-testid="next-action-strip"` |

---

## 2. Quy Trình Thực Thi
1. Refactor các sub-components Dashboard: `TodayLearningHero.tsx`, `WeeklyCadenceBar.tsx`, `LearningStateCard.tsx`, `ResumeStudyQueue.tsx`.
2. Refactor `DashboardHome.tsx`.
3. Refactor `TopicTree.tsx`.
4. Refactor `TopicDetail.tsx`.
5. Chạy TypeScript typecheck và Vitest suites (bao gồm topic dashboard, flashcards, taxonomy merge safety, learning session flows).
