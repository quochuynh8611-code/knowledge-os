# Phase M3 Closure Report — Mind Map Keyboard Authoring for Saved Documents

**Trạng thái**: Hoàn tất Kiểm thử & Verification (Candidate for Closure Review)  
**Ngày**: 2026-10-11  
**Vai trò**: Staff Software Engineer / Technical Architect  
**Repo**: `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`  
**Phase liên quan**: Phase K2 (Keyboard Nav & A11y), Phase P7.C (Persistence & Export Parity), Phase M1 (Markdown Import), Phase M2 (Inline Node Drawer), Phase G1 (Governance Reconciliation), Phase M3 (Mind Map Keyboard Authoring)  
**Tuyên bố bắt buộc**: `Chưa stage, chưa commit, chưa push. Dừng lại chờ Human Approval Gate.`

---

## 1. Objective

Triển khai tính năng **Keyboard Authoring** trực tiếp trên canvas cho chế độ biên soạn tài liệu đã lưu (`saved-document` mode) trong Mind Map view:
- Cho phép người dùng tạo nhanh node con (`Tab`), tạo node anh em (`Enter`), và xóa toàn bộ nhánh con (`Delete` / `Backspace`) hoàn toàn bằng bàn phím.
- Thiết lập cơ chế fallback focus tự động theo thứ tự ưu tiên chuẩn mực sau khi xóa node: (1) Sibling liền trước, (2) Sibling liền sau, (3) Parent node, (4) Root node.
- Bảo vệ tuyệt đối node gốc: không thể xóa root, không tạo sibling cho root (`Enter` trên root là no-op).
- Thiết lập rào chắn cô lập an toàn: chặn toàn bộ keyboard authoring khi Drawer M2 đang mở hoặc khi focus nằm trong các form controls (`<input>`, `<textarea>`, `<select>`, `[contenteditable]`, `<button>`, modal dialogs).
- Bảo toàn 100% các invariants hệ thống: `workingDocumentTree` runtime memory, Undo/Redo history stack, cờ `isDirty`, quy trình lưu phiên bản (`handleSaveVersion`), và tính tương thích khi xuất khẩu (Export Parity).

---

## 2. Approved Scope & Architectural Decisions

Dựa trên baseline đã được duyệt:
- **ADR**: `docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md`
- **Spec**: `docs/specs/mindmap-phase-m3-planning-spec-v1.md`

### Các ràng buộc cốt lõi đã thực thi:
1. **Saved-document mode only**: Keyboard authoring chỉ hoạt động trong `saved-document` mode. Chế độ `live-topic` bị chặn tuyệt đối.
2. **Mutation dựa trên `focusedNodeId`**: Thao tác tạo/xóa cây lấy `focusedNodeId` làm nguồn chân lý duy nhất.
3. **Phím `Tab` (Create Child)**: Tạo 1 child mới với tiêu đề literal cố định `"New node"` và append vào cuối mảng `children` của node đang focus, sau đó chuyển focus sang node mới.
4. **Phím `Enter` (Create Sibling)**: Chỉ tạo sibling khi node đang focus không phải root. Sibling mới có title `"New node"` và được chèn ngay sau node hiện tại trong mảng `children` của parent. Focus chuyển sang sibling mới. `Enter` trên root là no-op.
5. **Phím `Delete` / `Backspace` (Subtree Deletion)**: Có cùng ngữ nghĩa, xóa node và toàn bộ cây con bên dưới (không reparenting). Root không được phép xóa. Focus fallback lần lượt theo thứ tự: sibling trước -> sibling sau -> parent -> root.
6. **Drawer & Input Isolation**: Chặn hoàn toàn authoring khi `activeDrawerNodeId !== null` hoặc khi focus nằm trong HTML form controls/buttons.
7. **Zero Schema Modification**: Không chỉnh sửa schema database (`prisma`), backend APIs, hay cấu trúc file storage JSON.

---

## 3. Files Changed

| File | Trạng thái | Mô tả thay đổi |
| :--- | :--- | :--- |
| `src/lib/mindmapTreeMutations.ts` | Modified | Thêm `ROOT_CANNOT_HAVE_SIBLING` vào enum; thêm `newNodeId` vào `TreeMutationResult`; bổ sung các helpers thuần túy `findParentNode`, `findDeleteFallbackNodeId`, `insertSiblingNode`. |
| `src/lib/mindmapHistory.ts` | Modified | Cập nhật `shouldIgnoreCanvasShortcut` để nhận diện thêm thẻ `<button>` và controls nằm trong button, bảo toàn input isolation. |
| `src/components/mindmap/MindMapTreeCanvas.tsx` | Modified | Mở rộng props `isDrawerOpen`, `focusedNodeId`, `onFocusNodeIdChange`, `onAddSibling`, `onDeleteNodeDirectly`; cập nhật `handleKeyDown` xử lý `Tab`, `Enter`, `Delete`, `Backspace`, guard root và drawer. |
| `src/components/mindmap/MindMapView.tsx` | Modified | Khai báo state `focusedNodeId`; bổ sung `handleAddSibling`, `handleDeleteNodeDirectly`; cập nhật `handleAddChild` không mở inline edit khi dùng phím M3; truyền đầy đủ props M3 xuống `MindMapTreeCanvas`. |
| `tests/unit/mindmap-keyboard-authoring.test.tsx` | Mới (`Untracked`) | Test-first suite cho Phase M3 bao phủ trọn vẹn 11 scenarios theo planning spec. |
| `tests/unit/mindmap-tree-mutations.test.ts` | Modified | Bổ sung 4 unit tests kiểm tra `insertSiblingNode`, `findParentNode`, và thứ tự fallback focus của `findDeleteFallbackNodeId`. |
| `docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md` | Mới (`Untracked`) | Kiến trúc đề xuất và quyết định kỹ thuật cho Phase M3. |
| `docs/specs/mindmap-phase-m3-planning-spec-v1.md` | Mới (`Untracked`) | Bản đặc tả chi tiết Phase M3. |
| `docs/reports/mindmap-phase-m3-closure-report.md` | Mới (`Untracked`) | Báo cáo đóng phase và tổng hợp evidence. |

*Tuyệt đối không có file nào ngoài allowlist bị chỉnh sửa. Thư mục `prisma/`, `src/server/`, `src/contexts/`, flashcard runtime, và `docs/PROJECT_STATUS.md` hoàn toàn nguyên vẹn.*

---

## 4. Acceptance Criteria -> Evidence Mapping

| Scenario ID | Acceptance Criteria | Test Scenario | Kết quả kiểm thử |
| :--- | :--- | :--- | :--- |
| **AC-1** | `live-topic` mode chặn hoàn toàn mọi phím tác nghiệp (Tab, Enter, Delete, Backspace) | Scenario 1 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (53ms) |
| **AC-2** | `Tab` tạo node con mới title `"New node"` ở cuối `children` và chuyển focus | Scenario 2 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (137ms) |
| **AC-3** | `Enter` tạo sibling mới title `"New node"` ngay sau node hiện tại và chuyển focus | Scenario 3 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (92ms) |
| **AC-4** | `Enter` trên root là strict no-op (không mutation, không dirty, không history) | Scenario 4 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (71ms) |
| **AC-5** | `Delete` xóa toàn bộ subtree không reparent và fallback focus sang sibling | Scenario 5 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (42ms) |
| **AC-6** | `Backspace` có cùng semantics với `Delete` và fallback focus sang preceding sibling | Scenario 6 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (31ms) |
| **AC-7** | Root không thể bị xóa qua `Delete` hoặc `Backspace` (strict no-op) | Scenario 7 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (27ms) |
| **AC-8** | Drawer M2 đang mở chặn hoàn toàn mọi phím authoring trên canvas | Scenario 8 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (35ms) |
| **AC-9** | Target là form input / button / modal control chặn phím authoring | Scenario 9 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (23ms) |
| **AC-10** | Undo/Redo hoàn trả và tái lập chính xác cây sau create/delete | Scenario 10 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (54ms) |
| **AC-11** | Luồng "Lưu phiên bản" (Save Version) persist trung thực cây đã qua authoring | Scenario 11 (`tests/unit/mindmap-keyboard-authoring.test.tsx`) | **PASSED** (52ms) |

---

## 5. Raw Verification Outputs

### 5.1. Targeted Suite: `tests/unit/mindmap-keyboard-authoring.test.tsx`
```text
$ npx vitest run tests/unit/mindmap-keyboard-authoring.test.tsx

 ✓ tests/unit/mindmap-keyboard-authoring.test.tsx (11 tests) 618ms
   ✓ Phase M3 — Mind Map Keyboard Authoring for Saved Documents (11)
     ✓ Scenario 1: live-topic mode blocks all keyboard authoring 53ms
     ✓ Scenario 2: Tab creates child 'New node' appended to children and moves focus to it 137ms
     ✓ Scenario 3: Enter creates sibling 'New node' inserted immediately after current node 92ms
     ✓ Scenario 4: Enter on root is a strict no-op 71ms
     ✓ Scenario 5: Delete removes full subtree without reparenting, moving focus to fallback 42ms
     ✓ Scenario 6: Backspace has exact parity with Delete and falls back to preceding sibling 31ms
     ✓ Scenario 7: Root cannot be deleted via Delete or Backspace 27ms
     ✓ Scenario 8: Drawer open blocks canvas keyboard authoring 35ms
     ✓ Scenario 9: Form/input target blocks canvas keyboard authoring 23ms
     ✓ Scenario 10: Undo/Redo restores and reapplies keyboard authoring mutations accurately 54ms
     ✓ Scenario 11: Save Version persists keyboard authoring mutations faithfully 52ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  1.79s
```

### 5.2. Regression Suite (5 files / 55 tests)
```text
$ npx vitest run \
    tests/unit/mindmap-keyboard-nav.test.tsx \
    tests/unit/mindmap-tree-mutations.test.ts \
    tests/unit/mindmap-undo-redo.test.tsx \
    tests/unit/mindmap-node-drawer.test.tsx \
    tests/unit/mindmap-document-lifecycle-parity.test.tsx

 ✓ tests/unit/mindmap-tree-mutations.test.ts (30 tests) 12ms
 ✓ tests/unit/mindmap-keyboard-nav.test.tsx (7 tests) 900ms
 ✓ tests/unit/mindmap-undo-redo.test.tsx (4 tests) 1162ms
 ✓ tests/unit/mindmap-document-lifecycle-parity.test.tsx (7 tests) 1290ms
 ✓ tests/unit/mindmap-node-drawer.test.tsx (7 tests) 1386ms

 Test Files  5 passed (5)
      Tests  55 passed (55)
   Duration  3.13s
```

### 5.3. TypeScript Strict Typecheck
```text
$ npx tsc --noEmit
# Exit code: 0 (Zero errors)
```

### 5.4. Git Status & Diffs
```text
$ git diff --stat
 src/components/mindmap/MindMapTreeCanvas.tsx |  62 +++++++++++--
 src/components/mindmap/MindMapView.tsx       |  51 ++++++++++-
 src/lib/mindmapHistory.ts                    |   8 +-
 src/lib/mindmapTreeMutations.ts              | 130 +++++++++++++++++++++++++++
 tests/unit/mindmap-tree-mutations.test.ts    |  52 +++++++++++
 5 files changed, 291 insertions(+), 12 deletions(-)

$ git status -sb
## main...origin/main [ahead 2]
 M src/components/mindmap/MindMapTreeCanvas.tsx
 M src/components/mindmap/MindMapView.tsx
 M src/lib/mindmapHistory.ts
 M src/lib/mindmapTreeMutations.ts
 M tests/unit/mindmap-tree-mutations.test.ts
?? docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md
?? docs/reports/mindmap-phase-m3-closure-report.md
?? docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md
?? docs/specs/mindmap-phase-m3-planning-spec-v1.md
?? tests/unit/mindmap-keyboard-authoring.test.tsx
```

---

## 6. Blast Radius & Regression Assessment

- **Rủi ro ảnh hưởng `live-topic` mode**: Được bảo vệ bằng early returns cả trong canvas keyboard listener và các handler của `MindMapView`. Regression suite K2 và P7.C chứng minh không có rò rỉ tác động.
- **Rủi ro xung đột với navigation K2**: Toàn bộ hệ thống phím mũi tên và phím tắt duyệt cây được giữ nguyên vẹn.
- **Rủi ro xung đột với Drawer M2**: Khi Drawer mở, canvas keyboard authoring bị ngắt hoàn toàn; khi Drawer đóng, selection và focus vẫn được giữ nguyên.
- **Độ an toàn lưu trữ**: Không có auto-save ngầm. Mọi thay đổi đều nằm trong `workingDocumentTree` cho đến khi người dùng chủ động chọn Save Version.
- **Zero regressions**: 55/55 regression tests pass 100%. TypeScript biên dịch sạch 0 lỗi.

---

## 7. Known Limitations & Next Candidates

- **Default Title literal**: Node mới sinh ra có tiêu đề mặc định cố định `"New node"`; người dùng sau khi tạo node có thể mở Drawer (Phase M2) để chỉnh sửa tiêu đề chi tiết.
- **Không hỗ trợ Reparenting qua phím**: Phím `Delete` / `Backspace` xóa toàn bộ subtree. Việc di chuyển nhánh (reparenting) hiện hỗ trợ qua kéo thả chuột (Phase P4).
- **Next Candidate D1 (Mind Map Layout Modes & Auto-Fit Enhancement)** hoặc **D2 (Cross-Link Edge Authoring)**: Có thể được xem xét mở planning sau khi Phase M3 được duyệt đóng hoàn toàn.

---

## 8. Human Approval Gate

```markdown
[ ] 1. Rà soát kết quả kiểm thử M3: Targeted 11/11 PASS, Regression 55/55 PASS, TypeScript 0 errors.
[ ] 2. Rà soát danh sách tệp tin thay đổi: 5 files modified (chỉ thuộc allowlist), 4 files untracked (spec, adr, test, report).
[ ] 3. Xác nhận: Chưa stage, chưa commit, chưa push.
[ ] 4. Phê duyệt cho phép stage và commit Phase M3: CHƯA CẤP (PENDING).
```
