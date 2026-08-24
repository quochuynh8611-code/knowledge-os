# LỘ TRÌNH TRIỂN KHAI TỔNG THỂ (MASTER IMPLEMENTATION ROADMAP)
## Dashboard Nghiên Cứu Phật Học & Huyền Học (Knowledge OS)

> **Ghi chú đồng bộ:** Lộ trình dưới đây phản ánh cấu trúc canonical của dự án, đồng bộ 100% với [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md).

---

## TỔNG QUAN CÁC GIAI ĐOẠN (CANONICAL PHASES)

```
[BƯỚC 1: AUDIT & ARCHITECTURE] (Hoàn thành)
       │
[BƯỚC 2: SPEC & ADR] (Hoàn thành: ADR-001 -> ADR-014)
       │
[BƯỚC 3: TEST-FIRST GHERKIN] (Hoàn thành: 26 test suites / 186 tests)
       │
[BƯỚC 4: TRIỂN KHAI & KIỂM CHỨNG TỪNG PHASE]
       ├── PHASE 1:  Local File Picker UX & Zero Binary Ingestion (ADR-011, ADR-012) [VERIFIED]
       ├── PHASE 2A: Obsidian Open / Export UX Flow (obsidian://, ZIP export) [VERIFIED]
       ├── PHASE 2B: Google NotebookLM Studio & Source Packaging [VERIFIED]
       ├── PHASE 3:  Antigravity Research Scholar Handoff Bundle (6 phần chuẩn) [VERIFIED]
       ├── PHASE 4:  Production Readiness, Security Guardrails & Operational Hardening (ADR-013) [VERIFIED]
       └── PHASE 5:  Evolution Planning & Operational Expansion (ADR-014) [PLANNING ONLY]
```

---

## CHI TIẾT CÁC GIAI ĐOẠN THỰC THI (IMPLEMENTATION STATUS)

### 🔹 PHASE 1: Local File Picker UX & Tham Chiếu File Cục Bộ (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-011, ADR-012 (Phase 1)
- **Trọng tâm:** Thao tác chọn tệp cục bộ (`filePath`), tự nhận diện loại file (PDF/Audio/Video/Book), giải thích giới hạn sandbox trình duyệt, **Zero Binary Ingestion** (metadata < 2KB).
- **Kiểm chứng:** 6/6 tests PASS trong `tests/unit/resource-form-modal-file-picker.test.tsx`.

### 🔹 PHASE 2A: Obsidian Open / Export UX Flow (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-012 (Phase 2a)
- **Trọng tâm:** Cấu hình Vault Name an toàn, mở bài học qua giao thức `obsidian://open`, tạo ghi chú `obsidian://new`, xuất gói ZIP chuẩn cấu trúc Obsidian Vault (`00_Map_Of_Content.md`).
- **Kiểm chứng:** 9/9 `obsidian-lib.test.ts` + 7/7 `obsidian-bridge-integration.test.tsx` PASS.

### 🔹 PHASE 2B: Google NotebookLM Studio & Source Packaging (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-012 (Phase 2b)
- **Trọng tâm:** Đóng gói 1-click toàn bộ Topic + Luận thuyết + Notes + Resources thành tài liệu nguồn Markdown chuẩn, tải file nguồn `.md`, quản lý Artifacts Locker (Study Guide, Audio Overview).
- **Kiểm chứng:** 7/7 `notebooklm-lib.test.ts` + 6/6 `notebooklm-studio-integration.test.tsx` PASS.

### 🔹 PHASE 3: Antigravity Research Scholar Handoff Bundle (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-012 (Phase 3)
- **Trọng tâm:** Đóng gói gói bàn giao 6 phần chuẩn mực (Multi-Hop Graph Topology 1-hop, Phân loại Notes, Annotated Bibliography), System Prompt 3 chế độ khảo cứu, trigger tích hợp trên TopicDetail, AIStudio và Navbar.
- **Kiểm chứng:** 6/6 `antigravity-lib.test.ts` + 4/4 `antigravity-handoff-integration.test.tsx` PASS.

### 🔹 PHASE 4: Production Readiness, Security Guardrails & Operational Hardening (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-013
- **Trọng tâm:**
  - Rate limiting in-memory: 10 req/min cho `/api/gemini/*`, 5 req/min cho `/api/backup/restore`.
  - Boundary validation: `MAX_PROMPT_LENGTH = 20000`, `MAX_HANDOFF_CONTEXT_LENGTH = 100000`, `GeminiResearchInputSchema`.
  - Health & Latency Policy: `<100ms` healthy, `100-1000ms` degraded, `>=1000ms` unhealthy, ngắt timeout và báo `unhealthy` khi DB offline.
  - Bounded AI Resilience: Thử lại tối đa 2 lần cho 503/429/overload kèm hàng đợi model dự phòng (`gemini-3.6-flash` $\rightarrow$ `gemini-3.7-flash` $\rightarrow$ `gemini-3.1-pro-preview`).
  - Fast-Fail non-retryable errors (400, 401, Invalid Arg).
  - Structured JSON Logging che giấu bí mật (passwords, tokens, API keys).
- **Kiểm chứng:** 13/13 tests PASS trong `tests/unit/phase-4-production-hardening.test.ts`.

---

### 🔹 PHASE 5: Evolution Planning & Operational Expansion (PLANNING ONLY)
- **Mã ADR:** ADR-014 (Status: PROPOSED)
- **Mục tiêu:** Định hình lộ trình tiến hóa dài hạn cho Knowledge OS từ góc nhìn học giả nghiên cứu chuyên sâu, tối ưu hóa năng suất tra cứu, phân tích liên kết đa chiều và tự động hóa vận hành mà không phá vỡ các rào chắn bất biến hiện có.
- **Ứng viên phạm vi (Candidate Scope Workstreams):**
  1. *Workstream 5A — Advanced Knowledge Graph & Multi-Hop Traversal Explorer:* Nâng cấp trực quan hóa đồ thị liên kết, lọc liên kết theo trọng số/loại quan hệ (`prerequisite`, `contradicts`), phát hiện đường dẫn tri thức bắc cầu giữa Phật học và Huyền học.
  2. *Workstream 5B — Spaced Repetition (SM-2) Study Session Analytics:* Thống kê trực quan đường cong lãng quên Ebbinghaus, tỷ lệ duy trì trí nhớ, biểu đồ nhiệt (Heatmap) ngày học, dự báo lịch ôn tập tối ưu.
  3. *Workstream 5C — Automated Snapshot Maintenance & Headless Backup Script:* Xây dựng kịch bản CLI/cron định kỳ xuất snapshot sao lưu với SHA-256 integrity check tự động, phục vụ bảo vệ dữ liệu ngoại tuyến.
  4. *Workstream 5D — Scholar Search & Fast Fuzzy Metadata Filter:* Tối ưu hóa bộ lọc tìm kiếm tức thời trên 35 topics canonical và hàng trăm ghi chú/tài liệu tham khảo mà không phụ thuộc external search cluster.
- **Non-Goals Tuyệt Đối (Phạm vi loại trừ):**
  - KHÔNG triển khai đồng bộ 2 chiều (two-way sync) với Obsidian.
  - KHÔNG gọi private API không chính thức của NotebookLM hoặc Antigravity.
  - KHÔNG nhúng binary vào database, state hoặc handoff bundle (Zero Binary Ingestion).
  - KHÔNG thay đổi schema database hoặc phá vỡ tính tương thích ngược của snapshot Semver 2.x mà không có migration script an toàn.
  - KHÔNG triển khai Authentication/Multi-tenancy phức tạp làm mất tính độc lập offline của người dùng cá nhân.
- **Đánh dấu các quyết định Một Chiều (One-Way / Irreversible Decisions cần ADR riêng):**
  - [!] *Database Schema Migration:* Bất kỳ việc thêm bảng/cột mới nào vào `prisma/schema.prisma` đều là quyết định một chiều $\rightarrow$ bắt buộc có ADR riêng và migration idempotent.
  - [!] *External Auth/Cloud Sync Provider:* Thay đổi mô hình bảo mật cục bộ sang cloud auth là quyết định một chiều $\rightarrow$ cần phân tích đánh đổi rủi ro riêng biệt.
- **Quality Gates cho Phase 5:**
  - 100% Spec & ADR được phê duyệt thủ công trước khi viết code.
  - Gherkin Scenarios và Failing Tests được tạo trước cho từng Workstream.
  - Đảm bảo 186/186 tests hiện có duy trì trạng thái 100% PASS.

---

## BẢNG TỔNG KẾT HỆ THỐNG (SYSTEM BASELINE)

- **Toàn bộ Test Suite:** 26 / 26 test files PASS — 186 / 186 tests PASS (100% GREEN in 7.83s).
- **TypeScript:** `npm run lint` (`tsc --noEmit`) đạt 0 error, 0 warning.
- **Build Production:** `npm run build` tạo bundle sạch trong `dist/`.
