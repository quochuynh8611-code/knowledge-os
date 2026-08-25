# 📊 Knowledge OS — Bảng Điều Hành Trạng Thái Dự Án (Project Status & Roadmap)

> **Cập nhật lần cuối:** 2026-08-25
> **Người phụ trách:** Staff Software Engineer / Technical Architect
> **Trạng thái tổng thể:** 🟢 **PHASE 1–5 FULLY IMPLEMENTED & PRODUCTION-READY · SCHOLAR CITATION, BATCH EXPORT, PREFERENCE & ANTIGRAVITY PIPELINE (POST-PHASE 5 MICRO-INCREMENTS) VERIFIED**

---

## 🎯 1. Trọng tâm Hiện tại (Current Objective)

- **Trạng thái thực thi:** **TOÀN BỘ PHASE 1 ĐẾN PHASE 5 ĐÃ HOÀN TẤT & HỆ THỐNG MỞ RỘNG TIỆN ÍCH HỌC GIẢ (311 TESTS GREEN 100%)**.
- **Tiến độ Phase 5 (Evolution Planning & Operational Expansion) — Hoàn tất 4/4 Workstreams:**
  - **Workstream 5D (Scholar Search & Fast Fuzzy Metadata Filter):** Đã hoàn tất 100% và kiểm chứng qua 3 mốc commit (`d844530`, `8e09740`, `5ee5d89`, doc `1e749af`).
  - **Workstream 5A (Advanced Knowledge Graph & Multi-Hop Traversal Explorer):** Đã hoàn tất 100% và kiểm chứng qua 2 mốc commit (`613deed`, `4ee9f5c`, doc `a89111e`).
  - **Workstream 5B (Spaced Repetition SM-2 Study Session Analytics & Retention Dashboard):** Đã hoàn tất 100% và kiểm chứng qua 2 mốc commit (`c325e33`, `d912818`, doc `dcdf3a8`).
  - **Workstream 5C (Automated Snapshot Maintenance & Headless Backup Script):** Đã hoàn tất 100% qua module lõi `snapshotManager.ts`, kịch bản CLI `scripts/backup-snapshot.ts` và 10/10 test cases (`693abd6`, doc `916b002`).
- **Gia Cố Giao Thức & Tiện Ích Khảo Cứu Mới Nhất (Recent Increments & Hardening Checkpoints):**
  - **Post-Phase 6g Micro-Increment: Operator Restore Drill Readiness:**
    - **Mục tiêu:** Chuẩn hóa toàn diện 5 giai đoạn trong hành trình diễn tập của người vận hành (Operator Journey), kiểm chứng 4 rào chắn an toàn (Gate 1 Checksum & Schema, Gate 2 In-Memory Dry Run, Gate 3 Confirmation Phrase, Gate 4 Rehydration State Preserving), và cung cấp helper thuần túy `evaluateRestoreDrillReadiness` để tự động tổng hợp chứng chỉ đánh giá mức độ sẵn sàng diễn tập kèm bản ghi bằng chứng có thể tái lập.
    - **Giải pháp kỹ thuật:**
      - Module thuần túy `src/lib/backupVerification.ts`: Bổ sung interface `OperatorDrillReadinessReport` và helper `evaluateRestoreDrillReadiness(payload, currentState, options)`.
      - Kiểm chứng 100% tính bất biến (Immutability) của live state: Hàm `runRestoreDrill` và `evaluateRestoreDrillReadiness` không gây ra bất kỳ tác dụng phụ (side-effects) nào lên bộ nhớ ứng dụng hay storage.
    - **Kiểm thử:** 7/7 tests PASS trong test suite mới `operator-restore-drill-readiness.test.ts`.
  - **Post-Phase 6f Micro-Increment: Restore Evidence Pack & Operator Runbook:**
    - **Mục tiêu:** Đóng gói toàn diện quy trình sao lưu và phục hồi thành Gói Bằng Chứng Khôi Phục (**Restore Evidence Pack**) chuẩn hóa gồm 4 fixture JSON (`valid-snapshot.json`, `legacy-snapshot.json`, `malformed-snapshot.json`, `manifest-mixed-statuses.json`) và Sổ Tay Vận Hành (**Operator Runbook**) chi tiết bằng tiếng Việt (`docs/runbooks/backup-restore-operator-runbook.vi.md`) kèm checklist ký xác nhận.
    - **Giải pháp kỹ thuật:**
      - Thiết lập thư mục fixture kiểm thử độc lập tại `tests/fixtures/backup/` kèm tài liệu hướng dẫn `README.md`.
      - Biên soạn Runbook vận hành chuẩn mực `backup-restore-operator-runbook.vi.md` phân định rành mạch 3 lớp sao lưu, quy trình diễn tập Restore Drill, rào chắn an toàn và kế hoạch rollback.
      - Kiểm chứng hợp đồng kỹ thuật và bảo đảm cách ly hoàn toàn khỏi production bundle (`src/` không import fixtures).
    - **Kiểm thử:** 11/11 tests PASS trong 3 test suites mới (`restore-evidence-fixtures.test.ts`, `manifest-status-fixtures.test.ts`, `operator-runbook-contract.test.ts`).
  - **Post-Phase 6e Micro-Increment: Backup Verification & Restore Drill:**
    - **Mục tiêu:** Thẩm định tính đầy đủ của bộ sao lưu 3 lớp (App Snapshot JSON, File Manifest JSON, Physical File Set), cung cấp cơ chế diễn tập khôi phục mô phỏng thuần túy trong bộ nhớ (**Restore Drill - In-Memory Dry Run**) không làm biến đổi hay ghi đè dữ liệu thật, hỗ trợ xem trước tác động thực thể và gia cố rào chắn xác nhận tường minh trước khi nạp dữ liệu.
    - **Giải pháp kỹ thuật:**
      - Module lõi thuần túy `src/lib/backupVerification.ts`: `inspectSnapshotPayload`, `inspectManifestPayload`, `calculateBackupReadiness`, `validateRestoreCandidate`, `buildRestorePreview`, `runRestoreDrill`.
      - Mở rộng `NoteSchema` trong `src/lib/validation.ts` với `sourcePath: z.string().optional()`.
      - Giao diện `ExportImportModal.tsx`: Tích hợp Báo cáo mức độ sẵn sàng sao lưu 3 lớp và thẻ mô phỏng Diễn Tập Khôi Phục hiển thị biến động thực thể dự kiến (`simulatedImpact`) cùng thông điệp bảo đảm an toàn dữ liệu.
    - **Kiểm thử:** 10/10 tests PASS trong 3 test suites mới (`backup-readiness.test.ts`, `restore-drill.test.ts`, `restore-preview-ui.test.tsx`).
  - **Post-Phase 6d Micro-Increment: Note Source Path Consistency & Unified Reference Audit:**
    - **Mục tiêu:** Đưa quản lý đường dẫn tệp nguồn ghi chú (`Note.sourcePath`) lên cùng chuẩn vận hành với tài liệu (`Resource.filePath`), tích hợp kiểm toán tệp hợp nhất trong Bảng Kê Manifest và bổ sung tiện ích hiển thị/sao chép đường dẫn trên thẻ ghi chú.
    - **Giải pháp kỹ thuật:**
      - `src/types/index.ts`: Mở rộng thuộc tính tùy chọn `sourcePath?: string` trên interface `Note` đảm bảo tương thích ngược 100%.
      - `src/components/modals/NoteFormModal.tsx`: Thêm trường nhập `sourcePath`, chuẩn hóa qua `normalizeFilePath`, cảnh báo thời gian thực khi tệp nằm ngoài `canonicalLibraryRoot`.
      - `src/components/notes/NotesManager.tsx`: Hiển thị đường dẫn tệp nguồn mono trên thẻ ghi chú kèm nút sao chép 1-click `Chép path` (`copiedNoteId`).
      - `src/lib/fileLibraryAudit.ts`: Duyệt kiểm toán ghi chú nhất quán, không tính trùng `unverifiedCount` khi `outsideLibraryCount` được ghi nhận trong browser sandbox mode.
      - `src/components/modals/ExportImportModal.tsx`: Tăng cường callout phân định rõ: App Snapshot JSON bảo toàn toàn bộ nội dung ghi chú trong ứng dụng, trong khi tệp `.md` trên ổ đĩa vật lý cần sao chép cùng thư mục tệp.
    - **Kiểm thử:** 5/5 tests PASS trong 3 test suites mới (`note-source-path-normalization.test.ts`, `unified-reference-manifest.test.ts`, `note-reference-ui.test.tsx`).
  - **Post-Phase 6c Micro-Increment: Resource Path Normalization & Guided Backup UX Hardening:**
    - **Mục tiêu:** Tự động chuẩn hóa đường dẫn tệp cục bộ (`filePath`) khi lưu tài liệu, xác thực chặt chẽ chống đường dẫn rỗng ở chế độ tệp trên máy, cảnh báo sớm khi tệp nằm ngoài thư viện gốc `canonicalLibraryRoot`, bổ sung khối hiển thị đường dẫn tệp chuẩn hóa kèm nút sao chép 1-click trong `ResourceViewerModal`, và tăng cường thông báo phân định rõ ràng trên giao diện xuất Snapshot JSON.
    - **Giải pháp kỹ thuật:**
      - `ResourceFormModal.tsx`: Tích hợp `normalizeFilePath` khi submit, kiểm tra `isPathOutsideRoot` theo thời gian thực và hiển thị banner cảnh báo sao lưu màu hổ phách, hiển thị banner lỗi `formError` khi để trống `filePath`.
      - `ResourceViewerModal.tsx`: Hiển thị khối `Đường dẫn tệp cục bộ trên máy` với font mono, nút sao chép 1-click `Sao chép đường dẫn` an toàn với môi trường thiếu clipboard.
      - `ExportImportModal.tsx`: Tăng cường callout cảnh báo tại tab "Xuất JSON", nêu rõ bản sao lưu Snapshot JSON chỉ chứa metadata và yêu cầu sao chép thư mục tệp vật lý.
    - **Kiểm thử:** 7/7 tests PASS trong 3 test suites mới (`resource-path-normalization.test.ts`, `resource-form-path-validation.test.tsx`, `resource-viewer-path-consistency.test.tsx`).
  - **Post-Phase 6b Micro-Increment: Operational File Library Setup & Backup Readiness:**
    - **Mục tiêu:** Cung cấp cho học giả cấu trúc thư mục lưu trữ vật lý tiêu chuẩn (`Knowledge-Library/` $\rightarrow$ `PDF/`, `Notes/`, `Attachments/`, `Inbox/`, `Exports/`), hoàn thiện form lưu cấu hình thư mục gốc `canonicalLibraryRoot` với phản hồi trực quan, phân định rõ ràng 5 chỉ số kiểm toán, và hoàn thiện Checklist quy trình sao lưu 3 Trụ Cột + Vault Obsidian với cảnh báo nghiêm ngặt khi chưa sao lưu thư mục tệp thật.
    - **Giải pháp kỹ thuật:**
      - Module lõi thuần túy `src/lib/fileLibraryAudit.ts`: Bổ sung `getRecommendedLibraryStructure`, `validateLibraryRootPath`.
      - Giao diện `ExportImportModal.tsx`: Hiển thị cây thư mục chuẩn, nút "Lưu cấu hình", cảnh báo minh bạch giới hạn sandbox trình duyệt web (không báo `exists` giả mạo), và checklist sao lưu toàn diện.
    - **Kiểm thử:** 17/17 tests PASS (11 test cases unit & UI từ Phase 6a + 6 test cases mới từ Phase 6b).
  - **Post-Phase 6 Micro-Phase: File Library & Backup Architecture for PDF / Notes / Resource Path Audit (ADR-017):**
    - **Mục tiêu:** Thiết lập kiến trúc quản lý kiểm toán đường dẫn tệp vật lý (**File Library & Path Audit Engine**) và xuất bảng kê sao lưu (**File Library Manifest**), phân định rõ ràng 3 Trụ Cột Sao Lưu (App Snapshot JSON + File Manifest JSON + Thư mục tệp vật lý) theo mô hình Filesystem-First + Metadata Catalog.
    - **Giải pháp kỹ thuật:**
      - Module lõi thuần túy `src/lib/fileLibraryAudit.ts`: `normalizeFilePath`, `classifyPathRelativeToRoot` (bảo vệ an toàn tiền tố / boundary safety), `auditFileReferences`, `generateFileLibraryManifest`.
      - Tích hợp giao diện tại `ExportImportModal.tsx` với tab **"Kiểm toán tệp & Manifest"** (`data-testid="tab-file-library"`), bảng tổng hợp kiểm toán (tổng tệp tham chiếu, tệp hợp lệ, tệp thất lạc, tệp ngoài thư viện), nút **"Tải Xuống Bảng Kê Manifest (.json)"** (`data-testid="btn-export-file-manifest"`), ô cấu hình `canonicalLibraryRoot` và Checklist quy trình sao lưu 3 thành phần.
      - Duy trì nghiêm ngặt nguyên tắc **Zero Binary Ingestion** (không lưu BLOB PDF vào PostgreSQL, LocalStorage hay Snapshot JSON).
    - **Kiểm thử:** 11/11 tests PASS (8/8 pure lib + 3/3 UI integration).
  - **Post-Phase 5 Micro-Fix: Dynamic Dashboard Domain Cards for Root Categories:**
    - **Mục tiêu:** Đồng bộ hiển thị động các ô thẻ lĩnh vực (Domain Cards) trên Dashboard Home từ danh sách Root Categories (`Category.parentId === null`), thay thế cho block hardcode 2 thẻ cũ ("Phật học" & "Huyền học").
    - **Giải pháp kỹ thuật:**
      - Sử dụng hàm thuần túy `calculateRootCategoryStats` trong `src/lib/taxonomyMigration.ts` để tính số lượng chủ đề và % hoàn thành cho mỗi root domain theo toàn bộ danh mục con cháu.
      - Render động `.map()` trên `getRootCategories(categories)` trong `DashboardHome.tsx`.
      - Khi click thẻ lĩnh vực, tự động chuyển `activeTab = 'topics'` và thiết lập `selectedCategoryFilter = root.id`.
      - Bảo lưu thẻ hệ thống "Đang học" (System Progress) như một thẻ tổng quan riêng biệt.
    - **Kiểm thử:** 5/5 tests PASS trong `tests/unit/dashboard-root-domain-cards.test.tsx`.
  - **Post-Phase 5 Micro-Fix: Dynamic Root Taxonomy – Root Topic Filter & Add Domain CTA:**
    - **Mục tiêu:** Khắc phục triệt để hiện tượng Root categories (Phật Học, Huyền Học) hiển thị 0 chủ đề do các chủ đề nằm ở các danh mục con cháu (`cat-tam-tang`, `cat-abhidharma`, `cat-tam-thuc`...), chuẩn hóa lọc và đếm chủ đề theo quan hệ `Category.parentId` đệ quy, đồng thời bổ sung CTA "+ Thêm lĩnh vực" rõ ràng ngay tại giao diện Cây Chủ Đề (`TopicTree`).
    - **Giải pháp kỹ thuật:**
      - Hàm thuần túy trong `src/lib/taxonomyMigration.ts`: `getDescendantCategoryIds`, `resolveRootCategory`, `resolveCategoryFilterToRootId`, `topicBelongsToRootCategory`, `countTopicsForRootCategory`.
      - Đồng bộ `selectedCategoryFilter` sử dụng canonical `rootId`, loại bỏ phụ thuộc vào `type` hoặc `categorySlug`.
      - Cây phân cấp `TopicTree.tsx` render chính xác các danh mục và chủ đề thuộc lĩnh vực được chọn, loại bỏ hiển thị thẻ danh mục rỗng (0 chủ đề) khi các danh mục con đã chứa chủ đề.
      - Thêm nút CTA "+ Thêm lĩnh vực" tại Header và Toolbar của `TopicTree.tsx` kết nối trực tiếp với flow `addCategory`.
    - **Kiểm thử:** 14/14 tests PASS (7/7 pure lib + 7/7 UI integration).
  - **Post-Phase 5 Micro-Increment: Dynamic Root Taxonomy & Soft Topic Visibility (ADR-016):**
    - **Mục tiêu:** Mở rộng linh hoạt hệ thống phân loại tri thức, xóa bỏ hoàn toàn hardcode 2 lĩnh vực "Phật học" & "Huyền học" ở tầng 1, cho phép thêm lĩnh vực tùy biến động, đồng thời trang bị tính năng Ẩn/Khôi phục chủ đề (Soft Hide/Restore) an toàn tuyệt đối mà không mất dữ liệu liên quan.
    - **Kiến trúc & Giải pháp triển khai:**
      - **Mô hình Phân Cấp Category:** Trục phân cấp đơn nhất dựa vào `Category.parentId` (`!parentId` = Root Category, `parentId === rootId` = Child Category). Trường `type` đóng vai trò legacy compatibility slug.
      - **Mô hình Topic Visibility:** Thêm trường `visibility: 'active' | 'hidden'` trên Topic. Tự động chuẩn hóa (`normalizeTopics`) về `'active'` đối với các topic cũ hoặc snapshots không có trường này.
      - **Bảo toàn dữ liệu triệt để:** Thao tác ẩn chủ đề (`hideTopic`) chỉ đổi cờ hiển thị; toàn bộ `notes`, `resources`, `links`, `studyProgress`, SM-2 repetitions và timestamps đều được bảo toàn nguyên vẹn 100%.
      - **Thành phần phát triển:**
        - Module di trú & truy vấn cây danh mục [`src/lib/taxonomyMigration.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/taxonomyMigration.ts).
        - Giao diện Sidebar [`src/components/layout/Sidebar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/layout/Sidebar.tsx) render danh mục gốc động + nút "Thêm lĩnh vực" inline.
        - Topic Form [`src/components/modals/TopicFormModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/TopicFormModal.tsx) cho phép chọn danh mục phân cấp động theo nhóm lĩnh vực.
        - Cây chủ đề [`src/components/topics/TopicTree.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/topics/TopicTree.tsx) tích hợp bộ lọc trạng thái hiển thị (Chủ đề hoạt động / Đã ẩn / Tất cả) và nút Ẩn/Khôi phục 1-click.
        - Bộ lọc tìm kiếm [`src/components/search/SearchFilters.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/search/SearchFilters.tsx) hỗ trợ chọn lĩnh vực gốc động và danh mục tương ứng.
    - **Kiểm thử:** 14/14 tests PASS.
  - **Post-Phase 5 Micro-Increment: Antigravity Result Ingestion & Tracker Completion Polish:**
    - **Mục tiêu:** Khép kín vòng quay kết quả nghiên cứu từ Antigravity/NotebookLM quay về app khi người dùng nạp (ingest) Artifact vào Artifacts Locker.
    - **Logic nghiệp vụ:**
      - Hàm thuần túy `completeMatchingHandoffJob` tự động chuyển trạng thái Job đang chờ sang `status: 'success'` khi nạp thành công Artifact hợp lệ.
      - Cơ chế ưu tiên: Khớp chính xác theo `jobId` nếu được cung cấp, hoặc fallback khớp theo `(topicId + artifactType)` với pending job (`queued` | `processing`) gần nhất.
    - **Rào chắn & Minh bạch ngữ nghĩa (Guardrails & Invariants):**
      - `success` trong Job Tracker biểu thị chính xác rằng **"Đã nạp kết quả vào app"** (result ingested into app).
      - Tuyệt đối **KHÔNG** đồng nghĩa với auto-dispatch CLI `agy -p` từ runtime.
      - Tuyệt đối **KHÔNG** đồng nghĩa với end-to-end cloud NotebookLM automation.
      - Tuyệt đối **KHÔNG** có local API bridge, browser automation, hay direct NotebookLM API integration.
      - Thao tác bấm "Chuẩn bị Handoff" hoặc "Sao chép lệnh CLI" giữ nguyên 100% trạng thái `queued`.
      - Dữ liệu nạp bị lỗi xác thực hoặc mismatch không làm bẩn tracker state.
    - **Kiểm thử:** 8/8 tests PASS (5/5 pure lib + 3/3 UI integration).
  - **Post-Phase 5 Micro-Increment: Automated Antigravity NotebookLM Handoff Pipeline (Commit `958a222`):**
    - **Mục tiêu:** Giảm thiểu tối đa thao tác tay khi bàn giao bối cảnh khảo cứu từ NotebookLM Studio sang Antigravity 2.0.
    - **Kiến trúc đã chọn (ADR-015):** File Manifest + CLI Headless Protocol (`agy -p` + JSON manifest + Markdown files) theo phân loại Two-Way Door (Reversible Decision).
    - **Thành phần triển khai:**
      - Module lõi thuần túy [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts): sinh mã Job (`job-nlm-...`), đóng gói source/prompt, sinh đường dẫn `.agents/handoffs/`, hàm `createAntigravityHandoffJob`, `buildAntigravityCLICommand`, `serializeAntigravityJobManifest` và các helper CRUD tracker.
      - Tích hợp giao diện tại [`src/components/integrations/NotebookLMStudioModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/NotebookLMStudioModal.tsx): Nút "Chuẩn bị Handoff Antigravity" (`data-testid="btn-prepare-antigravity-handoff"`), khung xem trước câu lệnh CLI `agy -p` kèm nút sao chép 1-click, bảng theo dõi Job Tracker với huy hiệu `queued` và nút xóa job.
      - Tệp Manifest JSON (`*-manifest.json`) đóng vai trò inter-process artifact trong `.agents/handoffs/`.
    - **Rào chắn & Nguyên tắc đã khóa (Guardrails):**
      - Không persist chuỗi `command` trong `AntigravityHandoffJob`; câu lệnh CLI được sinh động qua `buildAntigravityCLICommand`.
      - Phân định rạch ròi: UI tracker state (trong LocalStorage `phat_hoc_antigravity_handoff_jobs_v1`) $\neq$ Inter-process manifest JSON file.
      - Chuẩn hóa wording: Sử dụng **"Chuẩn bị Handoff Antigravity"** (không dùng "Gửi" vì chưa có runtime execution tự động).
    - **Phạm vi CHƯA làm (Non-goals in this increment):** Chưa auto-run `agy -p` trực tiếp từ app runtime, chưa có local API socket/bridge, chưa có browser automation, chưa có direct Google NotebookLM API integration.
    - **Kiểm thử:** 9/9 tests PASS (5/5 pure lib + 4/4 UI integration).
  - **Post-Phase 5 Micro-Increment: Citation Format Preference Hardening (Commit `e15aca2`):**
    - Module độc lập [`src/lib/citationPreferences.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationPreferences.ts) tách biệt rõ ràng giữa logic sinh chuỗi trích dẫn và quản lý lưu trữ tùy chọn client-side (`knowledge_os_citation_format_pref`).
    - Hỗ trợ 3 định dạng: **`apa`** (mặc định), **`bibtex`**, **`markdown`** kèm fallback an toàn khi rỗng/lỗi và đồng bộ hai chiều giữa `CitationModal` & `BatchCitationModal` (11/11 tests PASS).
  - **Post-Phase 5 Micro-Increment: Batch Citation Export for Filtered Resources (Commit `865de3d`):**
    - Hàm thuần túy `generateBatchCitations(resources, format)` trong `src/lib/citationGenerator.ts` xuất hàng loạt cho danh sách đang lọc theo 3 định dạng: **APA 7th**, **BibTeX**, và **Markdown Footnotes** (11/11 tests PASS).
  - **Post-Phase 5 Micro-Increment: Scholar Citation Generator (Resource Focus, Commit `36265bb`):**
    - Module thuần túy `src/lib/citationGenerator.ts` sinh trích dẫn học thuật đơn lẻ, fallback metadata an toàn, BibTeX key tất định và modal `CitationModal.tsx` (12/12 tests PASS).
  - **Capability vs Connectivity Error Separation (Post-Phase 2C.4 Hardening, Commit `b0c20e0`):** Phân định rành mạch giữa lỗi năng lực thiết kế ngoại tuyến (`isOfflineCapability` kích hoạt khi lỗi chứa `UNSUPPORTED_OFFLINE_OPERATION`) và lỗi mất kết nối máy chủ / runtime (`connectionError` kèm Health Badge `unhealthy` *"PostgreSQL Mất Kết Nối"*), không đánh đồng sự cố mạng với kho lưu trữ LocalStorage.
  - **Obsidian URI Integration Fix (Commit `521291d`, doc `36b1ea9`):** Chuẩn hóa định danh Vault Identifier (hỗ trợ cả tên Vault và đường dẫn tuyệt đối macOS/Windows), bảo vệ chống nhầm thư mục con `01_Inbox`, làm sạch legacy LocalStorage, và chuẩn hóa relative file path.
  - **Mediated NotebookLM Workflow via Antigravity 2.0 (Commit `5a2cc35`, doc `f48a684`):** Mở rộng Phase 2b thành quy trình làm việc có điều phối qua Antigravity 2.0; sinh Task Prompt chuyên dụng cho NotebookLM skill, làm giàu metadata artifact, hỗ trợ parse tệp Markdown tự động.
  - **Data Management Modal & Confirmation Gate UI (Phase 2C.4 - ADR-009, Commit `e012537`):** Hoàn tất giao diện quản lý dữ liệu sao lưu & phục hồi thảm họa máy chủ trong `ExportImportModal.tsx`.
- **Quy tắc bất biến đã tuân thủ:** OODA, Read-before-write, Test-first, Zero Binary Ingestion, Dual-Tier Resilience, Fast-fail Security Guardrails.

---

## 📌 2. Bảng Theo Dõi Các Phase (Phase Status Board)

| Phase | Mục tiêu chính | Trạng thái kỹ thuật | Action tiếp theo |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Local File Picker UX:**<br>- Thêm nút "Duyệt tệp trên máy"<br>- Tự trích xuất `file.name`<br>- Auto-detect định dạng PDF/Audio/Video/Book<br>- Auto-suggest tiêu đề nếu trống<br>- Thông báo hướng dẫn sandbox trình duyệt<br>- Zero binary ingestion (metadata < 2KB) | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 6/6 tests trong `resource-form-modal-file-picker.test.tsx`)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase 2a** | **Obsidian Open / Export UX & Protocol Hardening:**<br>- Cấu hình & Fallback an toàn Vault Name<br>- Chuẩn hóa thông minh Vault Identifier (Hỗ trợ tên Vault, đường dẫn tuyệt đối macOS/Windows, bảo vệ chống nhầm thư mục con `01_Inbox`)<br>- Làm sạch tự động giá trị bẩn legacy trong LocalStorage<br>- Mở topic qua `obsidian://open` (sanitized relative path)<br>- Tạo note qua `obsidian://new` (nhất quán contract)<br>- Xuất file ZIP chuẩn cấu trúc Vault Markdown | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 15/15 `obsidian-lib` + 8/8 `obsidian-bridge` tests)* | **Hoàn tất 100% (Commit `521291d` verified)** |
| **Phase 2b** | **NotebookLM Studio & Antigravity 2.0 Mediated Workflow:**<br>- Đóng gói 5 phần chuẩn tài liệu nguồn (Web + Local)<br>- Sinh Task Prompt chuyên dụng chỉ thị cho Antigravity 2.0 gọi NotebookLM skill<br>- Cung cấp thông điệp Mediated Workflow Disclaimer (không claim direct sync)<br>- Mở rộng metadata artifact (`source`, `target`, `status`) tương thích ngược<br>- Bộ kiểm tra hợp lệ đầu vào (`validateArtifactImportInput`) & nạp tệp Markdown (`parseArtifactMarkdownFile`)<br>- Quản lý và lưu trữ Artifacts Locker với ID duy nhất | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 13/13 `notebooklm-lib` + 10/10 `notebooklm-studio` tests)* | **Hoàn tất 100% (Commit `5a2cc35` verified)** |
| **Phase 2c** | **Data Management Modal & Disaster Recovery (ADR-009 & Hardening):**<br>- Real-time Database Health Badge (Latency probe)<br>- Server-authoritative snapshot export (`exportBackupSnapshot`)<br>- Client-side Schema & Checksum validation (`calculateBackupChecksum`)<br>- Merge / Replace restore mode selector<br>- Confirmation Gate bắt buộc nhập `XÁC NHẬN THAY THẾ`<br>- Rehydration `reloadAllData()` & lỗi `rehydrate_failed` bảo toàn state<br>- Tách biệt rành mạch Capability Error (`UNSUPPORTED_OFFLINE_OPERATION`) vs Connectivity Error (`unhealthy`) | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 30/30 tests: 11/11 modal + 6/6 UI state + 8/8 repo + 5/5 health)* | **Hoàn tất 100% (Phase 2C.4 & 2C.4b verified)** |
| **Phase 3** | **Antigravity Handoff Bundle:**<br>- Đóng gói 6 phần chuẩn (1-hop direct graph)<br>- An toàn Clipboard & File Download `Antigravity-Handoff-{Topic}.md`<br>- Sinh System Prompt theo 3 chế độ nghiên cứu<br>- Tích hợp trigger trên TopicDetail, AIStudio và Navbar | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 6/6 `antigravity-lib` + 4/4 `antigravity-handoff` tests)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase 4** | **Production Readiness & Hardening:**<br>- Rate limiting 10 req/min (`/api/gemini/*`) & 5 req/min (`/api/backup/restore`)<br>- Boundary validation (`MAX_PROMPT_LENGTH = 20k`, `MAX_HANDOFF_CONTEXT_LENGTH = 100k`)<br>- Health & Latency Policy: `<100ms` healthy, `100-1000ms` degraded, `>=1000ms` unhealthy<br>- Fast-fail non-retryable Gemini errors (400, 401, Invalid Arg)<br>- Bounded retry tối đa 2 lần cho 503/429/overload kèm model fallback queue<br>- Structured JSON Logging không lộ bí mật | 🟢 **IMPLEMENTED & VERIFIED**<br>*(Pass 13/13 tests trong `phase-4-production-hardening.test.ts`)* | **Hoàn tất 100% (đã xác minh - Commit `9cfdabe`)* |
| **Phase 5** | **Evolution Planning & Operational Expansion (Hoàn Tất Cả 4 Workstreams):**<br>- **5D (Scholar Search & Metadata Filter):** Chuẩn hóa tiếng Việt/IAST, tìm kiếm hợp nhất 3 collections, xếp hạng độ liên quan, tích hợp Command Palette & Advanced Search.<br>- **5A (Knowledge Graph & Traversal Explorer):** Dựng đồ thị in-memory, duyệt $k$-hop có chặn trên, chống lặp, lọc quan hệ ngữ nghĩa, tính bậc kết nối Degree, Focus Mode.<br>- **5B (SM-2 Study Session Analytics):** Tỷ lệ ghi nhớ dự phóng Ebbinghaus, phân bố 4 giai đoạn thuần thục, dự báo hàng đợi 7 ngày, đường cong quên 30 ngày, Retention Dashboard.<br>- **5C (Snapshot Maintenance & Headless CLI):** Tạo snapshot tự động, ghi nguyên tử (.tmp $\rightarrow$ rename), kiểm tra 2 lớp (Schema + Checksum), dọn dẹp FIFO retention an toàn. | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 30/30 tests trên 4 workstreams)* | **Hoàn tất 100% Phase 5 (5D, 5A, 5B, 5C đã xác minh)** |

---

## 📌 3. Trạng Thái Chi Tiết Các Workstream Phase 5 (Phase 5 Workstream Status)

| Workstream | Tên Hạng Mục | Trạng Thái Kỹ Thuật | Bằng Chứng Xác Minh / Commit |
| :--- | :--- | :---: | :--- |
| **5D** | **Scholar Search & Fast Fuzzy Metadata Filter** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5d-scholar-search.feature` (`d844530`)<br>• Core lib: `src/lib/scholarSearch.ts` + 8/8 tests (`8e09740`)<br>• UI: `useCommandPalette.ts` + `AdvancedSearch.tsx` (`5ee5d89`) |
| **5A** | **Advanced Knowledge Graph & Multi-Hop Traversal Explorer** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5a-knowledge-graph.feature` (`613deed`)<br>• Core lib: `src/lib/knowledgeGraph.ts` + 6/6 tests (`613deed`)<br>• UI: `src/components/graph/KnowledgeGraph.tsx` + 4/4 tests (`4ee9f5c`) |
| **5B** | **Spaced Repetition (SM-2) Study Session Analytics** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5b-study-analytics.feature` (`c325e33`)<br>• Core lib: `src/lib/studyAnalytics.ts` + 6/6 tests (`c325e33`)<br>• UI: `src/components/progress/StudyProgressView.tsx` + 4/4 tests (`d912818`) |
| **5C** | **Automated Snapshot Maintenance & Headless Backup Script** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5c-headless-backup.feature`<br>• Core lib: `src/lib/snapshotManager.ts` + 10/10 tests (`snapshot-maintenance.test.ts`)<br>• CLI Script: `scripts/backup-snapshot.ts` + NPM scripts (`693abd6`, `916b002`) |

---

## 🛡️ 4. Hiện Trạng Kiểm Thử & Hệ Thống (System Health Baseline)

- **Regression Test Suite:** ✅ **43 / 43 test files PASS — 303 / 303 tests PASS (100% GREEN in 10.53s)**.
- **Phase 1 Suite:** ✅ `resource-form-modal-file-picker.test.tsx` (6/6 PASS).
- **Phase 2a Suites:** ✅ `obsidian-lib.test.ts` (15/15 PASS) · `obsidian-bridge-integration.test.tsx` (8/8 PASS).
- **Phase 2b Suites:** ✅ `notebooklm-lib.test.ts` (13/13 PASS) · `notebooklm-studio-integration.test.tsx` (10/10 PASS).
- **Phase 2c Suites:** ✅ `phase2c-data-management-modal-component.test.tsx` (11/11 PASS) · `phase2c-data-management-ui.test.tsx` (6/6 PASS) · `phase2c-repository-methods.test.ts` (8/8 PASS) · `phase2c-health-badge.test.tsx` (5/5 PASS) *(Tổng 30/30 PASS)*.
- **Phase 3 Suites:** ✅ `antigravity-lib.test.ts` (6/6 PASS) · `antigravity-handoff-integration.test.tsx` (4/4 PASS).
- **Phase 4 Suite:** ✅ `phase-4-production-hardening.test.ts` (13/13 PASS).
- **Phase 5D Suite:** ✅ `scholar-search-lib.test.ts` (8/8 PASS).
- **Phase 5A Suites:** ✅ `knowledge-graph-lib.test.ts` (6/6 PASS) · `knowledge-graph-ui-integration.test.tsx` (4/4 PASS).
- **Phase 5B Suites:** ✅ `study-analytics-lib.test.ts` (6/6 PASS) · `study-analytics-ui-integration.test.tsx` (4/4 PASS).
- **Phase 5C Suite:** ✅ `snapshot-maintenance.test.ts` (10/10 PASS).
- **Scholar Citation Generator, Batch Export & Preference Suites (Post-Phase 5 Micro-Increments):** ✅ `citation-generator-lib.test.ts` (8/8 PASS) · `citation-modal-ui.test.tsx` (4/4 PASS) · `citation-batch-generator.test.ts` (5/5 PASS) · `batch-citation-modal-ui.test.tsx` (6/6 PASS) · `citation-format-preference.test.ts` (5/5 PASS) · `citation-modal-preference-ui.test.tsx` (6/6 PASS) *(Tổng 34/34 PASS)*.
- **Automated Antigravity NotebookLM Handoff Pipeline Suites (Post-Phase 5 Micro-Increment):** ✅ `antigravity-pipeline-lib.test.ts` (5/5 PASS) · `notebooklm-antigravity-pipeline-ui.test.tsx` (4/4 PASS) *(Tổng 9/9 PASS)*.
- **Antigravity Result Ingestion & Completion Suites (Post-Phase 5 Micro-Increment):** ✅ `antigravity-result-ingestion.test.ts` (5/5 PASS) · `notebooklm-result-ingestion-ui.test.tsx` (3/3 PASS) *(Tổng 8/8 PASS)*.
- **TypeScript Type-Check:** ✅ `npm run lint` (`tsc --noEmit`) đạt **0 errors, 0 warnings**.
- **Production Bundle:** ✅ `npm run build` tạo bundle Vite + esbuild sạch sẽ trong `dist/`.
- **Git Diff & Whitespace Check:** ✅ `git diff --check` đạt **0 issues**.
- **Database & Dual-Tier Persistence:** ✅ Hoạt động ổn định trên cả PostgreSQL/Prisma và LocalStorage offline fallback.

---

## 📝 5. Ghi Chú Kỹ Thuật Triển Khai (Implementation Notes)

1. **Antigravity Result Ingestion & Tracker Completion Polish (Post-Phase 5 Micro-Increment):**
   - **Hàm Hoàn Tất Khớp Nối Phân Cấp:** Hàm thuần túy `completeMatchingHandoffJob` tại [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts) ưu tiên khớp chính xác theo `jobId` và `topicId` trước; nếu không có `jobId`, fallback khớp theo `(topicId + artifactType)` với pending job gần nhất (`queued` hoặc `processing`).
   - **Tích Hợp Nạp Artifact An Toàn:** [`NotebookLMStudioModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/NotebookLMStudioModal.tsx) tự động gọi `completeMatchingHandoffJob` khi lưu thành công Artifact mới (qua upload tệp Markdown hoặc form thủ công) và cập nhật giao diện tracker.
   - **Minh Bạch Ngữ Nghĩa Trạng Thái:** Huy hiệu `success` (emerald) được giải thích rõ là *"Đã nạp kết quả vào app"*, hoàn toàn không tuyên bố tự động hóa nền hai chiều qua cloud hay auto-dispatch `agy -p`.
2. **Automated Antigravity NotebookLM Handoff Pipeline (Post-Phase 5 Micro-Increment):**
   - **Đóng Gói & Sinh Tệp Handoff Chuẩn Hóa:** Module lõi thuần túy [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts) tích hợp `createAntigravityHandoffJob` tự động sinh mã Job (`job-nlm-...`), cấu trúc source document Markdown, task prompt Markdown và tệp manifest JSON (`*-manifest.json`) làm inter-process artifact trong thư mục `.agents/handoffs/`.
   - **Sinh Lệnh CLI Headless Động:** Hàm thuần túy `buildAntigravityCLICommand` tổng hợp câu lệnh `agy -p "..."` động khi hiển thị hoặc sao chép, không lưu cứng chuỗi command vào đối tượng Job nhằm giữ cấu trúc dữ liệu tinh gọn và nhất quán.
   - **Tách Biệt Hai Tầng Lưu Trữ (ADR-015):** Phân định rạch ròi giữa tệp Manifest JSON (trao đổi giữa các tiến trình) và LocalStorage `phat_hoc_antigravity_handoff_jobs_v1` (lưu trữ UI Tracker State cho người dùng theo dõi và quản lý danh sách Job).
   - **Tích Hợp Giao Diện Trực Quan:** [`NotebookLMStudioModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/NotebookLMStudioModal.tsx) bổ sung nút **"Chuẩn bị Handoff Antigravity"**, ô xem trước lệnh CLI với nút sao chép 1-click (inline feedback) và bảng theo dõi danh sách Job với huy hiệu trạng thái `queued` và nút xóa bản ghi.
3. **Citation Format Preference Hardening (Post-Phase 5 Micro-Increment):**
   - **Tách Biệt Trách Nhiệm Kiến Trúc:** Module riêng [`src/lib/citationPreferences.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationPreferences.ts) quản lý tùy chọn định dạng học thuật người dùng ưu tiên độc lập hoàn toàn khỏi logic sinh văn bản trích dẫn.
   - **Cơ Chế Lưu Trữ Phía Client:** Sử dụng LocalStorage key `knowledge_os_citation_format_pref` với 3 định dạng hợp lệ: `'apa'`, `'bibtex'`, `'markdown'`.
   - **Phòng Vệ Trạng Thái Ngoại Tuyến & Lỗi:** Mọi trường hợp dữ liệu rỗng, không hợp lệ, hoặc môi trường không hỗ trợ storage đều được xử lý với silent fail và fallback an toàn tuyệt đối về `DEFAULT_CITATION_FORMAT = 'apa'`.
   - **Đồng Bộ Trải Nghiệm Học Giả:** [`CitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/CitationModal.tsx) và [`BatchCitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/BatchCitationModal.tsx) tự động đồng bộ trạng thái tab qua lại mà không yêu cầu thay đổi `DataContext` hay API backend.
4. **Batch Citation Export for Filtered Resources (Post-Phase 5 Micro-Increment):**
   - **Module Lõi Thuần Túy:** [`src/lib/citationGenerator.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationGenerator.ts) bổ sung `generateBatchCitations` gộp danh mục theo 3 định dạng chuẩn: APA 7th (tự động sắp xếp ABC theo tác giả/tiêu đề), BibTeX (nối khối `@book`, `@misc`, `@article` bằng `\n\n`), và Markdown (đánh số thứ tự footnote liên tục `[^1]..[^N]`).
   - **Tải Xuống Tệp Độc Lập:** Hàm `getBatchCitationDownloadFilename` ánh xạ tên tệp cố định `references.bib`, `references.txt`, `references.md` tương ứng từng tab định dạng qua cơ chế HTML5 Blob client-side.
   - **Giao Diện Hộp Thoại Hàng Loạt:** [`src/components/modals/BatchCitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/BatchCitationModal.tsx) hiển thị số lượng tài liệu đang xuất, 3 tab định dạng, ô xem trước mono, nút "Sao chép toàn bộ" (inline feedback) và "Tải tệp".
   - **Điểm Chạm Toolbar:** Nút "Xuất danh mục ({count})" tại [`src/components/resources/ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx) tích hợp sẵn rào chắn `disabled` khi `filteredResources.length === 0`.
5. **Scholar Citation & Reference Export Generator (Post-Phase 5 Micro-Increment):**
   - **Module Lõi Thuần Túy:** [`src/lib/citationGenerator.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/citationGenerator.ts) định dạng trích dẫn theo 3 chuẩn: APA 7th Edition, BibTeX (`@book`, `@article`, `@misc`), và Markdown Footnote (`[^1]`).
   - **Xử Lý Fallback Chuẩn Mực:** Trích xuất năm thông minh từ `notes`/`title`/`createdAt`, đẩy `title` lên trước khi khuyết tác giả trong APA, và gán placeholder `[Khuyết danh]` trong BibTeX.
   - **Citation Key Tất Định:** Hàm `generateBibTeXKey` sinh slug chuẩn ASCII không dấu `${authorSlug}_${year}_${titleSlug}`.
   - **Giao Diện Hộp Thoại Trích Dẫn:** [`src/components/modals/CitationModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/CitationModal.tsx) cung cấp 3 tab chuyển đổi mượt mà, khung xem trước kiểu mono và nút Sao Chép phản hồi tại chỗ tức thì (inline feedback).
   - **Điểm Chạm Kích Hoạt:** Tích hợp trực tiếp trên thẻ tài liệu tại [`src/components/resources/ResourcesManager.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/resources/ResourcesManager.tsx).
2. **Scholar Search Engine (5D):** Module thuần túy tại [`src/lib/scholarSearch.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/scholarSearch.ts) thực thi chuẩn hóa chuỗi tiếng Việt/IAST, tính điểm trọng số và tìm kiếm hợp nhất 3 collections. Tích hợp trong `useCommandPalette.ts` và `AdvancedSearch.tsx`.
3. **Knowledge Graph & Traversal Explorer (5A):** Module thuần túy tại [`src/lib/knowledgeGraph.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/knowledgeGraph.ts) thực thi dựng đồ thị in-memory, duyệt đa tầng BFS có giới hạn an toàn (`maxDepth`, `maxNodesLimit`), chống vòng lặp vô tận, tự động loại bỏ dangling edges và lọc theo quan hệ ngữ nghĩa/cấu trúc. Tích hợp trực tiếp trong `KnowledgeGraph.tsx` với bộ lọc Semantic Edge, tính bậc kết nối (Degree) và chế độ khảo cứu Focus Mode.
4. **Study Session Analytics & Retention Dashboard (5B):** Module thuần túy tại [`src/lib/studyAnalytics.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/studyAnalytics.ts) thực thi phân tích trí nhớ dự phóng Ebbinghaus ($R = e^{-\Delta t / S} \times 100\%$), phân loại 4 giai đoạn thuần thục kiến thức, dự báo hàng đợi ôn tập 7 ngày và đường cong quên dự phóng 30 ngày. Tích hợp trực tiếp trong `StudyProgressView.tsx` với 4 thẻ KPI dự phóng, hàng huy hiệu tóm tắt và biểu đồ Recharts BarChart.
5. **Snapshot Maintenance & Headless CLI Engine (5C):** Module thuần túy tại [`src/lib/snapshotManager.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/snapshotManager.ts) và kịch bản dòng lệnh [`scripts/backup-snapshot.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/scripts/backup-snapshot.ts):
   - **Tạo Snapshot An Toàn:** Tự động trích xuất 5 collections, tính SHA-256 Checksum tất định và đóng gói header `BackupSnapshotSchema` Semver 2.x.
   - **Ghi Nguyên Tử (Atomic Write):** Ghi ra `.snapshot-*.tmp` $\rightarrow$ `fs.renameSync`, tự xóa tệp tạm nếu có sự cố (Zero Partial File).
   - **Xác Minh 2 Lớp:** Kiểm tra cấu trúc Schema và khớp SHA-256 Checksum, phân biệt rõ `VALID`, `INVALID_SCHEMA`, `INVALID_CHECKSUM`.
   - **Dọn Dẹp Tự Động (Retention Pruning):** Lọc theo regex tên file `snapshot-*.json`, giữ $N$ bản ghi mới nhất, bảo toàn tuyệt đối các file ngoài lề (`.txt`, `.gitkeep`).
   - **NPM Scripts:** Cung cấp `npm run snapshot:create`, `npm run snapshot:dry-run`, `npm run snapshot:verify`, `npm run snapshot:prune`.
6. **Obsidian URI Protocol & Path Resolution Hardening (Commit `521291d`, doc `36b1ea9`):**
   - **Chuẩn Hóa Vault Identifier:** Hàm thuần túy `normalizeObsidianVaultIdentifier` trong [`src/lib/obsidian.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/obsidian.ts) tự động trích xuất tên Vault từ cả plain string, đường dẫn tuyệt đối macOS/Linux (`/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian` $\rightarrow$ `Phat-Hoc-Obsidian`), hoặc Windows (`C:\...`).
   - **Rào Chắn Thư Mục Con (Child Folder Guardrail):** Sử dụng regex `OBSIDIAN_CHILD_DIR_PATTERNS` để ngăn chặn các đường dẫn trỏ vào thư mục con (như `01_Inbox`, `_inbox`, `.obsidian`) bị gán nhầm làm tên Vault; tự động truy xuất thư mục cha là Vault Root.
   - **Làm Sạch Đường Dẫn Tương Đối:** Hàm `normalizeObsidianFilePath` loại bỏ leading slashes và chuẩn hóa dấu phân cách, đảm bảo URI query parameter `file` là đường dẫn tương đối chính xác từ Vault Root.
   - **Tự Động Làm Sạch Legacy LocalStorage:** Hàm `getStoredVaultName()` và `setStoredVaultName()` tự động khử bỏ các chuỗi đường dẫn tuyệt đối cũ lưu trong LocalStorage khi đọc/ghi.
   - **Tính Nhất Quán Giao Thức:** Cả hai giao thức `obsidian://open` và `obsidian://new` đều chia sẻ 100% normalization contract.
   - **Giới Hạn Phạm Vi & Bảo Toàn:** Không làm thay đổi database schema, backend API, hay logic xuất ZIP của Vault.
7. **Mediated NotebookLM Workflow via Antigravity 2.0 (Commit `5a2cc35`, doc `f48a684`):**
   - **Task Prompt Generator:** Hàm `generateNotebookLMTaskPrompt` trong [`src/lib/notebooklm.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/notebooklm.ts) sinh prompt chỉ thị rõ ràng cho Antigravity 2.0 kích hoạt NotebookLM skill theo 5 loại artifact (`study_guide`, `audio_overview_summary`, `briefing_doc`, `faq`, `source_pack`).
   - **Metadata Nguồn/Đích Rõ Ràng:** Mở rộng `NotebookLMArtifact` với `source: "antigravity-2.0"`, `target: "notebooklm"`, `status: "imported"`. Tự động gán và phục hồi an toàn cho các artifact cũ trong LocalStorage.
   - **Bộ Lọc Hợp Lệ & Invariants:** Hàm `validateArtifactImportInput` từ chối nội dung rỗng và yêu cầu `notebookUrl` phải bắt đầu bằng `http://` hoặc `https://`.
   - **Nạp & Phân Tích Cú Pháp Markdown:** Hàm `parseArtifactMarkdownFile` tự động trích xuất tiêu đề H1 và suy luận phân loại artifact khi người dùng nạp tệp `.md`/`.txt`.
   - **Giao Diện & Minh Bạch Kiến Trúc:** `NotebookLMStudioModal.tsx` hiển thị thông điệp cam kết bảo mật `Mediated Workflow via Antigravity 2.0 • 100% Client-side Privacy • No direct cloud sync required`, không gây ngộ nhận về kết nối trực tiếp hai chiều.
8. **Data Management Modal & Confirmation Gate UI (Phase 2C.4 & 2C.4b - ADR-009):**
   - **Repository Injection & Health Polling:** [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx) nhận `repository?: IDataRepository` linh hoạt, tự động thăm dò sức khỏe cơ sở dữ liệu `getDbHealth()` và hiển thị Health Badge trực quan.
   - **Tách Biệt Capability vs Connectivity Error:** Phân định rõ ràng `isOfflineCapability` (khi gặp lỗi `UNSUPPORTED_OFFLINE_OPERATION` từ kho lưu trữ LocalStorage) vs `connectionError` (khi gặp lỗi mạng/server 500 ném trạng thái `unhealthy` đỏ *"PostgreSQL Mất Kết Nối"*), xóa bỏ hoàn toàn sự nhập nhằng trong trải nghiệm người dùng.
   - **Server-Authoritative Snapshot Export:** Tải về snapshot máy chủ hoàn chỉnh với định dạng JSON Semver 2.x có mã băm SHA-256 tất định.
   - **Client-Side Schema & Checksum Verification:** Khi người dùng chọn tệp snapshot, modal kiểm tra cấu trúc schema bằng `BackupSnapshotSchema` và tính toán SHA-256 Checksum bằng `calculateBackupChecksum`, chặn đứng tệp hỏng/bị sửa đổi trước khi gửi lên máy chủ.
   - **Confirmation Gate An Toàn:** Chế độ `replace` bắt buộc người dùng gõ chính xác 100% chuỗi ký tự hoa `XÁC NHẬN THAY THẾ` để mở khóa nút thực thi.
   - **Rehydration Lifecycle & Error Isolation:** Sau khi khôi phục thành công trên server, modal gọi `reloadAllData()` làm tươi dữ liệu in-memory; nếu bước rehydration thất bại, trạng thái chuyển sang `rehydrate_failed` và bảo toàn nguyên vẹn dữ liệu cũ, không xóa state.
9. **Tính Toàn Vẹn Hệ Thống:**
   - [`src/components/search/SearchFilters.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/search/SearchFilters.tsx) giữ nguyên 100% component contract.
   - **Zero Binary Ingestion:** Tài liệu tham khảo chỉ được xử lý qua metadata an toàn (`filePath`, `url`, `title`, `type`), không nạp binary vào bộ nhớ.
   - Không có thay đổi nào đối với Prisma Schema, REST API backend hay thêm dependency mới.

---

## 🛑 6. Blockers & Trạng Thái Sẵn Sàng (Production Readiness)

1. **Blockers kỹ thuật:** **0 blocker**.
2. **Trạng thái hệ thống:** **Phase 1–5 GREEN, 100% VERIFIED & PRODUCTION-READY (No known regression detected in verified test scope)**.
