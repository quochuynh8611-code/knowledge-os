# ADR-021: Đồng Bộ Liên Kết Ghi Chú Đa Chủ Đề (Multi-Topic Note Relational Sync & SourcePath Persistence)

- **Mã ADR:** ADR-021
- **Trạng thái:** PROPOSED (PLANNING ONLY)
- **Ngày tạo:** 2026-08-28
- **Đề xuất bởi:** Staff Software Engineer / Technical Architect
- **Phạm vi:** `src/server/routes/noteRoutes.ts`, `src/server/routes/syncRoutes.ts`, `src/lib/validation.ts`, `prisma/schema.prisma`

---

## 1. Bối Cảnh (Context)
Theo ADR-015 (Quyết định D1), mô hình dữ liệu hỗ trợ ghi chú đa chủ đề (Multi-Topic Note) thông qua bảng liên kết `NoteTopicLink` (`noteId`, `topicId`), đồng thời giữ lại cột `Note.topicId` làm khóa ngoại đơn (primary FK) để đảm bảo tương thích ngược 100%. Ngoài ra, thuộc tính `Note.sourcePath` đã được bổ sung vào schema để lưu đường dẫn file Markdown/Obsidian.
Trước Phase P1.4, tầng backend routes (`noteRoutes.ts` và `syncRoutes.ts`) chỉ thực hiện ghi đơn lẻ vào `Note.topicId` mà chưa đồng bộ sang `NoteTopicLink`, đồng thời bỏ sót trường `sourcePath` khi gọi Prisma create/update.

---

## 2. Quyết Định Kiến Trúc (Architecture Decisions)

1. **Đồng Bộ Giao Dịch ACID (Prisma Interactive Transaction)**:
   - Khi tạo hoặc cập nhật ghi chú qua `POST /api/notes` hoặc `PUT /api/notes/:id`:
     - Tự động phân giải `resolvedTopicIds = resolveTopicIds(payload)`.
     - Gán `primaryTopicId = resolvedTopicIds[0]`.
     - Ghi bản ghi `Note` kèm `sourcePath: payload.sourcePath`.
     - Đồng bộ các bản ghi `NoteTopicLink` (tạo mới các liên kết đến các `topicId`, xóa các liên kết lỗi thời).
2. **Đồng Bộ Trong Hydration Sync**:
   - Khi nạp batch qua `POST /api/sync/hydrate`, tự động lưu `sourcePath` và tạo `NoteTopicLink` cho mỗi topic thuộc note.
3. **Mở Rộng Validation Schema**:
   - Bổ sung `topicIds: z.array(z.string()).optional()` và `sourcePath: z.string().optional()` vào `NoteCreateSchema` và `NoteUpdateSchema`.
4. **Hydrate Dữ Liệu Khi Đọc (`GET /notes`)**:
   - `GET /notes` include `additionalTopics: { include: { topic: true } }` và map thành `topicIds: string[]` trên response JSON.

---

## 3. Đánh Giá Trade-offs: Hai Chiều (Two-Way Door)

- **Ưu điểm**:
  - Bảo đảm toàn vẹn quan hệ đa chủ đề giữa Note và Topic trên PostgreSQL.
  - Lưu trữ bền vững đường dẫn file nguồn `Note.sourcePath`.
  - Giữ nguyên 100% tương thích ngược với client cũ chỉ đọc `topicId`.
- **Rủi ro kiểm soát**: Rất thấp (Được bảo vệ bởi Prisma transaction và test-first suite).
