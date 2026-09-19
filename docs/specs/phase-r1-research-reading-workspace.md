# Phase R1 Technical Specification: Research Reading Workspace

- **Status:** Proposed
- **Feature Code:** Phase R1
- **Associated ADR:** [`ADR-076`](../adr/ADR-076-research-reading-workspace.md)
- **Associated Feature File:** [`phase-r1-research-reading-workspace.feature`](../gherkin/phase-r1-research-reading-workspace.feature)

---

## 1. Mục Tiêu & Tầm Nhìn Sản Phẩm

Phase R1 hợp nhất trải nghiệm **Thư Viện Tài Liệu**, **Trình Đọc Nghiên Cứu Đa Định Dạng (PDF/EPUB/Markdown)**, và **Hộp Tiếp Nhận Nghiên Cứu (Research Inbox)** vào một quy trình nghiên cứu học thuật liền mạch.

### Các Nguyên Tắc Thiết Kế:
1. **Ngôn ngữ người dùng (Academic & User-Centric)**: Sử dụng tên gọi "Thư Viện Nghiên Cứu", "Thư Viện Sách", loại bỏ hoàn toàn các thuật ngữ kỹ thuật (ADR, Gherkin Explorer) trong giao diện chính.
2. **Tiết lộ lũy tiến (Progressive Disclosure)**: Tinh gọn giao diện duyệt ban đầu, chỉ hiển thị các bảng công cụ sâu (4-tab sidebar, floating selection toolbar) khi người dùng mở workspace đọc.
3. **Ranh giới bất biến (Obsidian Read-Only SSOT)**: Mọi thao tác trích đoạn, ghi chú, highlights không ghi đè hoặc sửa đổi tệp tin trong Obsidian Vault.

---

## 2. Kiến Trúc Chi Tiết Các Module

### Module 1: Thư Viện Nghiên Cứu (Research Library - `DocsExplorerView.tsx`)

Thư viện tài liệu hỗ trợ duyệt, tìm kiếm và phân loại tập trung:

#### 1.1. Bộ Lọc & Tìm Kiếm (Filtering & Search)
- **Lọc theo định dạng (Format Filter)**:
  - `Tất cả định dạng` (All)
  - `Tài liệu PDF (.pdf)`
  - `Sách điện tử EPUB (.epub)`
  - `Ghi chép Markdown (.md)`
- **Lọc theo nguồn (Source Filter)**:
  - `Tất cả nguồn`
  - `Obsidian Vault` (Đọc từ Vault qua API `/api/obsidian/vault/*`)
  - `Thư viện nội bộ` (Đọc từ `/api/docs/*`)
- **Tìm kiếm thời gian thực (Real-time Search)**: Tìm theo tiêu đề, đường dẫn tương đối và danh mục.
- **Sắp xếp linh hoạt (Sorting Options)**:
  - `Gần đây nhất` (Mới cập nhật)
  - `Tên A-Z`
  - `Kích thước tệp (Dung lượng)`

#### 1.2. Chế Độ Hiển Thị Hybrid (Card / List View Toggle)
- **Chế độ Lưới (Card Grid)**: Hiển thị bìa/icon định dạng nổi bật (Rose cho PDF, Amber cho EPUB, Purple cho Markdown), tiêu đề rõ ràng, dung lượng, và nhãn nguồn.
- **Chế độ Danh sách (Compact List)**: Bảng thông tin tối ưu mật độ cho phép duyệt nhanh hàng trăm tài liệu.

#### 1.3. Khu Vực "Đang Đọc Gần Đây" (Recent Reads)
- Hiển thị thanh tài liệu đã mở gần nhất dựa trên `globalReadingPositionStore` giúp tiếp tục đọc chỉ với 1 click.

---

### Module 2: Không Gian Đọc Hợp Nhất (Unified Reader Workspace - `UnifiedResearchReader.tsx`)

Không gian đọc tích hợp hỗ trợ PDF, EPUB, Markdown với giao diện chuyên dụng:

#### 2.1. Thanh Công Cụ Đỉnh (Reader Top Bar - `ReaderHeader.tsx`)
- Hiển thị tiêu đề tài liệu, định dạng (badge màu sắc nhận diện), và đường dẫn nguồn.
- Điều khiển hiển thị: Thu phóng (Zoom in/out), Chế độ trang đơn / trang đôi (Single/Double page cho EPUB/PDF).
- Nút bật/tắt **Multi-Tab Sidebar**.

#### 2.2. Thanh Công Cụ Lựa Chọn Nổi (Unified Selection Toolbar - `UnifiedSelectionToolbar.tsx`)
Khi người dùng bôi đen văn bản trong tài liệu:
1. **Sao chép (Copy)**: Ghi văn bản vào clipboard an toàn qua `copyTextToClipboard` kèm visual feedback "Đã chép".
2. **Đánh dấu (Highlight)**: Đánh dấu đoạn văn bản với mã màu nghiên cứu.
3. **Trích dẫn (Citation)**: Tạo trích dẫn học thuật tự động (APA / Markdown blockquote) kèm số trang hoặc tiêu đề mục.
4. **Gửi vào Ghi chú (Send to Note)**: Mở modal chọn Ghi chú đích (`TargetNoteSelectorModal`) để chèn trích đoạn.
5. **Thêm vào Hộp tiếp nhận (Add to Inbox)**: Đưa trích đoạn vào `ResearchInbox` để xử lý sau.

#### 2.3. Bảng Điều Hướng Đa Năng (Reader Sidebar 4-Tab Panel - `ReaderSidebar.tsx`)
Sidebar dạng Tabbed Panel có thể gập/mở:
- **Tab 1 — Mục Lục (`Outline`)**: Cây cấu trúc tiêu đề (Headings) cho Markdown, mục lục chương hồi cho EPUB, danh sách trang cho PDF. Nhấp vào mục sẽ cuộn mượt đến vị trí tương ứng.
- **Tab 2 — Ghi Chú (`Notes`)**: Danh sách các ghi chú liên quan hoặc ghi chú được tạo từ tài liệu đang đọc.
- **Tab 3 — Đoạn Đánh Dấu (`Highlights`)**: Tổng hợp các đoạn trích đã đánh dấu trong phiên đọc hiện tại.
- **Tab 4 — Hộp Tiếp Nhận (`Inbox`)**: Tích hợp danh sách `researchInboxItems` chưa xử lý ngay trong sidebar để tra cứu chéo mà không cần rời trang đọc.

---

### Module 3: Hộp Tiếp Nhận Nghiên Cứu (Research Inbox Triage Queue)

Quản lý luồng xử lý trích đoạn học thuật:

#### 3.1. Cấu Trúc Dữ Liệu (`ResearchInboxItem`)
*Bảo toàn 100% schema hiện tại trong `src/types/index.ts`:*
```typescript
export interface ResearchInboxItem {
  id: string;
  excerptId: string;
  excerpt: ResearchExcerpt;
  isProcessed: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}
```

#### 3.2. Quy Trình Xử Lý Nhanh (Triage Actions)
- **Đánh dấu đã xử lý (Mark Processed)**: Chuyển `isProcessed = true` để dọn dẹp hàng đợi.
- **Bỏ qua (Dismiss)**: Ẩn khỏi danh sách hiển thị chưa xử lý.
- **Đúc kết thành Ghi chú (Send to Note)**: Mở modal chọn ghi chú và chèn trích dẫn kèm blockquote chuẩn.
- **Mở lại vị trí nguồn (Re-open Source Locator)**: Tự động mở tài liệu tương ứng trong `UnifiedResearchReader` và nhảy trực tiếp đến:
  - Markdown: `positionSelector.headingId`
  - PDF: `positionSelector.pageNumber`
  - EPUB: `positionSelector.cfi`

---

## 3. Ranh Giới & Non-Goals

1. **Không sửa REST API Backend / Prisma Schema**: Sử dụng toàn bộ các API endpoint và state in-memory / LocalStorage hiện có.
2. **Không ghi ngược vào Obsidian Vault**: Đảm bảo an toàn tuyệt đối cho thư mục tri thức gốc của người dùng.
3. **Phân tách commit rõ ràng**: Thực hiện theo từng wave nhỏ có unit/integration test đi kèm.
