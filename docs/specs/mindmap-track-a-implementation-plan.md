# Kế Hoạch Triển Khai Kỹ Thuật: Track A — Mind Map Persisted View State
> **Tài liệu triển khai (Implementation Plan & Engineering Specification)**<br>
> **Trạng thái**: COMPLETE & VERIFIED<br>
> **Tác giả**: Antigravity AI Scholar / Reasoning Agent<br>
> **Phạm vi áp dụng**: Mind Map v1.1 (Track A)  
> **Ràng buộc**: Zero backend API / Zero schema change / Zero new runtime dependencies / Zero modifications to core projection engine.

---

## 1. Scope & Bounded Context (Phạm Vi Công Việc)

Track A giải quyết trải nghiệm người dùng khi khám phá các sơ đồ tư duy phân cấp, cho phép thu gọn/mở rộng từng phân nhánh và lưu lại tùy chọn hiển thị cục bộ trên trình duyệt.

### 1.1. In-Scope (Nội dung thực hiện trong Track A)
1. **Persisted Collapsed Nodes**:
   - Cho phép người dùng click thu gọn/mở rộng từng nút nhánh trên cây (`collapsedNodeIds: string[]`).
   - Lưu trữ danh sách các Node ID bị thu gọn cho từng chủ đề độc lập.
2. **Persisted Layout Mode (Per-Topic)**:
   - Ghi nhớ tùy chọn hướng hiển thị (`tree_horizontal` hoặc `tree_vertical`) trực tiếp trong payload của từng chủ đề (`topicId`).
   - *Lý do kiến trúc (Trade-off rationale)*: Một số chủ đề có cấu trúc nhánh ngang rộng (shallow & wide) xem tối ưu ở dạng `tree_horizontal`, trong khi các chủ đề có chuỗi kế thừa sâu (deep lineage) xem tối ưu ở dạng `tree_vertical`. Việc lưu per-topic giúp bảo toàn góc nhìn tối ưu cho từng chủ đề mà không làm xáo trộn bố cục của các chủ đề khác, đồng thời duy trì tính nguyên tử (atomic read/write) trong một storage key duy nhất.
3. **Pure Client State & Helper Layer**:
   - Xây dựng module helper `src/lib/mindmapStorage.ts` độc lập, defensive error handling và type-safety 100%.

### 1.2. Final Status for Zoom & Pan: DEFERRED
- **Zoom Level & Pan Offset**: **DEFERRED HOÀN TOÀN sang Track B / v2.0**.
- Trong v1/v1.1, Canvas sử dụng SVG viewBox responsive tự động co giãn theo kích thước màn hình và layout cây. Chưa có bất kỳ primitive tương tác kéo thả / pan tự do nào trong v1, do đó Track A **tuyệt đối không triển khai zoom/pan state**.

---

## 2. Non-Goals (Những Việc Tuyệt Đối Không Làm)

Để bảo đảm blast radius tối thiểu và tính cô lập cao:
- ❌ **Không thêm Database Schema / Prisma Migration**: Không tạo bảng `MindMapState` hay thêm cột vào `Topic`.
- ❌ **Không thêm Backend REST / GraphQL Endpoints**: Không tạo API `POST /api/mindmap/state`.
- ❌ **Không can thiệp Offline Sync Queue**: Trạng thái hiển thị là ephemeral UI preference cục bộ, không đẩy vào sync queue đa thiết bị.
- ❌ **Không can thiệp Graph Projection Engine**: Tuyệt đối giữ nguyên `src/lib/mindmapProjection.ts` và `src/lib/knowledgeGraph.ts`. Quá trình projection vẫn sinh ra toàn bộ cây phân cấp; việc ẩn/hiện nhánh con do tầng Canvas/View lọc dựa trên `collapsedNodeIds`.
- ❌ **Không mở rộng Cross-Links hay Multi-Parent (Track B)**.
- ❌ **Không đụng đến Dashboard Home hay Topic Detail (Track C)**.

---

## 3. Implementation Entry Contract (Khung Ràng Buộc Triển Khai)

Trước khi bắt tay viết mã cho Track A, kỹ sư phải tuân thủ nghiêm ngặt ma trận quyền truy cập tệp tin sau:

| Danh mục | Danh sách tệp tin | Quy tắc ràng buộc |
| :--- | :--- | :--- |
| **Tệp tin ĐƯỢC TẠO MỚI** | • `src/lib/mindmapStorage.ts`<br>• `tests/unit/mindmap-storage.test.ts`<br>• `tests/unit/mindmap-view-state.test.tsx` | Pure helper, unit test cho storage serializer/deserializer và component test |
| **Tệp tin ĐƯỢC PHÉP SỬA** | • `src/components/mindmap/MindMapView.tsx`<br>• `src/components/mindmap/MindMapTreeCanvas.tsx` | Bổ sung props `collapsedNodeIds`, handler toggle `onToggleCollapse`, và nạp state từ helper |
| **Tệp tin TUYỆT ĐỐI CẤM SỬA** | • `src/lib/mindmapProjection.ts`<br>• `src/lib/knowledgeGraph.ts`<br>• `src/lib/urlRouting.ts`<br>• `prisma/schema.prisma`<br>• `server.ts`<br>• `package.json` | Bảo toàn 100% core projection, routing contract, backend, và dependencies hiện có |
| **Quality Gate bắt buộc trước khi mở PR** | • `npx vitest run ...` (100% pass)<br>• `npx tsc --noEmit` (0 errors)<br>• `npm run lint` (0 errors) | Zero regressions trên toàn bộ test suite hiện hành |

---

## 4. Technical Design & Architecture (Thiết Kế Kỹ Thuật)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MindMapView Component                         │
│  - Active Topic ID                                                     │
│  - Local State: collapsedNodeIds (Set<string>), layoutMode             │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ (Load / Save)                  │ (Filtered Tree)
                    ▼                                ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│    mindmapStorage.ts (Pure Helper)   │   │     MindMapTreeCanvas       │
│  - serializeViewState()              │   │  - Render Nodes             │
│  - deserializeViewState()            │   │  - Toggle Chevron (▶ / ▼)   │
│  - sanitizeCollapsedIds()            │   │  - Hide collapsed children  │
└───────────────────┬──────────────────┘   └─────────────────────────────┘
                    ▼
┌───────────────────────────────────────────────────────┐
│ Browser localStorage (Unified Canonical Key)          │
│ key: "knowledge_os_mindmap_view_state_v1:<topicId>"   │
└───────────────────────────────────────────────────────┘
```

### 4.1. Canonical Storage Key Convention & Data Structure

Khóa lưu trữ được chuẩn hóa đồng nhất trên toàn hệ thống:

```typescript
// Canonical Key Prefix
export const MINDMAP_STORAGE_PREFIX = "knowledge_os_mindmap_view_state_v1:";

export interface MindMapLocalViewState {
  version: 1;
  topicId: string;
  layoutMode: "tree_horizontal" | "tree_vertical";
  collapsedNodeIds: string[];
  updatedAt: string; // ISO 8601 string
}
```

- **Format**: `knowledge_os_mindmap_view_state_v1:<topicId>` (Ví dụ: `knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de`).
- **Khả năng mở rộng (Extensibility)**: Cấu trúc object cho phép dễ dàng bổ sung các trường hiển thị tương lai (như `filterTag`, `highlightNodeId`) mà không làm vỡ các trường hiện có.

### 4.2. Versioning Strategy
- Trường `version: 1` cho phép migrate schema trong các phase sau nếu cần.
- Nếu `version` khác `1` hoặc payload không khớp schema, helper tự động fallback về state mặc định an toàn.

### 4.3. Corrupted JSON & Defensive Storage Error Handling
Mọi tương tác với `localStorage` phải được cô lập an toàn trong `try / catch`:

```typescript
export function loadMindMapViewState(topicId: string): MindMapLocalViewState {
  const defaultState: MindMapLocalViewState = {
    version: 1,
    topicId,
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    updatedAt: new Date().toISOString(),
  };

  if (!topicId || typeof window === "undefined" || !window.localStorage) {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(`${MINDMAP_STORAGE_PREFIX}${topicId}`);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.collapsedNodeIds)) {
      return {
        version: 1,
        topicId,
        layoutMode: parsed.layoutMode === "tree_vertical" ? "tree_vertical" : "tree_horizontal",
        collapsedNodeIds: parsed.collapsedNodeIds.filter((id: unknown) => typeof id === "string"),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(`[MindMapStorage] Failed to read state for topic: ${topicId}`, err);
  }

  return defaultState;
}

export function saveMindMapViewState(state: MindMapLocalViewState): boolean {
  if (!state.topicId || typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const payload = JSON.stringify({
      version: 1,
      topicId: state.topicId,
      layoutMode: state.layoutMode === "tree_vertical" ? "tree_vertical" : "tree_horizontal",
      collapsedNodeIds: state.collapsedNodeIds.filter((id) => typeof id === "string"),
      updatedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(`${MINDMAP_STORAGE_PREFIX}${state.topicId}`, payload);
    return true;
  } catch (err) {
    // Graceful handling for QuotaExceededError or security block
    console.warn(`[MindMapStorage] Failed to persist state for topic: ${state.topicId}`, err);
    return false;
  }
}
```

### 4.4. Quota Error Handling (QuotaExceededError)
Khi `localStorage` đạt giới hạn dung lượng:
- Bắt lỗi `DOMException` (với `name === 'QuotaExceededError'`).
- Không throw exception ra UI, ứng dụng tiếp tục hoạt động mượt mà với In-Memory state.

### 4.5. Stale ID Sanitization
Khi các Note/Topic con bị xóa khỏi đồ thị, danh sách `collapsedNodeIds` trong `localStorage` có thể chứa ID mồ côi (orphan IDs).
- **Cơ chế Sanitization**: Khi render, chỉ các ID thực sự tồn tại trong `MindMapTreeNode` hiện thời mới kích hoạt logic ẩn. Hàm `sanitizeCollapsedIds(storedIds, activeNodeIds)` sẽ loại bỏ các ID không còn tồn tại khi lưu lại state mới.

---

## 5. Gherkin Acceptance Scenarios

```gherkin
Feature: Track A - Mind Map Persisted View State
  As a researcher organizing large topic trees
  I want my collapsed branch selections and layout preferences to be persisted locally
  So that when I revisit a topic, my visual focus is maintained without manual re-adjustment

  Scenario: 1. Restoring collapsed branches on topic revisit
    Given I am viewing the Mind Map for topic "topic-tu-dieu-de"
    And node "topic-bat-chanh-dao" is expanded
    When I click the collapse chevron on node "topic-bat-chanh-dao"
    Then the children of "topic-bat-chanh-dao" should disappear from the canvas
    And the state should be saved to localStorage with key "knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"
    When I switch to tab "topics" and switch back to tab "mindmap"
    Then node "topic-bat-chanh-dao" should be rendered in collapsed state
    And its children should remain hidden until expanded

  Scenario: 2. Restoring layout mode preference per topic
    Given I am viewing the Mind Map for topic "topic-tu-dieu-de" with layout "tree_horizontal"
    When I switch the layout mode to "tree_vertical"
    Then the canvas should instantly re-render in vertical tree layout
    And the preference should be saved to "knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"
    When I refresh the browser page
    Then the Mind Map for "topic-tu-dieu-de" should load directly in "tree_vertical" layout

  Scenario: 3. Graceful degradation when localStorage is blocked or throws error
    Given browser privacy settings disable localStorage (or window.localStorage is undefined)
    When I open the Mind Map for topic "topic-tu-dieu-de" and toggle branch collapse
    Then the canvas should collapse and expand branches normally in-memory
    And no uncaught runtime exception should crash the React component

  Scenario: 4. Safe recovery from corrupted JSON payload
    Given the localStorage entry for "knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de" contains "{ invalid json ... "
    When I load the Mind Map for topic "topic-tu-dieu-de"
    Then the application should ignore the corrupted payload
    And fallback to the default fully expanded view without throwing errors

  Scenario: 5. Topic switch state isolation
    Given I collapsed node "subtopic-1" in topic "topic-A"
    When I select topic "topic-B" from the topic dropdown
    Then the Mind Map for "topic-B" should load with its own independent collapsed state from "knowledge_os_mindmap_view_state_v1:topic-B"
    And "subtopic-1" from "topic-A" should not contaminate "topic-B"
```

---

## 6. Test Plan & Quality Assurance Strategy

### 6.1. Unit Tests (`tests/unit/mindmap-storage.test.ts`)
Bộ unit test độc lập cho helper `mindmapStorage.ts` (14/14 passed):
- [x] Test đọc/ghi payload hợp lệ với key canonical `knowledge_os_mindmap_view_state_v1:<topicId>`.
- [x] Test fallback giá trị mặc định khi key không tồn tại.
- [x] Test xử lý an toàn khi payload JSON bị hỏng (`SyntaxError`).
- [x] Test xử lý an toàn khi `localStorage.setItem` ném lỗi `QuotaExceededError`.
- [x] Test sanitization loại bỏ các Node ID rác không phải string và orphan IDs.

### 6.2. Component Tests (`tests/unit/mindmap-view-state.test.tsx`)
Bộ component test cho UI state integration (8/8 passed):
- [x] Kiểm tra `MindMapView` khởi tạo đúng state từ `loadMindMapViewState`.
- [x] Kiểm tra click nút đóng/mở nhánh gọi hàm cập nhật state và filter nút con.
- [x] Kiểm tra chuyển đổi chủ đề (Topic change) tải đúng cấu hình của chủ đề mới.

### 6.3. Regression Verification Suite
Toàn bộ regression tests liên quan đều đạt 100% pass:
- [x] `tests/unit/mindmap-projection.test.ts` (10/10 pass).
- [x] `tests/unit/url-routing.test.ts` (15/15 pass).
- [x] `tests/unit/knowledge-graph-lib.test.ts` (8/8 pass).
- [x] `npx tsc --noEmit` đạt 0 error.
- [x] `npm run lint` đạt 0 error.

---

## 7. Human Review Gate & Pre-Implementation Alignment

Các quyết định thiết kế đã được thống nhất và tuân thủ 100%:
1. **Cơ chế click đóng/mở**: Nút icon chevron tròn nhỏ `▼ / ▶` tại góc nút có nhánh con để thu gọn/mở rộng; click vào thân node để mở chi tiết chủ đề.
2. **Hành vi mặc định (Default state)**: Mặc định mở rộng toàn bộ các nhánh đến `maxDepth = 3`.
3. **Phạm vi lưu Layout Mode**: Lưu **per-topic** trong payload canonical `knowledge_os_mindmap_view_state_v1:<topicId>`.
4. **Vị trí file code**:
   - `src/lib/mindmapStorage.ts`: Pure helper functions.
   - `src/components/mindmap/MindMapTreeCanvas.tsx`: Bổ sung props `collapsedNodeIds: Set<string>` và `onToggleCollapse`.
   - `src/components/mindmap/MindMapView.tsx`: Quản lý state và hooks lưu trữ.

---

## 8. Implementation Outcome & Closure Note

- **Kết quả triển khai**: Track A đã hoàn tất 100% mục tiêu thiết kế. Tách biệt hoàn hảo giữa helper lưu trữ an toàn `mindmapStorage.ts` và tầng render `MindMapTreeCanvas.tsx`.
- **Độ an toàn (Resilience)**: Bảo đảm zero crash khi LocalStorage bị chặn hoặc bị tràn bộ nhớ (`QuotaExceededError`).
- **Nghiệm thu**: 22 unit & component tests dành riêng cho Track A đều passed; 80/80 tests Mind Map suite passed.
