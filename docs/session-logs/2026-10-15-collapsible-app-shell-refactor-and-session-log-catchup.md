# Session Log — Collapsible App Shell Refactor & Engineering Documentation Catch-up

## 1. Thông Tin Phiên Làm Việc (Session Metadata)
- **Đường dẫn dự án:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Chủ đề:**
  1. Refactor App Shell sang thanh Sidebar có khả năng thu gọn/mở rộng (Collapsible Left Rail) nhằm tối ưu hóa diện tích hiển thị trung tâm cho các workspace phức tạp (Mind Map, Knowledge Graph, Notes, AI Studio).
  2. Xây dựng Layout Policy linh hoạt (`full`, `wide`, `constrained`) thay thế cho container cứng nhắc `max-w-7xl`.
  3. Đảm bảo bảo toàn tuyệt đối trải nghiệm tab Thư Viện Sách (`reader`) và điều hướng di động (bottom bar).
  4. Harden cơ chế lưu trữ trạng thái Sidebar (`useSidebarState.ts`) phòng ngừa lỗi runtime trong môi trường `localStorage` bị chặn / sandbox.
  5. Rà soát, xác nhận và đồng bộ 4 file tài liệu kỹ thuật (Session Logs tháng 10/2026) vào kho mã nguồn.
- **Thời gian:** 2026-10-15
- **Branch:** `main` (đồng bộ hoàn toàn với `origin/main` tại commit `f830c2f`)
- **Role:** Staff Software Engineer / UI Architect
- **Trạng thái:** ✅ Đã kiểm chứng toàn diện, 100% Quality Gates (TypeScript 0 errors, Vitest 502/502 test suites passed), committed & pushed sạch sẽ.

---

## 2. Bối Cảnh & Vấn Đề Kỹ Thuật (Problem Statement)

### 2.1. Không Gian Hiển Thị Bị Giới Hạn Bởi Layout Cứng Nhắc
- **Hiện tượng:**
  - Toàn bộ nội dung ứng dụng được bọc trong một container `max-w-7xl mx-auto px-4` duy nhất trong `src/App.tsx`.
  - Menu điều hướng dọc bên trái (`src/components/layout/Sidebar.tsx`) cố định chiều rộng, chiếm dụng khoảng 256px không gian màn hình mà không cho phép người dùng thu gọn khi cần tập trung thao tác.
  - Các workspace đòi hỏi không gian tương tác lớn như Sơ đồ tư duy (Mind Map), Đồ thị tri thức (Knowledge Graph), Trình soạn thảo ghi chú (Notes), và AI Studio bị co cụm, giảm đáng kể trải nghiệm xem và thao tác trực quan.
- **Yêu cầu kiến trúc:**
  - Cho phép thu gọn Sidebar thành dạng Rail thanh mảnh (chỉ hiển thị icon và tooltip), giải phóng thêm ~200px bề ngang.
  - Tách bạch layout policy theo đặc thù từng tab: tab dữ liệu phức tạp cần mở rộng tối đa (full/wide width), trong khi các tab form/danh sách (Dashboard, Topics, Flashcards) vẫn duy trì độ rộng dễ đọc.
  - Cấm phá vỡ tab Thư Viện Sách (`reader`) vốn đã có layout full-height riêng với panel danh mục sách bên trái.
  - Cấm phá vỡ thanh bottom navigation trên giao diện thiết bị di động (`< md`).

### 2.2. Rủi Ro Runtime Của State Persistence
- Việc lưu trạng thái thu gọn/mở rộng vào `localStorage` nếu truy cập trực tiếp có thể ném exception (QuotaExceeded, SecurityError trong chế độ Private/Incognito hoặc Iframe sandbox), gây sập ứng dụng khi khởi động.
- Cần cơ chế fallback in-memory an toàn và API chịu lỗi (graceful degradation).

---

## 3. Kiến Trúc & Giải Pháp Thực Hiện

### 3.1. Phân Tách Trách Nhiệm Layout Shell (`AppShell` & `AppSidebar`)
1. **`src/components/layout/AppShell.tsx`:**
   - Đóng vai trò layout wrapper cấp cao nhất, điều phối hiển thị giữa `AppSidebar`, `Navbar`, mobile bottom nav, và vùng nội dung chính (`main`).
   - Tự động nhận diện tab hiện tại để áp dụng lớp đệm (padding) và độ rộng phù hợp.
2. **`src/components/layout/AppSidebar.tsx`:**
   - Hỗ trợ 2 trạng thái: `expanded` (rộng 64 / 256px) và `collapsed` (rộng 16 / 64px).
   - Nút chuyển đổi (toggle button) trực quan có `aria-label` và `aria-expanded` phục vụ accessibility.
   - Khi ở trạng thái collapsed, nhãn văn bản được ẩn và hiển thị tooltip nổi khi hover để người dùng dễ nhận biết mục điều hướng.
3. **`src/components/layout/Sidebar.tsx` (Backward Compatibility):**
   - Giữ nguyên component `Sidebar` làm adapter chuyển tiếp sang `AppSidebar`, đảm bảo không làm gãy các vị trí import cũ trong codebase.

### 3.2. Cơ Chế Layout Policy Động (`src/components/layout/layoutPolicy.ts`)
Phân loại chính sách bố cục theo từng màn hình nghiệp vụ:
- **`full` (Tràn viền màn hình, 100% width, không padding ngang):**
  - Áp dụng cho: `graph` (Knowledge Graph), `mindmap` (Mind Map canvas).
- **`wide` (Không gian mở rộng, `max-w-[1600px]`):**
  - Áp dụng cho: `notes`, `search`, `progress`, `ai_studio`.
- **`constrained` (Không gian tiêu chuẩn, `max-w-7xl` căn giữa):**
  - Áp dụng cho: `dashboard`, `topics`, `flashcards`, `resources`.
- **`custom` (Tự quản lý layout):**
  - Áp dụng cho: `reader` (giữ nguyên layout full-height chuyên dụng của Thư viện sách).

### 3.3. Quản Lý Trạng Thái Bền Vững An Toàn (`src/components/layout/useSidebarState.ts`)
- Triển khai hook `useSidebarState` với bộ nhớ đệm `safeStorage`:
  - Kiểm tra tính sẵn sàng của `window.localStorage` qua hàm probe an toàn.
  - Bọc mọi thao tác `getItem`, `setItem` trong khối `try/catch`.
  - Tự động chuyển đổi sang in-memory Map khi lưu trữ trình duyệt bị vô hiệu hóa, đảm bảo ứng dụng không bao giờ bị crash.

### 3.4. Tài Liệu Hóa Kiến Trúc & Kiểm Thử
- **ADR:** Bổ sung tài liệu quyết định kiến trúc tại `docs/adr-collapsible-sidebar-shell.md`.
- **Integration Test:** Tạo mới bộ test tích hợp `tests/integration/app-shell-collapsible-sidebar.test.tsx` bao phủ:
  - Render trạng thái mở rộng mặc định và danh sách menu.
  - Thao tác toggle đóng/mở sidebar.
  - Áp dụng đúng layout policy cho từng tab (`graph`, `mindmap`, `notes`, `dashboard`, `reader`).
  - Khả năng chịu lỗi và fallback in-memory khi `localStorage` ném ngoại lệ.

---

## 4. Đồng Bộ Hóa Session Logs (Documentation Catch-up)

Trước khi đóng phiên làm việc, 4 tài liệu kỹ thuật đang ở trạng thái untracked trong thư mục `docs/session-logs/` đã được rà soát nội dung kỹ lưỡng:
1. `docs/session-logs/2026-10-11-mindmap-m2-closure-and-personal-knowledge-os-upgrade-plan.md`
2. `docs/session-logs/2026-10-13-mindmap-ai-proxy-and-gemini-3.8-flash-migration.md`
3. `docs/session-logs/2026-10-14-ci-pipeline-stabilization-and-phase-r3c-planning.md`
4. `docs/session-logs/2026-10-14-mindmap-canvas-node-click-and-saved-document-browser-hardening.md`

Tất cả đã được stage và commit độc lập trong commit `f830c2f`, đảm bảo tính toàn vẹn và truy vết kỹ thuật cho dự án mà không pha trộn vào commit tính năng shell.

---

## 5. Danh Sách Commits Đã Xuất Bản

1. **Commit `313cd84`:**
   ```text
   feat(shell): add collapsible left sidebar rail and dynamic tab layout policy
   - introduce AppShell and AppSidebar for expanded and collapsed navigation states
   - add toggle control with accessible icon rail and tooltip behavior
   - implement resilient sidebar state persistence with safe storage access
   - add layoutPolicy engine for full, wide, and constrained tab containers
   - replace rigid max-w-7xl shell wrapper in App.tsx
   - expand workspace area for graph, mindmap, notes, search, progress, and ai_studio
   - preserve mobile bottom navigation and library reader shell behavior
   - add ADR and integration coverage for shell behavior
   ```
2. **Commit `f830c2f`:**
   ```text
   docs(session): add October engineering session logs
   - record Mind Map Phase M2 closure and Personal Knowledge OS upgrade roadmap (2026-10-11)
   - record Mind Map AI proxy architecture and Gemini 3.8 Flash migration (2026-10-13)
   - record CI pipeline test stabilization and Phase R3c planning (2026-10-14)
   - record Mind Map canvas node click isolation and saved document browser hardening (2026-10-14)
   ```

---

## 6. Kết Quả Kiểm Chứng (Quality Gate Verification)

- **TypeScript (`npm run typecheck`):** PASS (0 errors).
- **Unit & Integration Tests (`npm run test`):**
  - **Test Files:** 502/502 passed (100%).
  - **Tests:** 1888 passed.
- **Git Working Tree:** Sạch hoàn toàn, đồng bộ 100% với `origin/main`.
