# Đặc Tả Kỹ Thuật (Draft Spec): Phase M8 — Multi-Edge Selection & Cross-Link Batch Operations

- **Tác giả:** Staff Software Engineer / Technical Architect
- **Trạng thái:** DRAFT / PENDING APPROVAL
- **Dự án:** Knowledge OS — Mind Map Subsystem
- **Ngày lập:** 2026-10-14

---

## 1. Mục Tiêu Nghiệp Vụ & Bối Cảnh

Sau khi hoàn tất Milestone M7 (M7a inspect & delete, M7b inline type mutation, M7c inline label renaming), người dùng đã có thể tương tác trực tiếp với từng liên kết chéo đơn lẻ trên Canvas. Tuy nhiên, khi đồ thị tri thức phát triển lớn (hàng chục đến hàng trăm liên kết chéo), việc chỉnh sửa từng liên kết một trở nên chậm chạp:
- Người dùng muốn dọn dẹp nhiều liên kết thừa cùng lúc (Batch Delete).
- Người dùng muốn chuyển đổi đồng loạt tính chất quan hệ (ví dụ: chuyển 5 liên kết từ `related` thành `prerequisite`) khi tái cấu trúc đồ thị.

**Mục tiêu Phase M8:**
1. Cung cấp khả năng chọn nhiều liên kết chéo (Multi-Edge Selection) thông qua thao tác giữ phím bổ trợ (`Shift + Click`, `⌘/Ctrl + Click`) trên 16px hit-target của Canvas.
2. Hiển thị thanh công cụ tác vụ hàng loạt chuyên biệt (Floating Cross-Link Batch Action Bar) khi số lượng liên kết được chọn $\ge 2$.
3. Hỗ trợ thao tác xóa hàng loạt (Batch Delete) và đổi loại quan hệ hàng loạt (Batch Type Mutation) với tính toàn vẹn lịch sử hoàn tác nguyên tử (Atomic Undo/Redo) đúng 1 snapshot.
4. Đảm bảo cô lập hoàn toàn với Node Selection, Canvas drag gestures (M5b), và Keyboard isolation (M6).

---

## 2. Mô Hình Trạng Thái & Hợp Đồng Dữ Liệu (State Machine & Contracts)

### 2.1. State Model trên Canvas
Thay vì chỉ lưu `selectedCrossLinkId: string | null`, component quản lý tập hợp cạnh được chọn:
```typescript
selectedCrossLinkIds: Set<string>
```

- **Nguyên tắc bất biến State (Immutable Set Update):** Mọi thao tác thêm, bớt hoặc làm rỗng `selectedCrossLinkIds` **BẮT BUỘC** tạo một instance `new Set(...)` mới nhằm bảo đảm tính phản ứng (reactivity) của React hooks và tránh side-effect biến đổi ngầm (in-place mutation).
- **Khi `selectedCrossLinkIds.size === 0`:**
  - Không có cạnh nào được chọn; visual đường nét hiển thị bình thường.
- **Khi `selectedCrossLinkIds.size === 1`:**
  - Cạnh duy nhất được active; hiển thị floating inspect popover đơn lẻ của Milestone M7 tại trung điểm cạnh.
- **Khi `selectedCrossLinkIds.size >= 2`:**
  - Ẩn inspect popover đơn lẻ (vì tránh vị trí trung điểm mơ hồ và xung đột label/type giữa các cạnh).
  - Hiển thị `CrossLinkBatchActionBar` nổi (floating toolbar) ở vị trí thuận tiện.
  - Tất cả các cạnh trong tập hợp đều được highlight trực quan (`data-edge-selected="true"`, độ dày stroke 3.5px, màu nổi bật).

### 2.2. Giao Thức Chọn Cạnh (Selection Protocol)
| Thao tác người dùng | Trạng thái hiện tại | Kết quả `selectedCrossLinkIds` | Popover / Toolbar |
| :--- | :--- | :--- | :--- |
| **Click thường vào Edge A** | Bất kỳ | `new Set([A])` (Set mới) | Mở single inspect popover tại Edge A |
| **Click thường vào khoảng trống Canvas** | Có cạnh đang chọn | `new Set()` (Rỗng) | Đóng popover / ẩn batch bar |
| **Shift/Cmd/Ctrl + Click vào Edge B** | Đang chọn `[A]` | `new Set([A, B])` (Set mới) | Đóng popover M7, mở Batch Action Bar |
| **Shift/Cmd/Ctrl + Click vào Edge A** (đã chọn) | Đang chọn `[A, B]` | `new Set([B])` (Set mới) | Mở lại popover M7 tại Edge B |
| **Phím `Escape`** | Đang chọn $\ge 1$ cạnh | `new Set()` (Rỗng) | Hủy chọn toàn bộ cạnh; giữ nguyên node selection |

### 2.4. Hợp Đồng Giao Diện M8b & M8c (Cross-Link Batch Action Bar UI Contract)
Khi `selectedCrossLinkIds.size >= 2`, hệ thống hiển thị thanh công cụ tác vụ hàng loạt chuyên biệt cho liên kết chéo:
- **Container Test ID:** `data-testid="crosslink-batch-action-bar"`
- **Badge số lượng:** `data-testid="crosslink-batch-selection-count"` hiển thị định dạng `Đã chọn N liên kết`
- **Dropdown đổi loại quan hệ hàng loạt (M8c):**
  - Test ID: `data-testid="crosslink-batch-type-select"`
  - Tùy chọn: Placeholder vô hiệu hóa `Đổi loại...`, cùng 4 loại `LinkType` chuẩn: `related` (Liên quan), `prerequisite` (Tiên quyết), `advanced` (Nâng cao), `contradicts` (Đối chiếu).
  - Tương tác: Khi người dùng chọn một `newType`, gọi callback `onBatchUpdateCrossLinkType(edgeIds: string[], newType: LinkType)`.
- **Nút xóa hàng loạt:** `data-testid="btn-crosslink-batch-delete"` kích hoạt `onDeleteCrossLink(selectedIds)` và xóa trắng `selectedCrossLinkIds`
- **Nút bỏ chọn:** `data-testid="btn-crosslink-batch-deselect"` reset `selectedCrossLinkIds` về `new Set()`, bảo toàn `selectedNodeIds`
- **Vertical Stacking Guard (Ngăn ngừa đè chồng UI):**
  - Khi chỉ có cạnh được chọn (`selectedNodeIds.size < 2`): Batch Action Bar neo tại `bottom-6 left-1/2 -translate-x-1/2` (`data-stacked="false"`).
  - Khi đồng thời có node multi-selection (`selectedNodeIds.size >= 2`): Batch Action Bar tự động nâng lên `bottom-20 left-1/2 -translate-x-1/2` (`data-stacked="true"`), bảo đảm hai thanh công cụ xếp tầng trực quan, không che khuất nhau.
  - Sự kiện click chuột trên toolbar có `stopPropagation()` và `pointer-events-auto` để không kích hoạt pan canvas hay marquee selection.

### 2.3. Hợp Đồng Tác Vụ Hàng Loạt (Batch Operations Contract)
1. **Batch Delete Cross-Links (`handleDeleteCrossLinkFromCanvas`):**
   - Lọc bỏ tất cả các cạnh có `id` thuộc `selectedCrossLinkIds` khỏi `workingDocumentCrossLinks`.
   - Gọi `applyMutation(currentTree, nextLinks)` đúng **1 lần duy nhất**.
   - Xóa sạch `selectedCrossLinkIds` (`new Set()`).
   - Hỗ trợ `⌘Z` khôi phục lại toàn bộ danh sách cạnh đã xóa trong đúng 1 bước hoàn tác.
2. **Batch Type Mutation (`handleBatchUpdateCrossLinkType` — Phase M8c):**
   - **Signature Callback:** `onBatchUpdateCrossLinkType: (edgeIds: string[], newType: LinkType) => void` (chỉ nhận mảng `string[]`).
   - **Quy tắc Strict No-Op:** Nếu **tất cả** các cạnh trong `edgeIds` đều đã mang `edgeType === newType`, hàm thoát ngay lập tức (no-op), không gọi `applyMutation`, không thông báo lỗi Toast, và không tạo snapshot lịch sử rác.
   - **Quy tắc All-or-Nothing:**
     - Tạo danh sách cạnh ứng viên tạm thời `candidateCrossLinks`.
     - Xác thực toàn bộ từng cạnh cập nhật: kiểm tra trùng lặp (`DUPLICATE_CROSS_LINK`) và kiểm tra chu trình đồ thị (`CYCLE_DETECTED`).
     - Nếu **bất kỳ cạnh nào** vi phạm, toàn bộ transaction bị **HỦY BỎ (Abort)**:
       - 0 cạnh bị sửa đổi dở dang (Zero Partial Mutation).
       - 0 snapshot lịch sử được tạo (`applyMutation` không được gọi).
       - Hiển thị Toast error cảnh báo người dùng.
       - Bảo toàn nguyên vẹn đồ thị và `selectedCrossLinkIds` (không tự ý bỏ chọn để người dùng sửa đổi hoặc chọn loại khác).
       - `selectedNodeIds` hoàn toàn độc lập, không bị ảnh hưởng.
   - **Commit Nguyên Tử:** Khi tất cả các cạnh cập nhật đều vượt qua validation, gọi `applyMutation(currentTree, candidateCrossLinks)` **tối đa đúng 1 lần duy nhất**, tạo 1 entry duy nhất trong Undo stack.

---

## 3. Kịch Bản Kiểm Thử Gherkin (Test Scenarios)

### Feature: Multi-Edge Selection and Cross-Link Batch Operations

#### Scenario 1: Đơn chọn cạnh hiển thị Popover đơn lẻ (Kế thừa M7)
```gherkin
Given Mind Map canvas đang hiển thị 3 liên kết chéo "edge-1", "edge-2", "edge-3"
When người dùng click chuột thường vào hit-target của "edge-1"
Then "edge-1" có thuộc tính data-edge-selected="true"
And popover inspect đơn lẻ của M7 hiển thị tại trung điểm "edge-1"
And không hiển thị thanh công cụ tác vụ hàng loạt
```

#### Scenario 2: Shift-Click chọn nhiều cạnh chuyển sang chế độ Batch
```gherkin
Given "edge-1" đang được chọn duy nhất
When người dùng giữ phím Shift và click vào hit-target của "edge-2"
Then cả "edge-1" và "edge-2" đều có thuộc tính data-edge-selected="true"
And popover inspect đơn lẻ của M7 tự động đóng
And thanh công cụ tác vụ hàng loạt "mindmap-crosslink-batch-bar" hiển thị
And văn bản hiển thị "Đã chọn 2 liên kết"
```

#### Scenario 3: Toggle bỏ chọn cạnh bằng Cmd/Ctrl-Click
```gherkin
Given đang có 2 cạnh "edge-1" và "edge-2" được chọn
When người dùng giữ phím Meta (Cmd) và click vào "edge-1"
Then "edge-1" bị loại khỏi vùng chọn
And chỉ còn "edge-2" có data-edge-selected="true"
And thanh công cụ tác vụ hàng loạt đóng lại
And popover inspect đơn lẻ của M7 mở lại tại trung điểm "edge-2"
```

#### Scenario 4: Phím tắt Delete/Backspace xóa toàn bộ các cạnh được chọn trong 1 bước hoàn tác
```gherkin
Given đang có 3 cạnh "edge-1", "edge-2", "edge-3" được chọn
When người dùng nhấn phím "Delete" hoặc "Backspace"
Then cả 3 cạnh đều bị xóa khỏi workingDocumentCrossLinks
And chỉ đúng 1 history snapshot được ghi nhận
And khi người dùng nhấn "Cmd+Z" (Undo)
Then cả 3 cạnh "edge-1", "edge-2", "edge-3" đều được khôi phục đồng thời
```

#### Scenario 5: Chuyển đổi loại quan hệ hàng loạt với validation an toàn
```gherkin
Given đang có 2 cạnh "edge-1" (type: related) và "edge-2" (type: related) được chọn
When người dùng chọn chuyển đổi loại quan hệ sang "prerequisite" trên batch bar
Then cả 2 cạnh đều được cập nhật edgeType thành "prerequisite"
And thao tác ghi nhận đúng 1 history snapshot nguyên tử
```

#### Scenario 6: Phím Escape hủy chọn cạnh bảo toàn Node selection
```gherkin
Given người dùng đang chọn 2 node ("node-1", "node-2") và 2 cạnh ("edge-1", "edge-2")
When người dùng nhấn phím "Escape"
Then toàn bộ cạnh được hủy chọn (selectedCrossLinkIds rỗng)
And thanh batch bar của cạnh biến mất
And hai node ("node-1", "node-2") vẫn duy trì trạng thái được chọn
```
