# ADR: Flashcard Idempotency End-to-End

## Trạng thái
Đã duyệt (Accepted)

## Bối cảnh
Trong Phase 10 Runtime Smoke Test sau khi merge PR #1 trên môi trường thật với PostgreSQL database, phát hiện lỗi P1 (High):
Khi người dùng bấm "Tạo Flashcards từ nhánh này" trong Mindmap Drawer và sau đó bấm tạo lại hoặc nhấp đúp, hệ thống backend tạo ra 2 bản ghi Flashcard trùng lặp nội dung.

Nguyên nhân gốc rễ:
1. Mô hình Prisma `Flashcard` hiện tại không có trường `idempotencyKey` trong schema cơ sở dữ liệu.
2. Endpoint `GET /api/flashcards` đọc từ PostgreSQL và trả về danh sách flashcards không chứa trường `idempotencyKey` (`c.idempotencyKey === undefined`).
3. Component `MindMapNodeDrawer` thực hiện kiểm tra:
   ```ts
   const found = existingCards.find((c) => (c as any).idempotencyKey === idempotencyKey);
   ```
   Do `c.idempotencyKey` bị thiếu từ server response, `found` luôn trả về `undefined`, khiến client lầm tưởng flashcard chưa tồn tại và tiếp tục gửi `POST /api/flashcards` tạo mới, gây nhân bản bản ghi trên cơ sở dữ liệu.

## Quyết định
Áp dụng **Option A: Bổ sung trường `idempotencyKey` vào Flashcard schema và cơ sở dữ liệu PostgreSQL**:
1. Cập nhật `prisma/schema.prisma`:
   ```prisma
   model Flashcard {
     ...
     idempotencyKey String? @unique
   }
   ```
2. Tạo migration chính thức: `add_flashcard_idempotency_key` tạo cột `idempotencyKey TEXT NULL` cùng Unique Index `Flashcard_idempotencyKey_key`.
3. Bổ sung `idempotencyKey: z.string().min(1).optional()` vào `FlashcardCreateSchema`.
4. Cập nhật `flashcardService.createFlashcard`:
   - Kiểm tra `idempotencyKey` trước khi tạo: nếu đã tồn tại, trả về flashcard hiện có (idempotent return).
   - Xử lý race condition đồng thời: nếu gặp lỗi vi phạm Unique Constraint (`P2002`), thực hiện truy vấn lại theo `idempotencyKey` và trả về thẻ đã tạo an toàn.
5. Cập nhật `ApiDataRepository` và `LocalStorageDataRepository` để duy trì và trả nguyên vẹn `idempotencyKey`.
6. Giữ nguyên định dạng `id` độc lập (`fc-{timestamp}-{random}` hoặc UUID server sinh), tuyệt đối không dùng `idempotencyKey` làm `flashcard.id`.

## Trade-off & Đánh đổi
- **Ưu điểm**:
  - Đảm bảo tính bất biến và toàn vẹn ở tầng DB cao nhất (Unique Constraint).
  - Loại bỏ hoàn toàn khả năng duplicate kể cả khi nhiều request gửi đồng thời (race condition).
  - Tương thích ngược hoàn toàn vì cột `idempotencyKey` là nullable (`String?`).
- **Nhược điểm / Chi phí**:
  - Migration thêm cột và index vào bảng `Flashcard`.
  - Cần duy trì tương thích cho các snapshot backup cũ (khi restore snapshot không có trường `idempotencyKey`).

## Chiến lược dữ liệu cũ (Legacy Data Strategy)
- Trường `idempotencyKey` là nullable (`NULL` hợp lệ).
- Các thẻ flashcard đã tồn tại trước đây giữ nguyên giá trị `NULL`, không tự động sinh giả lập key cho thẻ cũ để tránh sai lệch provenance.
- Chỉ các flashcard được tạo mới với yêu cầu idempotency (như từ Mindmap Node) mới mang khóa định danh này.

## Kế hoạch Rollback
- Khi cần rollback migration, migration down sẽ xóa unique index và drop cột `idempotencyKey`:
  ```sql
  DROP INDEX IF EXISTS "Flashcard_idempotencyKey_key";
  ALTER TABLE "Flashcard" DROP COLUMN IF EXISTS "idempotencyKey";
  ```
- Thao tác rollback không làm mất dữ liệu nội dung, lịch sử ôn tập (SRS schedule) của các flashcards hiện có.

## Đánh giá rủi ro
- **Rủi ro trùng lặp Unique Index**: Vì đây là cột mới thêm với giá trị mặc định là `NULL` cho toàn bộ bản ghi cũ, PostgreSQL cho phép nhiều bản ghi có giá trị `NULL` trong Unique Index (chuẩn ANSI SQL). Do đó rủi ro khi chạy migration là 0%.
- **Bảo toàn Backup / Restore**: Các snapshot backup schema v2.0.0 cũ khi restore với chế độ `replace` hoặc `merge` vẫn sẽ hoạt động ổn định vì schema parse cho phép trường `idempotencyKey` là `optional()`.

