# ADR-039: Đồng Bộ Hóa Hàng Đợi Ngoại Tuyến Giữa Nhiều Tab (Multi-Tab Sync via Storage Event)

- **Mã ADR:** ADR-039
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/syncQueue.ts`, `src/hooks/useSyncQueue.ts`

---

## 1. Bối Cảnh (Context)
Khi người dùng mở ứng dụng trên nhiều tab trình duyệt song song, dữ liệu lưu trong `localStorage` bị phân mảnh về mặt hiển thị: Tab B không cập nhật biến đổi hàng đợi hoặc nhật ký telemetry do Tab A thực hiện cho tới khi tải lại trang.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Sử Dụng Native StorageEvent**:
   - `SyncQueueService` đăng ký `window.addEventListener('storage', this.handleStorageEvent)` nếu chạy trong môi trường trình duyệt.
   - Khi có sự kiện `storage` với `key` khớp `storageKey` hoặc `telemetryStorageKey`, service gọi `notifyListeners()`.
2. **Tự Động Cập Nhật Tầng UI Không Cần Sửa Hook**:
   - `useSyncQueue` đã subscribe vào `SyncQueueService`, do đó khi `notifyListeners()` kích hoạt, toàn bộ state `queue`, `telemetryStats`, `syncHealth` ở Tab B sẽ lập tức được cập nhật mà không cần viết thêm logic phức tạp ở component.
3. **Kiểm Tra Trùng Lặp Trước Khi Replay (Pre-Replay Existence Guard)**:
   - Trong vòng lặp `flushQueue`, kiểm tra lại `this.getQueue().some(m => m.id === mutation.id)` trước khi gọi HTTP request để bảo vệ trường hợp Tab A vừa xử lý xong mutation đó.
4. **Hỗ Trợ Dọn Dẹp Đầy Đủ (Cleanup via `destroy()`)**:
   - Thêm phương thức `destroy()` để gỡ bỏ `storage` event listener khi service bị hủy hoặc trong môi trường testing.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Không cần thêm Web Worker, WebSocket hay server polling.
  - Zero loop risk vì StorageEvent chỉ phát tán tới các tab khác, và handler chỉ đọc chứ không ghi.
- **Rủi ro kiểm soát**:
  - Khi mock `StorageEvent` trong Node/Vitest test runner, cần cấu hình dispatch chuẩn `new StorageEvent('storage', { key, ... })` hoặc `window.dispatchEvent(new Event('storage'))`.
