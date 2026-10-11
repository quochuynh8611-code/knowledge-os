# ADR-096 — Phase M3 Keyboard Authoring for Saved Mind Map Documents

**Trạng thái**: Proposed  
**Ngày**: 2026-10-11  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phạm vi**: Mind Map Canvas Keyboard Authoring & Tree Mutation  
**Liên quan**: Phase K2 (A11y Navigation), Phase P7.C (Lifecycle Parity), Phase M1 (Markdown Import), Phase M2 (Inline Node Drawer), Phase G1 (Governance), [mindmap-phase-m3-planning-spec-v1.md](../specs/mindmap-phase-m3-planning-spec-v1.md)  
**Tuyên bố bắt buộc**: `ADR-096 chỉ được chuyển sang Accepted sau khi Human Approval Gate được thông qua.`

---

## 1. Bối cảnh (Context)

Sau khi hoàn tất Phase K2 (Duyệt cây bằng bàn phím), Phase P7.C (Quản lý vòng đời và xuất bản tài liệu mind map đã lưu), Phase M1 (Nhập Markdown ngoài), và Phase M2 (Inline Node Drawer cho phép đổi tiêu đề node), trải nghiệm Mind Map trên `saved-document` mode đã có nền tảng vững chắc:
- `workingDocumentTree` đóng vai trò là single source of truth cho tài liệu đang mở.
- `applyTreeMutation(...)` quản lý việc cập nhật state cây, kích hoạt cờ `isDirty = true` và push snapshot vào `mindmapHistory.ts` phục vụ Undo/Redo.
- `handleSaveVersion(...)` persist cây sang `MindMapDocumentVersion` mới khi người dùng yêu cầu.
- Các hàm thao tác cây thuần túy bất biến (`findNodeById`, `insertChildNode`, `deleteNode`, `renameNodeTitle`) đã được kiểm chứng độc lập trong `mindmapTreeMutations.ts`.

Tuy nhiên, người dùng hiện tại chỉ có thể thay đổi tiêu đề node qua Drawer UI của Phase M2. Việc cấu trúc lại cây tư duy nhanh (tạo node con, tạo node anh em, xóa nhánh) vẫn đòi hỏi thao tác chuột hoặc chưa có phím tắt trực tiếp trên canvas. Để đạt tiêu chuẩn trải nghiệm sơ đồ tư duy thực chiến (speed-of-thought authoring), hệ thống cần một cơ chế thao tác cây trực tiếp bằng bàn phím trên canvas cho các tài liệu đã lưu.

---

## 2. Quyết định (Decision)

Đề xuất triển khai **Keyboard Authoring** trực tiếp trên canvas cho sơ đồ tư duy, tuân thủ các nguyên tắc thiết kế bất biến sau:

1. **Gating theo chế độ (Mode Gating)**:
   - Keyboard Authoring **chỉ được phép hoạt động** trong `activeMode === "saved-document"`.
   - Tuyệt đối **không cho phép tạo hoặc xóa node** trong `live-topic` mode (vốn là hình chiếu ephemeral từ dữ liệu topic/flashcards hệ thống).

2. **Nguồn chân lý nhắm mục tiêu (Focus as Source of Truth)**:
   - Thao tác tạo/xóa cây hoàn toàn dựa trên `focusedNodeId`.
   - Không sử dụng `selectedNodeIds` làm nguồn chân lý cho thao tác create/delete bằng phím.

3. **Ngữ nghĩa phím bấm rõ ràng (Explicit Command Semantics)**:
   - **`Tab` (Create Child)**: Tạo một node con mới với tiêu đề literal `"New node"`, append vào vị trí cuối cùng trong danh sách `children` của node đang focus. Sau khi tạo thành công, focus tự động chuyển sang node mới này.
   - **`Enter` (Create Sibling)**: Chỉ hoạt động khi node đang focus không phải root. Tạo một node anh em mới với tiêu đề literal `"New node"`, chèn ngay sau node hiện tại trong mảng `children` của parent. Sau khi tạo thành công, focus chuyển sang sibling mới.
   - **`Delete` / `Backspace` (Subtree Delete)**: Có cùng ngữ nghĩa. Xóa node đang focus và toàn bộ cây con (subtree) của nó. Không reparent children trong Phase M3. Không hỗ trợ xóa hàng loạt (multi-selection delete).

4. **Bảo vệ Root tuyệt đối (Root Guards)**:
   - Root không thể bị xóa (`Delete` / `Backspace` trên root là no-op).
   - Root không thể tạo sibling (`Enter` trên root là no-op).

5. **Quy tắc điều hướng Focus khi xóa (Fallback Focus Rules)**:
   Khi xóa một node hợp lệ, focus tự động chuyển tiếp theo thứ tự ưu tiên:
   1. Sibling đứng liền trước (preceding sibling).
   2. Sibling đứng liền sau (succeeding sibling).
   3. Parent node.
   4. Nếu không có node nào trong 3 trường hợp trên, giữ focus tại root.

6. **Tiêu đề mặc định (Default Title)**:
   - Sử dụng chuỗi literal cố định `"New node"`. Không thêm timestamp, không sinh số ngẫu nhiên, không thêm logic i18n trong phase này.

7. **Cô lập nhập liệu (Input & Drawer Isolation)**:
   - Nếu Drawer M2 đang mở (`activeDrawerNodeId != null`), toàn bộ keyboard authoring trên canvas bị chặn hoàn toàn để nhường quyền xử lý phím cho Drawer.
   - Nếu sự kiện phím xảy ra bên trong `<input>`, `<textarea>`, `<select>`, `[contenteditable="true"]`, hoặc bất kỳ form control nào, canvas authoring bị vô hiệu hóa.
   - Giữ nguyên vẹn toàn bộ keyboard navigation K2 hiện có cho các phím mũi tên.

---

## 3. Các Phương Án Đã Cân Nhắc (Alternatives Considered)

### Option A — Keyboard Authoring chỉ cho Saved Documents (ĐƯỢC ĐỀ XUẤT)
- **Ưu điểm**:
  - Tách bạch rõ ràng ranh giới dữ liệu: `saved-document` là tài liệu người dùng sở hữu và chỉnh sửa tự do.
  - Tái sử dụng trọn vẹn `workingDocumentTree`, `applyTreeMutation`, `isDirty`, và `handleSaveVersion`.
  - Blast radius được kiểm soát chặt chẽ, không ảnh hưởng tới core learning system hay flashcards.
- **Nhược điểm**: Người dùng không thể tạo/xóa nhánh trên cây `live-topic`.
- **Kết luận**: Chọn Option A vì đảm bảo an toàn tuyệt đối cho kiến trúc dữ liệu và đúng với định vị của Phase M3.

### Option B — Hỗ trợ Keyboard Authoring trên cả hai chế độ (Both Modes)
- **Ưu điểm**: Tạo cảm giác tính năng đồng nhất trên toàn bộ ứng dụng.
- **Nhược điểm**:
  - `live-topic` là cây chiếu động (projected tree) từ topic/flashcards/excerpts. Nếu tạo/xóa node trên `live-topic`, hệ thống buộc phải can thiệp vào database Prisma của topics, cards, và inbox.
  - Phá vỡ kiến trúc một chiều của hệ thống học tập, blast radius cực kỳ lớn và khó kiểm soát.
- **Kết luận**: Bị loại bỏ hoàn toàn.

### Option C — Full In-Place Rich Text Editor ngay trên Canvas Node
- **Ưu điểm**: Trải nghiệm WYSIWYG mượt mà, bấm phím gõ trực tiếp nội dung thay vì dùng title mặc định `"New node"`.
- **Nhược điểm**:
  - Độ phức tạp kỹ thuật rất cao (cần quản lý inline contenteditable trên SVG/Canvas, xử lý composition IME cho tiếng Việt, kiểm soát focus chuyển tiếp).
  - Phase M2 đã cung cấp Drawer để chỉnh sửa chi tiết title. Phase M3 chỉ tập trung vào việc tạo khung sơ đồ nhanh bằng phím.
- **Kết luận**: Bị loại bỏ để tránh over-engineering; giữ quy tắc title mặc định `"New node"`, việc đổi tên chi tiết có thể thực hiện qua Drawer M2.

---

## 4. Hệ Quả (Consequences)

### Tích cực
- Hoàn thiện trải nghiệm "tư duy bằng phím" (speed-of-thought mind mapping) cho người dùng khi xây dựng tài liệu sơ đồ.
- Tận dụng tối đa và củng cố độ tin cậy của các seams nền tảng (`workingDocumentTree`, `mindmapTreeMutations.ts`, `mindmapHistory.ts`).
- Không gây phình to schema dữ liệu hay yêu cầu migration database.

### Tiêu cực / Ràng buộc
- Người dùng sau khi tạo node bằng phím với tiêu đề `"New node"` sẽ cần mở Drawer (Phase M2) hoặc thao tác phụ để đổi tên nếu muốn đặt tiêu đề có ý nghĩa.
- Không thể hoàn tác phục hồi riêng lẻ các node con khi xóa subtree (tuy nhiên có thể Undo toàn bộ thao tác xóa qua Undo/Redo stack).

---

## 5. Invariants Bắt Buộc

1. **State Consistency**: Không bao giờ mutate trực tiếp object tree; mọi thay đổi đều phải qua các hàm thuần túy bất biến trả về bản sao mới của cây.
2. **History Parity**: Mọi mutation hợp lệ đều sinh ra 1 entry trong history stack; no-op actions không được làm bẩn history.
3. **Dirty Synchronization**: `isDirty` luôn phản ánh đúng việc cây có sự sai khác so với phiên bản đã lưu.
4. **Isolated Controls**: Không bao giờ nuốt sự kiện phím của các form controls người dùng đang tương tác.

---

## 6. Đánh Giá Blast Radius & Rủi Ro

| Thành phần | Mức độ rủi ro | Biện pháp kiểm soát rủi ro |
| :--- | :--- | :--- |
| `live-topic` mode | Cao nếu bị rò rỉ mutation | Early return chặn ngay đầu hàm xử lý sự kiện: `if (activeMode !== "saved-document") return;` |
| Navigation K2 | Trung bình (xung đột phím) | Giữ nguyên handler điều hướng mũi tên K2; chỉ can thiệp khi phím là `Tab`, `Enter`, `Delete`, `Backspace`. |
| Inline Drawer M2 | Trung bình (xung đột phím gõ) | Kiểm tra `activeDrawerNodeId != null` và `isInputEvent(event)` để nhường quyền xử lý hoàn toàn cho Drawer. |
| Persistence & Storage | Thấp | Không có auto-save. Mọi mutation chỉ nằm ở memory `workingDocumentTree`. |

---

## 7. Chiến Lược Rollback (Rollback Strategy)

Do thiết kế theo nguyên tắc Two-way Door và hoàn toàn độc lập với database schema:
- Nếu xuất hiện lỗi hồi quy nghiêm trọng trong quá trình sử dụng keyboard authoring, có thể rollback bằng cách revert commit của M3.
- Canvas sẽ ngay lập tức quay về trạng thái K2 thuần điều hướng và M2 thuần Drawer mà không gây hư hại bất kỳ dữ liệu `MindMapDocument` nào đã lưu trước đó.

---

## 8. Human Approval Requirement

- ADR-096 này được lập ở trạng thái **`Proposed`** để phục vụ việc rà soát và đánh giá kiến trúc.
- **Quy định chuyển trạng thái**: `ADR-096 chỉ được chuyển sang Accepted sau khi Human Approval Gate được thông qua.`
