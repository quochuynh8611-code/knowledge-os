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
[BƯỚC 3: TEST-FIRST GHERKIN] (Hoàn thành: 43 test suites / 303 tests)
       │
[BƯỚC 4: TRIỂN KHAI & KIỂM CHỨNG TỪNG PHASE]
       ├── PHASE 1:   Local File Picker UX & Zero Binary Ingestion (ADR-011, ADR-012) [VERIFIED]
       ├── PHASE 2A:  Obsidian Open / Export UX Flow (obsidian://, ZIP export) [VERIFIED]
       ├── PHASE 2B:  Google NotebookLM Studio & Antigravity 2.0 Mediated Workflow [VERIFIED]
       ├── PHASE 2C:  Data Management Modal & Confirmation Gate UI (ADR-009 & Error Separation) [VERIFIED]
       ├── PHASE 3:   Antigravity Research Scholar Handoff Bundle (6 phần chuẩn) [VERIFIED]
       ├── PHASE 4:   Production Readiness, Security Guardrails & Operational Hardening (ADR-013) [VERIFIED]
       ├── PHASE 5:   Evolution Planning & Operational Expansion (ADR-014: 5A-5D) [VERIFIED]
       ├── PHASE 6:   File Library & 3-Tier Backup Architecture (Post-Phase 6a-6k) [VERIFIED]
       ├── PHASE 7:   Rebrand & Focus Reader UX (Phase 7a-7d) [VERIFIED]
       ├── PHASE 8:   Domain Hub Dashboard & Neutral Styling (Phase 8a-8c) [VERIFIED]
       ├── PHASE P0-P4: Knowledge Bridge, Data Layer & Sync Resilience [VERIFIED]
       ├── PHASE P5:  Command Palette Deep Actions & Relevance Ranking [VERIFIED]
       ├── PHASE P8:  Scholar Citation Engine & Matrix Export [VERIFIED]
       ├── PHASE P9-P12: Unified Terminology, TCM Registry & In-App Docs Explorer [VERIFIED]
       ├── PHASE 13:  Learning-First Overview Reframe [VERIFIED]
       ├── PHASE 14:  Focus Domain Priority & Weekly Cadence Bar (Phase 14a-14c) [VERIFIED]
       ├── PHASE 15:  Root Domain Expansion & Starter Topics Enrichment [VERIFIED]
       ├── PHASE 16:  Taxonomy Cleanup, Safe Category Merge & Rehydration Persistence [VERIFIED]
       └── PHASE 17:  Focus Learning Session, Smart Study CTA & Guided Next-Action UX [VERIFIED]
```

---

## CHI TIẾT CÁC GIAI ĐOẠN THỰC THI (IMPLEMENTATION STATUS)

### 🔹 PHASE 1: Local File Picker UX & Tham Chiếu File Cục Bộ (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-011, ADR-012 (Phase 1)
- **Trọng tâm:** Thao tác chọn tệp cục bộ (`filePath`), tự nhận diện loại file (PDF/Audio/Video/Book), giải thích giới hạn sandbox trình duyệt, **Zero Binary Ingestion** (metadata < 2KB).
- **Kiểm chứng:** 6/6 tests PASS trong `tests/unit/resource-form-modal-file-picker.test.tsx`.

### 🔹 PHASE 2A: Obsidian Open / Export UX Flow (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-012 (Phase 2a)
- **Trọng tâm:** Cấu hình Vault Name an toàn, chuẩn hóa thông minh Vault Identifier (hỗ trợ tên Vault, đường dẫn tuyệt đối macOS/Windows, bảo vệ chống nhầm thư mục con `01_Inbox`), mở bài học qua giao thức `obsidian://open`, tạo ghi chú `obsidian://new`, xuất gói ZIP chuẩn cấu trúc Obsidian Vault (`00_Map_Of_Content.md`).
- **Kiểm chứng:** 15/15 `obsidian-lib.test.ts` + 8/8 `obsidian-bridge-integration.test.tsx` PASS (Commit `521291d`, doc `36b1ea9`).

### 🔹 PHASE 2B: Google NotebookLM Studio & Antigravity 2.0 Mediated Workflow (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-012 (Phase 2b)
- **Trọng tâm:**
  - Đóng gói 5 phần chuẩn tài liệu nguồn (Web + Local) phục vụ tải lên NotebookLM.
  - Sinh **Task Prompt chuyên dụng** chỉ thị cho Antigravity 2.0 gọi NotebookLM skill theo 5 loại artifact (`study_guide`, `audio_overview_summary`, `briefing_doc`, `faq`, `source_pack`).
  - Mở rộng metadata artifact (`source: 'antigravity-2.0'`, `target: 'notebooklm'`, `status: 'imported'`) tương thích ngược tuyệt đối với dữ liệu cũ trong LocalStorage.
  - Bộ lọc kiểm tra tính hợp lệ (`validateArtifactImportInput`) và nạp tệp Markdown (`parseArtifactMarkdownFile`) với trích xuất H1 tự động.
  - Thông điệp **Mediated Workflow Disclaimer**: Minh bạch kiến trúc tích hợp trung gian qua Antigravity 2.0, không tuyên bố direct NotebookLM sync API.
- **Kiểm chứng:** 13/13 `notebooklm-lib.test.ts` + 10/10 `notebooklm-studio-integration.test.tsx` PASS (Commit `5a2cc35`, doc `f48a684`).

### 🔹 PHASE 2C: Data Management Modal & Confirmation Gate UI (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-009
- **Trọng tâm:**
  - Hiển thị **Real-time Database Health Badge** thăm dò kết nối & độ trễ máy chủ PostgreSQL.
  - Xuất bản sao lưu máy chủ Semver 2.x có SHA-256 Checksum tất định (`exportBackupSnapshot`).
  - Nạp và xác minh tệp Snapshot phía Client (`BackupSnapshotSchema` và `calculateBackupChecksum`).
  - Bộ chọn chế độ khôi phục: **Gộp dữ liệu (Merge - LWW)** vs **Thay thế toàn bộ (Replace - Destructive)**.
  - **Confirmation Gate:** Bắt buộc nhập chính xác 100% chuỗi ký tự hoa `XÁC NHẬN THAY THẾ` để mở khóa nút Replace.
  - Quy trình khôi phục: Gọi `restoreBackupSnapshot` $\rightarrow$ `reloadAllData()` $\rightarrow$ Xử lý lỗi `rehydrate_failed` bảo toàn in-memory state cũ.
  - **Tách biệt Capability vs Connectivity Error:** Phân định rõ ràng `isOfflineCapability` (`UNSUPPORTED_OFFLINE_OPERATION`) vs `connectionError` (lỗi kết nối máy chủ / `unhealthy`).
- **Kiểm chứng:** 30/30 tests PASS (11/11 `phase2c-data-management-modal-component.test.tsx` + 6/6 `phase2c-data-management-ui.test.tsx` + 8/8 `phase2c-repository-methods.test.ts` + 5/5 `phase2c-health-badge.test.tsx`).

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
- **Kiểm chứng:** 13/13 tests PASS trong `tests/unit/phase-4-production-hardening.test.ts` (Commit `9cfdabe`).

---

### 🔹 PHASE 5: Evolution Planning & Operational Expansion (ĐÃ HOÀN THÀNH)
- **Mã ADR:** ADR-014 (Status: VERIFIED)
- **Mục tiêu:** Định hình và hoàn tất lộ trình tiến hóa cho Knowledge OS từ góc nhìn học giả nghiên cứu chuyên sâu, tối ưu hóa năng suất tra cứu, phân tích liên kết đa chiều và tự động hóa vận hành mà không phá vỡ các rào chắn bất biến hiện có.
- **Phạm vi đã triển khai và kiểm chứng (Implemented & Verified Workstreams):**
  1. *Workstream 5A — Advanced Knowledge Graph & Multi-Hop Traversal Explorer:* Dựng đồ thị in-memory, duyệt $k$-hop có chặn trên, chống lặp, lọc quan hệ ngữ nghĩa, tính bậc kết nối Degree, Focus Mode (`src/lib/knowledgeGraph.ts` + `KnowledgeGraph.tsx`, 10/10 tests PASS, Commits `613deed`, `4ee9f5c`).
  2. *Workstream 5B — Spaced Repetition (SM-2) Study Session Analytics:* Thống kê trực quan đường cong lãng quên Ebbinghaus, phân bố 4 giai đoạn thuần thục kiến thức, dự báo hàng đợi ôn tập 7 ngày, đường cong quên 30 ngày, Retention Dashboard (`src/lib/studyAnalytics.ts` + `StudyProgressView.tsx`, 10/10 tests PASS, Commits `c325e33`, `d912818`).
  3. *Workstream 5C — Automated Snapshot Maintenance & Headless Backup Script:* Module lõi `snapshotManager.ts` và kịch bản CLI `scripts/backup-snapshot.ts` tạo snapshot tự động, ghi nguyên tử (.tmp $\rightarrow$ rename), kiểm tra 2 lớp (Schema + Checksum), dọn dẹp FIFO retention an toàn (`snapshotManager.ts` + `scripts/backup-snapshot.ts`, 10/10 tests PASS, Commit `693abd6`, doc `916b002`).
  4. *Workstream 5D — Scholar Search & Fast Fuzzy Metadata Filter:* Chuẩn hóa chuỗi tiếng Việt/IAST, tìm kiếm hợp nhất 3 collections, xếp hạng độ liên quan, tích hợp Command Palette & Advanced Search (`src/lib/scholarSearch.ts` + `useCommandPalette.ts` + `AdvancedSearch.tsx`, 8/8 tests PASS, Commits `d844530`, `8e09740`, `5ee5d89`).
- **Non-Goals Tuyệt Đối (Phạm vi loại trừ đã bảo vệ):**
  - KHÔNG triển khai đồng bộ 2 chiều (two-way sync) với Obsidian.
  - KHÔNG gọi private API không chính thức của NotebookLM hoặc Antigravity.
  - KHÔNG nhúng binary vào database, state hoặc handoff bundle (Zero Binary Ingestion).
  - KHÔNG thay đổi schema database hoặc phá vỡ tính tương thích ngược của snapshot Semver 2.x mà không có migration script an toàn.
  - KHÔNG triển khai Authentication/Multi-tenancy phức tạp làm mất tính độc lập offline của người dùng cá nhân.
- **Bảo toàn các quyết định Một Chiều (One-Way / Irreversible Decisions):**
  - [!] *Database Schema Migration:* Không phát sinh migration mới, toàn bộ Phase 5, Phase 2b và Phase 2c hoạt động an toàn trên schema hiện hữu và dual-tier repository.
  - [!] *External Auth/Cloud Sync Provider:* Không thay đổi mô hình bảo mật cục bộ sang cloud auth, duy trì quyền riêng tư 100% offline.
- **Quality Gates cho Phase 5:**
  - 100% Spec & ADR được phê duyệt thủ công trước khi viết code.
  - Gherkin Scenarios và Failing Tests được tạo trước cho từng Workstream.
  - Đảm bảo toàn bộ test files duy trì trạng thái 100% PASS.

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Dynamic Root Taxonomy & Soft Topic Visibility (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md) · [`docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature) · [`docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md)
- **Trọng tâm:**
  - **Dynamic Root Taxonomy:** Xóa bỏ hoàn toàn ràng buộc hardcode 2 lĩnh vực "Phật học" & "Huyền học" ở tầng 1. Trục phân cấp cây danh mục sử dụng duy nhất `Category.parentId` (`!parentId` = Root Domain, `parentId === rootId` = Child Category). Cho phép người dùng thêm lĩnh vực mới trực tiếp từ Sidebar.
  - **Soft Topic Visibility:** Bổ sung thuộc tính `visibility: 'active' | 'hidden'` cho Topic kèm migration engine chuẩn hóa an toàn (`normalizeTopics`). Ẩn chủ đề không xóa ghi chú, tài liệu tham khảo hay tiến độ SM-2.
  - **Phân cấp tạo chủ đề:** Giao diện Topic Form tổ chức dropdown theo nhóm danh mục gốc và danh mục con. Cây chủ đề và bộ lọc tìm kiếm cho phép lọc theo lĩnh vực động và chuyển đổi chế độ xem chủ đề đã ẩn / đang hoạt động.
- **Kiểm chứng:** 8/8 tests PASS (4/4 `dynamic-taxonomy-lib.test.ts` + 4/4 `dynamic-taxonomy-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Antigravity Result Ingestion & Tracker Completion Polish (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-antigravity-result-ingestion-tracker-completion.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-antigravity-result-ingestion-tracker-completion.md) · [`docs/gherkin/post-phase5-antigravity-result-ingestion-tracker-completion.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-antigravity-result-ingestion-tracker-completion.feature) · [`docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md)
- **Trọng tâm:**
  - Khép kín vòng quay kết quả nghiên cứu: Khi người dùng nạp (ingest) Artifact vào Artifacts Locker, hàm thuần túy `completeMatchingHandoffJob` tại [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts) tự động chuyển trạng thái Job sang `status: 'success'`.
  - Khớp nối có phân cấp: Ưu tiên khớp chính xác theo `jobId` và `topicId` trước; nếu không có `jobId`, fallback khớp theo `(topicId + artifactType)` với pending job (`queued` hoặc `processing`) gần nhất.
  - Minh bạch ngữ nghĩa: `success` trong Job Tracker biểu thị chính xác "Đã nạp kết quả vào app", hoàn toàn không claim rằng đã auto-dispatch `agy -p` hay chạy ngầm 2 chiều qua cloud. Thao tác sao chép lệnh CLI giữ nguyên 100% trạng thái `queued`.
- **Kiểm chứng:** 8/8 tests PASS (5/5 `antigravity-result-ingestion.test.ts` + 3/3 `notebooklm-result-ingestion-ui.test.tsx`).

---

### 🔹 POST-PHASE 6C MICRO-INCREMENT: Resource Path Normalization & Guided Backup UX Hardening (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6c-resource-path-normalization-and-guided-backup-ux.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6c-resource-path-normalization-and-guided-backup-ux.md) · [`docs/gherkin/post-phase6c-resource-path-normalization-and-guided-backup-ux.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6c-resource-path-normalization-and-guided-backup-ux.feature)
- **Trọng tâm:**
  - Tự động chuẩn hóa đường dẫn tệp cục bộ (`filePath`) khi lưu tài liệu thông qua `normalizeFilePath`, ngăn chặn sai sót định dạng do dấu xuyệt chéo ngược Windows (`\`) hoặc khoảng trắng.
  - Xác thực chặt chẽ chống bỏ trống đường dẫn ở chế độ tệp trên máy trong [`src/components/modals/ResourceFormModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceFormModal.tsx).
  - Cảnh báo sớm theo thời gian thực khi đường dẫn nằm ngoài thư mục thư viện gốc `canonicalLibraryRoot` với callout màu hổ phách.
  - Hiển thị khối đường dẫn tệp cục bộ rõ ràng trong [`src/components/modals/ResourceViewerModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ResourceViewerModal.tsx) kèm nút sao chép 1-click an toàn.
  - Gia cố thông báo phân định tại tab "Xuất JSON" trong [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx), nhắc nhở rõ ràng Snapshot JSON chỉ chứa metadata và yêu cầu sao chép thư mục tệp vật lý.
- **Kiểm chứng:** 7/7 tests PASS (3/3 `resource-path-normalization.test.ts` + 3/3 `resource-form-path-validation.test.tsx` + 1/1 `resource-viewer-path-consistency.test.tsx`).

---

### 🔹 POST-PHASE 6B MICRO-INCREMENT: Operational File Library Setup & Backup Readiness (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6b-operational-file-library-setup.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6b-operational-file-library-setup.md) · [`docs/gherkin/post-phase6b-operational-file-library-setup.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6b-operational-file-library-setup.feature)
- **Trọng tâm:**
  - Cung cấp cho học giả bản thiết kế cấu trúc thư mục lưu trữ vật lý tiêu chuẩn (`Knowledge-Library/` với `PDF/`, `Notes/`, `Attachments/`, `Inbox/`, `Exports/`).
  - Module lõi thuần túy [`src/lib/fileLibraryAudit.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/fileLibraryAudit.ts): Bổ sung `getRecommendedLibraryStructure`, `validateLibraryRootPath`.
  - Giao diện [`ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx): Tích hợp ô hiển thị cấu trúc thư mục chuẩn, nút "Lưu cấu hình" lưu trữ bền vững `knowledge_os_library_root_path` kèm phản hồi trực quan, phân định rõ ràng 5 chỉ số kiểm toán (Có đường dẫn, Đã xác minh, Chưa xác minh trên máy, Thất lạc, Ngoài thư viện), minh bạch giới hạn sandbox trình duyệt web, và hoàn thiện Checklist quy trình sao lưu 3 Trụ Cột + Vault Obsidian.
- **Kiểm chứng:** 17/17 tests PASS (8/8 `file-library-audit.test.ts` + 3/3 `operational-file-library-setup.test.ts` + 3/3 `data-management-backup-manifest-ui.test.tsx` + 3/3 `file-library-backup-checklist-ui.test.tsx`).

---

### 🔹 POST-PHASE 6 MICRO-PHASE: File Library & Backup Architecture for PDF / Notes / Resource Path Audit (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/adr-017-file-library-backup-architecture.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-017-file-library-backup-architecture.md) · [`docs/specs/post-phase6-file-library-backup-architecture.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6-file-library-backup-architecture.md) · [`docs/gherkin/post-phase6-file-library-backup-architecture.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6-file-library-backup-architecture.feature)
- **Trọng tâm:**
  - Thiết lập kiến trúc quản lý kiểm toán đường dẫn tệp vật lý (**File Library & Path Audit Engine**) và xuất bảng kê sao lưu (**File Library Manifest**), phân định rõ ràng 3 Trụ Cột Sao Lưu (App Snapshot JSON + File Manifest JSON + Thư mục tệp vật lý) theo mô hình Filesystem-First + Metadata Catalog.
  - Module lõi thuần túy [`src/lib/fileLibraryAudit.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/fileLibraryAudit.ts): `normalizeFilePath`, `classifyPathRelativeToRoot` (bảo vệ an toàn tiền tố / boundary safety), `auditFileReferences`, `generateFileLibraryManifest`.
  - Tích hợp giao diện tại [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx) với tab **"Kiểm toán tệp & Manifest"** (`data-testid="tab-file-library"`), bảng tổng hợp kiểm toán (tổng tệp tham chiếu, tệp hợp lệ, tệp thất lạc, tệp ngoài thư viện), nút **"Tải Xuống Bảng Kê Manifest (.json)"** (`data-testid="btn-export-file-manifest"`), ô cấu hình `canonicalLibraryRoot` và Checklist quy trình sao lưu 3 thành phần.
  - Rào chắn: Duy trì nghiêm ngặt nguyên tắc **Zero Binary Ingestion** (không lưu BLOB PDF vào PostgreSQL, LocalStorage hay Snapshot JSON).
- **Kiểm chứng:** 11/11 tests PASS (8/8 `file-library-audit.test.ts` + 3/3 `data-management-backup-manifest-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Automated Antigravity NotebookLM Handoff Pipeline (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md) · [`docs/gherkin/post-phase5-automated-antigravity-notebooklm-handoff.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-automated-antigravity-notebooklm-handoff.feature) · [`docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md)
- **Trọng tâm:**
  - Tự động hóa việc chuẩn bị gói hồ sơ bàn giao nghiên cứu từ NotebookLM Studio sang Antigravity 2.0 thông qua giao thức **File Manifest + CLI Headless (`agy -p`)**.
  - Module tiện ích thuần túy [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts) phụ trách sinh mã Job (`job-nlm-...`), cấu trúc file `.agents/handoffs/`, sinh lệnh CLI động qua `buildAntigravityCLICommand`, và tuần tự hóa tệp manifest JSON (`*-manifest.json`).
  - Giao diện [`NotebookLMStudioModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/NotebookLMStudioModal.tsx) tích hợp nút hành động **"Chuẩn bị Handoff Antigravity"**, hiển thị ô xem trước lệnh CLI, nút sao chép 1-click và bảng theo dõi tiến độ UI Tracker.
  - Rào chắn: Không persist thuộc tính `command`, tách biệt rõ rệt UI tracker state vs inter-process manifest, không tự động chạy command trực tiếp từ app browser runtime ở increment này.
- **Kiểm chứng:** 9/9 tests PASS (5/5 `antigravity-pipeline-lib.test.ts` + 4/4 `notebooklm-antigravity-pipeline-ui.test.tsx`).

### 🔹 POST-PHASE 5 MICRO-FIX: Dynamic Dashboard Domain Cards for Root Categories (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-dynamic-dashboard-root-domain-cards.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-dynamic-dashboard-root-domain-cards.md) · [`docs/gherkin/post-phase5-dynamic-dashboard-root-domain-cards.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-dynamic-dashboard-root-domain-cards.feature)
- **Trọng tâm:**
  - Đồng bộ hiển thị động các ô thẻ lĩnh vực (Domain Cards) trên Dashboard Home từ danh sách Root Categories (`Category.parentId === null`), thay thế cho block hardcode 2 thẻ cũ ("Phật học" & "Huyền học").
  - Tích hợp hàm thuần túy `calculateRootCategoryStats` để tính chính xác số chủ đề và % hoàn thành cho từng root domain.
  - Khi click thẻ lĩnh vực, tự động chuyển `activeTab = 'topics'` và lọc đúng `selectedCategoryFilter = root.id`.
  - Bảo lưu nguyên vẹn thẻ hệ thống "Đang học" (Tiến độ học trong tuần & thời gian tích lũy).
- **Kiểm chứng:** 5/5 tests PASS trong `tests/unit/dashboard-root-domain-cards.test.tsx`.

---

### 🔹 POST-PHASE 5 MICRO-FIX: Dynamic Root Taxonomy – Root Topic Filter & Add Domain CTA (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-root-topic-filter-and-add-domain-cta-fix.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-root-topic-filter-and-add-domain-cta-fix.md) · [`docs/gherkin/post-phase5-root-topic-filter-and-add-domain-cta-fix.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-root-topic-filter-and-add-domain-cta-fix.feature)
- **Trọng tâm:**
  - Chuẩn hóa toàn diện logic đếm và lọc chủ đề theo quan hệ phân cấp `Category.parentId` đệ quy qua các pure helpers: `getDescendantCategoryIds`, `resolveRootCategory`, `resolveCategoryFilterToRootId`, `topicBelongsToRootCategory`, `countTopicsForRootCategory`.
  - Khắc phục triệt để hiện tượng Root category hiển thị 0 chủ đề do các chủ đề nằm ở các danh mục con cháu (`cat-tam-tang`, `cat-abhidharma`, `cat-tam-thuc`...).
  - Bổ sung nút CTA "+ Thêm lĩnh vực" rõ ràng ngay tại Header và Filter Toolbar của [`TopicTree.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/topics/TopicTree.tsx).
- **Kiểm chứng:** 14/14 tests PASS (7/7 `dynamic-taxonomy-lib.test.ts` + 7/7 `dynamic-taxonomy-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Dynamic Root Taxonomy & Soft Topic Visibility (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/adr-016-dynamic-root-taxonomy-and-topic-visibility.md) · [`docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-dynamic-root-categories-and-topic-visibility.md) · [`docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-dynamic-root-categories-and-topic-visibility.feature)
- **Trọng tâm:**
  - Xóa bỏ hardcode 2 lĩnh vực ở tầng 1, cho phép người dùng thêm lĩnh vực gốc mới trực tiếp từ giao diện.
  - Tách bạch cấu trúc danh mục theo `Category.parentId` làm trục phân cấp duy nhất.
  - Hỗ trợ ẩn/khôi phục chủ đề (`visibility: 'active' | 'hidden'`) an toàn tuyệt đối, bảo toàn 100% `notes`, `resources`, `links`, và `studyProgress`.
- **Kiểm chứng:** 14/14 tests PASS (7/7 `dynamic-taxonomy-lib.test.ts` + 7/7 `dynamic-taxonomy-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Citation Format Preference Hardening (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-citation-format-preference.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-citation-format-preference.md) · [`docs/gherkin/post-phase5-citation-format-preference.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-citation-format-preference.feature)
- **Trọng tâm:**
  - Tách riêng module [`src/lib/citationPreferences.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationPreferences.ts) quản lý cấu hình client-side (`knowledge_os_citation_format_pref`) với 3 định dạng `apa` | `bibtex` | `markdown`.
  - Cơ chế phòng vệ tự động: Mọi giá trị rỗng, không hợp lệ hoặc parse lỗi từ LocalStorage đều tự động chuyển về `'apa'` mà không ném exception.
  - Đồng bộ hai chiều mượt mà giữa [`CitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/CitationModal.tsx) và [`BatchCitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/BatchCitationModal.tsx), chuyển tab ở modal này được lưu và áp dụng ngay khi mở modal kia.
- **Kiểm chứng:** 11/11 tests PASS (5/5 `citation-format-preference.test.ts` + 6/6 `citation-modal-preference-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Batch Citation Export for Filtered Resources (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-batch-citation-export.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-batch-citation-export.md) · [`docs/gherkin/post-phase5-batch-citation-export.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-batch-citation-export.feature)
- **Trọng tâm:**
  - Mở rộng [`src/lib/citationGenerator.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationGenerator.ts) với hàm `generateBatchCitations(resources, format)` xuất hàng loạt theo 3 định dạng: **APA 7th** (sắp xếp tất định ABC theo tác giả/tiêu đề), **BibTeX** (nối khối `@book`, `@misc`, `@article` bằng `\n\n`), và **Markdown Footnotes** (đánh số thứ tự liên tục `[^1]..[^N]`).
  - Tải tệp tin độc lập client-side: `getBatchCitationDownloadFilename` sinh tên tệp cố định `references.bib`, `references.txt`, `references.md`.
  - Hộp thoại giao diện [`src/components/modals/BatchCitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/BatchCitationModal.tsx) với 3 tab định dạng, ô xem trước mono, nút "Sao chép toàn bộ" (inline feedback) và "Tải tệp".
  - Điểm chạm Toolbar tại [`src/components/resources/ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx): Nút "Xuất danh mục ({count})" kèm rào chắn `disabled` khi `filteredResources.length === 0`.
- **Kiểm chứng:** 11/11 tests PASS (5/5 `citation-batch-generator.test.ts` + 6/6 `batch-citation-modal-ui.test.tsx`).

---

### 🔹 POST-PHASE 5 MICRO-INCREMENT: Scholar Citation Generator (Resource Focus) (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase5-scholar-citation-generator.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase5-scholar-citation-generator.md) · [`docs/gherkin/post-phase5-scholar-citation-generator.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase5-scholar-citation-generator.feature)
- **Trọng tâm:**
  - Module tiện ích thuần túy [`src/lib/citationGenerator.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationGenerator.ts) sinh trích dẫn học thuật đa định dạng: **APA 7th Edition**, **BibTeX** (`@book`, `@article`, `@misc`), và **Markdown Footnote** (`[^1]`).
  - Xử lý Fallback thông minh: Tự động phát hiện năm từ `notes`/`title`/`createdAt`, đẩy `title` lên trước khi khuyết tác giả trong APA, và gán `[Khuyết danh]` trong BibTeX.
  - Sinh Citation Key tất định không dấu chuẩn ASCII: `${authorSlug}_${year}_${titleSlug}`.
  - Hộp thoại giao diện [`src/components/modals/CitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/CitationModal.tsx) với 3 tab định dạng, ô xem trước mono và nút Sao Chép phản hồi tại chỗ tức thì (inline feedback, không dùng toast system ngoài).
  - Điểm chạm kích hoạt tinh gọn: Nút "Trích dẫn" (icon Quote) tích hợp trực tiếp trên thẻ tài liệu tại [`src/components/resources/ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx).
- **Kiểm chứng:** 12/12 tests PASS (8/8 `citation-generator-lib.test.ts` + 4/4 `citation-modal-ui.test.tsx`).

---

### 🔹 POST-PHASE 6D MICRO-INCREMENT: Note Source Path Consistency & Unified Reference Audit (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6d-note-source-path-consistency-and-unified-reference-audit.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6d-note-source-path-consistency-and-unified-reference-audit.md) · [`docs/gherkin/post-phase6d-note-source-path-consistency-and-unified-reference-audit.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6d-note-source-path-consistency-and-unified-reference-audit.feature)
- **Trọng tâm:**
  - Bổ sung `sourcePath?: string` vào mô hình `Note` đảm bảo tương thích ngược 100%.
  - Tích hợp chuẩn hóa `normalizeFilePath` và cảnh báo ngoài thư viện gốc `canonicalLibraryRoot` trong `NoteFormModal.tsx`.
  - Hiển thị đường dẫn tệp nguồn và nút 1-click copy path (`Chép path`) trên thẻ ghi chú trong `NotesManager.tsx`.
  - Hợp nhất kiểm toán trong Bảng Kê Manifest gồm cả `resource` và `note` theo cùng định dạng chuẩn hóa.
  - Tăng cường thông điệp phân định phạm vi sao lưu Snapshot JSON vs tệp Markdown (.md) trên ổ đĩa vật lý trong `ExportImportModal.tsx`.
- **Kiểm chứng:** 5/5 tests PASS (2/2 `note-source-path-normalization.test.ts` + 1/1 `unified-reference-manifest.test.ts` + 2/2 `note-reference-ui.test.tsx`).

---

### 🔹 POST-PHASE 6E MICRO-INCREMENT: Backup Verification & Restore Drill (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6e-backup-verification-and-restore-drill.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6e-backup-verification-and-restore-drill.md) · [`docs/gherkin/post-phase6e-backup-verification-and-restore-drill.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6e-backup-verification-and-restore-drill.feature)
- **Trọng tâm:**
  - Module thuần túy [`src/lib/backupVerification.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/backupVerification.ts) đánh giá mức độ sẵn sàng sao lưu 3 lớp (`calculateBackupReadiness`) và thẩm định snapshot (`inspectSnapshotPayload`, `validateRestoreCandidate`, `buildRestorePreview`).
  - Thực hiện diễn tập khôi phục mô phỏng thuần túy trong bộ nhớ (`runRestoreDrill`), cam kết 100% không làm biến đổi hay ghi đè dữ liệu đang chạy.
  - Tích hợp giao diện tại [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx): Thẻ diễn tập khôi phục xem trước biến động thực thể (`simulatedImpact`) cùng rào chắn xác nhận tường minh trước khi nạp dữ liệu.
- **Kiểm chứng:** 10/10 tests PASS (3/3 `backup-readiness.test.ts` + 5/5 `restore-drill.test.ts` + 2/2 `restore-preview-ui.test.tsx`).

### 🔹 POST-PHASE 6F MICRO-INCREMENT: Restore Evidence Pack & Operator Runbook (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6f-restore-evidence-pack-and-operator-runbook.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6f-restore-evidence-pack-and-operator-runbook.md) · [`docs/gherkin/post-phase6f-restore-evidence-pack-and-operator-runbook.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6f-restore-evidence-pack-and-operator-runbook.feature)
- **Sổ tay vận hành:** [`docs/runbooks/backup-restore-operator-runbook.vi.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/runbooks/backup-restore-operator-runbook.vi.md)
- **Trọng tâm:**
  - Bộ fixtures kiểm thử độc lập tại `tests/fixtures/backup/` gồm: `valid-snapshot.json` (Semver 2.x checksum chính xác), `legacy-snapshot.json` (tương thích ngược v1.x), `malformed-snapshot.json` (từ chối an toàn), và `manifest-mixed-statuses.json` (đầy đủ 4 trạng thái).
  - Sổ tay vận hành chuẩn mực bằng tiếng Việt `backup-restore-operator-runbook.vi.md` hướng dẫn chi tiết quy trình sao lưu 3 lớp, diễn tập khôi phục trong bộ nhớ (Restore Drill), rào chắn an toàn, xử lý bất thường và checklist ký xác nhận.
  - Bảo đảm cách ly tuyệt đối: Fixtures không bao giờ bị import vào mã nguồn runtime production (`src/`).
- **Kiểm chứng:** 11/11 tests PASS (4/4 `restore-evidence-fixtures.test.ts` + 2/2 `manifest-status-fixtures.test.ts` + 5/5 `operator-runbook-contract.test.ts`).

### 🔹 POST-PHASE 6G MICRO-INCREMENT: Operator Restore Drill Readiness (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6g-operator-restore-drill-readiness.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6g-operator-restore-drill-readiness.md) · [`docs/gherkin/post-phase6g-operator-restore-drill-readiness.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6g-operator-restore-drill-readiness.feature)
- **Trọng tâm:**
  - Chuẩn hóa 5 giai đoạn Operator Journey và 4 Safety Gates (Gate 1 Checksum, Gate 2 In-Memory Dry Run, Gate 3 Confirmation Phrase, Gate 4 Rehydration Preserving).
  - Bổ sung interface `OperatorDrillReadinessReport` và helper `evaluateRestoreDrillReadiness` trong `src/lib/backupVerification.ts` để tổng hợp báo cáo đánh giá mức độ sẵn sàng kèm bản ghi bằng chứng.
  - Bảo đảm tính bất biến (Immutability): 100% không làm biến đổi hay ghi đè live state khi chạy diễn tập khôi phục.
- **Kiểm chứng:** 7/7 tests PASS trong `operator-restore-drill-readiness.test.ts`.

### 🔹 POST-PHASE 6H MICRO-INCREMENT: Restore Drill Evidence Capture (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6h-restore-drill-evidence-capture.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6h-restore-drill-evidence-capture.md) · [`docs/gherkin/post-phase6h-restore-drill-evidence-capture.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6h-restore-drill-evidence-capture.feature)
- **Commit:** `4973acc`
- **Trọng tâm:**
  - Cung cấp pure helper `captureRestoreDrillEvidence(readinessReport, options)` và interface `RestoreDrillEvidenceRecord`, `RestoreDrillEvidenceCaptureOptions` trong `src/lib/backupVerification.ts`.
  - Đóng gói bằng chứng kiểm toán bất biến, phân loại trạng thái ký duyệt (`operatorSignOffStatus`: `pending` / `signed_off` / `rejected`), ghi chú vận hành (`operatorNotes`) và đảm bảo cách ly tham chiếu (Deep Copy).
  - 100% không làm thay đổi live state, không có tác dụng phụ DB/API/storage và không kích hoạt live restore.
- **Kiểm chứng:** 11/11 tests PASS trong [`tests/unit/restore-drill-evidence-capture.test.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/restore-drill-evidence-capture.test.ts).

### 🔹 POST-PHASE 6I MICRO-INCREMENT: Restore Drill Evidence Serialization & Audit Validation (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/post-phase6i-restore-drill-evidence-serialization-audit-validation.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/post-phase6i-restore-drill-evidence-serialization-audit-validation.md) · [`docs/gherkin/post-phase6i-restore-drill-evidence-serialization-audit-validation.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/post-phase6i-restore-drill-evidence-serialization-audit-validation.feature)
- **Commit:** `5490ac4`
- **Trọng tâm:**
  - Cung cấp pure helpers trong `src/lib/backupVerification.ts`: `serializeRestoreDrillEvidenceJSON`, `formatRestoreDrillEvidenceFilename`, `validateRestoreDrillEvidenceJSON`.
  - Tuần tự hóa JSON tất định (deterministic key ordering) với chế độ formatted và compact; sinh tên file an toàn chống tấn công Path Traversal (`knowledge-os-restore-drill-evidence-YYYY-MM-DD-<safeId>.json`).
  - Thẩm định tính toàn vẹn của tệp bằng chứng JSON cũ độc lập, an toàn trước chuỗi JSON hỏng hoặc sai schema mà không gây side-effects.
- **Kiểm chứng:** 9/9 tests PASS trong [`tests/unit/restore-drill-evidence-serialization.test.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/tests/unit/restore-drill-evidence-serialization.test.ts).

---

### 🔹 PHASE 14C: Weekly Learning Cadence Bar & Habit Formation Tracking (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/phase-14c-weekly-learning-cadence.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-14c-weekly-learning-cadence.md) · [`docs/gherkin/phase-14c-weekly-learning-cadence.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-14c-weekly-learning-cadence.feature)
- **Trọng tâm:**
  - Module thuần túy `src/lib/learningStateSelectors.ts`: `getWeeklyLearningCadence` tính toán 7 ngày trong tuần ISO (T2 $\rightarrow$ CN) dựa trên `studyProgress.lastStudied`, phân loại 4 cấp bậc nhịp học (`starting`, `building`, `consistent`, `strong`) và loại trừ các chủ đề ẩn.
  - Component UI [`WeeklyCadenceBar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/WeeklyCadenceBar.tsx): 7 ô ngày mini với chỉ báo hôm nay (`isToday`), ngày đã học (`isActive`) và huy hiệu tổng kết số ngày/chủ đề ngay dưới Hero.
- **Kiểm chứng:** 15/15 tests PASS (`weekly-cadence-selector.test.ts` 8/8 + `weekly-cadence-bar.test.tsx` 7/7).

---

### 🔹 PHASE 15: Root Domain Expansion & Starter Topics Enrichment (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/phase-15-root-domain-expansion.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-15-root-domain-expansion.md) · [`docs/gherkin/phase-15-root-domain-expansion.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-15-root-domain-expansion.feature)
- **Trọng tâm:**
  - Khởi tạo 2 lĩnh vực gốc mới: Đông Y (`cat-root-dong-y`) và Ngôn Ngữ (`cat-root-ngon-ngu`) với các chủ đề mẫu chất lượng cao.
  - Tối ưu hóa thứ tự ưu tiên hiển thị lĩnh vực trọng tâm trên Dashboard Overview.
- **Kiểm chứng:** 8/8 tests PASS (`phase15a-root-domain-expansion.test.tsx` 4/4 + `phase15b-starter-topics-enrichment.test.tsx` 4/4).

---

### 🔹 PHASE 16: Taxonomy Cleanup, Safe Category Merge & Rehydration Persistence (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/phase-16-taxonomy-cleanup-and-safe-merge.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-16-taxonomy-cleanup-and-safe-merge.md) · [`docs/gherkin/phase-16-taxonomy-cleanup-and-safe-merge.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-16-taxonomy-cleanup-and-safe-merge.feature)
- **Trọng tâm:**
  - Tiện ích thuần túy `mergeCategoryData` trong [`src/lib/taxonomyMigration.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/taxonomyMigration.ts) gộp an toàn các danh mục kinh tế cũ sang `cat-root-kinh-te-tai-chinh`, tái gán topic & subcategory mà không làm mất ghi chú, tài liệu hay tiến độ SM-2.
  - Action `mergeCategories` trong `DataContext.tsx` kết nối tầng lưu trữ kép (`syncHydrate` + `deleteCategory`).
  - Khóa rào chắn an toàn UI trên `TopicTree.tsx` chuyển hướng thao tác xóa thành xác nhận gộp an toàn.
  - Gia cố persistence rehydration chống hồi sinh category và đảm bảo `resetToDefaultData()` dọn sạch toàn bộ legacy economy IDs.
- **Kiểm chứng:** 27/27 tests PASS (`taxonomy-migration.test.ts` 6/6 + `taxonomy-merge-safety.test.tsx` 21/21).

---

### 🔹 PHASE 17: Focus Learning Session, Smart Study CTA & Guided Next-Action UX (ĐÃ HOÀN THÀNH)
- **Tài liệu đặc tả:** [`docs/specs/phase-17-focus-learning-session-and-next-action.md`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/specs/phase-17-focus-learning-session-and-next-action.md) · [`docs/gherkin/phase-17-focus-learning-session-and-next-action.feature`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/docs/gherkin/phase-17-focus-learning-session-and-next-action.feature)
- **Trọng tâm:**
  - **Phase 17A (Commit `330fcaf`):**
    - Thanh phiên học nổi [`ActiveLearningSessionBar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/ActiveLearningSessionBar.tsx) theo dõi trạng thái chạy/tạm dừng không che khuất màn hình học.
    - Modal đúc kết [`SessionWrapupModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/SessionWrapupModal.tsx) hỗ trợ nhập nhanh ghi chú đúc kết và cập nhật slider tiến độ.
    - `resumeStudyTimer` trong `StudyTimerContext` cho phép tiếp tục phiên mà không reset `timerSeconds`.
  - **Phase 17B (Commit `fd0f376`):**
    - Tinh giản thanh công cụ `TopicDetail.tsx` xuống 4 hành động chính: `StudyCTA`, `Ôn tập SM-2`, `ResearchToolsDropdown` (gom 4 công cụ nâng cao), `Chỉnh sửa`.
    - Component [`StudyCTA.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/topics/StudyCTA.tsx) 5 trạng thái ngữ cảnh kèm **Hard Guard** chống chuyển chủ đề ngầm làm mất session đang chạy.
    - Kết nối `onResumeStudy` với `resumeStudyTimer()`.
    - Dòng gợi ý ngữ cảnh [`NextActionStrip.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/topics/NextActionStrip.tsx) dưới thanh trượt tiến độ.
- **Kiểm chứng:** 37/37 tests PASS (`phase17-learning-session-flow.test.tsx` 19/19 + `phase17b-topic-detail-toolbar.test.tsx` 18/18).

---

## 📋 QUYẾT ĐỊNH TRÌ HOÃN & BACKLOG TINH GỌN (INTENTIONALLY DEFERRED BACKLOG)

Dưới đây là các hạng mục đã được nghiên cứu, cân nhắc và **chủ động trì hoãn hoặc quyết định không triển khai (Intentionally Deferred / Rejected by Design)** nhằm bảo toàn tính ổn định và kiến trúc tối giản:

1. **DEF-01: Auto-Sanitize Taxonomy on App Load** $\rightarrow$ **Trì hoãn (Deferred)**: Tránh side-effects ngầm trong luồng hydration. Giữ cơ chế passive hydration kết hợp UI Guard và người dùng xác nhận gộp tường minh.
2. **DEF-02: Rigid Root Domain Count Enforcement** $\rightarrow$ **Bác bỏ theo thiết kế (Rejected by Design)**: Vi phạm kiến trúc phân loại động (ADR-016), làm mất khả năng thêm/sửa lĩnh vực tùy biến.
3. **DEF-03: Direct CLI Auto-Dispatch (`agy -p`) from Browser** $\rightarrow$ **Trì hoãn (Deferred)**: Tránh rủi ro command injection và bảo vệ sandbox trình duyệt. Duy trì giao thức Manifest Bàn Giao Trung Gian (ADR-015).
4. **DEF-04: Direct Cloud Sync / Headless Scraping for Google NotebookLM** $\rightarrow$ **Trì hoãn (Deferred)**: Tránh API không chính thức dễ gãy vỡ, bảo vệ quyền riêng tư dữ liệu cục bộ. Duy trì quy trình đóng gói Source Pack (ADR-012).
5. **DEF-05: Direct Raw Binary Ingestion (PDF / Media BLOB Storage)** $\rightarrow$ **Bác bỏ theo thiết kế (Rejected by Design)**: Tránh phình to cơ sở dữ liệu và lỗi tràn bộ nhớ (OOM). Duy trì kiến trúc Filesystem-First + Metadata Catalog (ADR-011, ADR-017).

---

## 🚀 BƯỚC TIẾP THEO HỢP LOGIC (LOGICAL NEXT STEPS)

1. **Duy Trì & Giám Sát Vận Hành (Operational Maintenance):**
   - Vận hành snapshot sao lưu định kỳ qua kịch bản headless CLI `npm run snapshot:create`.
   - Giám sát độ trễ và tính khả dụng của cơ sở dữ liệu qua Health Badge thời gian thực.
2. **Mở Rộng Cơ Sở Tri Thức (Knowledge Domain Expansion):**
   - Tận dụng hệ thống phân cấp động để khởi tạo các lĩnh vực mới (Triết học Đông Tây, Khoa học Nhận thức, Y học Cổ truyền).
   - Tiếp tục tuân thủ tuyệt đối các rào chắn kiến trúc: **Zero Binary Ingestion**, **Dual-Tier Resilience**, **Deterministic Checksum**, và **Confirmation Gate**.

---

## BẢNG TỔNG KẾT HỆ THỐNG (SYSTEM BASELINE)

- **Baseline lịch sử (trước Phase 6j):** 65 / 65 test files PASS — 399 / 399 tests PASS (100% GREEN).
- **Toàn bộ Test Suite hiện hành:** ✅ **195 / 195 test files PASS — 1241 / 1241 tests PASS (100% GREEN)**.
- **TypeScript:** `npm run lint` (`tsc --noEmit`) đạt 0 error, 0 warning.
- **Build Production:** `npm run build` tạo bundle sạch trong `dist/`.

