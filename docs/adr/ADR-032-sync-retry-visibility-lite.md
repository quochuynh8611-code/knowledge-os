# ADR-032: Hiển Thị Số Lần Thử Lại Trong Hàng Đợi Đồng Bộ (Sync Retry Visibility Lite)

- **Mã ADR:** ADR-032
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Trường `retryCount: number` đã được tích lũy bên trong `SyncMutation` mỗi khi một đột biến thất bại trong quá trình replay. Tuy nhiên, giao diện Popover hiện tại chỉ hiển thị nhãn "Lỗi" chung chung mà không cho người dùng biết đột biến này đã được thử lại bao nhiêu lần.

Cần một phase thuần túy hiển thị để trực quan hóa thông tin này mà không làm tăng độ phức tạp hay thay đổi cấu trúc dữ liệu.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Khai Thác Dữ Liệu Sẵn Có (Zero Schema Changes)**:
   - Sử dụng trực tiếp trường `mutation.retryCount` hiện có.
   - Tuyệt đối không thêm trường mới như `nextRetryAt` hay `backoffDelayMs` trong phase này nhằm giữ blast radius ở mức tối thiểu.
2. **Hiển Thị Rõ Ràng Số Lần Thử Lại (Retry Count Badge & Label)**:
   - Khi `mutation.retryCount > 0`, hiển thị số lần thử lại trên tag trạng thái (ví dụ: `Lỗi (2 lần)`) hoặc dòng thông tin chi tiết (`Đã thử 2 lần`).
3. **Phân Tách Rạch Ròi Với Phase Retry Scheduling (P2.7b)**:
   - Mọi cơ chế lên lịch thử lại tự động (Exponential Backoff, Timer, `nextRetryAt`) nếu cần sẽ được chuyển sang một phase độc lập với đánh giá rủi ro riêng.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Minh bạch hóa trạng thái lỗi cho học giả.
  - Zero Risk: 100% Presentation Layer, không đụng chạm logic lưu trữ.
- **Rủi ro kiểm soát**: Cực thấp, 100% reversible.
