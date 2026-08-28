# ADR-025: Mở Rộng Hàng Đợi Đồng Bộ Offline Cho Category & Topic (Category & Topic Offline Sync Queue)

- **Mã ADR:** ADR-025
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/services/syncQueue.ts`, `src/services/dataRepository.ts`

---

## 1. Bối Cảnh (Context)
Sau khi hoàn thành P2.2 cho `Note`, việc mở rộng hàng đợi sang toàn bộ các thực thể cùng lúc tiềm ẩn rủi ro blast radius lớn. Thay vào đó, việc mở rộng phân tầng sang hai thực thể phân loại cấu trúc (`Category` và `Topic`) là bước đi an toàn, đảm bảo tính toàn vẹn của cây phân loại tri thức trước khi chuyển sang các thực thể tài nguyên khác.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Giới Hạn Phạm Vi Nghiêm Ngặt Ở Category & Topic**:
   - Mở rộng hàm `replayMutation` trong `SyncQueueService` để xử lý:
     - `category` $\rightarrow$ `POST /api/categories`, `DELETE /api/categories/:id`
     - `topic` $\rightarrow$ `POST /api/topics`, `DELETE /api/topics/:id`
   - Chưa triển khai cho `resource` và `studyProgress` trong phase này.
2. **Khép Kín Cơ Chế Enqueue Trong `ApiDataRepository`**:
   - `saveCategory`, `deleteCategory`, `saveTopic`, `deleteTopic` sẽ đẩy mutation vào `SyncQueueService` khi `fetch` bị lỗi mạng hoặc `!res.ok`.
3. **Bảo Toàn Thứ Tự FIFO**:
   - Khi replay, Category được tạo trước sẽ được gửi lên server trước Topic thuộc Category đó.

---

## 3. Đánh Giá Trade-offs (Two-Way Door)

- **Ưu điểm**:
  - Blast radius cực thấp (chỉ thêm 2 kiểu thực thể liên quan trực tiếp đến Taxonomy).
  - Triệt tiêu hoàn toàn rủi ro mất dữ liệu Category & Topic khi offline.
- **Rủi ro kiểm soát**: Rất thấp (Kế thừa 100% engine đã chạy ổn định từ P2.2).
