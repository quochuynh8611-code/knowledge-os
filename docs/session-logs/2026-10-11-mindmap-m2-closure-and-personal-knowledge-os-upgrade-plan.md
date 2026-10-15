# Session Log — Mind Map Phase M2 Closure & Personal Knowledge OS Comprehensive Evolution Plan

## 1. Session Metadata
- **Project Path:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Topic:** Tổng kết đóng Phase M2 (Mind Map Saved Document Inline Node Drawer) & Lập Kế Hoạch Nâng Cấp Toàn Diện Knowledge OS cho Người Dùng Cá Nhân
- **Date:** 2026-10-11
- **Current Branch:** `main` (Head commit: `a1687ef`)
- **Role:** Staff Software Engineer / Technical Architect
- **Status:** ✅ Completed & Recorded (Clean working tree, 0 uncommitted changes, full plan drafted)

---

## 2. Tóm tắt Đóng Phase M2 (Mind Map Saved Document Inline Node Drawer)

### 2.1. Bối cảnh & Kết quả Kỹ thuật
- **Mục tiêu:** Bổ sung giao diện chỉnh sửa nhanh tiêu đề node dạng inline drawer độc lập cho chế độ tài liệu lưu trữ (`saved-document` mode).
- **Các artifact đã nghiệm thu:**
  - ADR: `docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md`
  - Planning Spec: `docs/specs/mindmap-phase-m2-planning-spec-v1.md`
  - Component: `src/components/mindmap/MindMapNodeDrawer.tsx`
  - Wiring & Runtime: `src/components/mindmap/MindMapView.tsx`
  - Closure Report: `docs/reports/mindmap-phase-m2-closure-report.md`
  - Test Suite: `tests/unit/mindmap-node-drawer.test.tsx` (7/7 scenarios PASS)
- **Commits đã thực hiện:**
  - `7d288fb`: `feat(mindmap): add title-only node drawer for saved documents` (6 files staged & committed)
  - `a1687ef`: `docs(roadmap): reconcile project status after mind map m2` (Cập nhật `docs/PROJECT_STATUS.md`)
- **Nguyên tắc bảo vệ ranh giới (Blast Radius Invariants):**
  - Scope title-only được cô lập hoàn toàn cho `saved-document` mode; tuyệt đối không kích hoạt trong `live-topics` mode.
  - Đóng drawer không xóa vùng chọn canvas (`selectedNodeIds`).
  - Metadata `sourceIdReference`, `nodeType`, `semanticBadge` chỉ hiển thị dạng read-only.
  - Zero schema change, zero breaking change trên DataContext và backend database.

---

## 3. Rà soát Mã Nguồn & Định Vị Hệ Thống (Knowledge OS Architecture Review)

### 3.1. Hiện trạng Hệ thống
- **Công nghệ nền tảng:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Express + Prisma ORM (PostgreSQL) + LocalStorage Dual-Tier Persistence.
- **Hệ sinh thái cốt lõi:**
  1. **Khảo cứu & Đọc sách (Research & Library Hub):** `UnifiedResearchReader` (PDF/EPUB/Markdown), Obsidian Multi-Vault Bridge (12-step path traversal defense, wiki-link resolver, SSE live watcher, transclusion), File Library Manifest & Audit Engine (Zero Binary Ingestion).
  2. **Học tập & Trí nhớ (Study & Memory Hub):** Spaced Repetition (SM-2 / FSRS logic), Card Browser, Duplicate Detection, Focus Learning Session Bar, Forgetting Curve & Retention Prediction Engine, 24x7 Study Heatmap.
  3. **Vườn Tri Thức (Knowledge Architecture Hub):** Dynamic Taxonomy (Phân cấp động, Root Category Domain cards, Soft Hide/Restore), Knowledge Graph (2D/3D force graph), và Mind Map Canvas (Layouts ngang/dọc, Zoom/Pan, Minimap radar, Markdown outline import, Saved Documents v1 & Inline Drawer M2).
  4. **Phân tích & Tự động hóa (Control Hub):** BM25 Full-text Search kèm chuẩn hóa dấu tiếng Việt & Pāli/IAST, NotebookLM Studio & Antigravity CLI Handoff Protocol (`agy -p`).

---

## 4. Kế Hoạch Nâng Cấp Toàn Diện Cho Người Dùng Cá Nhân (Personal Knowledge OS Evolution Plan)

Dựa trên việc sử dụng thực tế hàng ngày của một học giả / nhà nghiên cứu cá nhân độc lập, 4 trụ cột chiến lược cần được nâng cấp bao gồm:

### 4.1. Trụ Cột 1: Tương Tác Sơ Đồ Tư Duy Bằng Bàn Phím (Mind Map Keyboard Authoring)
- **Mục tiêu:** Cho phép người dùng phác thảo luồng suy nghĩ với tốc độ cao mà không bị phụ thuộc vào chuột.
- **Lộ trình:**
  - **Phase M3 (Keyboard-First Node Insertion & Removal):**
    - Bấm `Tab`: Tạo ngay Node con (Child) dưới node đang chọn.
    - Bấm `Enter`: Tạo ngay Node ngang hàng (Sibling).
    - Bấm `Delete` / `Backspace`: Xóa node (kèm bảo vệ nếu node có cành con).
    - Nhấp đúp hoặc bấm `Space`: Mở nhanh Drawer để sửa tiêu đề inline.
  - **Phase M4 (Rich Node Metadata Drawer):**
    - Bổ sung trường `notes` (ghi chú ngắn Markdown) và `status` (`todo`, `doing`, `done`) trong Node Drawer mà không phá vỡ schema lưu trữ.
  - **Phase M5 (Drag-and-Drop Reparenting):**
    - Kéo thả node để chuyển đổi cây nhánh trực quan trên Canvas.

### 4.2. Trụ Cột 2: Khép Kín Chuỗi Đọc Sách & Trích Dẫn Sang Thẻ Nhớ (Active Reading to Flashcard)
- **Mục tiêu:** Biến tri thức từ sách (`UnifiedResearchReader`) thành trí nhớ dài hạn (`Flashcards`) với tối thiểu thao tác chuột.
- **Lộ trình:**
  - **Phase R3 (1-Click Highlight to Cloze / Basic Flashcard):**
    - Trên thanh công cụ nổi `UnifiedSelectionToolbar`: Bổ sung nút "Tạo Flashcard".
    - Tự động bóc tách ngữ cảnh xung quanh, điền câu trích dẫn và liên kết ngược với nguồn sách (Tên tài liệu, vị trí CFI/trang).
  - **Phase R4 (Split-Screen Workspace):**
    - Chế độ chia đôi màn hình: Trình đọc sách ở nửa trái và Ghi chú chủ đề / Mind Map ở nửa phải, cho phép kéo thả trích dẫn trực tiếp.

### 4.3. Trụ Cột 3: Tối Ưu Hóa Nhịp Học Tập & Ghi Chép Nhanh Hàng Ngày (Frictionless Daily Routine)
- **Mục tiêu:** Tạo trải nghiệm "Mở app là bắt đầu học ngay", không tốn công duyệt tìm kiếm.
- **Lộ trình:**
  - **Phase D1 (Dashboard Daily Due Review Widget):**
    - Hiển thị widget tổng hợp các thẻ đến hạn ôn tập trong ngày (`Due Flashcards`) ngay tại `DashboardHome`.
    - Nút 1-click "Ôn tập ngay 5 phút" kích hoạt trực tiếp `FlashcardReviewStudio`.
  - **Phase D2 (Global Quick Capture Modal - `⌘N`):**
    - Modal ghi chép nhanh mở tức thời tại bất kỳ màn hình nào để lưu ý tưởng chớp nhoáng (Fleeting Notes) vào Inbox.

### 4.4. Trụ Cột 4: Tự Động Hóa Sao Lưu Lên Mây & Tìm Kiếm Tri Thức Ngữ Nghĩa (Local AI & Backup)
- **Mục tiêu:** Đảm bảo toàn vẹn dữ liệu cá nhân trọn đời và truy hồi tri thức theo ngữ nghĩa tự nhiên.
- **Lộ trình:**
  - **Phase B1 (Scheduled Cloud Sync via rclone/Drive):**
    - Tích hợp kịch bản tự động kích hoạt `scripts/backup-snapshot.ts` và đồng bộ an toàn lên Google Drive qua rclone.
  - **Phase AI-1 (Hybrid Semantic Search):**
    - Nâng cấp bộ tìm kiếm: Kết hợp BM25 hiện tại với Vector Embeddings (Gemini API hoặc On-device embeddings) để tìm kiếm nội dung theo khái niệm thay vì chỉ khớp từ khóa chính xác.

---

## 5. Bảng Ma Trận Ưu Tiên Hành Động (Actionable Matrix)

| Mức Độ | Hạng Mục Đề Xuất | Giá Trị Thực Tế Cho Cá Nhân | Độ Phức Tạp |
| :---: | :--- | :--- | :---: |
| 🥇 **Ưu tiên 1** | **Phase M3: Mind Map Keyboard Authoring (`Tab`/`Enter`/`Del`)** | Tăng tốc độ phác thảo ý tưởng lên gấp nhiều lần | Trung bình |
| 🥇 **Ưu tiên 2** | **Phase R3: 1-Click Highlight $\rightarrow$ Flashcard SRS** | Tiết kiệm tối đa thời gian tạo thẻ nhớ khi đọc sách | Thấp - Trung bình |
| 🥈 **Ưu tiên 3** | **Phase D1: Dashboard Daily Due Review Widget** | Giúp duy trì kỷ luật học tập mỗi ngày mà không bị phân tâm | Thấp |
| 🥈 **Ưu tiên 4** | **Phase D2: Global Quick-Capture Modal (`⌘N`)** | Bắt trọn ý tưởng vụt sáng mọi lúc mọi nơi | Thấp |
| 🥉 **Ưu tiên 5** | **Phase B1: Cloud Auto-Backup Integration** | Bảo vệ 100% tài sản tri thức cá nhân an toàn | Thấp (Script backend) |

---

## 6. Trạng Thái Kết Thúc Phiên Làm Việc
- Mã nguồn repo: Sạch sẽ, không có uncommitted changes.
- Toàn bộ lịch sử phân tích và kế hoạch hành động đã được ghi nhận vào tài liệu lưu trữ chính thức này.
- Khi người dùng sẵn sàng, có thể bắt đầu với **Phase M3** (Phím tắt Mind Map) hoặc **Phase R3** (Tạo thẻ nhớ từ bài đọc).
