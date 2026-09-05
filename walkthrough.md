# Walkthrough: Knowledge OS — Obsidian Vault Bridge (P4.1-P4.2F) Subsystem

## Tổng Quan Subsystem

Subsystem **Obsidian Vault Bridge** đã hoàn thành toàn bộ lộ trình 7 giai đoạn liên hoàn (từ **P4.1** đến **P4.2F**) nhằm kết nối an toàn và hiệu quả giữa **Obsidian Vault** cục bộ và **Knowledge OS** theo nguyên lý **Read-Only Vault Bridge** ([ADR-064](docs/adr/ADR-064-read-only-obsidian-vault-bridge.md), [Spec](docs/specs/phase-p4-1-read-only-obsidian-vault-bridge.md), [Gherkin](docs/gherkin/phase-p4-1-read-only-obsidian-vault-bridge.feature)):

1. **Single Source of Truth (SSOT)**: Toàn bộ ghi chú Markdown, thư mục, tệp đính kèm và media được lưu trữ và quản lý độc quyền tại Obsidian Vault cục bộ của người dùng.
2. **Read-Only & Zero Database Bloat**: Knowledge OS chỉ lưu trữ metadata liên kết (`Resource` type `md`: `filePath`, `title`, `notes`) trong cơ sở dữ liệu PostgreSQL; không sao chép raw Markdown body vào DB.
3. **Hardened Security & Boundary Protection**:
   - 12-step path guard chặn Path Traversal (`..`, URL encoded `%2e%2e`), từ chối Symbolic Links (`403 SYMLINK_NOT_ALLOWED`), ẩn đường dẫn máy chủ qua placeholder (`[VAULT_ROOT]`).
   - Lọc bỏ mã HTML nguy hại (`<script>`, `<iframe>`, `on*=` handlers) và các scheme URL không an toàn (`javascript:`, `data:`, `vbscript:`, `file:`).
4. **Non-Destructive Operations**: Thao tác hủy liên kết chỉ xóa bản ghi Resource metadata trong Knowledge OS; hoàn toàn không tác động đến tệp vật lý trong Obsidian Vault.

---

## Chi Tiết Các Giai Đoạn & 15 Commits trên Branch `neh1`

| Phase | Tính Năng Nòng Cốt | Commits Đã Tạo | Files Chính |
| :--- | :--- | :--- | :--- |
| **P4.1** | Read-Only Vault Bridge Backend & Topic-Linked Viewer | `e36cdf7`, `549a1ce` | `src/lib/obsidianPathSanitizer.ts`, `src/server/routes/obsidianVaultRoutes.ts`, `src/components/modals/ObsidianDocumentViewerModal.tsx`, `src/components/modals/ObsidianTopicResourceLinkModal.tsx` |
| **P4.2A** | Vault Tree Browser & Secure Directory Listing | `4b0083f`, `49003a0` | `src/server/routes/obsidianVaultTree.ts`, `src/components/modals/ObsidianVaultBrowserModal.tsx`, `src/components/topics/TopicDetail.tsx` |
| **P4.2B** | In-Memory Full-Text Search | `79d6493`, `b19bc55` | `src/lib/obsidianIndexBuilder.ts`, `src/server/routes/obsidianSearchRoutes.ts`, `src/components/modals/ObsidianVaultBrowserModal.tsx` |
| **P4.2C** | Wiki-Link Resolver & In-Place Navigation | `2a6bd02`, `2f7e3b0` | `src/lib/obsidianWikiLinkResolver.ts`, `src/lib/markdownReadability.tsx`, `src/components/modals/ObsidianDocumentViewerModal.tsx` |
| **P4.2D** | Attachment Streaming & Media Embed Rendering | `f6c0fa2`, `816adbc` | `src/server/routes/obsidianAttachmentRoutes.ts`, `src/lib/obsidianPathSanitizer.ts`, `src/lib/markdownReadability.tsx` |
| **P4.2E** | Live File Watcher (SSE Auto-Refresh) | `4e2febf`, `5b61539` | `src/lib/obsidianFileWatcher.ts`, `src/server/routes/obsidianWatcherRoutes.ts`, `src/components/modals/ObsidianDocumentViewerModal.tsx` |
| **P4.2F** | Note Transclusion (`![[Note]]` & `![[Note#Heading]]`) | `c5aab04`, `b884f26`, `67ab1c5` | `src/lib/obsidianTransclusionResolver.ts`, `src/lib/markdownReadability.tsx`, `src/components/modals/ObsidianDocumentViewerModal.tsx` |

---

## Thống Kê Thay Đổi Mã Nguồn (Diff Statistics)

* **Tổng file tác động**: 47 files
* **Tổng dòng thay đổi**: **+7,699 dòng thêm mới, -113 dòng tinh chỉnh**

---

## Kết Quả Kiểm Thử & Xác Minh (Test Verification)

1. **Targeted Test Suites chuyên biệt cho Obsidian Bridge**:
   - **25 test files passed / 176 targeted tests passed (100% test pass rate)**.
   - Kiểm chứng các kịch bản biên an toàn: path traversal, symlink rejection, frontmatter parsing, circular transclusion, max depth limits, wiki-links, SSE auto-refresh, attachment streaming.

2. **Toàn Bộ Test Suite Toàn Hệ Thống**:
   - **218 test files passed / 1,394 unit & integration tests passed (0 failures; 100% test pass rate)**.
   - *Lưu ý*: Chỉ số trên phản ánh tỷ lệ test vượt qua (test pass rate); code coverage percentage của mã nguồn chưa được đo lường qua công cụ coverage riêng biệt.

3. **TypeScript & Static Analysis**:
   - `npm run lint` (`tsc --noEmit`): **0 errors, 0 warnings**.

4. **Production Build**:
   - `npm run build`: Hoàn thành thành công (Vite production bundle + `dist/server.cjs`).

---

## Tài Liệu Tham Khảo & Release Notes

* 📖 **Release Notes Chi Tiết (P4.1 – P4.2F)**: [`docs/releases/P4.1-P4.2F-release-notes.md`](docs/releases/P4.1-P4.2F-release-notes.md)
* 📖 **Quyết Định Kiến Trúc (ADR-064)**: [`docs/adr/ADR-064-read-only-obsidian-vault-bridge.md`](docs/adr/ADR-064-read-only-obsidian-vault-bridge.md)
* 📖 **Bản Đặc Tả Kỹ Thuật (Spec P4.1)**: [`docs/specs/phase-p4-1-read-only-obsidian-vault-bridge.md`](docs/specs/phase-p4-1-read-only-obsidian-vault-bridge.md)
* 📖 **Gherkin Scenarios**: [`docs/gherkin/phase-p4-1-read-only-obsidian-vault-bridge.feature`](docs/gherkin/phase-p4-1-read-only-obsidian-vault-bridge.feature)


