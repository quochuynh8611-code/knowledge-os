# ADR-093: Phase P7.C — Minimal Active Tree Resolution for Document Lifecycle & Export Parity

## Status
Accepted & Implemented (Verification scope: targeted evidence only; full repository verification không thuộc vòng này.)

## Context
Trong `MindMapView.tsx`, `projection` đại diện cho cây read-only từ `DataContext`, còn `workingDocumentTree` đại diện cho bản sao working copy đang chỉnh sửa trên canvas.
Hiện tại, các hàm `handleSaveDocument`, `handleSaveVersion`, `handleCopyMarkdown`, `handleExportSvg`, và `handleExportPng` chỉ đọc từ `projection.tree`. Điều này dẫn đến nguy cơ:
- Lưu phiên bản hoặc tài liệu không đúng với những gì đang hiển thị trên canvas sau khi chỉnh sửa.
- Thao tác lưu bị chặn nếu tài liệu độc lập không có `projection` trong `DataContext`.
- File Markdown, SVG, PNG xuất bản không đồng bộ với nội dung vừa chỉnh sửa.

## Decision
1. **Áp dụng Minimal In-File Active Tree Resolution**:
   Tại `MindMapView.tsx`, phân giải cây mục tiêu trực tiếp:
   ```typescript
   const activeTree = workingDocumentTree || projection?.tree;
   ```
   Sử dụng `activeTree` làm tham số đầu vào cho `projectedTreeToDocumentTree` và `collectTreeNodeIds`.
2. **Không tạo Helper Bên Ngoài khi chưa cần thiết**:
   Tránh tạo thêm file adapter/abstraction mới. Sử dụng projection tối thiểu type-safe trực tiếp trong component cho các tác vụ export.
3. **Bảo Vệ Tính Toàn Vẹn Của Dirty State**:
   Đảm bảo `setIsDirty(false)` chỉ được gọi sau khi `result.success === true`.

## Consequences
- **Tích cực**:
  * Khắc phục nguy cơ sai lệch dữ liệu khi lưu và xuất bản.
  * Giữ phạm vi thay đổi tối thiểu (chỉ trong `MindMapView.tsx`).
  * Không tăng nợ kỹ thuật bằng việc sinh thêm file abstraction không cần thiết.
- **Rủi ro & Giảm thiểu**:
  * Khi `projection` là `null`, tài liệu độc lập có thể không có `crossEdges`. Giảm thiểu bằng cách fallback an toàn về mảng rỗng `[]` để các hàm export không bị crash.
