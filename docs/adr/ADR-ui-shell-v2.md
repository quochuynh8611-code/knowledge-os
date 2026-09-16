# ADR-072: Refactoring UI Shell & Adopting Workbench Component Architecture (v2)

- **Status**: Proposed / Approved for Phased Migration
- **Date**: 2026-09-16
- **Context**: Knowledge OS UI Modernization & Architecture Hardening

---

## 1. Bối Cảnh (Context)

Hệ thống Knowledge OS hiện là một web app phong phú với hơn 10 workspaces/tabs (Dashboard, Topics, Notes, Resources, Docs Explorer, Search, AI Research Studio, Graph, Progress, Flashcard Suite, Integrations).
Tuy nhiên, qua quá trình phát triển nhanh theo từng phase:
1. **Coupling cao tại App Shell**: `App.tsx` vừa điều phối state, vừa render mobile nav, vừa định dạng layout cho các lazy tabs, gây phân mảnh styling.
2. **Navbar gánh nhiều tác vụ**: `Navbar.tsx` chứa nhiều trạng thái mở modal con cục bộ, dropdowns và các nút tích hợp chưa phân cấp tối ưu.
3. **Phân mảnh Presentation Layer**: Mỗi tab tự khai báo style cho Card, Panel, Button, Filter Bar và Header khiến trải nghiệm thị giác chưa đạt chuẩn "professional research workbench" và khó bảo trì lâu dài.
4. **Yêu cầu bất biến**: Ứng dụng đã có hơn 290 test suites với hàng nghìn test cases. Mọi sự thay đổi phải bảo toàn 100% logic nghiệp vụ, context contracts, keyboard shortcuts và focus flows.

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Phân Tách Tuyệt Đối Giữa Presentation Layer và Data/Orchestration Layer
- Giữ nguyên toàn bộ `DataContext.tsx`, `NavigationContext.tsx`, `StudyTimerContext.tsx`, và các repositories/services.
- Xây dựng tầng `src/components/workbench/` làm tầng UI Foundation chứa các atomic & molecular shared components.

### 2.2. Chuẩn Hóa App Shell V2
- **Top Command Bar (`Navbar.tsx`)**:
  - Trở thành trung tâm chỉ huy mỏng (Command & Navigation Header).
  - Tích hợp ô tìm kiếm toàn cục kích hoạt `CommandPalette` (`⌘K`).
  - Timer cue phản hồi trực quan theo trạng thái chạy/tạm dừng.
  - Nhóm hành động phân tầng: Primary Quick Add, Sync Queue status, Theme Switch, Shortcuts help (`?`), Data Backup.
- **Sidebar V2 (`Sidebar.tsx`)**:
  - Giữ vững 3 phân tầng điều hướng logic: **Học tập (Learning)**, **Tri thức (Knowledge)**, **Công cụ (Tools)**.
  - Khối **Lĩnh vực nghiên cứu (Focus Domain)** được làm mới với styling trung tính, thanh thoát, hiển thị tỷ lệ hoàn tất (%) trực quan.
  - Widget thói quen học tập (Study Habit) ở chân trang với thanh tiến độ tinh gọn.
- **Page Archetypes Standardization**:
  - Chuẩn hóa mọi tab theo 5 page archetypes (Overview, Explorer, Workbench, Analysis, Modal Studio).

### 2.3. Quy Tắc Triển Khai Phân Kỳ (Phased Migration Strategy)
- **Phase A**: UI Foundation, Design Tokens, Shared Components & App Shell.
- **Phase B**: Pilot Screens — DashboardHome (Overview) & TopicDetail (Workbench).
- **Phase C**: Explorer Screens — NotesManager, ResourcesManager, DocsExplorerView & AdvancedSearch.
- **Phase D**: Analysis & Studio Screens — AIResearchStudio, KnowledgeGraph & StudyProgressView.
- **Phase E**: Learning Suite — Flashcard Suite & Integrations Modals.

---

## 3. Hệ Quả & Đánh Giá (Consequences)

### 3.1. Lợi Ích (Positive)
- Giao diện đạt chuẩn "professional research workbench": điềm đạm, tập trung, dễ đọc, chuyên nghiệp.
- Giảm thiểu code trùng lặp và các chuỗi class Tailwind chắp vá rải rác trong JSX.
- Dễ dàng mở rộng các workspace mới mà không làm vỡ tính nhất quán của app.
- Tốc độ render và trải nghiệm bàn phím mượt mà hơn.

### 3.2. Rủi Ro & Biện Pháp Kiểm Soát (Mitigation)
- **Rủi ro hồi quy selectors trong unit tests**:
  - *Biện pháp*: Giữ nguyên mọi `data-testid`, `role`, `aria-label` và tên nút quan trọng mà các bài kiểm thử đang dựa vào.
- **Rủi ro đứt gãy Keyboard Shortcuts**:
  - *Biện pháp*: Duy trì đầy đủ `useKeyboardShortcuts` và scope guard cho các phím số `1-7`, `Cmd+K`, `?`, `Escape`.
- **Rủi ro tương thích Dark Mode**:
  - *Biện pháp*: Kiểm thử toàn bộ semantic tokens trên cả 2 theme `dark` và `light`.
