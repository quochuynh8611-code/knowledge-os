# Phase M3 Planning Spec — Mind Map Keyboard Authoring for Saved Documents

**Trạng thái**: Draft for Human Review  
**Ngày**: 2026-10-11  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phase trước**: Phase M2 (Inline Node Drawer) & Phase G1 (Governance Reconciliation)  
**Tuyên bố bắt buộc**: `M3 chưa được phép implementation trong phiên này.`

---

## 1. Evidence Baseline & Tài Liệu Tham Chiếu

### 1.1. Git & Repo Baseline
- **HEAD Commit**: `c34f39a` (Phase G1 Governance Reconciliation)
- **Branch**: `main` tracking `origin/main` (Local ahead 2 commits: `680e8b8` và `c34f39a`)
- **Remote Policy**: LOCAL-ONLY / NOT PUSHED
- **Untracked File ngoài scope**: `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`

### 1.2. Tài Liệu Tham Chiếu
- [PROJECT_STATUS.md](../PROJECT_STATUS.md)
- [ADR-094-phase-m2-title-only-inline-node-drawer.md](../adr/ADR-094-phase-m2-title-only-inline-node-drawer.md)
- [ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md](../adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md)
- [mindmap-phase-m2-planning-spec-v1.md](mindmap-phase-m2-planning-spec-v1.md)
- [mindmap-phase-m2-closure-report.md](../reports/mindmap-phase-m2-closure-report.md)
- [mindmap-phase-p7c-planning-spec-v1.md](mindmap-phase-p7c-planning-spec-v1.md)
- [mindmap-phase-p7c-closure-report.md](mindmap-phase-p7c-closure-report.md)

### 1.3. Code Seams Hiện Hữu
- `src/components/mindmap/MindMapView.tsx`: Quản lý `workingDocumentTree`, `applyTreeMutation(...)`, `handleSaveVersion(...)`, `focusedNodeId`, `selectedNodeIds`, `activeDrawerNodeId`.
- `src/components/mindmap/MindMapTreeCanvas.tsx`: Canvas render và keyboard navigation K2 (`onFocusNodeIdChange`, phím mũi tên).
- `src/lib/mindmapTreeMutations.ts`: Các hàm thuần túy bất biến thao tác trên cây (`findNodeById`, `insertChildNode`, `deleteNode`, `renameNodeTitle`, `moveNodeWithinParent`).
- `src/lib/mindmapHistory.ts`: State container lưu stack Undo/Redo (`pushHistoryState`, `undoHistoryState`, `redoHistoryState`).

---

## 2. Bối Cảnh Hiện Trạng Runtime

Sau các Phase K2, P7.C, M1, M2 và G1:
- Hệ thống đã hỗ trợ duyệt cây bằng bàn phím (K2: phím mũi tên, cách ly form controls).
- Quản lý vòng đời tài liệu đã lưu độc lập (`saved-document`), kiểm soát chặt chẽ dirty-state guard và versioning (P7.C).
- Hỗ trợ nhập Markdown ngoài vào sơ đồ đã lưu (M1).
- Hỗ trợ đổi tiêu đề node thông qua Inline Node Drawer (M2).

**Khoảng trống hiện tại**: Người dùng vẫn phải mở drawer hoặc tương tác chuột để biên soạn, tạo nhánh và xóa node. Thao tác tư duy sơ đồ nhanh (speed-of-thought mind mapping) đòi hỏi khả năng tạo node con (`Tab`), tạo node anh em (`Enter`), và xóa nhánh (`Delete` / `Backspace`) hoàn toàn bằng phím bấm mà không cần rời tay khỏi bàn phím.

---

## 3. Mục Tiêu Phase M3

1. Thiết kế cơ chế tác nghiệp cây bằng phím (Keyboard Authoring) trực tiếp trên canvas cho `saved-document` mode.
2. Cung cấp bộ phím tắt trực quan, tiêu chuẩn ngành:
   - `Tab`: Tạo node con (child).
   - `Enter`: Tạo node anh em (sibling).
   - `Delete` / `Backspace`: Xóa toàn bộ subtree của node hiện tại.
3. Bảo toàn nguyên vẹn tính nhất quán của `workingDocumentTree`, lịch sử Undo/Redo (`mindmapHistory.ts`), cờ `isDirty`, và luồng lưu phiên bản (`handleSaveVersion`).
4. Thiết lập rào chắn cô lập tuyệt đối (Input Isolation & Drawer Isolation) nhằm ngăn ngừa xung đột gõ phím với form controls và drawer M2.
5. Ngăn chặn triệt để mọi hành vi mutation trong `live-topic` mode.

---

## 4. Non-Goals

1. **Không hỗ trợ keyboard authoring trong `live-topic` mode**: `live-topic` là hình chiếu ephemeral từ dữ liệu topic/flashcards hệ thống, không phải tài liệu phân cấp tùy ý.
2. **Không reparenting children khi xóa**: Xóa node đồng nghĩa xóa toàn bộ cây con bên dưới (subtree deletion), không đẩy children lên node cha.
3. **Không hỗ trợ multi-selection batch delete**: Phím `Delete` / `Backspace` chỉ thao tác trên duy nhất một node đang nhận `focusedNodeId`.
4. **Không tạo root-level sibling**: Phím `Enter` tại root là no-op; tài liệu luôn duy trì duy nhất một root.
5. **Không thay đổi schema dữ liệu**: Không thêm trường mới vào `MindMapDocumentNode` hay `MindMapTreeNode`.
6. **Không tự động lưu (No auto-persist)**: Mọi thay đổi phím chỉ cập nhật runtime memory `workingDocumentTree` và bật `isDirty = true`. Việc lưu bền vững chỉ diễn ra khi người dùng chủ động chọn Save Version.
7. **Không hỗ trợ đa ngôn ngữ (Localization)**: Chuỗi tiêu đề mặc định cố định literal `"New node"`.

---

## 5. Scope Chức Năng

- **Mode gating**: Chỉ kích hoạt khi `activeMode === "saved-document"`.
- **Targeting**: Mutation lấy `focusedNodeId` làm nguồn chân lý duy nhất.
- **Tree mutations**: Thao tác tạo/xóa đi qua seam thuần túy `mindmapTreeMutations.ts` và được cập nhật qua `applyTreeMutation(...)`.
- **Focus tracking**: Tự động chuyển focus sang node mới tạo hoặc chuyển sang node fallback phù hợp khi xóa.
- **Undo/Redo integration**: Mọi thao tác phím thành công đều tạo snapshot lịch sử, cho phép Undo và Redo chính xác.
- **Safety guards**: Bảo vệ root không thể bị xóa; không tạo sibling cho root.

---

## 6. Explicit Keyboard Semantics

| Thao tác / Phím | Điều kiện tiên quyết | Hành vi chi tiết | Trạng thái Focus sau thao tác | Ghi chú & Guard |
| :--- | :--- | :--- | :--- | :--- |
| **Tab** (Create child) | `saved-document` mode, `focusedNodeId != null` | Tạo một node con mới với tiêu đề literal `"New node"`, append vào vị trí cuối cùng trong danh sách `children` của node đang focus. | Focus chuyển sang node con mới vừa tạo. | Cập nhật `workingDocumentTree`, push Undo history, set `isDirty = true`. |
| **Enter** (Create sibling) | `saved-document` mode, `focusedNodeId` không phải root | Tạo một node anh em mới với tiêu đề literal `"New node"`, chèn ngay sau node hiện tại trong danh sách `children` của parent. | Focus chuyển sang sibling mới vừa tạo. | Cập nhật `workingDocumentTree`, push Undo history, set `isDirty = true`. |
| **Enter** trên root | `saved-document` mode, `focusedNodeId === root.id` | **No-op**. Không có bất kỳ thay đổi nào trên cây. | Giữ nguyên focus tại root. | Không tạo snapshot lịch sử, không đổi cờ `isDirty`. |
| **Delete** / **Backspace** | `saved-document` mode, `focusedNodeId` không phải root | Xóa node đang focus và **toàn bộ subtree** (các node con cháu) của node đó. Không reparent children. | Chuyển focus theo thứ tự ưu tiên: <br>1. Sibling đứng liền trước<br>2. Sibling đứng liền sau<br>3. Parent node<br>4. Root (nếu không có fallback nào khác) | Cập nhật `workingDocumentTree`, push Undo history, set `isDirty = true`. |
| **Delete** / **Backspace** trên root | `saved-document` mode, `focusedNodeId === root.id` | **No-op**. Root được bảo vệ tuyệt đối không thể bị xóa. | Giữ nguyên focus tại root. | Không tạo snapshot lịch sử, không đổi cờ `isDirty`. |
| **Bất kỳ phím nào** | `live-topic` mode | **Blocked**. Bỏ qua toàn bộ authoring logic. | Duy trì navigation K2 hiện có. | Không phát sinh mutation, không đổi cờ `isDirty`. |
| **Bất kỳ phím nào** | Drawer M2 đang mở (`activeDrawerNodeId != null`) | **Blocked**. Toàn bộ canvas keyboard authoring bị tạm dừng. | Focus thuộc quyền quản lý của Drawer form controls. | Tránh xung đột khi người dùng đang nhập văn bản hoặc phím điều hướng trong Drawer. |

### 6.1. Quy tắc Default Title
- Tiêu đề mặc định của node mới tạo: `"New node"`.
- Giá trị chuỗi literal cố định, không gắn timestamp, không sinh số ngẫu nhiên, không xử lý đa ngôn ngữ (i18n).

### 6.2. Input Isolation
Sự kiện phím (`keydown`) bị bỏ qua hoàn toàn đối với authoring canvas nếu `event.target` thuộc một trong các phần tử sau:
- `<input>`
- `<textarea>`
- `<select>`
- Phần tử có thuộc tính `[contenteditable="true"]`
- Bất kỳ control hoặc input nào bên trong Drawer M2
- Modal dialog controls
- Nút bấm (`<button>`) hoặc interactive control đang nhận focus ngoài canvas.

---

## 7. Các Invariants Bắt Buộc Của Hệ Thống

1. **Active Tree Invariant**: Trong `saved-document` mode, `workingDocumentTree` là nguồn chân lý duy nhất cho cấu trúc cây hiện thời.
2. **Dirty State Invariant**: Mỗi khi cây bị thay đổi bởi authoring mutation, `isDirty` chuyển sang `true`. Nếu thao tác là no-op (như Enter/Delete trên root), `isDirty` giữ nguyên trạng thái cũ.
3. **History Invariant**: Mỗi mutation thành công phải được push vào `mindmapHistory.ts` dưới dạng snapshot bất biến.
4. **Undo/Redo Invariant**: Thao tác Undo hoàn trả cây và trạng thái focus về trước khi phím authoring được bấm. Thao tác Redo khôi phục chính xác trạng thái sau khi bấm.
5. **Persistence Invariant**: Không tự động lưu ra disk/backend khi bấm phím. Dữ liệu chỉ được lưu khi gọi `handleSaveVersion(...)`.
6. **Export Parity Invariant**: Sau khi phím authoring làm thay đổi cây, các tính năng xuất khẩu (Export Markdown, Export JSON) phản ánh chính xác 100% cấu trúc của `workingDocumentTree`.
7. **Schema Invariant**: Cấu trúc persisted schema `MindMapDocumentNode` và runtime schema `MindMapTreeNode` không thay đổi.

---

## 8. Gherkin Scenarios Bắt Buộc

### Scenario 1 — live-topic mode blocked
```gherkin
Given người dùng đang ở chế độ live-topic
When người dùng nhấn phím Tab, Enter, Delete, hoặc Backspace trên canvas
Then không có bất kỳ tree mutation nào xảy ra
And cờ isDirty không bị thay đổi
And không có history snapshot mới nào được tạo.
```

### Scenario 2 — Tab creates child
```gherkin
Given người dùng đang ở chế độ saved-document
And một node hợp lệ đang nhận focusedNodeId
When người dùng nhấn phím Tab
Then một node con mới với tiêu đề "New node" được append vào cuối danh sách children của node đó
And workingDocumentTree được cập nhật với cấu trúc mới
And cờ isDirty chuyển sang true
And focus tự động chuyển sang node con mới vừa tạo.
```

### Scenario 3 — Enter creates sibling
```gherkin
Given người dùng đang ở chế độ saved-document
And một node không phải root đang nhận focusedNodeId
When người dùng nhấn phím Enter
Then một node anh em mới với tiêu đề "New node" được chèn ngay sau node hiện tại trong danh sách children của parent
And workingDocumentTree được cập nhật
And cờ isDirty chuyển sang true
And focus tự động chuyển sang node anh em mới vừa tạo.
```

### Scenario 4 — Enter on root is no-op
```gherkin
Given người dùng đang ở chế độ saved-document
And node root đang nhận focusedNodeId
When người dùng nhấn phím Enter
Then cấu trúc cây hoàn toàn không thay đổi
And không có history snapshot nào được tạo
And cờ isDirty giữ nguyên trạng thái hiện tại.
```

### Scenario 5 — Delete subtree
```gherkin
Given người dùng đang ở chế độ saved-document
And một node không phải root có các node con cháu (descendants) đang nhận focusedNodeId
When người dùng nhấn phím Delete
Then node đó và toàn bộ subtree của nó bị xóa khỏi cây
And không xảy ra hành vi reparenting children lên parent
And focus chuyển đến fallback hợp lệ theo thứ tự: sibling trước, sibling sau, hoặc parent.
```

### Scenario 6 — Backspace parity
```gherkin
Given người dùng đang ở chế độ saved-document
And một node có thể xóa (không phải root) đang nhận focusedNodeId
When người dùng nhấn phím Backspace
Then hành vi xử lý hoàn toàn đồng nhất với phím Delete
And toàn bộ subtree bị xóa, focus chuyển theo thứ tự fallback.
```

### Scenario 7 — Root cannot be deleted
```gherkin
Given người dùng đang ở chế độ saved-document
And node root đang nhận focusedNodeId
When người dùng nhấn phím Delete hoặc Backspace
Then cấu trúc cây hoàn toàn không thay đổi
And cờ isDirty giữ nguyên trạng thái hiện tại
And focus vẫn duy trì ở root.
```

### Scenario 8 — Drawer/input isolation
```gherkin
Given người dùng đang ở chế độ saved-document
And focus đang nằm trong input của Drawer M2 hoặc một form control HTML
When người dùng nhấn phím Tab, Enter, Delete, hoặc Backspace
Then không có bất kỳ canvas authoring mutation nào được kích hoạt
And sự kiện phím được xử lý bình thường bởi control đó.
```

### Scenario 9 — Undo/Redo
```gherkin
Given một thao tác tạo hoặc xóa node bằng phím đã thực hiện thành công
When người dùng thực hiện Undo
Then cấu trúc cây quay về chính xác trạng thái trước khi bấm phím
When người dùng thực hiện Redo
Then cấu trúc cây khôi phục chính xác trạng thái sau khi mutation xảy ra.
```

### Scenario 10 — Save Version parity
```gherkin
Given người dùng đã thực hiện thành công các thao tác keyboard authoring
When người dùng kích hoạt hành động Lưu Phiên Bản (Save Version)
Then phiên bản lưu trữ mới ghi lại trọn vẹn cây đã qua biến đổi từ workingDocumentTree
And cờ isDirty được reset về false
And khi tải lại tài liệu, toàn bộ các node con và anh em mới được bảo toàn đầy đủ.
```

---

## 9. Phân Tích Phạm Vi Tác Động & Blast Radius

| Vùng tác động | Rủi ro tiềm ẩn | Biện pháp cô lập (Blast-Radius Defense) |
| :--- | :--- | :--- |
| `live-topic` mode | Bị ảnh hưởng nếu phím tắt kích hoạt nhầm | Mode gating cứng: `if (activeMode !== "saved-document") return;` ngay đầu listener. |
| Navigation K2 | Xung đột phím điều hướng mũi tên | Chỉ bắt các phím tác nghiệp (`Tab`, `Enter`, `Delete`, `Backspace`), giữ nguyên toàn bộ nhánh xử lý mũi tên của K2. |
| Drawer M2 | Xung đột khi gõ text trong Drawer input | Drawer gating: `if (activeDrawerNodeId != null) return;` và kiểm tra `isInputEvent(event)`. |
| Dữ liệu đã lưu | Ghi đè hoặc hỏng file persisted | Không có auto-persist. Thay đổi chỉ nằm trên memory `workingDocumentTree` cho đến khi người dùng bấm Save Version. |
| History / Undo Stack | Rác snapshot khi phím bấm no-op | Guard kiểm tra điều kiện (ví dụ `isRoot`) trước khi gọi mutation seam, ngăn push snapshot vô nghĩa. |

---

## 10. Kế Hoạch Kiểm Thử (Verification Plan - Thiết Kế)

Khi Phase M3 được phê duyệt bước vào giai đoạn Implementation (Test-First), bộ kiểm thử sẽ bao gồm:
1. **Targeted Pure Mutation Tests** (`tests/unit/mindmap-tree-mutations.test.ts`):
   - `insertChildNode`: Append child vào cuối mảng children.
   - `insertSiblingNode`: Chèn sibling ngay sau target node trong mảng children của parent.
   - `deleteNode`: Xóa subtree và trả về thông tin fallback focus thích hợp.
   - Guard root: Không cho phép xóa root, không chèn sibling cho root.
2. **Targeted Keyboard Handler & Canvas Tests** (`tests/unit/mindmap-keyboard-authoring.test.tsx`):
   - Kiểm tra `Tab`, `Enter`, `Delete`, `Backspace` trên canvas.
   - Kiểm tra mode gating (`live-topic` blocked).
   - Kiểm tra input isolation và drawer isolation.
   - Kiểm tra fallback focus sau khi xóa.
3. **Regression Tests**:
   - `tests/unit/mindmap-keyboard-nav.test.tsx` (K2 navigation không bị ảnh hưởng).
   - `tests/unit/mindmap-undo-redo.test.tsx` (Undo/Redo hoạt động đồng bộ với keyboard mutations).
   - `tests/unit/mindmap-document-lifecycle-parity.test.tsx` (Save Version và Export duy trì tính toàn vẹn).

---

## 11. Chiến Lược Rollback

Phase M3 tuân thủ nguyên tắc Two-way Door:
- Không thay đổi schema database.
- Không thay đổi cấu trúc lưu trữ JSON của tài liệu mind map.
- Mọi logic authoring tập trung ở tầng keyboard event listener trên canvas và hàm tree mutation thuần túy.
- Nếu phát sinh hồi quy, rollback được thực hiện bằng cách revert commit của M3, khôi phục trạng thái canvas K2 thuần navigation mà không ảnh hưởng tới dữ liệu của người dùng.

---

## 12. Quản Trị Tệp Tin (File Governance)

### 12.1. File được phép trong phiên Planning này
- `docs/specs/mindmap-phase-m3-planning-spec-v1.md` (Tạo mới - Specification)
- `docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md` (Tạo mới - ADR)

### 12.2. File cấm sửa trong phiên này
- Tuyệt đối KHÔNG sửa: `docs/PROJECT_STATUS.md`, `src/**/*`, `tests/**/*`, `prisma/**/*`, session logs, package manifests.
- Không chạy RED test, không viết application code.

---

## 13. Human Approval Gate

```markdown
[ ] 1. Xem xét nội dung Spec: Các semantics của Tab, Enter, Delete, Backspace, Fallback Focus đã đúng chuẩn chưa?
[ ] 2. Xem xét ADR-096: Quyết định kiến trúc và các phương án cân nhắc đã chuẩn xác chưa?
[ ] 3. Xác nhận: Phase M3 chỉ đang ở giai đoạn PLANNING DRAFT, CHƯA ĐƯỢC DUYỆT IMPLEMENTATION.
[ ] 4. Phê duyệt chính thức của con người để mở implementation Phase M3: CHƯA CẤP (PENDING).
```
