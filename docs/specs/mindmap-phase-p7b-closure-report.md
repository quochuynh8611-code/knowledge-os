# Phase P7.B — Additive & Subtractive Marquee Selection
## Closure Report

### 1. Short Closure Note

Phase P7.B (Additive & Subtractive Marquee Selection) đã hoàn tất triển khai minimal implementation theo đúng hợp đồng thiết kế tại `docs/specs/mindmap-phase-p7b-planning-spec-v1.md` và `docs/adr/ADR-092-phase-p7b-additive-subtractive-marquee-selection.md`.
Toàn bộ hệ thống kiểm thử tự động gồm:
1. `tests/unit/mindmap-marquee-modifiers.test.tsx` (10/10 GREEN).
2. `tests/unit/mindmap-marquee-selection.test.tsx` (11/11 GREEN).
3. Toàn bộ mindmap test suite `tests/unit/mindmap-*.test.*` (31 files, 373/373 GREEN).
4. `npx tsc --noEmit` (Exit code 0, 0 type errors).

Toàn bộ thay đổi nằm trong đúng 2 file runtime presentation layer đã được duyệt (`src/components/mindmap/MindMapTreeCanvas.tsx` và `src/components/mindmap/MindMapView.tsx`). Hiện tại **chưa có bất kỳ thay đổi nào được stage hoặc commit**.

---

### 2. Closure Report Details

#### 2.1 Phase ID / Title
- **Phase ID**: P7.B
- **Title**: Additive & Subtractive Marquee Selection
- **Track**: Mind Map Persistence / Canvas Ergonomics
- **Status**: Implementation verified in working tree; not committed.

#### 2.2 Baseline Commit
- **HEAD Commit**: `98401a1`
- **Commit Message**: `feat(mindmap): add marquee selection ergonomics`
- **Branch**: `main...origin/main`

#### 2.3 Approved Scope
1. **Modifier-Driven Selection Modes**:
   - `Shift + drag` => **Replace Mode**: Quét chọn thay thế vùng chọn hiện tại (kế thừa toàn diện P7.A).
   - `Cmd + Shift + drag` (macOS) / `Ctrl + Shift + drag` (Windows/Linux) => **Additive Mode**: Quét chọn cộng dồn (Union tập hợp) các node giao cắt vào `selectedNodeIds`.
   - `Alt/Option + Shift + drag` => **Subtractive Mode**: Quét chọn loại trừ (Difference tập hợp) các node giao cắt khỏi `selectedNodeIds`.
2. **Ambiguity Fail-Closed Guard**:
   - Nếu người dùng giữ đồng thời cả `(Cmd/Ctrl)` VÀ `(Alt/Option)` cùng với `Shift`, hệ thống coi đây là cử chỉ không xác định và lập tức fail-closed: không kích hoạt marquee, không vẽ hộp chọn, không thay đổi selection.
3. **Empty Marquee Semantics**:
   - Replace mode: Quét qua khoảng trống không giao cắt node nào => Xóa sạch selection (`selectedNodeIds = new Set()`) và ẩn floating batch action bar.
   - Add mode: Quét khoảng trống rỗng ($A \cup \emptyset = A$) => Giữ nguyên 100% selection hiện tại (no-op).
   - Subtract mode: Quét khoảng trống rỗng ($A \setminus \emptyset = A$) => Giữ nguyên 100% selection hiện tại (no-op).
4. **Dynamic Visual Cues**:
   - Replace mode: `border-indigo-500 bg-indigo-500/15`
   - Add mode: `border-emerald-500 bg-emerald-500/15`
   - Subtract mode: `border-rose-500 bg-rose-500/15`
5. **Node-Origin Pointer Exclusion**:
   - Nhấn chuột xuất phát từ `[data-node-id]` hoặc interactive child controls của node không bao giờ kích hoạt Marquee Mode ở bất kỳ tổ hợp phím nào (`Shift`, `Cmd+Shift`, `Alt+Shift`).

#### 2.4 Files Changed / Files Untouched
- **Files Modified (2 runtime files)**:
  1. `src/components/mindmap/MindMapTreeCanvas.tsx`:
     - Khai báo và export `MarqueeSelectionMode = "replace" | "add" | "subtract"`.
     - Mở rộng prop `onSelectMultipleNodes?: (nodeIds: string[], mode?: MarqueeSelectionMode) => void`.
     - Kiểm tra ambiguity fail-closed: `if (hasCmdOrCtrl && hasAlt) return;`.
     - Phân định mode tại `handlePointerDown` và lưu trữ trong `marqueeModeRef` + `marqueeBox.mode`.
     - Gọi `onSelectMultipleNodes(intersectedIds, marqueeModeRef.current)` (với fallback gọi 1 tham số khi replace để tương thích ngược hoàn toàn).
     - Áp dụng class màu sắc động cho `mindmap-marquee-box` (indigo, emerald, rose).
  2. `src/components/mindmap/MindMapView.tsx`:
     - Import `MarqueeSelectionMode`.
     - Cập nhật `handleSelectMultipleNodes(nodeIds, mode = "replace")` thực hiện các phép toán tập hợp bất biến (Immutable Set operations) cho `add`, `subtract`, và `replace`.
     - Bảo vệ no-op khi danh sách giao cắt rỗng trong `add` và `subtract`.
- **Files Created / Updated (Artifacts & Tests)**:
  1. `docs/specs/mindmap-phase-p7b-planning-spec-v1.md`
  2. `docs/adr/ADR-092-phase-p7b-additive-subtractive-marquee-selection.md`
  3. `tests/unit/mindmap-marquee-modifiers.test.tsx` (10 scenarios)
  4. `docs/specs/mindmap-phase-p7b-closure-report.md`
- **Protected Files Untouched (100% Intact)**:
  - `src/lib/mindmapProjection.ts`
  - `src/context/DataContext.tsx`
  - `server.ts` & `src/server/*`
  - `prisma/schema.prisma`
  - Research Provider live contracts và các security invariants.

#### 2.5 Test Evidence
1. **Targeted Test Suite (Phase P7.B)**:
   ```bash
   $ npm test -- tests/unit/mindmap-marquee-modifiers.test.tsx
   ✓ tests/unit/mindmap-marquee-modifiers.test.tsx (10 tests)
   Test Files  1 passed (1)
        Tests  10 passed (10)
   ```
2. **Phase P7.A Regression Suite**:
   ```bash
   $ npm test -- tests/unit/mindmap-marquee-selection.test.tsx
   ✓ tests/unit/mindmap-marquee-selection.test.tsx (11 tests)
   Test Files  1 passed (1)
        Tests  11 passed (11)
   ```
3. **Full MindMap Regression Suite**:
   ```bash
   $ npm test -- tests/unit/mindmap-*.test.*
   Test Files  31 passed (31)
        Tests  373 passed (373)
   ```
4. **TypeScript Typecheck**:
   ```bash
   $ npx tsc --noEmit
   Exit Code: 0 (0 type errors)
   ```

#### 2.6 Confirmation of Git Working Tree State
- Chưa thực hiện `git add` (chưa stage).
- Chưa thực hiện `git commit`.
- Chưa thực hiện `git push`.
