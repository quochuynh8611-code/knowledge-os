# Phase P7.B Planning Spec — Additive & Subtractive Marquee Selection

Status: Approved for implementation; implementation verified in working tree
Phase: P7.B
Track: Mind Map Persistence / Canvas Ergonomics
Depends on: `docs/specs/mindmap-phase-p7a-closure-report.md`
Implementation mode: Test-first, approval-gated
Implementation authorization: Approved through Human Approval Gate after RED verification.

---

## 1. Purpose

Phase P7.B nâng cấp khả năng tương tác vùng chọn Marquee Selection được thiết lập tại Phase P7.A thành hệ thống tương tác đa chế độ (Multi-Mode Selection Ergonomics) chuẩn mực đồ họa (tương đồng với Figma, Miro, Illustrator):
1. **Replace Mode** (`Shift + drag`): Quét chọn thay thế toàn bộ selection hiện tại (kế thừa trọn vẹn P7.A).
2. **Additive Mode** (`Cmd + Shift + drag` trên macOS / `Ctrl + Shift + drag` trên Windows/Linux): Quét chọn cộng dồn (Union) các node mới vào vùng chọn hiện có.
3. **Subtractive Mode** (`Alt/Option + Shift + drag`): Quét chọn loại trừ (Difference) các node giao cắt ra khỏi vùng chọn hiện có.

Mục tiêu là trao cho người dùng công cụ tinh chỉnh vùng chọn chính xác và linh hoạt trên các cây tri thức quy mô trung bình đến lớn mà không làm tăng blast radius lưu trữ hay ảnh hưởng đến cử chỉ canvas cốt lõi.

---

## 2. Current Baseline

Phase P7.A đã đóng thành công tại commit `98401a1`:
- Canvas backdrop hỗ trợ `Shift + drag` để quét hộp `mindmap-marquee-box` và thay thế toàn bộ vùng chọn bằng các node giao cắt AABB.
- Backdrop single-click (`dragDistance <= 5px`) xóa vùng chọn.
- Nhả chuột sau marquee drag (`dragDistance > 5px`) được bảo vệ bởi `wasMarqueeRef` chống trailing click deselect.
- Kéo chuột không giữ Shift giữ nguyên 100% chức năng Viewport Pan.
- `Escape` xóa vùng chọn; `Cmd+A` / `Ctrl+A` chọn toàn bộ logical-visible nodes.
- Toàn bộ 30 test files và 363 unit tests đạt 100% GREEN.

---

## 3. Problem Statement

Mặc dù P7.A đã giải quyết vấn đề chọn hàng loạt, người dùng vẫn gặp khó khăn trong các kịch bản tinh chỉnh vùng chọn phức tạp:
1. **Không thể chọn nhiều cụm node rời rạc**: Vì P7.A chỉ hỗ trợ replace policy, khi người dùng đã quét chọn được Cụm A, việc quét tiếp Cụm B sẽ làm mất toàn bộ các node thuộc Cụm A. Người dùng buộc phải quay về bấm thủ công từng node bằng Shift-click.
2. **Không thể loại trừ nhanh node chọn nhầm**: Khi một hộp quét lỡ bao phủ 1-2 node không mong muốn, người dùng không thể dùng thao tác quét nhanh để trừ bớt mà phải click từng node đơn lẻ.
3. **Thiếu phản hồi thị giác ngữ cảnh**: Khi thao tác với các modifier keys khác nhau, người dùng cần tín hiệu màu sắc trực quan tức thì để phân biệt rõ ràng giữa thao tác "chọn mới", "chọn thêm" và "bỏ bớt".

---

## 4. Scope

### 4.1 In Scope
- **3 Chế độ Marquee Selection**:
  * **Replace Mode** (`Shift + drag` không kèm modifier khác): Hộp quét viền chàm (`indigo`), tập node giao cắt thay thế hoàn toàn selection hiện có. Hộp quét rỗng làm sạch selection.
  * **Additive Mode** (`Cmd + Shift + drag` trên macOS / `Ctrl + Shift + drag` trên Windows/Linux): Hộp quét viền xanh ngọc (`emerald`), tập node giao cắt được hợp nhất (`Union`) vào selection hiện có. Hộp quét rỗng bảo lưu selection hiện có.
  * **Subtractive Mode** (`Alt/Option + Shift + drag`): Hộp quét viền hồng đỏ (`rose`), tập node giao cắt được loại trừ (`Difference`) khỏi selection hiện có. Hộp quét rỗng bảo lưu selection hiện có.
- **Quy tắc giải trừ xung đột phím (Modifier Ambiguity Rule)**:
  * Nếu người dùng đồng thời giữ cả `Cmd/Ctrl` VÀ `Alt/Option` cùng `Shift`, cử chỉ bị coi là nhập nhằng (ambiguous) -> Tuyệt đối không kích hoạt Marquee Mode, không can thiệp canvas.
- **Phản hồi thị giác trực quan (Visual Feedback Tint)**:
  * Replace: `border-indigo-500 bg-indigo-500/15`
  * Add: `border-emerald-500 bg-emerald-500/15`
  * Subtract: `border-rose-500 bg-rose-500/15`
- **Kế thừa toàn diện các invariants an toàn của P7.A**:
  * Node-origin pointer exclusion: Pointer-down xuất phát từ `[data-node-id]` hoặc interactive controls con không kích hoạt marquee ở bất kỳ mode nào.
  * Scroll offset compensation: Bù trừ chính xác `scrollLeft` và `scrollTop` cho DOM visual box.
  * Viewport coordinate immunity: Phép tính AABB sử dụng trực tiếp tọa độ client không bù trừ so với `getBoundingClientRect()`.
  * Pointer cancel & capture safety: Dọn dẹp sạch state và release pointer capture khi gặp `onPointerCancel` mà không làm biến đổi selection.
  * Trailing click suppression: Ngăn chặn trailing click sau khi nhả chuột kéo marquee ở cả 3 mode.

### 4.2 Out of Scope (Non-Goals)
- Keyboard shortcuts cho batch collapse/expand (`[` / `]`).
- Tích hợp kết quả tìm kiếm vào selection (Search-to-selection).
- Multi-node drag-and-drop reparenting.
- Thay đổi Prisma schema, server APIs, DataContext, hay projection layout engine (`mindmapProjection.ts`).

---

## 5. Design Principles & 7 Invariants Bắt Buộc

### 5.1 Invariant 1: Replace Mode Invariant (Kế thừa P7.A)
Trong Replace Mode (`Shift + drag` thuần túy):
- Tập node giao cắt thay thế 100% vùng chọn trước đó: `selectedNodeIds = new Set(intersectedIds)`.
- Nếu hộp quét rỗng (`intersectedIds.length === 0`): `selectedNodeIds = new Set()` và Floating Batch Action Bar tự động ẩn.

### 5.2 Invariant 2: Add Mode Invariant (Union)
Trong Add Mode (`Cmd/Ctrl + Shift + drag`):
- Tập node giao cắt được hợp nhất với vùng chọn hiện có:
  `selectedNodeIds = new Set([...selectedNodeIds, ...intersectedIds])`.
- Nếu hộp quét rỗng (`intersectedIds.length === 0`): Đây là phép cộng tập rỗng -> Giữ nguyên 100% `selectedNodeIds` hiện tại, không xóa selection.

### 5.3 Invariant 3: Subtract Mode Invariant (Difference)
Trong Subtract Mode (`Alt/Option + Shift + drag`):
- Tập node giao cắt được loại trừ khỏi vùng chọn hiện có:
  `selectedNodeIds = new Set([...selectedNodeIds].filter(id => !intersectedIds.includes(id)))`.
- Nếu hộp quét rỗng (`intersectedIds.length === 0`): Đây là phép trừ tập rỗng -> Giữ nguyên 100% `selectedNodeIds` hiện tại, không xóa selection.

### 5.4 Invariant 4: Node-Origin Pointer Exclusion Invariant
Pointer-down bắt đầu trên bất kỳ phần tử nào thuộc `[data-node-id]` hoặc các interactive elements bên trong nó tuyệt đối không kích hoạt Marquee Mode ở bất kỳ tổ hợp phím nào (`Shift`, `Cmd+Shift`, `Alt+Shift`). Tương tác gốc của node card giữ nguyên quyền điều khiển luồng sự kiện.

### 5.5 Invariant 5: Input & Editor Safety Invariant
Không intercept marquee gesture hoặc phím tắt khi con trỏ hoặc focus đang nằm trong `<input>`, `<textarea>`, modal field hoặc inline node editor.

### 5.6 Invariant 6: Modifier Ambiguity Fail-Closed Rule
Nếu sự kiện pointer-down phát hiện đồng thời cả `(e.metaKey || e.ctrlKey)` VÀ `e.altKey` khi đang giữ `Shift`:
- Hệ thống coi đây là thao tác không xác định (ambiguous gesture).
- Lập tức hủy bỏ kích hoạt Marquee Mode (fail-closed), không vẽ hộp chọn, không thay đổi selection.

### 5.7 Invariant 7: Visual Feedback Dynamic Styling
Hộp chọn `mindmap-marquee-box` phải phản ánh chính xác chế độ thao tác thông qua lớp CSS tương ứng:
- Replace: `border-indigo-500 bg-indigo-500/15`
- Add: `border-emerald-500 bg-emerald-500/15`
- Subtract: `border-rose-500 bg-rose-500/15`

---

## 6. Proposed Architecture & Component Contracts

### 6.1 Type Definition (`src/components/mindmap/MindMapTreeCanvas.tsx`)
```typescript
export type MarqueeSelectionMode = "replace" | "add" | "subtract";
```

### 6.2 Component Props Contract
#### `MindMapTreeCanvasProps`
```typescript
interface MindMapTreeCanvasProps {
  // Existing props preserved intact
  tree: MindMapTreeNode;
  layoutMode: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  selectedNodeIds?: Set<string>;
  onClearSelection?: () => void;
  // ...

  // Phase P7.B Updated Props Contract
  onSelectMultipleNodes?: (nodeIds: string[], mode?: MarqueeSelectionMode) => void;
}
```

#### `MindMapView.tsx`
```typescript
const handleSelectMultipleNodes = useCallback((
  nodeIds: string[],
  mode: MarqueeSelectionMode = "replace"
) => {
  setSelectedNodeIds((prev) => {
    if (mode === "add") {
      const next = new Set(prev);
      nodeIds.forEach((id) => next.add(id));
      return next;
    }
    if (mode === "subtract") {
      const next = new Set(prev);
      nodeIds.forEach((id) => next.delete(id));
      return next;
    }
    // Default: "replace"
    return new Set(nodeIds);
  });
}, []);
```

### 6.3 Gesture Discrimination State Machine
```
[PointerDown on Backdrop]
        │
        ├─ e.shiftKey === false ──> [PAN MODE] (Kéo canvas thông thường)
        │
        └─ e.shiftKey === true
                │
                ├─ (e.metaKey || e.ctrlKey) && e.altKey ──> [AMBIGUOUS] ──> Bỏ qua, không bắt đầu marquee
                │
                ├─ (e.metaKey || e.ctrlKey) ─────────────> [MARQUEE MODE: ADD] ──────> emerald box
                │
                ├─ e.altKey ──────────────────────────────> [MARQUEE MODE: SUBTRACT] ─> rose box
                │
                └─ Không có Cmd/Ctrl/Alt ────────────────> [MARQUEE MODE: REPLACE] ──> indigo box
```

---

## 7. Gherkin Acceptance Scenarios

```gherkin
Feature: Phase P7.B — Additive & Subtractive Marquee Selection

  Scenario: Shift + drag replaces existing selection with intersected nodes
    Given nodes "child-1" and "child-2" are currently selected
    When I hold Shift and pointer-down on the backdrop
    And I drag a marquee box covering only "child-3"
    And I release the pointer
    Then only "child-3" should be selected
    And "child-1" and "child-2" should no longer be selected

  Scenario: Cmd/Ctrl + Shift + drag adds intersected nodes to existing selection
    Given node "child-1" is currently selected
    When I hold Cmd (or Ctrl) and Shift and pointer-down on the backdrop
    And I drag a marquee box covering "child-2" and "child-3"
    And I release the pointer
    Then "child-1", "child-2", and "child-3" should all be selected
    And the Floating Batch Action Bar should display "Đã chọn 3 nút"

  Scenario: Alt/Option + Shift + drag subtracts intersected nodes from existing selection
    Given nodes "child-1", "child-2", and "child-3" are currently selected
    When I hold Alt (or Option) and Shift and pointer-down on the backdrop
    And I drag a marquee box covering "child-2"
    And I release the pointer
    Then "child-1" and "child-3" should remain selected
    And "child-2" should be unselected
    And the Floating Batch Action Bar should display "Đã chọn 2 nút"

  Scenario: Empty marquee in replace mode clears existing selection
    Given nodes "child-1" and "child-2" are currently selected
    When I hold Shift and drag a marquee box over an empty area without intersecting any nodes
    And I release the pointer
    Then selectedNodeIds should become empty
    And the Floating Batch Action Bar should be hidden

  Scenario: Empty marquee in add mode preserves existing selection
    Given nodes "child-1" and "child-2" are currently selected
    When I hold Cmd/Ctrl and Shift and drag a marquee box over an empty area with 0 intersected nodes
    And I release the pointer
    Then "child-1" and "child-2" must remain selected
    And the Floating Batch Action Bar must remain visible

  Scenario: Empty marquee in subtract mode preserves existing selection
    Given nodes "child-1" and "child-2" are currently selected
    When I hold Alt/Option and Shift and drag a marquee box over an empty area with 0 intersected nodes
    And I release the pointer
    Then "child-1" and "child-2" must remain selected
    And the Floating Batch Action Bar must remain visible

  Scenario: Ambiguous modifier combination does not start marquee mode
    Given I hold both Cmd/Ctrl AND Alt/Option along with Shift
    When I pointer-down on the backdrop and move the pointer
    Then marquee mode must not be activated
    And no marquee box should be rendered in the DOM
    And existing selection must remain untouched

  Scenario: Marquee box dynamic visual styling reflects the active mode
    When I drag with Shift, the marquee box must have border-indigo-500
    When I drag with Cmd/Ctrl + Shift, the marquee box must have border-emerald-500
    When I drag with Alt/Option + Shift, the marquee box must have border-rose-500

  Scenario: Node-origin pointerdown with modifier keys does not start marquee mode
    Given I hold Cmd/Ctrl + Shift and pointer-down directly on node card "child-1"
    When I drag the pointer across the canvas
    Then marquee mode must not be activated
    And no marquee box should be rendered
    And node card interaction handlers retain complete event control
```

---

## 8. Protected Boundaries Untouched

Tuyệt đối không đụng chạm các file sau:
- `src/lib/mindmapProjection.ts`
- `src/context/DataContext.tsx`
- `server.ts` & `src/server/*`
- `prisma/schema.prisma`
- Mọi Research Provider contracts và 7 security invariants fail-closed.

---

## 9. Rollback Policy

Tương tự P7.A, Phase P7.B được cô lập 100% trong presentation layer (`MindMapTreeCanvas.tsx` và `MindMapView.tsx`). Khi cần rollback, chỉ cần revert 2 file source trên và gỡ bỏ test suite mà không để lại bất kỳ side-effect nào về schema, dữ liệu hay persistence.
