# ADR: Collapsible Left Rail Shell & Dynamic Tab Layout Policy

## Trạng thái (Status)
Đã chấp thuận (Accepted)

## Bối cảnh (Context)
Ứng dụng Knowledge OS Workbench bao gồm nhiều không gian làm việc chuyên sâu: Khảo cứu tài liệu/EPUB/PDF, Đồ thị tri thức (Knowledge Graph), Sơ đồ tư duy phân cấp (Mind Map), Studio nghiên cứu AI, Quản lý ghi chú & đúc kết, và Hệ thống ôn tập thẻ nhớ (Flashcards/SRS).
Trước đây, App Shell sử dụng một thanh điều hướng dọc cố định `w-64` (256px) không thể thu gọn, và toàn bộ vùng trung tâm bị bó hẹp trong container `max-w-7xl` (1280px) ngoại trừ một ngoại lệ hardcoded duy nhất dành riêng cho tab `library` (`max-w-[1700px] 2xl:max-w-[1800px]`).

Đồng thời, tab Thư Viện Sách (`DocsExplorerView`) đã chứng minh tính hiệu quả cao về mặt UX khi trang bị panel danh mục sách bên trái có nút toggle thu gọn/mở rộng (`isLeftSidebarCollapsed`), cho phép người dùng mở rộng tối đa không gian đọc sách và tài liệu.

## Vấn đề hiện tại (Problem Statement)
1. **Thiếu không gian ngang cho các công cụ trực quan**: Knowledge Graph và Mind Map cần canvas rộng tối đa (full width) để quan sát các node và kết nối chéo mà không bị kẹp giữa sidebar 256px và lề max-w-7xl.
2. **Dashboard, Notes, Search, AI Studio bị co hẹp không cần thiết**: Khi người dùng làm việc trên màn hình lớn (1440px - 2560px), hơn 40% diện tích hai bên bị lãng phí do container `max-w-7xl`.
3. **Sidebar cố định chiếm dụng diện tích**: Người dùng chuyên tâm ghi chú hoặc phân tích biểu đồ không có cách nào thu nhỏ thanh điều hướng để tập trung vào nội dung chính.
4. **Logic layout manh mún trong App.tsx**: Việc kiểm tra `activeTab === "library"` để đổi max-width gây khó khăn cho việc bảo trì và mở rộng thêm các tab khác.

## Quyết định thiết kế (Design Decision)

### 1. Kiến trúc AppShell & AppSidebar
Tách biệt cấu trúc layout thành các module chuyên biệt:
- `src/components/layout/AppShell.tsx`: Quản lý layout tổng thể (Top Navbar + Collapsible Left Sidebar + Main Stage + Mobile Bottom Nav).
- `src/components/layout/AppSidebar.tsx`: Thanh điều hướng bên trái có 2 trạng thái:
  - **Expanded (`w-64` ~ 256px)**: Hiển thị đầy đủ icon, nhãn chữ (labels), huy hiệu (badges), tiêu đề phân nhóm (Hubs), danh mục lĩnh vực nghiên cứu và widget thời gian học.
  - **Collapsed (`w-18` ~ 72px)**: Thu gọn thành thanh ray (icon rail), hiển thị icon căn giữa, badge tối giản, tooltip hiển thị nhãn khi hover (`title` / `aria-label`), và nút toggle mở rộng nhanh.
- Nút toggle collapse/expand: Sử dụng biểu tượng `PanelLeftClose` (khi mở) và `PanelLeftOpen` (khi thu gọn), đồng bộ tinh thần với panel danh mục của Thư Viện Sách.
- Lưu trữ trạng thái: Trạng thái thu gọn/mở rộng được lưu vào `localStorage` (`app-shell-sidebar-collapsed`) để duy trì trải nghiệm liền mạch qua các lần tải lại trang.

### 2. Chính sách vùng chứa nội dung theo Tab (Tab Layout Policy)
Tạo module `src/components/layout/layoutPolicy.ts` phân loại không gian hiển thị cho các màn hình theo 4 cấp độ:
- **`full` (Toàn màn hình / Edge-to-Edge Canvas)**:
  - Áp dụng cho: `graph` (Knowledge Graph), `mindmap` (Mind Map View), `library` (Thư Viện Sách).
  - Vùng chứa: `w-full h-full min-w-0 max-w-none`.
- **`wide` (Không gian rộng / Data-rich & Multi-column)**:
  - Áp dụng cho: `dashboard`, `notes`, `resources`, `progress`, `search`, `ai_studio`.
  - Vùng chứa: `w-full max-w-[1600px] 2xl:max-w-[1850px] mx-auto min-w-0`.
- **`constrained` (Không gian tập trung / Reading & Review focus)**:
  - Áp dụng cho: `topics` (Chi tiết & cây chủ đề), `flashcards` (Phiên ôn tập & khởi tạo học).
  - Vùng chứa: `w-full max-w-5xl 2xl:max-w-6xl mx-auto min-w-0`.

### 3. Bảo toàn trải nghiệm Di Động (Mobile Bottom Nav)
- Giữ nguyên thanh Bottom Navigation cố định dưới đáy màn hình trên màn hình nhỏ (`md:hidden`), bảo đảm không làm gián đoạn thói quen sử dụng trên điện thoại di động.

## Trade-offs & Cân nhắc
- **Thu gọn Sidebar trên Desktop**: Khi thu gọn sidebar, các tiêu đề nhóm (Hubs) và danh sách chi tiết các Lĩnh vực nghiên cứu sẽ không hiển thị chữ, thay vào đó hiển thị dưới dạng nút biểu tượng có tooltip hỗ trợ nhanh. Người dùng chỉ cần 1 click để bung lại toàn bộ khi cần lọc sâu theo lĩnh vực.
- **Tính trơn tru của animation**: Sử dụng CSS transition mượt mà (`transition-all duration-200`) để tránh giật khung hình khi thay đổi kích thước canvas của Graph và Mindmap.

## Phạm vi không sửa (Out of Scope)
- Không can thiệp vào logic nội bộ của Thư Viện Sách (`DocsExplorerView`) và bộ đọc EPUB/PDF (`UnifiedResearchReader`).
- Không thay đổi semantics và luồng định tuyến của `NavigationContext` (`activeTab`, `selectedTopicId`, `subView`, hash routing).
- Không sửa data model hoặc backend API endpoints.
