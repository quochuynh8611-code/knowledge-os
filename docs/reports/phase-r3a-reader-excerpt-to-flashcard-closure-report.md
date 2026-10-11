# Closure Report: Phase R3.A — Reader Excerpt Promotion to Flashcard

**Tài liệu**: Báo cáo hoàn tất kỹ thuật (Technical Closure Report)  
**Mã giai đoạn**: Phase R3.A  
**Phân hệ**: Reader Subsystem ↔ Flashcard Subsystem  
**Người phụ trách**: Staff Software Engineer / Technical Architect  
**Ngày hoàn tất**: 2026-10-11  
**Trạng thái**: ✅ Hoàn tất & Đã kiểm chứng (Verified Locally, Not Staged / Not Pushed)  

---

## 1. Tóm Tắt Kết Quả (Executive Summary)

Phase R3.A đã hoàn thành việc khép kín chu trình từ **Reader Excerpt** sang **Flashcard Active Recall** theo đúng cam kết:
1. **Selection → Create Flashcard**: Giữ nguyên flow mượt mà hiện có, đảm bảo đoạn bôi đen được prefill sang modal kèm trích dẫn nguồn (`FlashcardCitationProvenance`).
2. **Inbox → Promote to Flashcard**: Bổ sung affordance nút icon "Tạo thẻ nhớ" (`Brain`) trên từng item trong tab Inbox của `ReaderSidebar`. Khi click, mở `FlashcardFormModal` với prefill text và provenance được ánh xạ từ `ResearchExcerpt`.
3. **Error-Retention & Staging Contract**:
   - `processInboxItem(item.id)` chỉ được gọi **sau khi** `createFlashcard` thực sự thành công trên repository / API, chuyển trạng thái item sang `isProcessed: true`.
   - Nếu người dùng đóng modal hoặc quá trình tạo thẻ gặp lỗi: Item trong Inbox giữ nguyên trạng thái `isProcessed: false`, tuyệt đối không bị xóa hay thất thoát dữ liệu.
4. **Race Condition & Processed Item Guard**:
   - Processed item không hiển thị nút promote CTA.
   - Hàm `handlePromoteInboxItemToFlashcard` có guard chặt chẽ chống double-click / double-submit (`!item || item.isProcessed || isCreateFlashcardModalOpen`).

---

## 2. Bằng Chứng Kiểm Thử & Verification (Test Evidence)

### 2.1. Targeted Tests (Phase R3.A)
```bash
$ npx vitest run tests/unit/reader-sidebar-inbox-promote.test.tsx tests/integration/reader-excerpt-to-flashcard.test.tsx

Test Files: 2 passed (2)
Tests:      8 passed (8)
Duration:   1.91s
```
- `tests/unit/reader-sidebar-inbox-promote.test.tsx`:
  - ✅ 1. renders Promote to Flashcard button for inbox items when onPromoteToFlashcard is provided
  - ✅ 2. triggers onPromoteToFlashcard with the target item when promote button is clicked
  - ✅ 3. maintains backward compatibility and renders gracefully without onPromoteToFlashcard
- `tests/integration/reader-excerpt-to-flashcard.test.tsx`:
  - ✅ 1. Selection -> Create Flashcard success path
  - ✅ 2. Selection -> Create Flashcard failure retention path
  - ✅ 3. Inbox -> Promote to Flashcard success path & processed guard
  - ✅ 4. Inbox -> Promote to Flashcard failure retention path
  - ✅ 5. Regression guard for selection toolbar existing actions

### 2.2. Regression Tests (Reader & Selection Subsystems)
```bash
$ npx vitest run tests/unit/unified-selection-toolbar-flashcard.test.tsx \
                 tests/unit/reader-sidebar-inbox.test.tsx \
                 tests/unit/reader-sidebar-tab-badges.test.tsx \
                 tests/unit/reader-sidebar-note-jump-back.test.tsx \
                 tests/integration/reader-to-flashcard-handoff.test.tsx \
                 tests/integration/pdf-reader-selection.test.tsx \
                 tests/unit/research-inbox-hard-delete.test.tsx

Test Files: 7 passed (7)
Tests:      21 passed (21)
Duration:   3.16s
```

### 2.3. Typecheck Static Verification
```bash
$ npx tsc --noEmit
Found 0 errors.
```

---

## 3. Danh Sách Tập Tin Thay Đổi (Files Changed & Working Tree Status)

### 3.1. Production Source Code (Tracked, Modified — 2 files)
1. [src/components/reader/ReaderSidebar.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/reader/ReaderSidebar.tsx):
   - Bổ sung import `Brain` icon từ `lucide-react`.
   - Mở rộng prop `onPromoteToFlashcard?: (item: ResearchInboxItem) => void` trong `ReaderSidebarProps`.
   - Render nút icon promote cho các inbox item chưa xử lý (`!item.isProcessed && onPromoteToFlashcard`).
2. [src/components/reader/UnifiedResearchReader.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/reader/UnifiedResearchReader.tsx):
   - Thêm state `activePromotingInboxItem: ResearchInboxItem | null`.
   - Trích xuất `processInboxItem` từ `DataContext`.
   - Triển khai `handlePromoteInboxItemToFlashcard` với validation guard và mapping `FlashcardCitationProvenance`.
   - Truyền `onPromoteToFlashcard={handlePromoteInboxItemToFlashcard}` vào `ReaderSidebar`.
   - Cập nhật `onSuccess` trong `FlashcardFormModal` để gọi `processInboxItem(activePromotingInboxItem.id)` chỉ khi tạo thẻ thành công.
   - Cập nhật `onClose` để dọn dẹp an toàn `activePromotingInboxItem = null`.

### 3.2. Specifications & Documentation Phase R3.A (Untracked, New — 3 files)
- [docs/specs/phase-r3a-reader-excerpt-to-flashcard-spec.md](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-r3a-reader-excerpt-to-flashcard-spec.md)
- [docs/adr/ADR-095-phase-r3a-reader-excerpt-promotion-to-flashcard.md](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/adr/ADR-095-phase-r3a-reader-excerpt-promotion-to-flashcard.md)
- [docs/reports/phase-r3a-reader-excerpt-to-flashcard-closure-report.md](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/reports/phase-r3a-reader-excerpt-to-flashcard-closure-report.md)

### 3.3. Test Suites Phase R3.A (Untracked, New — 2 files)
- [tests/unit/reader-sidebar-inbox-promote.test.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/reader-sidebar-inbox-promote.test.tsx)
- [tests/integration/reader-excerpt-to-flashcard.test.tsx](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/integration/reader-excerpt-to-flashcard.test.tsx)

### 3.4. Tài liệu ngoài scope (Untracked Session Log — 1 file)
- `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md` (session log tồn tại từ trước, không thuộc phạm vi Phase R3.A).

---

## 4. Ranh Giới An Toàn & Known Limitations (Blast Radius & Non-Goals)

| Mục tiêu | Trạng thái bảo toàn |
| :--- | :--- |
| **Prisma Schema** | 100% không đổi (Zero migration). |
| **Mind Map Subsystem** | 100% không chạm tới (`src/components/mindmap/*`). |
| **Send to Note** | Giữ nguyên contract, không mở rộng scope. |
| **SRS Scheduler** | Thuật toán SM-2 giữ nguyên vẹn. |
| **Git Staging & Commit** | Chưa commit, chưa stage, chưa push theo đúng nguyên tắc. |

### Known Limitations (Non-goals giai đoạn này):
1. **Batch Inbox Promotion**: Thăng hạng từng item một (1-by-1) nhằm đảm bảo người dùng có bước kiểm duyệt câu hỏi/đáp án và gán Topic chính xác. Chưa hỗ trợ chọn nhiều checkbox để tạo hàng loạt.
2. **AI Cloze / Auto-Answer**: Việc điền câu trả lời mặt sau dựa trên nhập liệu thủ công của người dùng hoặc cú pháp cloze có sẵn; chưa kích hoạt AI auto-completion (nằm ở các phase AI Studio sau).
