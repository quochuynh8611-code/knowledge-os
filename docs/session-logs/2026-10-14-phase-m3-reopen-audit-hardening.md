# Session Log — Phase M3 Re-Open: Mind Map Keyboard Authoring Audit & Hardening

## 1. Thông Tin Phiên Làm Việc (Session Metadata)
- **Đường dẫn dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:** Re-open, Audit và Hardening cho Phase M3 (Mind Map Keyboard Authoring Shortcuts cho Saved Documents)
- **Thời gian:** 2026-10-14
- **Branch:** `main` (tracking `origin/main`)
- **Baseline HEAD commit:** `5045ed443b5caf20c91384e2f15cc1b6dfe7d202` (`fix(mindmap): make saved document opening explicit`)
- **Role:** Staff Software Engineer / Technical Architect
- **Trạng thái:** ✅ Hoàn tất Hardening & Đã kiểm chứng (29/29 tests passed trên 3 test suites, TypeScript strict typecheck 0 errors, git diff --check sạch)

---

## 2. Kết Quả Audit (Audit Findings)

### 2.1. Các hành vi đã hoạt động đúng theo contract
1. **Mode Gating**: Trong `live-topic` mode, toàn bộ các phím `Tab`, `Enter`, `Delete`, `Backspace` bị bỏ qua hoàn toàn, không gây side-effects hay tạo snapshot dirty.
2. **Child Creation (`Tab`)**: Tạo node con với tiêu đề literal `"New node"`, append vào cuối danh sách children của node đang focus, chuyển focus sang node mới và tạo 1 snapshot history.
3. **Sibling Creation (`Enter`)**: Tạo sibling mới chèn ngay sau node hiện tại trong danh sách children của parent; root node bị chặn nghiêm ngặt (no-op).
4. **Subtree Deletion (`Delete` / `Backspace`)**: Xóa focused node cùng toàn bộ subtree mà không reparent; bảo vệ root node không thể bị xóa.
5. **Delete Fallback Focus Hierarchy**: Tự động chuyển focus chính xác theo thứ tự ưu tiên:
   - Sibling đứng liền trước (preceding sibling).
   - Sibling đứng liền sau (succeeding sibling).
   - Parent node.
   - Root node fallback.
6. **Focus-Aware Input Isolation**: Bỏ qua canvas shortcuts khi focus đang nằm trong `<input>`, `<textarea>`, `<select>`, `<button>`, hoặc `[contenteditable]`.
7. **Persistence & History Parity**: Mọi mutation đi qua `applyTreeMutation(...)`, push đúng 1 snapshot vào `mindmapHistory.ts` và được lưu bền vững qua `handleSaveVersion(...)`.

### 2.2. Điểm hở phát hiện trong đợt Audit (Behavior Gap Identified)
- **Thiếu Modifier Key Guards trên Canvas Shortcuts**:
  - Khi người dùng nhấn các tổ hợp phím như `Meta+Enter`, `Ctrl+Enter`, `Alt+Enter` (hoặc `Alt+Tab`, `Ctrl+Tab`), `MindMapTreeCanvas.tsx` trước đó chỉ kiểm tra `e.key === "Enter"` hoặc `e.key === "Tab"` mà không chặn khi có modifier keys (`metaKey`, `ctrlKey`, `altKey`, `shiftKey`).
  - Hệ quả: Các phím tắt trình duyệt hoặc hệ thống (như `Alt+Tab` chuyển cửa sổ hoặc `Cmd+Enter` gửi form) nếu lọt vào canvas sẽ vô tình kích hoạt mutation tạo node ngoài ý muốn.

### 2.3. Giải pháp khắc phục (Hardening Fix)
- Bổ sung rào chắn modifier keys cho `Enter`, `Tab` / `Insert`, và `Delete` / `Backspace` trong `src/components/mindmap/MindMapTreeCanvas.tsx`:
  - `Enter`: Chặn nếu `e.metaKey || e.ctrlKey || e.altKey || e.shiftKey`.
  - `Tab` / `Insert`: Chặn nếu `e.metaKey || e.ctrlKey || e.altKey || e.shiftKey`.
  - `Delete` / `Backspace`: Chặn nếu `e.metaKey || e.ctrlKey || e.altKey`.

---

## 3. Danh Mục Tập Tin Thay Đổi (Files Changed)

| Tập tin | Phân loại | Mục đích |
| :--- | :--- | :--- |
| `src/components/mindmap/MindMapTreeCanvas.tsx` | Source code | Bổ sung rào chắn an toàn cho modifier keys trên `Enter`, `Tab`, `Delete`/`Backspace` |
| `docs/gherkin/mindmap-phase-m3-keyboard-authoring-hardening.feature` | Gherkin Spec | Định nghĩa 10 kịch bản kiểm thử hành vi hardening cho Phase M3 |
| `tests/unit/mindmap-keyboard-authoring-hardening.test.tsx` | Test Suite | Bộ unit test kiểm chứng 10 kịch bản hardening (10/10 PASS) |
| `docs/PROJECT_STATUS.md` | Tài liệu quản trị | Bổ sung reconciliation note ghi nhận Phase M3 Re-Open Audit & Hardening |

*(Các file session logs cũ trong `docs/session-logs/` được giữ nguyên trạng, không bị chỉnh sửa, stage hay xóa).*

---

## 4. Gherkin Scenarios Hardening Đã Kiểm Chứng

1. `Scenario: One Enter produces exactly one sibling mutation` (PASS)
2. `Scenario: One Tab produces exactly one child mutation` (PASS)
3. `Scenario: Modified shortcuts do not mutate` (PASS - Đã chứng minh RED và chuyển GREEN sau fix)
4. `Scenario: Contenteditable target is isolated` (PASS)
5. `Scenario: Drawer target is isolated` (PASS)
6. `Scenario: Delete fallback prefers preceding sibling` (PASS)
7. `Scenario: Delete fallback uses succeeding sibling` (PASS)
8. `Scenario: Delete fallback reaches parent` (PASS)
9. `Scenario: Live-topic remains immutable` (PASS)
10. `Scenario: Save Version preserves keyboard mutations` (PASS)

---

## 5. Kết Quả Kiểm Chứng & Quality Gates

| Lệnh kiểm thử | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| `npx vitest run tests/unit/mindmap-keyboard-authoring.test.tsx tests/unit/mindmap-keyboard-nav.test.tsx tests/unit/mindmap-keyboard-authoring-hardening.test.tsx` | ✅ **29/29 PASS** | 12 tests authoring + 7 tests nav + 10 tests hardening |
| `npm run typecheck` (`tsc --noEmit`) | ✅ **0 ERRORS** | Exit code 0, hoàn toàn tương thích TypeScript strict |
| `git diff --check` | ✅ **CLEAN** | Không có trailing whitespace hoặc conflict markers |
| `git status --short --branch` | ✅ **VERIFIED** | Chỉ có 1 file source modified (`MindMapTreeCanvas.tsx`), 2 file test/doc mới, và 1 note trong `PROJECT_STATUS.md` |

---

## 6. Trạng Thái ADR & Governance

- **ADR-096**: Giữ trạng thái **`Proposed`** theo đúng nguyên tắc bắt buộc:
  `ADR-096 chỉ được chuyển sang Accepted sau khi Human Approval Gate được thông qua.`
- **Historical Closure Report**: Không sửa đè closure report lịch sử của M3 (`mindmap-phase-m3-closure-report.md`), mà chỉ bổ sung nhật ký kiểm toán trong session log này và ghi chú cập nhật trong `PROJECT_STATUS.md`.

---

## 7. Đánh Giá Rủi Ro Còn Lại (Remaining Risks)
- Không có breaking changes với bất kỳ phím tắt nào khác (K2 navigation với phím mũi tên, Shift+A AI expansion, F2 inline rename, hay batch delete đa node vẫn hoạt động hoàn hảo).
- Blast radius tập trung tối thiểu vào đúng điều kiện modifier keys của 3 lệnh authoring trên canvas.
