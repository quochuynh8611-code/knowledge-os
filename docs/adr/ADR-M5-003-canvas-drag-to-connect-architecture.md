# ADR-M5-003: Kiến Trúc Tương Tác Kéo Thả Trực Tiếp Tạo Liên Kết Chéo Trên Canvas (Canvas Drag-to-Connect Architecture)

**Ngày đề xuất:** 2026-10-12\
**Trạng thái:** 📋 **PROPOSED (Chờ xem xét và phê duyệt kiến trúc)**\
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect\
**Phạm vi:** Canvas Interaction Layer ([`src/components/mindmap/MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx))\
**Tài liệu liên quan:**
- Báo cáo quan sát: [`docs/planning/M5-observe-orient.md`](../planning/M5-observe-orient.md)
- Đặc tả yêu cầu kỹ thuật: [`docs/specs/m5b-canvas-drag-to-connect.md`](../specs/m5b-canvas-drag-to-connect.md)
- Quyết định runtime state M5a: [`docs/adr/ADR-M5-001-cross-link-working-state.md`](ADR-M5-001-cross-link-working-state.md)
- Quyết định composite history M5a: [`docs/adr/ADR-M5-002-cross-link-history-and-pruning.md`](ADR-M5-002-cross-link-history-and-pruning.md)

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Sau khi Milestone M5a cung cấp giải pháp chỉnh sửa liên kết chéo qua **Node Drawer**, người dùng đã có đầy đủ khả năng thêm, xem và xóa liên kết trong chế độ `saved-document`. Tuy nhiên, trải nghiệm người dùng đối với các tác vụ tư duy thị giác (visual thinking) đòi hỏi khả năng **nối dây trực tiếp giữa hai nút trên bảng vẽ (drag-to-connect)** bằng chuột hoặc bút cảm ứng.

Khi tích hợp cử chỉ này vào canvas sơ đồ tư duy hiện tại, kiến trúc phải đối mặt với **5 xung đột tương tác cốt lõi**:
1. **Xung đột với Reparenting Drag**: Thẻ node hiện tại đã có `draggable={true}` phục vụ việc kéo đổi vị trí nhánh cây (HTML5 DnD). Kéo thân node không thể đồng thời vừa là đổi cha con vừa là nối cross-link.
2. **Xung đột với Pan & Marquee**: Vùng trống canvas (backdrop) bắt sự kiện `pointerdown` để kéo cuộn (Pan) và quét chọn (Marquee selection khi giữ phím Shift).
3. **Xung đột biến đổi tọa độ (Zoom & Pan Transform)**: Canvas content space đang chịu CSS transform `translate(pan) scale(zoom)`. Nếu vẽ đường preview line sai mặt phẳng tọa độ, đầu bút vẽ sẽ bị lệch khỏi con trỏ chuột.
4. **Hạn chế của API HTML5 Drag-and-Drop**: HTML5 DnD không cung cấp sự kiện di chuyển con trỏ mượt mà (60fps) và trình duyệt tự ý tạo hình ảnh bóng mờ (ghost drag image), không cho phép vẽ đường cong Bézier thời gian thực.
5. **Rủi ro hồi quy (Regression Risks)**: Bất kỳ thay đổi nào làm suy yếu các phím tắt, thao tác click, chọn nhiều node, hoặc phá vỡ các suite test hiện có đều không thể chấp nhận.

---

## 2. Các Quyết Định Kiến Trúc Đề Xuất (Proposed Decisions)

### Quyết định 1: Điểm Bắt Đầu Tương Tác Qua Cổng Kết Nối Chuyên Biệt (Dedicated Connection Handle)
- **Quyết định**: Không cho phép bắt đầu kéo nối từ thân thẻ node. Thay vào đó, trang bị một **Connection Handle (cổng liên kết dạng nút tròn nhỏ)** ở cạnh phải thẻ node (layout ngang) hoặc cạnh dưới (layout dọc).
- **Lý do**:
  - Giữ vững nguyên tắc **Zero Blast Radius**: Thân thẻ node tiếp tục giữ nguyên 100% cơ chế kéo đổi cây con (Reparenting DnD) và cơ chế click/focus.
  - Phân tách rõ ràng ý định của người dùng: Kéo thân node = Đổi nhánh cây; Kéo cổng kết nối = Nối liên kết chéo.

### Quyết định 2: Sử Dụng Pointer Events API và `setPointerCapture` Thay Vì HTML5 DnD
- **Quyết định**: Quản lý toàn bộ vòng đời cử chỉ `drag-to-connect` bằng Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) kích hoạt trực tiếp từ Connection Handle.
- **Cơ chế sở hữu sự kiện (Event Ownership)**:
  - Khi bắt đầu kéo, Handle chiếm quyền con trỏ bằng `e.currentTarget.setPointerCapture(e.pointerId)`.
  - Mọi sự kiện di chuyển con trỏ tiếp theo đều được gửi trực tiếp đến Handle, ngăn không cho backdrop nhận diện nhầm thành cử chỉ Pan hoặc Marquee.

### Quyết định 3: Mặt Phẳng Vẽ Đường Preview Đặt Tại Backdrop / Client Overlay Space
- **Quyết định**: Vẽ đường cong preview Bézier trong một lớp SVG tạm thời đặt trực tiếp bên trong `backdropRef` (cùng cấp với hộp chọn `marqueeBox`), sử dụng tọa độ Client/Màn hình thuần túy:
  $$\text{startX/Y} = \text{handleElement.getBoundingClientRect()}$$
  $$\text{currentX/Y} = (e.\text{clientX}, e.\text{clientY})$$
- **Lý do**:
  - Không cần chia tọa độ chuột cho `zoom` hay trừ đi `pan` ở mỗi khung hình, loại bỏ triệt để sai số hình học.
  - Sau khi thả chuột và tạo liên kết thành công, đường nối cố định sẽ được chuyển giao cho `MindMapCrossLinksLayer` hiển thị trong Content Space theo đúng kiến trúc M5a.

### Quyết định 4: Cơ Chế Hit-Testing Mục Tiêu Bằng `document.elementFromPoint`
- **Quyết định**: Trong sự kiện `pointermove`, xác định node đích bên dưới con trỏ chuột bằng:
  ```ts
  const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-node-id]");
  const targetId = targetEl?.getAttribute("data-node-id");
  ```
- **Lý do**:
  - Tận dụng cây render DOM thực tế, tự động tương thích với mọi mức độ `zoom` và `pan`.
  - Không cần duy trì bảng đăng ký tọa độ hình học thủ công (Spatial Registry), giữ mã nguồn tinh gọn và không tốn bộ nhớ.

### Quyết định 5: Thẩm Định Thời Gian Thực & Tạo Mặc Định Loại `related` Kèm Drawer Handoff
- **Quyết định**:
  - Trong lúc rê chuột: Gọi `validateCrossLinkMutation` theo thời gian thực để đổi màu đường preview sang xanh (chấp nhận) hoặc đỏ (từ chối do self-link, duplicate, hoặc cycle).
  - Khi thả chuột trúng node hợp lệ: Tạo ngay lập tức một liên kết với `edgeType: "related"`, đẩy snapshot vào history, và hiển thị thông báo Toast với nút mở nhanh Drawer nếu người dùng muốn đổi loại liên kết hoặc nhập nhãn.

---

## 3. Các Phương Án Đã Xem Xét & Lý Do Bác Bỏ (Considered Alternatives)

### Phương án A: Kéo Tự Do Từ Bất Kỳ Điểm Nào Trên Thân Node
- *Mô tả*: Cho phép nhấn chuột vào thân node và giữ phím bổ trợ (ví dụ: `Alt` + Drag) để tạo liên kết.
- *Đánh giá*: ❌ **BÁC BỎ**.
  - Tính trực quan kém (người dùng không thể biết phải giữ phím nào nếu không đọc tài liệu hướng dẫn).
  - Phím `Alt` thường bị xung đột với các cử chỉ của hệ điều hành macOS (nhân bản phần tử, drag window).
  - Tăng nguy cơ kích hoạt nhầm thao tác đổi cha con trong cây (Reparenting).

### Phương án B: Sử Dụng HTML5 Drag-and-Drop Với Custom Ghost Image
- *Mô tả*: Tận dụng sự kiện HTML5 Drag hiện có và truyền payload `application/x-mindmap-crosslink`.
- *Đánh giá*: ❌ **BÁC BỎ**.
  - HTML5 Drag không kích hoạt `mousemove` mượt mà trên canvas.
  - Không thể vẽ đường cong Bézier động nối từ node nguồn tới con trỏ chuột theo thời gian thực.
  - Trình duyệt tự động hiển thị bóng mờ (ghost image) bán trong suốt của thẻ node, gây rối mắt.

### Phương án C: Hiển Thị Modal Bắt Buộc Chọn Loại Liên Kết Ngay Khi Thả Chuột
- *Mô tả*: Khi thả chuột lên node đích, một Modal hoặc Popover hiện lên yêu cầu chọn loại liên kết (`prerequisite`, `related`, v.v.) rồi mới ghi vào dữ liệu.
- *Đánh giá*: ❌ **BÁC BỎ Ở M5b**.
  - Gây gián đoạn trải nghiệm (modal fatigue) khi người dùng muốn vẽ nhanh liên tiếp nhiều liên kết.
  - Thay vào đó, áp dụng mặc định `related` (chiếm 80% trường hợp sử dụng) và cho phép tinh chỉnh qua Drawer là giải pháp cân bằng hoàn hảo giữa tốc độ và tính đầy đủ.

---

## 4. Phân Tích Vùng Ảnh Hưởng & Biện Pháp Kiểm Soát (Blast Radius & Defense)

```text
+--------------------------------------------------------------------------+
|                     KHÔNG BỊ ẢNH HƯỞNG (ZERO IMPACT)                     |
|  - PostgreSQL Database Schema / Backend API                              |
|  - Chế độ Live-Topics (Drag-to-connect chỉ bật ở saved-document)         |
|  - Tree Reparenting DnD (Kéo thân node vẫn dùng HTML5 DnD)                |
|  - Node Drawer UI M5a (Vẫn hoạt động độc lập và giữ vai trò A11y)        |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                     VÙNG CHỊU TÁC ĐỘNG (CONTROLLED SCOPE)                |
|  - src/components/mindmap/MindMapTreeCanvas.tsx                          |
|    + Bổ sung Connection Handle DOM element trong renderNodeCard          |
|    + Bổ sung Pointer capture state machine cho drag-to-connect           |
|    + Bổ sung lớp phủ SVG preview Bézier tạm thời                         |
|  - src/components/mindmap/MindMapView.tsx                                |
|    + Nhận callback onAddCrossLinkFromCanvas (dùng chung luồng M5a)       |
+--------------------------------------------------------------------------+
```

### Biện pháp phòng vệ hình học & sự kiện:
1. **Cô lập Pointer Events**: Handle có `e.stopPropagation()` trên cả `pointerdown`, `mousedown`, `click` để không bao giờ kích hoạt `onClick` của thẻ node hoặc `pointerdown` của Backdrop.
2. **Khả năng phục hồi khi hủy (Fail-Safe Cancellation)**: Bất kỳ sự gián đoạn nào (thả ra ngoài, nhấn `Escape`, mất tiêu điểm `pointercancel`) đều dọn dẹp 100% state tạm mà không để lại rác trên màn hình.
3. **Phù hợp với Undo/Redo**: Kết quả nối được gửi qua hàm `applyMutation` đã có sẵn của M5a, tự động được bảo vệ bởi composite snapshot `{ tree, crossLinks }`.

---

## 5. Chiến Lược Rollback (Rollback Strategy)

Nếu phát hiện lỗi không mong muốn hoặc xung đột trải nghiệm trong quá trình thử nghiệm:
1. **Feature Toggle cấp Component**: Có thể ẩn cổng Connection Handle chỉ bằng một điều kiện kiểm tra (ví dụ: `enableCanvasDragToConnect = false`), đưa canvas trở lại nguyên trạng M5a 100%.
2. **Độc lập luồng dữ liệu**: Do Drag-to-Connect chỉ là một cách thức nhập liệu phụ trợ đẩy dữ liệu vào `workingDocumentCrossLinks`, toàn bộ luồng lưu phiên bản và Drawer không có bất kỳ sự phụ thuộc ngược nào vào cử chỉ kéo thả này.

---

## 6. Các Rủi Ro Tương Lai & Đề Xuất Giám Sát (Follow-Up Risks)

- **Rủi ro hiệu năng Hit-Testing**: Nếu cây có hơn 500 nodes hiển thị đồng thời, việc gọi `document.elementFromPoint` liên tục ở mỗi khung hình 60fps có thể gây sụt giảm khung hình trên các thiết bị cấu hình thấp.
  - *Biện pháp giảm thiểu*: Tích hợp cơ chế throttle (ví dụ: `requestAnimationFrame`) hoặc cache danh sách rect của các node nếu cần thiết ở phase tối ưu hóa.
- **Rủi ro trên màn hình cảm ứng (Touch Devices)**: Cử chỉ chạm và giữ trên màn hình di động có thể kích hoạt cuộn trang hoặc menu ngữ cảnh của trình duyệt.
  - *Biện pháp giảm thiểu*: Gắn CSS `touch-action: none` trực tiếp trên phần tử Connection Handle.

---

*Trạng thái tài liệu: Proposed. Chờ phê duyệt từ Tech Lead / Product Owner trước khi bước vào giai đoạn kiểm thử Test-First.*
