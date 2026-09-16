# Kế Hoạch Triển Khai Nâng Cấp Giao Diện Dashboard Home (Remediation Roadmap)
**Knowledge OS — Professional Research Workbench Modernization**

---

## 1. Mục Tiêu & Bối Cảnh

- **Vấn đề**: Mặc dù Shell V2 đã hoàn tất, màn hình `DashboardHome` vẫn mang cảm giác cũ do thiếu `PageHeader`, `TodayLearningHero` bị hardcode nền đen ở Light Mode, `FlashcardAnalyticsWidget` dùng `rounded-3xl` phồng to và chưa áp dụng Shared Workbench Components.
- **Mục tiêu**: Refactor toàn diện tầng hiển thị của `DashboardHome` và 5 component con theo đúng chuẩn **Overview Archetype** trong [**`docs/ui-upgrade-spec.md`**](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/ui-upgrade-spec.md), bảo toàn 100% logic nghiệp vụ và test contracts.

---

## 2. Danh Sách Các File Sẽ Sửa Đổi (Target Files)

| STT | File Path | Vai Trò & Thay Đổi Dự Kiến |
| :--- | :--- | :--- |
| 1 | [`src/components/dashboard/DashboardHome.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/DashboardHome.tsx) | - Tích hợp `<PageHeader>` chuẩn workbench với tiêu đề Newsreader và các nút thao tác nhanh (Học nhanh, Ghi chú, Thống kê).<br>- Tích hợp `<SectionHeader>` phân đoạn rõ ràng cho 3 phân khu: Lĩnh vực nghiên cứu, Tiến độ ôn tập ngắt quãng, Hàng đợi bài học dở dang.<br>- Tinh gọn khối tiện ích phụ cuối trang thành secondary context thanh lịch. |
| 2 | [`src/components/dashboard/TodayLearningHero.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/TodayLearningHero.tsx) | - Loại bỏ hardcoded `bg-stone-900` ở Light Mode; chuyển sang adaptive surface (`bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs`).<br>- Nút bấm chuyển sang `ToolbarButton` / token button chuẩn hổ phách.<br>- Giữ nguyên 100% `data-testid="today-learning-hero"` và trigger flows. |
| 3 | [`src/components/dashboard/WeeklyCadenceBar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/WeeklyCadenceBar.tsx) | - Bọc trong `<SurfaceCard variant="default">` chuẩn bo góc `rounded-2xl`.<br>- Chuẩn hóa các viên ngày `DayPill` với semantic tokens, font mono số ngày và viền nét. |
| 4 | [`src/components/dashboard/LearningStateCard.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/LearningStateCard.tsx) | - Bọc trong `<SurfaceCard variant="interactive">`.<br>- Tên lĩnh vực dùng typography chuẩn, huy hiệu trạng thái dùng `<StatusPill>`.<br>- Hộp bài học kế tiếp (Next step box) dùng style tinh gọn, nút "Học bài này" đồng bộ token. |
| 5 | [`src/components/dashboard/ResumeStudyQueue.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/ResumeStudyQueue.tsx) | - Bọc trong `<SurfaceCard variant="default">`.<br>- Từng dòng chủ đề dở dang dùng viền phân cách mỏng, nút "Học tiếp" dùng `ToolbarButton` size sm.<br>- Thanh tiến độ màu ngọc lục bảo sắc nét `bg-emerald-600 dark:bg-emerald-500`. |
| 6 | [`src/components/flashcards/FlashcardAnalyticsWidget.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/flashcards/FlashcardAnalyticsWidget.tsx) | - Loại bỏ `rounded-3xl` và padding phồng `p-6 md:p-8`; bọc bằng `<SurfaceCard>`.<br>- Lưới 5 chỉ số KPI thiết kế dense & compact với font số `font-mono tabular-nums`.<br>- Giữ nguyên 100% `data-testid="stat-retention-rate"`, `stat-total-cards`, `stat-due-today`, v.v. |

---

## 3. Các Invariant Bắt Buộc Phải Bảo Toàn (Preserved Invariants)

1. **DataContext & Navigation**:
   - Không thay đổi các hàm `openTopicDetail`, `setActiveTab`, `setSelectedCategoryFilter`, `addCategory`, `setFocusDomainId`.
   - Giữ nguyên luồng mở modal ôn tập `SpacedReviewModal` và bấm giờ `StudyTimerModal`.
2. **Logic Trạng Thái Học Tập**:
   - Giữ nguyên các selector `getDomainLearningStates`, `getWeeklyLearningCadence`, `getTodayRecommendation`, `getResumeQueue`, `sortDomainLearningStates`.
3. **Phím Tắt Toàn Cục**:
   - Không can thiệp phím tắt bàn phím toàn cục `Cmd+K`, `Cmd+J`, `Cmd+G`, `Space`, `1-4`.
4. **Testing Selectors**:
   - Giữ nguyên 100% các `data-testid`:
     - `today-learning-hero`
     - `weekly-cadence-bar`, `cadence-active-badge`, `cadence-day-*`, `activity-dot-*`
     - `learning-state-card-*`, `focus-badge-*`, `pin-btn-*`
     - `resume-study-queue`
     - `stat-retention-rate`, `stat-total-cards`, `stat-due-today`

---

## 4. Kỳ Vọng Thị Giác Sau Khi Sửa Đổi (Visual & Design Expectations)

1. **Tổng thể**:
   - Khi vào trang chủ, người dùng thấy ngay một **Bàn Điều Khiển Nghiên Cứu Học Thuật (Professional Research Workbench)** đồng bộ với toàn bộ phần còn lại của ứng dụng.
2. **Chế độ Sáng (Light Mode)**:
   - Nền canvas `stone-50`, các card màu trắng tinh tế `bg-white` với viền sắc nét `border-stone-200/80` và đổ bóng vi mô `shadow-2xs`.
   - Hero box trên cùng sáng sủa, thanh lịch, làm nổi bật chủ đề học tập với điểm nhấn hổ phách `amber-700/800`.
3. **Chế độ Tối (Dark Mode)**:
   - Nền canvas `stone-950`, card nổi bật phân tầng `stone-900/90`, viền `stone-800`, chữ sắc nét `stone-100/300`.
4. **Mật độ thông tin (Information Density)**:
   - Các chỉ số KPI, nhịp tuần 7 ngày và danh sách bài học kế tiếp hiển thị cô đọng, dễ quét bằng mắt, không còn khoảng trống thừa thãi hay bo góc phồng to lệch chuẩn.

---

## 5. Quy Trình Thực Thi & Bộ Test Xác Minh (Execution & Test Plan)

### Kịch Bản Triển Khai Phân Cụm Nhỏ:
- **Cụm 1**: Refactor `TodayLearningHero.tsx` & `WeeklyCadenceBar.tsx`. Chạy kiểm thử:
  - `npx vitest run tests/unit/today-learning-hero.test.tsx tests/unit/weekly-cadence-bar.test.tsx`
- **Cụm 2**: Refactor `FlashcardAnalyticsWidget.tsx`. Chạy kiểm thử:
  - `npx vitest run tests/integration/flashcard-analytics-widget.test.tsx tests/unit/flashcard-analytics-dashboard.test.tsx`
- **Cụm 3**: Refactor `LearningStateCard.tsx` & `ResumeStudyQueue.tsx`. Chạy kiểm thử:
  - `npx vitest run tests/unit/learning-state-card.test.tsx tests/unit/resume-study-queue.test.tsx`
- **Cụm 4**: Nâng cấp `DashboardHome.tsx` tích hợp `PageHeader`, `SectionHeader`, layout mới và tinh gọn utility section. Chạy kiểm thử:
  - `npx vitest run tests/unit/dashboard-root-domain-cards.test.tsx tests/unit/domain-sorting-priority.test.tsx tests/unit/phase8a-domain-hub-dashboard.test.tsx tests/unit/phase15b-starter-topics-enrichment.test.tsx`
- **Cụm 5**: Chạy `npm run typecheck` và toàn bộ test suites của Dashboard.
- **Cụm 6**: Xuất báo cáo nghiệm thu [`docs/dashboard-home-remediation-report.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/dashboard-home-remediation-report.md).
