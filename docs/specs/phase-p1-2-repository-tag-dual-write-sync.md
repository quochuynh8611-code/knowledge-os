# Technical Specification: Phase P1.2 — Repository Tag Dual-Write Sync

## 1. Problem Statement
Hiện tại trong cơ sở dữ liệu PostgreSQL (`prisma/schema.prisma`), kiến trúc dữ liệu nhãn (tags) tồn tại ở hai dạng song song:
1. **Denormalized Cache**: `Topic.tags: String[]` (mảng chuỗi lưu trực tiếp trên bảng `Topic` phục vụ tìm kiếm nhanh và tương thích ngược với LocalStorage / BackupSnapshot Semver 2.x).
2. **Normalized Relational Model**: Bảng `Tag` (`id`, `name`, `slug`, `color`, `count`) và bảng liên kết `TopicTag` (`topicId`, `tagId`).

### Vấn Đề Lệch Pha (Divergence Problem):
- Khi người dùng tạo hoặc sửa chủ đề qua `POST /api/topics` hoặc `PUT /api/topics/:id`, mã nguồn server hiện tại (`src/server/routes/topicRoutes.ts`) chỉ thực hiện ghi đè cột `Topic.tags: String[]`.
- Bảng `Tag` và `TopicTag` **hoàn toàn không được cập nhật**, dẫn đến hiện tượng:
  - Bảng liên kết `TopicTag` bị rỗng hoặc không khớp với mảng `Topic.tags`.
  - Chỉ số đếm số lượng chủ đề theo nhãn (`Tag.count`) không chính xác.
  - Các truy vấn quan hệ theo nhãn (`prisma.tag.findMany({ include: { topicTags: true } })`) bị lệch pha so với dữ liệu hiển thị trên giao diện.
- Tương tự, trong endpoint đồng bộ `POST /api/sync/hydrate` (`src/server/routes/syncRoutes.ts`), các chủ đề được nạp vào DB nhưng quan hệ `TopicTag` chưa được tạo tự động.

---

## 2. Goals & Non-Goals

### 2.1. Goals
1. **Đồng Bộ Nguyên Tử (Atomic Dual-Write Sync)**:
   - Khi tạo chủ đề (`POST /api/topics`) hoặc cập nhật chủ đề (`PUT /api/topics/:id`), server tự động đồng bộ cả `Topic.tags: String[]` và các bản ghi trong `Tag` & `TopicTag` trong cùng **1 Prisma Interactive Transaction (`$transaction`)**.
2. **Đồng Bộ Trong Hydration Sync (`POST /api/sync/hydrate`)**:
   - Khi hydrate danh sách topics, tự động upsert các `Tag` tương ứng và tạo liên kết `TopicTag` bên trong transaction ACID.
3. **Chuẩn Hóa Nhãn (Sanitization & Normalization)**:
   - Sử dụng pure function `normalizeTopicTags` (loại bỏ khoảng trắng thừa, loại bỏ tag rỗng, khử trùng lặp) trước khi ghi vào database.
4. **Bảo Toàn 100% Khả Năng Tương Thích (Zero API Drift)**:
   - API contract giữ nguyên 100%: Payload gửi lên và Response trả về của `Topic` vẫn chứa `tags: string[]`.
   - Client-side (`useData()`, `useDomainData()`, `LocalStorageDataRepository`) không bị ảnh hưởng.
   - BackupSnapshot Schema Semver 2.x giữ nguyên vẹn.

### 2.2. Non-Goals
- Không xóa bỏ cột `Topic.tags: String[]` (đây là quyết định 1 chiều bị từ chối theo ADR-015).
- Không yêu cầu thay đổi Prisma schema DDL (các model `Tag` và `TopicTag` đã tồn tại sẵn trong schema).
- Không làm thay đổi giao diện người dùng hay cách người dùng nhập tags.

---

## 3. Architecture & Dual-Write Flow

```
                      Client Request: POST /api/topics (or PUT /api/topics/:id)
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Topic Controller (topicRoutes.ts)   │
                      │    1. Validate Schema                  │
                      │    2. normalizeTopicTags(input.tags)   │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      Prisma Interactive Transaction    │
                      │      tx.$transaction(async (tx) => {   │
                      ├────────────────────────────────────────┤
                      │ [Step A] tx.topic.upsert / create / upd│
                      │          -> writes Topic.tags: String[]│
                      │                                        │
                      │ [Step B] For each tag in tags:         │
                      │          -> tx.tag.upsert(slug, name)  │
                      │          -> tx.topicTag.upsert(topicId)│
                      │                                        │
                      │ [Step C] Delete obsolete TopicTag links│
                      │          (tags removed in update)      │
                      │                                        │
                      │ [Step D] Update Tag.count (aggregates) │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      HTTP 201/200 Response (Full Topic object with tags)
```

---

## 4. Helper & Slug Generation Contract
Để ánh xạ giữa chuỗi tag và bản ghi `Tag`:
```typescript
function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "tag";
}
```

---

## 5. Blast Radius & File Changes Matrix

| File Path | Trạng thái | Nhiệm vụ |
| :--- | :---: | :--- |
| `src/server/routes/topicRoutes.ts` | **MODIFY** | Đóng gói create/update topic vào Prisma transaction đồng bộ `Topic.tags`, `Tag`, và `TopicTag`. |
| `src/server/routes/syncRoutes.ts` | **MODIFY** | Bổ sung đồng bộ `TopicTag` trong vòng lặp upsert topic của `sync/hydrate`. |
| `src/lib/researchStorageHelpers.ts` | **MODIFY / EXTEND** | Bổ sung helper `generateTagSlug` phục vụ ánh xạ slug nhất quán. |
| `docs/specs/phase-p1-2-repository-tag-dual-write-sync.md` | **NEW** | Bản đặc tả kỹ thuật này. |
| `docs/adr/ADR-019-repository-tag-dual-write-sync.md` | **NEW** | Quyết định kiến trúc dual-write transaction. |
| `docs/gherkin/phase-p1-2-repository-tag-dual-write-sync.feature` | **NEW** | Kịch bản kiểm thử BDD. |
| `tests/unit/topic-tag-dual-write.test.ts` | **NEW** | Test suites kiểm chứng tính đồng bộ nguyên tử giữa `Topic.tags` và `TopicTag`. |

---

## 6. Rollback Strategy
Thay đổi hoàn toàn được bảo vệ bên trong Prisma interactive transaction ở tầng server routes (Two-Way Door). Nếu có lỗi phát sinh trong transaction, Prisma tự động rollback 100% trạng thái DB. Nếu cần hoàn tác mã nguồn, chỉ cần rollback code trong `topicRoutes.ts` và `syncRoutes.ts`.
