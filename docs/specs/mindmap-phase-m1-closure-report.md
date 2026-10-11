# Phase M1 Closure Report — External Markdown Import to Saved Mind Map Document

**Trạng thái**: Implementation hoàn tất; đã kiểm chứng qua targeted tests, regression suites liên quan và TypeScript compile (Pending Commit)  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Ngày hoàn tất**: 2026-10-11  
**Giai đoạn trước**: Phase P7.C (Commit `cfc74c4`)  
**Tài liệu tham chiếu**:
- `tests/unit/mindmap-import-file-to-document.test.tsx`
- `tests/unit/mindmap-import-preview-modal.test.tsx`
- `src/components/mindmap/MindMapImportPreviewModal.tsx`
- `src/components/mindmap/MindMapView.tsx`

---

## 1. Problem Statement & Mục Tiêu Đạt Được

### 1.1. Bối cảnh
Trước Phase M1, `MindMapImportPreviewModal` chỉ hỗ trợ dán thủ công markdown và nhập dữ liệu vào cơ sở tri thức chính thức (`ingestMindMapAst` -> Live topic graph) với yêu cầu bắt buộc phải chọn `targetCategoryId`. Người dùng chưa có phương thức:
1. Nạp trực tiếp tệp `.md` từ máy tính cục bộ.
2. Lưu cây sơ đồ tư duy đã parse thành một tài liệu sơ đồ độc lập (`saved-document`) trong local-first document storage để mở lại về sau mà không cần ghi vào Topic Graph.

### 1.2. Giải pháp kỹ thuật đã triển khai (Phase M1)
1. **Client-Side File Picker**:
   - Thêm `<input type="file" accept=".md,text/markdown,text/plain" data-testid="import-file-input">` cùng nút giao diện `btn-pick-file`.
   - Đọc nội dung client-side (hỗ trợ cả `file.text()` và `FileReader.readAsText`), cập nhật vào `markdownText` và lưu lại tên file nguồn (`importedFileName`).
   - Đảm bảo **Zero-Write Invariant**: Việc chọn file tuyệt đối không sinh side-effect lưu trữ hay ghi đè CSDL.
2. **Phân nhánh 2 CTA độc lập**:
   - `Lưu thành tài liệu` (`btn-save-as-document`): Chỉ yêu cầu dàn ý markdown hợp lệ (không lỗi cú pháp, có root). Không yêu cầu `targetCategoryId`.
   - `Nhập vào CSDL` (`btn-trigger-import`): Giữ nguyên cơ chế kiểm soát chặt chẽ theo danh mục đích (`targetCategoryId`).
3. **Chiến lược đặt tên tài liệu (Document Naming Strategy)**:
   - Ưu tiên 1: Tiêu đề node gốc (`root.title`).
   - Ưu tiên 2: Tên tệp nạp vào (loại bỏ hậu tố `.md` / `.txt`).
   - Ưu tiên 3: `Imported Mind Map <ngày_hiện_tại>`.
4. **Instant Open & Reopenable Lifecycle**:
   - Ngay sau khi lưu thành công qua `createMindMapDocument`, kích hoạt callback `onDocumentCreated(documentId)` truyền về `MindMapView`.
   - `MindMapView` chuyển ngay sang chế độ `saved-document`, tải `workingDocumentTree` của document vừa tạo và đóng modal import.
   - Tài liệu xuất hiện trong `MindMapDocumentBrowserModal` và có thể mở lại hoàn toàn bình thường.
5. **Resilience & Accessibility Hardening**:
   - Bổ sung `aria-disabled` và `title` mô tả trạng thái cho nút lưu tài liệu.
   - Bổ sung error handler khi đọc file hoặc khi storage trả về `success: false` (`errorMessage`), giữ nguyên modal để người dùng không bị mất dữ liệu dàn ý đang nhập.
   - Reset `importedFileName` khi người dùng bấm "Dán Mẫu" hoặc "Xóa nội dung".

---

## 2. Files Changed Thực Tế

### 2.1. Runtime Code:
1. `src/components/mindmap/MindMapImportPreviewModal.tsx`:
   - Thêm `onDocumentCreated` prop.
   - Thêm `importedFileName` state, `handleFileChange`, `resolveDocumentTitle`, `handleSaveAsDocument`.
   - Bổ sung UI file picker trong Markdown Toolbar và nút CTA `btn-save-as-document` trong modal footer.
   - Củng cố error handling và a11y attributes.
2. `src/components/mindmap/MindMapView.tsx`:
   - Gắn `onDocumentCreated` cho `<MindMapImportPreviewModal>` để tự động mở document vừa tạo qua `handleOpenSavedDocument(documentId)` và cập nhật revision số tài liệu đã lưu.

### 2.2. Test Suites:
1. `tests/unit/mindmap-import-file-to-document.test.tsx` (Mới):
   - 7 kịch bản kiểm thử toàn diện: File picker nạp text, diagnostics cập nhật, phân tách 2 CTA, validation cú pháp, đặt tên tài liệu, instant open + reopenable, và storage failure fallback.

### 2.3. Specification & Closure:
1. `docs/specs/mindmap-phase-m1-closure-report.md` (Tài liệu này).

---

## 3. Những Gì Được Sửa và Không Sửa

### Được Sửa:
- Bổ sung khả năng nạp file `.md` và lưu thành local-first document vào `MindMapImportPreviewModal`.
- Wire callback mở document vào `MindMapView`.
- Viết bộ unit/integration test suite hoàn chỉnh.

### Không Sửa (Bảo toàn Blast Radius):
- **Không sửa `prisma/schema.prisma` và backend APIs**: Hệ thống hoàn toàn client-side local-first.
- **Không sửa `src/context/DataContext.tsx`**: Topic graph và context contract được bảo toàn nguyên vẹn.
- **Không sửa parser core (`mindmapImportParser.ts`)**: Tái sử dụng trọn vẹn AST parser hiện có.
- **Không phá vỡ lifecycle parity của Phase P7.C**: Toàn bộ luồng lưu và xuất bản trên active document được giữ nguyên.

---

## 4. Verification Evidence

| Test Suite / Command | Kết Quả | Chi Tiết |
| :--- | :---: | :--- |
| `tests/unit/mindmap-import-file-to-document.test.tsx` | **PASSED (7/7)** | Bao phủ toàn bộ flow import file -> preview -> create document -> instant open |
| `tests/unit/mindmap-import-preview-modal.test.tsx` | **PASSED (11/11)** | Giữ vững toàn bộ sandbox preview invariants và ingestion modal behavior |
| `tests/unit/mindmap-document-lifecycle-parity.test.tsx` | **PASSED (7/7)** | Đảm bảo tính nhất quán của active tree lifecycle từ Phase P7.C |
| `tests/unit/mindmap-persistence-ui.test.tsx` | **PASSED (10/10)** | Đảm bảo các modal Save và Document Browser hoạt động ổn định |
| `npx tsc --noEmit` | **PASSED (Exit 0)** | Zero TypeScript compile errors |

---

## 5. Remaining Risks & Đề Xuất Phase Kế Tiếp

### 5.1. Remaining Risks
- **Trình duyệt dung lượng thấp (Storage Quota)**: Khi tài liệu import chứa hàng trăm node, nếu `localStorage` bị đầy, hệ thống sẽ rơi về `volatile storage` (RAM). Đã có warning banner cảnh báo người dùng.
- **Node Metadata chi tiết**: Cây sơ đồ sau khi import từ markdown lưu giữ cấu trúc phân cấp và nhãn; các thông tin nâng cao như ghi chú chi tiết từng node (node detail notes) hiện chưa có giao diện chỉnh sửa inline.

### 5.2. Đề xuất Phase M2 — Inline Node Drawer for Saved Mind Map Documents
- Cho phép người dùng click vào bất kỳ node nào trên tài liệu đã lưu để mở Slide-over Drawer.
- Cho phép xem và chỉnh sửa:
  - Markdown note chi tiết của node.
  - Phân loại (node category/type).
  - Trạng thái hoàn thành / tiến độ.
- Tự động đánh dấu `isDirty` và hỗ trợ lưu phiên bản mới (`appendMindMapVersion`) khi chỉnh sửa node.
