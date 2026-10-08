# Đặc Tả Kiến Trúc & Lộ Trình Nâng Cấp: Mind Map v1.1 / v1.2 / v2.0
> **Tài liệu đặc tả (Architecture Specification & Next-Phase Roadmap)**
> **Trạng thái**: Living Architecture Blueprint & Meta-Roadmap
> **Tác giả**: Antigravity AI Scholar / Reasoning Agent
> **Phạm vi**: Định hình kiến trúc tổng thể và điều phối lộ trình nâng cấp các phase tiếp theo.
> **Tài liệu đặc tả chi tiết theo từng Track**:
> - [Track A: Persisted View State Implementation Plan](mindmap-track-a-implementation-plan.md)
> - [Track B: Graph Richness Specification](mindmap-track-b-graph-richness.md)
> - [Track C: Workflow Integration Specification](mindmap-track-c-workflow-integration.md)

---

## 1. Current Baseline (Mind Map v1)

Mind Map v1 đã hoàn tất implementation review và sẵn sàng merge (là baseline kỹ thuật hiện tại của nhánh làm việc) với các chuẩn mực sau:
- **Pure Derived Read-Model**: Tính toán in-memory thông qua adapter `projectToMindMapTree` kế thừa từ `knowledgeGraph.ts` (`buildAdjacencyGraph`, `traverseMultiHop`).
- **Read-Only Tree Canvas**: Vẽ cây phẳng/dọc thuần vector SVG + CSS Tailwind, không kéo dependency canvas nặng bên thứ ba.
- **Canonical URL Routing**: Chuẩn hóa duy nhất định dạng hash `#/mindmap?topicId=<id>&layout=tree_horizontal`.
- **Markdown Outline Export**: Xuất bản cây phân cấp ra định dạng Markdown có kèm link điều hướng an toàn (`#/topics/<id>`) và fallback plain text không sinh broken link.
- **Zero Blast Radius**: Không thay đổi schema Prisma, không thêm backend API, không thêm bảng persisted, không can thiệp offline sync queue.

---

## 2. Readiness Gate & Rollback Policy

### 2.1. Điều Kiện Để Gọi v1 Là Merged Baseline
1. Pull Request của Mind Map v1 được review và merge chính thức vào nhánh `main` (hoặc nhánh tích hợp gốc).
2. Toàn bộ test suite liên quan (`tests/unit/mindmap-projection.test.ts`, `tests/unit/url-routing.test.ts`, `tests/unit/knowledge-graph-lib.test.ts`) cùng quality gate (`tsc --noEmit`, `npm run lint`) đạt 100% pass trên CI/CD.
3. Không tồn tại bất kỳ dirty git state hay uncommitted dependency/schema changes nào ngoài phạm vi v1.

### 2.2. Điều Kiện Được Phép Bắt Đầu v1.1
1. Baseline v1 đã đóng và xác nhận ổn định, không có bug hồi quy (regression) được báo cáo từ người dùng/QA.
2. Bản đặc tả chi tiết [mindmap-track-a-implementation-plan.md](mindmap-track-a-implementation-plan.md) đã được duyệt.
3. Nguyên tắc **Test-First**: Unit test cho storage serializer/deserializer được viết và kiểm thử trước khi nhúng logic vào UI component.

### 2.3. Điều Kiện & Kế Hoạch Rollback (Track A)
- **Kích hoạt Rollback khi**:
  - Gặp lỗi `QuotaExceededError` không được bắt gây crash trắng màn hình ứng dụng.
  - JSON state trong LocalStorage bị corrupt khiến sơ đồ không thể render hoặc rơi vào vòng lặp re-render.
  - Thao tác thu gọn/mở rộng gây giật lag (frame drop > 50ms) trên cây có nhiều hơn 50 nút.
- **Quy trình Rollback**:
  - *Cấp độ 1 (Client recovery)*: Tự động xóa key `knowledge_os_mindmap_view_state_v1:*` và fallback về chế độ Default Expanded thuần In-Memory của v1.
  - *Cấp độ 2 (Code revert)*: Revert commit bổ sung state hook mà không ảnh hưởng đến `mindmapProjection.ts` và router `urlRouting.ts`.

---

## 3. Upgrade Tracks

Hệ thống nâng cấp được phân tách thành 3 Track kỹ thuật độc lập:

```
                      ┌────────────────────────────────────────┐
                      │          Mind Map Baseline v1          │
                      │   (Derived Read-Model & Tree Canvas)   │
                      └───────────────────┬────────────────────┘
                                          │
        ┌─────────────────────────────────┼────────────────────────────────┐
        ▼                                 ▼                                ▼
 ╔══════════════════════╗      ╔══════════════════════╗      ╔══════════════════════╗
 ║       Track A        ║      ║       Track B        ║      ║       Track C        ║
 ║ Persisted View State ║      ║    Graph Richness    ║      ║ Workflow Integration ║
 ║  (Collapse, Layout)  ║      ║ (Cross-links, DAG)   ║      ║ (Topic, CmdK, Home)  ║
 ╚══════════════════════╝      ╚══════════════════════╝      ╚══════════════════════╝
```

---

### Track A — Persisted View State (Trạng Thái Trình Diễn Cục Bộ)
- **Mục tiêu**: Ghi nhớ trạng thái tương tác của người dùng trên từng sơ đồ tư duy mà không cần thay đổi Database.
- **Nội dung kỹ thuật**:
  1. **Lưu trữ nút thu gọn (Collapsed Nodes)**: Cho phép người dùng click thu gọn/mở rộng các nhánh cây con; lưu `Set<string>` (danh sách ID nút bị đóng) vào `localStorage` theo key canonical: `knowledge_os_mindmap_view_state_v1:<topicId>`.
  2. **Lưu cấu hình Layout theo từng Topic**: Ghi nhớ chế độ xem (`tree_horizontal` hoặc `tree_vertical`) trực tiếp bên trong payload của từng `topicId`, giúp mỗi chủ đề giữ nguyên góc nhìn tối ưu mà không xung đột với các chủ đề khác.
  3. **Auto-prune & Schema Versioning**: Sử dụng tiền tố và schema version `version: 1` (`knowledge_os_mindmap_view_state_v1:<topicId>`) kèm cơ chế try/catch phòng trường hợp storage bị đầy (`QuotaExceededError`) hoặc JSON parse lỗi.
  4. **Zoom / Pan Status**: **DEFERRED** hoàn toàn sang Track B / v2.0 (không thuộc phạm vi Track A).
- **Blast Radius**: **Rất thấp (Low)** — Hoàn toàn chạy ở client-side React State / LocalStorage, tự phục hồi về mặc định nếu storage không khả dụng.

---

### Track B — Graph Richness (Mở Rộng Đồ Thị & Quan Hệ Thứ Cấp)
- **Mục tiêu**: Hiển thị mối liên kết chéo (Cross-links) và đa quan hệ cha-con (Multi-parent) trên cùng một sơ đồ tư duy.
- **Nội dung kỹ thuật**:
  1. **Cross-Link Visualization**: Kẻ đường cong nét đứt (SVG dashed bezier curves) nối giữa các nút nằm ở các nhánh khác nhau nhưng có liên kết `related` hoặc `prerequisite` trong Knowledge Graph.
  2. **Explicit Cycle Annotation & Tooltips**: Khi phát hiện cạnh tạo chu trình (cycle), nút lá sẽ hiển thị huy hiệu vòng lặp `[↻ Loop to: Topic X]` kèm tooltip giải thích độ sâu phát hiện.
  3. **Multi-Parent Overlay Toggle**: Chế độ chuyển đổi giữa "Cây đơn cha (Pure Tree)" và "Đồ thị có hướng bán phân cấp (DAG View)".
- **Blast Radius**: **Trung bình (Medium)** — Cần nâng cấp SVG Canvas renderer và mở rộng adapter projection để trả thêm `crossEdges: MindMapCrossEdge[]`.

---

### Track C — Workflow Integration (Tích Hợp Luồng Nghiên Cứu Liền Mạch)
- **Mục tiêu**: Biến Mind Map thành điểm tựa thị giác trong mọi luồng học tập và nghiên cứu trên toàn hệ thống Knowledge OS.
- **Nội dung kỹ thuật**:
  1. **Deep-Link từ Topic Detail**: Bổ sung nút bấm `"Xem Sơ Đồ Tư Duy"` tại thanh công cụ của `TopicDetailModal` và trang chi tiết chủ đề.
  2. **Widget Sơ Đồ Nổi Bật trên Dashboard Home**: Hiển thị thẻ "Sơ đồ tri thức gợi ý hôm nay" hoặc "Gần đây" tại trang chủ.
  3. **Command Palette Integration (`Cmd+K`)**: Thêm bộ lọc hành động `> Mind Map: [Tên chủ đề]` để mở nhanh sơ đồ chỉ bằng phím tắt.
- **Blast Radius**: **Trung bình (Medium)** — Can thiệp vào các component điều hướng hiện có (`TopicDetail.tsx`, `DashboardHome.tsx`, `CommandPalette.tsx`).

---

## 4. ADR-lite (Architecture Decision Records)

### ADR-Lite A: Persisted View State qua LocalStorage

| Tiêu chí | Đánh giá kiến trúc |
| :--- | :--- |
| **Mục tiêu** | Giữ lại trạng thái đóng mở cây của người dùng qua các phiên làm việc mà không cần database mutation. |
| **Lợi ích** | Người dùng xem sơ đồ lớn không bị ngợp; thao tác thu gọn được ghi nhớ mượt mà; chi phí hạ tầng 0 đồng. |
| **Trade-off** | Trạng thái thu gọn không tự động đồng bộ sang thiết bị khác (chỉ lưu trên máy hiện tại). |
| **Rủi ro** | Khi Topic hoặc Note bị xóa khỏi database, danh sách ID lưu trong LocalStorage có thể chứa orphan IDs (khắc phục bằng cách lọc theo `treeNodeMap` khi mount). |
| **Điều kiện để làm (Entry Criteria)** | Khi người dùng bắt đầu có các chủ đề có hơn 20 nút con và muốn thu gọn các nhánh phụ. |
| **Điều kiện chưa nên làm** | Khi dữ liệu người dùng còn rất ít (mỗi chủ đề dưới 5 nút con) hoặc chưa có nhu cầu thu gọn. |

---

### ADR-Lite B: SVG Cross-Links & Rich Graph Badging

| Tiêu chí | Đánh giá kiến trúc |
| :--- | :--- |
| **Mục tiêu** | Thể hiện đầy đủ bản chất đồ thị đa chiều của tri thức mà không phá vỡ bố cục phân cấp hình cây. |
| **Lợi ích** | Khám phá các mối liên kết ngầm bất ngờ giữa các nhánh nghiên cứu khác nhau; không bỏ sót tri thức. |
| **Trade-off** | Vẽ quá nhiều đường chéo (cross-links) có thể gây rối mắt ("spaghetti effect") nếu đồ thị có mật độ cạnh dày đặc. |
| **Rủi ro** | Tính toán toạ độ SVG Bezier đường nối xuyên tầng có thể giảm hiệu năng nếu không debounce hoặc memoize cẩn thận. |
| **Điều kiện để làm (Entry Criteria)** | Khi có cơ chế toggle bật/tắt hiển thị cross-links trên thanh công cụ và mật độ cạnh được giới hạn an toàn. |
| **Điều kiện chưa nên làm** | Không làm khi chưa có giải thuật định tuyến đường cong (path routing) tránh chồng lấn lên text node. |

---

### ADR-Lite C: Deep Action Wiring & Global Command Palette

| Tiêu chí | Đánh giá kiến trúc |
| :--- | :--- |
| **Mục tiêu** | Tối ưu thời gian điều hướng từ nghiên cứu chi tiết sang tổng quan sơ đồ tư duy chỉ với 1 click/phím tắt. |
| **Lợi ích** | Giảm số bước thao tác (frictionless); biến Mind Map thành công cụ tư duy tức thời thay vì một tab biệt lập. |
| **Trade-off** | Tăng sự phụ thuộc giữa các module giao diện (TopicDetail -> urlRouting -> MindMapView). |
| **Rủi ro** | Xung đột state điều hướng hash URL nếu không quản lý đồng bộ qua `urlRouting.ts`. |
| **Điều kiện để làm (Entry Criteria)** | Module `urlRouting.ts` và `CommandPalette.tsx` đã có unit test bao phủ ổn định 100%. |
| **Điều kiện chưa nên làm** | Khi các component nguồn (như TopicDetail) đang trong quá trình refactor lớn. |

---

## 5. Gherkin Acceptance Scenarios

### Feature: Mind Map Persisted View State (Track A)

```gherkin
Feature: Persisted View State in Mind Map
  As a researcher exploring complex knowledge trees
  I want my collapsed branch preferences and layout to be remembered locally
  So that I don't have to re-collapse large branches every time I revisit a topic

  Scenario: Toggling node collapse state stores preference in local storage
    Given I am viewing the mind map for topic "topic-tu-dieu-de"
    And the node "topic-bat-chanh-dao" is currently expanded with 4 children
    When I click the collapse chevron on node "topic-bat-chanh-dao"
    Then the 4 children of "topic-bat-chanh-dao" should be hidden from the canvas
    And the node ID "topic-bat-chanh-dao" should be saved to local storage for "topic-tu-dieu-de"
    When I reload the page or navigate away and return to "#/mindmap?topicId=topic-tu-dieu-de"
    Then the node "topic-bat-chanh-dao" should remain collapsed by default

  Scenario: Graceful degradation when local storage is unavailable or corrupted
    Given local storage is disabled or contains corrupted JSON for "mindmap_view_state"
    When I open the mind map view for topic "topic-tu-dieu-de"
    Then the system should not throw runtime errors
    And all branches up to max depth should render in their default expanded state
```

---

### Feature: Visualizing Cross-Links & Loop Annotations (Track B)

```gherkin
Feature: Mind Map Cross-Links and Loop Annotations
  As a knowledge scholar
  I want to see non-tree semantic links between branches
  So that I understand the multi-dimensional connections without breaking the tree hierarchy

  Scenario: Rendering secondary cross-links across branches
    Given topic "topic-tam-tuong" in branch A is related to "topic-duyen-khoi" in branch B
    When I enable the "Hiển thị liên kết chéo" toggle in the Mind Map toolbar
    Then a dashed curved SVG connector should link "topic-tam-tuong" to "topic-duyen-khoi"
    And hovering the connector should highlight the relation label "[liên quan]"

  Scenario: Cycle edge loop annotation on leaf nodes
    Given a cyclic link exists from "topic-bat-chanh-dao" back to root "topic-tu-dieu-de"
    When the mind map spanning tree is projected
    Then the child node under "topic-bat-chanh-dao" should display an Acyclic Loop Badge "[↻ Tứ Diệu Đế]"
    And clicking the loop badge should smoothly highlight the root node without expanding infinite duplicates
```

---

### Feature: Seamless Navigation & Command Palette Integration (Track C)

```gherkin
Feature: Workflow Integration and Deep Linking
  As a learner reading a topic detail
  I want to jump straight to its mind map representation
  So that I can visualize its context within the wider knowledge domain

  Scenario: Opening Mind Map from Topic Detail Modal
    Given I am viewing the details of topic "topic-tu-dieu-de" in TopicDetailModal
    When I click the action button "🗺️ Xem Sơ Đồ Tư Duy"
    Then the modal should close
    And the application should navigate to "#/mindmap?topicId=topic-tu-dieu-de&layout=tree_horizontal"
    And the Mind Map view should render with "topic-tu-dieu-de" as active root

  Scenario: Launching Mind Map via Global Command Palette
    Given I press "Cmd+K" or "Ctrl+K" anywhere in the app
    When I type "> Sơ đồ Tứ Diệu Đế" and select the result
    Then the app should route directly to the Mind Map for "Tứ Diệu Đế"
```

---

## 6. Merge Recommendation & Rollout Plan

Lộ trình triển khai khuyến nghị theo từng phiên bản release:

| Phiên bản | Track đề xuất | Trọng tâm công việc | Blast Radius | Dự kiến rủi ro |
| :---: | :---: | :--- | :---: | :---: |
| **v1.1** | **Track A + Track C.1** | - LocalStorage caching nút thu gọn (`isCollapsed`).<br>- Nút "Xem Sơ Đồ Tư Duy" trong `TopicDetail`. | **Thấp** | Rất thấp. Hoàn toàn là add-on client-side không ảnh hưởng engine. |
| **v1.2** | **Track C.2 + Track C.3** | - Dashboard Home recent mind maps widget.<br>- Command Palette `Cmd+K` quick action item. | **Thấp - TB** | Thấp. Chỉ nối router vào các menu tìm kiếm đã có. |
| **v2.0** | **Track B** | - Hiển thị Cross-links nét đứt giữa các nhánh.<br>- Thuật toán định tuyến SVG Bezier chống đè chữ.<br>- Nút phóng to/thu nhỏ (Zoom & Pan viewport). | **Trung bình** | Trung bình. Cần tối ưu render SVG trên đồ thị dày đặc. |

---

## 7. Implementation Checklist cho Phase Kế Tiếp (v1.1)

Trạng thái thực tế của Phase v1.1 (Track A + Track C.1):

- [x] **1. Unit Test First & Hardening**:
  - [x] Viết test cho hàm tiện ích `loadMindMapViewState(topicId)` và `saveMindMapViewState(state, validNodeIds)`.
  - [x] Viết test xác nhận fallback an toàn khi LocalStorage trả về `null`, chuỗi JSON hỏng, hoặc ném `QuotaExceededError`.
  - [x] Viết test sanitization và pruning cho `collapsedNodeIds` loại bỏ orphan IDs.
- [x] **2. Component Hardening**:
  - [x] Nút toggle chevron `▶ / ▼` và indicator badge số lượng node con bị ẩn trên từng node tại `MindMapTreeCanvas.tsx`.
  - [x] Đấu nối load/save state `collapsedNodeIds` và `layoutMode` per-topic vào `MindMapView.tsx`.
- [x] **3. Topic Detail CTA**:
  - [x] Bổ sung nút `btn-view-mindmap` (Sơ đồ) trên thanh công cụ `TopicDetail.tsx`.
  - [x] Kích hoạt `navigation.openMindMap(topic.id)` kèm fallback đồng bộ location hash `#/mindmap?topicId=...`.
- [x] **4. Quality Gate Verification**:
  - [x] Chạy vitest bao phủ 100% các file liên quan (17/17 tests pass, 76/76 regression pass).
  - [x] Chạy `npm run typecheck` (`tsc --noEmit`) đạt 0 lỗi.
