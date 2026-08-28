# ADR-034: Hiển Thị Trạng Thái Chờ Thử Lại Trong Giao Diện (Sync Backoff Indicator UI)

- **Mã ADR:** ADR-034
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Tại Phase P2.7b, `SyncMutation` đã có các trường `nextRetryAt` và `backoffDelayMs` để quản lý khoảng trễ thử lại. Tuy nhiên, người dùng chưa có phản hồi trực quan trên giao diện để biết một đột biến lỗi đang trong thời gian chờ cooldown (`nextRetryAt` trong tương lai) hay đã sẵn sàng để replay (`nextRetryAt` trong quá khứ).

Cần một phase hiển thị thuần túy để bổ sung thông tin này vào Popover chi tiết.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Hiển Thị Trạng Thái Backoff Rõ Ràng**:
   - Khi `now < nextRetryAt`: Hiển thị `Thử lại sau Xs` (hoặc phút nếu $\ge 60\text{s}$).
   - Khi `now >= nextRetryAt`: Hiển thị `Sẵn sàng thử lại`.
2. **Bộ Đếm Thời Gian Cục Bộ Có Điều Kiện (Scoped Local Ticker)**:
   - Chỉ duy trì `setInterval(..., 1000)` khi Popover đang mở (`isOpen === true`) và có ít nhất một mutation đang chờ cooldown.
   - Hủy interval ngay khi Popover đóng hoặc không còn item nào trong cooldown để đảm bảo zero CPU overhead.
3. **Bảo Tồn Toàn Bộ Tương Tác Hiện Có**:
   - Nút "Đồng bộ ngay" tiếp tục cho phép người dùng bypass backoff và replay ngay.
   - Nút "Bỏ qua mục lỗi này" (P2.6b) tiếp tục hoạt động độc lập.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Tăng tính minh bạch tối đa cho hệ thống tự phục hồi offline/online.
  - Người dùng hiểu rõ tại sao hệ thống chưa tự động replay mà không cảm thấy ứng dụng bị "treo".
- **Rủi ro kiểm soát**:
  - Cực thấp, 100% presentation layer và timer được dọn dẹp sạch sẽ trong cleanup function của `useEffect`.
