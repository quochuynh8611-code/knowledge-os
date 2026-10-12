# Mind Map Phase M7b Closure Report

**Ngày lập báo cáo:** 2026-10-12
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect
**Trạng thái phase:** 🟡 **LOCAL COMMIT COMPLETE — CHƯA PUSH REMOTE**
**Trạng thái commit:** Đã tạo commit local duy nhất `9c85033` cho Phase M7b trên branch `main`; branch hiện đang ahead `origin/main` 5 commits (`ae66568`, `caa1504`, `6f50935`, `6573799`, `9c85033`) và **chưa push remote**.

---

## 1. Executive Summary

Phase M7b hoàn thiện khả năng **thay đổi trực tiếp loại quan hệ của liên kết chéo trên Canvas (Inline Cross-Link edgeType Mutation)** ngay bên trong quick-action inspect popover (kế thừa từ M7a), loại bỏ sự phụ thuộc vào việc phải mở Drawer chi tiết chỉ để đổi kiểu liên kết:

1. **Native Inline Selector**: Tích hợp phần tử HTML `<select data-testid="crosslink-type-select">` vào thanh tiêu đề của quick-action popover, hỗ trợ đầy đủ 4 loại quan hệ ngữ nghĩa đồng bộ 100% với từ vựng của Node Drawer:
   - `related` (Liên quan)
   - `prerequisite` (Tiên quyết)
   - `advanced` (Nâng cao)
   - `contradicts` (Đối chiếu)
2. **Safe Mutation Validation with `excludeEdgeId`**: Mở rộng hàm pure helper `validateCrossLinkMutation` hỗ trợ `options?: { excludeEdgeId?: string }`. Cơ chế loại trừ chính cạnh đang mutate giúp ngăn chặn hiện tượng báo lỗi trùng lặp giả mạo (`DUPLICATE_CROSS_LINK`), trong khi vẫn phát hiện chính xác nếu người dùng chuyển sang một loại quan hệ đã tồn tại giữa hai nút đó hoặc tạo ra chu trình (`CYCLE_DETECTED`).
3. **Purity & Zero-History Invariant**:
   - Khi chọn lại đúng `edgeType` hiện tại: Hệ thống kích hoạt nhánh `no-op` ở cả cấp Canvas component và View callback, không làm bẩn document, không gọi `applyMutation` và tạo ra đúng **0** history snapshot.
   - Khi validation thất bại: Lệnh cập nhật bị từ chối, hiển thị Toast cảnh báo lỗi rõ ràng, giữ nguyên trạng thái tài liệu và tạo đúng **0** history snapshot.
4. **Atomic Document History**: Khi validation hợp lệ, mutation cập nhật duy nhất trường `edgeType` và ghi nhận đúng **1** transaction nguyên tử qua `applyMutation`, tương thích hoàn hảo với `⌘Z` (Undo khôi phục type cũ) và `⇧⌘Z` (Redo áp dụng lại type mới).
5. **Keyboard & Focus Safety (M6 / M7a Integration)**: Kế thừa cơ chế phòng vệ tiêu điểm từ `shouldIgnoreCanvasShortcut`. Khi người dùng tương tác hoặc focus bên trong dropdown `<select>`, các phím `Delete`, `Backspace` hoặc phím tắt canvas không bị bắt nhầm. Phím `Escape` vẫn đóng popover mà không ảnh hưởng tới lựa chọn của các node khác.

Tất cả 18/18 targeted tests (14 unit tests + 4 integration tests), 30/30 cross-link regression tests và TypeScript typecheck đều đạt **100% GREEN**.

---

## 2. Baseline & Git State

- **HEAD Commit SHA đầy đủ:** `9c850339b55a33718b7a6b4a37616f10b1021a31`
- **Short Hash:** `9c85033`
- **Commit Subject:** `feat(mindmap): add inline crosslink type mutation (M7b)`
- **Branch Status:** `## main...origin/main [ahead 5]`
  - Commit 1 ahead: `ae66568 feat(mindmap): implement canvas drag-to-connect interaction and history integration (M5b)`
  - Commit 2 ahead: `caa1504 fix(mindmap): reconcile focus-aware keyboard shortcuts between canvas and drawer (M6)`
  - Commit 3 ahead: `6f50935 feat(mindmap): add on-canvas crosslink inspect and quick delete (M7a)`
  - Commit 4 ahead: `6573799 docs(mindmap): add M7a closure report`
  - Commit 5 ahead: `9c85033 feat(mindmap): add inline crosslink type mutation (M7b)`
- **File session log ngoài scope:**
  `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`
  được bảo toàn tuyệt đối ở trạng thái untracked, không bị thêm vào staging hay commit.
- **Trạng thái Remote:** **CHƯA PUSH REMOTE** (Tuân thủ nguyên tắc cách ly commit cục bộ và chờ lệnh phê duyệt đẩy code).

---

## 3. Scope Đã Hoàn Tất (Delivered Scope)

| Hạng mục | Chi tiết kỹ thuật & Hành vi đã kiểm chứng |
|---|---|
| **Inline `<select>` trên Popover** | Thay thế badge tĩnh trong `data-testid="crosslink-quick-actions"` bằng native `<select data-testid="crosslink-type-select">`, hiển thị chính xác type hiện tại của edge được chọn. |
| **Đồng bộ Từ Vựng (Vocabulary)** | Cung cấp đúng 4 tùy chọn đồng nhất với Node Drawer: `related` ("Liên quan"), `prerequisite` ("Tiên quyết"), `advanced` ("Nâng cao"), `contradicts` ("Đối chiếu"). |
| **`excludeEdgeId` Validation** | Hàm `validateCrossLinkMutation` nhận thêm `options?: { excludeEdgeId?: string }`, lọc bỏ edge đang xét trước khi kiểm tra trùng lặp (`DUPLICATE_CROSS_LINK`) và kiểm tra chu trình (`CYCLE_DETECTED`). |
| **Same-Type No-Op** | Lắng nghe `onChange`, nếu giá trị mới trùng với type hiện tại thì hủy sớm ở cả Canvas (`MindMapTreeCanvas`) và View (`MindMapView`), không kích hoạt dirty state. |
| **Duplicate & Cycle Rejection** | Cố gắng đổi sang một type đã tồn tại song song giữa 2 node hoặc tạo chu trình sẽ bị từ chối ngay lập tức, hiển thị `Toast` error thông báo chi tiết, không làm bẩn document. |
| **Zero-History Khi Thất Bại** | Khi validation trả về `valid: false`, `applyMutation` không được gọi; số lượng history snapshot sinh ra là 0. |
| **Atomic History Khi Thành Công** | Mutation hợp lệ cập nhật `edgeType` của cạnh trong `workingDocumentCrossLinks`, gọi `applyMutation`, sinh đúng 1 snapshot. `⌘Z` phục hồi type cũ, `⇧⌘Z` áp dụng lại type mới. |
| **Metadata Invariant Preservation** | Các trường `id`, `sourceNodeId`, `targetNodeId`, và `label` của cạnh được bảo toàn nguyên vẹn sau mutation. Không làm thay đổi persistence schema. |
| **Focus-Aware Shortcut Protection** | `shouldIgnoreCanvasShortcut` nhận diện thẻ `SELECT`. Khi người dùng đang focus vào dropdown chọn type, nhấn `Delete` / `Backspace` sẽ không kích hoạt xóa cạnh hoặc xóa node. |
| **M7a & M5b Compatibility** | Popover vẫn đóng bình thường khi nhấn `Escape` hoặc nút close (`crosslink-close-popover`). Nút `crosslink-quick-delete` và `crosslink-open-drawer` hoạt động bình thường. Không ảnh hưởng đến luồng kéo nối dây M5b. |

---

## 4. Ranh Giới File Trong Commit 9c85033 (File Boundary Table)

Commit `9c85033` chỉ sửa đổi chính xác 5 file nằm trong boundary được phê duyệt:

| Đường dẫn tập tin | Loại | Thay đổi (+ / -) | Trách nhiệm chính |
|---|---|:---:|---|
| `src/lib/mindmapCrossLinks.ts` | Production | +10 / -1 | Mở rộng `validateCrossLinkMutation` với `options?: { excludeEdgeId?: string }` để phục vụ mutation edge hiện có. |
| `src/components/mindmap/MindMapTreeCanvas.tsx` | Production | +21 / -1 | Thêm prop `onUpdateCrossLinkType`, thay badge tĩnh bằng native `<select data-testid="crosslink-type-select">`, chặn same-type no-op. |
| `src/components/mindmap/MindMapView.tsx` | Production | +49 / 0 | Thêm `handleUpdateCrossLinkTypeFromCanvas`: kiểm tra same-type, validate với `excludeEdgeId`, gọi `setToast` khi lỗi, gọi `applyMutation` khi hợp lệ. |
| `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx` | Test | +148 / 0 | Bổ sung 6 unit tests (Tests 9-14): render select, 4 options, same-type no-op, valid mutation callback, focus Delete safety, focus Backspace safety. |
| `tests/integration/mindmap-crosslink-quick-action-history.test.tsx` | Test | +104 / 0 | Bổ sung 3 integration tests (Scenarios 2-4): inline mutation + Undo/Redo, same-type zero-history no-op, validation reject + error toast. |
| **Tổng cộng** | | **+328 / -6** | **5 file nằm hoàn toàn trong ranh giới ủy quyền.** |

---

## 5. Bằng Chứng Đảm Bảo Chất Lượng (Quality Verification Evidence)

### 5.1. Targeted Test Suite M7a & M7b (18/18 Tests PASS)

```bash
npm test -- tests/unit/mindmap-crosslink-canvas-inspect.test.tsx tests/integration/mindmap-crosslink-quick-action-history.test.tsx
```

**Kết quả chi tiết:**
- `tests/unit/mindmap-crosslink-canvas-inspect.test.tsx`: **14/14 PASS** (499ms)
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
- `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`: **4/4 PASS** (544ms)
  - *M7a baseline:*
    1. Scenario 1: On-canvas quick delete removes edge and integrates with Undo/Redo (PASS)
  - *M7b additions:*
    2. Scenario 2: Successful edgeType mutation updates canvas, creates 1 history entry, and supports Undo/Redo (PASS)
    3. Scenario 3: Same-type reselect is a no-op and produces zero history entries (PASS)
    4. Scenario 4: Validation rejection on duplicate link prevents mutation, creates zero history entry, and displays error feedback (PASS)

### 5.2. Cross-Link Regression Test Suite (30/30 Tests PASS)

```bash
npm test -- tests/unit/mindmap-crosslinks-overlay.test.tsx tests/unit/mindmap-crosslink-drawer.test.tsx tests/unit/mindmap-crosslink-drag-connect.test.tsx tests/integration/mindmap-crosslink-drag-history.test.tsx
```

**Kết quả:**
- `tests/unit/mindmap-crosslinks-overlay.test.tsx`: **9/9 PASS** (208ms)
- `tests/unit/mindmap-crosslink-drawer.test.tsx`: **6/6 PASS** (274ms)
- `tests/unit/mindmap-crosslink-drag-connect.test.tsx`: **13/13 PASS** (603ms)
- `tests/integration/mindmap-crosslink-drag-history.test.tsx`: **2/2 PASS** (331ms)
- **Tổng cộng: 30/30 tests PASS.**

### 5.3. Typecheck & Linter Cleanliness

- `npx tsc --noEmit`: Exit code 0, không có lỗi kiểu TypeScript nào.
- `git diff --check`: Exit code 0, không có lỗi định dạng khoảng trắng hay conflict marker.

---

## 6. Validation & Mutation Contract

### 6.1. State Machine
```text
EDGE_SELECTED (Popover mở)
  ├── User chọn cùng edgeType hiện tại
  │     └── NO-OP (0 applyMutation, 0 history snapshot, không dirty)
  │
  ├── User chọn edgeType mới
  │     ├── validateCrossLinkMutation(...) == valid
  │     │     └── TYPE_UPDATED (Cập nhật edgeType, 1 applyMutation, 1 history snapshot, dirty = true)
  │     │
  │     └── validateCrossLinkMutation(...) == invalid
  │           └── VALIDATION_REJECTED (setToast error, 0 applyMutation, 0 history snapshot, giữ nguyên type)
  │
  ├── User nhấn Escape hoặc nút đóng
  │     └── POPOVER_DISMISSED (Deselect edge, giữ nguyên node multi-selection)
  │
  └── User nhấn Delete / Backspace (ngoài select)
        └── EDGE_DELETED (Xóa cạnh qua M7a quick delete)
```

### 6.2. Validation Algorithm (`excludeEdgeId`)
Hàm `validateCrossLinkMutation` áp dụng bộ lọc trước khi xác thực:
```ts
const edgesToConsider = options?.excludeEdgeId
  ? existingEdges.filter((e) => e.id !== options.excludeEdgeId)
  : existingEdges;
```
1. **Duplicate Check**: Duyệt trên `edgesToConsider`. Nếu tồn tại cạnh giữa `sourceNodeId` và `targetNodeId` với cùng `newType`, báo lỗi `DUPLICATE_CROSS_LINK`.
2. **Cycle Check**: Kiểm tra đường đi có hướng từ `targetNodeId` đến `sourceNodeId` trên đồ thị gồm cây phân cấp kết hợp với `edgesToConsider`. Nếu phát hiện đường đi ngược, báo lỗi `CYCLE_DETECTED`.

---

## 7. Keyboard & Interaction Safety

1. **Tag Guard trong `shouldIgnoreCanvasShortcut`**:
   `shouldIgnoreCanvasShortcut` đã bao gồm điều kiện `tagName === "SELECT"`. Nhờ vậy, khi người dùng mở menu dropdown hoặc bấm các phím mũi tên / Delete / Backspace bên trong `<select>`, sự kiện bàn phím của window listener trên canvas bị chặn hoàn toàn.
2. **Event Propagation**:
   Dropdown `<select>` nằm trong popover `crosslink-quick-actions`, vùng này có `onClick={(e) => e.stopPropagation()}` và `onPointerDown={(e) => e.stopPropagation()}`, đảm bảo không kích hoạt thao tác pan canvas hay kéo box chọn vùng (marquee).
3. **M5b Drag Isolation**:
   Không ảnh hưởng tới M5b drag-to-connect; các đường dẫn hit-target vẫn nhận `pointer-events: none` khi `isConnecting === true`.

---

## 8. Invariants Verification

- [x] **`edge.id` không đổi**: Mutation sao chép toàn bộ thuộc tính cũ và chỉ ghi đè `edgeType`.
- [x] **`sourceNodeId` & `targetNodeId` không đổi**: Điểm bắt đầu và kết thúc của liên kết được bảo toàn 100%.
- [x] **`label` không đổi**: Không can thiệp hay xóa bỏ nhãn tùy chọn của người dùng.
- [x] **Atomicity**: 1 thành công = đúng 1 snapshot history; 0 thành công = 0 snapshot history.
- [x] **Undo / Redo Symmetry**: `⌘Z` khôi phục chính xác type ban đầu; `⇧⌘Z` khôi phục lại type mới.
- [x] **Persistence Schema Invariant**: Không sửa đổi interface `MindMapDocumentEdge` hay cấu trúc JSON lưu trữ.

---

## 9. Blast Radius & Architectural Decisions

1. **Lựa chọn Native `<select>` thay vì Custom Listbox / Popover**:
   - Tối ưu hóa accessibility (a11y) theo chuẩn trình duyệt gốc mà không cần thêm mã quản lý ARIA phức tạp.
   - Blast radius tối thiểu: kế thừa trực tiếp pattern đã được kiểm chứng tại `MindMapNodeDrawer.tsx` (dòng 276-287).
   - Tự động tương thích với cơ chế bỏ qua shortcut M6 hiện có.
2. **Định vị Callback Boundary**:
   - `MindMapTreeCanvas` đóng vai trò presentational: chỉ phát tín hiệu `onUpdateCrossLinkType(edgeId, newType)`.
   - `MindMapView` nắm giữ quyền sở hữu dữ liệu tài liệu (`workingDocumentCrossLinks`), thực thi validation và điều phối `applyMutation` cùng `setToast`.

---

## 10. Non-Scope & Open Items

1. **Inline Edge Label Renaming**: Chỉnh sửa nhãn trực tiếp trên Canvas được để dành cho phase sau (nếu có yêu cầu từ người dùng).
2. **Multi-Edge Batch Type Mutation**: Thay đổi hàng loạt kiểu quan hệ của nhiều cạnh không thuộc scope M7b.
3. **Direction Reversal**: Đảo chiều mũi tên (nguồn $\leftrightarrow$ đích) hiện tiếp tục thực hiện thông qua xóa và tạo lại.

---

## 11. Closure Decision

- **Đánh giá chung:** Phase M7b đã hoàn thành đầy đủ, đạt độ tin cậy tuyệt đối, tuân thủ nghiêm ngặt các nguyên tắc OODA, spec-first, test-first và small blast radius.
- **Quyết định:** **PHASE M7b OFFICIALLY CLOSED LOCALLY**.
- **Trạng thái kho mã nguồn:** Sẵn sàng chuyển giao hoặc tiến hành các bước tiếp theo theo yêu cầu của dự án.
