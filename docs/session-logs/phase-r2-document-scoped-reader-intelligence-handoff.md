# Phase R2 Handoff — Document-Scoped Reader Intelligence

## 1. Session metadata
- **Project path:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Phase:** Phase R2 — Document-Scoped Reader Intelligence
- **Date:** 2026-09-19
- **Current branch:** `main`
- **HEAD:** `b1fd2b83d032f234ff1a628a6c151a3601323c31` (`b1fd2b8`)
- **origin/main:** `b1fd2b83d032f234ff1a628a6c151a3601323c31` (`b1fd2b8`)
- **Session status:** Completed, Verified, Committed & Pushed to remote

---

## 2. Delivered scope

1. **Document-Scoped Highlights Binding:**
   - Trích xuất danh sách highlight/excerpt thuộc tài liệu đang đọc từ nguồn chân lý duy nhất (SSOT): `researchInboxItems[].excerpt`.
   - Áp dụng bộ lọc `excerpt.archivedDocumentId === activeDocumentId`.
   - Hiển thị danh sách highlight tương ứng của tài liệu trên Sidebar Tab Đánh dấu.

2. **Highlight Navigation:**
   - Bổ sung callback `onSelectExcerpt` cho `<ReaderSidebar />`.
   - Hỗ trợ tương tác click chuột và bàn phím (`Enter`, `Space`) trên từng highlight card.
   - Điều hướng tài liệu chính xác theo locator với thứ tự ưu tiên: `headingId` $\rightarrow$ `pageNumber` $\rightarrow$ `cfi`.

3. **Document-Scoped Notes Scoping:**
   - Lọc danh sách `notes` liên kết theo 4 tầng ưu tiên (4-tier precedence):
     - **Tier 1:** `note.id === excerpt.targetNoteId` của bất kỳ excerpt nào thuộc active document.
     - **Tier 2:** `note.content` chứa marker chuẩn hóa `archive://<activeDocumentId>`.
     - **Tier 3:** `note.sourcePath` khớp với định danh `activeDocumentId` (bao gồm chuẩn hóa đuôi file `.md`, `.epub`, `.pdf`).
     - **Tier 4:** `note.content` chứa trích dẫn tiêu đề theo heuristic fallback (`*<activeDocumentTitle>*` hoặc `— *<activeDocumentTitle>*`).
   - Loại trừ hoàn toàn các note không liên quan và kích hoạt clean empty state khi không có note nào khớp.

4. **Citation Provenance & Backlink Readiness:**
   - Chuẩn hóa cấu trúc URL `archive://{documentId}?loc={locator}`.
   - Tạo blockquote markdown chứa citation provenance chuẩn xác.
   - Sẵn sàng tích hợp cho luồng deep-link hai chiều ở các giai đoạn tiếp theo.

---

## 3. Commits

| Commit | Message | Scope | Remote status |
|---|---|---|---|
| `dfbf068` | `feat(reader): bind document-scoped highlights and notes in unified reader sidebar` | Production Logic (`ReaderSidebar.tsx`, `UnifiedResearchReader.tsx`) | Pushed (`origin/main`) |
| `b1fd2b8` | `test(reader): add document-scoped reader intelligence coverage` | Test Coverage (`reader-sidebar-highlights`, `reader-sidebar-document-notes`, `excerpt-citation-provenance`) | Pushed (`origin/main`) |

---

## 4. Verification evidence

- **Phase R2 Core Tests:** `17/17 passed (100%)`
  - `tests/unit/reader-sidebar-highlights.test.tsx` (3/3 tests)
  - `tests/unit/reader-sidebar-document-notes.test.tsx` (3/3 tests)
  - `tests/unit/excerpt-citation-provenance.test.ts` (11/11 tests)
- **Adjacent Reader / Research Tests:** `22/22 passed (100%)`
  - `tests/unit/reader-sidebar-navigation.test.tsx` (3/3 tests)
  - `tests/unit/reader-selection-toolbar.test.tsx` (6/6 tests)
  - `tests/unit/excerpt-citation-snapshot.test.ts` (4/4 tests)
  - `tests/unit/note-excerpt-insertion.test.ts` (3/3 tests)
  - `tests/integration/research-inbox-source-locator.test.tsx` (3/3 tests)
  - `tests/integration/research-inbox-flow.test.tsx` (3/3 tests)
- **Reader Integration & Format Adapters:** `15/15 passed (100%)`
  - `tests/integration/docs-explorer-vault-markdown-reader.test.tsx` (1/1 test)
  - `tests/integration/unified-reader-epub-md.test.tsx` (6/6 tests)
  - `tests/integration/unified-reader-runtime-fetch.test.tsx` (2/2 tests)
  - `tests/unit/markdown-reader-adapter.test.tsx` (6/6 tests)
- **Tổng cộng kiểm thử tự động:** `54/54 tests passed (100%)` trên 13 test suites.
- **TypeScript Typecheck:** `npm run typecheck` $\rightarrow$ `0 errors` (Clean).

---

## 5. Protected WIP

- **File được bảo vệ:** `tests/unit/obsidian-document-viewer.test.tsx`
- **Trạng thái:** Modified cục bộ từ các phiên trước (pre-existing modified state).
- **Phạm vi:** Hoàn toàn nằm ngoài phạm vi của Phase R2.
- **Quy tắc an toàn:** Tuyệt đối không reset, clean, restore, stage, hoặc commit file này khi chưa có phê duyệt riêng từ Human Gate.

---

## 6. Architecture decisions

1. **Highlight Single Source of Truth:**
   - Trong Phase R2, `researchInboxItems[].excerpt` đóng vai trò là SSOT duy nhất của highlights.
   - Không sinh thêm store/state rời rạc nhằm giữ dữ liệu luôn đồng bộ với Research Inbox.
2. **Zero Schema / Zero API Impact:**
   - Không thay đổi Prisma database schema.
   - Không tạo hoặc sửa đổi backend API endpoints.
   - Toàn bộ logic lọc và điều hướng được thực hiện client-side thông qua pure React hooks (`useMemo`, `useCallback`).
3. **4-Tier Scoped Notes Precedence:**
   - Thứ tự ưu tiên lọc note: `targetNoteId` $\rightarrow$ `archive:// URI marker` $\rightarrow$ `sourcePath` $\rightarrow$ `title citation fallback`.
   - Giúp hỗ trợ linh hoạt cả note tạo mới từ Reader lẫn note import từ Obsidian vault ngoài.
4. **Backlink-Ready Provenance:**
   - Sử dụng URI scheme `archive://{documentId}` chuẩn hóa làm neo liên kết dữ liệu.

---

## 7. Known limitations

1. **Full Clickable Backlink Surface:**
   - Hiện tại click navigation mới hỗ trợ chiều `Highlight Card -> Reader Position`.
   - Chiều ngược lại từ `Note Card -> Reader Position` (deep-link từ nội dung ghi chú) chưa được kích hoạt trên mọi UI surface.
2. **Title Matching Heuristic:**
   - Tier 4 dựa vào so khớp tiêu đề văn bản (`*<title>*`), có thể tiềm ẩn tỷ lệ nhỏ false positive nếu tiêu đề quá ngắn hoặc trùng với từ phổ thông.
3. **Highlight Lifecycle Dependency:**
   - Vòng đời hiển thị của highlight gắn liền với `researchInboxItems`. Nếu một inbox item bị xóa/dismiss, highlight tương ứng sẽ không còn xuất hiện trong Sidebar.
4. **Sidebar Tab Badge Count:**
   - Chưa tích hợp badge số lượng highlight/note trực tiếp lên thanh tab header của Sidebar.

---

## 8. Recommended next phase

Các hướng phát triển đề xuất cho các Phase tiếp theo (chưa implement):
- **Phase R3 (Note-to-Reader Deep Navigation):** Triển khai deep-link hai chiều cho phép click vào citation trong Note để nhảy trực tiếp tới vị trí tương ứng trong Reader.
- **Tab Counter Badges:** Bổ sung số đếm động trên từng Tab của `ReaderSidebar` (ví dụ: "Đánh dấu (5)", "Ghi chú (3)").
- **Dedicated Highlights Store (Optional):** Tách riêng kho lưu trữ Highlight độc lập nếu có yêu cầu lưu highlight vĩnh viễn không phụ thuộc Inbox.
- **Obsidian Viewer Test Suite Reconciliation:** Xử lý và refactor riêng biệt cho `tests/unit/obsidian-document-viewer.test.tsx`.

---

## 9. Next-session entry checklist

Khi bắt đầu phiên làm việc tiếp theo:
1. Đọc lại handoff document này: `docs/session-logs/phase-r2-document-scoped-reader-intelligence-handoff.md`.
2. Chạy `git status --short` để xác nhận trạng thái working tree.
3. Bảo vệ `tests/unit/obsidian-document-viewer.test.tsx`, không dùng `git add -A` hay `git reset --hard`.
4. Xác nhận `HEAD` và `origin/main` đang đồng bộ tại commit `b1fd2b8`.
5. Thống nhất mục tiêu Phase tiếp theo cùng Human Architect.
6. Tuân thủ nguyên tắc Test-First và lập Spec/ADR trước khi can thiệp mã nguồn.

---

## 10. Final status

Phase R2 — Document-Scoped Reader Intelligence đã hoàn thành toàn diện, vượt qua 100% kiểm thử hồi quy (54/54 tests), đã tạo 2 commits phân nhóm rõ ràng và đã được push lên `origin/main`. Working tree hiện tại sạch sẽ, chỉ còn lại duy nhất file WIP ngoài scope được bảo vệ an toàn.
