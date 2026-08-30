# 📊 Knowledge OS — Bảng Điều Hành Trạng Thái Dự Án (Project Status & Roadmap)

> **Cập nhật lần cuối:** 2026-08-30
> **Người phụ trách:** Staff Software Engineer / Technical Architect
> **Trạng thái tổng thể:** 🟢 **PHASE P0–P12.3 (SCHOLAR SUITE, TCM REGISTRY, MULTI-FACET FILTERING & DOCS EXPLORER) FULLY IMPLEMENTED & PRODUCTION-READY (180 / 180 TEST FILES PASS — 1109 / 1109 TESTS PASS 100% GREEN)**

---

## 🎯 1. Trọng tâm Hiện tại (Current Objective)

- **Trạng thái thực thi:** **TOÀN BỘ CÁC GIAI ĐOẠN ĐÃ HOÀN TẤT & HỆ THỐNG ĐỒ THỊ TRI THỨC / TỪ ĐIỂN ĐA NGỮ / TRUNG TÂM TÀI LIỆU KIẾN TRÚC ĐƯỢC KIỂM CHỨNG TẤT ĐỊNH (180 / 180 TEST FILES PASS — 1109 / 1109 TESTS PASS 100% GREEN)**.
- **Tiến độ Các Phase Chuyên Sâu Học Giả & Khảo Cứu Mới Nhất (Recent Scholar Suite & Architecture Phases):**
  - **Phase P12.3: In-App Docs Explorer & Markdown Architecture Viewer (Commit `97da2b4`):**
    - **Mục tiêu:** Tích hợp trực tiếp trình duyệt tài liệu kiến trúc kỹ thuật (ADRs, Specs, Gherkin Features, Runbooks) vào Dashboard, đọc trực tiếp từ đĩa với độ trễ 0s và bảo vệ an toàn bằng `sanitizeDocsPath()`.
    - **Giải pháp kỹ thuật:** Router Express `GET /api/docs` & `GET /api/docs/content`, bảo mật Path Traversal Guard, giao diện Split-Pane, TOC, nút sao chép và làm mới thời gian thực.
    - **Kiểm thử:** 18/18 tests PASS trong 3 test suites (`server-docs-routes.test.ts`, `docs-routing.test.ts`, `docs-explorer-view.test.tsx`).
  - **Phase P12.2 Wave 3: Multi-Facet Filtering Toolbar (Commit `795f564`):**
    - **Mục tiêu:** Xây dựng thanh công cụ lọc thuật ngữ đa chiều trực giao 3 tầng (Domain, Source Type, Conditional TCM Subcategory), badge số đếm động runtime, logic AND intersection và nút reset tiện lợi.
    - **Giải pháp kỹ thuật:** Selector thuần túy `getTerminologyFacetCounts` & `getTerminologyEntries` đa chiều, component `MultilingualLexicon.tsx` 3 tầng phân định trực quan.
    - **Kiểm thử:** 10/10 tests PASS trong 2 test suites (`terminology-facet-counts.test.ts`, `scholar-suite-facet-toolbar-integration.test.tsx`).
  - **Phase P12.1: TCM Registry Integration & Domain Taxonomy (Commit `df9eefd`):**
    - **Mục tiêu:** Tích hợp kho Đông Y (Kinh Huyệt, Tạng Tượng, Dược Tính) vào hệ thống thuật ngữ hợp nhất.
    - **Kiểm thử:** 15/15 tests PASS.
  - **Phase Study Analytics Multi-Domain Alignment (Commits `d7ad5b3`, `2b9e33f`):**
    - **Increment 1 (Core Engine Calculation Contract — `d7ad5b3`):** Phổ quát hóa hàm `calculateReviewForecast` hỗ trợ phân giải root domain động qua `getTopicRootDomain(topic, categories)`, bổ sung bản đồ `domainCounts` và mảng `domains` sắp xếp tất định (A-Z), bảo toàn tương thích ngược 100% cho `phatHocCount` / `huyenHocCount`, bổ sung `calculateDomainRetentionSummary`, và cố định tính tất định thời gian test bằng `vi.useFakeTimers()`.
    - **Increment 2 (UI Alignment & Neutral Presentation — `2b9e33f`):** Đồng bộ `StudyProgressView.tsx` render cột biểu đồ động, chú giải legend động, cân bằng lĩnh vực (PieChart) động theo root categories, và triển khai presentation resolver `getTopicPresentation` bảo đảm các domain mới có màu ngọc bích / trung tính (emerald/neutral), không bị gán nhầm sang Huyền Học.
    - **Kiểm thử:** 19/19 tests PASS (`study-analytics-lib.test.ts` & `study-analytics-ui-integration.test.tsx`).
  - **Phase Knowledge Graph & Multi-Hop Hardening (Commits `a2f6073`, `68021de`, `e353f86`):**
    - **Increment 1 (Core Traversal & Explainability — `a2f6073`):** Gia cố thuật toán BFS `traverseMultiHop` với thứ tự ưu tiên tất định (`strength` giảm dần, `type === 'prerequisite'`, `targetId` từ điển), truy vết nguồn gốc bước nhảy (`hopDistance`, `parentHopId`), và helper `findShortestPath`.
    - **Increment 2 (Dynamic Domain UI Explorer — `68021de`):** Đồng bộ bộ lọc lĩnh vực động trên `KnowledgeGraph.tsx` từ danh mục gốc và phân bổ cụm tọa độ layout $N$-domain.
    - **Kiểm thử:** 16/16 tests PASS (`knowledge-graph-lib.test.ts` & `knowledge-graph-ui-integration.test.tsx`).
- **Tiến độ Phase 5 (Evolution Planning & Operational Expansion) — Hoàn tất 4/4 Workstreams:**
  - **Workstream 5D (Scholar Search & Fast Fuzzy Metadata Filter):** Đã hoàn tất 100% và kiểm chứng qua 3 mốc commit (`d844530`, `8e09740`, `5ee5d89`, doc `1e749af`).
  - **Workstream 5A (Advanced Knowledge Graph & Multi-Hop Traversal Explorer):** Đã hoàn tất 100% và kiểm chứng qua 2 mốc commit (`613deed`, `4ee9f5c`, doc `a89111e`).
  - **Workstream 5B (Spaced Repetition SM-2 Study Session Analytics & Retention Dashboard):** Đã hoàn tất 100% và kiểm chứng qua 2 mốc commit (`c325e33`, `d912818`, doc `dcdf3a8`).
  - **Workstream 5C (Automated Snapshot Maintenance & Headless Backup Script):** Đã hoàn tất 100% qua module lõi `snapshotManager.ts`, kịch bản CLI `scripts/backup-snapshot.ts` và 10/10 test cases (`693abd6`, doc `916b002`).
- **Gia Cố Giao Thức & Tiện Ích Khảo Cứu Mới Nhất (Recent Increments & Hardening Checkpoints):**
  - **Post-Phase 6i Micro-Increment: Restore Drill Evidence Serialization & Audit Validation (Commit `5490ac4`):**
    - **Mục tiêu:** Tuần tự hóa bản ghi bằng chứng diễn tập khôi phục (`RestoreDrillEvidenceRecord`) thành chuỗi JSON chuẩn hóa, tất định; sinh tên tệp an toàn chống tấn công Path Traversal; và cung cấp helper thuần túy kiểm toán độc lập để xác minh tính toàn vẹn của tệp bằng chứng JSON cũ mà không làm biến đổi bất kỳ dữ liệu thật nào.
    - **Giải pháp kỹ thuật:**
      - Module thuần túy `src/lib/backupVerification.ts`: Bổ sung 3 pure helpers `serializeRestoreDrillEvidenceJSON`, `formatRestoreDrillEvidenceFilename`, `validateRestoreDrillEvidenceJSON`.
      - Bảo đảm 100% Zero DB / API / Storage / Live-Restore side effects và Zero Binary Ingestion.
    - **Kiểm thử:** 9/9 tests PASS trong test suite `restore-drill-evidence-serialization.test.ts`.
  - **Post-Phase 6h Micro-Increment: Restore Drill Evidence Capture (Commit `4973acc`):**
    - **Mục tiêu:** Đóng gói bản ghi bằng chứng diễn tập khôi phục bất biến (`RestoreDrillEvidenceRecord`) từ báo cáo `OperatorDrillReadinessReport` phục vụ lưu vết kiểm toán, theo dõi trạng thái ký duyệt của người vận hành (`operatorSignOffStatus`) và ghi chú vận hành (`operatorNotes`) hoàn toàn trong bộ nhớ.
    - **Giải pháp kỹ thuật:**
      - Module thuần túy `src/lib/backupVerification.ts`: Bổ sung interface `RestoreDrillEvidenceRecord`, `RestoreDrillEvidenceCaptureOptions` và pure helper `captureRestoreDrillEvidence`.
      - Bảo đảm 100% Zero DB / API / Storage / Live-Restore side effects và cách ly tham chiếu (Deep Copy).
    - **Kiểm thử:** 11/11 tests PASS trong test suite `restore-drill-evidence-capture.test.ts`.
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

- **Regression Test Suite:** ✅ **193 / 193 test files PASS — 1204 / 1204 tests PASS (100% GREEN)**.
- **Phase 14C Suites (Weekly Cadence Bar & Habit Tracking):** ✅ `weekly-cadence-selector.test.ts` (8/8 PASS) · `weekly-cadence-bar.test.tsx` (7/7 PASS) · `phase14b-focus-domain-ui.test.tsx` (4/4 PASS).
- **Phase 15 Suites (Root Domain Expansion & Starter Topics):** ✅ `phase15a-root-domain-expansion.test.tsx` (4/4 PASS) · `phase15b-starter-topics-enrichment.test.tsx` (4/4 PASS).
- **Phase 16 Suites (Taxonomy Cleanup, Safe Merge & Rehydration Persistence):** ✅ `taxonomy-migration.test.ts` (6/6 PASS) · `taxonomy-merge-safety.test.tsx` (21/21 PASS) · `dynamic-taxonomy-lib.test.ts` (7/7 PASS).
- **Phase 7 Suites (Rebrand & Note Reader UX):** ✅ `note-readability-ux.test.tsx` (8/8 PASS) · `phase7a-rebrand-and-note-reader.test.tsx` (8/8 PASS) · `phase7c-content-readability-presentation.test.tsx` (7/7 PASS).
- **P12 Suites (Multilingual Terminology, TCM Registry & Docs Explorer):** ✅ `terminology-unified-dictionary.test.ts` (7/7 PASS) · `terminology-lexicon-dictionary.test.ts` (12/12 PASS) · `docs-routing.test.ts` (3/3 PASS).
- **P8 Scholar Citation Suites:** ✅ `scholar-citation-matrix-export.test.ts` (5/5 PASS) · `scholar-citation-matrix-normalizer.test.ts` (5/5 PASS) · `scholar-citation-csl.test.ts` (3/3 PASS).
- **TypeScript Type-Check:** ✅ `npm run lint` (`tsc --noEmit`) đạt **0 errors, 0 warnings**.
- **Production Bundle:** ✅ `npm run build` tạo bundle Vite + esbuild sạch sẽ trong `dist/`.
- **Git Diff & Whitespace Check:** ✅ `git diff --check` đạt **0 issues**.
- **Database & Dual-Tier Persistence:** ✅ Hoạt động ổn định trên cả PostgreSQL/Prisma và LocalStorage offline fallback.

---

## 📝 5. Ghi Chú Kỹ Thuật Triển Khai (Implementation Notes)

1. **Taxonomy Cleanup, Safe Merge & Rehydration Persistence (Phase 16):**
   - **Pure Migration Helper:** Module [`src/lib/taxonomyMigration.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/taxonomyMigration.ts) cung cấp `mergeCategoryData` gộp an toàn các danh mục kinh tế cũ (`cat-root-kinh-te`, `cat-root-kinh-te-hoc`) sang danh mục chuẩn `cat-root-kinh-te-tai-chinh`, tái gán `categoryId` cho topic và `parentId` cho subcategory mà không làm mất ghi chú, tài liệu hay tiến độ SM-2.
   - **DataContext Action & Persistence Sequencing:** `mergeCategories` trong `DataContext.tsx` ghi nhận cập nhật in-memory, gọi `syncHydrate` trước để bảo đảm toàn vẹn dữ liệu, sau đó mới gọi `deleteCategory` trên kho lưu trữ.
   - **UI Safe Guard & Delete Confirm:** `TopicTree.tsx` nhận diện các danh mục kinh tế cũ qua `isEconomyMergeSource` và chuyển hướng thao tác xóa thành xác nhận gộp danh mục an toàn.
   - **Persistence Rehydration Hardening:** Khóa chặt hợp đồng `resetToDefaultData()` làm sạch toàn bộ legacy economy IDs và kiểm chứng 100% không bị hồi sinh category sau khi reload hay remount.
2. **Weekly Learning Cadence Bar & Habit Formation (Phase 14C):**
   - **Pure Selector:** [`src/lib/learningStateSelectors.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/learningStateSelectors.ts) cung cấp `getWeeklyLearningCadence` tính toán 7 ngày trong tuần ISO (T2 $\rightarrow$ CN) theo múi giờ địa phương, phân loại 4 cấp bậc nhịp học (`starting`, `building`, `consistent`, `strong`) và loại trừ các chủ đề ẩn.
   - **Component Trực Quan:** [`src/components/dashboard/WeeklyCadenceBar.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/dashboard/WeeklyCadenceBar.tsx) hiển thị 7 ô ngày mini, chỉ báo hôm nay (`isToday`), ngày đã học (`isActive`) và huy hiệu tổng kết số ngày/chủ đề ngay dưới Hero của Overview.
3. **Antigravity Result Ingestion & Tracker Completion Polish (Post-Phase 5 Micro-Increment):**
   - **Hàm Hoàn Tất Khớp Nối Phân Cấp:** Hàm thuần túy `completeMatchingHandoffJob` tại [`src/lib/antigravityPipeline.ts`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/lib/antigravityPipeline.ts) ưu tiên khớp chính xác theo `jobId` và `topicId` trước; nếu không có `jobId`, fallback khớp theo `(topicId + artifactType)` với pending job gần nhất (`queued` hoặc `processing`).
   - **Tích Hợp Nạp Artifact An Toàn:** [`NotebookLMStudioModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/integrations/NotebookLMStudioModal.tsx) tự động gọi `completeMatchingHandoffJob` khi lưu thành công Artifact mới (qua upload tệp Markdown hoặc form thủ công) và cập nhật giao diện tracker.
   - **Minh Bạch Ngữ Nghĩa Trạng Thái:** Huy hiệu `success` (emerald) được giải thích rõ là *"Đã nạp kết quả vào app"*, hoàn toàn không tuyên bố tự động hóa nền hai chiều qua cloud hay auto-dispatch `agy -p`.
4. **Data Management Modal & Confirmation Gate UI (Phase 2C.4 & 2C.4b - ADR-009):**
   - **Repository Injection & Health Polling:** [`src/components/modals/ExportImportModal.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/modals/ExportImportModal.tsx) nhận `repository?: IDataRepository` linh hoạt, tự động thăm dò sức khỏe cơ sở dữ liệu `getDbHealth()` và hiển thị Health Badge trực quan.
   - **Tách Biệt Capability vs Connectivity Error:** Phân định rõ ràng `isOfflineCapability` (khi gặp lỗi `UNSUPPORTED_OFFLINE_OPERATION` từ kho lưu trữ LocalStorage) vs `connectionError` (khi gặp lỗi mạng/server 500 ném trạng thái `unhealthy` đỏ *"PostgreSQL Mất Kết Nối"*), xóa bỏ hoàn toàn sự nhập nhằng trong trải nghiệm người dùng.
5. **Tính Toàn Vẹn Hệ Thống:**
   - [`src/components/search/SearchFilters.tsx`](file:///Users/mr.chem/Documents/Lap-trinh/Dashboard-update/src/components/search/SearchFilters.tsx) giữ nguyên 100% component contract.
   - **Zero Binary Ingestion:** Tài liệu tham khảo chỉ được xử lý qua metadata an toàn (`filePath`, `url`, `title`, `type`), không nạp binary vào bộ nhớ.
   - Không có thay đổi nào đối với Prisma Schema, REST API backend hay thêm dependency mới.

---

## 🛑 6. Blockers & Trạng Thái Sẵn Sàng (Production Readiness)

1. **Blockers kỹ thuật:** **0 blocker**.
2. **Trạng thái hệ thống:** **Phase 1–16 GREEN, 100% VERIFIED & PRODUCTION-READY (193 test files, 1204 tests passing)**.

