# Đặc Tả Kỹ Thuật & Mini-ADR: Track E — Minimap Overview Radar (Mind Map)

> **Tài liệu đặc tả (Architecture Decision Record & Feature Specification)**<br>
> **Mã định danh**: SPEC-MINDMAP-TRACK-E<br>
> **Trạng thái**: COMPLETE & VERIFIED BASELINE (Phase E1 MVP, E1d Drag Indicator, E2a Mobile Toggle, E3 Docs Reconciliation, E4 Docs Closure, E5 Touch Target Hardening — 18 unit tests passing)<br>
> **Phạm vi**: Giao diện Mind Map Canvas — Điều hướng, định vị không gian và trải nghiệm radar thu nhỏ trên desktop & mobile.

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
6. **Graceful Degradation & Responsive Toggle**:
   - **Desktop ($\ge 640\text{px}$)**: Minimap luôn hiển thị tại góc `bottom-4 left-4` (`hidden sm:block`).
   - **Mobile ($< 640\text{px}$)**: Minimap mặc định thu gọn (collapsed), cung cấp nút toggle accessible `mindmap-minimap-toggle` (`sm:hidden`, touch target tối thiểu $44\times 44\text{px}$) mở panel radar nổi `mindmap-minimap-panel` khi cần.

### 2.3. Hệ Quả & Tác Động (Consequences)
- **Tích cực**:
  - Người dùng có cái nhìn toàn cảnh tức thì (spatial radar) và điều hướng O(1) đến bất kỳ nhánh cây nào chỉ với 1 cú nhấp chuột hoặc thao tác kéo khung nhìn.
  - Phân tách trách nhiệm sạch sẽ: `MindMapMinimap` chỉ đảm nhiệm hiển thị radar, tính toán chuyển đổi tọa độ chuột và quản lý state mở/đóng mobile cục bộ, không can thiệp logic dựng cây DOM.
  - Blast radius nhỏ, giới hạn trong canvas UI boundary đối với các module cốt lõi (Projection, Routing, Export, Backend).
- **Thách thức kỹ thuật đã giải quyết**:
  - Tính toán chính xác tỷ lệ chuyển đổi giữa tọa độ pixel của Canvas lớn và tọa độ micro-radar thu nhỏ (scale ratio mapping).
  - Xử lý cô lập sự kiện con trỏ (`e.stopPropagation()`) để tránh kích hoạt kéo nhầm canvas nền hoặc kích hoạt nhầm click-to-center khi kéo indicator.

### 2.4. Non-Goals (Những Việc Không Làm Trong Track E)
- Không chỉnh sửa database schema, Prisma, hay thêm API endpoint.
- Không thay đổi thuật toán Spanning Tree hay phân loại quan hệ trong `mindmapProjection.ts`.
- Không đưa Minimap vào file xuất bản SVG, PNG, hay Markdown Outline.
- Không lưu tọa độ viewport hay trạng thái mở/đóng toggle vào LocalStorage per-topic.
- Không kéo thêm thư viện bản đồ/canvas nặng bên thứ ba (chỉ dùng React + SVG/Tailwind).

### 2.5. Các Giải Pháp Bị Từ Chối (Rejected Alternatives)
1. *Nhúng trực tiếp một iframe hoặc clone DOM tree*: Bị từ chối vì gây suy giảm hiệu năng nghiêm trọng và làm nhân đôi số lượng DOM element.
2. *Lưu trữ tọa độ pixel cố định (x, y) ngay trong Projection*: Bị từ chối vì phá vỡ tính thuần khiết (pure read-model) của `projectToMindMapTree` và gây phụ thuộc cứng vào kích thước màn hình.
3. *Sử dụng Canvas 2D Bitmap riêng*: Bị từ chối vì vector SVG nhẹ hơn, sắc nét trên màn hình Retina và dễ kiểm thử với Testing Library / JSDOM.

---

## 3. Quá Trình Triển Khai & Vòng Đời Hoàn Thành (Lifecycle & Milestones)

### 3.1. Phase E1 — Minimap Overview Radar MVP [COMPLETE & VERIFIED]
- **Mục tiêu**: Shell cơ bản của radar tổng quan, khung hiển thị indicator đồng bộ với zoom/pan, click-to-center navigation, và cô lập sự kiện.
- **Commits**:
  - `e0a2dca docs(mindmap): add minimap track spec and failing test contract`
  - `7f55ddc feat(mindmap): add minimal overview radar for tree canvas`
- **Kết quả**: Vượt qua Scenarios 1 – 5 trong `tests/unit/mindmap-minimap.test.tsx`.

### 3.2. Phase E1d — Drag Viewport Indicator [COMPLETE & VERIFIED]
- **Mục tiêu**: Kéo rê trực tiếp hình chữ nhật indicator trong radar để pan canvas, hỗ trợ pointer capture, bounds clamping và click isolation.
- **Delta Math**: $\Delta\text{pan} = -\Delta\text{mouse} / \text{scaleRatio}$.
- **Commit**:
  - `349e75e feat(mindmap): add drag viewport indicator for minimap radar`
- **Kết quả**: Vượt qua Scenarios 6 – 10 trong `tests/unit/mindmap-minimap.test.tsx`.

### 3.3. Phase E2a — Accessible Mobile Minimap Toggle [COMPLETE & VERIFIED]
- **Mục tiêu**: Nút bấm bật/tắt radar trên màn hình di động ($< 640\text{px}$), hỗ trợ phím `Escape`, thuộc tính accessibility (`aria-expanded`, `aria-controls`), touch target ban đầu $40\times 40\text{px}$, và panel nổi `mindmap-minimap-panel`.
- **Commit**:
  - `452a1f0 feat(mindmap): add accessible mobile toggle for minimap overview radar`
- **Kết quả**: Vượt qua Scenarios 11 – 17 trong `tests/unit/mindmap-minimap.test.tsx`.

### 3.4. Phase E3 — Track E Documentation Reconciliation [COMPLETE & VERIFIED]
- **Mục tiêu**: Đối chiếu, khôi phục và bảo toàn toàn bộ tri thức đặc tả, test contract, và Gherkin scenarios từ baseline thực tế.
- **Commit**:
  - `2cfd55a docs(mindmap): reconcile Track E minimap and Track D export parity specs`

### 3.5. Phase E4 — Documentation-Only Closure [FORMALLY CLOSED]
- **Mục tiêu**: Đóng chính thức mốc baseline ban đầu của Track E (Minimap Overview Radar) mà không bổ sung runtime feature hay sửa code logic.
- **Commit**:
  - `b06c8c9 docs(mindmap): formally close Track E and v2.0 baseline`

### 3.6. Phase E5 — Mobile Minimap Toggle Touch Target Hardening [COMPLETE & VERIFIED]
- **Mục tiêu**: Nâng cấp kích thước vùng chạm của nút mobile toggle từ $40\times 40\text{px}$ (`w-10 h-10 min-w-[40px] min-h-[40px]`) lên tối thiểu $44\times 44\text{px}$ (`w-11 h-11 min-w-[44px] min-h-[44px]`), enhanced touch-target hardening theo accessibility baseline của dự án mà không làm thay đổi hành vi hay API contract.
- **Kết quả**: Vượt qua Scenario 18 trong `tests/unit/mindmap-minimap.test.tsx` (18/18 tests passed).

---

## 4. Test Contract & DOM Identifiers

### 4.1. DOM Identifiers (`data-testid`)
- `data-testid="mindmap-minimap"`: Container bao bọc toàn bộ widget minimap radar trên desktop.
- `data-testid="minimap-radar-svg"`: Thẻ `<svg>` chứa các micro-node markers và viewport indicator.
- `data-testid="minimap-viewport-rect"`: Hình chữ nhật đại diện cho khung nhìn hiển thị hiện tại.
- `data-testid="mindmap-minimap-toggle"`: Nút bấm accessible bật/tắt radar trên mobile (`sm:hidden`, touch target $\ge 44\times 44\text{px}$).
- `data-testid="mindmap-minimap-panel"`: Floating panel hiển thị radar khi mobile toggle đang mở.
- `data-testid="minimap-node-{nodeId}"`: (Tùy chọn) Marker đại diện cho từng node hiển thị trong radar.

### 4.2. Props API Của `MindMapMinimap`
```typescript
export interface MindMapMinimapProps {
  tree: MindMapTreeNode;
  layoutMode?: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  zoom: number;
  pan: { x: number; y: number };
  backdropRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPanChange: (newPan: { x: number; y: number }) => void;
}
```

### 4.3. Mock Measurements Cần Thiết Trong Test Suite
- `backdropRef`: Mock kích thước khung nhìn ngoài (ví dụ: `width: 800, height: 600`).
- `contentRef` / `containerRef`: Mock kích thước nội dung cây (ví dụ: `width: 1600, height: 1200` tại `zoom = 1.0`).
- `minimapRect`: Kích thước cố định của widget radar (ví dụ: `width: 160, height: 120`).

### 4.4. Tiêu Chuẩn Assertion (Behavioral vs Implementation Details)
- **Được phép assert (Behavioral)**:
  - Container `data-testid="mindmap-minimap"` hoặc toggle button có trong document hay không.
  - Vị trí và kích thước của `minimap-viewport-rect` thay đổi tương ứng khi `zoom` hoặc `pan` thay đổi.
  - Callback `onPanChange` được gọi với tọa độ mới khi `fireEvent.click` vào radar hoặc khi drag indicator.
  - `pointerDown` trên minimap không kích hoạt sự kiện drag của canvas backdrop.
  - Trạng thái `aria-expanded` và `aria-controls` của mobile toggle khi mở/đóng hoặc nhấn phím `Escape`.
  - Kích thước vùng chạm tối thiểu $\ge 44\times 44\text{px}$ của mobile toggle thông qua classes `w-11 h-11 min-w-[44px] min-h-[44px]`.
- **Tránh assert (Implementation Details)**:
  - Không assert chuỗi SVG path nội bộ chính xác từng pixel.
  - Không assert mã màu CSS hex nếu không liên quan logic điều hướng.
  - Không assert số lượng render cycle nội bộ của React hook.

---

## 5. Bản Đặc Tả BDD / Gherkin Acceptance Scenarios

```gherkin
Feature: Mind Map Minimap Overview Radar (Track E)
  As a scholar exploring large and complex mind maps
  I want a responsive overview radar with an interactive viewport indicator and mobile toggle
  So that I can quickly orient myself and navigate across distant branches effortlessly

  # --- Happy Paths: Radar & Navigation ---

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
    Then the callback onPanChange should be invoked with target canvas coordinates
    And the canvas pan state should update to center the requested coordinates in the main backdrop

  # --- Viewport Indicator Dragging (Phase E1d) ---

  Scenario: Dragging viewport indicator pans the main canvas
    Given the minimap is visible with an active viewport indicator
    When the user drags the viewport indicator by delta (dx: 20px, dy: 10px)
    Then the canvas pan should update with inverted scale delta
    And pointer release should stop further pan updates
    And dragging should not trigger SVG click-to-center navigation

  # --- Mobile Responsive Toggle & Touch Target Hardening (Phase E2a & E5) ---

  Scenario: Mobile toggle is collapsed by default, expandable, and has minimum 44px touch target
    Given the viewport width is < 640px (Mobile view)
    And the tree has multiple nodes
    When the canvas is loaded
    Then the mobile toggle button "mindmap-minimap-toggle" should be rendered with aria-expanded "false"
    And the mobile toggle should have width >= 44px and height >= 44px (w-11 h-11 min-w-[44px] min-h-[44px])
    And the radar panel "mindmap-minimap-panel" should not be visible
    When the user activates the mobile toggle
    Then the radar panel "mindmap-minimap-panel" should open
    And the toggle aria-expanded should become "true"
    When the user presses Escape
    Then the radar panel should close cleanly

  # --- Boundary & Edge Cases ---

  Scenario: Trivial tree with single root node hides or no-ops minimap
    Given a mind map with only a single root node and no children
    When the canvas is rendered
    Then the minimap container should not be rendered or should safely render an empty state without errors
    And the mobile toggle should also remain hidden

  Scenario: Small tree fully contained within viewport
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
    When the user clicks or presses pointer down on "mindmap-minimap" or "mindmap-minimap-toggle"
    Then event propagation should be stopped immediately
    And the background canvas should not enter isDragging state

  Scenario: Minimap interactions do not alter underlying projection data
    Given an active mind map projection with 25 nodes and 4 cross edges
    When the user interacts with the minimap repeatedly
    Then the tree structure, node count, and cross edge definitions should remain strictly identical

  Scenario: Standalone SVG and PNG exports exclude the minimap overlay
    Given the user has navigated using the minimap
    When the user clicks "Xuất SVG" or "Xuất PNG"
    Then the exported file content should only contain the knowledge tree and cross-links
    And the exported SVG should contain zero elements from the "mindmap-minimap" component
```

---

## 6. Test Contract & Verification Suite (`tests/unit/mindmap-minimap.test.tsx`)

Bao gồm 18 kịch bản kiểm thử tự động đạt tỷ lệ pass 100%:

1. **Scenario 1**: Renders minimap container and radar SVG for non-trivial tree on desktop.
2. **Scenario 2**: Gracefully hides or no-ops minimap for single-node root tree.
3. **Scenario 3**: Computes and updates viewport indicator size from zoom scale ratio.
4. **Scenario 4**: Clicking minimap requests pan change to center target coordinates.
5. **Scenario 5**: Pointer interaction on minimap stops propagation and does not trigger backdrop drag.
6. **Scenario 6**: Dragging viewport indicator updates canvas pan from mapped delta.
7. **Scenario 7**: Pointer release or cancel stops further pan updates.
8. **Scenario 8**: Dragging viewport indicator isolates background canvas drag.
9. **Scenario 9**: Dragging viewport indicator does not trigger SVG click-to-center.
10. **Scenario 10**: Dragging viewport indicator remains clamped within minimap bounds.
11. **Scenario 11**: Mobile toggle is rendered collapsed by default for multi-node trees.
12. **Scenario 12**: Activating mobile toggle opens minimap without changing current pan/zoom.
13. **Scenario 13**: Activating mobile toggle again closes minimap without triggering backdrop drag.
14. **Scenario 14**: Escape closes open mobile minimap.
15. **Scenario 15**: Single-node tree hides both mobile toggle and minimap radar.
16. **Scenario 16**: Desktop keeps minimap visible and does not render mobile-only toggle.
17. **Scenario 17**: Open mobile minimap preserves viewport indicator drag contract.
18. **Scenario 18**: Mobile toggle provides minimum 44x44px touch target.

---

## 7. Các Quyết Định Thiết Kế & Lời Giải Cho Open Questions

1. **Vị trí cố định trên giao diện**:
   - *Quyết định*: Góc dưới bên trái (`bottom-4 left-4`) trong `MindMapTreeCanvas.tsx` để không va chạm cụm Zoom Controls ở góc dưới bên phải.
2. **Kích thước cố định của Minimap Radar**:
   - *Quyết định*: `160px` chiều ngang $\times$ `120px` chiều dọc (tỷ lệ 4:3) với viền bo tròn `rounded-xl`, nền `bg-white/80 dark:bg-stone-900/80 backdrop-blur-md`.
3. **Màu sắc node đại diện trong radar**:
   - *Quyết định*: Micro-dots dùng màu `fill-amber-500/80` cho topic và `fill-stone-400/60` cho các nút lá; Viewport Indicator dùng `stroke-amber-600 dark:stroke-amber-400 fill-amber-500/10`.
4. **Touch Target Mobile Toggle**:
   - *Quyết định*: Tối thiểu $44\times 44\text{px}$ (`w-11 h-11 min-w-[44px] min-h-[44px]`) với `p-2`, đáp ứng mục tiêu touch target tối thiểu 44×44px theo accessibility baseline của dự án, hỗ trợ keyboard accessibility và focus outline rõ ràng.

---

## 8. Tổng Kết Quality Gates

- **Unit Tests**: `tests/unit/mindmap-minimap.test.tsx` đạt **18/18 passed**.
- **Full Mind Map Regression**: Toàn bộ **12 test suites / 146 unit tests** đạt **100% passed**.
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**.
- **Git State**: Clean working tree.

---

## 9. Future Enhancement Candidates (Uncommitted Backlog)

> [!NOTE]
> Các hạng mục dưới đây thuần túy là ý tưởng kỹ thuật được ghi nhận lại cho các chu kỳ nâng cấp tương lai. Chúng **KHÔNG** thuộc phạm vi baseline hiện tại của Track E và **KHÔNG** được cam kết triển khai trong phase này.

1. **Candidate 1: Micro-Node Radar Dots**: Duyệt cấu trúc cây phân cấp và render các chấm micro-dots thu nhỏ (`<circle>` / `<rect>`) phản ánh vị trí các node con trực tiếp bên trong SVG radar.
2. **Candidate 2: Dynamic ResizeObserver for Minimap Bounds**: Tích hợp `ResizeObserver` trên `backdropRef` để tự động cập nhật bounding rect khi viewport thay đổi kích thước mà không cần chờ tương tác người dùng.
