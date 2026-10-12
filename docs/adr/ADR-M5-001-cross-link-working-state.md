# ADR-M5-001: Quản Lý Trạng Thái Runtime Độc Lập Cho Liên Kết Chéo (Cross-Link Working State Architecture)

**Ngày đề xuất:** 2026-10-12\
**Trạng thái:** 📋 **PROPOSED (Chờ xem xét và phê duyệt kiến trúc)**\
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect\
**Phạm vi:** Mind Map Studio Runtime State ([`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx))\
**Tài liệu liên quan:**
- Báo cáo phân tích: [`docs/planning/M5-observe-orient.md`](../planning/M5-observe-orient.md)
- Đặc tả kỹ thuật: [`docs/specs/m5-cross-link-editing.md`](../specs/m5-cross-link-editing.md)
- Schema tài liệu: [`src/types/mindmapDocument.ts`](../../src/types/mindmapDocument.ts)
- Engine lưu trữ: [`src/lib/mindmapDocumentStorage.ts`](../../src/lib/mindmapDocumentStorage.ts)

---

## 1. Ngữ Cảnh & Vấn Đề (Context & Problem Statement)

Trong chế độ tài liệu đã lưu (`saved-document` mode), người dùng tương tác với sơ đồ tư duy trên bộ nhớ tạm (runtime memory) trước khi quyết định bấm "Lưu phiên bản" ([`src/components/mindmap/MindMapView.tsx:1215-1255`](../../src/components/mindmap/MindMapView.tsx#L1215-L1255)).

Hiện tại, đối với cấu trúc cây phân cấp:
- Hệ thống duy trì state `workingDocumentTree: MindMapTreeNode | null` ([`src/components/mindmap/MindMapView.tsx:199`](../../src/components/mindmap/MindMapView.tsx#L199)). Mọi đột biến đổi tên, thêm con, xóa nút đều đi qua hàm `applyTreeMutation` để cập nhật `workingDocumentTree` và kích hoạt cờ `isDirty = true`.

Tuy nhiên, đối với liên kết chéo (`crossLinks`):
- Trong `MindMapView.tsx` (dòng [289-299](../../src/components/mindmap/MindMapView.tsx#L289-L299)), danh sách `crossEdges` truyền xuống canvas đang được map tĩnh trực tiếp từ snapshot đã lưu trong cơ sở dữ liệu/localStorage:
  ```ts
  crossEdges: (activeDocumentVersion?.crossLinks || []).map((edge) => ({ ... }))
  ```
- **Hạn chế nghiêm trọng**: Không có một vùng lưu trữ tạm thời nào (working runtime state) để lưu giữ các liên kết chéo mới thêm hoặc bị xóa trong phiên làm việc hiện tại. Nếu người dùng thêm/xóa liên kết chéo, hoặc hệ thống buộc phải tự động lưu ngay lập tức xuống đĩa (auto-persist) — điều này phá vỡ cơ chế quản lý phiên bản bất biến (immutable versioning) và Leave Guard của dự án — hoặc thay đổi sẽ bị mất khi render lại.

---

## 2. Các Phương Án Xem Xét (Considered Alternatives)

### Phương án 1 (Đề xuất): Trạng Thái Độc Lập `workingDocumentCrossLinks` trong `MindMapView.tsx`
- **Mô tả**: Bổ sung state độc lập `workingDocumentCrossLinks: MindMapDocumentEdge[]` trong `MindMapView.tsx`.
- **Cơ chế hoạt động**:
  1. Khi mở tài liệu hoặc chuyển đổi phiên bản: Khởi tạo `workingDocumentCrossLinks = activeDocumentVersion?.crossLinks || []`.
  2. Khi người dùng thêm hoặc xóa liên kết chéo: Cập nhật `workingDocumentCrossLinks` thông qua các pure mutation helpers và bật `isDirty = true`.
  3. Khi render projection: Lấy `crossEdges` từ `workingDocumentCrossLinks` thay vì từ `activeDocumentVersion`.
  4. Khi lưu phiên bản (`handleSaveVersion`): Truyền `workingDocumentCrossLinks` vào `appendMindMapVersion`.
- **Ưu điểm**:
  - Tách bạch rõ ràng trách nhiệm giữa cấu trúc cây phân cấp (`treeData`) và mạng lưới liên kết phụ trợ (`crossLinks`).
  - Khớp 100% với hợp đồng lưu trữ hiện tại của [`MindMapVersion`](../../src/types/mindmapDocument.ts#L38-L47) (`treeData` và `crossLinks` là 2 trường riêng biệt).
  - Không phá vỡ bất kỳ interface hay test suite nào của `MindMapTreeNode`.
- **Nhược điểm**:
  - Cần cơ chế phối hợp (coordination) để đồng bộ trạng thái khi thực hiện Undo/Redo (được giải quyết chi tiết trong ADR-M5-002).

### Phương án 2: Nhúng Trực Tiếp `crossLinks` Vào Bên Trong `MindMapTreeNode`
- **Mô tả**: Mở rộng interface `MindMapTreeNode` để chứa danh sách `crossLinks` (hoặc nhúng vào từng node).
- **Đánh giá**: ❌ **BÁC BỎ**.
  - Vi phạm nguyên tắc phân tách trách nhiệm giữa Spanning Tree và Graph Edges.
  - Phá vỡ hàng chục unit test và projection adapter hiện có (`mindmapProjection.ts`, `mindmapTreeMutations.ts`).
  - Làm tăng blast radius sang cả chế độ `live-topics`.

### Phương án 3: Lưu Ngay Xuống Ổ Đĩa (Auto-Persist On Every Link Mutation)
- **Mô tả**: Mỗi khi người dùng bấm thêm hoặc gỡ liên kết chéo, hệ thống lập tức gọi `appendMindMapVersion` để lưu đè hoặc tạo version mới.
- **Đánh giá**: ❌ **BÁC BỎ**.
  - Vi phạm quy tắc giới hạn tối đa 5 phiên bản (`MAX_VERSIONS_PER_DOCUMENT = 5` trong [`mindmapDocumentStorage.ts:29`](../../src/lib/mindmapDocumentStorage.ts#L29)). Việc người dùng liên tục thêm bớt liên kết sẽ nhanh chóng làm tràn và đẩy các version quan trọng trước đó ra khỏi bộ nhớ.
  - Phá vỡ tính năng "Hủy thay đổi / Không lưu" khi người dùng vô tình đóng tab hoặc chuyển sang tài liệu khác.

---

## 3. Quyết Định Đề Xuất (Proposed Decision)

1. **Áp dụng Phương án 1**: Xây dựng state runtime độc lập `workingDocumentCrossLinks: MindMapDocumentEdge[]` trong [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx).
2. **Khởi tạo và Reset theo vòng đời tài liệu**:
   - Khi `activeMode === "saved-document"` và nạp `activeDocumentVersion`: Gán `workingDocumentCrossLinks = activeDocumentVersion.crossLinks ? [...activeDocumentVersion.crossLinks] : []`.
   - Khi chuyển về `live-topic`: Gán `workingDocumentCrossLinks = []`.
3. **Cập nhật hàm tính toán Projection**:
   - Sửa dòng [289](../../src/components/mindmap/MindMapView.tsx#L289) để ánh xạ `crossEdges` từ `workingDocumentCrossLinks` trong chế độ `saved-document`.
4. **Tích hợp Dirty State**:
   - Mọi thao tác thêm/xóa/sửa liên kết chéo đều kích hoạt `setIsDirty(true)`.

---

## 4. Hệ Quả & Rủi Ro Dự Kiến (Consequences & Risks)

### Tích cực
- Cho phép người dùng tự do thêm bớt liên kết chéo, quan sát trực tiếp đường nối cập nhật trên canvas mà không làm bẩn dữ liệu lịch sử phiên bản trên ổ đĩa.
- Thao tác lưu phiên bản (`appendMindMapVersion`) nhận đầy đủ dữ liệu mới nhất của cả cây và liên kết chéo.
- Giữ vững kiến trúc Local-First, Zero database schema changes.

### Rủi ro & Điểm cần kiểm soát
- *Rủi ro lệch đồng bộ Undo/Redo*: Nếu người dùng bấm `⌘Z` (Undo), `workingDocumentTree` lùi về trạng thái cũ nhưng `workingDocumentCrossLinks` không lùi tương ứng thì có thể sinh ra cạnh mồ côi trỏ vào node chưa tồn tại ở thời điểm đó. -> Cần áp dụng giải pháp hợp nhất lịch sử tại ADR-M5-002.
- *Rủi ro Dangling Edge khi xóa node*: Cần cascade prune liên kết chéo mỗi khi `workingDocumentTree` bị cắt tỉa node.

---
*Trạng thái tài liệu: Proposed. Chờ phê duyệt trước khi chuyển sang giai đoạn triển khai.*
