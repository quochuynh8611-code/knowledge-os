# Mind Map Phase M7a Closure Report

**Ngày lập báo cáo:** 2026-10-12
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect
**Trạng thái phase:** 🟡 **LOCAL COMMIT COMPLETE — CHƯA PUSH REMOTE**
**Trạng thái commit:** Đã tạo commit local duy nhất `6f50935` cho Phase M7a trên branch `main`; branch hiện đang ahead `origin/main` 3 commits (`ae66568`, `caa1504`, `6f50935`) và **chưa push remote**.

---

## 1. Executive Summary

Phase M7a là lát cắt triển khai đầu tiên của Milestone M7, tập trung vào khả năng **trực tiếp kiểm tra và xóa nhanh liên kết chéo trên Canvas (On-Canvas Cross-Link Inspection & Quick Delete)** mà không bắt buộc người dùng phải mở Drawer chi tiết:

1. **On-Canvas Hit-Target**: Bổ sung đường dẫn vô hình 16px (`stroke="transparent"`) bám sát đường cong Bézier của liên kết chéo, tạo diện tích nhấp chuột trực quan và dễ tiếp cận.
2. **Floating Quick Inspect Popover**: Hiển thị bảng điều khiển nhanh tại trung điểm đường cong liên kết, trình bày loại quan hệ (semantic badge), tiêu đề node nguồn $\rightarrow$ node đích, nhãn quan hệ, nút mở Drawer và nút xóa nhanh.
3. **Keyboard Ownership & Precedence**: Thiết lập thứ tự ưu tiên bàn phím rõ ràng:
   - `Escape` đóng popover và bỏ chọn cạnh mà **không** xóa multi-selection của các node (`selectedNodeIds`).
   - `Delete` / `Backspace` xóa cạnh đang chọn với độ ưu tiên cao hơn xóa node.
   - Kế thừa bảo vệ M6: Bỏ qua hoàn toàn phím `Delete` / `Backspace` khi tiêu điểm bàn phím đang nằm trong input, textarea hoặc form controls của Drawer / Modal.
4. **M5b Drag-to-Connect Isolation**: Vô hiệu hóa toàn bộ `pointer-events` trên các hit-target liên kết khi đang trong phiên kéo nối dây (`connectingState !== null`), đảm bảo không cản trở việc thả nối dây lên các node bên dưới.
5. **Atomic History Integration**: Thao tác xóa liên kết chéo từ Canvas tích hợp trực tiếp vào bộ máy lịch sử tài liệu qua `applyMutation`, đảm bảo tính nguyên tử tuyệt đối cho `⌘Z` (Undo) và `⇧⌘Z` (Redo).

Tất cả 9/9 tests mục tiêu (8 unit tests + 1 integration test), 460/460 mindmap regression tests và TypeScript typecheck đều đạt **100% GREEN**.

---

## 2. Baseline & Git State

- **HEAD SHA đầy đủ:** `6f509352485218c5ac4f25ef61ec0aaf6600bbc8`
- **Short Hash:** `6f50935`
- **Commit Subject:** `feat(mindmap): add on-canvas crosslink inspect and quick delete (M7a)`
- **Branch Status:** `## main...origin/main [ahead 3]`
  - Commit 1 ahead: `ae66568 feat(mindmap): implement canvas drag-to-connect interaction and history integration (M5b)`
  - Commit 2 ahead: `caa1504 fix(mindmap): reconcile focus-aware keyboard shortcuts between canvas and drawer (M6)`
  - Commit 3 ahead: `6f50935 feat(mindmap): add on-canvas crosslink inspect and quick delete (M7a)`
- **File session log ngoài scope:**
  `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`
  được bảo toàn tuyệt đối ở trạng thái untracked, không bị thêm vào staging hay commit.
- **Trạng thái Remote:** **CHƯA PUSH REMOTE** (Tuân thủ chỉ thị quản trị: chỉ commit cục bộ, chờ lệnh phê duyệt trước khi push).

---

## 3. Scope Đã Hoàn Tất (Delivered Scope)

| Hạng mục | Chi tiết kỹ thuật & Hành vi đã xác minh |
|---|---|
| **On-Canvas Hit-Target** | Thêm `<path>` vô hình với `stroke="transparent"` và `strokeWidth={16}`, mang thuộc tính `data-testid="crosslink-hit-target-${edge.id}"`. Tọa độ đường cong `d` đồng bộ hoàn toàn với đường hiển thị trực quan. |
| **Cross-Link Selection Visuals** | Khi click chọn cạnh, đường cong trực quan nhận `data-edge-selected="true"`, tăng `strokeWidth={3.5}`, đổi màu amber nổi bật, chuyển sang nét liền và hiển thị nhãn quan hệ. |
| **Floating Inspect Popover** | Render card `data-testid="crosslink-quick-actions"` tại tọa độ trung điểm `{ left: midPos.x, top: midPos.y }` bên trong container `mindmap-canvas-content`, tự động di chuyển và phóng to/thu nhỏ đồng bộ cùng Canvas pan/zoom. |
| **Drawer Handoff** | Nút `data-testid="crosslink-open-drawer"` kích hoạt callback `onOpenDrawerForNode(sourceNodeId)` mở Drawer cho node nguồn và tự động giải phóng popover trên Canvas. |
| **Quick Delete Action** | Nút `data-testid="crosslink-quick-delete"` kích hoạt `onDeleteCrossLink(edgeId)`, gỡ bỏ liên kết ngay tức thì và giải phóng popover. |
| **Keyboard Precedence (Delete)** | Khi có cạnh đang chọn, nhấn `Delete` hoặc `Backspace` trên Canvas sẽ gọi `onDeleteCrossLink(selectedCrossLinkId)` và chặn sự kiện xóa node (`e.stopPropagation()` / `stopImmediatePropagation()`). |
| **Keyboard Precedence (Escape)** | Nhấn `Escape` khi đang chọn cạnh sẽ đóng popover và bỏ chọn cạnh (`setSelectedCrossLinkId(null)`), nhưng **bảo tồn nguyên vẹn** `selectedNodeIds` của các node đã chọn trước đó (không gọi `onClearSelection()`). |
| **M6 Focus Protection** | Hàm lắng nghe phím kiểm tra `shouldIgnoreCanvasShortcut(target)`. Nếu tiêu điểm đang ở trong text input của Drawer hoặc Modal, phím `Delete` / `Backspace` bị bỏ qua hoàn toàn, bảo vệ dữ liệu đang nhập. |
| **M5b Pointer Isolation** | Khi `isConnecting === true` (đang kéo dây nối), hit-target nhận style `pointerEvents: "none"` và class `pointer-events-none`. Nhấp chuột hoặc thả chuột không bị hit-target chặn lại. |
| **Atomic History Integration** | Xóa liên kết chéo trên Canvas gọi `applyMutation(currentTree, nextLinks)` trong `MindMapView.tsx`, tạo 1 transaction hoàn tác nguyên tử: `⌘Z` khôi phục liên kết, `⌘⇧Z` xóa lại liên kết. |

---

## 4. Non-Scope (Hạng Mục Giữ Ngoài Scope M7a)

1. **Inline `edgeType` Mutation Dropdown**: Không triển khai menu chỉnh sửa kiểu liên kết (sẽ được thực hiện trong Phase M7b độc lập).
2. **Direct Edge Label Inline Editing**: Không hỗ trợ gõ chỉnh sửa nhãn liên kết trực tiếp trên popover.
3. **Multi-Edge Selection**: Giới hạn ở việc chọn đơn lẻ 1 liên kết chéo tại một thời điểm.
4. **Persistence Schema Alterations**: Giữ nguyên vẹn 100% schema tài liệu `MindMapDocumentEdge` và cấu trúc lưu trữ hiện tại.

---

## 5. Ranh Giới File Trong Commit 6f50935 (File Boundary Table)

| Đường dẫn tập tin | Loại | Thay đổi (+ / -) | Trách nhiệm chính |
|---|---|:---:|---|
| `src/components/mindmap/MindMapCrossLinksLayer.tsx` | Production | +52 / -21 | Thêm invisible 16px hit-target, visual selection state, hiển thị nhãn khi chọn, và cô lập pointer events khi `isConnecting`. |
| `src/components/mindmap/MindMapTreeCanvas.tsx` | Production | +190 / -9 | Quản lý state `selectedCrossLinkId` / `midPos`, render floating popover, ưu tiên bàn phím Escape/Delete, bảo vệ M6 và M5b. |
| `src/components/mindmap/MindMapView.tsx` | Production | +46 / -1 | Cung cấp callback `handleDeleteCrossLinkFromCanvas`, đồng bộ `workingDocumentCrossLinks` qua `applyMutation`, truyền `onOpenDrawerForNode`. |
| `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx` | Test | +289 / 0 | Unit test suite cho 8 kịch bản M7a: hit-target, popover, delete button, keyboard delete, escape preservation, M6 protection, drawer handoff, M5b isolation. |
| `tests/integration/mindmap-crosslink-quick-action-history.test.tsx` | Test | +135 / 0 | Integration test xác minh toàn bộ luồng mở tài liệu, click xóa nhanh trên canvas, dirty indicator và hoàn tác nguyên tử qua `⌘Z` / `⌘⇧Z`. |
| **Tổng cộng** | | **+712 / -31** | **5 file thuộc đúng ranh giới được phê duyệt.** |

---

## 6. Bằng Chứng Đảm Bảo Chất Lượng (Quality Verification Evidence)

### 6.1. Targeted M7a Test Suite (9/9 Tests PASS)

```bash
npm test -- tests/unit/mindmap-crosslink-canvas-inspect.test.tsx tests/integration/mindmap-crosslink-quick-action-history.test.tsx
```

**Kết quả kiểm thử:**
- `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx`: **8/8 PASS** (257ms)
  1. Render hit-target vô hình cho cross-link để người dùng dễ click (PASS)
  2. Click vào hit-target chọn cross-link và hiển thị floating inspect popover (PASS)
  3. Click nút Quick Delete trong popover kích hoạt onDeleteCrossLink (PASS)
  4. Nhấn phím Delete / Backspace khi edge đang được chọn kích hoạt onDeleteCrossLink (PASS)
  5. Nhấn Escape đóng popover và bỏ chọn edge nhưng BẢO LƯU selectedNodeIds của người dùng (PASS)
  6. M6 Protection: Phím Delete bị bỏ qua khi focus đang ở trong input text của Drawer / Modal (PASS)
  7. Click nút Open Drawer trong popover kích hoạt handoff mở Drawer cho node nguồn (PASS)
  8. M5b Isolation: Layer hit-target nhận class và style pointer-events-none khi isConnecting=true (PASS)
- `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`: **1/1 PASS** (177ms)
  - Scenario 1: On-canvas quick delete removes edge and integrates with Undo/Redo (PASS)
- **Tổng cộng:** **2 test files passed, 9/9 tests passed (100%)**.

### 6.2. Mind Map Regression Test Gate (460/460 Tests PASS)

```bash
npm test -- tests/unit/mindmap* tests/integration/mindmap*
```

**Kết quả kiểm thử:**
- **43 test files passed**, **460/460 tests passed** (100% GREEN, thời gian chạy: 12.70s).
- Bao gồm toàn bộ các suite cốt lõi:
  - Multi-selection & Batch Delete (`mindmap-multi-selection.test.tsx` 20/20)
  - Keyboard Authoring (`mindmap-keyboard-authoring.test.tsx` 12/12)
  - Canvas Editing (`mindmap-canvas-editing.test.tsx` 12/12)
  - Drag-to-Connect (`mindmap-crosslink-drag-connect.test.tsx` 8/8)
  - Document Lifecycle & Persistence Parity (`mindmap-document-lifecycle-parity.test.tsx` 7/7)
  - Viewport Zoom (`mindmap-viewport-zoom.test.tsx` 16/16)
  - Projection, Storage, History, Tree Mutations, SVG Export: 100% PASS.

### 6.3. TypeScript Typecheck (0 Errors)

```bash
npx tsc --noEmit
```

**Kết quả:** Clean exit code 0, không có bất kỳ lỗi typecheck nào.

### 6.4. Git Diff Check (0 Errors)

```bash
git diff --check
```

**Kết quả:** Clean exit code 0, không có lỗi khoảng trắng, dấu xuống dòng hay conflict marker.

---

## 7. Các Quyết Định Kiến Trúc & Phòng Ngừa Rủi Ro (Architectural Decisions)

1. **Tách biệt M7a (Inspect & Delete) khỏi M7b (Type Mutation):**
   - Giúp cô lập bài toán tương tác DOM và quyền sở hữu bàn phím thành lát cắt nhỏ nhất có thể kiểm chứng độc lập.
   - Tránh phát sinh logic mutation dropdown và live validation trong cùng một commit.
2. **Bảo tồn trạng thái chọn node khi giải phóng chọn cạnh:**
   - Người dùng thường chọn nhiều node để chuẩn bị thao tác hàng loạt, sau đó có thể kiểm tra một liên kết chéo. Việc nhấn `Escape` hoặc xóa liên kết không được phép phá hủy công sức chọn node (`selectedNodeIds`) của họ.
   - Bàn phím áp dụng precedence: nếu có edge selection, `Escape` và `Delete` ưu tiên xử lý cạnh trước; chỉ khi không có cạnh nào được chọn mới xử lý node.
3. **Vô hiệu hóa hit-target khi M5b drag-to-connect đang hoạt động:**
   - Trong quá trình kéo dây nối từ connector handle, con trỏ chuột cần hit-test chính xác thẻ node bên dưới (`elementFromPoint`).
   - Nếu hit-target của cross-link chiếm quyền pointer events, con trỏ chuột sẽ nhận trúng hit-target thay vì node đích, dẫn đến từ chối kết nối sai. Việc gán `pointer-events: none` khi `isConnecting` bảo vệ 100% tính toàn vẹn của M5b.
4. **Thao tác xóa cạnh đồng nhất qua `applyMutation`:**
   - Đảm bảo việc xóa liên kết chéo trên Canvas tuân thủ đúng kiến trúc lưu trữ tài liệu như thao tác xóa từ Drawer, tự động ghi nhận snapshot vào `MindMapDocumentHistoryState` để hỗ trợ Undo/Redo hoàn hảo.

---

## 8. Hạng Mục Tồn Đọng & Bước Kế Tiếp (Open Items & Next Steps)

- **Hạng mục mở:**
  1. **Phase M7b**: Bổ sung bộ chọn đổi kiểu liên kết (`edgeType`) trực tiếp trên popover (kèm validation chu trình / trùng lặp nếu cần).
  2. **Push Remote**: Nhánh `main` hiện đang ahead `origin/main` 3 commits (`ae66568`, `caa1504`, `6f50935`). Cần phiên phê duyệt riêng trước khi thực hiện `git push`.
  3. **File Session Log Untracked**: Tiếp tục giữ nguyên `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md` ngoài git tracking cho đến khi có quyết định xử lý.
- **Khuyến nghị bước tiếp theo:**
  - Trình duyệt Closure Report M7a cho stakeholder.
  - Chuẩn bị tài liệu spec-first cho Phase M7b trước khi bắt đầu code.
