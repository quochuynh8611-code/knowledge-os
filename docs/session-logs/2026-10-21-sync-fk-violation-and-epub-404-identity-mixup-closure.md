# Session Log — Sync FK Violation & EPUB 404 Identity Mixup Closure

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Bàn Điều Khiển Nghiên Cứu Đa Lĩnh Vực
- **Thư mục:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Thời gian ghi nhận:** 2026-10-21
- **Chủ đề:** 
  1. Khắc phục lỗi vi phạm khóa ngoại `Note_topicId_fkey` trong quá trình đồng bộ (Sync Hydrate).
  2. Điều tra OODA và giải quyết triệt để lỗi EPUB 404 Identity Mixup trong UI Reader (`DocsExplorerView`).
  3. Kiểm thử Test-First (Red → Green), chạy Full Regression Suite, đẩy 2 commit lên remote và đưa working tree về trạng thái sạch sẽ tuyệt đối.
- **Người yêu cầu (Human):** Mr. Chem
- **Trạng thái tại thời điểm ghi log:** ✅ **Hoàn tất toàn bộ, 2 commit đã push lên remote, working tree 100% clean.**
- **Commits được tạo & push trong session:**
  - `6cf3251`: `fix(sync): resolve Note_topicId_fkey violation via topicIdMap refresh and fk validation`
  - `68ced97`: `fix(reader): prevent vault and docs repo path collision in recent reads projection`

---

## 2. Bối Cảnh & Mục Tiêu

Phiên làm việc tiếp nối sau đợt khắc phục sự cố Broken EPUB Session Recovery (`9e5d45d`). Trong quá trình vận hành thực tế và kiểm thử hệ thống, xuất hiện 2 sự cố độc lập cần xử lý với tính kỷ luật cao:

1. **Sự cố Sync Hydrate FK Violation:** Log runtime máy chủ ghi nhận ngoại lệ `Foreign key constraint violated on the constraint: Note_topicId_fkey` khi client gửi yêu cầu hydrate dữ liệu note chứa topicId mới hoặc chưa kịp ánh xạ trong transaction.
2. **Sự cố EPUB 404 Identity Mixup:** Khi người dùng mở sách (điển hình: sách *Đường Vào Hiện Sinh* của Jiddu Krishnamurti) từ kệ "Đọc gần đây" trên giao diện Docs Explorer, Reader báo lỗi `Không tìm thấy tệp sách (HTTP 404: Not Found)` tại URL gọi sai ranh giới: `/api/obsidian/vault/attachment?path=books%2F09_Tam_Linh_Nhan_Qua_Triet_Hoc%2FDuong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub`.

---

## 3. Chi Tiết Thực Thi & Giải Pháp Kiến Trúc

### 3.1. Sự cố Sync Hydrate FK Violation (`Note_topicId_fkey`)

- **Root Cause:** Trong quá trình xử lý sync hydrate (`src/server/routes/syncRoutes.ts`), khi upsert các Note, nếu `topicId` tham chiếu tới một topic chưa tồn tại trong cơ sở dữ liệu hoặc `topicIdMap` chưa được làm mới sau khi tạo topic, Prisma ném ngoại lệ vi phạm khóa ngoại (`Note_topicId_fkey`), làm ngắt toàn bộ transaction đồng bộ.
- **Giải pháp:**
  - Làm mới (refresh) `topicIdMap` từ cơ sở dữ liệu trước khi thực hiện upsert các note.
  - Kiểm tra tính hợp lệ của khóa ngoại `topicId`; nếu không hợp lệ hoặc không tồn tại trong map/database, fallback về `null` hoặc xử lý an toàn để bảo vệ tính toàn vẹn của transaction.
- **Files thay đổi:**
  - `src/server/routes/syncRoutes.ts`
  - `tests/unit/sync-routes.test.ts`
- **Commit:** `6cf3251`.

---

### 3.2. Sự cố EPUB 404 Identity Mixup trong Docs Explorer

- **Điều tra OODA (Khảo sát toàn diện 6 giả thuyết):**
  1. *Giả thuyết file vật lý bị xóa:* **SAI.** File EPUB tồn tại đầy đủ tại cả 2 nơi:
     - Obsidian Vault: `05_EPUB_Export/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub`
     - Docs Repository: `docs/books/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub`
  2. *Giả thuyết Archive metadata DB sai:* **SAI.** Record trong bảng `ArchivedDocument` chuẩn xác 100%: `sourceType: "vault"`, `sourcePath: "05_EPUB_Export/..."`.
  3. *Giả thuyết Seam bị gãy (Projection Mixup):* **ĐÚNG.** Tại `src/components/docs/DocsExplorerView.tsx`, hai hàm tính danh sách `recentDocs` và `drilldownDocs` sử dụng thuật toán so khớp lỏng lẻo:
     ```typescript
     (arch.fileName && d.relativePath.endsWith(arch.fileName)) ||
     (arch.storageRelPath && d.relativePath.endsWith(arch.storageRelPath))
     ```
     Khi một cuốn sách trong Vault có cùng tên file với một cuốn trong Docs repo, code đã gán đè `matched` item của Docs repo vào bản ghi Vault. Điều này tạo ra một **hybrid object** bất thường: mang ID của Vault (`arch.id`) nhưng lại mang đường dẫn của Docs repo (`books/...`).
  4. *Giả thuyết Reader Routing:* Khi click vào item lai này, `handleDocClick` phát hiện `isVault = true` (dựa trên `arch.sourceType === "vault"`), nhưng do `doc.sourcePath` bị thiếu, code fallback lấy `doc.relativePath` (`books/...`) gửi vào route `/api/obsidian/vault/attachment?path=books/...`. Máy chủ Vault không tìm thấy file này tại thư mục Vault gốc nên trả về HTTP 404.

- **Kỷ luật Test-First (Red → Green):**
  - **Red Stage:** Viết test case `should_preserve_vault_identity_and_path_when_vault_book_shares_filename_with_docs_repo_book` trong `tests/unit/docs-explorer-recent-reads-persisted.test.tsx`. Test mô phỏng sách trùng tên giữa Vault và Docs repo; kết quả Red stage fail chính xác do gọi nhầm `path=books/...`.
  - **Primary Fix (Projection Seam):** Trong `recentDocs` và `drilldownDocs`:
    ```typescript
    const isVaultArch = arch.sourceType === "vault" || arch.storageRelPath?.startsWith("vault://");
    const matched = !isVaultArch ? docs.find(...) : undefined;
    ```
    Nếu bản ghi là của Vault, tuyệt đối cấm so khớp mượn đường dẫn của Docs repo. Với tài liệu Docs repo, đánh dấu minh thị `sourceType: "docs"`.
  - **Secondary Guard (`handleDocClick`):**
    - Kiểm tra `doc.sourceType !== "docs"` trước khi xét cờ `isVault`.
    - Phân giải đường dẫn an toàn theo thứ tự ưu tiên:
      ```typescript
      const cleanVaultPath =
        doc.sourcePath ||
        (matchingArch?.sourceType === "vault" ? matchingArch.sourcePath : undefined) ||
        (matchingArch?.storageRelPath?.startsWith("vault://")
          ? matchingArch.storageRelPath.replace(/^vault:\/\//, "")
          : undefined) ||
        doc.relativePath.replace(/^vault:\/\//, "").replace(/^\/+/, "");
      ```
  - **Green Stage:** Test case mới PASS, toàn bộ suite `docs-explorer-recent-reads-persisted` PASS 5/5.
- **Commit:** `68ced97`.

---

## 4. Kết Quả Kiểm Thử Toàn Diện & Quality Gates

1. **Targeted Tests:**
   - `tests/unit/docs-explorer-recent-reads-persisted.test.tsx`: 5/5 PASS (100%).
   - `tests/unit/sync-routes.test.ts`: PASS 100%.

2. **Reader Regression Suites:**
   - `tests/integration/docs-explorer-broken-epub-recovery.test.tsx`: 12/12 PASS (100%).
   - `tests/unit/docs-explorer-epub-routing.test.tsx`: 3/3 PASS (100%).
   - `tests/unit/epub-reader-url-resolution.test.tsx`: 9/9 PASS (100%).
   - Tổng cộng 4 test files liên quan: 29/29 tests PASS (100% GREEN).

3. **Full System Regression Suite:**
   - Chạy 543 test files / 4,609 tests:
     - **542/543 test files PASS.**
     - **4,608/4,609 tests PASS.**
     - 1 test failure duy nhất: `tests/unit/research-library-view.test.tsx` (case 5.1). Đã kiểm chứng trực tiếp bằng stash: lỗi này là pre-existing regression tồn tại từ trước trên `origin/main` (`831c6a8`), không liên quan đến các commit mới.

4. **Static Analysis & Git Hygiene:**
   - TypeScript Typecheck (`npx tsc --noEmit`): **0 lỗi.**
   - Git Whitespace & Format Check (`git diff --check`): **0 lỗi.**
   - Artifact Cleanup: Đã khôi phục file `docs/session-logs/evidence/t0-discovery.json` (bị tự động ghi đè timestamp trong test run) về trạng thái committed bằng `git restore`.
   - Push thành công cả 2 commit lên remote: `831c6a8..68ced97 main -> main`.

---

## 5. Quy Chuẩn Kiến Trúc Đã Tuân Thủ Tuyệt Đối

1. **Zero-Default Universal Baseline (`ADR-076`):** Không thêm danh mục/chủ đề mặc định, không gian làm việc duy trì clean slate.
2. **Hermetic Test Guard:** Không có network call hay mutation rò rỉ ra ngoài môi trường test.
3. **Server Attachment Router Invariance:** Không sửa đổi server attachment router; lỗi identity mixup được sửa đúng nơi phát sinh (Client projection seam).
4. **Git Hygiene & Human Approval Gate:** Mọi thao tác stage, commit và push đều có sự phê duyệt rõ ràng từ Human trước khi thực hiện.

---

## 6. Trạng Thái Kết Thúc

- **Branch:** `main`
- **HEAD:** `68ced97 fix(reader): prevent vault and docs repo path collision in recent reads projection`
- **Remote:** `origin/main` đã đồng bộ hoàn toàn với local `HEAD`.
- **Working Tree:** Sạch sẽ tuyệt đối (`nothing to commit, working tree clean`).
