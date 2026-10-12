# ADR-M5-002: Đồng Bộ Lịch Sử Hoàn Tác/Làm Lại Và Tự Động Thu Dọn Liên Kết Chéo Rác (Cross-Link History Snapshotting & Cascade Pruning)

**Ngày đề xuất:** 2026-10-12\
**Trạng thái:** 📋 **PROPOSED (Chờ xem xét và phê duyệt kiến trúc)**\
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect\
**Phạm vi:**
- Quản lý lịch sử Mind Map: [`src/lib/mindmapHistory.ts`](../../src/lib/mindmapHistory.ts)
- Bộ điều phối giao diện: [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx)
- Ràng buộc hợp đồng lưu trữ: [`src/lib/mindmapDocumentStorage.ts`](../../src/lib/mindmapDocumentStorage.ts)
**Tài liệu liên quan:**
- Báo cáo quan sát: [`docs/planning/M5-observe-orient.md`](../planning/M5-observe-orient.md)
- Đặc tả yêu cầu kỹ thuật: [`docs/specs/m5-cross-link-editing.md`](../specs/m5-cross-link-editing.md)
- Quyết định kiến trúc runtime state: [`docs/adr/ADR-M5-001-cross-link-working-state.md`](ADR-M5-001-cross-link-working-state.md)

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Khi giới thiệu trạng thái làm việc cục bộ `workingDocumentCrossLinks` trong Milestone M5 (theo đề xuất tại [ADR-M5-001](ADR-M5-001-cross-link-working-state.md)), hệ thống xuất hiện hai thách thức cốt lõi liên quan đến tính toàn vẹn dữ liệu:

### Vấn đề 1: Lịch sử Undo / Redo bị phân mảnh (Desynchronized History)
Hiện tại, module [`src/lib/mindmapHistory.ts`](../../src/lib/mindmapHistory.ts) định nghĩa cấu trúc lịch sử hoàn toàn dựa trên cây đơn lẻ:
```ts
// src/lib/mindmapHistory.ts:3-8
export interface MindMapHistoryState {
  past: MindMapTreeNode[];
  present: MindMapTreeNode;
  future: MindMapTreeNode[];
  savedBaseline: MindMapTreeNode | null;
}
```
Và trong [`src/components/mindmap/MindMapView.tsx:711-719`](../../src/components/mindmap/MindMapView.tsx#L711-L719), hàm `applyTreeMutation` chỉ ghi nhận snapshot của `nextTree`:
- Nếu người dùng tạo node B, nối cross-link từ A -> B, sau đó nhấn Undo (Ctrl+Z) xóa node B: Cây quay về trạng thái không có node B, nhưng `workingDocumentCrossLinks` vẫn giữ liên kết A -> B trỏ vào hư không.
- Hoặc nếu người dùng thêm/xóa cross-link độc lập: Thao tác này hoàn toàn nằm ngoài stack Undo/Redo, khiến phím tắt Ctrl+Z không có tác dụng với liên kết chéo.

### Vấn đề 2: Lỗi cạnh rác treo (Dangling Edge References) khi xóa Node
Trong cơ chế lưu trữ tài liệu [`src/lib/mindmapDocumentStorage.ts:130-137`](../../src/lib/mindmapDocumentStorage.ts#L130-L137), hàm `validateDocumentInput` áp đặt quy tắc toàn vẹn nghiêm ngặt:
```ts
for (const edge of versionInput.crossLinks) {
  if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
    return {
      valid: false,
      error: `Invalid cross-link edge ${edge.id}: node reference does not exist in treeData.`,
    };
  }
}
```
Hiện tại, khi người dùng thực hiện xóa node ([`MindMapView.tsx:984-994`](../../src/components/mindmap/MindMapView.tsx#L984-L994)), hàm `deleteNode` và `deleteBatchNodes` chỉ cắt bỏ node trên cấu trúc cây phân cấp `workingDocumentTree`. Nếu node đó đang là nguồn (`sourceNodeId`) hoặc đích (`targetNodeId`) của bất kỳ liên kết chéo nào trong `workingDocumentCrossLinks`, liên kết đó sẽ trở thành "cạnh rác" (dangling edge). Khi người dùng bấm "Lưu phiên bản", hệ thống sẽ trả về lỗi `DANGLING_EDGE_REFERENCE` và từ chối lưu, khiến người dùng bị kẹt trong trạng thái dirty mà không thể lưu tài liệu.

---

## 2. Các Phương Án Xem Xét (Considered Alternatives)

### Cho Vấn đề 1: Cấu trúc Snapshot Lịch Sử (History Snapshotting)

#### Phương án 1A (Đề xuất): Mở rộng Snapshot Hợp Nhất (Composite Snapshot State)
- **Thiết kế**: Định nghĩa kiểu dữ liệu snapshot bao gồm cả cây và danh sách liên kết chéo:
  ```ts
  export interface MindMapDocumentSnapshot {
    tree: MindMapTreeNode;
    crossLinks: MindMapDocumentEdge[];
  }
  ```
  Nâng cấp `MindMapHistoryState<T = MindMapTreeNode>` thành generic hoặc tạo `MindMapDocumentHistoryState` với payload là `MindMapDocumentSnapshot`.
- **Ưu điểm**:
  - Giao dịch nguyên tử (Atomic transaction): Một bước Undo/Redo sẽ phục hồi đồng thời cả hình thái cây và toàn bộ liên kết chéo tại đúng thời điểm đó.
  - Không thể xảy ra hiện tượng lệch pha (desynchronization).
  - Phím tắt `Cmd/Ctrl + Z` và `Cmd/Ctrl + Shift + Z` hoạt động tự nhiên, trực quan đối với toàn bộ canvas.
- **Nhược điểm**:
  - Cần điều chỉnh nhẹ helper trong `mindmapHistory.ts`. (Tuy nhiên có thể thiết kế generic với default parameter để tương thích 100% với các test cũ).

#### Phương án 1B: Duy trì hai History Stack riêng biệt (Separate Stacks)
- **Thiết kế**: Tạo `treeHistory` riêng và `crossLinkHistory` riêng.
- **Đánh giá**: ❌ **BÁC BỎ**.
  - Không thể xác định thứ tự thời gian tuyến tính khi người dùng xen kẽ giữa sửa cây và sửa liên kết.
  - Trải nghiệm người dùng (UX) rối loạn khi nhấn Ctrl+Z không biết stack nào sẽ được hoàn tác trước.

---

### Cho Vấn đề 2: Chiến lược Thu dọn Liên kết khi Xóa Node (Cascade Pruning Strategy)

#### Phương án 2A (Đề xuất): Thu dọn Xác định Tức thì (Eager Deterministic Pure Pruner)
- **Thiết kế**: Tạo pure utility helper `pruneDanglingCrossLinks`:
  ```ts
  export function pruneDanglingCrossLinks(
    crossLinks: MindMapDocumentEdge[],
    validNodeIds: Set<string>
  ): {
    prunedCrossLinks: MindMapDocumentEdge[];
    prunedCount: number;
  };
  ```
- **Thời điểm kích hoạt**: Ngay trong luồng xử lý xóa node (`handleDeleteNode`, `handleDeleteBatch` hoặc trong `applyTreeMutation` khi tập node thu hẹp):
  1. Thu thập toàn bộ node ID hợp lệ còn lại sau khi cây bị cắt tỉa.
  2. Lọc bỏ ngay lập tức mọi edge có `sourceNodeId` hoặc `targetNodeId` không nằm trong danh sách hợp lệ.
  3. Cập nhật `workingDocumentCrossLinks` và ghi nhận vào Composite Snapshot.
- **Ưu điểm**:
  - Đảm bảo bất biến (Invariant): Ở bất kỳ thời điểm nào của runtime, `workingDocumentCrossLinks` không bao giờ chứa cạnh rác treo.
  - Loại bỏ hoàn toàn nguy cơ lỗi `DANGLING_EDGE_REFERENCE` khi gọi `appendMindMapVersion`.
  - Dễ dàng kiểm thử độc lập (unit testable) với độ bao phủ 100%.
- **Nhược điểm**:
  - Cần duyệt qua danh sách edge khi xóa node (chi phí $O(E)$ với $E$ thường $< 100$, hoàn toàn tức thì và không ảnh hưởng hiệu năng).

#### Phương án 2B: Thu dọn Trì hoãn khi Bấm Lưu (Lazy Pruning on Save)
- **Thiết kế**: Cho phép runtime tồn tại cạnh rác; chỉ khi bấm nút "Lưu phiên bản" mới tự động lọc bỏ trước khi gọi storage engine.
- **Đánh giá**: ❌ **BÁC BỎ**.
  - Trong lúc làm việc, canvas projection sẽ cố gắng render một liên kết trỏ tới tọa độ của một node không còn tồn tại trên cây, gây ra lỗi render (NaN coordinates / gãy đường cong bezier / crash component).
  - Gây bất ngờ cho người dùng vì liên kết biến mất ngầm lúc lưu thay vì có phản hồi trực quan ngay khi xóa node.

---

## 3. Quyết Định Đề Xuất (Proposed Decision)

1. **Về Lịch Sử Hoàn Tác/Làm Lại**:
   - Áp dụng **Phương án 1A**: Định nghĩa kiểu snapshot hợp nhất `MindMapDocumentSnapshot` bao gồm `{ tree: MindMapTreeNode, crossLinks: MindMapDocumentEdge[] }`.
   - Cung cấp hàm khởi tạo và helper chuyển trạng thái trong `src/lib/mindmapHistory.ts` sao cho giữ trọn vẹn backward compatibility với chế độ `live-topics` và các test hiện tại.
   - Thao tác thêm/xóa cross-link hoặc xóa node kèm cross-link đều được coi là một mutation hợp lệ đẩy snapshot mới vào `past`.

2. **Về Thu Dọn Liên Kết Rác (Cascade Pruning)**:
   - Áp dụng **Phương án 2A**: Xây dựng pure helper `pruneDanglingCrossLinks(crossLinks, validNodeIds)` trong module `src/lib/mindmapCrossLinks.ts`.
   - Bắt buộc gọi `pruneDanglingCrossLinks` mỗi khi có node hoặc nhóm node bị xóa trong `MindMapView.tsx`.
   - Nếu có liên kết bị thu dọn ngầm do xóa node cha/con, hiển thị thông báo toast hỗ trợ (ví dụ: *"Đã xóa 1 nút và thu dọn 2 liên kết chéo liên quan"*).

---

## 4. Phân Tích Hệ Quả & Vùng Ảnh Hưởng (Consequences & Blast Radius)

### Lợi ích (Positive Consequences)
- **Tuyệt đối an toàn dữ liệu**: Hợp đồng lưu trữ `validateDocumentInput` sẽ không bao giờ bị vi phạm bởi cạnh rác treo.
- **Trải nghiệm người dùng mượt mà**: Người dùng có thể an tâm thử nghiệm thêm/xóa liên kết, xóa nhánh cây lớn và hoàn tác mọi lúc với tổ hợp phím `Ctrl+Z` quen thuộc.
- **Kiến trúc phân lớp sạch sẽ**: Logic thu dọn được đóng gói thành pure function độc lập với UI React, hỗ trợ TDD hoàn hảo.

### Rủi ro & Biện pháp giảm thiểu (Risks & Mitigations)
- **Rủi ro ảnh hưởng test cũ của `mindmapHistory.ts`**:
  - *Biện pháp*: Giữ nguyên signature cũ hoặc triển khai theo cơ chế generic `MindMapHistoryState<T = MindMapTreeNode>`. Các test suite cũ kiểm thử cây sẽ không cần phải thay đổi mã nguồn.
- **Rủi ro phục hồi liên kết khi Undo**:
  - Khi người dùng xóa node B (kéo theo xóa link A -> B), sau đó Undo: Cả node B và link A -> B đều được phục hồi nguyên vẹn đúng như mong đợi.

---

## 5. Chiến Lược Kiểm Thử (Verification Strategy)

Khi bước vào giai đoạn implementation sau này, các test case sau phải được viết và vượt qua:

1. **Unit Test Pure Pruner (`tests/unit/mindmap-cross-links-prune.test.ts`)**:
   - `pruneDanglingCrossLinks` giữ nguyên các edge khi cả source và target đều tồn tại trong `validNodeIds`.
   - `pruneDanglingCrossLinks` loại bỏ edge nếu `sourceNodeId` bị xóa.
   - `pruneDanglingCrossLinks` loại bỏ edge nếu `targetNodeId` bị xóa.
   - `pruneDanglingCrossLinks` loại bỏ edge dạng multi-parent DAG khi parent phụ bị xóa.
2. **Unit Test History Snapshotting (`tests/unit/mindmap-history-cross-links.test.ts`)**:
   - Push mutation cross-link -> `canUndo` trả về `true`.
   - Undo -> `workingDocumentCrossLinks` trở về trạng thái rỗng ban đầu.
   - Redo -> `workingDocumentCrossLinks` phục hồi liên kết vừa thêm.
3. **Integration Test Xóa Node & Lưu Phiên Bản (`tests/unit/mindmap-cross-links-cascade-save.test.tsx`)**:
   - Tạo node và liên kết chéo.
   - Xóa node mục tiêu.
   - Bấm "Lưu phiên bản".
   - Khẳng định: `appendMindMapVersion` thành công rực rỡ, không gặp lỗi `DANGLING_EDGE_REFERENCE`.
