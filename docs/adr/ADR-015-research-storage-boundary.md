# ADR-015: Research Storage Architecture v1 — Additive Multi-Topic & Normalized Relations

- **Mã ADR:** ADR-015
- **Trạng thái:** ACCEPTED
- **Ngày tạo:** 2026-08-27
- **Phạm vi:** `src/types`, `src/lib/researchStorageHelpers.ts`, `src/services/researchRepositoryV2.ts`, `prisma/schema.prisma`

---

## 1. Bối Cảnh

Hệ thống hiện tại có `Note.topicId: string` (1:1), `Topic.tags: String[]` (denormalized), không có source dedup, không có progress history. Các giới hạn này cản trở workflow nghiên cứu nâng cao.

## 2. Quyết Định

### D1 — Multi-Topic Note (Additive, Backward Compatible)
- **Giữ nguyên** `Note.topicId: string` làm primary FK.
- **Thêm optional** `Note.topicIds?: string[]` vào TypeScript type.
- **Thêm** Prisma join table `NoteTopicLink(noteId, topicId)`.
- **Rule:** `resolveTopicIds(note)` trả về `topicIds` nếu có, else `[topicId]`.
- **Write rule:** Khi `topicIds` present, `topicId = topicIds[0]`.

### D2 — Source Registry (In-Memory Helper, Phase-1)
- **Không thêm** Prisma model trong phase này.
- Source registry là pure function `buildSourceRegistry(resources)` → `Map`.
- `Resource.sourceRegistryId?: string` optional field trên TypeScript.

### D3 — Normalized Tag Relation (Additive Dual-Write)
- **Giữ nguyên** `Topic.tags: String[]` (backward compat cache).
- **Thêm** Prisma join table `TopicTag(topicId, tagId)`.
- Adapter dual-writes cả hai khi update.

### D4 — Progress Snapshot (Append-Only)
- **Không replace** `StudyProgress`.
- **Thêm** Prisma model `KnowledgeProgressSnapshot(id, topicId, capturedAt, progressData: Json, triggerReason?)`.
- Pure function `captureProgressSnapshot()` tạo snapshot object — không write DB trực tiếp.

## 3. Alternatives Rejected

| Alternative | Lý do từ chối |
|---|---|
| Big-bang rewrite Note schema | Phá backward compat, crash LocalStorage fallback |
| Remove `Topic.tags: String[]` | Phá export/import BackupSnapshot schema |
| Inject ResearchRepositoryV2 vào DataContext | Module-level instantiation — cần big refactor, out of scope |
| Source registry as Prisma model now | Premature — chưa xác định persistence need |

## 4. Invariants Bảo Tồn

- `STORAGE_KEY = "phat_hoc_huyen_hoc_clean_v3"` — không đổi.
- `BackupSnapshotSchema` semver 2.x — không đổi.
- `Note.topicId` không xóa, không optional.
- `Topic.tags: String[]` giữ nguyên trong Prisma.
- Zero Binary Ingestion — `progressData: Json` chỉ lưu metadata số, không binary.

## 5. Rollback Plan

```sql
DROP TABLE IF EXISTS "NoteTopicLink" CASCADE;
DROP TABLE IF EXISTS "TopicTag" CASCADE;
DROP TABLE IF EXISTS "KnowledgeProgressSnapshot" CASCADE;
ALTER TABLE "Note" DROP COLUMN IF EXISTS "sourcePath";
-- Topic.type comment change is cosmetic, no rollback needed
```
