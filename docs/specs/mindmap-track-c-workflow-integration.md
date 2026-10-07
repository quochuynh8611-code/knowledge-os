# Mind Map Track C — Workflow Integration Specification & ADR-lite

**Version:** 1.0  
**Status:** DRAFT / APPROVED FOR IMPLEMENTATION  
**Author:** Staff Software Engineer / Technical Architect  
**Track:** Track C — Workflow Integration Only  

---

## 1. Context & Architectural Boundary

### 1.1 Context
Sau khi Mind Map v1 (Derived Read-Model Projection) và Track A (Persisted View State) đã hoàn thành và sẵn sàng merge, Track C tập trung vào việc **gắn kết Mind Map vào luồng làm việc hàng ngày của người học (Workflow Integration)**.

### 1.2 Boundary & Ràng Buộc Bắt Buộc (Strict Invariants)
- **Zero Schema / Database Migration**: Không thêm bảng, cột, hay đổi Prisma schema.
- **Zero Backend API Change**: Không tạo endpoint mới, không sửa `server.ts`.
- **Zero Sync Queue Modification**: Không can thiệp offline sync queue.
- **Zero Heavy Dependencies**: Không cài đặt thư viện mới.
- **Zero Projection / Canvas Engine Modification**: Giữ nguyên `mindmapProjection.ts`, `mindmapStorage.ts`, và canvas `MindMapTreeCanvas.tsx`.
- **Zero Heavy Canvas in Dashboard Widget**: Dashboard widget / card chỉ đóng vai trò navigation entry & summary teaser, không render graph/canvas nặng gây sụt giảm FPS hay tải DOM.
- **Canonical Routing Preservation**: Luôn điều hướng qua canonical hash routing `#/mindmap?topicId=<id>&layout=tree_horizontal`.

---

## 2. ADR-Lite: Workflow Integration Points

### 2.1 Quyết Định 1: Tích hợp CTA trong Topic Detail Toolbar & Quick Actions
- **Vấn đề**: Người dùng đang nghiên cứu một Topic cụ thể trong `TopicDetail` muốn chuyển sang góc nhìn cây sơ đồ tư duy của chủ đề đó mà không phải tìm kiếm lại.
- **Giải pháp**:
  - Bổ sung nút CTA `"Sơ đồ"` (`data-testid="btn-view-mindmap"`) trên thanh công cụ của `TopicDetail.tsx`.
  - Khi click: kích hoạt `openMindMap(topic.id)` từ `NavigationContext`, chuyển sang `activeTab = "mindmap"` với `selectedTopicId = topic.id`, tự động đồng bộ URL hash `#/mindmap?topicId=<topic.id>`.
- **Trade-off**: Thêm 1 icon button vào toolbar topic; giải tỏa bằng cách dùng icon `Share2`/`Network` gọn gàng, đồng bộ với design system.

### 2.2 Quyết Định 2: Lightweight Mind Map Entry Widget trên Dashboard Home
- **Vấn đề**: Người dùng tại trang chủ (`DashboardHome`) cần lối tắt trực quan vào không gian Mind Map.
- **Giải pháp**:
  - Thêm thẻ tiện ích **"Sơ đồ tư duy (Mind Map)"** vào Khối 5 (*Công cụ & Tiện ích mở rộng*) trên `DashboardHome.tsx`.
  - Icon: `Share2` (hoặc `Network`), tiêu đề "Sơ đồ tư duy", mô tả ngắn "Trực quan hóa cấu trúc phân cấp & cây tri thức".
  - Click action: Điều hướng `setActiveTab("mindmap")` (hoặc mở topic được chọn gần nhất).
  - Không render canvas DOM nặng; giữ tải ban đầu ở mức O(1).
- **Trade-off**: Giữ widget ở dạng action card trong grid tiện ích để bảo vệ điểm số LCP và hiệu năng render của Dashboard.

### 2.3 Quyết Định 3: Tích hợp Navigation & Action trong Command Palette
- **Vấn đề**: Người dùng thao tác bằng phím tắt `Ctrl+K`/`Cmd+K` muốn nhảy nhanh đến Mind Map hoặc mở sơ đồ của chủ đề đang chọn.
- **Giải pháp**:
  - Bổ sung `nav-mindmap` vào danh mục `Điều hướng` trong `useCommandPalette.ts` (keywords: `mindmap`, `so do tu duy`, `cay tri thuc`, `truc quan hoa`).
  - Bổ sung `act-open-mindmap` vào danh mục `Hành động nhanh` trong `App.tsx` (tự động nhận diện ngữ cảnh: nếu có `selectedTopicId`, tiêu đề sẽ là *"Mở Sơ Đồ Tư Duy: [Tên chủ đề]"*).
- **Trade-off**: Quick action phụ thuộc ngữ cảnh `selectedTopicId`, được cập nhật an toàn qua memoized dependencies.

### 2.4 Quyết Định 4: Mở rộng NavigationContext cho `openMindMap`
- **Vấn đề**: `setActiveTab` hiện tại xoá `selectedTopicId` nếu tab không phải `topics` hoặc `flashcards`.
- **Giải pháp**:
  - Cập nhật điều kiện giữ `selectedTopicId` khi tab là `"mindmap"` (`tab !== "topics" && tab !== "flashcards" && tab !== "mindmap"`).
  - Bổ sung hàm tiện ích `openMindMap: (topicId?: string | null) => void` vào `NavigationContextType`.

---

## 3. Test Cases (Given / When / Then)

### Scenario 1: Mở Mind Map từ TopicDetail Toolbar CTA
- **Given** người dùng đang ở màn hình chi tiết chủ đề `topic-1` (`activeTab = "topics"`, `selectedTopicId = "topic-1"`).
- **When** người dùng click vào nút CTA `"Sơ đồ"` (`btn-view-mindmap`).
- **Then** hệ thống chuyển `activeTab` sang `"mindmap"`.
- **And** `selectedTopicId` vẫn giữ nguyên là `"topic-1"`.
- **And** URL hash đồng bộ thành `#/mindmap?topicId=topic-1`.

### Scenario 2: Mở Mind Map từ Dashboard Widget Card
- **Given** người dùng đang ở trang chủ Dashboard (`activeTab = "dashboard"`).
- **When** người dùng click vào thẻ tiện ích `"Sơ đồ tư duy"` trong khối Công cụ & Tiện ích.
- **Then** hệ thống chuyển `activeTab` sang `"mindmap"`.
- **And** URL hash đồng bộ thành `#/mindmap`.
- **And** MindMapView tự động chọn topic hợp lệ đầu tiên hoặc hiển thị topic selector.

### Scenario 3: Mở Mind Map từ Command Palette
- **Given** Command Palette đang mở (`Ctrl+K`).
- **When** người dùng gõ từ khóa `"mindmap"` hoặc `"so do"`.
- **Then** kết quả tìm kiếm hiển thị lệnh điều hướng `"Sơ đồ tư duy (Mind Map)"` và hành động nhanh `"Mở Sơ Đồ Tư Duy"`.
- **When** người dùng thực thi lệnh `"nav-mindmap"`.
- **Then** palette đóng lại và hệ thống chuyển `activeTab` sang `"mindmap"`.

### Scenario 4: Fallback State khi Topic không đủ dữ liệu / Chưa chọn Topic
- **Given** người dùng điều hướng tới `#/mindmap` mà không có `topicId` hoặc `topicId` không tồn tại trong kho dữ liệu.
- **When** `MindMapView` nạp dữ liệu.
- **Then** hệ thống tự động fallback chọn topic đầu tiên có sẵn trong danh sách chủ đề.
- **And** nếu danh mục chủ đề rỗng, hiển thị empty state nhẹ nhàng với thông điệp hướng dẫn tạo chủ đề mới.

---

## 4. Implementation Roadmap

1. **Step 1: Test-First Harness**:
   - Viết `tests/unit/mindmap-workflow-integration.test.ts` kiểm thử toàn diện 4 scenarios trên.
2. **Step 2: NavigationContext Update**:
   - Thêm `openMindMap(topicId?: string | null)` và cập nhật `setActiveTab` giữ lại `selectedTopicId` cho tab `"mindmap"`.
3. **Step 3: TopicDetail CTA Button**:
   - Thêm nút CTA `"Sơ đồ"` với `Share2` icon và data-testid `btn-view-mindmap` vào header toolbar của `TopicDetail.tsx`.
4. **Step 4: Dashboard Home Entry Card**:
   - Thêm Mind Map card vào Khối 5 của `DashboardHome.tsx` với styling đồng bộ grid.
5. **Step 5: Command Palette Integration**:
   - Thêm `nav-mindmap` vào `src/hooks/useCommandPalette.ts`.
   - Thêm `act-open-mindmap` (context-aware) vào `src/App.tsx`.
6. **Step 6: Verification & Quality Gate**:
   - Chạy toàn bộ test suites (`vitest`).
   - Kiểm tra `tsc --noEmit` và `npm run lint`.
