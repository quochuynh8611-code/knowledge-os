# LỘ TRÌNH TRIỂN KHAI TỔNG THỂ (MASTER IMPLEMENTATION ROADMAP)
## Dashboard Nghiên Cứu Phật Học & Huyền Học (Knowledge OS)

---

## TỔNG QUAN CÁC GIAI ĐOẠN (PHASE OVERVIEW)

```
[BƯỚC 1: AUDIT] (Đã hoàn thành)
       │
[BƯỚC 2: SPEC & ADR] (Đang thực hiện)
       │
[BƯỚC 3: TEST-FIRST] (Đang thực hiện: Gherkin & Failing Tests)
       │
[BƯỚC 4: REVIEW & APPROVAL]
       │
[BƯỚC 5: IMPLEMENTATION PHASES]
       ├── PHASE 1: UI Feedback, Skeletons, Command Palette & Keyboard Navigation
       ├── PHASE 2: Persistence, Safe Migration, Zod Validation & TanStack Query
       ├── PHASE 3: Enhanced Graph, Clustering, Layout Persistence & Analytics
       └── PHASE 4: Security, Cost Controls, Backup, PWA & Production Hardening
```

---

## CHI TIẾT TỪNG GIAI ĐOẠN & QUALITY GATES

### PHASE 1: Nền Tảng UI Feedback, Command Palette & Phím Tắt
- **Mục tiêu:** Nâng cấp trải nghiệm người dùng, loại bỏ cảm giác chờ đợi, thêm thanh lệnh toàn năng `Ctrl+K` và phím tắt điều hướng.
- **Danh mục file tạo mới:**
  - `src/components/common/Breadcrumbs.tsx`: Điều hướng phân cấp cây chủ đề.
  - `src/components/common/LoadingSkeleton.tsx`: Component khung xương hiển thị khi tải dữ liệu.
  - `src/components/common/TopicSkeleton.tsx`: Khung xương cho trang chi tiết & danh sách chủ đề.
  - `src/components/common/NoteSkeleton.tsx`: Khung xương cho danh sách ghi chú.
  - `src/components/common/EmptyState.tsx`: Trạng thái trống trang trọng, truyền cảm hứng nghiên cứu.
  - `src/components/common/ThemeToggle.tsx`: Chuyển đổi giao diện Sáng / Tối (Mực Nho / Giấy Cổ).
  - `src/components/search/CommandPalette.tsx`: Thanh tìm kiếm & thực thi lệnh toàn năng.
  - `src/components/search/SearchFilters.tsx`: Bộ lọc chuyên biệt theo thể loại, tag, tiến độ.
  - `src/components/modals/ShortcutsModal.tsx`: Bảng tra cứu phím tắt toàn hệ thống.
  - `src/hooks/useCommandPalette.ts`: Hook quản lý trạng thái mở/đóng và lọc lệnh Command Palette.
  - `src/hooks/useKeyboardShortcuts.ts`: Hook lắng nghe phím tắt toàn cục.
  - `src/hooks/useTheme.ts`: Hook quản lý Dark/Light mode với LocalStorage & System Sync.
- **Ràng buộc:** KHÔNG sửa đổi các file bị khóa (`src/App.tsx`, `server.ts`, `DataContext.tsx`, v.v.).
- **Quality Gate:** Tất cả các test của Phase 1 pass 100%, không có lỗi TypeScript, Accessibility đạt chuẩn.

---

### PHASE 2: Persistence, PostgreSQL/Prisma, Safe Migration & Data Sync
- **Mục tiêu:** Chuyển đổi từ LocalStorage sang cơ sở dữ liệu bền vững, hỗ trợ sao lưu phục hồi dữ liệu hoàn hảo.
- **Nội dung công việc:**
  - Thiết kế `prisma/schema.prisma` với đầy đủ indexes, relations và cascading rules.
  - Tạo Migration an toàn và kịch bản Seed Idempotent chứa kho tri thức gốc.
  - Xây dựng Zod validation schemas (`src/schemas/validation.ts`) cho toàn bộ thực thể.
  - Xây dựng REST API CRUD endpoints trên `server.ts` có Zod validation middleware.
  - Tích hợp TanStack Query cho caching và auto-refetching.
  - Xây dựng module Import/Export dữ liệu JSON, Markdown và Obsidian Vault ZIP có validation.
- **Quality Gate:** Không làm mất dữ liệu LocalStorage hiện hữu; toàn bộ luồng Import/Export được kiểm thử với 100% trường hợp dữ liệu hợp lệ và dữ liệu độc hại/hỏng.

---

### PHASE 3: Enhanced Knowledge Graph & Spaced Repetition (SM-2)
- **Mục tiêu:** Trực quan hóa mạng lưới tri thức chuyên sâu và tối ưu hóa năng suất ghi nhớ của học giả.
- **Nội dung công việc:**
  - Nâng cấp `KnowledgeGraph.tsx`: Gom cụm theo lĩnh vực, tìm kiếm node tức thời, lưu tọa độ tùy biến vào database/localStorage.
  - Xuất ảnh đồ thị độ nét cao dạng PNG, SVG hoặc JSON.
  - Nâng cấp `StudyProgressView.tsx`: Thống kê chu kỳ nhớ, tỷ lệ duy trì trí nhớ Ebbinghaus.
  - Hoàn thiện hàng đợi ôn tập thông minh (SM-2 Due Review Queue).
- **Quality Gate:** Đồ thị tương tác mượt mà ở 60 FPS với hơn 500 nodes; thuật toán SM-2 pass toàn bộ test case toán học.

---

### PHASE 4: Production Readiness, Bảo Mật, AI Cost Controls & Backup
- **Mục tiêu:** Đưa hệ thống lên môi trường production an toàn, bảo mật và hiệu năng cao.
- **Nội dung công việc:**
  - Thiết lập Rate Limiting, Prompt Injection Guardrails, Token Cost Tracking cho Gemini AI proxy.
  - Tự động hóa sao lưu định kỳ (Periodic automated backup).
  - Tối ưu hóa hiệu năng, Lighthouse Score > 90 trên cả Mobile và Desktop.
  - Health checks endpoints & Production logging.
- **Quality Gate:** Đạt chuẩn bảo mật OWASP, không lộ API keys, thời gian tải trang < 1.5s.
