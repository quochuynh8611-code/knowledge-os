# Phase P7.A — Marquee Drag-Box Selection & Selection Ergonomics
## Closure Report

### 1. Short Closure Note

Phase P7.A (Marquee Drag-Box Selection & Selection Ergonomics) đã hoàn tất quá trình triển khai minimal implementation theo đúng hợp đồng tại `docs/specs/mindmap-phase-p7a-planning-spec-v1.md`. Bộ kiểm thử tự động (targeted unit test, full mindmap regression suite, và TypeScript typecheck) đều đạt 100% GREEN. Toàn bộ thay đổi nằm trọn vẹn trong 2 component presentation layer (`MindMapTreeCanvas.tsx` và `MindMapView.tsx`), không có thay đổi nào được stage hoặc commit.

---

### 2. Closure Report Details

#### 2.1 Phase ID / Title
- **Phase ID**: P7.A
- **Title**: Marquee Drag-Box Selection & Selection Ergonomics
- **Track**: Mind Map Persistence / Canvas Ergonomics
- **Status**: Implementation verified in working tree; not committed.

#### 2.2 Baseline Commit
- **HEAD Commit**: `7b967b573b92bafca210ec93be5fe4bd6d78bd00`
- **Commit Message**: `docs(research): accept ADR-087 and finalize phase 6.13 release closure`
- **Branch**: `main...origin/main [ahead 42]`

#### 2.3 Approved Scope
1. **Marquee Drag-Box Selection**:
   - Phân biệt cử chỉ kéo chuột trên canvas backdrop:
     * Kéo bình thường không giữ Shift (`e.shiftKey === false`): Giữ nguyên cử chỉ Viewport Pan (`setPan`).
     * Kéo có giữ Shift (`e.shiftKey === true`): Kích hoạt chế độ Marquee Selection.
   - Hiển thị hộp chọn trực quan `data-testid="mindmap-marquee-box"` với viền nét đứt, nền bán trong suốt `bg-indigo-500/15`, `pointer-events: none`.
   - Bù trừ chính xác `scrollLeft` và `scrollTop` của backdrop khi render vị trí DOM của hộp marquee.
   - Thuật toán giao cắt hình học AABB: Sử dụng Viewport Client Coordinates trực tiếp so với `getBoundingClientRect()` của các node để chọn tất cả các node giao cắt.
   - Chính sách thay thế vùng chọn (Replace policy): Kết quả giao cắt thay thế toàn bộ selection trước đó. Nếu không có node nào giao cắt (`intersectedIds.length === 0`), làm rỗng `selectedNodeIds` và ẩn Floating Batch Action Bar.
   - Node-origin pointer exclusion: Pointer-down xuất phát từ `[data-node-id]` hoặc interactive controls con bên trong node tuyệt đối không kích hoạt Marquee Mode; các tương tác node hiện hữu giữ nguyên quyền xử lý.
2. **Selection Ergonomics Shortcuts**:
   - `Escape`: Làm sạch selection (`onClearSelection()`) và xóa focus node khi canvas đang focus và `selectedNodeIds.size > 0`.
   - `Cmd+A` / `Ctrl+A`: Thu thập toàn bộ **logical-visible nodes** trên cây mind map (bao gồm cả các node đang ngoài viewport do pan/zoom, loại trừ descendants của các node thuộc `collapsedNodeIds`).
   - Bảo vệ input: Toàn bộ phím tắt canvas đi qua `shouldIgnoreCanvasShortcut(e.target)` để không can thiệp vào các trường văn bản, inline editor, hay modal input.
3. **Lifecycle & Click Suppression Safety**:
   - Pointer Capture: Kích hoạt `setPointerCapture` trên backdrop tại `pointerdown` và giải phóng an toàn tại `pointerup`/`pointercancel`.
   - `onPointerCancel`: Hủy bỏ marquee box ngay lập tức mà không thay đổi selection hiện có.
   - Triệt tiêu trailing click: Sử dụng cờ `wasMarqueeRef` / `dragDistance > 5` để ngăn `onClick` của backdrop gọi `onClearSelection()` làm mất vùng chọn vừa quét.

#### 2.4 Files Changed / Files Untouched
- **Files Modified (2 files)**:
  1. `src/components/mindmap/MindMapTreeCanvas.tsx` (+165, -4 lines) — Props contract, keyboard shortcuts (`Escape`, `Cmd+A`), gesture discrimination, marquee box DOM & AABB collision, click suppression, pointer capture & cancel safety.
  2. `src/components/mindmap/MindMapView.tsx` (+5, -0 lines) — Định nghĩa callback `handleSelectMultipleNodes` và truyền xuống `MindMapTreeCanvas`.
- **Files Created (Untracked)**:
  1. `docs/specs/mindmap-phase-p7a-planning-spec-v1.md` (Approved Planning Spec)
  2. `tests/unit/mindmap-marquee-selection.test.tsx` (Targeted Test Suite — 11 scenarios)
  3. `docs/specs/mindmap-phase-p7a-closure-report.md` (Tài liệu Closure Report này)
- **Protected Files Untouched (100% Intact)**:
  - `src/lib/mindmapProjection.ts`
  - `src/context/DataContext.tsx`
  - `server.ts` & `src/server/*`
  - `prisma/schema.prisma`
  - Mọi Research Provider live contracts và 7 fail-closed security invariants.

#### 2.5 Contracts Delivered
- [VERIFIED] **Contract 1: Visual Marquee Render & Scroll Compensation**: Hộp `mindmap-marquee-box` render chính xác theo công thức bù trừ scroll offset: `left = min(startX, currentX) - backdropLeft + scrollLeft`, `top = min(startY, currentY) - backdropTop + scrollTop`.
- [VERIFIED] **Contract 2: Viewport Coordinate Immunity AABB Collision**: Phép tính va chạm so sánh trực tiếp tọa độ client không bù trừ (`clientX`, `clientY`) với `nodeRect`, miễn nhiễm với CSS zoom và pan matrix.
- [VERIFIED] **Contract 3: Node-Origin Pointer Exclusion**: Khóa hoàn toàn cử chỉ Marquee khi con trỏ nhấn vào bất kỳ phần tử nào bên trong `[data-node-id]`.
- [VERIFIED] **Contract 4: Empty Marquee Clear**: Quét qua vùng trống không chạm node nào sẽ đặt `selectedNodeIds = new Set()` và ẩn Batch Action Bar.
- [VERIFIED] **Contract 5: Logical-Visible Node Collection (`Cmd+A` / `Ctrl+A`)**: Đệ quy duyệt cây mind map thu thập tất cả logical-visible nodes, bao gồm cả node nằm ngoài viewport do pan/zoom, loại trừ các node con bên dưới `collapsedNodeIds`.
- [VERIFIED] **Contract 6: Escape Key Ergonomics**: `Escape` giải phóng vùng chọn và ẩn Batch Action Bar khi canvas được focus.
- [VERIFIED] **Contract 7: Trailing Click Suppression**: Đảm bảo `onClick` của backdrop không xóa vùng chọn sau khi người dùng vừa nhả chuột quét Marquee.
- [VERIFIED] **Contract 8: Pointer Cancel & Capture Safety**: Stream sự kiện kéo chuột được duy trì qua mép màn hình nhờ pointer capture và dọn dẹp sạch sẽ khi gặp `onPointerCancel`.

#### 2.6 Test Evidence

1. **Targeted Test Suite**:
   ```bash
   $ npm test -- tests/unit/mindmap-marquee-selection.test.tsx
   ✓ tests/unit/mindmap-marquee-selection.test.tsx (11 tests) 162ms
   Test Files  1 passed (1)
        Tests  11 passed (11)
   ```
   Tất cả 11 kịch bản kiểm thử bao phủ toàn bộ 11 Gherkin scenarios từ Spec đều chuyển từ RED sang GREEN 100%.

2. **Full MindMap Regression Suite**:
   ```bash
   $ npm test -- tests/unit/mindmap-*.test.*
   Test Files  30 passed (30)
        Tests  363 passed (363)
     Duration  11.18s
   ```
   Tất cả 30 test files và 363 unit tests (tăng từ 352 lên 363 tests) đều đạt 100% GREEN, zero regressions.

3. **TypeScript Typecheck**:
   ```bash
   $ npx tsc --noEmit
   Exit Code: 0 (0 type errors, hoàn toàn tương thích kiểu).
   ```

#### 2.7 Blast Radius Assessment
- **Phạm vi tác động cực tiểu (Isolated Presentation Layer)**:
  * Không thay đổi schema cơ sở dữ liệu (`prisma/schema.prisma`).
  * Không thay đổi model dữ liệu hoặc snapshot tài liệu (`mindmapDocumentStorage.ts`).
  * Không thay đổi engine chiếu cây (`mindmapProjection.ts`).
  * Không ghi vào LocalStorage, không gây ảnh hưởng đến `isDirty`, không tạo mutation trong lịch sử undo/redo.
  * Tác động giới hạn 100% trong phạm vi tương tác DOM và state cục bộ tại `MindMapTreeCanvas.tsx` và callback tại `MindMapView.tsx`.

#### 2.8 Rollback Strategy
- Vì toàn bộ thay đổi cho Phase P7.A hiện chỉ nằm trong working tree (chưa stage, chưa commit), việc rollback nếu cần có thể thực hiện tức thì bằng lệnh:
  ```bash
  git checkout -- src/components/mindmap/MindMapTreeCanvas.tsx src/components/mindmap/MindMapView.tsx
  rm -f tests/unit/mindmap-marquee-selection.test.tsx docs/specs/mindmap-phase-p7a-planning-spec-v1.md docs/specs/mindmap-phase-p7a-closure-report.md
  ```
  Hệ thống sẽ trở về trạng thái HEAD `7b967b5` an toàn tuyệt đối mà không có bất kỳ tác dụng phụ nào.

#### 2.9 Remaining Risks / Follow-ups
- **Remaining Risks**: Không phát hiện rủi ro logic hay hồi quy.
- **Out-of-Scope Candidates for Future Phases**:
  * Additive marquee selection bằng modifier keys (ví dụ: `Shift + Marquee` cộng dồn vào selection có sẵn).
  * Batch collapse/expand shortcuts (`[` / `]`).
  * Multi-node drag-and-drop reparenting.

#### 2.10 Explicit Statement
- **Not staged**: Chưa có file nào được đưa vào git index/staging area.
- **Not committed**: Chưa tạo bất kỳ commit mới nào trên git branch.
- **Awaiting human decision**: Toàn bộ thay đổi đang ở trạng thái working tree chờ Human Operator xem xét và đưa ra quyết định stage/commit.

---
Human approval required before any staging or commit.
