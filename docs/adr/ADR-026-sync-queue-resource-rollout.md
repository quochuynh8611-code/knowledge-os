# ADR-026: Hàng Đợi Đồng Bộ Ngoại Tuyến Cho Tài Liệu Nghiên Cứu (Resource Offline Sync Queue)

- **Mã ADR:** ADR-026
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/syncQueue.ts`, `src/services/dataRepository.ts`

---

## 1. Bối Cảnh (Context)
Sau khi hoàn thành P2.2 (Note) và P2.3a (Category & Topic), thực thể `Resource` là thành phần tiếp theo cần được bảo vệ khi làm việc offline. Tách riêng `Resource` khỏi `StudyProgress` giúp giảm thiểu tối đa độ phức tạp và cô lập rủi ro.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Giới Hạn Phạm Vi Nghiêm Ngặt Ở Resource**:
   - Mở rộng hàm `replayMutation` trong `SyncQueueService` để xử lý:
     - `resource` save $\rightarrow$ `POST /api/resources` (payload: `Resource`)
     - `resource` delete $\rightarrow$ `DELETE /api/resources/:id`
   - Chưa tích hợp cho `studyProgress` trong phase này (bảo lưu cho P2.3c).
2. **Khép Kín Cơ Chế Enqueue Trong `ApiDataRepository`**:
   - `saveResource` và `deleteResource` sẽ tự động đẩy mutation vào `SyncQueueService` khi `fetch` bị lỗi mạng hoặc `!res.ok`.
3. **Bảo Toàn Thứ Tự FIFO**:
   - Replay tuần tự theo thời gian phát sinh `clientTimestamp`.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Blast radius cực thấp (chỉ thêm 1 kiểu thực thể `resource`).
  - Triệt tiêu rủi ro mất dữ liệu tài liệu nghiên cứu khi offline.
- **Rủi ro kiểm soát**: Rất thấp (Kế thừa engine đã ổn định từ P2.2 & P2.3a).
