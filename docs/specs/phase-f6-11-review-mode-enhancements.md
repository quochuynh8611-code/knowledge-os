# Technical Specification: Phase F6.11 — Review Mode Enhancements
# (Nâng Cấp & Hoàn Thiện Trải Nghiệm Phòng Ôn Tập Flashcard)

**Ngày lập**: 2026-09-07  
**Giai đoạn**: Phase F6.11  
**Trạng thái**: Planning / In-Progress  
**Subsystem**: Native Flashcard & Spaced Repetition (Review Studio)  

---

## 1. TỔNG QUAN & BỐI CẢNH

Hệ thống Flashcard & Spaced Repetition của **Knowledge OS** hiện đã có nền tảng hoàn thiện:
- **Schema**: PostgreSQL (`Flashcard`, `FlashcardSchedule`, `FlashcardReview`) với Prisma 7 + `@prisma/adapter-pg`.
- **API**: 12 REST endpoints đầy đủ cho CRUD, Review theo thuật toán SM-2, Option A Idempotency (`clientEventId`), Progress stats, Duplicate detection.
- **UI Studio**: `FlashcardReviewStudio.tsx` đã hỗ trợ lật thẻ (Space), đánh giá (1–4), Active Recall, hỗ trợ `cramMode` và confetti celebration.
- **Note Integration (F6.10)**: Đã hoàn tất kết nối Note-to-Flashcard (Tag `v0.10.0`).

**Mục tiêu Phase F6.11**: Nâng cấp trải nghiệm phòng ôn tập (Review Studio) với:
1. Dashboard thống kê tổng quan trước/trong phiên học (`ReviewDashboardHeader.tsx`).
2. Bộ lọc hàng đợi linh hoạt (`?priority=due|new|low_retention`).
3. Chỉnh sửa thẻ nhanh trực tiếp trong lúc học không làm gián đoạn session (`Ctrl+E` / `Cmd+E`).
4. Tra cứu lịch sử thẻ và thông số SM-2 trực tiếp trong lúc học (`Ctrl+H` / `Cmd+H`).
5. Xuất kết quả phiên ôn tập ra định dạng CSV để lưu trữ và phân tích học thuật.

---

## 2. HIỆN TRẠNG HỆ THỐNG (DEEP DIVE FINDINGS)

### 2.1. Schema & Database
- **`model Flashcard`** ([`prisma/schema.prisma`](../../prisma/schema.prisma#L167-L186)):
  - Fields: `id`, `topicId`, `noteId`, `resourceId`, `type`, `front`, `back`, `lifecycleStatus`, `createdAt`, `updatedAt`.
  - Liên kết 1-1 với `FlashcardSchedule` và 1-N với `FlashcardReview`.
  - Ngày đến hạn `dueAt` và lần review cuối `lastReviewedAt` được lưu tách bạch trong bảng `FlashcardSchedule`.
- **`model FlashcardReview`** ([`prisma/schema.prisma`](../../prisma/schema.prisma#L204-L226)):
  - Lưu 100% lịch sử ôn tập: `clientEventId`, `flashcardId`, `topicId`, `rating` (1-4), `reviewDurationMs`, `reviewedAt`, `stateBefore/After`, `intervalBefore/After`, `easeFactorBefore/After`, `dueBefore/AfterAt`.
- **Database Location**: PostgreSQL, cấu hình qua `process.env.DATABASE_URL` trong `.env` (fallback: `postgresql://postgres:postgres@localhost:5432/knowledge_os?schema=public`).
- **Chính sách di trú**: **Zero Migration**. Không thay đổi schema database; tận dụng các quan hệ và trường dữ liệu đã có.

---

## 3. USER STORIES & ACCEPTANCE CRITERIA

### US1: Review Queue Dashboard Header (Ưu tiên cao)
- **User Story**: Là người học, tôi muốn xem dải thống kê tổng quan ngay phía trên Studio để nắm rõ số lượng thẻ cần ôn hôm nay, số thẻ mới, tỷ lệ retention và chuỗi ngày ôn liên tiếp.
- **Acceptance Criteria**:
  - [ ] Hiển thị `dueToday`: Số thẻ đến hạn hôm nay (`dueAt <= now`).
  - [ ] Hiển thị `newCards`: Số thẻ mới chưa học (`state == 'new'`).
  - [ ] Hiển thị `retentionRate`: Tỷ lệ ghi nhớ thành công (`rating >= 3`).
  - [ ] Hiển thị `streakDays`: Chuỗi ngày liên tiếp có thực hiện review (tính từ `FlashcardReview`).
  - [ ] Tách thành component độc lập: `src/components/flashcards/ReviewDashboardHeader.tsx`.
  - [ ] API `GET /api/flashcards/progress` trả về `streakDays`.

### US2: Review Queue Priority Filters (Ưu tiên cao)
- **User Story**: Là người học, tôi muốn lọc hàng đợi ôn tập theo mức độ ưu tiên để tập trung vào thẻ quan trọng hoặc các thẻ hay bị quên.
- **Acceptance Criteria**:
  - [ ] Endpoint `GET /api/flashcards/due` hỗ trợ query param `?priority=due|new|low_retention`.
  - [ ] `priority=due` (mặc định): Thẻ active có `dueAt <= now`.
  - [ ] `priority=new`: Thẻ active có `schedule.state == 'new'`.
  - [ ] `priority=low_retention`: Thẻ active có `retentionRate < 0.6` hoặc `lapses >= 2` hoặc `easeFactor <= 2.0`.
  - [ ] UI: Dropdown bộ lọc ngay trên `FlashcardReviewStudio.tsx` để chuyển đổi hàng đợi linh hoạt.

### US3: Quick Edit Trong Lúc Ôn Tập (Ưu tiên trung bình)
- **User Story**: Là người học, tôi muốn chỉnh sửa thẻ nhanh khi phát hiện lỗi chính tả hoặc muốn bổ sung nội dung mà không phải thoát phiên ôn tập.
- **Acceptance Criteria**:
  - [ ] Nút Edit (icon bút chì `Pencil`) trên `FlashcardCardView.tsx` với `e.stopPropagation()` chống lật thẻ nhầm.
  - [ ] Phím tắt toàn cục: `Ctrl+E` (Windows/Linux) hoặc `Cmd+E` (macOS).
  - [ ] Mở modal `FlashcardFormModal` với dữ liệu thẻ hiện tại.
  - [ ] Khi lưu thành công: gọi `PUT /api/flashcards/:id`, cập nhật state thẻ in-place trong queue và tiếp tục phiên học.

### US4: View History Trong Lúc Ôn Tập (Ưu tiên trung bình)
- **User Story**: Là người học, tôi muốn xem lịch sử ôn tập của thẻ đang làm để biết thẻ này đã ôn bao nhiêu lần và độ nhớ ra sao.
- **Acceptance Criteria**:
  - [ ] Nút History (icon đồng hồ `Clock`/`History`) trên `FlashcardCardView.tsx` với `e.stopPropagation()`.
  - [ ] Phím tắt toàn cục: `Ctrl+H` (Windows/Linux) hoặc `Cmd+H` (macOS).
  - [ ] Mở `CardReviewHistoryModal` hiển thị dòng thời gian, điểm rating, thời lượng làm bài, và các thông số SM-2.

### US5: Export Review Session Ra CSV (Ưu tiên thấp)
- **User Story**: Là nhà nghiên cứu / người học, tôi muốn xuất dữ liệu kết quả ôn tập ra tệp CSV để theo dõi hoặc phân tích trên Excel/Google Sheets.
- **Acceptance Criteria**:
  - [ ] Nút "Xuất CSV" trên thanh điều khiển hoặc màn hình hoàn thành của `FlashcardReviewStudio.tsx`.
  - [ ] Định dạng các cột chuẩn:
    `Thời gian (ISO),ID thẻ,ID chủ đề,Đánh giá (1-4),Trạng thái trước,Trạng thái sau,Khoảng cách mới (ngày),Ease Factor mới,Hạn tiếp theo,Thời lượng làm (giây),Mặt trước (câu hỏi)`
  - [ ] Hàm thuần túy `generateReviewSessionCSV` và tải về trực tiếp an toàn trên trình duyệt.

---

## 4. KIẾN TRÚC KỸ THUẬT & COMPONENT DESIGN

### 4.1. Server & Service
- `src/server/services/flashcardService.ts`:
  - Mở rộng `getDueFlashcards` hỗ trợ filter `priority`.
  - Mở rộng `getFlashcardProgress` tính toán `streakDays`.
- `src/server/controllers/flashcardController.ts`:
  - Đọc `req.query.priority` và chuyển tiếp cho service.

### 4.2. Pure Utilities
- `src/lib/flashcardReviewSessionUtils.ts`:
  - `calculateStreakDays(reviews, now)`
  - `generateReviewSessionCSV(reviews, cards)`
  - `downloadCSV(content, filename)`

### 4.3. Client Components
- `src/components/flashcards/ReviewDashboardHeader.tsx`: Component dải thống kê độc lập.
- `src/components/flashcards/FlashcardCardView.tsx`: Thêm nút Edit & History, cô lập sự kiện click.
- `src/components/flashcards/FlashcardReviewStudio.tsx`: Tích hợp Header, Filters, Shortcuts `Ctrl+E`/`Ctrl+H`, Quick Edit callback, CSV Export.

---

## 5. KẾ HOẠCH KIỂM THỬ (VERIFICATION PLAN)

1. **Unit Tests**:
   - `tests/unit/flashcard-review-session-utils.test.ts`: Kiểm chứng `calculateStreakDays`, xử lý múi giờ, định dạng CSV an toàn.
2. **Integration Tests**:
   - `tests/integration/flashcard-review-queue-priority.test.ts`: Kiểm chứng API `GET /api/flashcards/due?priority=...` và `GET /api/flashcards/progress`.
   - `tests/integration/flashcard-review-studio-enhancements.test.tsx`: Kiểm chứng tương tác UI, phím tắt `Ctrl+E`/`Ctrl+H`, dropdown filter, export CSV.
3. **Type Check & Build**:
   - `npx tsc --noEmit` đạt 0 errors.
   - `npm run build` thành công.
