# Đặc Tả Kỹ Thuật: Phase M4a — Mind Map Export UX Hardening

**Ngày ban hành**: 2026-10-11  
**Trạng thái**: Implemented & Verified Locally (Local-only / Uncommitted)  
**Tác giả**: Staff Software Engineer kiêm Technical Architect  
**Phạm vi**: Mind Map Subsystem (`MindMapView.tsx`, export workflow)  

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

### 1.1. Ngữ cảnh
Hệ thống sơ đồ tư duy (Mind Map) của Knowledge OS đã phát triển qua các giai đoạn vững chắc:
- Nền tảng chiếu đồ thị (Projection Engine) tạo cây tự động từ `Topic` và `Note`.
- Quản lý phiên bản và lưu trữ tài liệu độc lập (`MindMapDocumentStorage`, Phase P1-P7).
- Thao tác cây tư duy nâng cao bằng chuột và bàn phím (Phase M2 Node Drawer, Phase M3 Keyboard Authoring).
- Nền tảng xuất file vector SVG độc lập W3C và raster hóa PNG 2x độ nét cao (`src/lib/mindmapExport.ts`).

### 1.2. Vấn đề thực tế (UX Gaps)
Mặc dù module hạ tầng xuất file (`mindmapExport.ts`) hoạt động chính xác ở mức unit test, luồng tương tác người dùng (UX workflow) trong giao diện [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) còn tồn tại các khiếm khuyết lớn:
1. **Sai lệch tên file tải về trong chế độ tài liệu đã lưu (`saved-document` mode)**:
   - Handler xuất file (`handleExportSvg` và `handleExportPng`) luôn truyền `projection.rootTitle` vào bộ sinh tên file `getMindMapExportFilename`.
   - Khi người dùng đặt tên tài liệu là *"Chuyên Đề Trí Tuệ Nhân Tạo 2026"* nhưng node gốc của cây có tiêu đề là *"Khởi Điểm Nhỏ"*, file tải về bị gán tên `MindMap-Khoi_Diem_Nho-...` thay vì `MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-...`, gây nhầm lẫn nghiêm trọng trong việc lưu trữ tài liệu bên ngoài hệ thống.
2. **Thiếu phản hồi trực quan khi xuất file thành công (Missing Success Feedback)**:
   - Khi người dùng bấm "Xuất SVG" hoặc "Xuất PNG", trình duyệt kích hoạt thẻ `<a download>`, nhưng giao diện ứng dụng hoàn toàn im lặng, không có thông báo xác nhận thành công (khác với nút sao chép Outline Markdown vốn có phản hồi `Đã sao chép!`).
3. **Nuốt lỗi trong im lặng khi xuất ảnh thất bại (Silent Failure & Missing Error Feedback)**:
   - Khi tiến trình rasterize PNG gặp lỗi (ví dụ bộ nhớ canvas bị vượt quá dung lượng, lỗi giải mã ảnh, hoặc context 2D bị null), `handleExportPng` chỉ ghi log ra `console.error` và không đưa ra bất kỳ cảnh báo nào cho người dùng. Người dùng không hiểu vì sao file không được tải xuống.

---

## 2. Phạm Vi Thực Hiện (Scope Statement)

### 2.1. In-Scope (Trong phạm vi)
- Chuẩn hóa quy tắc đặt tên file tải về (Filename Resolution Contract) nhất quán cho cả SVG và PNG.
- Ưu tiên `activeDocumentSummary.title` khi ở chế độ `saved-document`; fallback về `projection.rootTitle` và `"Topic"`.
- Bổ sung phản hồi trực quan người dùng (Toast notification) cho cả kịch bản thành công và thất bại khi xuất file SVG/PNG.
- Tái sử dụng component thông báo có sẵn [`src/components/ui/Toast.tsx`](../../src/components/ui/Toast.tsx), không cài thêm thư viện phụ thuộc.
- Bảo toàn tuyệt đối các bất biến trạng thái: thao tác xuất file là Read-Only, không làm bẩn tài liệu (`isDirty === false`), không đẩy entry rác vào Undo/Redo stack.
- Dọn dẹp an toàn tài nguyên Blob URL (`URL.revokeObjectURL`) trong khối `finally`.
- Bộ kiểm thử tích hợp tự động [`tests/integration/mindmap-export-workflow.test.tsx`](../../tests/integration/mindmap-export-workflow.test.tsx).

### 2.2. Out-of-Scope (Ngoài phạm vi)
- Thay đổi cấu trúc dữ liệu cây (`MindMapDocumentNode`, `MindMapTreeNode`).
- Thay đổi Prisma schema hoặc backend API routes (zero schema migration).
- Viết lại thuật toán chiếu đồ thị [`src/lib/mindmapProjection.ts`](../../src/lib/mindmapProjection.ts).
- Các cải tiến về thanh trượt zoom, minimap viewport polish hoặc responsive pan/zoom (dành riêng cho Phase M4b).

---

## 3. Quy Ước Kiến Trúc & Hợp Đồng Giao Diện (Design Contracts)

### 3.1. Filename Resolution Contract
Hàm sinh tên file tải về tuân theo thứ tự phân giải nghiêm ngặt:

```text
Chế độ "saved-document":
  1. activeDocumentSummary.title (nếu tồn tại và không rỗng)
  2. projection.rootTitle (nếu có)
  3. "Topic" (fallback cuối)

Chế độ "live-topic":
  1. projection.rootTitle (nếu có)
  2. "Topic" (fallback cuối)
```

Quy tắc chuẩn hóa (`getMindMapExportFilename`):
- Bỏ dấu tiếng Việt (`removeVietnameseTones`).
- Thay thế các ký tự không phải chữ và số thành dấu gạch dưới `_`.
- Cấu trúc định dạng: `MindMap-${safeTitle}-${layoutMode}-${dateISO}.${extension}`.
- Ví dụ: `MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-tree_horizontal-2026-10-11.svg`.

### 3.2. Feedback & Notification Contract
Sử dụng component chuẩn của hệ thống:
```tsx
<Toast
  message={toast.message}
  type={toast.type}
  onClose={() => setToast(null)}
/>
```
- **Kịch bản SVG thành công**: `type: "success"`, message: `"Đã xuất file SVG thành công!"` (Role: `status`, aria-live: `polite`).
- **Kịch bản SVG lỗi**: `type: "error"`, message: `"Không thể xuất file SVG. Vui lòng thử lại."` (Role: `alert`, aria-live: `assertive`).
- **Kịch bản PNG thành công**: `type: "success"`, message: `"Đã xuất ảnh PNG thành công!"` (Role: `status`, aria-live: `polite`).
- **Kịch bản PNG lỗi**: `type: "error"`, message: `"Không thể xuất file PNG. Vui lòng thử lại sau."` (Role: `alert`, aria-live: `assertive`).

### 3.3. State Invariants (Bất biến trạng thái)
1. **Read-Only Invariant**: Việc nhấp vào nút xuất file SVG/PNG tuyệt đối không làm thay đổi cờ `isDirty`. Giao diện không được hiển thị huy hiệu chưa lưu hay kích hoạt cảnh báo rời trang.
2. **History Isolation Invariant**: Thao tác xuất file không tương tác với `applyTreeMutation` hay `setHistoryState`. Nút Undo (`mindmap-undo-button`) và Redo (`mindmap-redo-button`) giữ nguyên trạng thái `disabled`.
3. **Loading State Resilience**: Trạng thái `isExportingPng` được bật `true` khi bắt đầu rasterize và bắt buộc được đưa về `false` trong khối `finally`, không bao giờ để nút bị kẹt ở trạng thái disabled.

---

## 4. Kịch Bản Kiểm Thử & Chấp Nhận (Gherkin Scenarios)

### Kịch bản 1: Xuất file SVG trong chế độ tài liệu đã lưu
```gherkin
Given Người dùng đang mở một tài liệu sơ đồ tư duy đã lưu có tiêu đề "Chuyên Đề Trí Tuệ Nhân Tạo 2026"
And Node gốc của cây có tiêu đề là "Khởi Điểm Nhỏ"
When Người dùng nhấp vào nút "Xuất SVG" (data-testid="btn-export-svg")
Then Trình duyệt tạo phần tử tải về có tên file là "MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-tree_horizontal-<YYYY-MM-DD>.svg"
And Tên file không chứa chuỗi "Khoi_Diem_Nho"
And Một thông báo Toast thành công với role="status" xuất hiện với nội dung "Đã xuất file SVG thành công!"
And Tài liệu không bị đánh dấu là có thay đổi chưa lưu (isDirty là false)
And Nút Undo vẫn ở trạng thái disabled
```

### Kịch bản 2: Quản lý trạng thái đang xử lý khi xuất PNG
```gherkin
Given Người dùng đang mở sơ đồ tư duy hợp lệ
When Người dùng nhấp vào nút "Xuất PNG" (data-testid="btn-export-png")
Then Nút "Xuất PNG" ngay lập tức bị vô hiệu hóa (disabled)
And Nhãn của nút chuyển thành "Đang xuất PNG..."
When Quá trình rasterize hoàn tất
Then Nút trở lại trạng thái khả dụng với nhãn "Xuất PNG"
And Thông báo Toast thành công xuất hiện
```

### Kịch bản 3: Xử lý an toàn khi rasterize PNG gặp lỗi
```gherkin
Given Quá trình rasterize SVG sang PNG bị lỗi (Canvas context null hoặc tràn bộ nhớ)
When Người dùng nhấp nút "Xuất PNG"
Then Ứng dụng không bị sập hay ném ngoại lệ không bắt được
And Nút "Xuất PNG" phục hồi về trạng thái khả dụng bình thường
And Một thông báo Toast lỗi với role="alert" xuất hiện với nội dung "Không thể xuất file PNG. Vui lòng thử lại sau."
```

---

## 5. Bằng Chứng Xác Minh (Verification Evidence)

### 5.1. Integration Test Suite
- **Tập tin**: [`tests/integration/mindmap-export-workflow.test.tsx`](../../tests/integration/mindmap-export-workflow.test.tsx)
- **Kết quả**: **7/7 PASS (100%)**
  1. `SVG export triggers download with sanitized filename matching active document title in saved-document mode`: PASS
  2. `PNG export manages loading state and disables button during rasterization`: PASS
  3. `Export triggers visible user feedback upon successful completion`: PASS
  4. `Export triggers error feedback when PNG rasterization fails without uncaught crash`: PASS
  5. `Export operations do not mark saved document as dirty`: PASS
  6. `Export operations do not pollute canvas undo/redo history stack`: PASS
  7. `Saved-document filename contract prioritizes document title over tree root node title for both SVG and PNG`: PASS

### 5.2. Core Regression Test Suites
- **Lệnh thực thi**: `npx vitest run tests/integration/mindmap-export-workflow.test.tsx tests/unit/mindmap-svg-export.test.ts tests/unit/mindmap-undo-redo.test.tsx tests/unit/mindmap-document-storage.test.ts tests/unit/mindmap-projection.test.ts`
- **Kết quả**: **66/66 PASS (100%)**

### 5.3. TypeScript Strict Typecheck
- **Lệnh thực thi**: `npx tsc --noEmit`
- **Kết quả**: **Exit code 0 (0 errors, 0 warnings)**

---

## 6. Ranh Giới Bảo Vệ & Tính Bất Biến (Protected Boundaries)
Các tập tin và mô-đun sau đây được bảo vệ nguyên vẹn 100%, không bị can thiệp trong phase này:
- `src/lib/mindmapProjection.ts`
- `src/components/mindmap/MindMapTreeCanvas.tsx`
- `src/lib/knowledgeGraph.ts`
- `prisma/schema.prisma`
- `server.ts`
- `package.json`
