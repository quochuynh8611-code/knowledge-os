# Session Log — Zero-Default Clean-Slate Reset & F5 Resurface Bugfix

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Bàn Điều Khiển Nghiên Cứu Đa Lĩnh Vực
- **Thư mục làm việc:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Thời gian ghi nhận:** 2026-10-25
- **Chủ đề:** Khắc phục triệt để sự cố dữ liệu cũ tự động phục hồi sau khi F5 (Browser Reload) và xây dựng cơ chế Reset Clean-Slate đồng bộ Client-Server chuẩn ADR-076 & ADR-077.
- **Người yêu cầu (Human):** Mr. Chem
- **Trạng thái:** ✅ **Hoàn tất 100%, Quality Gates PASS (Tests 100%, Typecheck 0 lỗi), Database đã về 0 bản ghi sạch sẽ.**

---

## 2. Bối Cảnh & Vấn Đề (Problem Statement)

Người dùng thực hiện xóa toàn bộ dữ liệu trên bảng điều khiển để làm lại từ đầu với không gian làm việc sạch (Clean Slate). Tuy nhiên, sau khi bấm **F5 (Reload trang)**, toàn bộ danh mục, chủ đề, ghi chú và tài nguyên đã xóa lại tự động xuất hiện trở lại trên giao diện.

### Điều tra OODA & Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Lệch pha Client - Server (LocalStorage vs PostgreSQL):**
   - Khi người dùng bấm khôi phục/xóa dữ liệu, `DataContext.resetToDefaultData()` gọi `dataRepository.resetAllData()`.
   - Trong `src/services/dataRepository.ts`, phương thức `ApiDataRepository.resetAllData()` **chỉ gọi duy nhất `this.localFallback.resetAllData()`** (chỉ xóa các key trong `localStorage` của trình duyệt).
   - `ApiDataRepository` hoàn toàn **không gửi bất kỳ HTTP mutation nào** lên backend server (`http://localhost:3000`).
2. **Server không có cơ chế Clean-Slate Reset:**
   - Server Express (`server.ts` & `src/server/routes/`) không có endpoint nào phục vụ việc dọn sạch toàn bộ dữ liệu về trạng thái ban đầu.
3. **Rehydration tự động khi F5:**
   - Khi người dùng nhấn F5, component khởi tạo gọi `dataRepository.loadInitialData()`.
   - Do PostgreSQL tại backend vẫn lưu giữ nguyên vẹn 4 danh mục, 5 chủ đề, 20 ghi chú và 3 tài nguyên cũ, các API `GET /api/topics`, `GET /api/categories`, `GET /api/notes`, `GET /api/resources` trả về dữ liệu cũ.
   - Hệ thống tự động rehydrate dữ liệu này vào React state và ghi ngược lại vào LocalStorage.
4. **Sub-keys & Hàng đợi đồng bộ chưa được dọn:**
   - `LocalStorageDataRepository.resetAllData()` trước đây bỏ sót các key như `_flashcards`, `_research_inbox`, `_research_excerpts`.
   - Hàng đợi `SyncQueueService` chưa có phương thức dọn sạch mutation đang chờ (`clearQueue()`), có rủi ro đồng bộ ngược lại sau reset.

---

## 3. Kiến Trúc Giải Pháp & Chi Tiết Triển Khai (Solution Architecture)

Tuân thủ nghiêm ngặt **Quy tắc Bất biến số 1 (Zero-Default Universal Baseline ADR-076)** và **Quy tắc số 2 (Hermetic Test Guard ADR-077)**:

### 3.1. Backend Service Layer — `executeDatabaseReset(tx)`
- **Tập tin:** `src/server/services/backupService.ts`
- **Chi tiết:** Xây dựng hàm `executeDatabaseReset(tx: any)` sử dụng Prisma transaction xóa sạch toàn bộ 24 bảng theo thứ tự nghịch đảo khóa ngoại (Reverse Foreign-Key Order) đảm bảo không gây lỗi ràng buộc quan hệ:
  ```
  researchInboxItem -> researchExcerpt -> archivedDocument -> researchTimelineEvent ->
  artifactCitation -> artifactImport -> groundedArtifact -> taskPrompt -> sourcePackage ->
  researchSession -> flashcardReview -> flashcardSchedule -> flashcard -> noteTopicLink ->
  topicTag -> knowledgeProgressSnapshot -> knowledgeLink -> studyProgress -> resource ->
  note -> topic -> tag -> category -> syncSession
  ```
- Tích hợp `executeDatabaseReset` vào cả quy trình `executeReplaceRestore` để tối ưu tái sử dụng mã nguồn.

### 3.2. Server Router Layer — Endpoint `POST /api/data/reset`
- **Tập tin:** `src/server/routes/backupRoutes.ts`
- **Chi tiết:** Bổ sung endpoint `POST /data/reset` (được mount tại `/api/data/reset` trong `server.ts`):
  - Chạy `executeDatabaseReset` bên trong `prisma.$transaction`.
  - Ghi log structured event: `DATABASE_RESET_SUCCESS` hoặc `DATABASE_RESET_FAILED`.
  - Trả về payload JSON: `{ success: true, message: "Database has been reset to a zero-default clean slate.", resetAt: ... }`.

### 3.3. Client Sync Queue Service — `clearQueue()`
- **Tập tin:** `src/services/syncQueue.ts`
- **Chi tiết:** Bổ sung phương thức công khai `clearQueue(): void { this.saveQueue([]); }` giúp dọn sạch toàn bộ pending mutations trong queue khi người dùng quyết định reset dữ liệu.

### 3.4. Client Repository Layer — `resetAllData()`
- **Tập tin:** `src/services/dataRepository.ts`
- **Chi tiết:**
  - `LocalStorageDataRepository.resetAllData()`: Mở rộng danh sách `keysToRemove` bao gồm toàn bộ các key hiện đại: `_flashcards`, `_research_inbox`, `_research_excerpts`, `phat_hoc_huyen_hoc_focus_domain`, `phat_hoc_huyen_hoc_sync_queue`, `phat_hoc_huyen_hoc_sync_telemetry`, `knowledge_os_archived_documents`.
  - `ApiDataRepository.resetAllData()`: Gửi request `POST` đến `this.getUrl("/data/reset")` lên backend server, dọn dẹp `localFallback`, và gọi `this.syncQueue.clearQueue()`.

### 3.5. React Context Layer — `resetToDefaultData()`
- **Tập tin:** `src/context/DataContext.tsx`
- **Chi tiết:** Đảm bảo khi gọi `resetToDefaultData()`, toàn bộ state gồm `categories`, `topics`, `notes`, `resources`, `tags`, `researchInboxItems`, `researchExcerpts` được đưa về mảng rỗng `[]`, hủy bỏ focus domain và dừng bộ đếm thời gian.

### 3.6. Công cụ bảo trì CLI — `commercial-reset-db.ts`
- **Tập tin:** `scripts/maintenance/commercial-reset-db.ts`
- **Chi tiết:** Cập nhật script bảo trì gọi trực tiếp `executeDatabaseReset(tx)` bên trong `prisma.$transaction`, sửa lỗi tham chiếu biến sau khi xóa và thực thi thành công việc wipe database đang chạy.

---

## 4. Kiểm Thử & Quality Gates (Verification)

1. **Unit Testing:**
   - `tests/unit/backup-routes.test.ts`: Bổ sung test case số 5 kiểm tra hợp đồng endpoint `POST /data/reset` gọi đúng transaction xóa database. **Kết quả: PASS 5/5**.
   - `tests/unit/guarded-auto-backup-engine.test.ts`: **PASS 9/9**.
   - `tests/unit/guarded-auto-backup-ui.test.tsx`: **PASS 5/5**.
   - `tests/unit/backup-readiness.test.ts`: **PASS 3/3**.
   - `tests/unit/phase2-repository-contract.test.ts`: **PASS 9/9**.
   - `tests/unit/sync-routes.test.ts`: **PASS 8/8**.
   - `tests/unit/commercial-neutralization.test.tsx` & `hermetic-guard.test.ts`: **PASS 8/8**.
   - **Tổng cộng: 47/47 tests PASS 100%**.

2. **TypeScript Typecheck:**
   - `npx tsc --noEmit` $\to$ **0 lỗi (Zero Errors)**.

3. **Kiểm tra trực tiếp trên API Live Server (`http://localhost:3000`):**
   - `curl -s http://localhost:3000/api/topics` $\to$ `[]`
   - `curl -s http://localhost:3000/api/categories` $\to$ `[]`
   - `curl -s http://localhost:3000/api/notes` $\to$ `[]`
   - `curl -s http://localhost:3000/api/resources` $\to$ `[]`
   $\Rightarrow$ Database đã ở trạng thái 0 bản ghi sạch sẽ.

---

## 5. Danh Sách Tập Tin Thay Đổi (Touched Files)

| Đường dẫn | Mục đích thay đổi |
|---|---|
| `src/server/services/backupService.ts` | Thêm hàm `executeDatabaseReset(tx)` dọn sạch 24 model Prisma |
| `src/server/routes/backupRoutes.ts` | Thêm route `POST /data/reset` |
| `src/services/dataRepository.ts` | Kết nối `resetAllData()` ra API backend, dọn sạch toàn bộ key localStorage |
| `src/services/syncQueue.ts` | Thêm hàm `clearQueue()` vào `SyncQueueService` |
| `src/context/DataContext.tsx` | Cập nhật `resetToDefaultData()` dọn sạch inbox và trích dẫn |
| `scripts/maintenance/commercial-reset-db.ts` | Tích hợp `executeDatabaseReset` và sửa tham chiếu biến |
| `tests/unit/backup-routes.test.ts` | Thêm test case cho `POST /data/reset` |
| `docs/session-logs/2026-10-25-zero-default-reset-and-f5-resurface-bugfix.md` | Biên soạn tài liệu lịch sử phiên làm việc |
