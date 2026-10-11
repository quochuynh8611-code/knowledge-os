# ADR-098: Kiến Trúc Hộp Thoại Ghi Chú Nhanh Toàn Cục (Phase D2 Global Quick-Capture Modal)

**Ngày**: 2026-10-11  
**Trạng thái**: Proposed / Pending Implementation  
**Tác giả**: Staff Software Engineer kiêm Technical Architect  
**Phạm vi**: Shell & Research Inbox Subsystem (Phase D2)  

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Trong quy trình nghiên cứu học thuật sâu (Deep Work & Knowledge Inquiry), người dùng liên tục bắt gặp các ý tưởng thoáng qua, liên tưởng chéo giữa các chủ đề hoặc câu hỏi mở. Nếu buộc phải rời khỏi màn hình đọc tài liệu (`UnifiedResearchReader`), phiên ôn tập thẻ nhớ (`FlashcardReviewStudio`) hoặc sơ đồ tư duy (`MindMapView`) để tìm nơi ghi chú, chi phí chuyển đổi ngữ cảnh (cognitive switching cost) sẽ phá vỡ trạng thái tập trung sâu (flow state).

Yêu cầu đặt ra:
1. Cho phép ghi chép siêu nhanh (frictionless quick capture) từ bất cứ đâu trong ứng dụng.
2. Lưu trữ có trật tự vào trung tâm gom nhặt kiến thức (`Research Inbox`) dưới dạng trích đoạn sơ cấp (`ResearchExcerpt`).
3. Đảm bảo tính khả dụng khi phím tắt bị trình duyệt chặn (Browser Hotkey Collision).
4. Giữ vững tính toàn vẹn dữ liệu, không làm phát sinh schema migration và không phá vỡ các luồng làm việc hiện hữu.

---

## 2. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Global Modal Đặt Tại App Shell
- **Lý do**: Thay vì phân tán logic ghi chép vào từng trang con hoặc thanh sidebar chuyên biệt, một modal toàn cục tại `App.tsx` đảm bảo khả năng tiếp cận tức thì (omnipresent access) bất kể người dùng đang ở tab hay view nào.
- Modal sử dụng kiến trúc portal/dialog độc lập, không mount/unmount làm reset state của các view phức tạp bên dưới (như Canvas của Mind Map hay tiến trình ôn tập Flashcard).

### Quyết định 2: Tái Sử Dụng Hoàn Toàn Contract `addExcerptToInbox`
- Thay vì tạo một bảng cơ sở dữ liệu mới (ví dụ `QuickNotes` hay `FleetingNotes`), toàn bộ ghi chú nhanh được mô hình hóa theo dạng `ResearchExcerpt` với `archivedDocumentId: "quick-capture"` và đẩy vào `Research Inbox`.
- Điều này mang lại lợi ích kép:
  1. **Zero Schema Migration**: Tận dụng 100% DataContext và schema hiện hữu.
  2. **Unified Processing Pipeline**: Bản ghi từ Quick Capture sẽ xuất hiện trong Inbox cùng với các trích đoạn từ sách EPUB/PDF, cho phép người dùng sau này xem lại, xử lý, gắn thẻ hoặc thăng hạng (promote) thành Flashcard/Permanent Note theo đúng phương pháp Zettelkasten.

### Quyết định 3: `⌘N` / `Ctrl+N` Là Phím Tắt Tiêu Chuẩn Nhưng Best-Effort
- `⌘N` (macOS) / `Ctrl+N` (Windows/Linux) là quy ước phổ biến cho hành động "New / Create" trong các ứng dụng ghi chú hiện đại (Bear, Notion, Apple Notes, Obsidian).
- **Trade-off & Thực tế trình duyệt**: Hầu hết các trình duyệt (Chrome, Edge, Safari, Firefox) gắn mặc định `⌘N`/`Ctrl+N` với hành động "Open New Window". Mặc dù JavaScript có thể gọi `e.preventDefault()`, một số môi trường hoặc cấu hình bảo mật có thể ưu tiên hành vi native của trình duyệt.
- Do đó, shortcut này được định nghĩa là **Best-Effort**.

### Quyết định 4: Command Palette Là Fallback Bắt Buộc
- Để bù đắp cho rủi ro xung đột phím tắt nêu trên, một action `act-quick-capture` ("Ghi Chú Nhanh (Quick Capture)") bắt buộc phải được đăng ký vào `Command Palette` (`useCommandPalette.ts`).
- Người dùng luôn có thể mở Command Palette bằng `⌘K` (phím tắt chuẩn ít xung đột) và gõ `quick capture` để mở modal ngay lập tức.
- Đây là cơ chế phòng vệ kiến trúc đảm bảo tính sẵn sàng 100% của tính năng.

### Quyết định 5: Escape Đóng Ngay Không Confirm & Error-Retention Khi Lỗi
- **Escape behavior**: Khi người dùng nhấn `Escape`, modal đóng ngay mà không hiện pop-up xác nhận "Bạn có muốn hủy bản nháp?". Quyết định này ưu tiên tốc độ phản hồi tối đa của giao diện.
- **Error-retention contract**: Nếu quá trình ghi vào DataContext gặp lỗi (Promise reject), modal tuyệt đối không được đóng và không được xóa text trong textarea. Người dùng phải nhìn thấy thông báo lỗi và có cơ hội bấm lưu lại hoặc sao chép nội dung ra ngoài.

---

## 3. Bảng So Sánh Các Phương Án (Considered Alternatives)

| Tiêu chí | Phương án A: Global Modal + `addExcerptToInbox` (Được chọn) | Phương án B: Sidebar Drawer Cố Định | Phương án C: Floating Action Button (FAB) Trên Navbar |
| :--- | :--- | :--- | :--- |
| **Tính thuận tiện** | Cực cao, mở bằng bàn phím ngay lập tức | Phải chiếm diện tích màn hình | Phải dùng chuột click, làm rối Navbar |
| **Độ phức tạp code** | Rất thấp, tái sử dụng contract hiện có | Trung bình, phải quản lý layout responsive | Thấp, nhưng vi phạm yêu cầu không sửa Navbar |
| **Phù hợp kiến trúc** | Phù hợp nguyên lý tập trung sâu của Knowledge OS | Phù hợp đọc tài liệu, không phù hợp toàn cục | Không phù hợp, làm chật chội không gian |
| **Rủi ro hồi quy** | Tối thiểu (chỉ bổ sung modal & hook callback) | Trung bình (ảnh hưởng layout các view) | Thấp nhưng phát sinh nợ kỹ thuật UI |

---

## 4. Hệ Quả & Kế Hoạch Triển Khai (Consequences & Next Steps)

- **Tích cực**:
  - Người dùng có thể bắt trọn vẹn ý tưởng mà không làm gián đoạn việc học.
  - Tận dụng quy trình xử lý Inbox hiện hữu để phân loại sau.
  - Không làm phình to backend hay dữ liệu schema.
- **Tiêu cực / Rủi ro hạn chế**:
  - `⌘N` có thể bị một số trình duyệt chặn nếu người dùng không dùng PWA hoặc desktop wrapper (đã được giải quyết bằng fallback Command Palette).
- **Hành động tiếp theo**:
  - Bước 3: Soạn bộ unit tests chứng minh trạng thái RED trước khi implement.
