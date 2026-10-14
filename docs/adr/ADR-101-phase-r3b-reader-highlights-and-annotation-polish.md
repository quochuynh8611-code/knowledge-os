# ADR-101: Phase R3b — Reader Highlights & Annotation Polish

- **Trạng thái:** Accepted / Implemented
- **Ngày quyết định:** 2026-10-14
- **Phạm vi:** Reader Subsystem (`UnifiedSelectionToolbar`, `UnifiedResearchReader`, `ReaderSidebar`, `DataContext`)
- **Tác giả:** Staff Software Engineer / Knowledge OS Core

---

## 1. Bối Cảnh (Context)
Trước Phase R3b, hệ thống trích xuất tài liệu đọc trong Knowledge OS đã có nền tảng:
- `ResearchExcerptSchema` và `ResearchExcerptUpdateSchema` trong `src/lib/validation.ts` và `src/types/index.ts` đã định nghĩa sẵn các trường `highlightColor: string` và `userNote?: string | null`.
- Tuy nhiên, trong quá trình vận hành thực tế:
  1. `DataContext` mới chỉ hỗ trợ `addExcerpt` và `deleteExcerpt`, thiếu hoàn toàn hợp đồng `updateExcerpt` để chỉnh sửa các trường của trích đoạn đã lưu.
  2. `UnifiedSelectionToolbar` chỉ kích hoạt action `highlight` với màu mặc định cố định (`#fef08a`), không có affordance cho người dùng phân loại trực quan nội dung bằng các gam màu khác nhau.
  3. `ReaderSidebar` (tab Highlights) hard-code viền màu hổ phách (`border-amber-500`), bỏ qua trường `highlightColor` và không hiển thị `userNote` hay cung cấp cơ chế ghi chú inline.

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Bổ sung `updateExcerpt` vào `DataContext`
- **Lý do:** Trích đoạn nghiên cứu (`ResearchExcerpt`) là thực thể tri thức sống (living knowledge entity). Người dùng cần có khả năng bổ sung hoặc tinh chỉnh ghi chú phân tích (`userNote`), hoặc thay đổi màu sắc highlight sau khi đọc lại mà không buộc phải xóa đi tạo lại làm mất `id`, `createdAt`, hay phá vỡ liên kết với flashcard / inbox.
- **Hợp đồng & Triển khai:**
  - Signature: `updateExcerpt(id: string, updates: Partial<ResearchExcerpt>): Promise<ResearchExcerpt | void>`.
  - Thực hiện immutable update trên mảng `researchExcerpts` và tự động làm mới `updatedAt: new Date().toISOString()`.
  - Bảo vệ bất biến ID: `id: target.id` không cho phép sửa đổi ID thực thể.
  - Tự động đồng bộ sang `safeSetLocalStorageItem` và đồng bộ trường nhúng `item.excerpt` trong `researchInboxItems` nếu có tham chiếu liên kết.
  - Fail-safe no-op: Trả về an toàn nếu không tìm thấy `id`, không gây throw ngoại lệ hoặc làm hỏng dữ liệu.

### 2.2. Chọn Bảng Màu 4 Màu Cố Định (4-Color Palette) cho Core Scope
- **Lý do:** Bảng màu 4 sắc thái kinh điển trong nghiên cứu học thuật và đọc sách:
  1. **Vàng (`#fef08a`)**: Ý tưởng cốt lõi, định nghĩa chính (Default).
  2. **Xanh lá (`#bbf7d0`)**: Ví dụ minh họa, chứng cứ thực tế, quan điểm đồng thuận.
  3. **Xanh dương (`#bae6fd`)**: Câu hỏi nghiên cứu, luận điểm cần đối chiếu sâu.
  4. **Hồng (`#fbcfe8`)**: Phản biện, điểm mâu thuẫn, cảnh báo học thuật.
- **Thiết kế UI:**
  - Nút "Highlight" chính luôn duy trì hành vi 1-click lưu nhanh với màu vàng mặc định `#fef08a`.
  - Nút mở bảng màu (`data-testid="highlight-palette-toggle"`) với `aria-label="Chọn màu đánh dấu"` mở popover 4 nút swatch tròn.
  - Thao tác chọn màu kích hoạt ngay lập tức action highlight với màu tương ứng và tự động đóng popover.
  - Phím `Escape` đóng popover bảng màu mà không làm mất vùng chọn văn bản.

### 2.3. Loại Bỏ Quick Filter và Last-Used Color Khỏi Core Scope (Non-Goals)
- **Vì sao chưa đưa Quick Filter vào:**
  - Thêm quick filter (lọc theo màu, tìm kiếm văn bản) trong sidebar làm phình to state của `ReaderSidebar` (thêm filter state, empty filter results state, clear filter affordance).
  - Khối lượng trích đoạn trên mỗi tài liệu ở quy mô hiện tại chủ yếu phục vụ đọc theo ngữ cảnh tuần tự từ trên xuống dưới.
  - Giữ blast radius ở mức tối thiểu, tập trung hoàn thiện trọn vẹn luồng đọc-ghi-hiển thị của highlight & note trước khi thêm lớp truy vấn/lọc dữ liệu.
- **Vì sao chưa đưa Last-Used Color vào `localStorage`:**
  - Ghi nhớ màu gần nhất trong `localStorage` sẽ thay đổi hành vi mặc định của nút Highlight chính (thay vì luôn là Vàng `#fef08a`).
  - Điều này dễ gây nhầm lẫn nhận thức khi người dùng muốn đánh dấu thông thường nhưng lại vô tình áp dụng màu phản biện (Hồng) từ phiên làm việc trước.
  - Hành vi xác định (deterministic behavior): Nút chính luôn là Vàng; muốn dùng màu khác thì bấm chọn màu. Giữ hệ thống dễ đoán và không phát sinh trạng thái ẩn giữa các phiên làm việc.

---

## 3. Hệ Quả & Đánh Giá (Consequences)

### Tích cực (Positive)
- Hoàn thiện vòng tròn Read/Write/Display cho Annotations trong Reader.
- Giữ vững nguyên tắc **Zero Database Migration**: Tận dụng 100% schema Zod & TypeScript có sẵn mà không cần thay đổi cấu trúc bảng hay chạy Prisma migration.
- Cách ly hoàn toàn với các subsystem khác (đặc biệt là Mind Map subsystem `src/components/mindmap/*` hoàn toàn không bị ảnh hưởng).
- Test-driven: 100% các tính năng mới đều có failing tests trước khi implement, đạt 53/53 tests xanh trên toàn bộ Reader suite và 0 lỗi TypeScript typecheck.

### Giới hạn (Trade-offs / Deferred)
- Chưa có bộ lọc trích đoạn theo màu sắc trong sidebar (để lại làm ứng viên cho phase sau khi người dùng có nhu cầu quản lý tài liệu dài hàng trăm highlight).
- Màu sắc hiển thị trực quan nhất tại Sidebar Card; chưa tô màu trực tiếp lên DOM text layer của tài liệu Markdown/PDF (giữ rendering engine sạch và tránh xung đột DOM selection).
