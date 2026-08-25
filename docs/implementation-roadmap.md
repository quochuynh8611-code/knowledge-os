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
       ├── PHASE 1:  Local File Picker UX & Zero Binary Ingestion (ADR-011, ADR-012) [VERIFIED]
       ├── PHASE 2A: Obsidian Open / Export UX Flow (obsidian://, ZIP export) [VERIFIED]
       ├── PHASE 2B: Google NotebookLM Studio & Antigravity 2.0 Mediated Workflow [VERIFIED]
       ├── PHASE 2C: Data Management Modal & Confirmation Gate UI (ADR-009 & Error Separation) [VERIFIED]
       ├── PHASE 3:  Antigravity Research Scholar Handoff Bundle (6 phần chuẩn) [VERIFIED]
       ├── PHASE 4:  Production Readiness, Security Guardrails & Operational Hardening (ADR-013) [VERIFIED]
       ├── PHASE 5:  Evolution Planning & Operational Expansion (ADR-014) [VERIFIED]
       └── POST-PHASE 5: Scholar Citation, Batch Export, Preference, Antigravity Pipeline & Result Ingestion [VERIFIED]
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

## 🚀 BƯỚC TIẾP THEO HỢP LOGIC (LOGICAL NEXT STEPS)

1. **Duy Trì & Giám Sát Vận Hành (Operational Maintenance):**
   - Vận hành snapshot sao lưu định kỳ qua kịch bản headless CLI `npm run snapshot:create`.
   - Giám sát độ trễ và tính khả dụng của cơ sở dữ liệu qua Health Badge thời gian thực.
2. **Mở Rộng Cơ Sở Tri Thức (Knowledge Domain Expansion):**
   - Tận dụng hệ thống phân cấp động để khởi tạo các lĩnh vực mới (Triết học Đông Tây, Khoa học Nhận thức, Y học Cổ truyền).
   - Tiếp tục tuân thủ tuyệt đối các rào chắn kiến trúc: **Zero Binary Ingestion**, **Dual-Tier Resilience**, **Deterministic Checksum**, và **Confirmation Gate**.

---

## BẢNG TỔNG KẾT HỆ THỐNG (SYSTEM BASELINE)

- **Toàn bộ Test Suite:** ✅ **45 / 45 test files PASS — 311 / 311 tests PASS (100% GREEN)**.
- **TypeScript:** `npm run lint` (`tsc --noEmit`) đạt 0 error, 0 warning.
- **Build Production:** `npm run build` tạo bundle sạch trong `dist/`.
