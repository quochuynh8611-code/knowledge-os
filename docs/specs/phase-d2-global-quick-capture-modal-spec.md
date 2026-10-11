# Đặc Tả Kỹ Thuật Phase D2: Global Quick-Capture Modal (`⌘N` / `Ctrl+N`)

**Phiên bản:** 1.0.0  
**Trạng thái:** DRAFT / PENDING EXECUTION  
**Ngày:** 2026-10-11  
**Tác giả:** Staff Software Engineer kiêm Technical Architect  

---

## 1. Mục Tiêu & Bối Cảnh (Context & Goals)

Trong quá trình học tập và nghiên cứu (đọc tài liệu, ôn flashcard, vẽ sơ đồ tư duy), người dùng thường bất chợt nảy sinh ý tưởng, liên tưởng hoặc câu hỏi chớp nhoáng (Fleeting Notes / Quick Thoughts).
Hiện tại, để ghi lại một ý tưởng, người dùng buộc phải chuyển tab, rời bỏ ngữ cảnh đọc hoặc thao tác phức tạp, dẫn đến đứt gãy dòng tập trung (context switching cognitive cost).

**Phase D2** giải quyết bài toán này bằng cách cung cấp một modal ghi chú chớp nhoáng toàn cục (Global Quick-Capture Modal):
- Kích hoạt nhanh bằng phím tắt `⌘N` (macOS) / `Ctrl+N` (Windows/Linux) từ bất kỳ không gian nào trong ứng dụng.
- Cung cấp hành động trong Command Palette (`⌘K` -> "Ghi Chú Nhanh (Quick Capture)") như một đường lui (fallback) bắt buộc đề phòng xung đột phím tắt trình duyệt.
- Tự động đóng gói nội dung thành một bản ghi canonical `ResearchExcerpt` và đẩy vào `Research Inbox` thông qua contract `addExcerptToInbox`.
- Giữ nguyên 100% ngữ cảnh đang hoạt động bên dưới, không làm chuyển tab, không reload.

---

## 2. Phạm Vi & Ranh Giới (Scope & Blast Radius)

### 2.1. In-Scope (Trong Phạm Vi)
1. Tạo component mới `src/components/modals/QuickCaptureModal.tsx`:
   - Modal hiển thị tiêu đề "Ghi Chú Chớp Nhoáng (Quick Capture)", một `textarea` tự động focus khi mở.
   - Hỗ trợ phím tắt submit `⌘+Enter` hoặc `Ctrl+Enter`, và nút bấm "Lưu vào Inbox".
   - Phím `Escape` hoặc nút đóng đóng modal ngay lập tức mà không cần xác nhận (theo quyết định tối ưu tốc độ ghi chép).
   - Error-retention contract: Nếu việc lưu gặp lỗi, không đóng modal, không xóa nội dung draft, hiển thị thông báo lỗi rõ ràng.
2. Cập nhật `src/hooks/useKeyboardShortcuts.ts`:
   - Bổ sung callback `onOpenQuickCapture?: () => void`.
   - Bắt tổ hợp `Cmd+N` / `Ctrl+N`, gọi `e.preventDefault()`, `e.stopPropagation()` và kích hoạt `onOpenQuickCapture`.
3. Cập nhật `src/hooks/useCommandPalette.ts`:
   - Bổ sung option `onOpenQuickCapture?: () => void`.
   - Thêm command item `act-quick-capture` thuộc danh mục `Hành động nhanh`.
4. Cập nhật `src/App.tsx`:
   - Quản lý state `showQuickCaptureModal`.
   - Nối callback giữa `useKeyboardShortcuts`, `useCommandPalette` và modal.
   - Triển khai hàm lưu gọi `addExcerptToInbox(canonicalExcerpt)`.
5. Cập nhật `src/components/modals/ShortcutsModal.tsx`:
   - Bổ sung dòng tra cứu phím tắt `⌘N` / `Ctrl+N` trong nhóm "Thao Tác Nhanh & Tìm Kiếm".
6. Viết bộ kiểm thử tự động (Unit / Integration tests) xác minh đầy đủ hành vi.

### 2.2. Non-Goals (Không Thuộc Phạm Vi)
- KHÔNG thêm nút bấm mới trên thanh điều hướng `Navbar.tsx` trong Phase D2.
- KHÔNG thêm schema migration hay thay đổi Prisma model nào.
- KHÔNG thay đổi endpoint API backend hay server routes.
- KHÔNG thiết kế lại `ResearchInboxDrawer` hay `ReaderSidebar`.
- KHÔNG yêu cầu hộp thoại xác nhận khi người dùng ấn `Escape` hủy bỏ draft trong D2.

---

## 3. Allowed & Forbidden Files

### 3.1. Allowed Files
- `src/components/modals/QuickCaptureModal.tsx` (mới)
- `src/App.tsx`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/hooks/useCommandPalette.ts`
- `src/components/modals/ShortcutsModal.tsx`
- `tests/unit/keyboard-shortcuts.test.tsx`
- `tests/unit/command-palette-caller-wiring.test.tsx`
- `tests/unit/quick-capture-modal.test.tsx` (mới)
- `docs/specs/phase-d2-global-quick-capture-modal-spec.md`
- `docs/adr/ADR-098-phase-d2-global-quick-capture-modal.md`
- `docs/reports/phase-d2-global-quick-capture-modal-closure-report.md`
- `docs/PROJECT_STATUS.md`

### 3.2. Forbidden Files
- `src/server/**`
- `prisma/**`
- `src/components/layout/Navbar.tsx`
- Các module Mind Map, Flashcards, Reader không liên quan trực tiếp.
- Mọi tài liệu log phiên làm việc ngoài scope.

---

## 4. Canonical Payload Contract

Khi người dùng gửi ghi chú nhanh, payload chuyển giao cho `addExcerptToInbox` phải tuân thủ nghiêm ngặt hợp đồng canonical sau:

```typescript
const canonicalExcerpt: ResearchExcerpt = {
  id: `excerpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  archivedDocumentId: "quick-capture",
  topicId: null,
  targetNoteId: null,
  selectedText: trimmedText,
  contextPrefix: null,
  contextSuffix: null,
  positionSelector: {},
  highlightColor: "#f59e0b",
  citationSnapshot: {
    title: "Ghi chú chớp nhoáng",
    author: "Quick Capture",
  },
  userNote: null,
  status: "inbox",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

---

## 5. Invariants (Bất Biến Hệ Thống)

1. **Zero Schema Migration**: Không sửa đổi cơ sở dữ liệu hay mô hình Prisma.
2. **Zero Backend API Change**: Toàn bộ thao tác dựa trên client-side DataContext và localStorage persistence hiện hữu.
3. **Context Preservation**: Khi mở hoặc đóng modal, màn hình nền (active tab, selected topic, reading position) giữ nguyên 100%.
4. **Data Loss Prevention**: Nếu `addExcerptToInbox` ném ra ngoại lệ (Promise rejection), text trong textarea KHÔNG được phép bị xóa, modal KHÔNG được phép đóng.
5. **No Shortcut Regression**: Các phím tắt hiện hữu (`⌘K`, `?`, `1-7`, `Escape`) và các scope keyboard chuyên biệt (như flashcard review) tiếp tục hoạt động chính xác.

---

## 6. Rollback Strategy

Nếu phát hiện bất kỳ lỗi hồi quy nghiêm trọng nào:
1. Revert các file được phép thay đổi trong commit của Phase D2:
   - Xóa `src/components/modals/QuickCaptureModal.tsx` và `tests/unit/quick-capture-modal.test.tsx`.
   - Khôi phục `src/App.tsx`, `src/hooks/useKeyboardShortcuts.ts`, `src/hooks/useCommandPalette.ts`, `src/components/modals/ShortcutsModal.tsx`.
2. Kiểm tra lại `git status` và chạy test suite toàn diện để bảo đảm trả về baseline HEAD sạch.

---

## 7. Kịch Bản Kiểm Thử & Chấp Nhận (Gherkin Scenarios)

### Kịch bản 1: Kích hoạt modal bằng phím tắt toàn cục
```gherkin
Given người dùng đang ở bất kỳ màn hình nào (Dashboard, Topics, Notes, Graph)
When người dùng nhấn tổ hợp phím "⌘N" trên macOS hoặc "Ctrl+N" trên Windows/Linux
Then QuickCaptureModal được mở ra
And ô nhập liệu textarea được tự động focus
And sự kiện phím được ngăn chặn mặc định (preventDefault) để hạn chế mở cửa sổ trình duyệt mới
```

### Kịch bản 2: Kích hoạt modal qua Command Palette (Fallback Path)
```gherkin
Given người dùng mở Command Palette bằng "⌘K" hoặc click nút tìm kiếm
When người dùng tìm kiếm từ khóa "quick capture" hoặc "ghi chu nhanh"
And người dùng chọn hành động "Ghi Chú Nhanh (Quick Capture)"
Then Command Palette đóng lại
And QuickCaptureModal được mở ra với textarea được tự động focus
```

### Kịch bản 3: Lưu ghi chú thành công bằng phím tắt Cmd/Ctrl+Enter
```gherkin
Given QuickCaptureModal đang mở
When người dùng nhập nội dung "Ý tưởng cấu trúc tri thức mới"
And người dùng nhấn "⌘+Enter" hoặc "Ctrl+Enter" (hoặc click nút "Lưu vào Inbox")
Then hàm addExcerptToInbox được gọi với canonical payload:
  | archivedDocumentId | "quick-capture" |
  | selectedText       | "Ý tưởng cấu trúc tri thức mới" |
  | status             | "inbox" |
  | citationSnapshot   | title: "Ghi chú chớp nhoáng", author: "Quick Capture" |
And modal được đóng lại
And nội dung textarea được reset
And người dùng vẫn ở nguyên tab đang thao tác trước đó
```

### Kịch bản 4: Không lưu nội dung rỗng
```gherkin
Given QuickCaptureModal đang mở
When textarea chỉ chứa khoảng trắng hoặc rỗng
And người dùng nhấn "⌘+Enter" hoặc click nút "Lưu vào Inbox"
Then không gọi addExcerptToInbox
And hiển thị thông báo yêu cầu nhập nội dung
And modal tiếp tục mở
```

### Kịch bản 5: Đóng modal bằng phím Escape
```gherkin
Given QuickCaptureModal đang mở và đã có văn bản nháp
When người dùng nhấn phím "Escape" hoặc click nút đóng "X" hoặc click backdrop
Then modal đóng lại ngay lập tức mà không lưu vào inbox
```

### Kịch bản 6: Error Retention khi lưu thất bại
```gherkin
Given QuickCaptureModal đang mở với nội dung "Ghi chú quan trọng"
When addExcerptToInbox thất bại (ném ra Error)
Then modal KHÔNG đóng lại
And nội dung "Ghi chú quan trọng" vẫn còn nguyên trong textarea
And thông báo lỗi hiển thị rõ ràng trên modal cho phép người dùng thử lại
```
