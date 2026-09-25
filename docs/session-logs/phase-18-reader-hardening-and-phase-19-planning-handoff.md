# Phase 18 Completion & Phase 19 Handoff — Reader Hardening & Bidirectional Citation Planning

## 1. Session Metadata
- **Project Path:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Phase:** Phase 18 (Completed & Committed Locally) $\rightarrow$ Phase 19 (Observe, Orient & Specification Prepared)
- **Date:** 2026-09-20
- **Current Branch:** `main`
- **Local HEAD:** `dc405b1d2c63e036400ae700b377e503816d11ff` (`dc405b1`)
- **Remote `origin/main`:** `b8b34fd` (Local main ahead `origin/main` by 3 commits)
- **Session Status:** Phase 18 verified & committed locally; Phase 19 specification & test plan drafted; No code pushed to remote.

---

## 2. Delivered Scope (Phase 18)

1. **EPUB Unified Reader Routing & Direct Selection**:
   - Chuyển hướng toàn bộ sách EPUB từ `DocsExplorerView` và `Navbar` vào `UnifiedResearchReader`.
   - `EpubReaderAdapter` tích hợp lắng nghe sự kiện `rendition.on("selected")`, tính toán tọa độ viewport cho `UnifiedSelectionToolbar`, đồng thời trích xuất EPUB CFI locator.
   - Loại bỏ hoàn toàn sự phụ thuộc vào `FileViewer` cũ đối với định dạng EPUB.

2. **Research Inbox & Reader Sidebar Hard Delete**:
   - Bổ sung hàm `deleteInboxItem` vào `DataContext` giúp xóa vĩnh viễn trích đoạn khỏi React state và `localStorage` (`safeSetLocalStorageItem`).
   - Thêm nút xóa trực tiếp (`Trash2`) với `aria-label="Xóa trích đoạn"` tại `ResearchInboxDrawer` và `aria-label="Xóa điểm trích"` tại `ReaderSidebar`.

3. **Persistence Safety Contracts & Data Synchronization**:
   - Khóa chặt luồng lưu trích đoạn vào ghi chú (`appendExcerptToNote`): nếu repository gặp lỗi lưu trữ, luồng xử lý dừng ngay lập tức, không cập nhật ghi chú cục bộ giả và giữ nguyên item trong Inbox để retry.
   - Cập nhật state `notes` đồng bộ tức thì sau khi lưu thành công, bảo toàn marker `<!-- archive://${documentId} -->` trong citation blockquote.
   - Khắc phục triệt để các vấn đề race condition và async hydration trong test harness bằng cách stub `fetch` và đảm bảo dual-key `localStorage` (`phat_hoc_huyen_hoc_clean_v3` và `phat_hoc_huyen_hoc_clean_v3_notes`).

4. **Obsidian Read-Only Vault Boundary Invariant**:
   - Toàn bộ trích đoạn, ghi chú và inbox item chỉ được lưu trữ và quản lý trong Knowledge OS application state / PostgreSQL / localStorage.
   - Tuyệt đối không ghi đè, sửa đổi hay tạo file trong thư mục Obsidian Vault vật lý (tuân thủ ADR-064 / ADR-075 / ADR-076).

---

## 3. Local Commits Log

| Commit | Hash | Message | Scope | Remote Status |
|---|---|---|---|---|
| **HEAD** | `dc405b1` | `feat(reader): harden EPUB unified reader flow, research inbox and note save safety contracts` | Production Logic, Tests & Walkthrough (23 files) | Unpushed (Local only) |
| **HEAD~1** | `7af2b0f` | `fix(reader): clear legacy inbox storage and tighten generic id matching` | Storage resilience & ID matching | Unpushed (Local only) |
| **HEAD~2** | `869d496` | `fix(reader): stabilize document identity and selection actions` | Selection actions & Reader document identity | Unpushed (Local only) |

---

## 4. Verification Evidence

- **Phase 18 Core Targeted Suites:** `43/43 tests passed (100%)`
  - `tests/unit/docs-explorer-epub-routing.test.tsx` (3 tests)
  - `tests/unit/research-inbox-hard-delete.test.tsx` (3 tests)
  - `tests/unit/reader-save-note-scoping.test.tsx` (8 tests)
  - `tests/unit/safe-clipboard-copy.test.tsx` (7 tests)
  - `tests/unit/epub-reader-url-resolution.test.tsx` (9 tests)
  - `tests/unit/epub-selection-toolbar-actions.test.tsx` (5 tests)
  - `tests/unit/navbar-obsidian-readonly-flow.test.tsx` (4 tests)
  - `tests/integration/vault-file-open-reader.test.tsx` (4 tests)
  - `tests/integration/unified-reader-epub-md.test.tsx` (2 tests)
- **Full Repository Regression:** `339/339 test files passed (2,276 passed | 3 skipped | 0 failed)`
- **TypeScript Typecheck:** `npx tsc --noEmit` $\rightarrow$ `0 errors` (Clean)
- **Git Diff Hygiene:** `git show --check HEAD` $\rightarrow$ `0 whitespace errors`

---

## 5. Phase 19 Planning: Bidirectional Citation Deep-Link Navigation

### 5.1. Định Hướng & Vấn Đề (Problem Statement)
- Hiện tại, trích dẫn lưu trong ghi chú mang URI `archive://{documentId}?loc={locator}` nhưng hiển thị dưới dạng tĩnh trong tab Ghi chú của Sidebar.
- Mục tiêu Phase 19: Triển khai điều hướng hai chiều (Note $\leftrightarrow$ Reader), cho phép click vào trích dẫn trong ghi chú để nhảy ngay lập tức đến đúng trang sách/vị trí văn bản gốc trong Reader.

### 5.2. Ranh Giới Kỹ Thuật (Boundary & Invariants)
1. **URI Idempotency:** Nhận diện và phân tích an toàn scheme `archive://{docId}?loc={locator}`.
2. **Current-Document Fast Path:** Nếu `docId === activeDocumentId`, cuộn/chuyển trang in-memory mà không nạp lại tài liệu.
3. **Cross-Document Transition:** Nếu khác `docId`, chuyển đổi context qua `setActiveReaderDoc` với `initialPosition = locator`.
4. **Tab Badges:** Bổ sung số đếm động trên các tab của `ReaderSidebar` ("Đánh dấu (N)", "Ghi chú (N)").
5. **Zero Vault Write:** Chỉ đọc và điều hướng, không ghi vào Vault.

### 5.3. Kịch Bản Gherkin Sẵn Sàng Cho Phase 19
- **Scenario 1:** Click citation trong Markdown note $\rightarrow$ cuộn tới heading ID tương ứng.
- **Scenario 2:** Click citation card sách EPUB $\rightarrow$ gọi `rendition.display(cfi)` tới đúng vị trí.
- **Scenario 3:** Locator không tồn tại trong tài liệu $\rightarrow$ hiển thị toast cảnh báo nhẹ, không crash.
- **Scenario 4:** Reload trang $\rightarrow$ deep-link trong ghi chú vẫn sẵn sàng điều hướng.
- **Scenario 5:** Đảm bảo 100% request qua lại chỉ là GET read-only, không có write vào Vault.

---

## 6. Next-Session Entry Checklist

Khi bắt đầu phiên làm việc tiếp theo:
1. Đọc lại handoff document này: `docs/session-logs/phase-18-reader-hardening-and-phase-19-planning-handoff.md`.
2. Chạy `git status --short` để kiểm tra working tree.
3. Kiểm tra `git log -1` để xác nhận đang ở HEAD `dc405b1`.
4. Xác nhận quyết định với Human Gate trước khi viết test đỏ (Red Stage) cho Phase 19.
5. Tuân thủ nghiêm ngặt nguyên tắc Test-First, blast-radius defense và Obsidian Read-only boundary.
