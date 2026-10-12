# Báo Cáo Đóng Phase M5b: Mind Map Canvas Direct Drag-to-Connect Interaction

**Ngày lập báo cáo:** 2026-10-12
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect
**Trạng thái phase:** ✅ **PUSHED TO REMOTE / CLOSED**
**Trạng thái commit:** Commit `ae66568` đã được push thành công lên `origin/main` cùng với Phase M6 (Commit `caa1504`).

---

## 1. Định Danh Phase & Bản Ghi Commit (Phase Identity & Commit Record)

- **Tên Phase:** Milestone M5b — Canvas Direct Drag-to-Connect Interaction
- **Commit SHA:** `ae66568`
- **Tiêu đề commit (Exact Subject):**
  `feat(mindmap): implement canvas drag-to-connect interaction and history integration (M5b)`
- **Ranh giới commit (Exact 6-File Boundary):**
  1. `src/components/mindmap/MindMapTreeCanvas.tsx` (Production code)
  2. `src/components/mindmap/MindMapView.tsx` (Production code)
  3. `tests/unit/mindmap-crosslink-drag-connect.test.tsx` (Unit test suite)
  4. `tests/integration/mindmap-crosslink-drag-history.test.tsx` (Integration test suite)
  5. `docs/specs/m5b-canvas-drag-to-connect.md` (Technical specification)
  6. `docs/adr/ADR-M5-003-canvas-drag-to-connect-architecture.md` (Architecture decision record)

---

## 2. Các Hành Vi Đã Chuyển Giao (Delivered Behavior)

Phase M5b hoàn thành toàn diện trải nghiệm kết nối trực tiếp trên Canvas theo đúng đặc tả và ADR:

1. **Cổng kết nối chuyên biệt (Dedicated Connection Handle)**:
   - Thêm nút cổng kết nối tròn chuyên biệt (`data-testid="connector-handle-${node.id}"`, `role="button"`) tại rìa phải của mỗi thẻ node khi `isEditable === true`.
   - Tự động ẩn hoàn toàn khi `isEditable === false` hoặc `undefined`.
   - Cách ly sự kiện tuyệt đối với thân thẻ node (`e.stopPropagation()`).
2. **Quản lý vòng đời cử chỉ Pointer Events (Pointer Events Gesture State Machine)**:
   - Khởi tạo cử chỉ khi `onPointerDown` trên handle, dùng `setPointerCapture` để khóa con trỏ.
   - Quản lý trạng thái kéo trực tiếp (`connectingState`: `sourceNodeId`, `startPos`, `currentPos`, `candidateTargetId`, `candidateRejectReason`, `isValid`).
   - Tự động giải phóng capture và dọn dẹp state ở `onPointerUp` / `onPointerCancel`.
3. **Lớp hiển thị xem trước đường cong SVG (SVG Client-Space Preview Overlay)**:
   - Render lớp SVG xem trước (`data-testid="mindmap-connect-preview-layer"`) trong không gian tọa độ client (Fixed viewport overlay).
   - Đường cong Bézier (`data-testid="mindmap-connect-preview-line"`) bám sát tọa độ con trỏ chuột trong thời gian thực.
   - Thuộc tính `data-valid="true"` (màu chàm Indigo nét liền) khi trỏ vào target hợp lệ; `data-valid="false"` (màu hoa hồng nét đứt) khi trỏ vào target không hợp lệ hoặc đang kéo tự do.
4. **Hit-Testing DOM thời gian thực & Kiểm tra ràng buộc runtime (Target Hit-Testing & Live Validation)**:
   - Sử dụng `document.elementFromPoint(clientX, clientY)?.closest('[data-node-id]')` để định vị ứng viên target dưới con trỏ chuột.
   - Tích hợp `validateCrossLinkMutation` từ `src/lib/mindmapCrossLinks.ts` chặn 3 vi phạm:
     - Tự liên kết chính mình (`CANNOT_LINK_SELF`)
     - Liên kết trùng lặp đã tồn tại (`DUPLICATE_CROSS_LINK`)
     - Liên kết tạo chu trình khép kín kết hợp phân cấp cây (`CYCLE_DETECTED`)
   - Đánh dấu trạng thái trực quan trên thẻ node target bằng `data-connect-accept="true"` hoặc `data-connect-reject="{reason}"`.
5. **Thao tác thả chuột & Tạo liên kết mặc định (Valid Drop & Default 'related' Edge)**:
   - Thả chuột trên target hợp lệ kích hoạt callback `onAddCrossLink` tạo một liên kết chéo mới với `edgeType: "related"`.
   - Thả chuột ra vùng trống, thả lên target không hợp lệ, hoặc hủy giữa chừng sẽ là thao tác no-op (không tạo liên kết, không làm bẩn tài liệu).
6. **Hủy bỏ tức thì qua phím Escape hoặc thả ngoài (Cancellation with Zero History Dirtying)**:
   - Lắng nghe phím `Escape` trên `window` để hủy bỏ phiên kéo bất kỳ lúc nào, tháo dỡ preview layer ngay lập tức mà không ghi nhận lịch sử.
7. **Tích hợp lịch sử hoàn tác nguyên tử (Atomic History Integration with Undo/Redo)**:
   - Kết nối callback từ Canvas về `MindMapView.tsx`, gọi `applyMutation(currentTree, nextLinks)` cập nhật `workingDocumentCrossLinks`.
   - Tạo đúng 1 bước lịch sử hoàn tác (Atomic History Event).
   - Phím tắt `⌘Z` (Undo) gỡ bỏ liên kết vừa tạo; `⇧⌘Z` (Redo) khôi phục lại liên kết chính xác.
8. **Cô lập cử chỉ triệt để (Gesture Isolation & Non-Interference)**:
   - Kéo từ Connection Handle không kích hoạt pan khung nhìn (`isDragging` của canvas giữ nguyên).
   - Nhấn giữ Shift khi bắt đầu từ handle không kích hoạt Marquee selection.
   - Cử chỉ HTML5 Drag & Drop reparenting trên thân thẻ node tiếp tục hoạt động độc lập và bình thường.

---

## 3. Bằng Chứng Kiểm Thử & Xác Minh (Verification Evidence)

| Hạng Mục Kiểm Tra | Lệnh Thực Thi | Kết Quả | Chi Tiết Xác Minh |
| :--- | :--- | :--- | :--- |
| **M5b Targeted Suites** | `npx vitest run tests/unit/mindmap-crosslink-drag-connect.test.tsx tests/integration/mindmap-crosslink-drag-history.test.tsx` | **15/15 PASS** | 13 unit tests + 2 integration tests kiểm tra toàn bộ luồng kéo-thả, validation, Escape, và Undo/Redo. |
| **M5a Regression Suites** | `npx vitest run tests/unit/mindmap-crosslink-drawer.test.tsx tests/unit/mindmap-crosslink-history.test.ts tests/integration/mindmap-crosslink-save-workflow.test.tsx` | **13/13 PASS** | Toàn bộ các suite Drawer, prune cascade, và save workflow của M5a được bảo toàn xanh 100%. |
| **Canvas / Viewport Gate** | `npx vitest run tests/unit/mindmap-crosslink-drag-connect.test.tsx tests/integration/mindmap-crosslink-drag-history.test.tsx tests/unit/mindmap-crosslink-drawer.test.tsx tests/unit/mindmap-crosslink-history.test.ts tests/integration/mindmap-crosslink-save-workflow.test.tsx tests/unit/mindmap-canvas-drag-drop.test.tsx tests/unit/mindmap-viewport-zoom.test.tsx tests/unit/mindmap-minimap.test.tsx tests/unit/mindmap-keyboard-nav.test.tsx tests/unit/mindmap-keyboard-authoring.test.tsx tests/unit/mindmap-document-lifecycle-parity.test.tsx` | **99/99 PASS** | 11 file test bao phủ toàn bộ Canvas DnD, Zoom/Pan, Minimap, Keyboard Navigation/Authoring, và Lifecycle Parity đều PASS. |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS (0 errors)** | Không có lỗi kiểu dữ liệu nào trên toàn bộ codebase. |
| **Whitespace Hygiene** | `git show --check HEAD` & `git diff --check` | **PASS (Code 0)** | 0 cảnh báo trailing whitespace hoặc định dạng dư thừa. |

---

## 4. Vấn Đề Đã Biết Ngoài Phạm Vi (Known Pre-Existing Unrelated Issue)

- **Hiện tượng:** 4 test cases (Tests 7, 8, 9, 10) trong `tests/unit/mindmap-multi-selection.test.tsx` báo lỗi khi bấm phím `Delete`/`Backspace` sau khi click node.
- **Xác nhận nguồn gốc:**
  - 16/20 tests trong suite này (bao gồm cử chỉ Pan threshold, Marquee, Backdrop click, Batch collapse/expand) đều **PASS 100%**.
  - 4 tests trên fail do xung đột giữa cơ chế tự động mở Drawer khi click node ở chế độ `saved-document` (triển khai từ Phase M2 tại commit `4795a9e`) và cơ chế chặn phím canvas khi Drawer mở (triển khai từ Phase M3 tại commit `5bfe56a`): khi click node, Drawer mở khiến sự kiện bàn phím Delete trên canvas backdrop bị `if (isDrawerOpen) return;` chặn lại.
  - Phase M5b **hoàn toàn không sửa đổi** logic `isDrawerOpen`, `activeDrawerNodeId`, `handleToggleSelectNode`, hay `onBatchDelete`.
- **Quyết định kỷ luật:** Đánh dấu rõ ràng là **Pre-existing & Unrelated to Phase M5b**. Không can thiệp sửa chữa trong phạm vi đóng phase này theo nguyên tắc Minimal Blast Radius.

---

## 5. Giới Hạn Kỹ Thuật & Hạng Mục Tồn Đọng (Limitations & Follow-up)

1. **Loại liên kết mặc định:** Thao tác kéo-thả trên canvas tạo liên kết mặc định là `related`. Việc chỉnh sửa nâng cao (đổi type sang `prerequisite`, `advanced`, `contradicts`, hoặc gán nhãn `label`) tiếp tục được thực hiện tại Drawer.
2. **Kỷ luật Git:**
   - Commit `ae66568` đã được push thành công lên `origin/main` cùng với Phase M6 (Commit `caa1504`).
   - Tệp session log `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md` tiếp tục được giữ nguyên trạng thái untracked, không can thiệp.

---

## 6. Khuyến Nghị Hành Động Kế Tiếp (Recommended Next Action)

1. Xem xét lại tổng thể roadmap và backlog của dự án trước khi mở bất kỳ phase mới nào.
2. Không tự suy diễn hay đặt tên trước cho phase tiếp theo trong báo cáo đóng này; chờ định hướng và chỉ định chính thức từ Technical Lead / Product Owner.
