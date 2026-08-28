# ADR-037: Giao Diện Trực Quan Hóa Nhật Ký & Thống Kê Đồng Bộ (Sync Telemetry Read Model & Debug Panel)

- **Mã ADR:** ADR-037
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/hooks/useSyncQueue.ts`, `src/components/ui/SyncStatusBadge.tsx`

---

## 1. Bối Cảnh (Context)
Phase P2.9a đã hoàn thành việc lưu trữ nhật ký sự kiện xoay vòng (50 events) và các hàm thuần túy tính toán số liệu thống kê. Để người vận hành và người dùng có thể quan sát trực tiếp sức khỏe và lịch sử đồng bộ, cần một giao diện trực quan, nhẹ nhàng và không làm xáo trộn bố cục popover sẵn có.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Tích Hợp Tab Switcher Trong Popover Sẵn Có (In-Popover Tab Switcher)**:
   - Thay vì mở một Modal riêng biệt hoặc trang mới, bố trí 2 tab con trong Popover: `[Hàng đợi]` (mặc định) và `[Nhật ký & Thống kê]`.
   - Giúp gom toàn bộ các công cụ chẩn đoán đồng bộ ngoại tuyến vào một điểm chạm duy nhất (Single Point of Observation).
2. **Read Model Đầy Đủ (Rich Aggregates & Recent Event Stream)**:
   - Phần trên: 4 thẻ thống kê mini: Tỉ lệ thành công (`successRate%`), Đã đồng bộ (`successCount`), Thất bại (`failureCount`), Đã bỏ qua (`discardedCount`).
   - Phần dưới: Danh sách 10–20 sự kiện gần nhất sắp xếp theo thứ tự mới nhất lên đầu (LIFO view cho lịch sử), hiển thị badge loại sự kiện, tên thực thể và thông báo lỗi (nếu có).
3. **Mở Rộng Hook `useSyncQueue`**:
   - Bổ sung `telemetryEvents` và `telemetryStats` vào đối tượng trả về của `useSyncQueue`.
   - Lắng nghe `subscribe` của `SyncQueueService` để tự động render lại số liệu khi có sự kiện đồng bộ mới.
4. **Nguyên Tắc Read-Only An Toàn**:
   - Không cung cấp nút xóa log hay nút chỉnh sửa trong phase này để giảm thiểu tối đa blast radius.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Tối ưu diện tích hiển thị, không làm phức tạp hóa routing của ứng dụng.
  - Tab `Hàng đợi` vẫn giữ nguyên 100% trải nghiệm và logic từ các phase trước.
- **Rủi ro kiểm soát**:
  - Giao diện tab Telemetry sử dụng scroll vùng chứa (`max-h-64 overflow-y-auto`) nên không làm tràn màn hình popover.
