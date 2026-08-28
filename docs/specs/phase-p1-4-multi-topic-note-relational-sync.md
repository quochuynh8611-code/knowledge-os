# Technical Specification: Phase P1.4 — Multi-Topic Note Relational Synchronization & Note SourcePath Persistence

## 1. Problem Statement & Motivation
Sau khi hoàn thành P1.2 (TopicTag dual-write sync) và P1.3 (ResearchRepositoryV2 adapter integration trong DataContext), hệ thống đã hỗ trợ chuẩn hóa `Note.topicIds` đa chủ đề trên client-side.
Tuy nhiên, tại tầng Backend Server (`src/server/routes/noteRoutes.ts` và `src/server/routes/syncRoutes.ts`):
1. **Thiếu liên kết quan hệ `NoteTopicLink`**:
   - Model `NoteTopicLink` (`noteId`, `topicId`, unique constraint `[noteId, topicId]`) đã tồn tại trong `prisma/schema.prisma`.
   - Nhưng `noteRoutes.ts` (`POST /notes`, `PUT /notes/:id`) và `syncRoutes.ts` (`POST /sync/hydrate`) chưa tạo hoặc đồng bộ các bản ghi trong bảng `NoteTopicLink`.
2. **Bỏ sót `sourcePath` khi lưu Note**:
   - Trường `Note.sourcePath` (đường dẫn tệp Markdown cục bộ/Obsidian) đã có trong schema Prisma và `src/types/index.ts`, nhưng trong `noteRoutes.ts` và `syncRoutes.ts`, trường này chưa được đưa vào lệnh `prisma.note.create` / `prisma.note.update` / `tx.note.upsert`.
3. **Truy vấn `GET /notes` chưa nạp `topicIds`**:
   - Khi trả về danh sách ghi chú, API chưa map danh sách `additionalTopics` (từ `NoteTopicLink`) thành mảng `topicIds: string[]` để đồng bộ lại với UI.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Đồng Bộ Nguyên Tử `NoteTopicLink` (Transactional Multi-Topic Sync)**:
   - Khi tạo ghi chú (`POST /api/notes`) hoặc cập nhật ghi chú (`PUT /api/notes/:id`), nếu có `topicIds: string[]`, server thực thi trong `prisma.$transaction` để:
     - Ghi bản ghi `Note` với `topicId = resolveTopicIds(note)[0]`.
     - Tự động tạo/cập nhật các liên kết trong `NoteTopicLink` cho tất cả các `topicId` thuộc `topicIds`.
     - Tự động xóa các liên kết `NoteTopicLink` lỗi thời khi cập nhật bỏ bớt topic.
2. **Đồng Bộ Trong Hydration Sync (`POST /api/sync/hydrate`)**:
   - Khi nạp hàng loạt notes, tự động lưu `sourcePath` và tạo các bản ghi `NoteTopicLink` tương ứng trong transaction ACID.
3. **Bảo Toàn `Note.sourcePath`**:
   - Đưa `sourcePath` vào `NoteCreateSchema`, `NoteUpdateSchema`, `prisma.note.create`, `prisma.note.update`, và `tx.note.upsert`.
4. **Hydrate `topicIds` trong `GET /notes`**:
   - `GET /notes` include `additionalTopics: true` và ánh xạ thành `topicIds` trên response JSON, giữ nguyên 100% tương thích ngược với các consumer chỉ đọc `topicId`.

### 2.2. Non-Goals
- Không xóa bỏ cột `Note.topicId` (khóa ngoại đơn 1:1 chính thống được bảo toàn theo ADR-015).
- Không thay đổi Prisma schema DDL (bảng `NoteTopicLink` và cột `Note.sourcePath` đã có sẵn).
- Không làm gián đoạn các ghi chú đơn chủ đề (`topicId` truyền thống).

---

## 3. Relational Dual-Write Architecture

```
                      Client Request: POST /api/notes (or PUT /api/notes/:id)
                      Payload: { title, content, topicId, topicIds: ["top-1", "top-2"], sourcePath }
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Note Controller (noteRoutes.ts)     │
                      │    1. Validate Schema (NoteCreateSchema)│
                      │    2. resolveTopicIds(payload)         │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      Prisma Interactive Transaction    │
                      │      tx.$transaction(async (tx) => {   │
                      ├────────────────────────────────────────┤
                      │ [Step A] tx.note.create / update       │
                      │          - topicId: resolvedIds[0]     │
                      │          - sourcePath: payload.sourcePath
                      │                                        │
                      │ [Step B] If resolvedIds.length > 0:    │
                      │          - Prune obsolete links        │
                      │          - tx.noteTopicLink.upsert     │
                      │            for each tid in resolvedIds │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      HTTP 201/200 Response (Note object with topicId, topicIds, sourcePath)
```

---

## 4. Blast Radius & File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/lib/validation.ts` | **MODIFY** | Bổ sung `topicIds: z.array(z.string()).optional()` vào `NoteSchema`, `NoteCreateSchema`, `NoteUpdateSchema`. |
| `src/server/routes/noteRoutes.ts` | **MODIFY** | Đóng gói create/update note vào transaction, lưu `sourcePath`, đồng bộ `NoteTopicLink`, và nạp `topicIds` trong `GET /notes`. |
| `src/server/routes/syncRoutes.ts` | **MODIFY** | Bổ sung `sourcePath` và đồng bộ `NoteTopicLink` trong vòng lặp upsert note của `POST /sync/hydrate`. |
| `docs/specs/phase-p1-4-multi-topic-note-relational-sync.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-021-multi-topic-note-relational-sync.md` | **NEW** | Quyết định kiến trúc đồng bộ liên kết NoteTopicLink. |
| `docs/gherkin/phase-p1-4-multi-topic-note-relational-sync.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/note-topic-links-sync.test.ts` | **NEW** | Unit test suite kiểm chứng tính đồng bộ nguyên tử của NoteTopicLink và sourcePath. |

---

## 5. Rollback Strategy
Thay đổi hoàn toàn nằm trong các router express và validation schema mở rộng (Two-Way Door). Có thể khôi phục lại code cũ mà không làm ảnh hưởng đến cơ sở dữ liệu.
