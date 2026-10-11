# Đặc Tả Kỹ Thuật: Phase M4b-A — Mind Map Viewport Zoom Polish

**Ngày ban hành**: 2026-10-11  
**Trạng thái**: Final / Implemented & Verified (Direction A: Local Component Hardening)  
**Tác giả**: Staff Software Engineer kiêm Technical Architect  
**Phạm vi**: Mind Map Canvas Viewport Controls ([`src/components/mindmap/MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx))  
**Bộ kiểm thử đồng hành**: [`tests/unit/mindmap-viewport-zoom.test.tsx`](../../tests/unit/mindmap-viewport-zoom.test.tsx)  

---

## 1. Ngữ Cảnh & Mục Tiêu (Context & Objectives)

### 1.1. Ngữ cảnh
Sau khi Phase M4a củng cố thành công quy trình xuất file ([ADR-099](../adr/ADR-099-mindmap-phase-m4a-export-ux-hardening.md)), hệ thống sơ đồ tư duy tiếp tục hoàn thiện trải nghiệm điều khiển khung nhìn (viewport & zoom polish).  
Theo định hướng kiến trúc đã được phê duyệt (**Direction A**):
- **Phạm vi cục bộ (Local State Ownership)**: Giữ nguyên toàn bộ quyền sở hữu trạng thái `zoom` và `pan` bên trong [`MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx).
- **Không đẩy trạng thái (Zero State Lifting)**: Tuyệt đối không đẩy (`lift`) trạng thái viewport lên component cha [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx) nhằm giữ blast radius ở mức tối thiểu.
- **Lập trình hàm thuần túy & phòng vệ biên (Pure Helpers & Edge Protection)**: Tách các phép tính số học viewport ra thành các pure helpers độc lập để kiểm thử 100% không phụ thuộc DOM.
- **Cô lập sự kiện đa tầng (Defense-in-depth Event Isolation)**: Ngăn chặn triệt để hiện tượng rò rỉ pointer event từ floating zoom controls xuống canvas backdrop gây kích hoạt drag-pan ngoài ý muốn.

---

## 2. Các Ràng Buộc Hợp Đồng Kỹ Thuật (Contract Specifications)

### 2.1. Pure Viewport Arithmetic Helpers Contract
Ba hàm tiện ích thuần túy được export công khai từ [`MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx):

#### 1. `clampZoom(zoom: number, min = 0.5, max = 2.0): number`
- **Mục đích**: Kẹp tỷ lệ zoom trong đoạn đóng `[min, max]`.
- **Quy tắc làm tròn**: Khử sai số dấu phẩy động bằng phép tính `+zoom.toFixed(2)` (ví dụ `1.1000000000000003` -> `1.1`).
- **Phòng vệ giá trị bất hợp lệ**: Nếu `isNaN(zoom)` trả về `1.0`.

#### 2. `formatZoomPercent(zoom: number): string`
- **Mục đích**: Chuyển đổi giá trị scale thực tế thành chuỗi nhãn hiển thị phần trăm nguyên chuẩn mực trên giao diện.
- **Công thức**: `${Math.round(zoom * 100)}%` (ví dụ `1.0` -> `"100%"`, `1.15` -> `"115%"`).
- **Phòng vệ giá trị bất hợp lệ**: Nếu `isNaN(zoom)` trả về `"100%"`.

#### 3. `computeFitScale(backdropWidth: number, backdropHeight: number, contentWidth: number, contentHeight: number, currentZoom: number, padding = 64): { scale: number; pan: { x: number; y: number } }`
- **Mục đích**: Tính toán tỷ lệ co giãn tối ưu để toàn bộ nội dung cây tư duy nằm gọn trong khung nhìn canvas với khoảng đệm an toàn (`padding`, mặc định `64px`).
- **Thuật toán**:
  ```ts
  const safeZoom = currentZoom > 0 && !isNaN(currentZoom) ? currentZoom : 1.0;
  const unscaledWidth = contentWidth / safeZoom;
  const unscaledHeight = contentHeight / safeZoom;
  const availableWidth = Math.max(100, backdropWidth - padding);
  const availableHeight = Math.max(100, backdropHeight - padding);
  const scaleX = availableWidth / unscaledWidth;
  const scaleY = availableHeight / unscaledHeight;
  const computedScale = Math.min(scaleX, scaleY);
  const clampedScale = clampZoom(computedScale, 0.5, 2.0);
  return { scale: clampedScale, pan: { x: 0, y: 0 } };
  ```
- **Cơ chế Fail-Closed khi kích thước bằng 0 hoặc không hợp lệ**:
  Nếu `backdropWidth <= 0`, `backdropHeight <= 0`, `contentWidth <= 0`, `contentHeight <= 0` hoặc bất kỳ tham số nào là `NaN`:
  Hàm trả về fail-closed: `{ scale: 1.0, pan: { x: 0, y: 0 } }`.

---

### 2.2. Zoom Steps & Button Bounds Contract
- `MIN_ZOOM = 0.5` (50%), `MAX_ZOOM = 2.0` (200%), `ZOOM_STEP = 0.1` (10%).
- **Nút Zoom In (`btn-zoom-in`)**:
  - Tăng `zoom` thêm `0.1` qua `clampZoom(prev + 0.1)`.
  - Thuộc tính `disabled = zoom >= 2.0`.
- **Nút Zoom Out (`btn-zoom-out`)**:
  - Giảm `zoom` đi `0.1` qua `clampZoom(prev - 0.1)`.
  - Thuộc tính `disabled = zoom <= 0.5`.
- **Nút Reset Zoom (`btn-zoom-reset`)**:
  - Hiển thị nhãn `{formatZoomPercent(zoom)}`.
  - Khi click: Đưa `zoom` về `1.0`, đưa `pan` về `{ x: 0, y: 0 }`.
  - Phục hồi container transform chính xác về: `translate(0px, 0px) scale(1)`.
- **Nút Fit Viewport (`btn-zoom-fit`)**:
  - Đo `getBoundingClientRect()` của backdrop và content.
  - Áp dụng `computeFitScale(...)` với padding `64px`.
  - Cập nhật đồng thời `zoom` và `pan`.

---

### 2.3. Pointer & Event Isolation Contract
- **Zoom Controls Widget Container** (`data-testid="mindmap-zoom-controls"`):
  - Bổ sung `onPointerDown={(e) => e.stopPropagation()}` và `onClick={(e) => e.stopPropagation()}`.
  - Ngăn 100% sự kiện nhấn chuột kích hoạt thao tác drag-to-pan trên canvas backdrop.
- **Minimap Radar Widget** (`data-testid="mindmap-minimap"`):
  - Sự kiện kéo rê bên trong radar của minimap được cô lập, không rò rỉ ra canvas backdrop.
- **Canvas Backdrop Drag-to-Pan**:
  - Chỉ kích hoạt khi click và kéo trực tiếp trên vùng trống của backdrop.
  - Nhấp vào thẻ node (`mindmap-node-card`) chỉ chọn node hoặc kích hoạt hành vi biên tập, không kích hoạt drag-pan.

---

### 2.4. Keyboard Shortcuts Safety Contract
- Tất cả phím tắt điều hướng/thao tác trên canvas phải tuân thủ điều kiện kiểm tra:
  `if (shouldIgnoreCanvasShortcut(e.target)) return;`
- Bỏ qua phím tắt khi người dùng đang nhập liệu trong `HTMLInputElement`, `HTMLTextAreaElement`, `HTMLSelectElement`, hoặc các phần tử `isContentEditable`.

---

### 2.5. Read-Only Invariant Contract
- Các thao tác điều hướng viewport (`zoom in`, `zoom out`, `reset`, `fit`, `drag-to-pan`):
  - Tuyệt đối **không** làm biến đổi dữ liệu mô hình cây (`workingDocumentTree` hay `tree`).
  - Tuyệt đối **không** làm bẩn tài liệu (`isDirty` giữ nguyên).
  - Tuyệt đối **không** ghi thêm bất kỳ mục nào vào ngăn xếp Undo/Redo (`historyState`).

---

## 3. Các Yếu Tố Nằm Ngoài Phạm Vi (Non-Goals / Out-of-Scope)

1. ❌ **Không Wheel Zoom**: Không gắn listener trên sự kiện `wheel` để tự động zoom (tránh xung đột với cuộn trang).
2. ❌ **Không Pinch Zoom**: Không triển khai cử chỉ pinch phức tạp trên màn hình cảm ứng ngoài phạm vi widget điều khiển.
3. ❌ **Không Zoom-around-pointer**: Giữ tâm co giãn theo `transform-origin: top left` nhất quán hiện có.
4. ❌ **Không State Lifting**: Không đẩy trạng thái `zoom`/`pan` lên [`MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx).
5. ❌ **Không Persistence Schema Change**: Không lưu giá trị zoom/pan vào cơ sở dữ liệu backend.
6. ❌ **Không can thiệp Session Logs**: Bảo vệ tuyệt đối file session log untracked.

---

## 4. Ma Trận Kịch Bản Kiểm Thử Đã Xác Minh (Verification Matrix)

Bộ kiểm thử [`tests/unit/mindmap-viewport-zoom.test.tsx`](../../tests/unit/mindmap-viewport-zoom.test.tsx) đạt **18/18 PASS**:

| Nhóm Kịch Bản | STT | Tên Kịch Bản | Kết Quả |
| :--- | :--- | :--- | :--- |
| **B1: Zoom Controls** | 1 | Render zoom controls với mặc định 100% | PASS |
| | 2 | Zoom in tăng scale thêm 10% (1.10) và cập nhật CSS style | PASS |
| | 3 | Zoom out giảm scale đi 10% (0.90) và cập nhật CSS style | PASS |
| | 4 | Giới hạn biên kẹp [0.5, 2.0] và trạng thái disabled của nút bấm | PASS |
| | 5 | Nút reset khôi phục zoom về 100% | PASS |
| **B2: Drag-to-Pan** | 6 | Kéo rê trên backdrop trống cập nhật translate CSS | PASS |
| | 7 | Kéo rê nhiều lần tích lũy tọa độ chính xác | PASS |
| | 8 | Nút reset đưa cả pan và zoom về mặc định (0, 0, scale 1) | PASS |
| | 9 | Nhấp vào node card không kích hoạt pan và gọi select topic chuẩn xác | PASS |
| **B3: Fit-to-Viewport** | 10 | Backdrop nhỏ hơn content tính toán đúng tỷ lệ và reset pan | PASS |
| | 11 | Content rất lớn kẹp tỷ lệ fit ở mức tối thiểu 0.5 | PASS |
| | 12 | Nút reset khôi phục sau khi fit về translate(0px, 0px) scale(1) | PASS |
| **M4b-A: Polish & Hardening** | 13 | Hình học kích thước 0 fail-closed an toàn về zoom 1.0 và pan (0, 0) | PASS |
| | 14 | Pointer down trên zoom controls widget không kích hoạt drag-pan backdrop | PASS |
| | 15 | Pointer down trên minimap radar không kích hoạt drag-pan backdrop | PASS |
| | 16 | Phím tắt canvas tôn trọng `shouldIgnoreCanvasShortcut` trên interactive elements | PASS |
| | 17 | Pure arithmetic helpers (`clampZoom`, `formatZoomPercent`, `computeFitScale`) chính xác tuyệt đối | PASS |
| | 18 | Thao tác viewport thuần túy read-only, không kích hoạt bất kỳ mutation callbacks nào | PASS |
