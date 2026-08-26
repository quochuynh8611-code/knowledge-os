# Technical Specification: Phase Knowledge Graph & Multi-Hop Hardening

## 1. Executive Summary

Phase **Knowledge Graph & Multi-Hop Hardening** tập trung củng cố toàn diện bộ máy đồ thị tri thức (`src/lib/knowledgeGraph.ts`) và giao diện hiển thị (`src/components/graph/KnowledgeGraph.tsx`).
Dựa trên nền tảng Workstream 5A, phase này giải quyết các rủi ro cấu trúc (chu trình, thứ tự tất định, khử trùng cạnh song song), mở rộng tính phổ quát cho đa lĩnh vực (Dynamic Root Domains thay cho hardcode 2 lĩnh vực), và chuẩn bị sẵn các hợp đồng dữ liệu chuẩn hóa để tích hợp mượt mà với **Reader View** và **Study Analytics**.

---

## 2. Problem Statement & Gaps

1. **Hardcoded Domain Filtering in UI**: Giao diện `KnowledgeGraph.tsx` hiện vẫn giới hạn bộ lọc lĩnh vực ở 2 giá trị `'phat-hoc'` và `'huyen-hoc'`, chưa đồng bộ với hệ thống phân loại danh mục gốc động (Dynamic Root Taxonomy từ Phase 8A/8C).
2. **Non-Deterministic Traversal Order**: Thuật toán BFS `traverseMultiHop` hiện duyệt theo thứ tự mảng chèn tự nhiên (`[...outgoing, ...incoming]`). Khi áp dụng giới hạn `maxNodesLimit`, kết quả có thể thiếu tính tất định nếu không có quy tắc sắp xếp ưu tiên (ví dụ: theo trọng số liên kết `strength` giảm dần, sau đó theo `id` bảng chữ cái).
3. **Parallel Edge & Self-Loop Disambiguation**: Trường hợp giữa hai node có nhiều liên kết ngữ nghĩa khác nhau (hoặc liên kết hai chiều), các cạnh hiển thị đè lên nhau mà chưa có cơ chế nhóm/phân tách trực quan.
4. **Path Explainability (Tree Trace)**: Kết quả `SubgraphResult` hiện trả về danh sách phẳng các `nodes` và `edges` nhưng thiếu thông tin truy vết nguồn gốc (Parent node / hop distance của từng node con), hạn chế khả năng hiển thị cây phả hệ tri thức (Knowledge Tree / Prerequisite DAG).

---

## 3. Core Invariants

1. **Zero Binary Ingestion**: Các node tài liệu (`resource`) tuyệt đối chỉ chứa metadata (`title`, `type`, `filePath`, `url`), không nạp dữ liệu nhị phân vào bộ nhớ đồ thị.
2. **Dangling Edge Purge**: Mọi liên kết trỏ tới node không tồn tại (`targetId` không có trong danh sách topics/notes/resources) bắt buộc bị loại bỏ tự động ngay tại khâu khởi tạo `buildAdjacencyGraph`.
3. **Hard Bounded Traversal**: `maxDepth` luôn được giới hạn chặt trong đoạn $[1, 5]$ và `maxNodesLimit` trong đoạn $[1, 500]$ để ngăn tràn bộ nhớ hoặc treo main thread UI.
4. **Cycle Immunity**: Thuật toán duyệt BFS phát hiện và ghi nhận chu trình (`hasCycles = true`), bảo đảm mỗi node ID chỉ xuất hiện tối đa 1 lần trong mảng kết quả.
5. **Dynamic Domain Extensibility**: Nhận diện lĩnh vực của node (`domain`) phản ánh trực tiếp cấu trúc danh mục gốc (`Category.parentId === null`), hỗ trợ không giới hạn số lượng lĩnh vực mới.

---

## 4. Architectural Decisions & Trade-Offs (ADR Summary)

### ADR-018: Deterministic Priority BFS for Multi-Hop Graph Traversal
- **Bối cảnh**: Khi đồ thị lớn và người dùng đặt `maxNodesLimit`, thứ tự duyệt ảnh hưởng đến các node nào được giữ lại.
- **Quyết định**: Khi mở rộng hàng xóm tại mỗi node, các cạnh kề được sắp xếp tất định:
  1. `strength` giảm dần (5 -> 1)
  2. `type === 'prerequisite'` ưu tiên trước các loại khác
  3. `targetId` theo thứ tự từ điển (A-Z).
- **Hệ quả**: Kết quả traversal hoàn toàn tất định và có thể tái lập trên mọi môi trường.

### ADR-019: Dynamic Domain Cluster Layout
- **Bối cảnh**: Bố cục đồ thị hiện tại hardcode tọa độ cụm `phat-hoc` (-120px) và `huyen-hoc` (+120px).
- **Quyết định**: Tính toán tâm cụm (Cluster Centers) động theo số lượng root domains hiện có ($N$ cụm phân bố đều theo góc $\theta = \frac{2\pi \cdot i}{N}$).
- **Hệ quả**: Hỗ trợ mở rộng không giới hạn các lĩnh vực mới (Triết học, Khoa học, Ngôn ngữ...) mà không vỡ bố cục.

---

## 5. Non-Goals

- Không thay đổi schema cơ sở dữ liệu PostgreSQL / Prisma.
- Không thay đổi cấu trúc Snapshot JSON hay checksum thuật toán.
- Không tích hợp thư viện đồ thị 3D nặng (giữ nguyên SVG canvas 2D tối ưu hiệu năng).
- Không tự ý thay đổi API endpoint backend.

---

## 6. Increment Breakdown

### **Increment 1: Core Engine Hardening & Deterministic Traversal**
- Cập nhật `src/lib/knowledgeGraph.ts`:
  - Thêm sắp xếp tất định trong `traverseMultiHop`.
  - Bổ sung trường truy vết đường đi `hopDistance` và `parentHopId` trong `GraphNodeMetadata` phục vụ giải trình.
  - Bổ sung helper `findShortestPath(graph, startId, endId)`.
  - Gia cố tests trong `tests/unit/knowledge-graph-lib.test.ts`.

### **Increment 2: Dynamic Domain & UI Explorer Polish**
- Cập nhật `src/components/graph/KnowledgeGraph.tsx`:
  - Đồng bộ bộ lọc lĩnh vực động từ `categories` (`getRootCategories`).
  - Phân bổ cụm tọa độ động $N$-domain layout.
  - Cập nhật hiển thị huy hiệu loại liên kết rõ ràng.
  - Gia cố tests trong `tests/unit/knowledge-graph-ui-integration.test.tsx`.

---

## 7. Verification & Acceptance Criteria

1. `npx tsc --noEmit` đạt 0 lỗi typecheck.
2. Tất cả test cases cũ và mới trong `knowledge-graph-lib.test.ts` và `knowledge-graph-ui-integration.test.tsx` đạt 100% Green.
3. Chuyển đổi giữa các root domains tùy biến trên đồ thị hoạt động mượt mà không crash.
4. Traversal multi-hop trả về kết quả tất định 100% qua các lần gọi liên tiếp.
