# Mind Map Phase M7c Closure Report

**Ngày lập báo cáo:** 2026-10-12
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect
**Trạng thái phase:** 🟡 **LOCAL COMMIT COMPLETE — CHƯA PUSH REMOTE**
**Trạng thái commit:** Đã tạo commit local duy nhất `9920333` cho Phase M7c trên branch `main`; branch hiện đang ahead `origin/main` 7 commits (`ae66568`, `caa1504`, `6f50935`, `6573799`, `9c85033`, `530a5dc`, `9920333`) và **chưa push remote**.

---

## 1. Executive Summary

Phase M7c hoàn thiện tính năng **Đổi tên nhãn liên kết chéo trực tiếp trên Canvas (Inline Cross-Link Label Renaming)** bên trong quick-action inspect popover (kế thừa từ M7a và M7b), hoàn tất bộ ba thao tác cốt lõi trên Canvas (Inspect & Delete $\rightarrow$ Type Mutation $\rightarrow$ Label Renaming) mà không bắt buộc người dùng phải mở Drawer chi tiết:

1. **Inline Label Input on Canvas Popover**: Tích hợp trường nhập văn bản `<input data-testid="crosslink-label-input">` ngay dưới phần chọn quan hệ và luồng hướng liên kết trong popover, cho phép người dùng xem nhãn hiện tại, chỉnh sửa trực tiếp, hoặc xóa nhãn một cách nhanh chóng.
2. **Double-Trigger Commit Protocol (`Enter` & `Blur`)**:
   - Nhấn `Enter` trong khi đang focus vào ô input sẽ commit giá trị nhãn đã chỉnh sửa.
   - Khi focus rời khỏi ô input (`Blur`), giá trị nhãn mới được tự động commit an toàn mà không làm mất dữ liệu người dùng vừa nhập.
3. **Dedicated `Escape` Draft Revert Guard**:
   - Khi đang focus trong `crosslink-label-input`, nhấn phím `Escape` sẽ hoàn nguyên nhãn dự thảo (`draftLabel`) về giá trị ban đầu của cạnh, chặn lan truyền sự kiện (`stopPropagation`, `preventDefault`) và **GIỮ popover tiếp tục mở**.
   - Khi nhấn `Escape` ngoài ô input, hành vi đóng popover của M7a được bảo toàn nguyên vẹn.
4. **Whitespace Normalization & Label Clearing**:
   - Nhập chuỗi chỉ toàn khoảng trắng hoặc xóa sạch ô input sẽ được chuẩn hóa thành `undefined` (xóa nhãn).
   - Chuỗi nhập được tự động cắt khoảng trắng đầu/cuối (`.trim()`).
5. **Strict Same-Value Normalized No-Op**:
   - Nếu nhãn sau chuẩn hóa trùng với nhãn hiện tại (kể cả trường hợp nhập thêm khoảng trắng thừa xung quanh cùng một nội dung), hệ thống hủy sớm ở cả component Canvas và View handler.
   - Thao tác không làm bẩn tài liệu (`dirty = false`), không gọi `applyMutation`, và tạo ra đúng **0** history snapshot.
6. **Atomic Document History (Undo / Redo Symmetry)**:
   - Thay đổi nhãn hợp lệ cập nhật duy nhất thuộc tính `edge.label`, gọi `applyMutation` và ghi nhận đúng **1** transaction nguyên tử.
   - `⌘Z` (Undo) khôi phục nhãn cũ; `⇧⌘Z` (Redo) áp dụng lại nhãn mới chính xác.
7. **Focus-Aware Keyboard Isolation (M6 Integration)**:
   - Thẻ `INPUT` được bảo vệ hoàn toàn bởi `shouldIgnoreCanvasShortcut`. Khi người dùng gõ phím `Delete`, `Backspace`, hoặc các phím tắt điều hướng bên trong input, Canvas không bắt trộm sự kiện và không kích hoạt xóa liên kết hay xóa node.

Toàn bộ 28/28 targeted tests (21 unit tests + 7 integration tests), 30/30 cross-link regression tests và TypeScript typecheck đạt **100% GREEN**.

---

## 2. Baseline & Git State

- **HEAD Commit SHA đầy đủ:** `9920333428305b9f8fce5ac285e87bb1ccaf930b`
- **Short Hash:** `9920333`
- **Commit Subject:** `feat(mindmap): add inline crosslink label renaming (M7c)`
- **Branch Status:** `## main...origin/main [ahead 7]`
  - Commit 1 ahead: `ae66568 feat(mindmap): implement canvas drag-to-connect interaction and history integration (M5b)`
  - Commit 2 ahead: `caa1504 fix(mindmap): reconcile focus-aware keyboard shortcuts between canvas and drawer (M6)`
  - Commit 3 ahead: `6f50935 feat(mindmap): add on-canvas crosslink inspect and quick delete (M7a)`
  - Commit 4 ahead: `6573799 docs(mindmap): add M7a closure report`
  - Commit 5 ahead: `9c85033 feat(mindmap): add inline crosslink type mutation (M7b)`
  - Commit 6 ahead: `530a5dc docs(mindmap): add M7b closure report`
  - Commit 7 ahead: `9920333 feat(mindmap): add inline crosslink label renaming (M7c)`
- **File session log ngoài scope:**
  `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`
  được bảo toàn tuyệt đối ở trạng thái untracked, không bị thêm vào staging hay commit.
- **Trạng thái Remote:** **CHƯA PUSH REMOTE** (Tuân thủ nguyên tắc cách ly commit cục bộ và chờ lệnh phê duyệt đẩy code).

---

## 3. Scope Đã Hoàn Tất (Delivered Scope)

| Hạng mục | Chi tiết kỹ thuật & Hành vi đã kiểm chứng |
|---|---|
| **Inline Label Input UI** | Render `<input data-testid="crosslink-label-input">` với thuộc tính `type="text"`, `maxLength={60}`, và placeholder trực quan trong popover `crosslink-quick-actions`. |
| **Header Label Display** | Hiển thị song song nhãn hiện tại ở tiêu đề popover để đảm bảo tính trực quan và tương thích hồi quy hoàn hảo với các test M7a trước đó. |
| **Commit on `Enter`** | Khi nhấn `Enter` trong ô input, ngăn chặn sự kiện mặc định và lan truyền (`e.preventDefault()`, `e.stopPropagation()`), kích hoạt `onUpdateCrossLinkLabel`. |
| **Commit on `Blur`** | Khi rời focus khỏi ô input, hàm `handleCommitCrossLinkLabel` tự động kiểm tra và commit nhãn dự thảo. |
| **Escape Revert Guard** | Nhấn `Escape` trong ô input: hoàn nguyên `draftLabel` về nhãn gốc của cạnh, gọi `preventDefault()` và `stopPropagation()`, giữ popover tiếp tục mở. |
| **Escape Outside Input** | Nhấn `Escape` ở bất kỳ đâu ngoài ô input trên Canvas: giữ nguyên hành vi M7a đóng popover và bỏ chọn cạnh. |
| **Normalization to `undefined`** | Chuỗi nhập rỗng hoặc chỉ chứa khoảng trắng được chuẩn hóa thành `undefined`, cho phép xóa nhãn liên kết hoàn toàn sạch sẽ. |
| **Same-Value Strict No-Op** | So sánh giá trị chuẩn hóa `normalizedLabel === currentNormalized`. Nếu không đổi, hủy sớm ở cả Canvas component và View callback, không tạo history snapshot. |
| **Atomic History Integration** | Cập nhật nhãn hợp lệ ghi nhận đúng 1 entry qua `applyMutation`. Hỗ trợ hoàn tác (`⌘Z`) và làm lại (`⇧⌘Z`) hoàn hảo đối xứng. |
| **M6 Focus-Aware Shortcut Safety** | Thuộc tính `INPUT` được nhận diện bởi `shouldIgnoreCanvasShortcut`, ngăn phím `Delete`/`Backspace` xóa nhầm liên kết hoặc node khi đang gõ text. |
| **Projection Cleanliness** | Cập nhật phép chiếu nhãn trong `MindMapView.tsx` (`edge.label !== undefined ? edge.label : ""`) để khi người dùng xóa nhãn, nhãn không bị fallback thành semantic edge type label. |

---

## 4. Ranh Giới File Trong Commit 9920333 (File Boundary Table)

Commit `9920333` chỉ sửa đổi chính xác 4 file nằm trong boundary được phê duyệt:

| Đường dẫn tập tin | Loại | Thay đổi (+ / -) | Trách nhiệm chính |
|---|---|:---:|---|
| `src/components/mindmap/MindMapTreeCanvas.tsx` | Production | +74 / -4 | Thêm prop `onUpdateCrossLinkLabel`, state `draftLabel`, logic đồng bộ selection, input render, xử lý `Enter`, `Blur`, `Escape`. |
| `src/components/mindmap/MindMapView.tsx` | Production | +32 / -5 | Thêm callback `handleUpdateCrossLinkLabelFromCanvas`, chuẩn hóa khoảng trắng sang `undefined`, strict no-op check, `applyMutation`, chỉnh sửa projection nhãn. |
| `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx` | Test | +183 / 0 | Bổ sung 7 unit tests (Tests 15-21) kiểm tra render input, commit `Enter`, commit `Blur`, chuẩn hóa whitespace, no-op, `Escape` revert, M6 focus safety. |
| `tests/integration/mindmap-crosslink-quick-action-history.test.tsx` | Test | +80 / 0 | Bổ sung 3 integration tests (Scenarios 5-7): inline mutation + Undo/Redo, xóa nhãn thành `undefined`, same-value zero-history no-op. |
| **Tổng cộng** | | **+369 / -9** | **4 file nằm hoàn toàn trong ranh giới ủy quyền.** |

---

## 5. Bằng Chứng Đảm Bảo Chất Lượng (Quality Verification Evidence)

### 5.1. Targeted Test Suite M7a, M7b & M7c (28/28 Tests PASS)

```bash
npm test -- tests/unit/mindmap-crosslink-canvas-inspect.test.tsx tests/integration/mindmap-crosslink-quick-action-history.test.tsx
```

**Kết quả chi tiết:**
- `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx`: **21/21 PASS** (516ms)
  - *M7a baseline:*
    1. Render hit-target vô hình cho cross-link để người dùng dễ click (PASS)
    2. Click vào hit-target chọn cross-link và hiển thị floating inspect popover (PASS)
    3. Click nút Quick Delete trong popover kích hoạt onDeleteCrossLink (PASS)
    4. Nhấn phím Delete / Backspace khi edge đang được chọn kích hoạt onDeleteCrossLink (PASS)
    5. Nhấn Escape đóng popover và bỏ chọn edge nhưng BẢO LƯU selectedNodeIds của người dùng (PASS)
    6. M6 Protection: Phím Delete bị bỏ qua khi focus đang ở trong input text của Drawer / Modal (PASS)
    7. Click nút Open Drawer trong popover kích hoạt handoff mở Drawer cho node nguồn (PASS)
    8. M5b Isolation: Layer hit-target nhận class và style pointer-events-none khi isConnecting=true (PASS)
  - *M7b additions:*
    9. Popover render `<select data-testid="crosslink-type-select">` với current value đúng (PASS)
    10. Select chứa đủ 4 options hợp lệ đồng bộ với Drawer (PASS)
    11. Chọn lại đúng type hiện tại là no-op, không gọi onUpdateCrossLinkType (PASS)
    12. Chọn type mới hợp lệ kích hoạt onUpdateCrossLinkType với edgeId và newType (PASS)
    13. Focus bên trong select + nhấn Delete không kích hoạt onDeleteCrossLink (PASS)
    14. Focus bên trong select + nhấn Backspace không kích hoạt onDeleteCrossLink (PASS)
  - *M7c additions:*
    15. Popover render `<input data-testid="crosslink-label-input">` với giá trị ban đầu của edge.label (PASS)
    16. Nhấn Enter sau khi sửa label kích hoạt onUpdateCrossLinkLabel với edgeId và newLabel (PASS)
    17. Blur khỏi label input sau khi sửa kích hoạt onUpdateCrossLinkLabel với edgeId và newLabel (PASS)
    18. Nhập chuỗi chỉ gồm khoảng trắng hoặc xóa sạch và nhấn Enter chuẩn hóa thành undefined (PASS)
    19. Nhấn Enter hoặc blur khi giá trị nhãn không đổi là strict no-op (PASS)
    20. Nhấn Escape khi đang focus trong label input hoàn nguyên draft và GIỮ popover mở (PASS)
    21. Focus bên trong label input + nhấn Delete / Backspace không kích hoạt onDeleteCrossLink (M6 Protection) (PASS)
- `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`: **7/7 PASS** (578ms)
  - *M7a baseline:*
    1. Scenario 1: On-canvas quick delete removes edge and integrates with Undo/Redo (PASS)
  - *M7b additions:*
    2. Scenario 2: Successful edgeType mutation updates canvas, creates 1 history entry, and supports Undo/Redo (PASS)
    3. Scenario 3: Same-type reselect is a no-op and produces zero history entries (PASS)
    4. Scenario 4: Validation rejection on duplicate link prevents mutation, creates zero history entry, and displays error feedback (PASS)
  - *M7c additions:*
    5. Scenario 5: Successful inline label mutation updates document, creates 1 history entry, and supports Undo/Redo (PASS)
    6. Scenario 6: Empty/whitespace label submission normalizes to undefined and integrates with Undo/Redo (PASS)
    7. Scenario 7: Same-value label submission is strict no-op with zero history entries (PASS)

### 5.2. Cross-Link Regression Test Suite (30/30 Tests PASS)

```bash
npm test -- tests/unit/mindmap-crosslinks-overlay.test.tsx tests/unit/mindmap-crosslink-drawer.test.tsx tests/unit/mindmap-crosslink-drag-connect.test.tsx tests/integration/mindmap-crosslink-drag-history.test.tsx
```

**Kết quả:**
- `tests/unit/mindmap-crosslinks-overlay.test.tsx`: **9/9 PASS** (212ms)
- `tests/unit/mindmap-crosslink-drawer.test.tsx`: **6/6 PASS** (280ms)
- `tests/unit/mindmap-crosslink-drag-connect.test.tsx`: **13/13 PASS** (610ms)
- `tests/integration/mindmap-crosslink-drag-history.test.tsx`: **2/2 PASS** (325ms)
- **Tổng cộng: 30/30 tests PASS.**

### 5.3. Typecheck & Linter Cleanliness

- `npx tsc --noEmit`: Exit code 0, không có bất kỳ lỗi kiểu TypeScript nào.
- `git diff --check`: Exit code 0, hoàn toàn sạch whitespace và conflict markers.

---

## 6. Interaction Protocol & State Machine

```text
EDGE_SELECTED (Popover hiển thị)
  │
  ├── User focus vào input (data-testid="crosslink-label-input")
  │     │
  │     ├── User gõ ký tự (Delete, Backspace, Text)
  │     │     └── Local draft updated, Canvas shortcut ignored (M6 Guard)
  │     │
  │     ├── User nhấn Escape
  │     │     └── Draft reverted về edge.label ban đầu, stopPropagation(), POPOVER REMAINS OPEN
  │     │
  │     ├── User nhấn Enter HOẶC blur ra ngoài
  │     │     ├── normalizedLabel === currentNormalized
  │     │     │     └── STRICT NO-OP (0 applyMutation, 0 history snapshot, dirty = false)
  │     │     │
  │     │     └── normalizedLabel !== currentNormalized
  │     │           └── LABEL_MUTATED (Cập nhật edge.label, 1 applyMutation, 1 history snapshot, dirty = true)
  │
  ├── User nhấn Escape khi KHÔNG focus vào label input
  │     └── POPOVER_DISMISSED (Deselect edge, giữ nguyên node multi-selection)
  │
  └── User nhấn Delete / Backspace khi KHÔNG focus vào label input hay select
        └── EDGE_DELETED (Xóa cạnh qua M7a quick delete)
```

---

## 7. Invariants Verification

- [x] **`edge.id`, `sourceNodeId`, `targetNodeId`, `edgeType` không đổi**: Quá trình đổi nhãn chỉ sao chép và cập nhật duy nhất trường `label`.
- [x] **Label Normalization Invariant**: Chuỗi rỗng hoặc khoảng trắng thuần túy luôn được chuẩn hóa thành `undefined`, không lưu chuỗi rỗng `""` vào model tài liệu.
- [x] **Atomicity**: 1 lần sửa nhãn thành công = đúng 1 snapshot history; 0 thay đổi thực tế = 0 snapshot history.
- [x] **Undo / Redo Symmetry**: `⌘Z` khôi phục chính xác nhãn ban đầu; `⇧⌘Z` khôi phục lại nhãn vừa sửa.
- [x] **Persistence Schema Invariant**: Không sửa đổi cấu trúc interface `MindMapDocumentEdge` hay định dạng JSON lưu trữ tài liệu.

---

## 8. Architectural Decisions

1. **Local Draft State trong Canvas Component**:
   - Sử dụng `useState(selectedEdge.label || "")` bên trong `MindMapTreeCanvas` để người dùng gõ phím mượt mà không phải kích hoạt re-render toàn bộ cây hoặc gọi mutation liên tục theo từng keystroke.
   - Đồng bộ state khi `selectedCrossLinkId` hoặc `selectedEdge.label` thay đổi từ bên ngoài (e.g. khi Undo/Redo).
2. **Double-Trigger Commit (`Enter` + `Blur`)**:
   - Đảm bảo người dùng dù có thói quen bấm `Enter` để lưu hay click chuột ra ngoài canvas (`Blur`) thì dữ liệu đều được ghi nhận an toàn, không bị mất mát nội dung vừa nhập.
3. **Phân biệt ranh giới xử lý `Escape`**:
   - Khi đang chỉnh sửa dở dang, phím `Escape` đóng vai trò là "hủy thao tác soạn thảo" (revert draft), không phải "đóng toàn bộ hộp thoại". Nhờ đó người dùng có cơ hội xem lại nội dung gốc mà không bị mất dấu vị trí đang inspect.

---

## 9. Non-Scope & Open Items

1. **Rich Markdown in Cross-Link Label**: Hiện tại nhãn là plain text tối đa 60 ký tự, không hỗ trợ định dạng markdown phong phú.
2. **Direction Reversal**: Đảo chiều mũi tên (nguồn $\leftrightarrow$ đích) hiện tiếp tục thực hiện thông qua xóa và tạo lại.
3. **Multi-Edge Batch Renaming**: Đổi tên hàng loạt nhiều cạnh cùng lúc không thuộc phạm vi thiết kế của M7.

---

## 10. Closure Decision

- **Đánh giá chung:** Phase M7c đã hoàn thành xuất sắc, đáp ứng 100% hợp đồng tương tác nghiêm ngặt, tuân thủ chặt chẽ triết lý OODA, test-first, small blast radius và không gây bất kỳ tác dụng phụ nào tới các phase M5b, M6, M7a, M7b trước đó.
- **Quyết định:** **PHASE M7c OFFICIALLY CLOSED LOCALLY**.
- **Trạng thái kho mã nguồn:** Đã sẵn sàng chuẩn bị cho báo cáo tổng kết cột mốc M7 hoặc các phase tiếp theo theo chỉ đạo điều hành.
