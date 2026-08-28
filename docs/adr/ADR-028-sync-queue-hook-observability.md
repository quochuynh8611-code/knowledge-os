# ADR-028: Kiến Trúc Lắng Nghe & React Hook Quản Lý Hàng Đợi Đồng Bộ (Sync Queue Observability & useSyncQueue Hook)

- **Mã ADR:** ADR-028
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/syncQueue.ts`, `src/hooks/useSyncQueue.ts`

---

## 1. Bối Cảnh (Context)
Sau khi hoàn thành P2.2, P2.3a, P2.3b, P2.3c, hàng đợi ngoại tuyến `SyncQueueService` đã xử lý toàn diện mọi thực thể dữ liệu. Cần cung cấp khả năng quan sát trạng thái (Observability) và tích hợp thời gian thực với React thông qua hook `useSyncQueue`.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Mẫu Thiết Kế Quan Sát (Observer Pattern) Trong `SyncQueueService`**:
   - Thêm phương thức `subscribe(listener: () => void): () => void` vào `SyncQueueService`.
   - Mỗi khi hàng đợi thay đổi (thêm mutation, xóa mutation, cập nhật lỗi, bắt đầu/kết thúc flush), tất cả listeners được thông báo để cập nhật giao diện ngay lập tức.
2. **React Hook `useSyncQueue` Độc Lập**:
   - Quản lý trạng thái kết nối mạng (`navigator.onLine` kết hợp sự kiện `online`/`offline`).
   - Cung cấp các chỉ số: `pendingCount`, `failedCount`, `isFlushing`, `isOnline`.
   - Cung cấp hàm `flush()` để người dùng có thể chủ động bấm thử lại (Manual Retry).

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Không gây phụ thuộc ngược (No circular dependency).
  - Tách bạch hoàn toàn giữa tầng dịch vụ lưu trữ (`SyncQueueService`) và tầng hiển thị React (`useSyncQueue`).
- **Rủi ro kiểm soát**: Cực thấp, 100% reversible.
