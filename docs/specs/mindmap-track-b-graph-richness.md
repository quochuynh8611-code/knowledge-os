# Đặc Tả Kỹ Thuật & ADR: Mind Map Track B — Graph Richness (Phase B1a & B1b)

**Tài liệu đặc tả**: `docs/specs/mindmap-track-b-graph-richness.md`  
**Trạng thái**: APPROVED FOR IMPLEMENTATION  
**Tác giả**: Staff Software Engineer / Technical Architect  
**Phạm vi**: Track B (Graph Richness) — Phase B1a & B1b  

---

## 1. Context & Problem Statement
Mind Map v1 (kèm Track A & Track C) đã thiết lập nền tảng Spanning Tree phân cấp, cơ chế lưu góc nhìn (persisted view state) và tích hợp workflow hoàn chỉnh.
Tuy nhiên, mô hình cây đơn cha hiện tại đã lọc bỏ toàn bộ các cạnh liên kết ngữ nghĩa giữa các nhánh (non-tree cross-edges) và chỉ phát hiện chu trình ở dạng cờ nhị phân `hasCyclesDetected: boolean`.

**Mục tiêu Track B (B1a/B1b)**:
- Làm giàu biểu diễn đồ thị (Graph Richness) bằng cách trích xuất cạnh chéo `crossEdges` và chú giải chu trình `cycleAnnotations` từ `subgraph.edges`.
- Bổ sung lớp phủ SVG (`MindMapCrossLinksLayer`) vẽ đường cong nét đứt nối các node chéo nhánh khi người dùng chủ động bật Toggle `"Hiện liên kết chéo"` trên Toolbar.
- Hiển thị huy hiệu chu trình tĩnh (Acyclic Cycle Badge `↻ {targetAncestorTitle}`) trên các node lá bị ngắt vòng lặp.

---

## 2. Invariants & Safety Constraints
- **Zero Schema Change**: Không thay đổi Prisma schema hoặc database migrations.
- **Zero Backend API Change**: 100% In-memory projection từ `knowledgeGraph.ts`.
- **Zero Heavy Dependency**: Dùng SVG overlay thuần, không cài thêm thư viện dựng đồ thị.
- **Spanning Tree Visual Truth**: Cây DOM đệ quy vẫn là cấu trúc hiển thị cốt lõi, SVG overlay chỉ là lớp trực quan bổ trợ.
- **Collapse-Aware**: Tự động ẩn đường nối nếu một trong hai đầu mút của cạnh nằm trong `collapsedNodeIds`.

---

## 3. Data Contract Specification

### 3.1 Cấu Trúc Cạnh Chéo (`MindMapCrossEdge`)
```typescript
export interface MindMapCrossEdge {
  id: string;
  sourceNodeId: string;
  sourceTitle: string;
  targetNodeId: string;
  targetTitle: string;
  type: SemanticEdgeType;
  strength: number;
  label: string;
  isCycle: boolean;
}
```

### 3.2 Cấu Trúc Chú Giải Chu Trình (`MindMapCycleAnnotation`)
```typescript
export interface MindMapCycleAnnotation {
  nodeId: string;
  targetAncestorId: string;
  targetAncestorTitle: string;
  edgeType: SemanticEdgeType;
  depth: number;
}
```

### 3.3 Quy Tắc Trích Xuất & Sắp Xếp Tất Định (Deterministic Ordering)
1. Cạnh phải nối giữa 2 node cùng thuộc Spanning Tree (`treeNodeMap.has(source)` và `treeNodeMap.has(target)`).
2. Không phải là quan hệ cha-con chính thống (`parentHopId`).
3. Sắp xếp thứ tự ưu tiên:
   - `strength` giảm dần (5 -> 1)
   - `SEMANTIC_EDGE_PRIORITY` giảm dần (`prerequisite (5) > advanced (4) > related (3) > contradicts (2) > structural (1)`)
   - `sourceNodeId` tăng dần (alphabetical)
   - `targetNodeId` tăng dần (alphabetical)
4. **Hard Cap**: Lấy tối đa **15 cạnh chéo** mạnh nhất.

---

## 4. Component Boundaries & Responsibilities

- **`MindMapView.tsx`**:
  - Quản lý state boolean `showCrossLinks` (mặc định `false`).
  - Render nút Toggle `"Hiện liên kết chéo"` trên header toolbar.
  - Truyền `showCrossLinks` và `crossEdges` xuống `MindMapTreeCanvas`.
- **`MindMapTreeCanvas.tsx`**:
  - Gắn thuộc tính `data-node-id={node.id}` trên mỗi thẻ Node card.
  - Render Cycle Loop Badge tĩnh `↻ {targetAncestorTitle}` (nếu có cycle annotation).
  - Nhúng `MindMapCrossLinksLayer` khi `showCrossLinks === true`.
- **`MindMapCrossLinksLayer.tsx`**:
  - Component SVG tuyệt đối với `pointer-events: none`.
  - Đo toạ độ tương đối của các node cards đang hiển thị.
  - Render các thẻ `<path>` nét đứt (`strokeDasharray="4 4"`) nối giữa các node.
  - Bỏ qua các cạnh có node nguồn hoặc node đích nằm trong `collapsedNodeIds`.

---

## 5. UI Contract Cho Cycle Badge
- **Format**: `↻ {targetAncestorTitle}` (fallback sang `↻ {targetAncestorId}` nếu thiếu title).
- **Trạng thái**: Read-only indicator tĩnh, không có click-to-jump trong vòng B1.
- **Styling**: Thẻ pill nhỏ màu amber viền amber, font chữ `text-[9px] font-semibold`.

---

## 6. Deferred Enhancements
- Persistence của `showCrossLinks` vào `localStorage` (hoãn sang B1c).
- Lọc theo loại cạnh (Edge type filtering).
- Interactive hover tooltips trên SVG path.
- Click-to-jump từ Cycle badge.
- Multi-parent DAG layout engine.
