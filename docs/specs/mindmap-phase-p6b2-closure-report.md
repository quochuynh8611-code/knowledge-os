# P6b.2 — Selection-Aware View-State Operations & Persistence Hardening
## Closure Report

### 1. Short Closure Note

Phase P6b.2 (Selection-Aware View-State Operations & Persistence Hardening) đã hoàn tất quá trình triển khai minimal implementation và vượt qua toàn bộ bộ kiểm thử tự động (targeted tests, full suite, và TypeScript typecheck). Toàn bộ thay đổi nằm trọn vẹn trong 3 file tracked được phê duyệt trong working tree và chưa được stage/commit. Các ranh giới kiến trúc và file canvas được bảo toàn nguyên vẹn.

---

### 2. Closure Report Details

#### Phase
P6b.2 — Selection-Aware View-State Operations & Persistence Hardening

#### Status
Implementation verified in working tree; not committed.

#### Objective
Củng cố tính toàn vẹn của view-state khi người dùng tương tác multi-selection: bổ sung khả năng Batch Collapse / Batch Expand cho các node đang được chọn; tự động dọn dẹp (sanitize) các stale collapsed ID khi có biến động cấu trúc cây (xóa đơn, xóa hàng loạt, reparent) hoặc trước khi lưu snapshot; và đảm bảo cô lập hoàn toàn ngữ cảnh selection/view-state khi chuyển đổi giữa các topic hoặc giữa live mode và saved document mode.

#### Approved Scope
1. **Batch View-State Operations**:
   - Thêm nút `btn-batch-collapse` và `btn-batch-expand` trên Floating Batch Action Bar (`selectedNodeIds.size >= 2`).
   - Batch Collapse: chỉ collapse các node được chọn có `children.length > 0` (bỏ qua leaf nodes).
   - Batch Expand: expand tất cả các node được chọn đang bị collapse.
   - Thao tác view-state thuần túy: không làm thay đổi `treeData`, không đổi `isDirty`, không can thiệp vào stack undo/redo dữ liệu.
2. **Stale Collapsed-ID Sanitization**:
   - Tự động lọc bỏ các ID không còn tồn tại trên cây khỏi `collapsedNodeIds` ngay sau khi thực hiện: single node delete, batch delete, và reparent.
   - Tự động sanitize `collapsedNodeIds` trước khi ghi vào document mới (`createMindMapDocument`) hoặc snapshot phiên bản mới (`appendMindMapVersion`).
3. **Context Isolation**:
   - Reset `selectedNodeIds = new Set()` khi thay đổi `activeRootTopicId` trong live mode.
   - Reset `selectedNodeIds = new Set()` khi mở saved document, quay về live mode, hoặc đóng/discard document.
   - Khi quay lại live mode, nạp lại đúng `collapsedNodeIds` từ storage tương ứng với active topic.

#### Non-Goals Honored
- [VERIFIED] Không triển khai marquee drag-box selection.
- [VERIFIED] Không triển khai phím tắt bàn phím cho batch collapse/expand trong Phase P6b.2.
- [VERIFIED] Không thay đổi Prisma schema, backend database hay server API.
- [VERIFIED] Không chỉnh sửa engine layout và projection (`src/lib/mindmapProjection.ts`).
- [VERIFIED] Giữ nguyên hoàn toàn `src/components/mindmap/MindMapTreeCanvas.tsx`.

#### Files Changed
Danh sách các file thay đổi trong scope:
1. `src/components/mindmap/MindMapView.tsx` (Logic điều phối selection, view-state batch actions, sanitization, context isolation)
2. `tests/unit/mindmap-multi-selection.test.tsx` (Các bài kiểm thử đơn vị cho multi-selection batch view-state và context isolation)
3. `tests/unit/mindmap-view-state.test.tsx` (Bài kiểm thử cho stale collapsed-ID sanitization khi lưu document/version)
4. `docs/specs/mindmap-phase-p6b2-closure-report.md` (Tài liệu closure report này)

*Ghi chú: Không có file protected boundary nào bị thay đổi.*

#### Implementation Outcomes
- **Batch View-State Controls**: Đã bổ sung 2 nút hành động trên floating bar với `data-testid="btn-batch-collapse"` và `data-testid="btn-batch-expand"`. Đảm bảo leaf nodes không bị collapse vô nghĩa.
- **Sanitization Pipeline**: Tích hợp hàm `collectTreeNodeIds` để tính tập ID hợp lệ tức thì sau mỗi mutation (`handleConfirmDelete`, `handleBatchDelete`, `handleReparentNode`) và trước khi gọi `createMindMapDocument` / `appendMindMapVersion`.
- **Isolation Lifecycle**: Reset selection state triệt để tại các điểm chuyển đổi topic hoặc mode (`activeRootTopicId`, `activeMode`, `handleOpenSavedDocument`, `handleReturnToLiveMode`, `handleConfirmDiscardAndLeave`).

#### Verification Evidence
Tất cả kết quả kiểm thử dưới đây phản ánh phiên bản chạy thực tế trong working tree hiện tại:

1. **Targeted Tests** [VERIFIED]:
   ```bash
   npx vitest run tests/unit/mindmap-multi-selection.test.tsx tests/unit/mindmap-view-state.test.tsx
   ```
   - Kết quả: **2 test files passed (29/29 tests passed)**.
   - Bao gồm toàn bộ 7 test cases mới (Tests 14–20 trong `mindmap-multi-selection.test.tsx` và test lưu snapshot sanitize trong `mindmap-view-state.test.tsx`).

2. **Full Mindmap Suite** [VERIFIED]:
   ```bash
   npx vitest run tests/unit/mindmap-*.test.*
   ```
   - Kết quả: **29 test files passed (352/352 tests passed)**.
   - Xác nhận không có hồi quy nào trên toàn bộ phân hệ Mindmap.

3. **TypeScript Type Check** [VERIFIED]:
   ```bash
   npx tsc --noEmit && echo EXIT:$?
   ```
   - Kết quả: **EXIT:0** (0 type errors, hoàn toàn tương thích kiểu).

4. **Git Status & Working Tree** [VERIFIED]:
   ```bash
   git status --short --branch
   ```
   - Trạng thái nhánh: `## main...origin/main [ahead 40]`
   - Chỉ có đúng 3 tracked files được sửa đổi và 1 file closure report mới tạo trong working tree.

#### Acceptance Criteria Mapping
- **AC-1 (Batch Collapse)**: [VERIFIED] `btn-batch-collapse` hiển thị khi chọn >= 2 nodes; chỉ collapse các non-leaf nodes được chọn; không kích hoạt dirty state.
- **AC-2 (Batch Expand)**: [VERIFIED] `btn-batch-expand` hiển thị khi chọn >= 2 nodes; expand tất cả nodes được chọn; không kích hoạt dirty state.
- **AC-3 (Sanitization on Mutation)**: [VERIFIED] Single delete, batch delete và reparent tự động loại bỏ các node ID đã bị xóa khỏi `collapsedNodeIds`.
- **AC-4 (Sanitization on Persistence)**: [VERIFIED] `createMindMapDocument` và `appendMindMapVersion` nhận payload `collapsedNodeIds` đã được loại bỏ stale IDs.
- **AC-5 (Context Isolation)**: [VERIFIED] Selection bị xóa khi chuyển topic, mở saved document, hoặc thoát saved mode. Quay lại live mode khôi phục đúng collapsed state của topic đang hoạt động.

#### Risk Assessment
- **Phân loại**:
  - [VERIFIED] Toàn bộ 352 automated tests đã xanh, TypeScript typecheck sạch (EXIT:0).
  - [INFERRED] Luồng đồng bộ view-state giữa storage và memory hoạt động ổn định trên các luồng người dùng tiêu chuẩn.
  - [OPEN / NOT VERIFIED] Chưa thực hiện additional exploratory QA thủ công trên UI thực tế trong phiên làm việc hiện tại (dựa hoàn toàn trên automated tests đã được xác minh).
- **Rủi ro hồi quy**: Thấp, do các thay đổi tập trung vào component `MindMapView.tsx` mà không can thiệp vào canvas rendering pipeline hay schema.

#### Rollback Strategy
Khả năng rollback được đảm bảo:
- Vì toàn bộ thay đổi cho P6b.2 hiện chỉ nằm trong working tree (chưa stage, chưa commit), hệ thống hoàn toàn có thể phục hồi về trạng thái HEAD của P6b.1 (`09982721d26c4c27f547c63123c1041a6ba04db7`) mà không gây ảnh hưởng đến lịch sử git hoặc bất kỳ nhánh nào khác nếu có yêu cầu.

#### Commit Readiness
- Working tree hiện đang chứa đúng 3 modified tracked files trong scope đã duyệt và 1 closure report file vừa tạo.
- Hoàn toàn sẵn sàng cho bước staging và commit khi có phê duyệt.

---
Human approval required before committing.
