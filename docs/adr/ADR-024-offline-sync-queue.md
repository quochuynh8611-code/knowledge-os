# ADR-024: Hàng Đợi Đồng Bộ Đột Biến Offline-First (Offline-First Mutation Sync Queue)

- **Mã ADR:** ADR-024
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/lib/syncQueue.ts`, `src/services/syncQueue.ts`, `src/services/dataRepository.ts`

---

## 1. Bối Cảnh (Context)
Khi người dùng thao tác trong trạng thái offline hoặc server API tạm thời gián đoạn, `ApiDataRepository` ghi thành công vào `LocalStorageDataRepository` nhưng âm thầm bỏ qua lỗi mạng. Các đột biến (thêm/sửa/xóa topic, note, resource, category) không được ghi nhận lại, dẫn đến tình trạng mất đồng bộ dữ liệu (Silent Mutation Drift) khi người dùng kết nối mạng trở lại.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Hàng Đợi Mutation Bền Vững (Persistent Mutation Queue)**:
   - Lưu trữ hàng đợi mutation trong `localStorage` dưới khóa `phat_hoc_huyen_hoc_sync_queue`.
   - Mỗi phần tử mutation mang định danh duy nhất (`id`), kiểu thực thể (`entityType`), hành động (`save` / `delete`), `payload`, và `clientTimestamp`.
2. **Cơ Chế Khử Trùng Lặp & Gộp Đột Biến (Mutation Compaction / Coalescing)**:
   - Nếu trong hàng đợi đã có mutation chờ xử lý cho cùng một `(entityType, entityId)`:
     - Thao tác `save` mới sẽ thay thế payload của thao tác `save` trước đó (Last-Write-Wins).
     - Thao tác `delete` sẽ hủy bỏ các thao tác `save` trước đó và chuyển trạng thái thành `delete`.
3. **Tiến Trình Replay Tuần Tự & Khả Năng Tự Phục Hồi (Sequential Flush with Backoff)**:
   - Duyệt tuần tự các mutation theo thời gian (`FIFO`), gọi endpoint REST API tương ứng.
   - Khi thành công, loại bỏ mutation khỏi hàng đợi.
   - Nếu thất bại, tăng `retryCount` và dừng luồng replay tạm thời để bảo toàn tính thứ tự.
   - Tự động kích hoạt khi có sự kiện `online` trên `window` hoặc khi có một request API thành công.
4. **Phân Tách Module Thuần Túy & Service**:
   - `src/lib/syncQueue.ts`: Toàn bộ logic hàng đợi là các hàm thuần túy (dễ kiểm thử unit test 100%).
   - `src/services/syncQueue.ts`: Chịu trách nhiệm tương tác I/O (`localStorage`, `fetch`).

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Triệt tiêu hoàn toàn rủi ro mất dữ liệu khi làm việc offline.
  - Tự động đồng bộ mượt mà khi online trở lại mà không cần người dùng thao tác thủ công.
  - Giữ nguyên trải nghiệm Optimistic UI tức thì.
- **Rủi ro kiểm soát**:
  - Xử lý xung đột cơ bản theo nguyên tắc Last-Write-Wins trên từng entityId.
