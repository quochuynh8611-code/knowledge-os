# Báo Cáo Triển Khai Remediation Dashboard Home

**Ngày thực hiện**: 16/09/2026  
**Trạng thái**: Hoàn tất 100% (Green Gate)  
**Phạm vi**: Đồng bộ Dashboard Home (`DashboardHome.tsx` + 5 child components) theo chuẩn **Overview Archetype** của Design System V2 (Professional Research Workbench).

---

## 1. Mục Tiêu & Kết Quả Đạt Được

### 1.1. Giải quyết triệt để Legacy Visuals
1. **Loại bỏ hộp đen cồng kềnh trong Light Mode (`TodayLearningHero.tsx`)**:
   - Hero banner chuyển sang nền thích ứng theo theme: `bg-linear-to-br from-amber-500/10 via-stone-50 to-stone-100/60` trong light mode và `dark:from-stone-900/90 dark:via-stone-900 dark:to-stone-950` trong dark mode.
   - Viền `border-amber-400/30 dark:border-stone-800` sắc nét, typography sử dụng Newsreader Serif cho tiêu đề và font sans cho nội dung đề xuất.
2. **Loại bỏ bong bóng phồng `rounded-3xl` (`FlashcardAnalyticsWidget.tsx`)**:
   - Chuyển toàn bộ widget sang `rounded-2xl` tiêu chuẩn.
   - Rút gọn padding, căn chỉnh lưới KPI với số liệu `font-mono tabular-nums`.
3. **Chuẩn hóa Hierarchy với PageHeader & SectionHeader (`DashboardHome.tsx`)**:
   - Tích hợp `PageHeader` chuẩn có breadcrumb context `Research Hub & Learning Overview`, icon `Compass`, và 2 CTA hành động nhanh (`ToolbarButton`).
   - Tích hợp `SectionHeader` cho phân khu *Lĩnh vực học tập* với counter badge và CTA *Thêm lĩnh vực*.
4. **Chuẩn hóa Card & Queue Presentation (`LearningStateCard.tsx`, `ResumeStudyQueue.tsx`, `WeeklyCadenceBar.tsx`)**:
   - Tiêu đề lĩnh vực áp dụng `font-serif-title`.
   - Tiến độ học tập dạng thanh mảnh với màu sắc ngữ nghĩa (Emerald cho Active, Amber cho Maintenance).
   - Utility section chân trang thu gọn thành clean secondary card.

---

## 2. Danh Sách 6 File Đã Sửa (Strict Scope)

| STT | File | Thay đổi chính |
|---|---|---|
| 1 | `src/components/dashboard/DashboardHome.tsx` | Tích hợp `<PageHeader>`, `<SectionHeader>`, chuẩn hóa layout spacing, thu gọn Utility section. |
| 2 | `src/components/dashboard/TodayLearningHero.tsx` | Chuyển sang adaptive background (sáng sủa ở light mode, sâu sắc ở dark mode), Newsreader serif title, amber token CTA. |
| 3 | `src/components/flashcards/FlashcardAnalyticsWidget.tsx` | Loại bỏ `rounded-3xl` và padding phồng, chuyển sang `rounded-2xl`, lưới KPI mono tabular, viền sắc nét. |
| 4 | `src/components/dashboard/WeeklyCadenceBar.tsx` | Chuẩn hóa `rounded-2xl`, viền mỏng, chip 7 ngày đồng bộ nhịp độ học tập. |
| 5 | `src/components/dashboard/LearningStateCard.tsx` | Tiêu đề môn học `font-serif-title`, viền tương tác hover mượt mà, layout next-step gọn gàng. |
| 6 | `src/components/dashboard/ResumeStudyQueue.tsx` | Bọc chuẩn Workbench, thẻ bài học dở dang với tiến độ emerald, action buttons đồng bộ. |

---

## 3. Bảo Toàn Hợp Đồng & Bất Biến (100% Invariant Compliance)

- **DataContext contracts**: 100% giữ nguyên (`topics`, `categories`, `notes`, `resources`, `focusDomainId`, `setFocusDomainId`, `openTopicDetail`, `setActiveTab`, `setSelectedCategoryFilter`, `addCategory`).
- **Routing & Tab switches**: Giữ nguyên (`topics`, `progress`, `ai_studio`, `library`, `graph`).
- **Keyboard shortcuts & modal flows**: Giữ nguyên `SpacedReviewModal`, `StudyTimerModal`.
- **Business Logic & Selectors**: Giữ nguyên `getDomainLearningStates`, `getWeeklyLearningCadence`, `sortDomainLearningStates`, `getResumeQueue`.
- **Test selectors (`data-testid`)**: Giữ nguyên toàn bộ (`today-learning-hero`, `weekly-cadence-bar`, `cadence-active-badge`, `cadence-day-*`, `activity-dot-*`, `learning-state-card-*`, `focus-badge-*`, `pin-btn-*`, `resume-study-queue`, `stat-*`).

---

## 4. Kết Quả Kiểm Thử (Verification & Quality Gate)

### 4.1. TypeScript Typecheck
```bash
npm run typecheck
# Output: Exit code 0 (No type errors)
```

### 4.2. Dashboard Specific Test Suites
```bash
npx vitest run \
  tests/unit/phase8a-domain-hub-dashboard.test.tsx \
  tests/unit/dashboard-root-domain-cards.test.tsx \
  tests/unit/today-learning-hero.test.tsx \
  tests/unit/weekly-cadence-bar.test.tsx \
  tests/unit/learning-state-card.test.tsx \
  tests/unit/resume-study-queue.test.tsx \
  tests/integration/flashcard-analytics-widget.test.tsx

# Kết quả: 7/7 test files passed (34/34 tests passed)
```

### 4.3. Full Vitest Suite (Toàn bộ workspace)
```bash
npx vitest run
# Kết quả: 294/294 test files passed, 2054/2057 tests passed, 3 skipped, 0 failed
```

---

## 5. Kết Luận
Dashboard Home hiện tại đã đạt độ hoàn thiện cao, thoát khỏi hoàn toàn diện mạo prototype/legacy, đồng bộ 100% với App Shell V2 và toàn bộ các workspace khác (Topics, Notes, Docs, Search, Study Suite, Knowledge Graph, AI Studio) theo đúng chuẩn **Professional Research Workbench**.
