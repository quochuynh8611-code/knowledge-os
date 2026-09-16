# Báo Cáo Phân Tích Khoảng Cách Giao Diện: DashboardHome & Child Components
**Knowledge OS — Professional Research Workbench Gap Analysis**

---

## 1. Hiện Trạng Thực Tế (Current State)

Khi người dùng truy cập `http://localhost:3000`, màn hình đầu tiên hiển thị là **DashboardHome** (`activeTab = 'dashboard'`). Mặc dù App Shell (Navbar V2, Sidebar V2) đã được nâng cấp, nội dung trung tâm của Dashboard vẫn tạo cảm giác **"vỏ mới nhưng ruột cũ"** vì các nguyên nhân sau:

1. **Thiếu vắng `PageHeader` chuẩn**:
   - Trong khi tất cả các workspace khác (Notes, Resources, Docs, Search, Flashcards, Study Progress, Graph, AI Studio) đều có tiêu đề trang `PageHeader` với font Newsreader học thuật, nhãn phân loại (categoryLabel) và thanh nút hành động nhanh, **`DashboardHome.tsx` hoàn toàn không import hay sử dụng `PageHeader`**.
2. **`TodayLearningHero` bị khóa cứng màu đen (Stark Dark Box)**:
   - Component này đang dùng cố định class `bg-stone-900 text-stone-100` bất kể người dùng đang ở chế độ **Light Mode** hay **Dark Mode**. Ở Light mode, một khối đen thô cứng xuất hiện ngay đầu trang phá vỡ toàn bộ cấu trúc thị giác của bảng điều khiển.
3. **`FlashcardAnalyticsWidget` mang tàn dư thiết kế cũ**:
   - Sử dụng bo góc quá lớn `rounded-3xl`, padding `p-6 md:p-8` phồng to, không đồng bộ với hệ thống token `rounded-2xl` / `rounded-xl` và `SurfaceCard` của Design Tokens V2.
4. **Không sử dụng Shared Workbench Components**:
   - `DashboardHome.tsx` không hề import bất kỳ linh kiện nào từ `src/components/workbench/` (`SurfaceCard`, `SectionHeader`, `StatusPill`, `ToolbarButton`, `EmptyState`). Toàn bộ các khối bên trong là các component tự phát triển từ các phase cũ với CSS chắp vá.
5. **Khối Utility Tools ở chân trang mang tính chất "Portal 2010s"**:
   - Khối "Công cụ & Tiện ích chuyên sâu" ở chân trang gồm 3 ô lớn (AI Hỗ trợ, Thư Viện Sách, Bản đồ tri thức) lặp lại chức năng của Sidebar, chiếm dụng không gian và làm loãng tính học thuật của một Research Workbench.

---

## 2. Trạng Thái Mong Đợi Theo Thiết Kế (Expected State theo Spec)

Căn cứ theo [**`docs/ui-upgrade-spec.md` (Mục 3.1: Overview Archetype)**](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/ui-upgrade-spec.md):

1. **Page Composition chuẩn Overview Archetype**:
   - **PageHeader**: `Tổng Quan Nghiên Cứu & Học Tập` (font `font-serif-title`), đi kèm nhãn ngữ cảnh `"Bàn Điều Khiển Trung Tâm"` và các nút hành động nhanh: `Học Nhanh (⌘1)`, `Ghi Chú Nhanh (⌘J)`, `Xem Thống Kê`.
   - **Khối 1 (Hero Action Strip)**: `TodayLearningHero` được chuyển đổi sang cơ chế theme linh hoạt:
     - *Light mode*: Nền đá thanh lịch `bg-stone-100/90 border border-stone-200/90 text-stone-900`, điểm nhấn màu hổ phách academic amber.
     - *Dark mode*: `bg-stone-900 border border-stone-800 text-stone-100`.
   - **Khối 2 (Cadence & Quick Metrics Bar)**: Tích hợp nhịp học tuần `WeeklyCadenceBar` và các chỉ số ghi nhớ Spaced Repetition tinh gọn dạng `SurfaceCard`.
   - **Khối 3 (Multi-Disciplinary Learning Hub)**: Tiêu đề phân khu `SectionHeader`, lưới thẻ `LearningStateCard` chuẩn hóa dùng `SurfaceCard`, `StatusPill` và font Newsreader cho tên môn học.
   - **Khối 4 (Actionable Queues)**: `ResumeStudyQueue` và `RecentNotesResources` phân chia 2 cột sắc nét với đường viền mỏng và micro-interactions mượt mà.

---

## 3. Bảng Kê Chi Tiết Các Điểm Lệch (Gap Matrix)

| Khu Vực / Component | Hiện Trạng (Current Legacy) | Yêu Cầu Chuẩn Hóa (Spec V2 Target) | Mức Độ Ảnh Hưởng Thị Giác |
| :--- | :--- | :--- | :--- |
| **Header Cấp Trang** | Không có `PageHeader`. Trang bắt đầu đột ngột bằng Hero box. | Tích hợp `PageHeader` với tiêu đề font Newsreader + Breadcrumb slot + Quick Actions. | **Rất Cao** (Gây cảm giác đứt gãy với các tab khác) |
| **`TodayLearningHero`** | Hardcoded `bg-stone-900` ở cả Light Mode; viền mờ; nút bấm dùng class màu chắp vá. | Hỗ trợ Light/Dark tự thích ứng; dùng `SurfaceCard`; nút bấm chuẩn workbench token. | **Rất Cao** (Khối to nhất trên màn hình) |
| **`FlashcardAnalyticsWidget`** | Dùng `rounded-3xl`, padding quá khổ `p-6 md:p-8`, layout chiếm diện tích dọc lớn. | Thu gọn thành hàng KPI 4 cột chuẩn `SurfaceCard`, bo góc `rounded-2xl`, typography mono cho số liệu. | **Cao** |
| **`WeeklyCadenceBar`** | Custom CSS, ring-1.5 ad-hoc, không dùng token workbench. | Đưa về chuẩn `SurfaceCard`, huy hiệu ngày `DayPill` dùng semantic tokens amber/stone. | **Trung bình** |
| **`LearningStateCard`** | Custom container, inline tag chưa dùng `StatusPill`, thanh tiến độ chưa mượt. | Dùng `SurfaceCard variant="interactive"`, `StatusPill`, font Newsreader cho tên môn học. | **Cao** |
| **`ResumeStudyQueue`** | Custom card layout, nút `Play` hardcoded nền đen. | Dùng `SurfaceCard`, nút `ToolbarButton size="sm"`, tiến độ thanh gọn. | **Trung bình** |
| **`Utility Section`** | 3 ô to chiếm chân trang như danh bạ liên kết. | Tái cấu trúc thành bảng tra cứu phụ (Secondary Context) hoặc tích hợp gọn gàng vào `PageHeader` / Sidebar. | **Trung bình** |

---

## 4. Danh Sách Các Component Con Bị Ảnh Hưởng (Affected Child Components)

1. [`src/components/dashboard/DashboardHome.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/DashboardHome.tsx) — Main orchestrator của tab Dashboard.
2. [`src/components/dashboard/TodayLearningHero.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/TodayLearningHero.tsx) — Khối hành động trọng tâm ngày.
3. [`src/components/dashboard/WeeklyCadenceBar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/WeeklyCadenceBar.tsx) — Thanh nhịp độ học tập 7 ngày.
4. [`src/components/dashboard/LearningStateCard.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/LearningStateCard.tsx) — Thẻ trạng thái từng môn học.
5. [`src/components/dashboard/ResumeStudyQueue.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/ResumeStudyQueue.tsx) — Danh sách bài học dở dang.
6. [`src/components/flashcards/FlashcardAnalyticsWidget.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/flashcards/FlashcardAnalyticsWidget.tsx) — Khung số liệu Spaced Repetition trên Dashboard.

---

## 5. Kế Hoạch Nâng Cấp Tinh Gọn (Low-Risk Implementation Roadmap)

Để nâng tầm giao diện Dashboard lên chuẩn **Professional Research Workbench** mà **KHÔNG gây rủi ro hồi quy (Zero Logic Regression)**:

### Bước 1: Nâng Cấp `DashboardHome.tsx` và Tích Hợp `PageHeader`
- Bổ sung `<PageHeader>` chuẩn ở đầu trang:
  - Title: `"Tổng Quan Nghiên Cứu"`
  - Subtitle: `"Nhịp độ học tập, bài học đề xuất và trạng thái tích lũy đa lĩnh vực"`
  - CategoryLabel: `"Research Hub & Learning Overview"`
  - Actions: Nút mở phiên học nhanh, nút xem tiến độ chi tiết.
- Sử dụng `<SectionHeader>` chuẩn cho phân khu `"Lĩnh vực học tập"` và `"Tiến độ ôn tập"`.

### Bước 2: Refactor `TodayLearningHero.tsx` Sang Adaptive Theme
- Thay thế nền đen cố định bằng cấu trúc thích ứng:
  - Light mode: `bg-white border-stone-200/90 text-stone-900 shadow-2xs`
  - Dark mode: `bg-stone-900/90 border-stone-800 text-stone-100`
- Giữ nguyên 100% `data-testid="today-learning-hero"` và các trigger action (`onStartStudy`, `onOpenReviewModal`).

### Bước 3: Chuẩn Hóa `FlashcardAnalyticsWidget.tsx` & `WeeklyCadenceBar.tsx`
- Đưa `rounded-3xl` về `rounded-2xl` chuẩn `SurfaceCard`.
- Chuẩn hóa các thẻ KPI đếm số (`stat-retention-rate`, `stat-total-cards`, `stat-due-today`) với font số `font-mono tabular-nums`.

### Bước 4: Chuẩn Hóa `LearningStateCard.tsx` & `ResumeStudyQueue.tsx`
- Bọc thẻ môn học bằng `<SurfaceCard variant="interactive">`.
- Thay các badge trạng thái bằng `<StatusPill>`.
- Bảo toàn toàn bộ `data-testid` (`learning-state-card-*`, `pin-btn-*`, `resume-study-queue`).

### Bước 5: Kiểm Thử & Nghiệm Thu Toàn Cục
- Chạy `npm run typecheck` và `npx vitest run tests/unit/dashboard-root-domain-cards.test.tsx tests/unit/today-learning-hero.test.tsx tests/unit/weekly-cadence-bar.test.tsx tests/unit/learning-state-card.test.tsx tests/unit/resume-study-queue.test.tsx`.
