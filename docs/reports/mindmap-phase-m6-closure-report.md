# Báo Cáo Đóng Phase M6: Mind Map Canvas Focus & Keyboard Shortcut Reconciliation

**Ngày lập báo cáo:** 2026-10-12
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect
**Trạng thái phase:** ✅ **PUSHED TO REMOTE / CLOSED**
**Trạng thái commit:** Đã tạo đúng 1 commit local duy nhất cho M6, sau đó đã push thành công lên `origin/main`; local `HEAD` và `origin/main` hiện trùng khớp tại commit `caa1504`.

---

## 1. Định Danh Phase & Bản Ghi Commit (Phase Identity & Commit Record)

- **Tên Phase:** Milestone M6 — Canvas Focus & Keyboard Shortcut Reconciliation
- **Commit SHA:** `caa1504`
- **Tiêu đề commit (Exact Subject):**
  `fix(mindmap): reconcile focus-aware keyboard shortcuts between canvas and drawer (M6)`
- **Ranh giới commit (Exact 4-File Boundary):**
  1. `src/components/mindmap/MindMapTreeCanvas.tsx` (Production code)
  2. `src/lib/mindmapHistory.ts` (Shared keyboard-isolation helper)
  3. `tests/unit/mindmap-keyboard-authoring.test.tsx` (Unit test suite)
  4. `tests/unit/mindmap-multi-selection.test.tsx` (Unit test suite)

---

## 2. Bối Cảnh & Vấn Đề Gốc (Context & Root Cause)

Sau khi hoàn tất M5b, Canvas đã hỗ trợ drag-to-connect trực tiếp nhưng vẫn còn một khoản nợ kỹ thuật quan trọng trong lớp điều phối bàn phím giữa Canvas và Drawer.

Nguyên nhân gốc được xác định tại `MindMapTreeCanvas.tsx`: hàm `handleKeyDown` dùng guard blanket `if (isDrawerOpen) return;`, khiến toàn bộ phím tắt của Canvas bị vô hiệu hóa chỉ vì Drawer đang mở, bất kể `document.activeElement` thực tế đang ở đâu.

Điều này tạo ra xung đột contract giữa các phase trước đó:

- **Phase M2 / M5a:** click node trong `saved-document` mode tự động mở Drawer inspect.
- **Phase M3:** Canvas có keyboard authoring contract (`Tab`, `Enter`, `Delete`, `Arrow`).
- **Phase P6a:** Multi-selection và batch delete kỳ vọng người dùng vẫn có thể dùng `Delete` / `Backspace` trên Canvas sau khi chọn node.

Hệ quả trực tiếp là bộ `tests/unit/mindmap-multi-selection.test.tsx` còn tồn đọng 4 test thất bại do click node làm `isDrawerOpen = true`, rồi keyboard deletion bị chặn sai dù focus không nằm trong input text.

---

## 3. Các Hành Vi Đã Chuyển Giao (Delivered Behavior)

Phase M6 hoàn tất việc tái dung hòa hợp đồng quyền sở hữu bàn phím giữa Canvas và Drawer theo nguyên tắc **focus-aware ownership**:

1. **Loại bỏ guard blanket phụ thuộc vào trạng thái Drawer mở/đóng**
   - Không còn dùng `isDrawerOpen` như tín hiệu duy nhất để chặn keyboard shortcuts của Canvas.
   - Tách biệt rõ khái niệm **Drawer Open** khỏi **Text Input Active**.

2. **Áp dụng focus-aware keyboard isolation tại Canvas**
   - `MindMapTreeCanvas.tsx` chỉ bỏ qua keyboard shortcuts khi `document.activeElement` thực sự là một target cần được cách ly.
   - Nếu focus nằm trên `body`, backdrop Canvas, hoặc vùng điều hướng Canvas hợp lệ, shortcuts của Canvas tiếp tục hoạt động bình thường.

3. **Mở rộng helper `shouldIgnoreCanvasShortcut` để nhận diện Node Drawer**
   - `src/lib/mindmapHistory.ts` được cập nhật để xem `[data-testid='mindmap-node-drawer']` là một keyboard-isolation container hợp lệ.
   - Mọi thao tác phím xuất phát từ input/control bên trong Drawer được cô lập an toàn khỏi Canvas.

4. **Khôi phục contract xóa node bằng bàn phím khi Drawer đang mở nhưng người dùng vẫn thao tác trên Canvas**
   - `Delete` / `Backspace` tiếp tục hoạt động đúng với single-node deletion hoặc batch delete khi focus ở Canvas/backdrop.
   - Tránh việc người dùng bị khóa thao tác chỉ vì Drawer đang hiển thị như một inspection pane.

5. **Giữ nguyên event isolation khi người dùng đang nhập liệu trong Drawer**
   - Khi focus nằm trên ô tiêu đề node hoặc control form trong Drawer, `Delete`, `Backspace`, `Tab`, `Enter`, `Arrow`, `Cmd/Ctrl+A` không làm thay đổi cấu trúc Canvas.
   - Canvas chỉ phản ứng với keyboard shortcuts khi nó mới là keyboard owner hợp lệ.

6. **Đồng bộ lại test contract theo behavior mới**
   - Bộ kiểm thử keyboard authoring và multi-selection được cập nhật để bám theo contract mới: keyboard canvas bị chặn khi input text đang active, chứ không phải chỉ vì Drawer đang mở.

---

## 4. Ma Trận Quyền Sở Hữu Bàn Phím Sau M6 (Keyboard Ownership Matrix)

| Trạng thái ngữ cảnh | Quyền sở hữu bàn phím | Hành vi mong đợi |
|---|---|---|
| Drawer đóng | Canvas ownership | Toàn bộ canvas shortcuts hoạt động theo contract hiện hành. |
| Drawer mở + text input/control trong Drawer có focus | Text input exclusive | Canvas shortcuts bị khóa; phím phục vụ nhập liệu/form. |
| Drawer mở + focus ở Canvas/backdrop hoặc node selection hợp lệ | Canvas inspection ownership | `Delete`, `Backspace`, `Arrow`, `Tab`, `Enter`, `Cmd/Ctrl+A` tiếp tục hoạt động theo contract Canvas. |
| Focus ở search field / modal / dialog ngoài Canvas | External control exclusive | Canvas bỏ qua keyboard event; quyền xử lý thuộc về control ngoài Canvas. |

---

## 5. Bằng Chứng Kiểm Chứng (Verification Evidence)

### 5.1. Targeted Suites

Phase M6 được xác minh cục bộ với các bộ test mục tiêu sau:

- `tests/unit/mindmap-multi-selection.test.tsx`
- `tests/unit/mindmap-keyboard-authoring.test.tsx`
- `tests/unit/mindmap-keyboard-nav.test.tsx`

**Kết quả:** `39/39 PASS`

- Multi-selection: `20/20 PASS`
- Keyboard authoring: `12/12 PASS`
- Keyboard navigation: `7/7 PASS`

### 5.2. Wider Regression Gate

Bộ regression gate mở rộng cho Mind Map Canvas / Viewport / Cross-Link / Lifecycle được chạy qua 12 suites:

- `tests/unit/mindmap-crosslink-drag-connect.test.tsx`
- `tests/integration/mindmap-crosslink-drag-history.test.tsx`
- `tests/unit/mindmap-crosslink-drawer.test.tsx`
- `tests/unit/mindmap-crosslink-history.test.ts`
- `tests/integration/mindmap-crosslink-save-workflow.test.tsx`
- `tests/unit/mindmap-multi-selection.test.tsx`
- `tests/unit/mindmap-canvas-drag-drop.test.tsx`
- `tests/unit/mindmap-viewport-zoom.test.tsx`
- `tests/unit/mindmap-minimap.test.tsx`
- `tests/unit/mindmap-keyboard-nav.test.tsx`
- `tests/unit/mindmap-keyboard-authoring.test.tsx`
- `tests/unit/mindmap-document-lifecycle-parity.test.tsx`

**Kết quả:** `120/120 PASS`

### 5.3. Typecheck & Diff Hygiene

- `npx tsc --noEmit` → **PASS (0 errors)**
- `git diff --check` → **PASS (0 formatting / trailing whitespace issues)**
- `git show --check HEAD` → **PASS**

---

## 6. Ranh Giới Ảnh Hưởng & Blast Radius Review

Phase M6 giữ bán kính ảnh hưởng ở mức tối thiểu:

- **Không đổi schema dữ liệu**
- **Không đổi DataContext API**
- **Không đổi projection/layout engine**
- **Không đổi export serializer**
- **Không đổi cross-link persistence contract**

Thay đổi production code chỉ chạm vào:

- điều kiện lọc sự kiện bàn phím trong `MindMapTreeCanvas.tsx`
- helper nhận diện keyboard-isolation container trong `mindmapHistory.ts`

Toàn bộ ảnh hưởng business behavior được bao bọc bởi test suites keyboard, selection, cross-link history, lifecycle parity, viewport và minimap.

---

## 7. Trạng Thái Git & Phát Hành (Git / Release State)

Tại thời điểm đóng phase:

- `HEAD` local = `caa1504`
- `origin/main` = `caa1504`
- Nhánh `main` đã **đồng bộ tuyệt đối** với remote
- Không còn commit chưa push liên quan đến M5b / M6

Hai file tài liệu ngoài scope implementation vẫn tồn tại ở trạng thái untracked và **không thuộc boundary của phase này**:

1. `docs/reports/mindmap-phase-m5b-closure-report.md`
2. `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`

---

## 8. Kết Luận Nghiệm Thu (Acceptance Conclusion)

Phase M6 đã hoàn tất đầy đủ theo đúng kỷ luật OODA, Spec-First, Test-First và Minimal Blast Radius:

- Xác định đúng root cause kiến trúc.
- Tái định nghĩa keyboard ownership theo focus thực tế thay vì trạng thái Drawer mở/đóng.
- Đồng bộ implementation và tests theo cùng một contract mới.
- Khôi phục trạng thái xanh cho toàn bộ keyboard/multi-selection regression liên quan.
- Phát hành thành công lên `origin/main` mà không phát sinh hồi quy trong các suites Mind Map trọng yếu.

**Kết luận cuối cùng:** ✅ **Phase M6 được chấp nhận, đóng phase và phát hành thành công trên remote.**

---

## 9. Hướng Đi Tiếp Theo (Next Technical Options)

Sau M6, phân hệ Mind Map hiện đã hoàn tất cả hai milestone liên tiếp:

- **M5b:** Direct Drag-to-Connect on Canvas
- **M6:** Focus & Keyboard Shortcut Reconciliation

Các lựa chọn kỹ thuật kế tiếp nên được xem xét qua approval gate mới:

1. **M7 — Direct On-Canvas Cross-Link Inspection / Editing**
   - click trực tiếp lên đường Bézier để inspect, relabel, đổi `edgeType`, hoặc xóa edge mà không cần mở Drawer.

2. **R3b — Reader Highlights & Annotation Polish**
   - chuyển ưu tiên sang Reader theo master roadmap P2.

3. **Documentation Hygiene Pass**
   - reconcile `docs/PROJECT_STATUS.md` và các closure reports để phản ánh trạng thái sau khi M5b và M6 đã được push remote.
