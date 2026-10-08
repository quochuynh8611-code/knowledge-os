# Đặc Tả Kiến Trúc & Lộ Trình Nâng Cấp: Mind Map v1.1 / v1.2 / v2.0
> **Tài liệu đặc tả (Architecture Specification & Meta-Roadmap)**<br>
> **Trạng thái**: COMPLETE & VERIFIED BASELINE (Mind Map v1.0, v1.1, v1.2, v2.0 + Track E — 12 test suites / 145 unit tests passing)<br>
> **Tác giả**: Antigravity AI Scholar / Reasoning Agent<br>
> **Phạm vi**: Định hình kiến trúc tổng thể, ghi nhận trạng thái hoàn tất của v1.x, v2.0 và điều phối lộ trình nâng cấp.<br>
> **Tài liệu đặc tả chi tiết theo từng Track**:<br>
> - [Track A: Persisted View State Implementation Plan](mindmap-track-a-implementation-plan.md) (Status: COMPLETE)<br>
> - [Track B: Graph Richness Specification](mindmap-track-b-graph-richness.md) (Status: COMPLETE)<br>
> - [Track C: Workflow Integration Specification](mindmap-track-c-workflow-integration.md) (Status: COMPLETE)<br>
> - [Track E: Minimap Overview Radar](mindmap-track-e-minimap.md) (Status: COMPLETE)

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

Hệ thống nâng cấp được phân tách thành các Track kỹ thuật độc lập:

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

### Track A — Persisted View State (Trạng Thái Trình Diễn Cục Bộ) — [STATUS: COMPLETE & VERIFIED]
- **Mục tiêu**: Ghi nhớ trạng thái tương tác của người dùng trên từng sơ đồ tư duy mà không cần thay đổi Database.
- **Nội dung kỹ thuật đã hoàn thành**:
  1. **Lưu trữ nút thu gọn (Collapsed Nodes)**: Cho phép người dùng click thu gọn/mở rộng các nhánh cây con; lưu `collapsedNodeIds` vào `localStorage` theo key canonical: `knowledge_os_mindmap_view_state_v1:<topicId>`.
  2. **Lưu cấu hình Layout theo từng Topic**: Ghi nhớ chế độ xem (`tree_horizontal` hoặc `tree_vertical`) trực tiếp bên trong payload của từng `topicId`.
  3. **Auto-prune & Schema Versioning**: Sử dụng tiền tố và schema version `version: 1` (`knowledge_os_mindmap_view_state_v1:<topicId>`) kèm cơ chế try/catch phòng trường hợp storage bị đầy (`QuotaExceededError`) hoặc JSON parse lỗi.
  4. **Verification**: Bao phủ toàn diện bởi `tests/unit/mindmap-storage.test.ts` (14 tests) và `tests/unit/mindmap-view-state.test.tsx` (8 tests).

---

### Track B — Graph Richness (Mở Rộng Đồ Thị & Quan Hệ Thứ Cấp) — [STATUS: COMPLETE & VERIFIED]
- **Mục tiêu**: Hiển thị mối liên kết chéo (Cross-links) và chu trình khép kín (Cycle Annotations) trên sơ đồ tư duy.
- **Nội dung kỹ thuật đã hoàn thành**:
  1. **Cross-Link Extraction & Hard Cap**: Thuật toán trích xuất non-tree cross edges từ `subgraph.edges`, deterministic sorting (`strength -> priority -> ID`), giới hạn tối đa 15 cạnh mạnh nhất.
  2. **SVG Overlay & Collapse-Aware Filtering**: Component `MindMapCrossLinksLayer` render đường cong Bézier nét đứt, tự động ẩn cạnh nếu đầu mút thuộc subtree bị thu gọn.
  3. **Interactive Cross-Link Focus**: Hỗ trợ hover/click highlight persistent focus, làm mờ các cạnh khác, Escape key & backdrop click dismissal, hiển thị relation label badge.
  4. **Cycle Badges & Interactive Navigation**: Hiển thị badge `↻ {targetAncestorTitle}`, click badge chuyển hướng và highlight node tổ tiên mà không làm vỡ Spanning Tree.
  5. **Verification**: Bao phủ bởi 4 test suites (35 tests): `mindmap-crosslinks-projection.test.ts` (4 tests), `mindmap-crosslinks-overlay.test.tsx` (5 tests), `mindmap-crosslinks-interaction.test.tsx` (19 tests), `mindmap-cycle-navigation.test.tsx` (7 tests).

---

### Track C — Workflow Integration (Tích Hợp Luồng Nghiên Cứu Liền Mạch) — [STATUS: COMPLETE & VERIFIED]
- **Mục tiêu**: Biến Mind Map thành điểm tựa thị giác trong mọi luồng học tập và nghiên cứu trên toàn hệ thống Knowledge OS.
- **Nội dung kỹ thuật đã hoàn thành**:
  1. **Track C.1 (Deep-Link từ Topic Detail)**: Bổ sung nút CTA `"Sơ đồ"` (`btn-view-mindmap`) trên thanh công cụ `TopicDetail.tsx`, kích hoạt `openMindMap(topic.id)` và đồng bộ hash URL.
  2. **Track C.2 (Widget Sơ Đồ trên Dashboard Home)**: Hiển thị thẻ tiện ích "Sơ đồ tư duy" tại Khối 5 của `DashboardHome.tsx`, điều hướng O(1) không render canvas nặng.
  3. **Track C.3 (Command Palette `Cmd+K`)**: Lệnh điều hướng `nav-mindmap` trong `useCommandPalette.ts` và hành động nhanh ngữ cảnh `act-open-mindmap` trong `App.tsx`.
  4. **Track C.4 (Safe Fallback State)**: Tự động chọn topic hợp lệ đầu tiên hoặc render empty state nhẹ nhàng.
  5. **Verification**: Bao phủ bởi `tests/unit/mindmap-workflow-integration.test.ts` (13 tests).

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
| **Trạng thái** | **ĐÃ HOÀN TẤT & VERIFIED** trong `mindmapStorage.ts`. |

---

### ADR-Lite B: SVG Cross-Links & Rich Graph Badging

| Tiêu chí | Đánh giá kiến trúc |
| :--- | :--- |
| **Mục tiêu** | Thể hiện đầy đủ bản chất đồ thị đa chiều của tri thức mà không phá vỡ bố cục phân cấp hình cây. |
| **Lợi ích** | Khám phá các mối liên kết ngầm bất ngờ giữa các nhánh nghiên cứu khác nhau; không bỏ sót tri thức. |
| **Trade-off** | Vẽ quá nhiều đường chéo (cross-links) có thể gây rối mắt ("spaghetti effect") nếu đồ thị có mật độ cạnh dày đặc. |
| **Rủi ro** | Tính toán toạ độ SVG Bezier đường nối xuyên tầng có thể giảm hiệu năng nếu không debounce hoặc memoize cẩn thận. |
| **Giải pháp đã áp dụng** | Hard cap 15 cạnh mạnh nhất + Collapse-aware + Interactive highlight & Escape dismissal. |
| **Trạng thái** | **ĐÃ HOÀN TẤT & VERIFIED** trong `mindmapProjection.ts` và `MindMapCrossLinksLayer.tsx`. |

---

### ADR-Lite C: Deep Action Wiring & Global Command Palette

| Tiêu chí | Đánh giá kiến trúc |
| :--- | :--- |
| **Mục tiêu** | Tối ưu thời gian điều hướng từ nghiên cứu chi tiết sang tổng quan sơ đồ tư duy chỉ với 1 click/phím tắt. |
| **Lợi ích** | Giảm số bước thao tác (frictionless); biến Mind Map thành công cụ tư duy tức thời thay vì một tab biệt lập. |
| **Trade-off** | Tăng sự phụ thuộc giữa các module giao diện (TopicDetail -> urlRouting -> MindMapView). |
| **Rủi ro** | Xung đột state điều hướng hash URL nếu không quản lý đồng bộ qua `urlRouting.ts`. |
| **Giải pháp đã áp dụng** | Chuẩn hóa hash routing `#/mindmap?topicId=<id>` và điều phối tập trung qua `NavigationContext.openMindMap()`. |
| **Trạng thái** | **ĐÃ HOÀN TẤT & VERIFIED** trong `TopicDetail.tsx`, `DashboardHome.tsx`, `useCommandPalette.ts`, `App.tsx`. |

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

## 6. Mind Map v2.0 Advanced Feature Suite (Tracks A, B, C, D, E) — [STATUS: COMPLETE & VERIFIED]

Chu kỳ v2.0 mở rộng Mind Map từ mô hình Spanning Tree cơ bản thành một công cụ khám phá đồ thị tri thức tương tác, đa chiều và hỗ trợ xuất bản chuyên nghiệp:

### Track A (v2.0) — Edge-Type Semantic Filter Dropdown
- **Mục tiêu**: Cho phép người dùng lọc trực quan các loại quan hệ chéo trên thanh công cụ sơ đồ tư duy.
- **Nội dung kỹ thuật**:
  1. Hỗ trợ hiển thị và lọc theo các nhóm quan hệ: Tất cả quan hệ, `prerequisite` (tiên quyết), `related` (liên quan), `advanced` (nâng cao), `contradicts` (mâu thuẫn/đối nghịch).
  2. Dropdown UI tích hợp trực tiếp trên toolbar `MindMapView.tsx` với accessibility và state persistence per-topic.
  3. Khi đổi filter, canvas tự động recalculate và chỉ render các cross edges khớp với type đã chọn mà không ảnh hưởng Spanning Tree gốc.
- **Verification**: Bao phủ bởi `tests/unit/mindmap-edge-filter.test.tsx` (6 tests).

---

### Track B (v2.0) — Viewport Zoom, Pan & Fit-to-Viewport
- **Mục tiêu**: Cung cấp trải nghiệm tương tác trực quan mượt mà cho các cây phân cấp kích thước lớn.
- **Nội dung kỹ thuật**:
  1. **Zoom Controls**: Bổ sung bộ điều khiển Zoom In (+), Zoom Out (-), Reset Zoom (1.0x) trong phạm vi an toàn [0.5x, 2.0x].
  2. **Drag Pan**: Cho phép kéo rê (pan) canvas bằng chuột với cursor grabbing, debounce và transition mượt mà.
  3. **Fit to Viewport**: Nút tự động căn chỉnh và scale toàn bộ cây sơ đồ vừa khít khung nhìn hiển thị dựa trên bounding box thực tế.
- **Verification**: Bao phủ bởi `tests/unit/mindmap-viewport-zoom.test.tsx` (12 tests).

---

### Track C (v2.0) — Standalone Canvas Image Export (SVG & PNG)
- **Mục tiêu**: Xuất bản sơ đồ tư duy thành ảnh vector SVG độc lập và ảnh raster PNG độ phân giải cao phục vụ lưu trữ và chia sẻ.
- **Nội dung kỹ thuật**:
  1. **Pure SVG Serializer (`mindmapExport.ts`)**: Render cây phân cấp SVG độc lập có kèm nhúng inline CSS, background, node cards, tree connectors, cross-links layer và marker defs.
  2. **PNG Rasterization (`mindmapExport.ts`)**: Sử dụng HTML Canvas renderer chuyển đổi SVG data URI sang định dạng PNG blob chất lượng cao.
  3. Tích hợp trực tiếp trên thanh công cụ Mind Map với modal tùy chọn xuất bản (Markdown / SVG / PNG).
- **Verification**: Bao phủ bởi `tests/unit/mindmap-svg-export.test.ts` (22 tests bao gồm multi-parent export parity).

---

### Track D (v2.0) — Multi-Parent DAG Cross Edges
- **Mục tiêu**: Phân loại, tạo kiểu thị giác chuyên biệt và đảm bảo tính nhất quán xuất bản (export parity) cho các cạnh đa phụ huynh (multi-parent structural relations) trong đồ thị tri thức DAG.
- **Nội dung kỹ thuật**:
  1. **Phase D2a (Classification)**: Adapter `projectToMindMapTree` trong `mindmapProjection.ts` tự động phát hiện target node có bậc vào (in-degree > 1) và gán cờ `isMultiParent: true` cho structural cross edges tương ứng.
  2. **Phase D3 (Visual Styling)**: `MindMapCrossLinksLayer.tsx` áp dụng bảng màu Indigo (`stroke-indigo-400` / `#6366f1`), marker mũi tên `#multiparent-arrow` và thuộc tính `data-multi-parent="true"` để phân biệt rõ ràng với standard Amber cross-links.
  3. **Phase D4 (Export Parity)**: `mindmapExport.ts` bổ sung marker def `#multiparent-arrow` và styling Indigo đồng bộ trong cả SVG và PNG export, bảo toàn 100% độ trung thực giữa UI view và file xuất bản.
- **Verification**: Bao phủ bởi `tests/unit/mindmap-crosslinks-projection.test.ts` (8 tests), `tests/unit/mindmap-crosslinks-overlay.test.tsx` (9 tests), và `tests/unit/mindmap-svg-export.test.ts` (22 tests).

---

### Track E (v2.0) — Minimap Overview Radar
- **Mục tiêu**: Cung cấp radar thu nhỏ (spatial overview radar) giúp người dùng định vị không gian và điều hướng nhanh trên các cây phân cấp phức tạp.
- **Nội dung kỹ thuật**:
  1. **Phase E1 (Overview Radar MVP)**: Component `MindMapMinimap.tsx` hiển thị micro-radar vector tại góc `bottom-4 left-4`, indicator đồng bộ tỷ lệ thu phóng, click-to-center pan navigation và cô lập sự kiện nền.
  2. **Phase E1d (Drag Viewport Indicator)**: Kéo rê trực tiếp indicator trong radar để pan canvas mượt mà, hỗ trợ pointer capture và bounds clamping.
  3. **Phase E2a (Accessible Mobile Toggle)**: Nút bật/tắt radar trên di động (`sm:hidden`, touch target $40\times 40\text{px}$, `aria-expanded`, `aria-controls`), phím `Escape` đóng panel nổi `mindmap-minimap-panel`.
- **Đặc tả chi tiết**: [mindmap-track-e-minimap.md](mindmap-track-e-minimap.md).
- **Verification**: Bao phủ bởi `tests/unit/mindmap-minimap.test.tsx` (17 tests).

---

## 7. Milestone Status & Implementation Summary

Tổng kết trạng thái thực tế các phiên bản Mind Map:

| Phiên bản | Track bao gồm | Trọng tâm công việc | Trạng thái |
| :---: | :---: | :--- | :---: |
| **v1.0** | **Core Engine** | - In-memory Spanning Tree projection (`mindmapProjection.ts`).<br>- Vector Tree Canvas (`MindMapTreeCanvas.tsx`).<br>- Canonical hash routing `#/mindmap?topicId=...`.<br>- Markdown outline export. | **COMPLETE & VERIFIED** |
| **v1.1** | **Track A + Track C.1** | - LocalStorage caching nút thu gọn (`collapsedNodeIds`) per-topic.<br>- Lưu `layoutMode` per-topic trong `mindmapStorage.ts`.<br>- Nút "Sơ đồ" CTA trong `TopicDetail.tsx`. | **COMPLETE & VERIFIED** |
| **v1.2** | **Track B + Track C.2 + C.3** | - SVG Cross-Links overlay với Bézier curves (`MindMapCrossLinksLayer.tsx`).<br>- Deterministic sort & hard cap 15 edges.<br>- Interactive cycle badge focus navigation.<br>- Dashboard Home entry card & Command Palette `Cmd+K`. | **COMPLETE & VERIFIED** |
| **v2.0** | **Tracks A, B, C, D, E** | - Edge-type semantic filter dropdown.<br>- Viewport zoom, pan, and fit-to-viewport.<br>- Canvas export sang PNG và standalone SVG (kèm multi-parent parity).<br>- Multi-parent DAG classification, styling, and export parity.<br>- Minimap overview radar (desktop radar, drag indicator, mobile toggle). | **COMPLETE & VERIFIED** |
| **v3.0** | **Future Enhancements** | - Full Layered DAG layout engine (Sugiyama).<br>- Real-time collaborative node positioning & editing.<br>- Inline node markdown editing drawer.<br>- Multi-touch gesture optimization for mobile/tablets. | **DEFERRED BACKLOG** |

---

## 8. Implementation Checklist Summary

Trạng thái kiểm thử và nghiệm thu toàn bộ hệ thống Mind Map (12 test suites / 145 unit tests):

- [x] **Core Engine**:
  - [x] `tests/unit/mindmap-projection.test.ts` (10/10 tests pass).
- [x] **v1.x Foundations (Tracks A, B, C)**:
  - [x] `tests/unit/mindmap-storage.test.ts` (14/14 tests pass).
  - [x] `tests/unit/mindmap-view-state.test.tsx` (8/8 tests pass).
  - [x] `tests/unit/mindmap-crosslinks-interaction.test.tsx` (19/19 tests pass).
  - [x] `tests/unit/mindmap-cycle-navigation.test.tsx` (7/7 tests pass).
  - [x] `tests/unit/mindmap-workflow-integration.test.ts` (13/13 tests pass).
- [x] **v2.0 Advanced Suite (Tracks A, B, C, D, E)**:
  - [x] `tests/unit/mindmap-edge-filter.test.tsx` (6/6 tests pass).
  - [x] `tests/unit/mindmap-viewport-zoom.test.tsx` (12/12 tests pass).
  - [x] `tests/unit/mindmap-svg-export.test.ts` (22/22 tests pass).
  - [x] `tests/unit/mindmap-crosslinks-projection.test.ts` (8/8 tests pass).
  - [x] `tests/unit/mindmap-crosslinks-overlay.test.tsx` (9/9 tests pass).
  - [x] `tests/unit/mindmap-minimap.test.tsx` (17/17 tests pass).
- [x] **Quality Gates & Static Analysis**:
  - [x] Toàn bộ **12 test files / 145 unit tests** cho Mind Map đạt 100% pass (`npx vitest run tests/unit/mindmap-*.test.ts*`).
  - [x] `npm run typecheck` (`tsc --noEmit`) đạt 0 lỗi.

---

## 9. Mind Map v3.0 Deferred Backlog (Future Roadmap)

Các hạng mục kiến trúc được bảo lưu cho chu kỳ nâng cấp v3.0:
1. **Full Layered DAG Layout Engine**: Chuyển đổi hoàn toàn sang đồ thị DAG đa phân cấp có thuật toán phân tầng (Sugiyama / Layered layout) để hiển thị trực tiếp các node có nhiều phụ huynh mà không cần phụ thuộc Spanning Tree + Cross-link overlay.
2. **Real-time Collaborative Mindmap**: Hỗ trợ đồng bộ đa người dùng trực tiếp qua WebSocket/CRDT.
3. **Inline Node Markdown Editing Drawer**: Mở drawer chỉnh sửa trực tiếp nội dung ghi chú và tài liệu tham khảo ngay trên canvas.
4. **Touch Gesture Optimization**: Hỗ trợ cảm ứng đa điểm (multi-touch pinch-to-zoom và spread-to-expand) trên thiết bị di động và máy tính bảng.
