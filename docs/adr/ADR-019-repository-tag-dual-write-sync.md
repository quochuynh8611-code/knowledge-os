# ADR-019: Cơ Chế Ghi Kép Đồng Bộ Nhãn (Repository Tag Dual-Write Sync)

- **Mã ADR:** ADR-019
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-27
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi tài liệu:** `src/server/routes/topicRoutes.ts`, `src/server/routes/syncRoutes.ts`, `src/lib/researchStorageHelpers.ts`, `prisma/schema.prisma`

---

## 1. Bối Cảnh (Context)
Theo ADR-015, mô hình lưu trữ đã bổ sung bảng quan hệ chuẩn hóa `Tag` và `TopicTag`, đồng thời giữ lại cột `Topic.tags: String[]` làm bộ đệm phi chuẩn hóa (denormalized cache) để bảo đảm tương thích ngược với LocalStorage và BackupSnapshot Semver 2.x.
Tuy nhiên, tầng routing server (`topicRoutes.ts`) hiện chỉ ghi vào `Topic.tags: String[]` mà chưa đồng bộ vào `Tag` và `TopicTag`, gây ra sự lệch pha (divergence) dữ liệu trong PostgreSQL.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Đồng Bộ Hai Chiều Trong 1 Giao Dịch ACID (Prisma Interactive Transaction)**:
   - Mọi thao tác tạo (`POST /api/topics`) hoặc cập nhật (`PUT /api/topics/:id`) chủ đề đều phải thực thi trong `prisma.$transaction`.
   - Giao dịch đảm bảo:
     1. Ghi mảng nhãn đã chuẩn hóa vào `Topic.tags: String[]`.
     2. Tự động upsert các thực thể `Tag` tương ứng.
     3. Tạo/Cập nhật các liên kết `TopicTag` (`topicId`, `tagId`).
     4. Xóa các liên kết `TopicTag` lỗi thời khi người dùng gỡ nhãn khỏi chủ đề.
     5. Cập nhật chỉ số `Tag.count`.
2. **Nguyên Tắc All-or-Nothing (Atomic Rollback)**:
   - Nếu bất kỳ bước nào trong việc đồng bộ `Tag` hoặc `TopicTag` thất bại, toàn bộ giao dịch cập nhật chủ đề sẽ bị hủy bỏ (rollback), không bao giờ để lại trạng thái nửa vời (partial write).
3. **Bảo Toàn 100% Khả Năng Tương Thích Ngược**:
   - Không thay đổi HTTP Request/Response format của các API endpoints.
   - Không thay đổi client-side repository hay DataContext.

---

## 3. Đánh Giá Trade-offs: Hai Chiều (Two-Way Door)

- **Thuận nghịch (Reversible)**: Không làm thay đổi cấu trúc bảng hay kiểu dữ liệu schema.
- **Rủi ro kiểm soát**:
  - *Hiệu năng*: Bổ sung vài lệnh upsert/delete trong cùng 1 transaction cho mỗi lần sửa topic (thường từ 1-5 tags), độ trễ tăng không đáng kể (< 5ms).
  - *Tính nhất quán*: Triệt tiêu hoàn toàn nguy cơ lệch dữ liệu giữa mảng tags và bảng liên kết quan hệ.
