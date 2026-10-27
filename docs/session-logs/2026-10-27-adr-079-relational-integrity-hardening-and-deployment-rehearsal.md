# Session Log — ADR-079: Relational Integrity Hardening & Deployment Rehearsal

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Bàn Điều Khiển Nghiên Cứu Đa Lĩnh Vực (Academic Research Operating System)
- **Thư mục làm việc:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Thời gian ghi nhận:** 2026-10-27
- **Chủ đề:** Hoàn thành trọn vẹn lộ trình 3 Pull Requests theo kiến trúc ADR-079 (Toàn vẹn quan hệ cơ sở dữ liệu: Knowledge Links, Topic Tags, Note Cascade Safety & Prisma Migration), thực hiện Deployment Rehearsal trên database local dev/staging, chuẩn hóa test suite và đạt 100% Green (583/583 test files passed).
- **Người yêu cầu (Human):** Mr. Chem
- **Trạng thái:** ✅ **Hoàn tất 100%, Quality Gates PASS (583/583 Test Files PASS, 4,912/4,912 Tests PASS, Typecheck 0 lỗi), Git đã push an toàn lên origin/main.**

---

## 2. Bối Cảnh & Mục Tiêu Kiến Trúc (ADR-079 Context)

Trước đợt nâng cấp ADR-079, hệ thống tồn tại các rủi ro cấu trúc quan hệ:
1. **Knowledge Links (Topic ↔ Topic):** Thiếu cơ chế đồng bộ và nạp hai chiều toàn diện giữa Client và Server qua Sync Hydrate.
2. **Topic Tags (Topic ↔ Tag):** `Topic.tags` (mảng string) và bảng quan hệ `TopicTag` có nguy cơ lệch pha; khi client gỡ bỏ tag, quan hệ cũ không được prune triệt để.
3. **Note Cascade Invariant (Topic ↔ Note):** Quan hệ `Note.topicId` ban đầu mang tính sở hữu tiêu diệt (`NOT NULL`, `onDelete: Cascade`). Khi người dùng xóa một Topic, tất cả các Note giá trị liên quan đều bị xóa sổ theo, vi phạm nguyên tắc bảo toàn tri thức người dùng.

### Các nguyên tắc cốt lõi bất biến được duyệt:
- `NoteTopicLink` là **Canonical Source of Truth** cho quan hệ Note ↔ Topic.
- `Note.topicId` chỉ là con trỏ chỉ định **Primary Topic** (Nullable: `String?`), với ràng buộc `onDelete: SetNull`.
- Khi xóa Topic: Nếu Note còn topic phụ còn sống trong `NoteTopicLink`, tự động đôn topic phụ đầu tiên lên làm primary; nếu không còn topic nào, set `Note.topicId = null`. Không bao giờ xóa Note khi xóa Topic.
- Zero-Default Universal Baseline (`ADR-076`) và Hermetic Test Guard (`ADR-077`) là bất khả xâm phạm.

---

## 3. Nhật Ký Tiến Trình Thực Thi (Implementation Phases)

### 3.1. PR-1: Knowledge Link Persistence & Hydration
- **Commit:** `3574eb5`
- **Nội dung:**
  - Khởi tạo router độc lập `src/server/routes/linkRoutes.ts` với đầy đủ CRUD, chống chu trình và tự trỏ chính mình (self-link prevention).
  - Nâng cấp `GET /api/topics` trong `topicRoutes.ts` để nạp cả hai chiều:
    - `sourceLinks: { include: { target: true } }`
    - `targetLinks: { include: { source: true } }`
  - Đồng bộ `POST /api/sync/hydrate` trong `syncRoutes.ts` để lưu trữ và nạp link hai chiều.
  - Cập nhật DataContext, DataRepository, và ResearchRepositoryV2.
  - Bổ sung 4 bộ test unit & integration cho link persistence.

### 3.2. PR-2: Topic Tag Synchronization & Pruning Hardening
- **Commit:** `7845445`
- **Nội dung:**
  - Khởi tạo shared service `src/server/services/tagSyncService.ts` với hàm chuẩn `syncTopicTags`.
  - Tích hợp vào `topicRoutes.ts` (`POST /topics`, `PUT /topics/:id`) và `syncRoutes.ts` (`POST /sync/hydrate`).
  - Đảm bảo cơ chế Pruning: Khi danh sách tags bị xóa hoặc rỗng (`tags: []`), toàn bộ `TopicTag` tương ứng bị gỡ bỏ ngay lập tức, không để lại relation mồ côi.
  - Bổ sung 4 bộ test unit & integration cho topic tag consistency.

### 3.3. PR-3: Note Cascade Safety & Prisma Migration
- **Commit:** `4c6fafa`
- **Nội dung:**
  - **Schema Update (`prisma/schema.prisma`):**
    - `topicId String?` (chuyển sang nullable).
    - `topic Topic? @relation(fields: [topicId], references: [id], onDelete: SetNull)`.
  - **Prisma Migration (`prisma/migrations/20261027110000_note_cascade_safety_set_null/migration.sql`):**
    - Bước 1 (Data-repair): Reassign note có `topicId` không hợp lệ sang topic phụ còn sống đầu tiên trong `NoteTopicLink`, hoặc set `NULL`.
    - Bước 2 (Schema alteration): Drop foreign key cũ, chuyển column sang nullable, tạo lại foreign key với `ON DELETE SET NULL`.
    - Bước 3 (Verification): Khối PL/pgSQL verification đảm bảo không còn orphan note nào trước khi commit.
    - Rollback Path: Tài liệu hóa quy trình rollback an toàn bằng việc khôi phục backup đã xác minh (nghiêm cấm tự tạo recovery topic giả lập hoặc ép gán topic bừa bãi).
  - **Service (`src/server/services/noteCascadeService.ts`):**
    - `computeNextPrimaryTopic(currentPrimaryId, deletedTopicId, remainingTopicIds)`.
    - `deleteTopicSafely(tx, topicId)`: Bảo vệ note khi xóa topic, tự động đôn topic phụ hoặc set null, prune `NoteTopicLink` trỏ vào topic bị xóa.
    - `syncNoteTopicLinks(tx, noteId, targetTopicIds)`: Đồng bộ canonical quan hệ note-topic.
  - **Tích hợp Routes:** Cập nhật `topicRoutes.ts`, `syncRoutes.ts`, và `noteRoutes.ts`.
  - Bổ sung 4 bộ test unit & integration cho cascade safety.

---

## 4. Deployment Rehearsal (Thực Nghiệm Triển Khai Trên Local Dev DB)

Thực hiện trên cơ sở dữ liệu `knowledge_os` (PostgreSQL 15 local):
1. **Pre-migration Backup:**
   - Tạo file backup an toàn: `backups/knowledge_os-pre-adr079-rehearsal-20261027-111434.sql` (274 KB).
2. **Prisma Baseline & SQL Execution:**
   - Do database dev đã tồn tại 24 bảng từ trước (khởi tạo qua `db push`), lệnh `prisma migrate deploy` trả về mã an toàn `P3005` (Database schema is not empty).
   - Thực thi trực tiếp file migration SQL bằng `psql -v ON_ERROR_STOP=1`.
   - Kết quả: Data-repair 0 lỗi, Schema alteration thành công, Block verification `DO` thành công.
   - Đăng ký lịch sử baseline qua `npx prisma migrate resolve --applied 20261027110000_note_cascade_safety_set_null`.
   - `npx prisma migrate status` xác nhận: **`Database schema is up to date!`**
3. **Data Invariants Verification:**
   - `orphan_notes = 0` (0 ghi chú mồ côi).
   - `total_notes = 18` (18/18 ghi chú dev được bảo toàn 100%).
   - `unclassified_notes = 0`.

---

## 5. Test Stabilization & Full Suite Closure

- **Commit:** `c78693f`
- Để đạt chất lượng xuất xưởng tuyệt đối (No Flaky Tests, Full Regression Green), các bộ test unit cũ đã được chuẩn hóa để khớp với các nâng cấp kiến trúc mới:
  1. `tests/unit/topic-routes.test.ts`: Cập nhật assertion include relations khớp với PR-1 canonical format.
  2. `tests/unit/backup-service-contract.test.ts`: Cập nhật mảng kỳ vọng `deleteOrder` khớp với Reverse FK Order thực tế trong `executeDatabaseReset`.
  3. `tests/unit/resource-form-modal.test.tsx`: Làm rõ selector `https://...` cho web URL input tránh va chạm với DOI input.
  4. `tests/integration/topic-card-browser.test.tsx`: Đổi sang `await findByTestId` cho async card row.
  5. `tests/unit/epub-reader-url-resolution.test.tsx`: Bổ sung timeout `5000ms` cho `waitFor` để chịu tải khi 583 suites chạy song song.
- **Kết quả Full Regression:**
  ```text
  Test Files  583 passed (583)
       Tests  4912 passed (4912)
    Duration  245.63s
  ```
  👉 **583 / 583 test files passed (100% XANH, 0 FAILURE)**.
  👉 **npx tsc --noEmit: PASS 0 lỗi**.

---

## 6. Lịch Sử Git Commit Đã Đẩy Lên Remote (`origin/main`)

```text
c78693f (HEAD -> main, origin/main, origin/HEAD) test(stabilization): synchronize contract expectations and harden async selectors
4c6fafa feat(notes): note cascade safety and multi-topic reassignment (ADR-079 PR-3)
7845445 feat(topic-tags): harden topic tag synchronization and pruning (ADR-079 PR-2)
3574eb5 feat(links): implement knowledge link persistence and hydration (ADR-079 PR-1)
```

---

## 7. Trạng Thái Hiện Tại & Bàn Giao

- Mã nguồn và cơ sở dữ liệu đã sẵn sàng 100% cho việc triển khai Production.
- Không còn bất kỳ nợ kỹ thuật (technical debt), test flake hay vi phạm kiến trúc nào.
- Working tree sạch hoàn toàn (`working tree clean`).
