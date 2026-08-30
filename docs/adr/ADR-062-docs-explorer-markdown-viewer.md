# ADR-062: In-App Docs Explorer and Markdown Architecture Viewer

## Status
PROPOSED (Phase P12.3 Design Phase)

## Context
Trong suốt quá trình phát triển Dashboard Knowledge OS từ Phase P0 tới P12.2, toàn bộ quyết định kiến trúc (50+ ADRs), tài liệu đặc tả kỹ thuật (Specs) và kịch bản kiểm thử hành vi (Gherkin Features) đều được lưu trữ trực tiếp dưới dạng các tệp Markdown/Feature trong thư mục `docs/`.

Tuy nhiên, giao diện người dùng (Frontend SPA) hiện tại chưa có cơ chế đọc và hiển thị các tệp trong thư mục `docs/`. Khi các file markdown trên ổ đĩa được cập nhật bởi kỹ sư hoặc AI Agent, người dùng không thể tra cứu ngay trên Dashboard mà phải mở IDE hoặc trình soạn thảo bên ngoài.

Cần một cơ chế an toàn, hiệu năng cao và tự động cập nhật để tích hợp **Docs Explorer / Markdown Viewer** trực tiếp vào thanh điều hướng của Dashboard.

## Problem Statement
1. **Live Synchronicity (Tính đồng bộ thời gian thực)**: Khi một ADR hoặc Spec mới được tạo hoặc chỉnh sửa trên disk, người dùng trên Dashboard phải xem được ngay mà không cần build lại bundle frontend.
2. **Bundle Bloat Prevention (Tránh phình to gói ứng dụng)**: Toàn bộ thư mục `docs/` chứa hàng chục tệp markdown lớn; nếu dùng static bundling (`import.meta.glob` đóng gói cứng vào bundle), kích thước bundle sẽ phình to không cần thiết và mất tính linh hoạt.
3. **Security & Path Traversal Guard (Bảo mật đường dẫn)**: Khi mở endpoint đọc tài liệu từ file system, phải đảm bảo an toàn tuyệt đối, ngăn chặn triệt để tấn công Path Traversal (`../`), chỉ cho phép đọc các file markdown hợp lệ trong phạm vi thư mục `docs/`.
4. **Information Architecture & Usability (Trải nghiệm tra cứu)**: Cần bố cục Split-Pane chuyên nghiệp: Cột trái quản lý danh mục phân loại (ADR, Specs, Gherkin, Runbooks, Guides) kèm ô tìm kiếm nhanh; Cột phải render nội dung Markdown rõ ràng với Table of Contents (TOC) và nút Copy.

## Decision

### 1. Kiến Trúc Backend-Driven Document Service (REST API)
Tạo router mới `src/server/routes/docsRoutes.ts` được gắn vào Express server (`server.ts`):

- **`GET /api/docs`**: Quét cây thư mục `docs/`, trả về danh sách tài liệu có cấu trúc:
  ```json
  [
    {
      "id": "adr-061-multi-facet-filtering-toolbar",
      "title": "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon",
      "category": "adr",
      "relativePath": "adr/ADR-061-multi-facet-filtering-toolbar.md",
      "status": "ACCEPTED",
      "size": 8055,
      "lastModified": "2026-08-30T05:13:20.000Z"
    }
  ]
  ```
- **`GET /api/docs/content?path=adr/ADR-061-multi-facet-filtering-toolbar.md`**: Trả về raw markdown content và parsed metadata của tệp được yêu cầu.

### 2. Security Guardrails (Phòng Vệ Bảo Mật Nghiêm Ngặt)
- Xác thực và chuẩn hóa đường dẫn thông qua hàm pure `sanitizeDocsPath(requestedPath: string)`:
  - `DOCS_ROOT = path.resolve(process.cwd(), 'docs')`.
  - `resolvedPath = path.resolve(DOCS_ROOT, requestedPath)`.
  - Bắt buộc `resolvedPath.startsWith(DOCS_ROOT + path.sep)`.
  - Chỉ cho phép các extension an toàn: `.md`, `.feature`.
  - Từ chối ngay lập tức mã lỗi `400 INVALID_PATH` hoặc `403 FORBIDDEN` nếu phát hiện ký tự `..`, null-byte `\0` hoặc đường dẫn ngoài `docs/`.

### 3. Frontend Architecture: `DocsExplorerView.tsx` & Split-Pane Layout
- **Vị trí điều hướng**: Thêm tab `'docs'` vào `ActiveTab` trong `src/lib/urlRouting.ts` (`#docs` và deep-link `#docs?path=adr/ADR-061-multi-facet-filtering-toolbar.md`).
- **Sidebar Integration**: Thêm mục **"Tài liệu kiến trúc"** (Icon: `BookOpen`, Badge: `${totalDocs}`) vào thanh điều hướng chính.
- **Bố cục giao diện**:
  - **Left Pane (Danh mục & Tìm kiếm)**:
    - Search bar: Lọc tức thì theo tiêu đề, mã hiệu (ADR-061, P12.2), tag.
    - Category Tabs: `Tất Cả` | `ADRs` | `Specs` | `Gherkin` | `Guides & Runbooks`.
    - Document List: Danh sách thẻ tài liệu hiển thị Title, Category Badge, Status (ACCEPTED / PROPOSED), Ngày sửa đổi.
  - **Right Pane (Markdown Reader)**:
    - Header: Breadcrumb điều hướng, Status Badge, Nút "Sao chép Markdown", Nút "Làm mới (↻)".
    - Content: Markdown Renderer sạch sẽ với định dạng Typography thanh lịch, code highlighting, tables, callouts, blockquotes.

### 4. Integration với Command Palette
- Mở rộng `useCommandPalette.ts`: Tự động nạp danh sách ADRs và Specs vào Command Palette (`Cmd+K`).
- Người dùng có thể tìm nhanh: `Cmd+K` $\rightarrow$ gõ `"ADR-061"` $\rightarrow$ Enter để chuyển thẳng đến tài liệu trong Docs Explorer.

## Blast Radius
- **Rất an toàn & Phân lập cao**:
  - Thêm mới 1 API route độc lập (`/api/docs`), không can thiệp vào các API CRUD (`/api/topics`, `/api/notes`...).
  - Thêm mới 1 view component lười nạp (`DocsExplorerView.tsx` qua `React.lazy`), không làm chậm thời gian tải trang ban đầu.
  - 100% test suite hiện tại không bị ảnh hưởng.

## Non-goals
- Không hỗ trợ chỉnh sửa (Edit/Write) file docs từ giao diện người dùng trong đợt này (Docs Explorer là Read-Only an toàn).
- Không parse AST phức tạp trên server; chuyển raw markdown về client để client tự render nhằm giảm tải CPU server.
