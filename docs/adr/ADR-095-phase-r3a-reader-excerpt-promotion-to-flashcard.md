# ADR-095: Kiến Trúc Thăng Hạng Đoạn Trích Reader Thành Flashcard (Phase R3.A)

**Ngày**: 2026-10-11  
**Trạng thái**: Proposed / Pending Human Approval  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phạm vi**: Reader Subsystem ↔ Flashcard Subsystem (Phase R3.A)  

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Người dùng cá nhân khi đọc tài liệu trong `UnifiedResearchReader` có 2 luồng chuyển đổi kiến thức sang Active Recall Flashcard:
1. **Direct Fast-Path**: Bôi đen một luận điểm ngắn, bấm "Tạo thẻ nhớ" từ `UnifiedSelectionToolbar` để chuyển thành câu hỏi/đáp án tức thì.
2. **Staged Workflow (Inbox-as-Staging)**: Thu thập nhanh nhiều trích đoạn vào `ResearchInbox` trong lúc đọc để không làm gián đoạn dòng suy nghĩ, sau đó mở tab Inbox trên `ReaderSidebar` để xem lại và từng bước thăng hạng (promote) sang Flashcard.

Vấn đề kỹ thuật cần giải quyết:
- Thiết lập cơ chế handoff đồng nhất cho cả 2 luồng, tái sử dụng `FlashcardFormModal` và `FlashcardCitationProvenance`.
- Đảm bảo hợp đồng lưu giữ khi lỗi (Error-Retention Contract): Nếu API backend hoặc mạng thất bại khi tạo thẻ, trích đoạn nguồn / inbox item tuyệt đối không bị mất, không bị đánh dấu đã xử lý sai lệch, và người dùng có khả năng retry mà không cần gõ lại nội dung.

---

## 2. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Direct Selection -> Flashcard Handoff
- Tái sử dụng action `create_flashcard` đã có trên `UnifiedSelectionToolbar`.
- `UnifiedResearchReader` khởi tạo `FlashcardCitationProvenance` với `documentId`, `documentTitle`, `format`, `locator`, `sourceUrl`, và `excerptText`.
- Prefill `initialFront` bằng văn bản bôi đen; tự động kích hoạt `detectClozeFromSelection` bên trong `FlashcardFormModal` nếu có cú pháp `{{c1::...}}`.
- Khi đóng modal hoặc tạo thành công, xóa `activeSelection` và hiển thị toast xác nhận.

### Quyết định 2: Inbox-as-Staging -> Promote to Flashcard
- Bổ sung affordance nút icon "Tạo thẻ nhớ" (`Brain` icon) vào từng card trong tab Inbox của `ReaderSidebar`.
- Thêm prop `onPromoteToFlashcard?: (item: ResearchInboxItem) => void` vào `ReaderSidebarProps`.
- Trong `UnifiedResearchReader`, quản lý state `promotingInboxItem: ResearchInboxItem | null`.
- Khi người dùng click Promote:
  - Khởi tạo provenance từ `item.excerpt`.
  - Mở `FlashcardFormModal` với `initialFront = item.excerpt.selectedText`.
- Khi tạo thẻ thành công (`onSuccess`):
  - Gọi `processInboxItem(promotingInboxItem.id)` từ `DataContext` để chuyển trạng thái item sang `isProcessed: true`.
  - Reset `promotingInboxItem = null`.
  - Hiển thị toast thông báo hoàn tất.

### Quyết định 3: Error-Retention Contract & Không Làm Mất Dữ Liệu
- Không thực hiện bất kỳ thao tác xóa hoặc đánh dấu `isProcessed: true` nào trước khi `repository.createFlashcard()` trả về kết quả thành công.
- `FlashcardFormModal` bắt exception trong block `try / catch`, gán thông báo lỗi vào `errorFront`, giữ nguyên input `front` / `back` / `topicId` để người dùng chỉnh sửa và submit lại.
- Nếu người dùng bấm `Hủy` hoặc đóng modal khi chưa tạo thành công, `promotingInboxItem` được reset về `null`, inbox item trong `DataContext` giữ nguyên vẹn `isProcessed: false`.

---

## 3. Các Phương Án Đã Cân Nhắc (Considered Options)

| Tiêu chí | Phương án A: Tái sử dụng FlashcardFormModal + State Callback (Được chọn) | Phương án B: Tạo modal chuyên biệt `InboxPromoteModal` | Phương án C: Auto-create thẻ ngầm (Silent Creation) |
| :--- | :--- | :--- | :--- |
| **Độ phức tạp code** | Thấp, tái sử dụng 100% logic form, cloze parser, validation | Cao, trùng lặp code form flashcard | Trung bình, nhưng UX tệ vì người dùng không kịp điền mặt sau/chọn topic |
| **Blast Radius** | Cực nhỏ, chỉ can thiệp ReaderSidebar và wiring trong UnifiedResearchReader | Trung bình, thêm component mới | Nguy cơ tạo nhiều rác trong DB |
| **Bảo toàn dữ liệu** | An toàn 100% nhờ error boundary của React và giữ nguyên inbox state | Tương đương Phương án A | Kém, nếu auto-create lỗi khó khôi phục |

---

## 4. Hệ Quả (Consequences)

### 4.1. Tích cực
- Hoàn thiện khép kín luồng nghiên cứu: Reader Selection → Inbox Staging → Flashcard SRS.
- Zero Prisma schema migration, zero backend code changes.
- Người dùng không bao giờ mất trích đoạn khi gặp lỗi mạng.
- Giao diện thân thiện, nhất quán với Design System hiện hữu.

### 4.2. Tiêu cực & Biện pháp phòng ngừa
- Số lượng prop trong `ReaderSidebarProps` tăng thêm 1 (`onPromoteToFlashcard`): Được đánh dấu optional, hoàn toàn tương thích ngược.

---

## 5. Chiến Lược Rollback (Rollback Strategy)

Nếu phát hiện bất kỳ hồi quy nào trong môi trường runtime:
- Hoàn nguyên 2 file: `src/components/reader/ReaderSidebar.tsx` và `src/components/reader/UnifiedResearchReader.tsx`.
- Không ảnh hưởng đến dữ liệu database vì không có schema migration.
