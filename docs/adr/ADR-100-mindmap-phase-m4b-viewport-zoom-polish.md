# ADR-100: Tinh Chỉnh & Củng Cố Điều Khiển Khung Nhìn Sơ Đồ Tư Duy (Phase M4b-A Mind Map Viewport Zoom Polish)

**Ngày**: 2026-10-11  
**Trạng thái**: Accepted / Implemented & Verified (Direction A: Local Component Hardening)  
**Tác giả**: Staff Software Engineer kiêm Technical Architect  
**Phạm vi**: Mind Map Canvas Viewport ([`src/components/mindmap/MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx))  
**Tài liệu đặc tả**: [mindmap-phase-m4b-viewport-zoom-polish-spec.md](../specs/mindmap-phase-m4b-viewport-zoom-polish-spec.md)  

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Trong hệ thống sơ đồ tư duy (Mind Map), khi các nhánh kiến thức mở rộng với hàng chục nút phân cấp, khả năng điều hướng khung nhìn (zoom tỷ lệ, kéo rê khung nhìn, đưa toàn bộ sơ đồ về vừa vặn màn hình) là công cụ thiết yếu để người dùng bao quát bức tranh tổng thể.

Trước Phase M4b, module [`MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx) đã sở hữu logic zoom cơ bản (nút zoom in, out, reset, fit). Tuy nhiên, cần giải quyết các bài toán kiến trúc trọng yếu:
1. **State Ownership**: Liệu có nên đẩy (`lift`) trạng thái `zoom` và `pan` lên component cha [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) hay giữ nguyên cục bộ bên trong canvas?
2. **Sự kiện chuột rò rỉ (Pointer Event Leakage)**: Khi người dùng nhấp hoặc kéo rê trên widget điều khiển zoom hay bản đồ thu nhỏ (Minimap), liệu các sự kiện này có thể vô tình kích hoạt drag-to-pan hoặc vùng chọn Marquee trên canvas backdrop không?
3. **Tính ổn định của hàm tính toán Fit-to-Viewport**: Khi backdrop hoặc content chưa kịp mount hoặc có kích thước bằng 0 (ví dụ trong môi trường test jsdom hoặc tab bị ẩn), hàm tính toán cần phản ứng an toàn như thế nào để tránh chia cho 0 (`Infinity`) hoặc `NaN`?

---

## 2. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Lựa Chọn Hướng A — Giữ Nguyên Quyền Sở Hữu Cục Bộ (Local State Ownership)
- **Quyết định**: Duy trì trạng thái `zoom` và `pan` hoàn toàn bên trong [`MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx). Tuyệt đối **không** nâng trạng thái này lên [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx).
- **Lý do**:
  1. *Nguyên lý trách nhiệm duy nhất (SRP)*: Viewport transform (`translate`, `scale`) là chi tiết biểu diễn giao diện thuần túy của canvas đồ họa. `MindMapView` chỉ cần quản lý mô hình dữ liệu (Document, History, Mode, Drawer, Modals).
  2. *Blast Radius cực nhỏ*: Giữ trạng thái cục bộ giúp ngăn ngừa render cascade không cần thiết lên toàn bộ các component con khác trong `MindMapView`.
  3. *Zero Regression*: Không làm thay đổi interface hay props công khai của `MindMapTreeCanvas`.

### Quyết định 2: Trích Xuất Các Helper Thuần Túy Cho Viewport Arithmetic
- Định nghĩa và export 3 hàm tiện ích thuần túy (Pure Functions):
  - `clampZoom(zoom: number, min = 0.5, max = 2.0): number`
  - `formatZoomPercent(zoom: number): string`
  - `computeFitScale(backdropW: number, backdropH: number, contentW: number, contentH: number, currentZoom: number, padding = 64): { scale: number; pan: { x: number; y: number } }`
- **Lý do**: Tăng cường khả năng kiểm thử biên (Edge Case Testability) độc lập với DOM layout (ví dụ kiểm thử kích thước âm, bằng 0, kích thước siêu lớn) mà không cần phụ thuộc vào việc mock phức tạp.

### Quyết định 3: Phòng Vệ Đa Tầng Cho Sự Kiện Pointer (Defense-in-Depth Event Isolation)
- Củng cố cô lập sự kiện trên widget điều khiển:
  - Trên `<div data-testid="mindmap-zoom-controls">`: Bổ sung `onPointerDown={(e) => e.stopPropagation()}` và `onClick={(e) => e.stopPropagation()}`.
  - Kiểm tra phòng vệ tại `handlePointerDown` của backdrop: Bỏ qua mọi target nằm trong `[data-testid="mindmap-zoom-controls"]` hoặc `[data-testid="mindmap-minimap"]`.
- **Lý do**: Ngăn chặn 100% việc nhấp hoặc kéo trên các nút điều khiển zoom bị hiểu nhầm là thao tác drag-to-pan trên canvas backdrop.

### Quyết định 4: Cơ Chế Fail-Closed Khi Fit Kích Thước Bằng 0
- Khi `backdropWidth <= 0`, `contentWidth <= 0` hoặc giá trị là `NaN`: Hàm `computeFitScale` lập tức trả về fail-closed `{ scale: 1.0, pan: { x: 0, y: 0 } }`.
- **Lý do**: Tránh lỗi số học `NaN` hoặc `Infinity`, đảm bảo ứng dụng không bao giờ bị rơi vào trạng thái phóng to/thu nhỏ bất định.

---

## 3. Bảng So Sánh Các Hướng Kiến Trúc (Considered Alternatives)

| Tiêu chí | Hướng A: Local Polish trong Canvas (Được chọn) | Hướng B: Lift State lên MindMapView | Hướng C: Thêm Thư Viện Panzoom Bên Ngoài |
| :--- | :--- | :--- | :--- |
| **Blast Radius** | **Tối thiểu** (chỉ 1 component và unit test) | **Rộng** (lan sang MindMapView, props drilling, export interaction) | **Lớn** (phụ thuộc ngoài, rủi ro bundle size) |
| **Độ phức tạp** | Rất thấp, chuẩn hóa các ràng buộc số học hiện có | Cao, phải điều phối state giữa nhiều cấp component | Cao, phải wrap thư viện bên ngoài |
| **Hiệu năng Render** | **Tối ưu**, thay đổi zoom chỉ re-render nội bộ canvas | Kém hơn, thay đổi zoom kích hoạt re-render MindMapView | Trung bình |
| **Tính tương thích** | Hoàn toàn tương thích với Minimap và Selection | Dễ gây xung đột với các hook hiện hữu | Khó tích hợp với Minimap và SVG export |

---

## 4. Hệ Quả & Đánh Giá (Consequences)

### Tích cực
- Hành vi zoom/fit/reset trở nên chặt chẽ, được kiểm chứng bằng unit test toán học độc lập (18/18 tests pass).
- Thao tác chuột trên các nút điều khiển không còn nguy cơ rò rỉ sang canvas backdrop.
- Giữ nguyên 100% giao diện và hợp đồng của [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx).
- Không ảnh hưởng tới cơ chế Undo/Redo hay trạng thái lưu trữ của tài liệu (`isDirty` giữ nguyên).
- 6 test suite hồi quy (67 tests) tiếp tục vượt qua ổn định.

### Giới hạn (Chủ ý theo phạm vi Hướng A)
- Không bổ sung thao tác cuộn chuột (`wheel zoom`) hay cử chỉ pinch cảm ứng.
- Không lưu tỷ lệ zoom vào cơ sở dữ liệu (tỷ lệ zoom phục hồi về 100% khi người dùng tải lại sơ đồ).

---

## 5. Đánh Giá Vùng Ảnh Hưởng (Blast Radius Notes)
- **Tập tin sản phẩm**: [`src/components/mindmap/MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx).
- **Tập tin kiểm thử**: [`tests/unit/mindmap-viewport-zoom.test.tsx`](../../tests/unit/mindmap-viewport-zoom.test.tsx).
- **Tập tin bất khả xâm phạm**: [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx), [`src/lib/mindmapProjection.ts`](../../src/lib/mindmapProjection.ts).
