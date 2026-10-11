# ADR-097 — Phase D1 Dashboard Daily Due Review Widget

**Trạng thái**: Proposed  
**Ngày**: 2026-10-11  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phạm vi**: Dashboard Home UI, Spaced Repetition Daily Due Routine & 1-Click Launch  
**Liên quan**: Phase R3.A (Reader Excerpt to Flashcard), Phase F5 (Flashcard Analytics Widget), Phase F6.11 (Review Mode Enhancements), [phase-d1-dashboard-daily-due-review-widget-spec.md](../specs/phase-d1-dashboard-daily-due-review-widget-spec.md)  
**Tuyên bố bắt buộc**: `ADR-097 chỉ được chuyển sang Accepted sau khi Human Approval Gate được thông qua.`

---

## 1. Bối cảnh (Context)

Sau khi hoàn tất Phase R3.A (Tạo thẻ nhớ Spaced Repetition trực tiếp từ trình đọc tài liệu Reader) và Phase M3 (Soạn thảo Mind Map bằng phím tắt), Knowledge OS đã có hai trụ cột vững chắc:
1. Tiếp nhận tài liệu và trích xuất tri thức thành thẻ Spaced Repetition (Reader $\rightarrow$ Flashcard).
2. Phác thảo và kết nối mạng lưới tư duy nhanh chóng (Mind Map Keyboard Authoring).

Tuy nhiên, tại màn hình trung tâm `DashboardHome`:
- Thành phần `FlashcardAnalyticsWidget` (Khối 2.5) hiện chỉ hiển thị các số liệu thống kê tĩnh (Tổng số thẻ, Cần ôn hôm nay, Thẻ mới, Độ bền trí nhớ).
- Người dùng khi mở ứng dụng vào mỗi sáng không có một hành động trực tiếp 1-click để bắt đầu phiên ôn tập ngày. Họ buộc phải duyệt menu thủ công vào tab `flashcards`, gây ra ma sát tâm lý và làm giảm kỷ luật học tập hàng ngày (habit formation friction).
- Cơ chế điều hướng `openFlashcardReview(null, "review")` đã được thiết kế sẵn trong `DataContext` và `NavigationContext` nhưng chưa được kết nối trực tiếp vào giao diện trang chủ của người dùng.

Để hiện thực hóa triết lý *"Mở app là bắt đầu học ngay"* (Frictionless Daily Routine), hệ thống cần một widget chuyên biệt tại `DashboardHome` tổng hợp tình trạng thẻ đến hạn và cung cấp nút hành động 1-click kích hoạt trực tiếp `FlashcardReviewStudio`.

---

## 2. Quyết định Kiến Trúc (Decisions)

### 2.1. Tách biệt Trách nhiệm (Component Separation)
- **Quyết định**: Xây dựng một component độc lập `DailyDueReviewWidget.tsx` tại `src/components/dashboard/` thay vì biến đổi làm phình to `FlashcardAnalyticsWidget.tsx`.
- **Lý do**:
  - `FlashcardAnalyticsWidget` phụ trách việc trực quan hóa số liệu phân tích dài hạn (metrics & retention rates).
  - `DailyDueReviewWidget` đóng vai trò là **Actionable Habit Card** (vòng lặp thói quen: Tín hiệu $\rightarrow$ Hành động $\rightarrow$ Phần thưởng), tập trung vào trạng thái tức thời của ngày hôm nay.
  - Tách component giúp cô lập blast-radius, dễ viết unit test, kiểm soát mock và duy trì tính mô-đun cao.

### 2.2. Ngữ Nghĩa Kích Hoạt 1-Click (1-Click Launch Semantics)
- **Quyết định**: Khi người dùng nhấn nút CTA chính *"Ôn tập ngay 5 phút"*, widget gọi trực tiếp:
  ```ts
  openFlashcardReview(null, "review");
  ```
- **Hành vi luồng runtime**:
  1. `NavigationContext` chuyển `activeTab` sang `"flashcards"`, đặt `sessionType` thành `"review"`, và gán `selectedTopicId` thành `null`.
  2. `App.tsx` nạp `FlashcardReviewStudio`.
  3. `FlashcardReviewStudio` tự động truy vấn `GET /api/flashcards/due`, nạp toàn bộ thẻ quá hạn trong toàn bộ kho tri thức và mở phiên ôn tập Active Recall SM-2 với phím tắt bàn phím.
  4. Khi hoàn tất hoặc đóng (`onClose`), do `selectedTopicId` là null, studio tự động trả người dùng về lại `DashboardHome` (`setActiveTab("dashboard")`).

### 2.3. Zero Schema Migration & Tái Sử Dụng API Hiện Hữu
- **Quyết định**: Không tạo mới endpoint hay bảng cơ sở dữ liệu.
- **Nguồn dữ liệu**: Widget sử dụng endpoint hiện hữu `GET /api/flashcards/progress`:
  - Lấy `dueToday` để hiển thị số thẻ cần ôn.
  - Lấy `streakDays` để hiển thị chuỗi ngày kiên trì ôn tập.
  - Lấy `retentionRate` để phản ánh tỷ lệ ghi nhớ.

### 2.4. Trạng Thái Giao Diện Rõ Ràng (State Model)
Widget hỗ trợ 4 trạng thái hoàn chỉnh:
1. **Loading**: Hiển thị Skeleton card nhẹ nhàng, không gây layout shift.
2. **Actionable (`dueToday > 0`)**:
   - Nổi bật với huy hiệu màu Amber, đếm số thẻ đến hạn.
   - Ước tính thời gian học: `~5 phút` (tính trung bình hoặc cố định cho nhịp ôn tập chớp nhoáng).
   - Nút CTA nổi bật: *"Ôn tập ngay 5 phút"* với icon `Brain` / `Zap`.
3. **All-Caught-Up (`dueToday === 0`)**:
   - Trạng thái hoàn thành tích cực: *"Đã hoàn tất mục tiêu ôn tập hôm nay"* với icon `CheckCircle2`.
   - Cung cấp tùy chọn ôn tập củng cố nếu người dùng muốn học tiếp.
4. **Error Resilience**:
   - Nếu endpoint thất bại (mạng lỗi, server 500), hiển thị error state nhẹ nhàng với nút "Thử lại".
   - Tuyệt đối không làm sập các khối khác của `DashboardHome`.

---

## 3. Hệ Quả (Consequences)

### 3.1. Tích cực (Positive)
- **Giảm ma sát tối đa**: Người dùng có thể bắt đầu phiên ôn tập chỉ trong vòng 1 giây sau khi mở ứng dụng.
- **Khép kín giá trị**: Thẻ flashcard được tạo từ Reader (Phase R3.A) ngay lập tức có đầu ra thực hành hàng ngày từ trang chủ.
- **An toàn tuyệt đối**: Không can thiệp DB, không thay đổi thuật toán SM-2, dễ dàng rollback nếu cần.

### 3.2. Tiêu cực / Đánh đổi (Trade-offs)
- Thêm một component trực quan trên `DashboardHome`, cần sắp xếp layout hợp lý để không làm rối mắt người dùng.
- Thêm 1 request fetch API khi `DashboardHome` mount (tuy nhiên endpoint `/api/flashcards/progress` đã được tối ưu hóa chỉ mục trong Prisma).

---

## 4. Các Điều Bất Biến (Invariants)

1. **Zero Database Changes**: Tuyệt đối không thêm/sửa schema Prisma trong Phase D1.
2. **No Canvas Duplication**: Tuyệt đối không nhúng giao diện lật thẻ (flashcard card flipper) vào Dashboard; toàn bộ thao tác lật thẻ thuộc trách nhiệm của `FlashcardReviewStudio`.
3. **Fail-Safe Dashboard**: Lỗi fetch dữ liệu trong `DailyDueReviewWidget` không bao giờ được phép làm ảnh hưởng hoặc throw unhandled error ra `DashboardHome`.
