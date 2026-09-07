# Knowledge OS Release Notes — Phase F6.11: Review Mode Enhancements

**Release Version**: `v0.11.0`  
**Date**: 2026-09-07  
**Branch**: `neh1`  
**Status**: General Availability (GA)  

---

## 🎯 Tính Năng Mới

### 1. Review Dashboard Header
- Bổ sung dải 4 thẻ KPI thống kê trên đầu phòng ôn tập `FlashcardReviewStudio`:
  - **Cần ôn hôm nay (Due Today)**
  - **Thẻ mới chưa học (New Cards)**
  - **Tỷ lệ nhớ (Retention Rate)**
  - **Chuỗi ngày học liên tiếp (Streak Days)**
- Tích hợp Skeleton loading state tự động và pure function `calculateStreakDays` dựa trên múi giờ cục bộ.

### 2. Priority Filter (Bộ Lọc Ưu Tiên)
- Hỗ trợ lọc hàng đợi theo 3 chế độ:
  - `due`: Thẻ đến hạn ôn tập SM-2 (`dueAt <= now`).
  - `new`: Thẻ mới chưa học (`state: 'new'`).
  - `low_retention`: Thẻ có độ nhớ kém dựa trên công thức tính điểm trọng số:
    - `lapses >= 2` (+0.4)
    - `easeFactor <= 2.0` (+0.3)
    - `retentionRate < 0.6` (+0.3)
    - Ngưỡng kích hoạt: `score >= 0.4`.

### 3. Quick Edit Modal (`Ctrl+E` / `Cmd+E`)
- Chỉnh sửa trực tiếp thẻ đang ôn mà không bị reset chỉ số hàng đợi (`currentIndex`) hoặc đồng hồ phiên học.
- Nút chỉnh sửa nhanh trên góc thẻ với `e.stopPropagation()` chống lật thẻ nhầm.
- Keyboard shortcut an toàn với cơ chế bảo vệ form inputs & modals.

### 4. View History Modal (`Ctrl+H` / `Cmd+H`)
- Tra cứu lịch sử ôn tập và thông số thuật toán SM-2:
  - Xem trước câu hỏi và đáp án.
  - Thông số hiện tại: khoảng cách ngày (`interval`), hệ số độ dễ (`easeFactor`), số lần nhớ liên tiếp (`repetitions`), số lần quên (`lapses`).
  - Dòng thời gian chi tiết các lượt ôn tập kèm badge màu chuẩn (Again 1, Hard 2, Good 3, Easy 4), chuyển dịch trạng thái và thời lượng ôn.

### 5. Export CSV (Phiên Hiện Tại & Toàn Bộ Lịch Sử)
- Xuất dữ liệu ôn tập ra file CSV chuẩn RFC 4180 có UTF-8 BOM (`\uFEFF`) để mở tiếng Việt không bị lỗi font trên Excel.
- Bộ lọc đa chiều:
  - Phạm vi: Phiên hiện tại (`session`) hoặc Toàn bộ lịch sử (`full`).
  - Chủ đề (`topicId`).
  - Điểm đánh giá (`rating` 1–4).
  - Khoảng thời gian: Hôm nay, 7 ngày, 30 ngày, hoặc tùy chọn ngày.

### 6. Session Complete Celebration
- Màn hình chúc mừng khi hoàn thành phiên học:
  - Hiệu ứng pháo giấy Confetti sống động.
  - Huy hiệu Cúp vàng danh dự kèm thông điệp động viên tương ứng với tỷ lệ nhớ.
  - Grid 3 chỉ số chính: Tổng số thẻ, Tỷ lệ nhớ đúng (`%`), Thời gian học.
  - Bảng phân bổ chi tiết 4 mức đánh giá (Again, Hard, Good, Easy).
  - Nút "Ôn tập lại", "Xuất CSV phiên" và "Thoát".

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng

- **Unit & Integration Tests**: 24 test suites, **173/173 tests PASS (100%)**.
  - `tests/unit/flashcard-review-session-utils.test.ts` (17 tests)
  - `tests/unit/review-dashboard-header.test.tsx` (3 tests)
  - `tests/integration/flashcard-review-queue-priority.test.ts` (6 tests)
  - `tests/integration/flashcard-quick-edit.test.tsx` (3 tests)
  - `tests/integration/flashcard-review-history.test.tsx` (6 tests)
  - `tests/integration/flashcard-export-csv.test.tsx` (6 tests)
  - `tests/integration/flashcard-session-celebration.test.tsx` (2 tests)
  - Cùng 17 file kiểm thử hiện có của phân hệ Flashcard.
- **Static Typing**: `npx tsc --noEmit` ➔ 0 errors.
- **Database**: Zero schema migration (tận dụng 100% schema hiện có).

---

## 📦 File Thay Đổi Chính

- `src/lib/flashcardReviewSessionUtils.ts` (new)
- `src/components/flashcards/ReviewDashboardHeader.tsx` (new)
- `src/components/flashcards/FlashcardReviewHistoryModal.tsx` (new)
- `src/components/flashcards/FlashcardExportModal.tsx` (new)
- `src/components/flashcards/FlashcardReviewStudio.tsx` (modified)
- `src/components/flashcards/FlashcardCardView.tsx` (modified)
- `src/components/flashcards/index.ts` (modified)
- `src/components/modals/FlashcardFormModal.tsx` (modified)
- `src/server/services/flashcardService.ts` (modified)
- `src/server/controllers/flashcardController.ts` (modified)
- `src/server/routes/flashcardRoutes.ts` (modified)
- `src/services/dataRepository.ts` (modified)
- `src/types/flashcard.ts` (modified)
