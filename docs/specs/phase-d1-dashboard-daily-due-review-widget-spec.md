# Đặc Tả Kỹ Thuật Phase D1: Dashboard Daily Due Review Widget

> **Tài liệu:** Planning Specification — Phase D1  
> **Trạng thái:** DRAFT / PENDING HUMAN APPROVAL  
> **Phiên bản:** 1.0  
> **Ngày tạo:** 2026-10-11  
> **Tác giả:** Staff Software Engineer / Technical Architect  
> **Mục tiêu:** Tích hợp widget thẻ đến hạn ôn tập hàng ngày (`DailyDueReviewWidget`) tại `DashboardHome` với nút 1-click "Ôn tập ngay 5 phút" kích hoạt trực tiếp `FlashcardReviewStudio`.

---

## 1. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Context & Business Goals)

### 1.1. Bối cảnh
- Hệ thống Knowledge OS đã hoàn tất luồng tạo thẻ Spaced Repetition từ Reader (Phase R3.A) và đã có sẵn `FlashcardReviewStudio` hỗ trợ thuật toán SM-2, Option A Idempotent reviews, cùng phím tắt bàn phím.
- Tuy nhiên, tại trang chủ `DashboardHome`, khối `FlashcardAnalyticsWidget` hiện tại chỉ đóng vai trò hiển thị số liệu thống kê thụ động (Tổng số thẻ, Cần ôn hôm nay, Thẻ mới, Độ bền trí nhớ).
- Khi người dùng mở ứng dụng và thấy có thẻ đến hạn, họ phải tự điều hướng thủ công qua nhiều menu hoặc thanh sidebar để tìm nơi ôn tập, tạo ra ma sát tâm lý (friction) làm gián đoạn thói quen học tập hàng ngày.

### 1.2. Mục tiêu cốt lõi
1. **Frictionless Habit Loop (Vòng lặp thói quen không ma sát)**: Ngay khi vào `DashboardHome`, người dùng thấy rõ số lượng thẻ cần ôn hôm nay và thời gian ước tính ngắn gọn (`~5 phút`).
2. **1-Click Review Launch**: Nút bấm nổi bật "Ôn tập ngay 5 phút" kích hoạt trực tiếp `openFlashcardReview(null, "review")` để mở ngay `FlashcardReviewStudio` toàn vault.
3. **All-Caught-Up Clarity**: Khi không còn thẻ đến hạn (`dueToday === 0`), widget hiển thị trạng thái hoàn thành tích cực ("Đã hoàn tất mục tiêu ôn tập hôm nay") để tạo cảm giác thành tựu và không gây áp lực.
4. **Zero Schema Migration & Isolation**: Sử dụng nguyên vẹn API backend hiện hành (`/api/flashcards/progress`), không sửa database schema, và cô lập lỗi không làm sập `DashboardHome`.

---

## 2. Phạm Vi Thực Hiện & Ranh Giới (Scope & Bounded Context)

### 2.1. Trong phạm vi (In-Scope)
- **Component mới**: Tạo `src/components/dashboard/DailyDueReviewWidget.tsx` (hoặc trong thư mục dashboard).
- **Tích hợp `DashboardHome`**: Nhúng `DailyDueReviewWidget` vào `src/components/dashboard/DashboardHome.tsx` tại vị trí chiến lược (ngay trên hoặc kết hợp hài hòa với khối Spaced Repetition).
- **Dữ liệu**: Nạp dữ liệu thống kê từ endpoint `GET /api/flashcards/progress` (chứa `dueToday`, `totalCards`, `retentionRate`, `streakDays`).
- **Hành động CTA**: Gọi `openFlashcardReview(null, "review")` từ `useData()` khi bấm nút ôn tập.
- **Trạng thái UI**:
  - *Loading*: Skeleton loading nhẹ nhàng, không giật layout.
  - *Actionable (dueToday > 0)*: Hiển thị số thẻ đến hạn, nhãn ước tính thời gian "5 phút", streak ngày học, nút CTA chính "Ôn tập ngay 5 phút".
  - *Completed (dueToday === 0)*: Thông điệp "Đã hoàn thành hôm nay", icon thành tích, nút phụ "Ôn tập củng cố" (tuỳ chọn).
  - *Error*: Banner thông báo lỗi nhẹ nhàng, nút "Thử lại", không ảnh hưởng các widget khác trên Dashboard.

### 2.2. Ngoài phạm vi (Out-of-Scope)
- Không nhúng trực tiếp giao diện lật thẻ Flashcard vào `DashboardHome` (tránh phình to DOM và trùng lặp logic; toàn bộ phiên lật thẻ ủy thác cho `FlashcardReviewStudio`).
- Không sửa đổi database Prisma schema, không tạo migration mới.
- Không sửa logic thuật toán tính điểm SM-2 hay logic controller backend.
- Không can thiệp vào modal `SpacedReviewModal` cấp Topic.

---

## 3. Thiết Kế Giao Diện & Hợp Đồng Dữ Liệu (Interface Contract)

### 3.1. Props Interface
```typescript
export interface DailyDueReviewWidgetProps {
  className?: string;
  onStartReview?: () => void; // Optional override cho testing hoặc custom handler
}
```

### 3.2. Data Consumption Contract
- **Endpoint**: `GET /api/flashcards/progress`
- **Response Shape** (`FlashcardProgressStats`):
  ```typescript
  interface FlashcardProgressStats {
    totalCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    dueToday: number;
    retentionRate: number;
    streakDays: number;
  }
  ```

### 3.3. Navigation Trigger Contract
- Sử dụng hook `useData()`:
  ```typescript
  const { openFlashcardReview } = useData();
  
  const handleLaunchReview = () => {
    if (onStartReview) {
      onStartReview();
    } else if (openFlashcardReview) {
      openFlashcardReview(null, "review");
    }
  };
  ```

---

## 4. Đặc Tả Hành Vi Kiểm Chứng (Gherkin Acceptance Criteria)

### Scenario 1: Hiển thị thẻ đến hạn và nút CTA khi có thẻ cần ôn
```gherkin
Given người dùng đang ở màn hình DashboardHome
And hệ thống có 8 thẻ flashcard đến hạn ôn tập hôm nay (dueToday = 8)
When widget DailyDueReviewWidget tải dữ liệu thành công
Then widget hiển thị số lượng thẻ "8"
And hiển thị huy hiệu hoặc nhãn "Cần ôn hôm nay"
And hiển thị thời gian ước tính "~5 phút"
And hiển thị nút bấm chính có nội dung "Ôn tập ngay 5 phút"
```

### Scenario 2: Kích hoạt trực tiếp FlashcardReviewStudio khi bấm nút CTA
```gherkin
Given widget DailyDueReviewWidget đang hiển thị với 8 thẻ đến hạn
When người dùng nhấp vào nút "Ôn tập ngay 5 phút"
Then hàm openFlashcardReview(null, "review") được gọi chính xác 1 lần
And giao diện chuyển sang tab flashcards ở chế độ review toàn vault
```

### Scenario 3: Hiển thị trạng thái hoàn tất khi không có thẻ đến hạn
```gherkin
Given người dùng đang ở màn hình DashboardHome
And hệ thống không có thẻ nào đến hạn hôm nay (dueToday = 0)
When widget DailyDueReviewWidget tải dữ liệu thành công
Then widget hiển thị trạng thái hoàn thành "Đã hoàn tất mục tiêu hôm nay" hoặc "Không có thẻ đến hạn"
And không hiển thị nút thúc giục quá hạn
And có thể cung cấp nút phụ ôn tập củng cố hoặc thông báo chúc mừng
```

### Scenario 4: Phục hồi an toàn khi nạp dữ liệu thất bại
```gherkin
Given endpoint /api/flashcards/progress trả về mã lỗi HTTP 500 hoặc mất kết nối
When widget DailyDueReviewWidget tải dữ liệu
Then widget hiển thị thông báo lỗi nhẹ nhàng (data-testid="daily-due-error")
And hiển thị nút "Thử lại" để gọi lại API
And toàn bộ các thành phần khác trên DashboardHome (TodayLearningHero, WeeklyCadenceBar, Lĩnh vực học tập) vẫn hoạt động bình thường
```

---

## 5. Chiến Lược Kiểm Thử (Verification Strategy)

1. **Unit & Integration Tests**:
   - Tạo bộ test mới: `tests/unit/dashboard-daily-due-widget.test.tsx`.
   - Kiểm chứng 4 kịch bản Gherkin trên với mock fetch `/api/flashcards/progress`.
   - Kiểm chứng tương tác click kích hoạt `openFlashcardReview`.
2. **Regression Tests**:
   - Chạy toàn bộ các test suite hiện hữu của `DashboardHome`:
     - `tests/unit/phase14b-focus-domain-ui.test.tsx`
     - `tests/unit/phase15b-starter-topics-enrichment.test.tsx`
     - `tests/unit/domain-sorting-priority.test.tsx`
     - `tests/integration/flashcard-analytics-widget.test.tsx`
3. **Typecheck Quality Gate**:
   - `npx tsc --noEmit` đạt 0 lỗi.

---

## 6. Chiến Lược Rollback (Rollback Strategy)
- Nếu widget gặp sự cố, chỉ cần gỡ bỏ component khỏi `src/components/dashboard/DashboardHome.tsx` và xóa tệp `DailyDueReviewWidget.tsx`.
- Không ảnh hưởng đến dữ liệu cơ sở dữ liệu hay luồng ôn tập của `FlashcardReviewStudio`.
