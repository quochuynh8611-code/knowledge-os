# Specification: Phase P12.3 — In-App Docs Explorer & Markdown Viewer

## 1. Mục Tiêu & Trải Nghiệm Người Dùng (Overview & UX Goals)
- Cung cấp không gian nghiên cứu tài liệu kỹ thuật (**Docs Explorer**) ngay trên Dashboard, cho phép đọc và tra cứu trực tiếp toàn bộ ADRs, Technical Specs, Gherkin Scenarios, và Developer Guides được lưu trữ trong thư mục `docs/`.
- Tự động đồng bộ hóa thời gian thực với các tệp Markdown trên đĩa mà không cần biên dịch lại mã nguồn frontend.
- Cung cấp bộ lọc theo danh mục tài liệu, tìm kiếm nhanh và tích hợp sâu với Command Palette (`Cmd+K`).

### Wireframe Bố Cục Giao Diện (Split-Pane Layout)
```
+-----------------------------------------------------------------------------------------------------------------------+
|  [Header: 📖 Docs Explorer & Architecture SSOT]                                              [↻ Làm mới] [Sao chép]  |
+-------------------------------------------------------------+---------------------------------------------------------+
|  [Search Docs: Tìm kiếm ADR-061, P12.2, Taxonomy...]        |  # ADR-061: Multi-Facet Filtering Toolbar               |
|                                                             |                                                         |
|  [Tabs]: [ Tất Cả (80+) ] [ ADRs (50) ] [ Specs ] [ Gherkin]|  ## Status: ACCEPTED (Phase P12.2 Wave 3)               |
|                                                             |                                                         |
|  +-------------------------------------------------------+  |  ## Context                                             |
|  | ADR-061: Multi-Facet Filtering Toolbar                |  |  Sau khi hoàn thành P12.0 và P12.1...                   |
|  | [ACCEPTED] • adr/ADR-061... • 2 phút trước            |  |                                                         |
|  +-------------------------------------------------------+  |  ### 1. Phân Tầng Hệ Thống Facet                         |
|  | ADR-060: TCM Registry Integration & Taxonomy          |  |  - Tầng 1: Domain Facet (Phật Học: 154, Huyền Học: 73...)|
|  | [ACCEPTED] • adr/ADR-060... • 1 giờ trước             |  |  - Tầng 2: Source Type Facet (Từ Điển: 19, Ma Trận: 208)|
|  +-------------------------------------------------------+  |  - Tầng 3: Conditional TCM Subcategory (5 Huyệt...)     |
|  | p12-2-wave-3-multi-facet-filtering-toolbar.md          |  |                                                         |
|  | [SPEC] • specs/p12-2-wave-3... • 5 phút trước         |  |  ```ts                                                  |
|  +-------------------------------------------------------+  |  export interface TerminologyFacetCounts { ... }        |
|  | phase-p12-2-wave-3-multi-facet-filtering-toolbar.feat |  |  ```                                                    |
+-------------------------------------------------------------+---------------------------------------------------------+
```

---

## 2. Backend REST API Contract (`/api/docs`)

### Endpoint 1: Danh sách tài liệu (`GET /api/docs`)
- **Mục đích**: Quét cây thư mục `docs/` và trả về danh sách metadata.
- **Query Params**:
  - `category` (optional): `adr` | `specs` | `gherkin` | `runbooks` | `guides` | `all`
  - `search` (optional): chuỗi tìm kiếm theo tiêu đề hoặc filename
- **Response Success (200 OK)**:
  ```json
  {
    "total": 82,
    "categories": {
      "adr": 50,
      "specs": 24,
      "gherkin": 5,
      "runbooks": 1,
      "guides": 2
    },
    "documents": [
      {
        "id": "adr-061-multi-facet-filtering-toolbar",
        "title": "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon",
        "category": "adr",
        "relativePath": "adr/ADR-061-multi-facet-filtering-toolbar.md",
        "status": "ACCEPTED",
        "sizeBytes": 8055,
        "lastModified": "2026-08-30T05:13:20.000Z"
      }
    ]
  }
  ```

### Endpoint 2: Nội dung chi tiết tài liệu (`GET /api/docs/content`)
- **Mục đích**: Đọc nội dung Markdown của 1 tệp cụ thể.
- **Query Params**:
  - `path` (required): Đường dẫn tương đối từ thư mục `docs/` (ví dụ: `adr/ADR-061-multi-facet-filtering-toolbar.md`)
- **Response Success (200 OK)**:
  ```json
  {
    "id": "adr-061-multi-facet-filtering-toolbar",
    "relativePath": "adr/ADR-061-multi-facet-filtering-toolbar.md",
    "title": "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon",
    "category": "adr",
    "status": "ACCEPTED",
    "content": "# ADR-061: Multi-Facet Filtering Toolbar...",
    "sizeBytes": 8055,
    "lastModified": "2026-08-30T05:13:20.000Z"
  }
  ```
- **Error Responses**:
  - `400 BAD REQUEST`: Thiếu param `path` hoặc chứa ký tự độc hại (`..`, `\0`).
  - `403 FORBIDDEN`: Cố tình truy cập file ngoài thư mục `docs/`.
  - `404 NOT FOUND`: Tệp không tồn tại trong thư mục `docs/`.

---

## 3. Security & Path Sanitization Contract

```ts
export function sanitizeDocsPath(docsRoot: string, userPath: string): string | null {
  if (!userPath || typeof userPath !== 'string') return null;
  if (userPath.includes('\0') || userPath.includes('..')) return null;

  const normalized = path.normalize(userPath).replace(/^(\/|\\)+/, '');
  const resolved = path.resolve(docsRoot, normalized);

  if (!resolved.startsWith(docsRoot + path.sep)) {
    return null;
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext !== '.md' && ext !== '.feature') {
    return null;
  }

  return resolved;
}
```

---

## 4. Frontend Component Architecture & Routing

### 1. File Structure Đề Xuất
- `src/components/docs/DocsExplorerView.tsx`: Main split-pane view component.
- `src/components/docs/DocsListPane.tsx`: Left pane danh mục, bộ lọc category và ô tìm kiếm.
- `src/components/docs/DocsReaderPane.tsx`: Right pane render markdown với typography chuẩn Tailwind, code highlight và nút copy.
- `src/services/docsService.ts`: Client API adapter gọi `/api/docs` và `/api/docs/content`.

### 2. URL Deep-Linking
- Thêm `docs` vào `ActiveTab` trong `src/lib/urlRouting.ts`.
- Deep-link hỗ trợ:
  - `http://localhost:3000/#docs` $\rightarrow$ Mở tài liệu đầu tiên hoặc tài liệu gần nhất.
  - `http://localhost:3000/#docs?path=adr/ADR-061-multi-facet-filtering-toolbar.md` $\rightarrow$ Mở trực tiếp ADR-061.

---

## 5. Kế Hoạch Kiểm Thử (Test Scenarios Matrix)

1. **Unit Tests (Backend Service & Path Sanitization)**:
   - `tests/unit/docs-path-sanitization.test.ts`: Kiểm tra chống Path Traversal (`../../etc/passwd`, `/etc/hosts`, `../.env`, `\0`).
   - `tests/unit/docs-routes.test.ts`: Kiểm tra `GET /api/docs` trả về đủ danh mục và `GET /api/docs/content` trả về nội dung chính xác.
2. **Integration Tests (Frontend UI Explorer)**:
   - `tests/unit/docs-explorer-ui-integration.test.tsx`:
     - Render danh sách tài liệu từ mock API.
     - Lọc theo Category tabs (`ADRs`, `Specs`, `Gherkin`).
     - Tìm kiếm realtime trong danh sách.
     - Click chọn tài liệu và render nội dung Markdown.
     - Hiển thị Empty state và Error state khi file không tìm thấy (404).
