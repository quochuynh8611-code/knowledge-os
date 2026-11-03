# Nhật Ký Khắc Phục Lỗi Mở Archive PDF Trong DocsExplorerView (Slice Library PDF Routing)

**Thời điểm thực hiện**: 2026-11-03 (03:30 - 04:05 UTC)
**Trạng thái**: HOÀN THÀNH — Đạt Quality Gates, đã Cutover Gate A, Verify Gate B qua MCP, và Người dùng đã xác nhận thực tế.

---

## 1. Bối Cảnh & Triệu Chứng Ban Đầu
- **Triệu chứng**: Người dùng phản ánh một số tài liệu PDF lưu trữ trong Archive (như "SGK Tin học 7 KNTT" hoặc "SGK - Toán 7 - Tập 2 - Chương trình mới") mở được từ khu vực "Tài liệu & Giáo trình" (qua `ResourcesManager`), nhưng khi click mở từ **Thư Viện Sách** (cụ thể là "Đọc gần đây" - Recent Reads Shelf hoặc Reading Analytics Drilldown panel trong `DocsExplorerView`) thì bị lỗi `403 Forbidden` và giao diện PDF reader báo: *"Không thể hiển thị tài liệu PDF này"*.
- **Nguyên nhân cốt lõi**:
  - `DocsExplorerView` tại nhánh click xử lý PDF (`if (format === "pdf")`) mặc định chỉ sanitize đường dẫn tương đối và chuyển tất cả sang route static của Docs repository:
    `fileUrl = /api/docs/raw?path=${encodeURIComponent(sanitizedRelative)}`.
  - Các tài liệu Archive nằm trong thư mục lưu trữ `data/archive/pdf/...` với storage hash, không nằm trong cây thư mục `docs/`. Khi gọi `/api/docs/raw`, backend kiểm tra đường dẫn thư mục và từ chối truy cập (HTTP 403 Forbidden).
  - Thêm vào đó, logic `matchingArch` dùng chung ở đầu hàm có cơ chế tìm kiếm lỏng lẻo (OR-predicate gom cả filename suffix matching), dẫn đến rủi ro rò rỉ `documentId` hoặc `initialPosition` từ một record đứng trước sang record người dùng thực sự click.

---

## 2. Thiết Kế & Bản Sửa PDF-Only (DocsExplorerView)

Phạm vi sửa đổi được khoanh vùng tối thiểu và tập trung hẹp trong nhánh `if (format === "pdf")` của hàm `handleDocClick` tại `src/components/docs/DocsExplorerView.tsx`:

1. **Bảo vệ tuyệt đối Provenance của Docs Repository (Priority 1)**:
   - Nếu `doc.sourceType === "docs"` hoặc `(doc.sourceType !== "archive" && docs.some(...))` -> Giữ nguyên route Docs `/api/docs/raw`.
   - Các file thuộc Docs repository có cấu trúc thư mục dạng `pdf/xx/<hash>.pdf` được bảo vệ nghiêm ngặt không bị nhận nhầm sang Archive.
2. **Authoritative Archive PDF Resolution (Priority 2)**:
   - **Ưu tiên Exact ID**: Tìm kiếm bản ghi có `a.id === doc.id` trước tiên để loại trừ sự nhầm lẫn giữa các record cùng tên/suffix.
   - **Unambiguous Structural Fallback**: Nếu không tìm thấy exact ID, chỉ gán authoritative record khi và chỉ khi danh sách ứng viên cấu trúc (`storageRelPath`, `sourcePath`, hoặc `sourceKey === archive:...`) là duy nhất (`candidates.length === 1`). Không tự ý lấy phần tử đầu tiên nếu có nhiều ứng viên mơ hồ.
   - **Xác định Archive Identifier**: Trích xuất mã định danh hợp lệ theo độ tin cậy: `authoritativeArch.id` -> URI scheme `archive://<id>` -> regex storage path.
   - **Authoritative Reader Props**:
     - `fileUrl`: `/api/archive/file/${encodeURIComponent(archiveIdentifier)}` (HTTP 200 stream).
     - `documentId`: `authoritativeArch?.id || doc.id`.
     - `initialPosition`: Chỉ lấy từ `authoritativeArch?.lastPosition?.pageNumber` nếu tồn tại, ngược lại truyền `undefined`. **Tuyệt đối không dùng fallback `initialPos` của matching legacy** (loại bỏ hoàn toàn nguy cơ rò rỉ số trang từ filename suffix).
   - **Chốt chặn an toàn**: Nếu là nguồn Archive nhưng không giải quyết được identifier an toàn, hiển thị `recentReadsError` và dừng lại; không mở sai reader và không fallback về route Docs.
3. **Giữ nguyên các format ngoài scope**:
   - Vault documents, EPUB, Markdown giữ nguyên logic hiện hành.
   - Không thay đổi schema, migration, backend API hay cấu trúc storage.

---

## 3. Quá Trình Kiểm Thử Hermetic TDD (Targeted & Regression)

### 3.1. Targeted Test Suite (`tests/unit/docs-explorer-archive-pdf-routing.test.tsx`)
- **Vòng 1 (RED ban đầu -> GREEN)**:
  - Assertions click recent shelf & drilldown chuyển từ `/api/docs/raw` (FAIL) sang `/api/archive/file/:id` (PASS).
  - Kiểm tra regression Docs PDF có đường dẫn dạng hash vẫn giữ nguyên route `/api/docs/raw`.
- **Vòng 2 (Position Leakage RED -> GREEN)**:
  - Test case: `RED: clicking Archive PDF B without saved pageNumber does NOT leak pageNumber 99 from suffix-matching Record A`.
  - Kết quả trước sửa: `AssertionError: expected '99' to be undefined` (RED).
  - Kết quả sau sửa: `initialPosition` nhận `undefined`, reader mở ở trang mặc định (GREEN).
- **Kết quả targeted suite cuối**: **8/8 tests PASSED (100%)** (Exit code 0).

### 3.2. Regression Suites & Typecheck
- **DocsExplorer Regression**: `npx vitest run tests/unit/docs-explorer-*.test.tsx` -> **6 files, 30 tests PASSED (100%)**. *(Lưu ý: 8 targeted tests nằm trong bộ 30 tests này, không cộng dồn trùng lặp)*.
- **Reader Regression**: `npx vitest run tests/unit/reader-*.test.ts* tests/unit/embedded-research-reader.test.tsx` -> **31 files, 190 tests PASSED (100%)**.
- **Typecheck**: `NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit` -> **0 lỗi (PASS)**.

---

## 4. Cutover Gate A: Build Production & Restart Service

- **Thời điểm backup**: `20261103105348`.
- **Thư mục backup**: `dist.backup-20261103105348/`.
- **Đối chiếu Manifest**:
  - `dist.backup-20261103105348.source.manifest` vs `dist.backup-20261103105348.manifest`.
  - Lệnh: `diff -u ...` -> Exit code 0 (khớp 100%).
- **Lệnh Build**: `npm run build` (`vite build && esbuild server.ts ...`) -> Exit code 0 trong 41.12s.
- **Lệnh Restart Launchd**: `launchctl kickstart -k gui/501/com.knowledgeos.server` -> Exit code 0.
- **Runtime Verification**:
  - PID mới: `43502` (PPID `1`, thay thế cho PID `27514`).
  - `GET /api/health` -> HTTP 200 OK (`{"status":"ok","hasApiKey":true,...}`).
  - Bundle HTML phục vụ entry: `dist/assets/index-3TZ92ZJd.js` (SHA-256 HTTP khớp 100% với đĩa).
  - Chunk `DocsExplorerView`: `dist/assets/DocsExplorerView-QPJCDFjp.js` (SHA-256 HTTP khớp 100% với đĩa).
  - Dấu vết code mới: Chứa endpoint `/api/archive/file/` và chuỗi thông báo lỗi định danh.

---

## 5. Live Browser Verification Gate B (MCP) & Xác Nhận Người Dùng

### 5.1. Kiểm Tra Qua Chrome DevTools MCP Session
- **Browser Profile**: Chrome DevTools MCP Profile (`~/.cache/chrome-devtools-mcp/chrome-profile`), PID `27826`.
- **Xác nhận bundle**: Trình duyệt tải đúng `index-3TZ92ZJd.js` và `DocsExplorerView-QPJCDFjp.js`.
- **Kết quả điều hướng tài liệu thực tế**:
  1. *SGK - Toán 7 - Tập 2 - Chương trình mới* (`cf1fd5cf-d4ab-4383-b734-32e5b1635987`):
     - Đọc gần đây: `GET /api/archive/file/...` HTTP 200 OK (19.3 MB) -> PASS.
     - Drilldown Đang đọc: `GET /api/archive/file/...` HTTP 200 OK -> PASS.
     - Thẻ `<embed data-testid="pdf-embed-element" type="application/pdf">` hiển thị kích thước 931x700, biến mất hoàn toàn lỗi `<h3>Không thể hiển thị tài liệu PDF này</h3>`.
  2. *SGK Tin học 7 KNTT* (`4ed27405-2c6e-489a-acd0-5972b5566ec4`):
     - Đọc gần đây: `GET /api/archive/file/...` HTTP 200 OK (15.4 MB) -> PASS.
     - Thẻ `<embed>` hiển thị kích thước 931x700, không bị route sang Docs.
  3. *Lưu ý về Entry Point*:
     - Grid tài liệu tại `/docs` thuộc về Docs repository tĩnh (`/api/docs`). Hai tài liệu trên là file thuần Archive nên không xuất hiện trong grid `/docs` (`NOT_AVAILABLE`), chỉ xuất hiện tại Recent Reads / Drilldown của Thư viện sách và ResourcesManager.

### 5.2. Xác Nhận Từ Người Dùng
- Tại phiên làm việc ngày 03/11/2026, **Người dùng đã kiểm tra trực tiếp trên trình duyệt cá nhân hằng ngày và xác nhận mở PDF thực tế OK**, khép lại hoàn toàn triệu chứng lỗi được báo cáo ban đầu.

---

## 6. Giới Hạn Kiểm Chứng & Ghi Chú Kiến Trúc (Architecture Notes)
- Việc xuất hiện thẻ `<embed>` với HTTP 200 trong môi trường MCP là bằng chứng cấu trúc hợp lệ của reader, nhưng kiểm chứng nội dung đồ họa bên trong PDF renderer vẫn phụ thuộc vào xác nhận trực quan từ người dùng.
- Cơ chế gộp theo path trong builder `recentDocs` và các trường hợp fallback phức tạp khác chưa được kiểm thử toàn diện nằm ngoài phạm vi hẹp của slice này, cần được xem xét tách thành backlog kiến trúc nếu mở rộng thêm các loại định dạng đa nguồn.
- Toàn bộ protected assets, evidence logs (`t0-discovery.json`, `archive-unreferenced-inventory-2026-11-02.md`, v.v.) và các bản backup `dist.backup-*` được bảo toàn nguyên vẹn.
