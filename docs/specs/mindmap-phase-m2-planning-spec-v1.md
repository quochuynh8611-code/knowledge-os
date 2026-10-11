# Phase M2 Planning Spec — Inline Node Drawer for Saved Mind Map Documents

**Trạng thái**: Approved for Implementation (Test-First Phase)  
**Ngày**: 2026-10-11  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phase trước**: M1 — External Markdown Import to Saved Mind Map Document  
**Tài liệu tham chiếu**:
- [ADR-094-phase-m2-title-only-inline-node-drawer.md](../adr/ADR-094-phase-m2-title-only-inline-node-drawer.md)
- [mindmap-phase-p7c-planning-spec-v1.md](mindmap-phase-p7c-planning-spec-v1.md)

---

## 1. Bối cảnh & Hiện Trạng Mã Nguồn

Sau Phase M1, hệ thống đã hoàn tất khả năng import Markdown ngoài thành tài liệu sơ đồ độc lập (`saved-document`) và hỗ trợ mở lại qua `MindMapView`.

Hệ thống runtime đã có sẵn các seams quan trọng phục vụ chỉnh sửa cục bộ:
- `handleOpenSavedDocument(documentId)` nạp version hiện tại, chuyển `activeMode` sang `saved-document`, khôi phục các view states.
- `workingDocumentTree` là nguồn dữ liệu runtime duy nhất của tài liệu đang mở.
- `applyTreeMutation(nextTree)` cập nhật `workingDocumentTree`, tự động push snapshot vào `historyState` (hỗ trợ Undo/Redo) và tự động đồng bộ cờ `isDirty`.
- `renameNodeTitle(currentTree, nodeId, nextTitle)` cập nhật immutable tiêu đề node trên cây phân cấp.
- `handleSaveVersion(changeSummary)` đã persist `workingDocumentTree` qua `projectedTreeToDocumentTree(...)`, append version mới, clear `isDirty`.
- Dirty-state guard bảo vệ người dùng không bị mất thay đổi chưa lưu khi chuyển document hoặc đổi chế độ.

**Khoảng trống hiện tại**: Người dùng chưa có giao diện trực quan (Drawer/Panel bên cạnh canvas) để click vào một node trên canvas và chỉnh sửa tiêu đề node đó trước khi lưu thành version mới.

---

## 2. Mục Tiêu Phase M2

1. Xây dựng component `src/components/mindmap/MindMapNodeDrawer.tsx` phục vụ việc hiển thị chi tiết và chỉnh sửa node.
2. Drawer chỉ kích hoạt khi `activeMode === "saved-document"`.
3. Chỉ cho phép chỉnh sửa trường `title` (Option A: Title-only theo ADR-094).
4. Các metadata khác (`id`, `nodeType`, `semanticBadge`, `sourceIdReference`) chỉ hiển thị dưới dạng read-only.
5. Khi người dùng xác nhận đổi title hợp lệ:
   - Gọi `renameNodeTitle(...)` và `applyTreeMutation(...)` để cập nhật `workingDocumentTree`.
   - Tự động kích hoạt cờ `isDirty = true`.
6. Khi đóng Drawer:
   - Không discard thay đổi đã commit vào tree.
   - Giữ nguyên trạng thái visual selection trên canvas (`selectedNodeIds`).
7. Không tự động lưu vào storage khi gõ; việc lưu trữ phiên bản tiếp tục thông qua luồng Save Version hiện có.

---

## 3. Non-Goals

- Không thêm trường mới vào `MindMapDocumentNode` hay `MindMapTreeNode` (không có `notes`, `status`, `progress`).
- Không kích hoạt Drawer trong `live-topic` mode.
- Không sửa backend, Prisma, hay `DataContext`.
- Không tự động lưu ngầm (no auto-persist on keystroke).

---

## 4. Contract Kỹ Thuật

### 4.1. Props Contract của `MindMapNodeDrawer`

```typescript
export interface MindMapNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: MindMapTreeNode | null;
  onUpdateTitle: (nodeId: string, nextTitle: string) => void;
}
```

### 4.2. Wiring trong `MindMapView.tsx`

- State: `activeDrawerNodeId: string | null`.
- Khi click chọn node trong `saved-document` mode: `setActiveDrawerNodeId(nodeId)`.
- Tra cứu node: `const activeDrawerNode = activeDrawerNodeId && (workingDocumentTree || projection?.tree) ? findNodeById(workingDocumentTree || projection.tree, activeDrawerNodeId) : null`.
- Callback `handleUpdateNodeTitleFromDrawer`:
  ```typescript
  const handleUpdateNodeTitleFromDrawer = useCallback((nodeId: string, nextTitle: string) => {
    const currentTree = workingDocumentTree || projection?.tree;
    if (!currentTree) return;
    const res = renameNodeTitle(currentTree, nodeId, nextTitle);
    if (res.ok && res.tree) {
      applyTreeMutation(res.tree);
    }
  }, [workingDocumentTree, projection?.tree, applyTreeMutation]);
  ```

---

## 5. Gherkin Acceptance Criteria

### Scenario 1 — Drawer không mở trong live-topic mode
- **Given** người dùng đang ở chế độ `live-topic`
- **When** click vào bất kỳ node nào trên canvas
- **Then** `MindMapNodeDrawer` không được hiển thị.

### Scenario 2 — Click node mở Drawer trong saved-document mode
- **Given** người dùng đang mở một tài liệu `saved-document`
- **When** click vào một node trên canvas
- **Then** Drawer mở ra, hiển thị tiêu đề trong input editable cùng các metadata read-only (`nodeType`, `semanticBadge`, `id`).

### Scenario 3 — Sửa title cập nhật workingDocumentTree và kích hoạt isDirty
- **Given** Drawer đang mở cho một node với title cũ là "Khổ Đế"
- **When** người dùng đổi title thành "Tập Đế" và xác nhận
- **Then** `workingDocumentTree` được cập nhật với title mới
- **And** cờ `isDirty` chuyển sang `true`
- **And** canvas hiển thị tiêu đề "Tập Đế".

### Scenario 4 — Không bật isDirty nếu title không thay đổi
- **Given** Drawer đang mở cho một node với title "Khổ Đế"
- **When** người dùng bấm Cập nhật mà không sửa gì, hoặc đóng Drawer
- **Then** cờ `isDirty` không bị bật sai.

### Scenario 5 — Đóng Drawer giữ nguyên selection trên canvas
- **Given** một node đang được chọn trên canvas và Drawer đang mở
- **When** người dùng bấm nút Đóng Drawer
- **Then** Drawer đóng lại
- **And** node đó vẫn được chọn trong `selectedNodeIds`.

### Scenario 6 — Save Version bảo toàn title đã sửa từ Drawer
- **Given** người dùng đã sửa title node qua Drawer và `isDirty = true`
- **When** người dùng thực hiện Lưu phiên bản mới (`handleSaveVersion`)
- **Then** phiên bản mới lưu đúng title đã sửa từ `workingDocumentTree`
- **And** khi mở lại tài liệu, title mới vẫn hiển thị chính xác.

---

## 6. Phạm Vi Tệp Được Phép (Allowed Files)

1. `docs/specs/mindmap-phase-m2-planning-spec-v1.md` (Spec chính thức)
2. `docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md` (ADR chính thức)
3. `src/components/mindmap/MindMapNodeDrawer.tsx` (Component mới)
4. `src/components/mindmap/MindMapView.tsx` (Wiring drawer vào view)
5. `tests/unit/mindmap-node-drawer.test.tsx` (File test mới)
6. `docs/specs/mindmap-phase-m2-closure-report.md` (Closure report sau khi hoàn tất)

---

## 7. Kế Hoạch Test-First (Bước Tiếp Theo)

1. **Bước 1 (RED Tests)**:
   - Viết `tests/unit/mindmap-node-drawer.test.tsx` bao phủ cả 6 Gherkin scenarios.
   - Chạy test để chứng minh kết quả RED do component và wiring chưa tồn tại.
2. **Bước 2 (Minimal Implementation)**:
   - Tạo `src/components/mindmap/MindMapNodeDrawer.tsx`.
   - Tích hợp vào `MindMapView.tsx`.
   - Đưa bộ test về GREEN.
3. **Bước 3 (Regression & Closure)**:
   - Chạy lại các suites hồi quy (`mindmap-document-lifecycle-parity`, `mindmap-import-file-to-document`, `mindmap-persistence-ui`).
   - Kiểm tra `npx tsc --noEmit`.
   - Viết closure report.
