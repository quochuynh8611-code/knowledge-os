# Đặc Tả Kỹ Thuật: Milestone M5 — Mind Map Multi-Parent / Cross-Link Editing UI

**Ngày đề xuất:** 2026-10-12\
**Người phụ trách:** Staff Software Engineer kiêm Technical Architect\
**Trạng thái:** 📋 **PROPOSED ONLY (Chờ phê duyệt từ Product Owner / Tech Lead)**\
**Phạm vi:** Mind Map Studio — Chế độ Tài Liệu Đã Lưu (`saved-document` mode)\
**Tài liệu tham chiếu:**
- Báo cáo phân tích hiện trạng: [`docs/planning/M5-observe-orient.md`](../planning/M5-observe-orient.md)
- Kiến trúc working state: [`docs/adr/ADR-M5-001-cross-link-working-state.md`](../adr/ADR-M5-001-cross-link-working-state.md)
- Kiến trúc history & pruning: [`docs/adr/ADR-M5-002-cross-link-history-and-pruning.md`](../adr/ADR-M5-002-cross-link-history-and-pruning.md)
- Schema tài liệu: [`src/types/mindmapDocument.ts`](../../src/types/mindmapDocument.ts)
- Engine lưu trữ: [`src/lib/mindmapDocumentStorage.ts`](../../src/lib/mindmapDocumentStorage.ts)
- Component Canvas: [`src/components/mindmap/MindMapTreeCanvas.tsx`](../../src/components/mindmap/MindMapTreeCanvas.tsx)
- Component Drawer: [`src/components/mindmap/MindMapNodeDrawer.tsx`](../../src/components/mindmap/MindMapNodeDrawer.tsx)
- Component View điều phối: [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx)

---

## 1. Mục Tiêu & Phạm Vi (Objectives & Scope)

### 1.1. Bối cảnh & Vấn đề
Hiện tại, hệ thống sơ đồ tư duy (Mind Map Studio) đã hoàn thiện hiển thị trực quan các đường nối liên kết chéo ([`src/components/mindmap/MindMapCrossLinksLayer.tsx`](../../src/components/mindmap/MindMapCrossLinksLayer.tsx)) và phân loại các cạnh đa phụ huynh DAG (`isMultiParent: true`). Đồng thời, mô hình tài liệu lưu trữ ([`src/types/mindmapDocument.ts:69-75`](../../src/types/mindmapDocument.ts#L69-L75)) đã có trường `crossLinks: MindMapDocumentEdge[]`.

Tuy nhiên, trong quá trình soạn thảo tài liệu ở chế độ `saved-document`:
1. `MindMapView.tsx` (dòng [289-299](../../src/components/mindmap/MindMapView.tsx#L289-L299)) đang lấy `crossEdges` tĩnh trực tiếp từ phiên bản đã lưu trong quá khứ (`activeDocumentVersion?.crossLinks || []`).
2. Người dùng hoàn toàn **chưa có bất kỳ công cụ giao diện (UI affordance) nào** để:
   - Thêm một liên kết chéo mới giữa 2 node bất kỳ.
   - Thay đổi loại quan hệ ngữ nghĩa (`prerequisite`, `related`, `advanced`, `contradicts`) hoặc nhãn (`label`).
   - Gỡ bỏ (xóa) một liên kết chéo hiện có.
3. Khi xóa node trong cây, chưa có cơ chế tự động dọn dẹp các liên kết chéo liên quan (cascade prune), dẫn đến vi phạm ràng buộc toàn vẹn `DANGLING_EDGE_REFERENCE` tại [`src/lib/mindmapDocumentStorage.ts:133-135`](../../src/lib/mindmapDocumentStorage.ts#L133-L135).

### 1.2. Mục tiêu kỹ thuật của Milestone M5
- Xây dựng trải nghiệm biên tập liên kết chéo trực quan, an toàn và dễ tiếp cận (Accessible).
- Tích hợp liền mạch với cơ chế quản lý trạng thái bẩn (`isDirty`), lưu phiên bản bất biến (`appendMindMapVersion`), và cảnh báo chưa lưu (`LeaveGuardDialog`).
- Bảo đảm tính nhất quán của lịch sử Undo/Redo (`⌘Z` / `⇧⌘Z`).
- Giữ vững nguyên tắc **Zero Blast Radius**: Không sửa đổi PostgreSQL database schema, không can thiệp backend API, và khóa chặt trong chế độ `saved-document`.

---

## 2. Các Ràng Buộc Hợp Đồng Kỹ Thuật (Contract Specifications)

### 2.1. Quy tắc Ngữ Nghĩa & Tính Toàn Vẹn Của Liên Kết Chéo (Data Validation Contract)
Một cạnh `MindMapDocumentEdge` hợp lệ phải thỏa mãn các điều kiện tiên quyết sau:
1. **Node tồn tại (Referential Integrity)**: Cả `sourceNodeId` và `targetNodeId` phải tồn tại trong cây phân cấp hiện tại (`workingDocumentTree`).
2. **Cấm vòng lặp đơn (No Self-Loop)**: `sourceNodeId !== targetNodeId`.
3. **Cấm cạnh trùng lặp (No Duplicate Edges)**: Không được phép có hai cạnh cùng cặp `(sourceNodeId, targetNodeId)` và cùng `edgeType`.
4. **Loại liên kết được phép (Allowed Edge Types)**: Phải thuộc tập hợp `LinkType`:
   - `prerequisite` ("Tiên quyết" - Amber/Indigo)
   - `related` ("Liên quan" - Amber)
   - `advanced` ("Nâng cao" - Indigo)
   - `contradicts` ("Đối chiếu" - Rose/Amber)
5. **Độ dài nhãn tùy chọn (Optional Label)**: Tối đa 60 ký tự, tự động cắt tỉa khoảng trắng đầu cuối (`trim`).

### 2.2. Trạng Thái Hoạt Động Runtime (Working Runtime State Contract)
Trong [`src/components/mindmap/MindMapView.tsx`](../../src/components/mindmap/MindMapView.tsx):
- Khai báo state độc lập:
  ```ts
  const [workingDocumentCrossLinks, setWorkingDocumentCrossLinks] = useState<MindMapDocumentEdge[]>([]);
  ```
- **Lifecycle khởi tạo & đồng bộ**:
  - Khi mở tài liệu mới hoặc chuyển version: Nạp `workingDocumentCrossLinks` từ `activeDocumentVersion.crossLinks || []`.
  - Khi chuyển sang chế độ `live-topics`: Reset `workingDocumentCrossLinks` về `[]`.
  - Khi render `projection` trong `saved-document` mode: Map `crossEdges` từ `workingDocumentCrossLinks` thay vì trực tiếp từ `activeDocumentVersion`.
- **Lưu phiên bản (`handleSaveVersion`)**: Truyền `crossLinks: workingDocumentCrossLinks` vào `appendMindMapVersion`.

### 2.3. Tương Tác Giao Diện Người Dùng (UI Affordance Specification)

Đề xuất phân tách giao diện theo 2 cấp độ:

#### Cấp độ 1: Tích hợp vào `MindMapNodeDrawer.tsx` (Drawer-Centric — Đề xuất chính)
Khi người dùng chọn một node trên canvas trong chế độ `saved-document`, Drawer ([`src/components/mindmap/MindMapNodeDrawer.tsx`](../../src/components/mindmap/MindMapNodeDrawer.tsx)) mở rộng thêm khối **"Liên Kết Chéo (Cross-Links)"**:
1. **Danh sách các liên kết liên quan đến node hiện tại**:
   - Hiển thị danh sách các cạnh mà node này là `source` (đi ra) hoặc `target` (đi vào).
   - Mỗi mục hiển thị: Hướng mũi tên (`→` hoặc `←`), tiêu đề node đối tác (`peerTitle`), badge loại quan hệ ngữ nghĩa (`edgeType`), nhãn tùy chọn (`label`).
   - Nút hành động: Nút xóa (`btn-delete-crosslink-<id>`) với icon thùng rác để gỡ bỏ liên kết ngay lập tức.
2. **Form tạo liên kết mới ("+ Thêm liên kết chéo")**:
   - Dropdown chọn node đích: Danh sách tất cả các node trong cây (ngoại trừ chính nó).
   - Dropdown chọn loại liên kết: `prerequisite`, `related`, `advanced`, `contradicts`.
   - Input nhập nhãn tùy chọn (tối đa 60 ký tự).
   - Nút xác nhận: `btn-add-crosslink`.

#### Cấp độ 2: Tương tác nhanh trên Canvas (`MindMapCrossLinksLayer.tsx` — Tùy chọn nâng cao)
- Cho phép hover/click vào nhãn của đường nối liên kết chéo trên canvas để hiển thị popover thông tin và nút xóa nhanh liên kết.
- Giữ nguyên `pointer-events-none` cho toàn bộ phần đường cong SVG, chỉ bật `pointer-events: auto` cho nhãn (`label badge`) để không xung đột với drag-to-pan trên canvas backdrop.

### 2.4. Ràng Buộc Dọn Dẹp Tự Động (Cascade Pruning Contract)
Khi xảy ra thao tác xóa node (qua phím `Delete`, `Backspace`, nút thùng rác trên node card, hoặc xóa hàng loạt qua Marquee selection):
1. Thu thập toàn bộ danh sách ID của node bị xóa cùng toàn bộ cây con bên dưới (`deletedSubtreeIds`).
2. Thực thi hàm dọn dẹp thuần túy:
   ```ts
   export function pruneDanglingCrossLinks(
     crossLinks: MindMapDocumentEdge[],
     deletedNodeIds: Set<string>
   ): MindMapDocumentEdge[] {
     return crossLinks.filter(
       (edge) => !deletedNodeIds.has(edge.sourceNodeId) && !deletedNodeIds.has(edge.targetNodeId)
     );
   }
   ```
3. Cập nhật đồng bộ vào `workingDocumentCrossLinks`.
4. Đảm bảo trước khi gọi `appendMindMapVersion`, danh sách `crossLinks` luôn thỏa mãn 100% kiểm tra `DANGLING_EDGE_REFERENCE`.

---

## 3. Gherkin Acceptance Scenarios

### Feature: Mind Map Cross-Link Editing in Saved Documents

```gherkin
Feature: Cross-Link Editing in Saved Mind Map Documents
  As a knowledge researcher editing a saved mind map document
  I want to create, inspect, and remove cross-links between arbitrary nodes
  So that I can model non-tree multidimensional relationships without corrupting tree hierarchy

  Background:
    Given I am in "saved-document" mode with an active document "doc-tri-hoc"
    And the document tree contains nodes "node-a" (Root), "node-b" (Child 1), and "node-c" (Child 2)
    And "showCrossLinks" toggle is enabled

  Scenario: 1. Add cross-link from drawer
    Given I click on node "node-b" to open the Mind Map Node Drawer
    When I select target node "node-c" from the cross-link target dropdown
    And I select link type "prerequisite"
    And I enter label "Cần hiểu trước"
    And I click the "Thêm liên kết" button
    Then a new cross-link from "node-b" to "node-c" should be added to working state
    And an SVG Bézier curve with label "Cần hiểu trước" should render connecting "node-b" and "node-c"
    And the document dirty indicator "isDirty" should become true

  Scenario: 2. Reject self-link
    Given I click on node "node-b" to open the Mind Map Node Drawer
    When I inspect the cross-link target dropdown
    Then node "node-b" should not be available as a selectable target option
    And if forced, the action should be rejected with error "CANNOT_LINK_SELF"
    And no self-referential edge should be created

  Scenario: 3. Reject duplicate edge
    Given a cross-link already exists from "node-b" to "node-c" with type "related"
    When I attempt to create another cross-link from "node-b" to "node-c" with type "related"
    Then the action should be rejected with error "DUPLICATE_CROSS_LINK"
    And no duplicate edge should be appended

  Scenario: 4. Reject cycle
    Given the current tree has parent "node-a" and child "node-b"
    When I open the Node Drawer for "node-b" and attempt to add a link to ancestor "node-a"
    Then the action should be rejected under M5a policy with error "CYCLE_DETECTED"
    And no cycle edge should be appended

  Scenario: 5. Remove cross-link from drawer
    Given an existing cross-link "edge-1" links "node-b" to "node-c"
    When I click on node "node-b" to open the Mind Map Node Drawer
    And I click the delete button for "edge-1" in the cross-links list
    Then "edge-1" should be removed from working state
    And the SVG Bézier connector for "edge-1" should disappear from the canvas
    And the document dirty indicator "isDirty" should become true

  Scenario: 6. Delete node and cascade prune connected cross-links
    Given an existing cross-link "edge-1" connects "node-b" to "node-c"
    When I delete node "node-c" from the canvas
    Then node "node-c" should be removed from the tree
    And "edge-1" should be automatically pruned from working cross-links
    And the canvas should only display surviving nodes and valid edges

  Scenario: 7. Undo add cross-link
    Given I have created a new cross-link "edge-2" between "node-a" and "node-c"
    When I press "⌘Z" or "Ctrl+Z" (Undo)
    Then "edge-2" should be removed from the canvas
    And working state cross-links should revert to its previous length

  Scenario: 8. Redo add cross-link
    Given I previously undid the addition of cross-link "edge-2"
    When I press "⇧⌘Z" or "Ctrl+Y" (Redo)
    Then "edge-2" should be restored on the canvas
    And working state cross-links should contain "edge-2"

  Scenario: 9. Undo delete node restores both node and cross-links consistently
    Given an existing cross-link "edge-1" connects "node-b" to "node-c"
    And I delete node "node-c" which cascade-prunes "edge-1"
    When I press "⌘Z" or "Ctrl+Z" (Undo)
    Then node "node-c" should be restored into the tree
    And cross-link "edge-1" should be restored into working cross-links simultaneously

  Scenario: 10. Save persists cross-links into document version
    Given I have added cross-link "edge-new" between "node-a" and "node-b"
    When I click "Lưu phiên bản" and enter a change summary
    Then appendMindMapVersion should be called with "edge-new" in the crossLinks payload
    And the saved document should reload with the persisted cross-link

  Scenario: 11. Save after prune does not trigger dangling-edge validation error
    Given an existing cross-link connected to "node-c" was cascade-pruned upon deleting "node-c"
    When I click "Lưu phiên bản" and enter a change summary
    Then validateDocumentInput should return "{ valid: true }"
    And appendMindMapVersion should succeed without throwing "DANGLING_EDGE_REFERENCE"
```

---

## 4. Ma Trận Kế Hoạch Kiểm Thử (Test Plan Matrix)

| STT | Kịch Bản (Scenario) | Cấp Độ (Test level) | Hiện Trạng Phủ Sóng (Existing coverage) | File Test Mới (New test file) | Kết Quả Ban Đầu Kỳ Vọng (Expected initial result) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Add cross-link from drawer | Unit (Component) | Chưa có (Drawer chỉ hỗ trợ sửa title) | `tests/unit/mindmap-crosslink-drawer.test.tsx` | ❌ FAIL (Thiếu UI form & handler) |
| 2 | Reject self-link | Unit (Component) | Chưa có | `tests/unit/mindmap-crosslink-drawer.test.tsx` | ❌ FAIL (Dropdown chưa lọc self) |
| 3 | Reject duplicate edge | Unit (Component) | Chưa có | `tests/unit/mindmap-crosslink-drawer.test.tsx` | ❌ FAIL (Chưa có validation duplicate) |
| 4 | Reject cycle | Unit (Component) | Chưa có | `tests/unit/mindmap-crosslink-drawer.test.tsx` | ❌ FAIL (Chưa có cycle detector) |
| 5 | Remove cross-link from drawer | Unit (Component) | Chưa có | `tests/unit/mindmap-crosslink-drawer.test.tsx` | ❌ FAIL (Thiếu nút xóa & callback) |
| 6 | Delete node & cascade prune | Unit (Pure Helper) | Chưa có helper prune | `tests/unit/mindmap-crosslink-history.test.ts` | ❌ FAIL (Chưa export `pruneDanglingCrossLinks`) |
| 7 | Undo add cross-link | Unit (History) | History chỉ snapshot tree | `tests/unit/mindmap-crosslink-history.test.ts` | ❌ FAIL (Chưa có composite snapshot) |
| 8 | Redo add cross-link | Unit (History) | History chỉ snapshot tree | `tests/unit/mindmap-crosslink-history.test.ts` | ❌ FAIL (Chưa có composite snapshot) |
| 9 | Undo delete node restores both | Unit (History) | Chưa hỗ trợ | `tests/unit/mindmap-crosslink-history.test.ts` | ❌ FAIL (Chưa restore đồng thời) |
| 10 | Save persists cross-links | Integration | `MindMapView` map tĩnh version cũ | `tests/integration/mindmap-crosslink-save-workflow.test.tsx` | ❌ FAIL (Thiếu working state & save wire) |
| 11 | Save after prune no dangling | Integration | Xóa node chưa prune crossLinks | `tests/integration/mindmap-crosslink-save-workflow.test.tsx` | ❌ FAIL (Bị lỗi `DANGLING_EDGE_REFERENCE`) |

---

## 5. Báo Cáo Failing Tests Đã Tạo (Failing Tests Evidence)

Cả 3 file test mới đã được tạo và thực thi kiểm chứng tính "Test-First" (13/13 tests thất bại đúng như mong đợi):

1. **`tests/unit/mindmap-crosslink-drawer.test.tsx`** (6 failing tests):
   - Không tìm thấy `data-testid="mindmap-crosslinks-section"`.
   - Chưa có các input điều khiển `crosslink-target-select`, `crosslink-type-select`, `crosslink-add-btn`.
2. **`tests/unit/mindmap-crosslink-history.test.ts`** (5 failing tests):
   - `pruneDanglingCrossLinks` chưa được định nghĩa.
   - `createMindMapDocumentHistory` / `pushDocumentHistoryMutation` / `undoDocumentHistory` / `redoDocumentHistory` chưa tồn tại.
3. **`tests/integration/mindmap-crosslink-save-workflow.test.tsx`** (2 failing tests):
   - Luồng lưu phiên bản chưa nhận cross-links mới từ Drawer.
   - Luồng xóa node chưa tự động dọn dẹp cross-links, dẫn đến vi phạm `validateDocumentInput`.

---

## 6. Rào Chắn Ngoài Phạm Vi (Out-of-Scope Guardrails)

Trong suốt quá trình thực thi Phase M5a, tuyệt đối **KHÔNG ĐƯỢC PHÉP** chạm tới hoặc thực hiện các hạng mục sau:
- ❌ **Canvas Drag-to-Connect**: Không thêm event kéo thả tạo edge trực tiếp trên canvas (để lại cho Phase M5b).
- ❌ **Schema & Migration Changes**: Không thay đổi schema PostgreSQL, không tạo file migration, không đổi interface của `MindMapDocumentEdge`.
- ❌ **Refactor Unrelated History Internals**: Không viết lại cấu trúc history của `live-topics` hoặc các canvas drag/drop commands ngoài scope.
- ❌ **Fix Unrelated Failing Tests**: Không tự ý sửa các test fail có sẵn từ các phase trước.
- ❌ **Multi-User Sync**: Không thêm WebSocket hay conflict resolution cho nhiều người biên tập đồng thời.
- ❌ **Auto-Persist**: Không tự động lưu xuống đĩa khi người dùng chưa bấm nút "Lưu phiên bản".

---

## 7. Lộ Trình Triển Khai Tuần Tự (Implementation Roadmap Checklist)

Khi bước vào giai đoạn Implementation (sau khi được duyệt):

- [ ] **1. Pure Validation & Mutation Layer** (`src/lib/mindmapCrossLinks.ts`):
  - [ ] Implement `validateCrossLinkMutation(sourceId, targetId, edgeType, existingEdges, tree)`.
  - [ ] Implement `pruneDanglingCrossLinks(crossLinks, validNodeIds)`.
- [ ] **2. History Composite Snapshot Layer** (`src/lib/mindmapHistory.ts`):
  - [ ] Định nghĩa `MindMapDocumentSnapshot = { tree: MindMapTreeNode; crossLinks: MindMapDocumentEdge[] }`.
  - [ ] Export `createMindMapDocumentHistory`, `pushDocumentHistoryMutation`, `undoDocumentHistory`, `redoDocumentHistory` (hoặc mở rộng `MindMapHistoryState` generic).
- [ ] **3. Node Drawer UI Wiring** (`src/components/mindmap/MindMapNodeDrawer.tsx`):
  - [ ] Thêm props `crossLinks`, `availableNodes`, `onAddCrossLink`, `onRemoveCrossLink`.
  - [ ] Render section `data-testid="mindmap-crosslinks-section"` với badge danh sách liên kết hiện tại.
  - [ ] Form thêm liên kết: Target select (lọc self), type select, label input, nút thêm, thông báo validation error.
- [ ] **4. Studio Runtime State & Save Integration** (`src/components/mindmap/MindMapView.tsx`):
  - [ ] Khai báo state `workingDocumentCrossLinks`.
  - [ ] Đồng bộ state khi mở tài liệu / chuyển version.
  - [ ] Cập nhật `projection.crossEdges` sử dụng `workingDocumentCrossLinks`.
  - [ ] Cập nhật `handleDeleteNode` / `handleDeleteBatchNodes` gọi `pruneDanglingCrossLinks`.
  - [ ] Cập nhật `handleSaveVersion` truyền `workingDocumentCrossLinks` vào `appendMindMapVersion`.
  - [ ] Tích hợp history Undo/Redo cho cả tree và cross-links.
- [ ] **5. Test Execution & Verification**:
  - [ ] Chạy lại 13 test của M5 và chuyển toàn bộ sang **GREEN**.
  - [ ] Chạy regression check trên toàn bộ các test suite liên quan đến mind map.
