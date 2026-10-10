# Phase P7.A Planning Spec — Marquee Drag-Box Selection & Selection Ergonomics

Status: Approved for implementation; implementation verified in working tree
Phase: P7.A
Track: Mind Map Persistence / Canvas Ergonomics
Depends on: `docs/specs/mindmap-phase-p6b2-closure-report.md`
Implementation mode: Test-first, approval-gated
Implementation authorization: Approved through Human Approval Gate after RED verification.

---

## 1. Purpose

Phase P7.A extends the Multi-Node Selection foundation delivered across Phases P6a, P6b.1, and P6b.2 into a fluid, visual canvas interaction workflow. P7.A introduces **Marquee Drag-Box Selection** (drawing a selection rectangle by dragging on the canvas backdrop) and standard **Selection Ergonomics Shortcuts** (`Escape` to clear selection, `Cmd+A` / `Ctrl+A` to select all visible nodes).

The goal is to eliminate repetitive point-and-click friction when managing medium-to-large knowledge graphs, enabling users to batch-select multiple nodes at once without weakening existing canvas gestures or widening the persistence blast radius.

---

## 2. Current Baseline

Phase P6b.2 closed with a verified 100% green test baseline (29 test files, 352 unit tests):
- Node selection is currently achieved by single-clicking node cards or modifier-clicking (`Shift`, `Cmd`, `Ctrl`) node cards individually.
- The Floating Batch Action Bar displays whenever `selectedNodeIds.size >= 2`, exposing batch delete (in editable mode), batch collapse, batch expand, and batch deselect.
- Canvas backdrop dragging currently functions as Viewport Pan (`setPan`), protected by a movement threshold (`dragDistanceRef.current > 5px`) to prevent accidental deselect.
- Backdrop single-click (`dragDistanceRef.current <= 5px`) clears the selection.

---

## 3. Problem Statement

While P6a through P6b.2 solved multi-node operations and batch view-state, selection input remains bottlenecked:
1. **Selection Friction on Large Trees**: Selecting a subtree or a cluster of 10+ nodes requires clicking each node one-by-one with modifier keys.
2. **Missing Standard Canvas Conventions**: Modern visual canvas tools (Figma, Miro, draw.io) support dragging a marquee rectangle over multiple items to select them simultaneously.
3. **Ergonomic Gaps**: Clearing an active selection requires finding and clicking empty canvas backdrop or clicking the small toolbar button. There is no `Escape` key shortcut, nor is there a `Cmd+A` / `Ctrl+A` shortcut to select all visible nodes.

Without P7.A, multi-node batch operations remain functionally complete but ergonomically cumbersome for realistic knowledge curation.

---

## 4. Scope

### 4.1 In Scope
- **Marquee Drag-Box Selection**:
  - Pointer drag gesture discrimination on empty canvas backdrop:
    * Normal drag without `Shift`: Viewport Pan (existing behavior preserved).
    * Drag with `Shift` held (`e.shiftKey === true`): Activates Marquee Selection Mode.
    * Node-origin pointer exclusion: Pointer-down originating from a node (`[data-node-id]`) or interactive elements inside it never activates marquee mode; node interactions retain full handling.
  - Render visual marquee box (`data-testid="mindmap-marquee-box"`) with dashed border, semi-transparent indigo background, and `pointer-events: none`.
  - Geometric AABB collision detection: Upon `pointerup` (drag distance > 5px), select all nodes whose rendered bounding rectangles intersect the marquee box.
  - Replace & Empty marquee selection policy: The intersected node set replaces previous selection. If marquee ends with `intersectedIds.length === 0`, `selectedNodeIds` becomes empty and the Floating Batch Action Bar hides.
  - Accurate backdrop scroll compensation (`scrollLeft`, `scrollTop`) for visual box placement.
- **Selection Ergonomics Shortcuts**:
  - `Escape`: Clears active selection (`onClearSelection()`) when canvas is focused and `selectedNodeIds.size > 0`.
  - `Cmd+A` / `Ctrl+A`: Selects all logical-visible nodes across the tree (including nodes scrolled/panned outside viewport, excluding descendants under collapsed nodes).
  - Safety input guard: All shortcuts pass through `shouldIgnoreCanvasShortcut(e)` to protect text inputs, modal fields, and inline editors.

### 4.2 Out of Scope (Non-Goals)
- Additive marquee selection using modifier keys (e.g. `Shift+Marquee` adding to existing selection).
- Search-to-selection integration.
- Keyboard shortcuts for batch collapse/expand (`[` / `]`).
- Multi-node drag-and-drop reparenting.
- Inline node content editing.
- Changes to Prisma schema, server APIs, DataContext, or projection layout engine (`mindmapProjection.ts`).

---

## 5. Design Principles & Invariants

### 5.1 Pan Gesture Preservation
Normal dragging without `Shift` must remain 100% functional as Viewport Pan. Marquee selection must not hijack or stutter default canvas navigation.

### 5.2 Viewport Coordinate Immunity
Collision detection compares node `getBoundingClientRect()` against client coordinates (`clientX`, `clientY`) directly. This guarantees 100% mathematical immunity against CSS scale/zoom and translate/pan matrix rounding artifacts.

### 5.3 Logical-Visible Nodes Selection Invariant (Cmd+A / Ctrl+A)
`Cmd+A` / `Ctrl+A` chọn tất cả các **logical-visible nodes** trong toàn bộ cây mind map (bao gồm cả các node đang nằm ngoài khung nhìn viewport do pan/zoom). Nó tuyệt đối không chọn các descendants ẩn bên dưới các node đang bị thu gọn (`collapsedNodeIds`). Điều này bảo đảm hành vi chọn toàn bộ nhất quán, độc lập với vị trí scroll/pan hiện thời.

### 5.4 Input Safety Invariant
Canvas selection shortcuts must never intercept keystrokes when the operator is typing in an `<input>`, `<textarea>`, or content-editable field.

### 5.5 Transient State Invariant
Marquee box coordinates and multi-node selection remain purely transient React state. They are never written to LocalStorage, never affect `isDirty`, and never alter document snapshot persistence.

---

## 6. Proposed Architecture & Component Contracts

### 6.1 Gesture Discrimination State Machine
```
[PointerDown]
        │
        ├─ target is inside [data-node-id] ──> [NODE HANDLER] (Marquee disabled, node interactions retain control)
        │
        └─ target is Canvas Backdrop
                │
                ├─ e.shiftKey === false ──> [PAN MODE] ──> pointerMove updates pan.x/y
                │                                      ──> pointerUp: if dist <= 5px -> onClearSelection()
                │
                └─ e.shiftKey === true  ──> [MARQUEE MODE] ──> pointerMove updates marquee box
                                                       ──> pointerUp: if dist > 5px -> compute AABB:
                                                                      if intersectedIds.length > 0 -> onSelectMultipleNodes(intersectedIds)
                                                                      if intersectedIds.length === 0 -> onSelectMultipleNodes([]) / clear selection
                                                                      if dist <= 5px -> onClearSelection()
```

### 6.2 Component Props Contract

#### `MindMapTreeCanvasProps` (`src/components/mindmap/MindMapTreeCanvas.tsx`)
```typescript
interface MindMapTreeCanvasProps {
  // Existing props preserved intact
  tree: MindMapTreeNode;
  layoutMode: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  selectedNodeIds?: Set<string>;
  onClearSelection?: () => void;
  // ...

  // Phase P7.A Addition
  onSelectMultipleNodes?: (nodeIds: string[]) => void;
}
```

#### `MindMapView.tsx`
```typescript
const handleSelectMultipleNodes = useCallback((nodeIds: string[]) => {
  setSelectedNodeIds(new Set(nodeIds));
}, []);
```

### 6.3 Collision Detection Formula
```typescript
const isIntersecting = !(
  nodeRect.right < boxLeft ||
  nodeRect.left > boxRight ||
  nodeRect.bottom < boxTop ||
  nodeRect.top > boxBottom
);
```
Where `boxLeft/Right/Top/Bottom` are computed from `min/max(startClientX/Y, currentClientX/Y)`.

### 6.4 Backdrop Scroll Offset Compensation Formula (Visual Box DOM Contract)
Phần tử `mindmap-marquee-box` render trực tiếp bên trong `backdropRef` (vốn có CSS `overflow-auto`). Để đảm bảo hộp vẽ không bị lệch khi canvas đang cuộn:
```typescript
const scrollLeft = backdropRef.current?.scrollLeft ?? 0;
const scrollTop = backdropRef.current?.scrollTop ?? 0;

const visualBoxStyle = {
  left: `${Math.min(startClientX, currentClientX) - backdropRect.left + scrollLeft}px`,
  top: `${Math.min(startClientY, currentClientY) - backdropRect.top + scrollTop}px`,
  width: `${Math.abs(currentClientX - startClientX)}px`,
  height: `${Math.abs(currentClientY - startClientY)}px`,
};
```
*Lưu ý:* Phép tính va chạm AABB ở mục 6.3 tiếp tục sử dụng trực tiếp Viewport Client Coordinates (`clientX`, `clientY` so với `nodeRect`), hoàn toàn không cộng dồn scroll offset.

### 6.5 Backdrop Click Suppression Contract (Post-Marquee Selection Preservation)
Khi nhả chuột sau khi quét Marquee (`pointerup` với `dragDistance > 5px`), trình duyệt sẽ bắn tiếp sự kiện `click` lên backdrop.
Để ngăn chặn `onClick` kích hoạt `onClearSelection()` và xóa mất vùng chọn vừa tạo:
```typescript
const wasPanOrMarquee = dragDistanceRef.current > 5 || wasMarqueeRef.current;
wasMarqueeRef.current = false;
dragDistanceRef.current = 0;

if (!wasPanOrMarquee && onClearSelection) {
  onClearSelection();
}
```

### 6.6 Pointer Cancel & Leave Lifecycle Contract (Gesture Abort Safety)
- **Pointer Capture Guarantee**: Tại `onPointerDown`, container backdrop kích hoạt `e.currentTarget.setPointerCapture(e.pointerId)` để đảm bảo stream sự kiện `pointermove` / `pointerup` tiếp tục nhận đầy đủ ngay cả khi con trỏ di chuyển nhanh vượt ra ngoài mép viewport.
- **`onPointerCancel`**: Khi hệ điều hành hoặc trình duyệt hủy sự kiện (ví dụ: chuyển cửa sổ, gesture interruption, mất pointer capture):
  * Lập tức gỡ bỏ `mindmap-marquee-box` khỏi DOM.
  * Hủy bỏ toàn bộ tính toán va chạm, giữ nguyên 100% `selectedNodeIds` trước đó.
  * Giải phóng pointer capture an toàn (`releasePointerCapture`).
- **`onPointerLeave`**: Trong trường hợp không kích hoạt pointer capture hoặc trình duyệt fallback:
  * Xử lý đồng nhất với `onPointerUp`: nếu `dragDistance > 5px` và đang giữ Shift, tính toán AABB va chạm tại tọa độ client cuối cùng, cập nhật selection và dọn dẹp state marquee; nếu `dragDistance <= 5px`, dọn dẹp marquee state mà không mutate selection.

### 6.7 Empty Marquee Selection Contract
Khi thao tác kéo Marquee hoàn tất (`pointerup` với `dragDistance > 5px` và `e.shiftKey === true`):
- Nếu `intersectedIds.length === 0` (không có node nào giao cắt với hộp chọn):
  * `selectedNodeIds` phải được thiết lập thành rỗng (`new Set()`).
  * Floating Batch Action Bar phải lập tức ẩn đi (`selectedNodeIds.size < 2`).
  * Đảm bảo hành vi thay thế vùng chọn nhất quán: quét hộp trống trên canvas có tác dụng làm sạch selection trước đó.

### 6.8 Node-Origin Pointer Exclusion Contract
- Khi sự kiện `onPointerDown` bắt đầu từ một node card (`[data-node-id]`) hoặc interactive elements bên trong node card (nút collapse/expand, input, button):
  * Tuyệt đối **không** kích hoạt Marquee Selection Mode (ngay cả khi người dùng đang giữ `Shift`).
  * Các gesture và handler hiện hữu của node card (chọn đơn nút, Shift-click đa nút, drag-and-drop reparenting, inline editing) giữ nguyên 100% quyền kiểm soát luồng sự kiện.

---

## 7. Gherkin Acceptance Scenarios

```gherkin
Feature: Phase P7.A — Marquee Drag-Box Selection & Selection Ergonomics

  Scenario: Shift + Drag on backdrop draws marquee box and selects intersected nodes
    Given I am viewing a mind map tree with root and 3 visible children "child-1", "child-2", "child-3"
    And currently no nodes are selected
    When I hold Shift and pointer-down on the canvas backdrop at client coordinates (100, 100)
    And I pointer-move to client coordinates (400, 300)
    Then a marquee box with test ID "mindmap-marquee-box" should be visible in the DOM
    When I release the pointer (pointer-up)
    Then the marquee box should be removed from the DOM
    And any nodes whose bounding rect intersected (100, 100) -> (400, 300) should be in selectedNodeIds
    And if 2 or more nodes are selected, the Floating Batch Action Bar should be displayed

  Scenario: Regular drag on backdrop without Shift pans canvas and does not draw marquee box
    Given I have selected "child-1" and "child-2"
    When I pointer-down on the backdrop at (100, 100) without holding Shift
    And I pointer-move to (200, 150)
    And I pointer-up
    Then the canvas pan offset should be updated
    And no marquee box should ever have been rendered
    And "child-1" and "child-2" should remain selected

  Scenario: Pressing Escape clears selection and hides batch action bar
    Given I have selected 3 nodes and the Floating Batch Action Bar is visible
    When the canvas backdrop is focused and I press the "Escape" key
    Then selectedNodeIds should become empty
    And the Floating Batch Action Bar should be hidden

  Scenario: Cmd+A / Ctrl+A selects all logical visible nodes excluding collapsed descendants
    Given topic "topic-root" has child "branch-a" and child "branch-b"
    And "branch-a" has child "leaf-1" and is currently expanded
    And "branch-b" has child "leaf-2" but is currently collapsed
    When the canvas is focused and I press "Cmd+A" or "Ctrl+A"
    Then the browser default selection should be prevented
    And "topic-root", "branch-a", "leaf-1", and "branch-b" should be selected
    And "leaf-2" should NOT be selected because its parent is collapsed
    And the Floating Batch Action Bar should display "Đã chọn 4 nút"

  Scenario: Escape and Cmd+A do not interfere with editable text inputs
    Given the user is currently typing inside an inline node editor or modal input
    When the user presses "Cmd+A" or "Escape"
    Then the event must not be intercepted by canvas selection handlers
    And native input text behavior must be preserved

  Scenario: Marquee drag does not trigger backdrop click deselect
    Given I have completed a marquee drag selection selecting "child-1" and "child-2"
    When the browser fires the trailing "click" event on the backdrop
    Then the click handler must recognize "wasMarqueeRef" / drag distance threshold
    And "child-1" and "child-2" must remain selected without being cleared

  Scenario: Canvas scroll offset is compensated when positioning marquee box
    Given the canvas backdrop has scrollLeft of 150px and scrollTop of 80px
    When I hold Shift and drag from client (200, 200) to (350, 300)
    Then the marquee box style left and top must compensate for backdrop scrollLeft and scrollTop
    And collision detection continues to compare unshifted client coordinates directly

  Scenario: Pointer cancel aborts marquee without mutating selection
    Given I have "child-1" selected
    And I hold Shift and drag to draw a marquee box covering "child-2"
    When the pointer interaction is interrupted by an "onPointerCancel" event
    Then the marquee box must be immediately removed from the DOM
    And "child-1" must remain the only selected node

  Scenario: Empty marquee clears previous selection
    Given I have selected "child-1" and "child-2"
    When I hold Shift and marquee-drag over an empty area of the canvas without intersecting any nodes
    And I release the pointer (pointer-up)
    Then selectedNodeIds should become empty
    And the Floating Batch Action Bar should be hidden

  Scenario: Cmd+A selects logical visible nodes including nodes outside the viewport
    Given the tree contains 10 expanded visible nodes across a large canvas
    And only 3 nodes are currently within the visible viewport bounds due to pan and zoom
    When the canvas is focused and I press "Cmd+A" or "Ctrl+A"
    Then all 10 logical visible nodes must be selected
    And descendants under collapsed nodes must remain excluded
    And the Floating Batch Action Bar should display "Đã chọn 10 nút"

  Scenario: Pointer-down on a node does not start marquee mode
    Given I hold Shift and pointer-down directly on node card "child-1" with attribute "[data-node-id]"
    And I drag the pointer across the canvas
    Then marquee mode must not be activated
    And no marquee box with test ID "mindmap-marquee-box" should be rendered
    And existing node card interaction handlers retain complete event control
```

---

## 8. Protected Boundaries Untouched

The following files remain strictly untouched and out of scope:
- `src/lib/mindmapProjection.ts`
- `src/context/DataContext.tsx`
- `server.ts` & `src/server/*`
- `prisma/schema.prisma`
- All Research Provider contracts and 7 fail-closed security invariants.

---

## 9. Rollback Policy

Because Phase P7.A is strictly constrained to the presentation layer in `MindMapTreeCanvas.tsx` and `MindMapView.tsx`, rolling back is 100% safe via git revert without schema, migration, or storage side effects.
