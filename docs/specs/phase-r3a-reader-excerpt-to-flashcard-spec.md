# Technical Specification: Phase R3.A — Reader Excerpt Promotion to Flashcard

**Tài liệu**: Đặc tả kỹ thuật (Technical Specification)  
**Mã giai đoạn**: Phase R3.A  
**Phân hệ**: Reader Subsystem ↔ Flashcard & SRS Subsystem  
**Người phụ trách**: Staff Software Engineer / Technical Architect  
**Trạng thái**: Draft / In Review  
**Cập nhật lần cuối**: 2026-10-11  

---

## 1. Mục Tiêu & Bối Cảnh (Context & Objectives)

Trong Knowledge OS, quá trình nghiên cứu tài liệu (Markdown, EPUB, PDF) là nơi người dùng tiếp nhận thông tin và lọc ra các đoạn trích (Research Excerpts). Để phục vụ việc ôn tập chủ động (Active Recall) qua thuật toán Spaced Repetition (SM-2):
- Người dùng cần chuyển hóa nhanh các đoạn bôi đen (selection) thành thẻ nhớ (Flashcard) trực tiếp.
- Hoặc gom các đoạn trích vào **Research Inbox** để phân loại và nâng cấp (promote) thành thẻ nhớ sau này khi có thời gian.
- **Ràng buộc an toàn dữ liệu**: Tuyệt đối không làm mất dữ liệu trích đoạn (excerpt/inbox item) nếu thao tác tạo flashcard thất bại hoặc bị hủy.

---

## 2. Phạm Vi Thực Hiện (Scope & Boundaries)

### 2.1. In-Scope
1. **Selection → Create Flashcard**:
   - Từ `UnifiedSelectionToolbar` trong Reader, nhấn nút "Tạo thẻ nhớ" (`create_flashcard`) sẽ mở modal `FlashcardFormModal` với `initialFront` là văn bản được bôi đen và `initialProvenance` chứa thông tin trích dẫn nguồn chuẩn xác (`documentId`, `documentTitle`, `format`, `locator`, `sourceUrl`, `excerptText`, `citationFormatted`).
   - Tự động nhận diện cú pháp Cloze nếu đoạn bôi đen chứa mẫu `{{c1::...}}`.
2. **Inbox → Promote to Flashcard**:
   - Trong tab Inbox của `ReaderSidebar`, mỗi item trong danh sách `inboxItems` hiển thị nút affordance "Tạo thẻ nhớ" (Promote to Flashcard).
   - Nhấn nút sẽ mở `FlashcardFormModal` với front được điền từ `item.excerpt.selectedText` và provenance được chuyển đổi từ `item.excerpt`.
   - Nếu tạo thành công: Gọi `processInboxItem(item.id)` để đánh dấu `isProcessed: true` và hiển thị toast thành công.
3. **Error-Retention Contract**:
   - Nếu tạo thất bại: Inbox item KHÔNG bị xóa, KHÔNG bị đánh dấu `isProcessed: true`. Form giữ nguyên nội dung kèm thông báo lỗi để người dùng sửa đổi và thử lại.
   - Nếu người dùng đóng modal mà chưa lưu: Dữ liệu inbox item vẫn bảo toàn trạng thái chưa xử lý (`isProcessed: false`).

### 2.2. Out-of-Scope (Non-Goals)
- Send to Note (giữ nguyên contract hiện có).
- AI auto-generation / Cloze generation tự động bằng LLM.
- Batch conversion (chuyển đổi hàng loạt).
- Semantic search / Vector embeddings.
- Backup / Cloud sync.
- Bất kỳ sửa đổi nào liên quan đến Mind Map Subsystem.
- Tinh chỉnh thuật toán SRS scheduler.
- Thay đổi Prisma schema database.

---

## 3. Ràng Buộc & Invariants

| Invariant ID | Mô tả |
| :--- | :--- |
| **INV-R3A-1** | Zero Prisma schema migration. Tận dụng 100% `FlashcardCitationProvenance` và `Flashcard.citationProvenance` hiện có. |
| **INV-R3A-2** | Zero regression cho các chức năng hiện có của toolbar: `highlight`, `copy`, `citation`, `send_to_note`, `add_to_inbox`. |
| **INV-R3A-3** | Zero regression cho ReaderSidebar: outline navigation, notes backlinks, highlight deletion, inbox deletion. |
| **INV-R3A-4** | Zero data loss on failure: Thất bại ở API tạo flashcard không được làm mất text selection hay xóa/hoàn tất inbox item. |
| **INV-R3A-5** | Không chỉnh sửa bất kỳ file nào trong `src/components/mindmap/`. |

---

## 4. Contract Giao Diện & Dữ Liệu (Interface Contracts)

### 4.1. ReaderSidebar Props Extension
```typescript
export interface ReaderSidebarProps {
  // ... existing props ...
  inboxItems?: ResearchInboxItem[];
  onDeleteInboxItem?: (id: string) => void;
  /** Phase R3.A: Affordance to promote an inbox item to flashcard */
  onPromoteToFlashcard?: (item: ResearchInboxItem) => void;
  // ...
}
```

### 4.2. Provenance Extraction Mapping Contract
Khi trích xuất provenance từ `ResearchInboxItem`:
```typescript
function mapInboxItemToFlashcardProvenance(
  item: ResearchInboxItem,
  fallbackDoc: { documentId: string; title: string; format: ReaderDocumentFormat; fileUrl?: string }
): FlashcardCitationProvenance {
  const excerpt = item.excerpt;
  const docId = excerpt?.archivedDocumentId || fallbackDoc.documentId;
  const docTitle = excerpt?.citationSnapshot?.title || fallbackDoc.title;
  const format = fallbackDoc.format;
  const locator =
    excerpt?.positionSelector?.headingId ||
    (excerpt?.positionSelector?.pageNumber !== undefined ? `page=${excerpt.positionSelector.pageNumber}` : undefined) ||
    excerpt?.positionSelector?.cfi;

  return {
    documentId: docId,
    documentTitle: docTitle,
    format,
    locator,
    sourceUrl: fallbackDoc.fileUrl,
    excerptText: excerpt?.selectedText,
    citationFormatted: excerpt?.citationSnapshot?.formatted || excerpt?.citationSnapshot?.apa,
  };
}
```

---

## 5. File Cho Phép Sửa & File Cấm (Allowed vs Forbidden Files)

### 5.1. Allowed Files
- `src/components/reader/ReaderSidebar.tsx`
- `src/components/reader/UnifiedResearchReader.tsx`
- `docs/specs/phase-r3a-reader-excerpt-to-flashcard-spec.md`
- `docs/adr/ADR-095-phase-r3a-reader-excerpt-promotion-to-flashcard.md`
- `tests/unit/reader-sidebar-inbox-promote.test.tsx` (mới)
- `tests/integration/reader-excerpt-to-flashcard.test.tsx` (mới)

### 5.2. Forbidden Files
- `prisma/schema.prisma`
- `src/components/mindmap/*`
- `src/server/*`
- `src/lib/flashcardScheduler.ts`

---

## 6. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. [ ] Có test suite failing (RED) cho 5 kịch bản trước implementation.
2. [ ] Nút "Tạo thẻ nhớ" hiển thị trên mỗi item trong tab Inbox của `ReaderSidebar`.
3. [ ] Nhấn nút promote trên inbox item mở modal `FlashcardFormModal` với front & provenance hợp lệ.
4. [ ] Tạo flashcard thành công từ inbox item: Flashcard được lưu, inbox item được đánh dấu `isProcessed: true`.
5. [ ] Tạo flashcard thất bại: Inbox item giữ nguyên `isProcessed: false`, dữ liệu không bị xóa.
6. [ ] Tạo flashcard từ text selection: Modal nhận prefill, khi tạo thành công hiển thị toast, khi thất bại giữ nguyên modal và lỗi rõ ràng.
7. [ ] Toàn bộ regression tests của Reader và Selection Toolbar đạt GREEN.
8. [ ] TypeScript typecheck không có lỗi (`npx tsc --noEmit`).
