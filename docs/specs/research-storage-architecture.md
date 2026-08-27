# Research Storage Architecture v1

**Status:** PROPOSED → IMPLEMENTATION
**Phase:** Research Storage v1
**ADR:** [ADR-015-research-storage-boundary.md](../adr/ADR-015-research-storage-boundary.md)
**Gherkin:** [research-storage-architecture.feature](../gherkin/research-storage-architecture.feature)

---

## 1. Mục Tiêu

Mở rộng lớp lưu trữ theo hướng additive để hỗ trợ:
1. **Multi-topic note**: 1 ghi chú liên kết được với nhiều chủ đề.
2. **Source registry helper**: Loại bỏ tài liệu nguồn trùng lặp qua dedup key.
3. **Normalized tag relation**: Chuẩn hóa tag thành relation thay vì raw `String[]`.
4. **Progress snapshot**: Lưu lịch sử trạng thái học theo từng mốc (append-only).

---

## 2. Phạm Vi Bao Hàm (In Scope)

- Additive TypeScript type fields trên `Note` và `Resource`.
- Pure helper functions không có side effects.
- Prisma schema additive (join tables, nullable columns, new models).
- `ResearchRepositoryV2` adapter wrapping `IDataRepository`.
- Unit tests test-first (failing before implementation).

## 3. Phạm Vi Loại Trừ (Out of Scope)

- ❌ Không sửa UI forms/modals.
- ❌ Không thay thế `DataContext` hoặc `LocalStorageDataRepository`.
- ❌ Không xóa `Note.topicId`, `Topic.tags: String[]`.
- ❌ Không thay đổi storage keys (`phat_hoc_huyen_hoc_clean_v3`).
- ❌ Không thay đổi export/import BackupSnapshot schema.
- ❌ Không thay đổi URI contracts, NotebookLM structure, YAML field names.

---

## 4. Thiết Kế Chi Tiết

### 4.1. Multi-Topic Note

**Hiện tại:**
```typescript
interface Note {
  topicId: string; // 1 note : 1 topic
}
```

**Sau:**
```typescript
interface Note {
  topicId: string;          // giữ nguyên — backward compat primary FK
  topicIds?: string[];      // optional additive — multi-topic support
}
```

**Backward compat rule:** Nếu `topicIds` absent hoặc empty, derive từ `topicId`.  
**Prisma join table:** `NoteTopicLink(noteId, topicId)` — unique(noteId, topicId).  
**Repository write rule:** Khi saveNote có `topicIds`, ghi `topicId = topicIds[0]` để đảm bảo FK cũ hợp lệ.

### 4.2. Source Registry

**Không thêm Prisma model trong phase này.** Source registry là pure in-memory helper.

```typescript
interface SourceRegistryEntry {
  id: string;
  canonicalKey: string; // sha-like: hash(title + url | filePath)
  title: string;
  url?: string;
  filePath?: string;
  resourceIds: string[];
}

// Resource gets optional field:
interface Resource {
  sourceRegistryId?: string; // optional, populated by buildSourceRegistry()
}
```

### 4.3. Normalized Tag Relation

**Hiện tại:** `Topic.tags: String[]` (raw, denormalized).  
**Sau:** Giữ `Topic.tags: String[]` làm cache. Thêm Prisma join table `TopicTag(topicId, tagId)` additive.

**Dual-write:** Khi saveTopic qua adapter, ghi cả `tags: String[]` và tạo `TopicTag` records (idempotent upsert).

### 4.4. Progress Snapshot

Append-only model — không replace `StudyProgress`.

```typescript
interface KnowledgeProgressSnapshot {
  id: string;
  topicId: string;
  capturedAt: string; // ISO string
  progressData: StudyProgress; // immutable copy
  triggerReason?: 'manual' | 'session_complete' | 'milestone';
}
```

Prisma model: `KnowledgeProgressSnapshot(id, topicId, capturedAt, progressData: Json, triggerReason?)`.

---

## 5. Pure Functions Contract

| Function | Input | Output | Side Effects |
|---|---|---|---|
| `resolveTopicIds(note)` | `Note` | `string[]` | None |
| `buildSourceRegistry(resources)` | `Resource[]` | `Map<string, SourceRegistryEntry>` | None |
| `normalizeTopicTags(tags)` | `string[]` | `string[]` | None |
| `captureProgressSnapshot(topicId, progress, reason?)` | `string, StudyProgress, string?` | `KnowledgeProgressSnapshot` | None |

---

## 6. Blast Radius

| Layer | Thay đổi | Risk |
|---|---|---|
| `src/types/index.ts` | Additive optional fields | 🟢 None |
| `src/lib/researchStorageHelpers.ts` | New file | 🟢 None |
| `src/services/researchRepositoryV2.ts` | New file, wraps base repo | 🟢 None |
| `prisma/schema.prisma` | 4 additive items | 🟡 Requires migration |
| `src/context/DataContext.tsx` | **Không sửa** | 🟢 None |
| UI components | **Không sửa** | 🟢 None |
| Test suite hiện có | No regression | 🟢 None |

---

## 7. Migration Notes

1. `Note.sourcePath` đã có trong TypeScript types nhưng thiếu trong Prisma schema — thêm nullable column.
2. `prisma migrate dev` cần chạy với `--name research_storage_v1`.
3. Rollback: `DROP TABLE IF EXISTS "NoteTopicLink", "TopicTag", "KnowledgeProgressSnapshot" CASCADE; ALTER TABLE "Note" DROP COLUMN IF EXISTS "sourcePath";`.
4. `Topic.type` comment cập nhật từ hardcoded sang generic (cosmetic, zero-risk).
