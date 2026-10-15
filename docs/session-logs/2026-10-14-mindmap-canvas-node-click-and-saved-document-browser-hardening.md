# Session Log — Mind Map Canvas Node Click Isolation & Saved Document Browser Hardening

## 1. Thông Tin Phiên Làm Việc (Session Metadata)
- **Đường dẫn dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:**
  1. Khắc phục lỗi click node trên canvas Mind Map tự động điều hướng sang "Chủ đề học" (`openTopicDetail`).
  2. Hoàn thiện hành vi Saved Document Browser Modal: Explicit CTA "Mở", chặn click nền card ngoài ý muốn, tự động đóng modal khi nạp document, và bảo toàn dirty-state workflow.
- **Thời gian:** 2026-10-14
- **Branch:** `main` (local ahead `origin/main`)
- **Role:** Staff Software Engineer
- **Trạng thái:** ✅ Đã kiểm chứng toàn diện & xanh 100% Quality Gates (TypeScript 0 errors, Vitest passed, `git diff --check` sạch).

---

## 2. Bối Cảnh & Vấn Đề Kỹ Thuật (Root Causes)

### 2.1. Bug Click Node Trên Canvas Điều Hướng Rời Khỏi Mind Map
- **Hiện tượng:**
  Trong màn hình "Sơ đồ tư duy" (Mind Map), khi người dùng click vào bất kỳ node nào trên canvas (kể cả live topic mode lẫn saved document mode có node type là `topic`), ứng dụng tự động chuyển tab sang màn hình "Chủ đề học".
  Điều này ngăn cản toàn bộ thao tác cốt lõi của người dùng trên canvas: chọn node, sửa tên, mở drawer, thêm node con/ngang cấp, xóa node, kéo nối cross-links, và AI expansion.
- **Root cause:**
  Trong `src/components/mindmap/MindMapView.tsx`, callback sau được truyền vào canvas:
  ```tsx
  onSelectTopic={(topicId) => openTopicDetail(topicId)}
  ```
  Trong `src/components/mindmap/MindMapTreeCanvas.tsx`:
  - Khi click vào node:
    ```tsx
    if (isTopic && onSelectTopic) {
      onSelectTopic(node.id);
    }
    ```
  - Khi nhấn phím `Enter` trên canvas:
    ```tsx
    if (focusedNodeId && currentNode && currentNode.type === "topic" && onSelectTopic) {
      onSelectTopic(focusedNodeId);
    }
    ```
  Khi `openTopicDetail` được gọi, `NavigationContext` lập tức set `activeTab = "topics"`, khiến React unmount màn hình Mind Map.

### 2.2. Bug Saved Document Browser Modal (Card Click ngầm & Modal Overlay)
- **Hiện tượng:**
  Trong modal "Sơ đồ tư duy đã lưu" (`MindMapDocumentBrowserModal.tsx`), sự kiện click được gắn lên toàn bộ thẻ tài liệu:
  ```tsx
  <div onClick={() => onOpenDocument(doc.id)} className="... cursor-pointer">
  ```
  Khi người dùng click vào nền card, tiêu đề, badge phiên bản hoặc thông tin ngày cập nhật, modal kích hoạt mở tài liệu ngoài ý muốn.
  Đồng thời, sau khi bấm mở, modal từng gặp lỗi không đóng đúng cách hoặc đóng sai khi xử lý discard dialog lúc tài liệu đang có thay đổi chưa lưu (dirty-state).

---

## 3. Kiến Trúc & Giải Pháp Thực Hiện

### 3.1. Nhóm A — Cách Ly Hoàn Toàn Node Click Trên Canvas (Commit `b55ba53`)
- **Nguyên tắc:** Mind Map là một workspace biên tập độc lập. Click node trên canvas chỉ phục vụ focus, selection, mở drawer và chỉnh sửa tại chỗ; tuyệt đối không điều hướng rời khỏi màn hình.
- **Thay đổi thực hiện trong `src/components/mindmap/MindMapView.tsx`:**
  - Loại bỏ `openTopicDetail` khỏi destructuring của hook `useData()`.
  - Loại bỏ prop `onSelectTopic={(topicId) => openTopicDetail(topicId)}` khỏi `<MindMapTreeCanvas />` (để `onSelectTopic` là `undefined`, tương tự `MindMapImportPreviewModal`).
- **Quy trình Test-First:**
  - Tạo suite kiểm thử `tests/unit/mindmap-node-click-navigation.test.tsx` với 3 bài test:
    1. Click node topic ở live topic mode $\to$ `openTopicDetail` không được gọi, node nhận focus.
    2. Click node topic ở saved document mode $\to$ `openTopicDetail` không được gọi, ở lại canvas.
    3. Nhấn phím `Enter` trên canvas $\to$ `openTopicDetail` không được gọi.
  - Chạy test trước khi sửa (RED): 3/3 tests thất bại đúng như dự kiến.
  - Sau khi sửa (GREEN): 3/3 tests vượt qua thành công.

### 3.2. Nhóm B — Hardening Saved Document Browser Modal
- **Nguyên tắc Explicit Action:**
  - Thao tác mở tài liệu phải là hành động tường minh có chủ đích của người dùng.
- **Thay đổi trong `src/components/mindmap/MindMapDocumentBrowserModal.tsx`:**
  - Xóa `onClick` và class `cursor-pointer` trên container của `doc-card`.
  - Bổ sung nút hành động tường minh:
    ```tsx
    <button
      type="button"
      onClick={() => onOpenDocument(doc.id)}
      data-testid={`btn-open-${doc.id}`}
      className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
    >
      Mở
    </button>
    ```
- **Quản lý Vòng đời & Dirty-State:**
  - Mở tài liệu sạch: nạp document và tự động đóng browser modal.
  - Mở tài liệu khi đang dirty: hiển thị dialog xác nhận hủy thay đổi (`unsaved-changes-confirm-dialog`). Nếu người dùng chọn discard, document mới được mở và browser modal đóng an toàn. Nếu cancel, giữ nguyên tài liệu hiện tại.
- **Đồng bộ Regression Tests (8 files):**
  - Cập nhật các test helper `openSavedDocument` từ selector thẻ card sang click nút `btn-open-${doc.id}`.
  - Bổ sung test kiểm tra click nền card không mở tài liệu trong `mindmap-persistence-ui.test.tsx`.
  - Bổ sung Scenario 8 & 9 trong `mindmap-document-lifecycle-parity.test.tsx` kiểm chứng modal tự động đóng khi mở tài liệu.

---

## 4. Kết Quả Kiểm Chứng (Quality Gates)

1. **Mind Map Node Click Isolation Tests:**
   - `tests/unit/mindmap-node-click-navigation.test.tsx`: 3/3 tests passed.
2. **Mind Map Core Interaction & Persistence Suites:**
   - `tests/unit/mindmap-document-lifecycle-parity.test.tsx`: 9/9 passed.
   - `tests/unit/mindmap-persistence-ui.test.tsx`: 11/11 passed.
   - `tests/unit/mindmap-keyboard-authoring.test.tsx`: 12/12 passed.
   - `tests/unit/mindmap-node-drawer.test.tsx`: 7/7 passed.
   - `tests/unit/mindmap-ai-expansion-ui.test.tsx`: 10/10 passed.
   - `tests/integration/mindmap-crosslink-drag-history.test.tsx`: 2/2 passed.
   - `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`: 12/12 passed.
   - `tests/integration/mindmap-crosslink-save-workflow.test.tsx`: 2/2 passed.
   - **Tổng cộng:** 68/68 tests passed.
3. **TypeScript Compilation:**
   - `npm run typecheck` $\to$ Exit code `0` (0 errors).
4. **Git Hygiene:**
   - `git diff --check` $\to$ Exit code `0` (hoàn toàn sạch sẽ).

---

## 5. Danh Sách Tệp Thay Đổi (Files Changed)

### Nhóm A (Đã commit b55ba53):
- `src/components/mindmap/MindMapView.tsx`
- `tests/unit/mindmap-node-click-navigation.test.tsx`

### Nhóm B (Sẵn sàng commit):
- `src/components/mindmap/MindMapDocumentBrowserModal.tsx`
- `tests/integration/mindmap-crosslink-drag-history.test.tsx`
- `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`
- `tests/integration/mindmap-crosslink-save-workflow.test.tsx`
- `tests/unit/mindmap-ai-expansion-ui.test.tsx`
- `tests/unit/mindmap-document-lifecycle-parity.test.tsx`
- `tests/unit/mindmap-keyboard-authoring.test.tsx`
- `tests/unit/mindmap-node-drawer.test.tsx`
- `tests/unit/mindmap-persistence-ui.test.tsx`
- `docs/session-logs/2026-10-14-mindmap-canvas-node-click-and-saved-document-browser-hardening.md`
