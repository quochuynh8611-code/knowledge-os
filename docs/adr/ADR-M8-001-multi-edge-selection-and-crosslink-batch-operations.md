# ADR-M8-001: Multi-Edge Selection & Cross-Link Batch Operations Architecture

- **Trạng thái:** Proposed / Pending Approval
- **Ngày lập:** 2026-10-14
- **Phạm vi:** Mind Map Subsystem (`MindMapCrossLinksLayer`, `MindMapTreeCanvas`, `MindMapView`)
- **Tác giả:** Staff Software Engineer / Technical Architect

---

## 1. Bối Cảnh (Context)

Sau khi hoàn tất Milestone M7 (M7a, M7b, M7c), người dùng có thể thao tác với từng cạnh liên kết chéo trên Canvas thông qua floating inspect popover. Tuy nhiên:
1. `selectedCrossLinkId` trong `MindMapTreeCanvas.tsx` và `MindMapCrossLinksLayer.tsx` hiện chỉ là một giá trị đơn lẻ (`string | null`).
2. Khi người dùng cần dọn dẹp hoặc chuyển đổi quan hệ ngữ nghĩa cho nhiều liên kết chéo cùng lúc, việc click từng cạnh mở popover rồi xóa/sửa gây mệt mỏi nhận thức và tạo ra nhiều snapshot lịch sử vụn vặt.
3. Cần thiết kế cơ chế chọn nhiều cạnh (Multi-Edge Selection) và thực thi tác vụ hàng loạt (Batch Operations) đáp ứng tính toàn vẹn của lịch sử hoàn tác (Atomic Undo/Redo) và không xung đột với cơ chế chọn node hàng loạt (Node Multi-Selection M6).

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Quyết định một chiều (One-Way Doors)

#### A. Cấu trúc State Selection: Orthogonal State Isolation & Immutable Set Update
- **Quyết định:** Giữ `selectedCrossLinkIds: Set<string>` tách biệt hoàn toàn với `selectedNodeIds: Set<string>`, và mọi cập nhật state `selectedCrossLinkIds` bắt buộc tuân thủ nguyên tắc bất biến (luôn trả về một `new Set(...)` mới).
- **Lý do (Trade-off):**
  - Tránh gộp chung vào một "UnifiedSelection" trừu tượng phức tạp gây phình to blast radius và nguy cơ hồi quy (regression) các bộ test M6 đã ổn định (20/20 test multi-node selection).
  - Tách bạch rõ ràng hành vi bàn phím: khi có cạnh đang chọn, phím `Delete` ưu tiên xóa cạnh trước; khi không có cạnh chọn, phím `Delete` xóa node. Phím `Escape` xóa cạnh trước mà không xóa node selection.
  - Việc luôn tạo `new Set(...)` đảm bảo React hooks re-render nhất quán và ngăn ngừa các lỗi đột biến trạng thái ngầm (accidental mutation).

#### B. Tính Nguyên Tử Của Lịch Sử, Strict No-Op & Quy Tắc All-or-Nothing (Phase M8c)
- **Quyết định:**
  - **Data Contract:** Tách bạch callback `onBatchUpdateCrossLinkType?: (edgeIds: string[], newType: LinkType) => void` chỉ nhận mảng `string[]` để tránh mập mờ kiểu dữ liệu.
  - **Strict No-Op:** Nếu toàn bộ các cạnh trong `edgeIds` đã có loại trùng với `newType`, thoát ngay lập tức (không gọi `applyMutation`, không tạo history entry, không trigger toast).
  - **Quy tắc All-or-Nothing:** Kiểm tra tính toàn vẹn (chu trình và trùng lặp) trên toàn bộ danh sách cạnh cập nhật. Nếu có bất kỳ cạnh nào vi phạm, toàn bộ thao tác bị hủy bỏ (Abort), không có cạnh nào bị thay đổi dở dang, không tạo snapshot lịch sử, hiển thị Toast cảnh báo, và bảo toàn nguyên vẹn selection/đồ thị.
  - **Commit Tối Đa 1 Lần:** Khi toàn bộ danh sách hợp lệ, `applyMutation` được gọi duy nhất 1 lần để tạo đúng 1 transaction nguyên tử cho Undo/Redo (`⌘Z`).
- **Lý do:** Đảm bảo đồ thị tri thức luôn ở trạng thái nhất quán, lịch sử hoàn tác không bị phân mảnh thành nhiều bước rác, và trải nghiệm người dùng hoàn toàn dự đoán được.

### 2.2. Quyết định hai chiều (Two-Way Doors)

#### A. Bố trí Giao diện Batch Action Bar & Vertical Stacking Guard
- **Quyết định:**
  - Tận dụng pattern Floating Action Bar tương tự như Node Batch Bar, hiển thị nổi ở phía dưới màn hình khi `selectedCrossLinkIds.size >= 2` (`data-testid="crosslink-batch-action-bar"`).
  - Áp dụng **Vertical Stacking Guard**: Khi chỉ chọn cạnh (`selectedNodeIds.size < 2`), thanh neo ở `bottom-6` (`data-stacked="false"`). Khi đồng thời chọn $\ge 2$ nodes (`selectedNodeIds.size >= 2`), thanh tự động dời lên `bottom-20` (`data-stacked="true"`), ngăn chặn che lấp thanh node batch bar.
- **Lý do:** Dễ nhìn, nhất quán về mặt thị giác với Node Batch Bar, tránh overlap va chạm giao diện khi người dùng thao tác đa vùng chọn đồng thời.

#### B. Phím Bổ Trợ (Modifier Keys) Cho Multi-Selection
- **Quyết định:** Hỗ trợ linh hoạt cả `e.shiftKey`, `e.metaKey` (macOS ⌘), và `e.ctrlKey` (Windows/Linux) khi click trên hit-target của cạnh.
- **Lý do:** Thân thiện đa nền tảng và dễ dàng tùy biến mà không ảnh hưởng logic cốt lõi.

---

## 3. Quản Lý Điểm Nhạy Cảm (Sensitivity Points & Defense)

1. **Tránh Xung Đột Giữa Popover M7 và Batch Bar M8:**
   - Khi `selectedCrossLinkIds.size === 1`: hiển thị Popover M7 (đầy đủ rename input, select type, delete button).
   - Khi `selectedCrossLinkIds.size >= 2`: ẩn hoàn toàn Popover M7, chuyển sang hiển thị Batch Action Bar.
2. **Vertical Stacking Guard giữa CrossLink Batch Bar và Node Batch Bar:**
   - Đảm bảo khi cả node batch bar và crosslink batch bar cùng xuất hiện, cả 2 thanh đều nhìn thấy được và bấm được mà không che khuất nhau (`bottom-6` vs `bottom-20`).
3. **Cycle & Duplicate Validation Khi Batch Mutation Type:**
   - Khi chuyển đổi loại quan hệ cho một danh sách cạnh, việc đổi đồng loạt có thể tạo chu trình nếu có cạnh phụ thuộc lẫn nhau.
   - Hàm `validateCrossLinkMutation` cần được áp dụng tuần tự kiểm tra từng cạnh hợp lệ trước khi commit toàn bộ danh sách, bảo đảm tính toàn vẹn của đồ thị tri thức.
4. **M5b Drag-to-Connect Isolation:**
   - Trong quá trình kéo thả tạo liên kết mới (`isConnecting === true`), toàn bộ tương tác chọn cạnh (kể cả Shift-click) đều bị vô hiệu hóa (`pointer-events: none`).

---

## 4. Hệ Quả & Kế Hoạch Triển Khai (Consequences & Phasing)

- **Phase M8a**: Nâng cấp `selectedCrossLinkId` thành `selectedCrossLinkIds: Set<string>` trong `MindMapCrossLinksLayer` và `MindMapTreeCanvas`, hỗ trợ `Shift/Cmd+Click` chọn nhiều cạnh, highlight đồng thời và phím tắt `Delete` xóa hàng loạt.
- **Phase M8b**: Floating Cross-Link Batch Action Bar ở `MindMapView` / `MindMapTreeCanvas` với giao diện đếm số lượng, nút xóa hàng loạt, và nút hủy chọn.
- **Phase M8c**: Hỗ trợ chuyển đổi loại quan hệ hàng loạt (`Batch edgeType mutation`) với kiểm tra an toàn chu trình/trùng lặp.
