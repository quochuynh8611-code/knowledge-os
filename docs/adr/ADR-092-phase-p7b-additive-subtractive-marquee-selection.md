# ADR-092: Phase P7.B — Additive & Subtractive Marquee Selection Architecture

## Status
Accepted (Implementation verified in working tree)

## Context
Sau khi Phase P7.A đóng thành công tại commit `98401a1`, tính năng Marquee Selection đã giải quyết bài toán chọn hàng loạt trên canvas backdrop thông qua cử chỉ `Shift + drag`. Tuy nhiên, P7.A chỉ áp dụng chính sách *Replace Policy* (vùng chọn mới ghi đè hoàn toàn tập node đã chọn trước đó).

Trong thực tế tổ chức và tinh chỉnh các đồ thị tri thức quy mô lớn, người dùng đối mặt với 2 hạn chế lớn:
1. **Không thể chọn nhiều cụm node rời rạc**: Quét Cụm A thành công, nhưng khi quét Cụm B thì Cụm A bị xóa mất.
2. **Không thể loại trừ nhanh node chọn nhầm**: Khi hộp quét lỡ bao phủ một node không mong muốn, người dùng không thể dùng thao tác quét nhanh để trừ bớt.

Theo chuẩn mực tương tác của các công cụ đồ họa hiện đại (Figma, Miro, Adobe Illustrator), hệ thống cần hỗ trợ đầy đủ 3 chế độ: Replace, Add (Hợp nhất) và Subtract (Loại trừ).

---

## Decision

Nhóm kỹ thuật quyết định mở rộng kiến trúc Marquee Selection trong Phase P7.B theo các nguyên tắc sau:

### 1. Phân định chế độ qua Modifier Keys
- **Replace Mode** (`Shift + drag`): Quét chọn thay thế (kế thừa toàn diện P7.A).
- **Additive Mode** (`Cmd + Shift + drag` trên macOS / `Ctrl + Shift + drag` trên Windows/Linux): Quét chọn cộng dồn (Union tập hợp).
- **Subtractive Mode** (`Alt/Option + Shift + drag`): Quét chọn loại trừ (Difference tập hợp).

### 2. Quy tắc giải trừ xung đột phím (Modifier Ambiguity Fail-Closed Rule)
Nếu người dùng đồng thời giữ cả `(e.metaKey || e.ctrlKey)` VÀ `e.altKey` cùng với `Shift`:
- Hệ thống coi đây là thao tác không xác định (ambiguous gesture).
- Lập tức hủy bỏ kích hoạt Marquee Mode (fail-closed), không vẽ hộp chọn, không thay đổi selection.

### 3. Ngữ nghĩa Hộp quét Rỗng (Empty Marquee Semantics)
- Trong **Replace Mode**: Quét rỗng (`intersectedIds.length === 0`) ➔ Đặt `selectedNodeIds = new Set()` và ẩn Floating Batch Action Bar.
- Trong **Additive Mode**: Quét rỗng là phép cộng tập rỗng `A ∪ ∅ = A` ➔ Giữ nguyên 100% `selectedNodeIds` hiện tại.
- Trong **Subtractive Mode**: Quét rỗng là phép trừ tập rỗng `A \ ∅ = A` ➔ Giữ nguyên 100% `selectedNodeIds` hiện tại.

### 4. Mở rộng Contract Tầng Presentation
- `MindMapTreeCanvasProps` mở rộng prop:
  ```typescript
  export type MarqueeSelectionMode = "replace" | "add" | "subtract";

  onSelectMultipleNodes?: (nodeIds: string[], mode?: MarqueeSelectionMode) => void;
  ```
- `MindMapView` quản lý cập nhật tập hợp bất biến (Immutable Set operations):
  * `add`: `new Set([...prev, ...nodeIds])`
  * `subtract`: `new Set([...prev].filter(id => !nodeIds.includes(id)))`
  * `replace`: `new Set(nodeIds)`

### 5. Phản hồi Thị giác Trực quan (Visual Color Cue)
Hộp chọn `mindmap-marquee-box` phản ánh tức thì chế độ đang hoạt động:
- Replace: `border-indigo-500 bg-indigo-500/15`
- Add: `border-emerald-500 bg-emerald-500/15`
- Subtract: `border-rose-500 bg-rose-500/15`

### 6. Bảo toàn Các Ranh giới Bất biến
- Giữ nguyên 100% ranh giới bảo vệ: không đổi `mindmapProjection.ts`, không đổi `DataContext.tsx`, không đổi Prisma schema hay server APIs.
- Giữ nguyên các security invariants và backend fail-closed.
- Tất cả state của Marquee tiếp tục là pure transient React state.

---

## Consequences

### Tích cực
- Hoàn thiện trải nghiệm tuyển chọn node chuẩn Figma/Miro trên Mind Map Canvas.
- Giảm thiểu tối đa thao tác lặp lại khi làm việc với cây phân cấp lớn.
- Khả năng kiểm thử cô lập cao (test-first thuần frontend/presentation).
- Không ảnh hưởng đến persistence, snapshot hay undo/redo stack.

### Thách thức & Biện pháp xử lý
- **Đa nền tảng OS**: Khác biệt giữa `metaKey` (Command trên macOS) và `ctrlKey` (Control trên Windows/Linux) được trừu tượng hóa bằng biểu thức `(e.metaKey || e.ctrlKey)`.
- **Hành vi trình duyệt mặc định**: Các sự kiện pointer kết hợp modifier keys cần `preventDefault()` hợp lý và triệt tiêu trailing click để tránh mở context menu hoặc highlight văn bản ngoài ý muốn.

---

## Compliance & Rollback
- Mọi thay đổi giới hạn trong 2 file: `src/components/mindmap/MindMapTreeCanvas.tsx` và `src/components/mindmap/MindMapView.tsx`.
- Rollback an toàn 100% bằng cách revert 2 file trên về commit `98401a1`.
