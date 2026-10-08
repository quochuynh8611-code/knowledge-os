# Đặc Tả Kỹ Thuật & Mini-ADR: Phase E1 — Minimap Overview Radar (Mind Map)

> **Tài liệu đặc tả (Architecture Decision Record & Feature Specification)**<br>
> **Mã định danh**: SPEC-MINDMAP-E1<br>
> **Trạng thái**: PROPOSED (Đang chờ duyệt)<br>
> **Phạm vi**: Giao diện Mind Map Canvas — Điều hướng và định vị không gian trên cây tri thức lớn.

---

## 1. Trade-off Chọn Vị Trí Lưu Trữ Spec

| Phương án | Ưu điểm | Nhược điểm | Đánh giá |
| :--- | :--- | :--- | :--- |
| **A. Ghép vào `mindmap-next-phases.md`** | Tất cả trong một file duy nhất. | Tăng kích thước file meta-roadmap; tạo diff lớn không cần thiết trên tài liệu baseline v2.0 vừa đóng. | Không khuyến nghị |
| **B. Tạo file riêng `docs/specs/mindmap-track-e-minimap.md`** *(Được chọn)* | Cô lập hoàn toàn phạm vi thay đổi (blast radius nhỏ, giới hạn trong canvas UI boundary); độc lập theo dõi vòng đời thiết kế -> phê duyệt -> kiểm thử. | Thêm 1 file tài liệu mới trong thư mục `docs/specs/`. | **Khuyến nghị tối ưu** |

---

## 2. Mini-ADR: Minimap Overview Radar cho Mind Map Canvas

### 2.1. Ngữ Cảnh (Context)
Mind Map v2.0 đã hỗ trợ phóng to/thu nhỏ (`zoom` từ `0.5x` đến `2.0x`), kéo rê khung nhìn (`drag pan`), và co giãn vừa màn hình (`fit-to-viewport`). Tuy nhiên, khi người dùng phóng to trên các cây phân cấp có nhiều tầng nhánh (lên tới 80 nút), người dùng dễ mất phương hướng (spatial disorientation), không biết mình đang đứng ở nhánh con nào so với cấu trúc tổng thể và phải liên tục kéo rê màn hình để tìm lại vị trí gốc.

### 2.2. Quyết Định Kiến Trúc (Decision)
1. **Kiến trúc UI Overlay độc lập**: Xây dựng component `MindMapMinimap.tsx` như một micro-radar vector đặt nổi (floating overlay) phía trên góc canvas của `MindMapTreeCanvas.tsx`.
2. **Nguồn sự thật duy nhất (Single Source of Truth)**: Giữ toàn bộ trạng thái `zoom`, `pan`, `layoutMode`, `collapsedNodeIds` và các tham chiếu DOM (`backdropRef`, `containerRef`) tại `MindMapTreeCanvas.tsx`. `MindMapMinimap` nhận các giá trị này qua props và chỉ phát duy nhất một callback tối thiểu: `onPanChange(newPan)` lên canvas cha.
3. **Zero Core Projection & Schema Mutation**: Không bổ sung trường pixel hay metadata tọa độ vào `MindMapTreeNode` hay `mindmapProjection.ts`. Minimap tái sử dụng cấu trúc cây hiện hữu hoặc tính toán vector tỷ lệ trực tiếp.
4. **Không đưa vào Export Pipeline**: Minimap thuần túy là công cụ điều hướng trực quan trong phiên làm việc của người dùng; hoàn toàn không được serialize vào kết quả xuất bản SVG hay PNG (`mindmapExport.ts`).
5. **Ephemeral State Policy**: Không lưu trữ trạng thái tọa độ minimap hoặc vị trí thu phóng vào `localStorage`/database trong phase này nhằm tuân thủ nguyên tắc Zero Persisted State Overhead.
6. **Graceful Degradation**: Thiết kế ưu tiên Desktop và Tablet ($\ge 640\text{px}$). Trên màn hình nhỏ di động ($< 640\text{px}$), Minimap tự động ẩn hoặc thu gọn để bảo toàn diện tích hiển thị.

### 2.3. Hệ Quả & Tác Động (Consequences)
- **Tích cực**:
  - Người dùng có cái nhìn toàn cảnh tức thì (spatial radar) và điều hướng O(1) đến bất kỳ nhánh cây nào chỉ với 1 cú nhấp chuột.
  - Phân tách trách nhiệm sạch sẽ: `MindMapMinimap` chỉ đảm nhiệm hiển thị radar và tính toán chuyển đổi tọa độ chuột, không can thiệp logic dựng cây DOM.
  - Blast radius nhỏ, giới hạn trong canvas UI boundary đối với các module cốt lõi (Projection, Routing, Export, Backend).
- **Tiêu cực / Thách thức kỹ thuật**:
  - Cần tính toán chính xác tỷ lệ chuyển đổi giữa tọa độ pixel của Canvas lớn và tọa độ micro-radar thu nhỏ (scale ratio mapping).
  - Cần xử lý cẩn trọng sự kiện con trỏ (`e.stopPropagation()`) để tránh kích hoạt kéo nhầm canvas nền.

### 2.4. Non-Goals (Những Việc Không Làm Trong Phase E1)
- Không chỉnh sửa database schema, Prisma, hay thêm API endpoint.
- Không thay đổi thuật toán Spanning Tree hay phân loại quan hệ trong `mindmapProjection.ts`.
- Không đưa Minimap vào file xuất bản SVG, PNG, hay Markdown Outline.
- Không lưu tọa độ viewport vào LocalStorage per-topic.
- Không kéo thêm thư viện bản đồ/canvas nặng bên thứ ba (chỉ dùng React + SVG/Tailwind).

### 2.5. Các Giải Pháp Bị Từ Chối (Rejected Alternatives)
1. *Nhúng trực tiếp một iframe hoặc clone DOM tree*: Bị từ chối vì gây suy giảm hiệu năng nghiêm trọng và làm nhân đôi số lượng DOM element.
2. *Lưu trữ tọa độ pixel cố định (x, y) ngay trong Projection*: Bị từ chối vì phá vỡ tính thuần khiết (pure read-model) của `projectToMindMapTree` và gây phụ thuộc cứng vào kích thước màn hình.
3. *Sử dụng Canvas 2D Bitmap riêng*: Bị từ chối vì vector SVG nhẹ hơn, sắc nét trên màn hình Retina và dễ kiểm thử với Testing Library / JSDOM.

---

## 3. Minimal First Slice (Phạm Vi Tối Thiểu Cho E1a)

Để giữ blast radius nhỏ và đảm bảo từng bước verified chắc chắn, Phase E1a chỉ tập trung vào **Minimal First Slice**:

### Bao gồm trong E1a (In Scope):
1. **Desktop Render & Visibility Rule**: Hiển thị radar container khi màn hình $\ge 640\text{px}$ và cây có $> 1$ nút con.
2. **No-op / Hidden khi cây quá nhỏ**: Nếu cây chỉ có 1 nút gốc hoặc toàn bộ cây đã vừa khít khung nhìn ở tỷ lệ 100% không cần pan, minimap hiển thị trạng thái bao trùm (full-fit) hoặc no-op an toàn.
3. **Viewport Indicator Synchronization**: Hình chữ nhật indicator phản ánh chính xác vị trí và tỷ lệ thu nhỏ của khung nhìn khi `zoom` và `pan` thay đổi.
4. **Click-to-Center Navigation**: Nhấp chuột vào bất kỳ điểm nào trên radar sẽ dịch chuyển khung nhìn chính tâm đến điểm đó.
5. **Event Isolation**: Bắt và cô lập toàn bộ sự kiện pointer (`e.stopPropagation()`) để không làm kích hoạt drag nền hoặc click nhầm các node bên dưới canvas.

### Hoãn lại sau E1a (Deferred / Out of Scope):
- Kéo rê trực tiếp khung viewport indicator (drag-to-pan in minimap) — sẽ bổ sung ở E1d nếu kích thước indicator $\ge 24\text{px}$.
- Cơ chế nút bấm thu nhỏ/mở rộng riêng biệt trên mobile.
- Bảng màu ngữ nghĩa phân loại node phức tạp (chỉ dùng màu xám/vàng đơn giản).
- Vẽ các đường liên kết chéo hoặc nhánh nối bên trong radar (chỉ vẽ node dots/boxes).

---

## 4. Test Contract Cho E1a

### 4.1. DOM Identifiers (`data-testid`)
- `data-testid="mindmap-minimap"`: Container bao bọc toàn bộ widget minimap radar.
- `data-testid="minimap-radar-svg"`: Thẻ `<svg>` chứa các micro-node markers và viewport indicator.
- `data-testid="minimap-viewport-rect"`: Hình chữ nhật đại diện cho khung nhìn hiển thị hiện tại.
- `data-testid="minimap-node-{nodeId}"`: (Tùy chọn) Marker đại diện cho từng node hiển thị trong radar.

### 4.2. Props API Tối Thiểu Của `MindMapMinimap`
```typescript
export interface MindMapMinimapProps {
  tree: MindMapTreeNode;
  layoutMode: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  zoom: number;
  pan: { x: number; y: number };
  backdropRect?: { width: number; height: number } | null;
  contentRect?: { width: number; height: number } | null;
  onPanChange: (newPan: { x: number; y: number }) => void;
}
```

### 4.3. Mock Measurements Cần Thiết Trong Test Suite
- `backdropRect`: Mock kích thước khung nhìn ngoài (ví dụ: `width: 800, height: 600`).
- `contentRect`: Mock kích thước nội dung cây (ví dụ: `width: 1600, height: 1200` tại `zoom = 1.0`).
- `minimapRect`: Kích thước cố định của widget radar (ví dụ: `width: 160, height: 120`).

### 4.4. Tiêu Chuẩn Assertion (Behavioral vs Implementation Details)
- **Được phép assert (Behavioral)**:
  - Container `data-testid="mindmap-minimap"` có trong document hay không.
  - Vị trí và kích thước của `minimap-viewport-rect` thay đổi tương ứng khi `zoom` hoặc `pan` thay đổi.
  - Callback `onPanChange` được gọi với tọa độ mới khi `fireEvent.click` vào radar.
  - `pointerDown` trên minimap không kích hoạt sự kiện drag của canvas backdrop.
- **Tránh assert (Implementation Details)**:
  - Không assert chuỗi SVG path nội bộ chính xác từng pixel.
  - Không assert mã màu CSS hex nếu không liên quan logic điều hướng.
  - Không assert số lượng render cycle nội bộ của React hook.

---

## 5. Bản Đặc Tả BDD / Gherkin Acceptance Scenarios

```gherkin
Feature: Mind Map Minimap Overview Radar (Phase E1)
  As a scholar exploring large and complex mind maps
  I want a responsive overview radar with an interactive viewport indicator
  So that I can quickly orient myself and navigate across distant branches effortlessly

  # --- Happy Paths ---

  Scenario: Minimap renders a scaled overview of the tree structure on desktop
    Given a mind map with topic "topic-tu-dieu-de" containing 15 visible nodes
    And the display width is >= 640px (Desktop view)
    When the MindMapTreeCanvas component is rendered
    Then the minimap overview container "mindmap-minimap" should be visible in the canvas viewport
    And the minimap should render micro node indicators matching the visible tree nodes

  Scenario: Viewport indicator reflects the active canvas zoom and pan
    Given the minimap is active and visible
    When the user zooms in to 150% (scale 1.5)
    And the user pans the canvas to coordinate (x: 120px, y: -80px)
    Then the minimap viewport indicator "minimap-viewport-rect" should update its size proportionally
    And the viewport indicator position should shift inversely to match the visible window

  Scenario: Clicking on the minimap centers the viewport to that target location
    Given the minimap is visible
    When the user clicks on a node cluster at point (u: 40px, v: 30px) inside the minimap radar
    Then the canvas pan callback should be triggered
    And the canvas pan state should update to center the requested coordinates in the main backdrop

  # --- Boundary & Edge Cases ---

  Scenario: Trivial tree with single root node hides or no-ops minimap
    Given a mind map with only a single root node and no children
    When the canvas is rendered
    Then the minimap container should not be rendered or should safely render an empty state without errors

  Scenario: Small tree fully contained within viewport (No-op navigation)
    Given a small mind map where the entire tree fits comfortably within the backdrop at 100% zoom
    When the user views the minimap
    Then the viewport indicator should cover the full bounding box of the tree
    And clicking within the current viewport indicator should be a safe no-op without jitter

  Scenario: Rapid zooming and extreme scale clamping
    Given the user repeatedly clicks Zoom In up to maximum 200% or Zoom Out to 50%
    When the minimap recalculates the viewport indicator
    Then the viewport indicator width and height should remain clamped within the radar boundaries
    And no NaN or negative SVG dimensions should be produced

  # --- Architectural Invariants & Parity ---

  Scenario: Event isolation prevents background canvas drag
    Given the minimap is displayed
    When the user clicks or presses pointer down on "mindmap-minimap"
    Then event propagation should be stopped immediately
    And the background canvas should not enter isDragging state

  Scenario: Minimap interactions do not alter underlying projection data
    Given an active mind map projection with 25 nodes and 4 cross edges
    When the user clicks the minimap repeatedly
    Then the tree structure, node count, and cross edge definitions should remain strictly identical

  Scenario: Standalone SVG and PNG exports exclude the minimap overlay
    Given the user has navigated using the minimap
    When the user clicks "Xuất SVG" or "Xuất PNG"
    Then the exported file content should only contain the knowledge tree and cross-links
    And the exported SVG should contain zero elements from the "mindmap-minimap" component
```

---

## 6. Kế Hoạch Test-First Chi Tiết (`tests/unit/mindmap-minimap.test.tsx`)

Bảng kế hoạch 6 unit tests theo thứ tự ưu tiên trước khi code implementation:

### Test 1: Render minimap container và micro-nodes
- **Tên test**: `Scenario 1: Renders minimap container and scaled node indicators for multi-node tree`
- **Given**: Cây `mockTree` gồm 1 root và 3 children, màn hình desktop.
- **When**: Render `<MindMapMinimap tree={mockTree} layoutMode="tree_horizontal" zoom={1.0} pan={{x:0, y:0}} backdropRect={{width:800, height:600}} contentRect={{width:1200, height:800}} onPanChange={vi.fn()} />`.
- **Expected Assertion**: `expect(screen.getByTestId("mindmap-minimap")).toBeInTheDocument()`, thẻ svg radar tồn tại và chứa các node markers.
- **Vì sao viết trước**: Thiết lập smoke contract cơ bản của component shell.

### Test 2: Ẩn minimap hoặc an toàn với cây đơn nút (Trivial root-only tree)
- **Tên test**: `Scenario 2: Gracefully handles or hides minimap for single-node root tree`
- **Given**: Cây `singleNodeTree` chỉ có 1 nút gốc, `children: []`.
- **When**: Render `MindMapMinimap` với `singleNodeTree`.
- **Expected Assertion**: Minimap container không render hoặc render empty shell an toàn không crash.
- **Vì sao viết trước**: Đảm bảo điều kiện biên nhỏ nhất không sinh lỗi chia cho 0.

### Test 3: Đồng bộ kích thước và vị trí Viewport Indicator theo Zoom
- **Tên test**: `Scenario 3: Viewport indicator dimensions scale inversely with canvas zoom factor`
- **Given**: Cây phân cấp với `backdropRect = {800, 600}`, `contentRect = {1600, 1200}`.
- **When**:
  - Bước A: Render với `zoom = 1.0` -> đo `width_1`, `height_1` của `minimap-viewport-rect`.
  - Bước B: Re-render với `zoom = 2.0` -> đo `width_2`, `height_2`.
- **Expected Assertion**: `width_2` xấp xỉ một nửa `width_1` ($width_2 \approx width_1 / 2$).
- **Vì sao viết trước**: Xác thực thuật toán tính toán kích thước khung nhìn (geometry indicator math).

### Test 4: Đồng bộ vị trí Viewport Indicator theo Pan
- **Tên test**: `Scenario 4: Viewport indicator shifts inversely when canvas is panned`
- **Given**: Cây với `zoom = 1.0`.
- **When**: Re-render với `pan = { x: 200, y: -100 }`.
- **Expected Assertion**: Thuộc tính transform hoặc tọa độ `x, y` của `minimap-viewport-rect` di chuyển ngược chiều delta pan một khoảng tỷ lệ thuận.
- **Vì sao viết trước**: Xác thực phản hồi chuyển động không gian của indicator.

### Test 5: Click-to-Center tính toán và kích hoạt callback `onPanChange`
- **Tên test**: `Scenario 5: Clicking a location in the minimap calls onPanChange with centered canvas coordinates`
- **Given**: Spy callback `onPanChange = vi.fn()`.
- **When**: `fireEvent.click(minimapRadar, { clientX: targetX, clientY: targetY })`.
- **Expected Assertion**: `expect(onPanChange).toHaveBeenCalledTimes(1)`, nhận tham số `{ x: number, y: number }` hợp lệ hướng về vùng được nhấp.
- **Vì sao viết trước**: Xác thực hành vi tương tác cốt lõi của tính năng điều hướng.

### Test 6: Cô lập sự kiện Pointer (Event Isolation)
- **Tên test**: `Scenario 6: Pointer down on minimap stops propagation and does not trigger canvas drag`
- **Given**: Container minimap được render lồng trong canvas backdrop giả lập.
- **When**: `fireEvent.pointerDown(screen.getByTestId("mindmap-minimap"))`.
- **Expected Assertion**: Event không kích hoạt handler pointerDown của container cha.
- **Vì sao viết trước**: Đảm bảo không xảy ra xung đột sự kiện giữa minimap và canvas nền.

---

## 7. Thứ Tự Triển Khai Sau Khi Tests Fail (Post-Test Implementation Order)

1. **Step 1 — Static Render Shell**:
   - Tạo file `src/components/mindmap/MindMapMinimap.tsx` rỗng với `data-testid="mindmap-minimap"`.
   - Kết nối render vào `MindMapTreeCanvas.tsx` tại vị trí `bottom-4 left-4`.
   - Vượt qua Test 1 & Test 2.
2. **Step 2 — Indicator Math & Scaling**:
   - Viết hàm chuyển đổi tỷ lệ `computeMinimapGeometry(backdropRect, contentRect, zoom, pan)`.
   - Render `data-testid="minimap-viewport-rect"` với kích thước bo tròn, viền sáng và nền bán trong suốt.
   - Vượt qua Test 3 & Test 4.
3. **Step 3 — Click-to-Center Coordinate Mapping**:
   - Lắng nghe sự kiện `onClick` trên SVG radar, chuyển đổi tọa độ click tương đối thành tọa độ `pan` của canvas chính.
   - Gọi `onPanChange(computedPan)`.
   - Vượt qua Test 5.
4. **Step 4 — Pointer Event Isolation**:
   - Thêm `onPointerDown={(e) => e.stopPropagation()}` và `onClick={(e) => e.stopPropagation()}` trên container minimap.
   - Vượt qua Test 6.
5. **Step 5 — Regression & Quality Gates**:
   - Chạy toàn bộ test suite: `npx vitest run tests/unit/mindmap-*.test.ts*` (122 tests cũ + 6 tests mới = 128 tests).
   - `npm run typecheck` đạt 0 lỗi.

---

## 8. Các Câu Hỏi Mở Còn Lại (Open Questions)

1. **Vị trí cố định trên giao diện**:
   - *Đề xuất*: Góc dưới bên trái (`bottom-4 left-4`) trong `MindMapTreeCanvas.tsx` để không va chạm cụm Zoom Controls ở góc dưới bên phải.
2. **Kích thước cố định của Minimap Radar**:
   - *Đề xuất*: `160px` chiều ngang $\times$ `120px` chiều dọc (tỷ lệ 4:3) với viền bo tròn `rounded-xl`, nền `bg-white/80 dark:bg-stone-900/80 backdrop-blur-md`.
3. **Màu sắc node đại diện trong radar**:
   - *Đề xuất*: Micro-dots dùng màu `fill-amber-500/80` cho topic và `fill-stone-400/60` cho các nút lá; Viewport Indicator dùng `stroke-amber-600 dark:stroke-amber-400 fill-amber-500/10`.
