# LỘ TRÌNH TRIỂN KHAI TỔNG THỂ (MASTER IMPLEMENTATION ROADMAP)
## Dashboard Nghiên Cứu Phật Học & Huyền Học (Knowledge OS)

> **Ghi chú đồng bộ:** Lộ trình dưới đây phản ánh cấu trúc 5 Phase thực tế của dự án, đồng bộ 100% với [`docs/PROJECT_STATUS.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/PROJECT_STATUS.md).

---

## TỔNG QUAN CÁC GIAI ĐOẠN (CANONICAL PHASES)

```
[BƯỚC 1: AUDIT & ARCHITECTURE] (Hoàn thành)
       │
[BƯỚC 2: SPEC & ADR] (Hoàn thành: ADR-001 -> ADR-013)
       │
[BƯỚC 3: TEST-FIRST GHERKIN] (Hoàn thành: 26 test suites)
       │
[BƯỚC 4: TRIỂN KHAI & KIỂM CHỨNG TỪNG PHASE]
       ├── PHASE 1:  Local File Picker UX & Zero Binary Ingestion (ADR-011, ADR-012)
       ├── PHASE 2A: Obsidian Open / Export UX Flow (obsidian://, ZIP export)
       ├── PHASE 2B: Google NotebookLM Studio & Source Packaging
       ├── PHASE 3:  Antigravity Research Scholar Handoff Bundle (6 phần chuẩn)
       └── PHASE 4:  Production Readiness, Security Guardrails & Operational Hardening (ADR-013)
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

## BẢNG TỔNG KẾT HỆ THỐNG (SYSTEM BASELINE)

- **Toàn bộ Test Suite:** 26 / 26 test files PASS — 186 / 186 tests PASS (100% GREEN).
- **TypeScript:** `npm run lint` (`tsc --noEmit`) đạt 0 error, 0 warning.
- **Build Production:** `npm run build` tạo bundle sạch trong `dist/`.
