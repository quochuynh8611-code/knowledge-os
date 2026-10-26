# 📊 Knowledge OS — Bảng Điều Hành Trạng Thái Dự Án (Project Status & Roadmap)

> **Cập nhật lần cuối:** 2026-10-26<br>
> **Người phụ trách:** Staff Software Engineer / Technical Architect<br>
> **Trạng thái tổng thể:** 🟢 **ACADEMIC RESEARCH WORKSTATION (HORIZON 1 + HORIZON 2) — TOÀN BỘ 12 PHASE HOÀN TẤT VÀ XÁC MINH 100%. Phase 12 (ADR-116: Global Academic Command Palette & Workflow Router) đã hoàn tất cả 12A (Engine & Intent Parser) và 12B (UI Integration & Global Studio Routing). 100% Quality Gates: 13/13 Phase 12 Tests PASS, 23/23 Existing Command Palette Tests PASS, 79/79 Horizon 2 Master Suite Tests PASS, TypeScript 0 lỗi. Zero-Default Universal Baseline & Hermetic Test Guard tuân thủ tuyệt đối.**<br>
> **⚠️ QUY TẮC BẤT BIẾN:** Khi nâng cấp / phát triển tính năng mới, TUYỆT ĐỐI KHÔNG TÙY TIỆN THÊM BẤT KỲ LĨNH VỰC NGHIÊN CỨU (CATEGORIES) HOẶC CHỦ ĐỀ (TOPICS) MẶC ĐỊNH NÀO VÀO HỆ THỐNG.

---

## 🔒 1. Khóa Trạng Thái Hiện Hành (Current State Lock)

- **Current Baseline / HEAD (Local & origin/main):** Commit `bc4b60c` + Commercial Neutralization Baseline.
- **Recent Baseline Commits & Documents:**
  - `ADR-076`: Commercial Domain Neutralization & Zero-Default Universal Workspace (`docs/adr/ADR-076-commercial-domain-neutralization.md` + Addendum 1).
  - Session Log (2026-10-17): `docs/session-logs/2026-10-17-hermetic-test-guard-and-zero-default-rule.md`.
  - Session Log (2026-10-16): `docs/session-logs/2026-10-16-commercial-domain-neutralization-and-zero-default-baseline.md`.
  - Database Backup: `backups/pre_reset_backup_20261016_213525.json` (11 categories, 10 topics, 8 notes, 5 resources an toàn).
- **Recent Product Commits (Reader Subsystem - Pushed):**
  - R3d-A: `bc4b60c` (`feat(reader): implement persistent markdown highlights`)
  - R3d Regression Fix: `fc5f559` (`fix(test): align reader selection storage version`)
  - R3c: `5bd554e` (`feat(reader): add highlights filtering and quick search`)
  - R3b: `17d5f50` (`feat(reader): implement highlights color palette and inline annotations (Phase R3b)`)
- **Recent Product Commits (NotebookLM Direct MCP Integration — Pushed):**
  - `486c617`: `fix(notebooklm): separate query timeout and expose provider timeout code` (Fix 1 & Fix 2)
  - `a643d4b`: `fix(notebooklm): route live execution to enterprise provider`
  - `b562aa3`: `feat(notebooklm-ui): align direct MCP execution payload and response handling`
  - `06eb74d`: `fix(notebooklm): enforce MCP initialize handshake`
- **Product Implementation Commits (Milestone M7):**
  - M7a: `6f50935` (`feat(mindmap): add on-canvas crosslink inspect and quick delete (M7a)`)
  - M7b: `9c85033` (`feat(mindmap): add inline crosslink type mutation (M7b)`)
  - M7c: `9920333` (`feat(mindmap): add inline crosslink label renaming (M7c)`)
- **Documentation & Report Commits (Milestone M7):**
  - M7a Report: `6573799` (`docs(mindmap): add M7a closure report`)
  - M7b Report: `530a5dc` (`docs(mindmap): add M7b closure report`)
  - M7c Report: `675046a` (`docs(mindmap): add M7c closure report`)
- **Product Implementation Commits (Milestone M8):**
  - M8a: `001b9bb` (`feat(mindmap): add multi-edge crosslink selection and atomic batch delete (M8a)`)
  - M8b: `17aa603` (`feat(mindmap): add crosslink batch action bar with stacked canvas controls (M8b)`)
  - M8c: `674fcc7` (`feat(mindmap): add atomic batch crosslink type mutation with rollback guards (M8c)`)
- **Git Branch Status:** `main` hoàn toàn đồng bộ với `origin/main` tại commit `bc4b60c` (divergence 0 0).
- **Remote Policy:** Remote HEAD tại `bc4b60c`. Đã hoàn tất push an toàn.
- **Quality Gates Baseline:**
  - Reader Subsystem (R3d-A): 17/17 targeted tests PASS (`markdown-highlight-anchor.test.ts` 8/8, `markdown-reader-persistent-highlights.test.tsx` 6/6, `reader-selection-action-flow.test.tsx` 3/3), 25/25 related Reader regression tests PASS (100% GREEN), Build PASS, git diff --check PASS.
  - Reader Subsystem (R3c): 7/7 targeted tests PASS (`reader-sidebar-highlights-filter.test.tsx`), 16/16 related Reader regression tests PASS (100% GREEN).
  - Reader Subsystem (R3b): 40/40 PASS across 8 suites (100% GREEN).
  - Mind Map AI Migration: 59/59 PASS across 4 targeted suites (`gemini-routes.test.ts` 14/14, `mindmap-ai-service.test.ts` 22/22, `mindmap-ai-expansion-ui.test.tsx` 10/10, `phase-4-production-hardening.test.ts` 13/13).
  - TypeScript Typecheck: 0 errors trên canonical code; 7 pre-existing errors trên uncommitted code (`NotebookLMStudioModal.tsx`, `notebooklm-studio-direct-execution-alignment.test.tsx`, `phase15a-root-domain-expansion.test.tsx`, `phase15b-starter-topics-enrichment.test.tsx`).
  - Build Gate: Vite production bundle + Node server bundle PASS (`npm run build`, Exit Code 0).
  - Full Test Suite Note: Clean full test suite run bị giới hạn bởi Node 20.20.2 vs undici@8.10.0 (yêu cầu Node >=22.19.0).
  - Cross-Link & Canvas Wide Regression: 120/120 PASS.

---

## 📖 2. Thứ Tự Đọc Nguồn Chân Lý (Source-of-Truth Reading Order)

| Thứ tự | Tập tin | Vai trò & Mục đích |
| :---: | :--- | :--- |
| **1** | [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) | **Source-of-Truth chính**: Bức tranh toàn cảnh, baseline hiện tại, state lock và roadmap ứng viên tiếp theo. |
| **2** | [`docs/adr/ADR-076-commercial-domain-neutralization.md`](docs/adr/ADR-076-commercial-domain-neutralization.md) | **Quyết định kiến trúc ADR-076**: Commercial Domain Neutralization, Zero-default domain baseline, storage key `knowledge_os_v4`, Addendum 1 về Hermetic Test Guard. |
| **3** | [`docs/session-logs/2026-10-17-hermetic-test-guard-and-zero-default-rule.md`](docs/session-logs/2026-10-17-hermetic-test-guard-and-zero-default-rule.md) | **Báo cáo 2026-10-17 & Quy tắc bất biến**: Điều tra rò rỉ dữ liệu test vào database thật, Hermetic Test Guard trong `dataRepository` & `syncQueue`, và quy tắc cấm tùy tiện thêm lĩnh vực khi nâng cấp. |
| **4** | [`docs/session-logs/2026-10-16-commercial-domain-neutralization-and-zero-default-baseline.md`](docs/session-logs/2026-10-16-commercial-domain-neutralization-and-zero-default-baseline.md) | **Báo cáo phiên làm việc & Điều tra Runtime Mismatch**: Chi tiết quá trình trung tính hóa, phân tích vòng lặp đồng bộ, giải quyết PWA Desktop App `.app` bundle name cache. |
| **5** | [`docs/adr/ADR-102-mindmap-ai-backend-proxy-and-gemini-3.8-flash-migration.md`](docs/adr/ADR-102-mindmap-ai-backend-proxy-and-gemini-3.8-flash-migration.md) | **Quyết định kiến trúc ADR-102**: Chuyển Mind Map AI sang backend proxy `/api/gemini/mindmap-expand`, chuẩn hóa `getGeminiModel()` với `gemini-3.8-flash`, xóa bỏ frontend API key dependency, modal guard. |
| **6** | [`docs/adr/ADR-101-phase-r3b-reader-highlights-and-annotation-polish.md`](docs/adr/ADR-101-phase-r3b-reader-highlights-and-annotation-polish.md) | **Quyết định kiến trúc ADR-101**: Reader Highlights & Annotation Polish, `updateExcerpt` contract, 4-color palette core scope, non-goals justification. |
| **4** | [`docs/reports/mindmap-phase-m7c-closure-report.md`](docs/reports/mindmap-phase-m7c-closure-report.md) | Báo cáo đóng Phase M7c: Inline Cross-Link Label Renaming trên Canvas, commit protocol `Enter`/`Blur`, `Escape` revert guard, whitespace normalization, strict same-value no-op. |
| **5** | [`docs/reports/mindmap-phase-m7b-closure-report.md`](docs/reports/mindmap-phase-m7b-closure-report.md) | Báo cáo đóng Phase M7b: Inline Cross-Link `edgeType` Mutation trên Canvas, native `<select>`, validation `excludeEdgeId`, duplicate/cycle rejection, atomic history. |
| **6** | [`docs/reports/mindmap-phase-m7a-closure-report.md`](docs/reports/mindmap-phase-m7a-closure-report.md) | Báo cáo đóng Phase M7a: Direct On-Canvas Cross-Link Inspection & Quick Delete, 16px hit-target, floating popover, M6 keyboard isolation, M5b drag isolation. |
| **7** | [`docs/reports/mindmap-phase-m6-closure-report.md`](docs/reports/mindmap-phase-m6-closure-report.md) | Báo cáo đóng Phase M6: Focus-aware keyboard shortcut reconciliation giữa Canvas và Drawer, loại bỏ blanket guard, phục hồi 20/20 multi-selection test. |
| **8** | [`docs/reports/mindmap-phase-m5b-closure-report.md`](docs/reports/mindmap-phase-m5b-closure-report.md) | Báo cáo đóng Phase M5b: Canvas direct drag-to-connect interaction, pointer capture gesture, live Bézier preview, DOM hit-testing, history integration. |
| **9** | [`docs/adr/ADR-M5-003-canvas-drag-to-connect-architecture.md`](docs/adr/ADR-M5-003-canvas-drag-to-connect-architecture.md) | Quyết định kiến trúc ADR-M5-003: Dedicated connection handle, pointer capture lifecycle, fixed SVG preview, live validation. |
| **10** | [`docs/specs/m5b-canvas-drag-to-connect.md`](docs/specs/m5b-canvas-drag-to-connect.md) | Đặc tả kỹ thuật M5b: Gherkin scenarios, event isolation, undo/redo atomic contract cho canvas connection. |
| **11** | [`docs/reports/mindmap-phase-m4b-closure-report.md`](docs/reports/mindmap-phase-m4b-closure-report.md) | Báo cáo đóng Phase M4b-A: Local component hardening, pure viewport helpers, fail-closed geometry, event isolation. |
| **12** | [`docs/adr/ADR-100-mindmap-phase-m4b-viewport-zoom-polish.md`](docs/adr/ADR-100-mindmap-phase-m4b-viewport-zoom-polish.md) | Quyết định kiến trúc ADR-100: Hướng A (Local component hardening, zero state lifting), defense-in-depth isolation. |
| **13** | [`docs/specs/mindmap-phase-m4b-viewport-zoom-polish-spec.md`](docs/specs/mindmap-phase-m4b-viewport-zoom-polish-spec.md) | Đặc tả kỹ thuật M4b-A: Pure arithmetic contract, zoom steps, fail-closed zero-size, pointer isolation. |
| **14** | [`docs/reports/mindmap-phase-m4a-closure-report.md`](docs/reports/mindmap-phase-m4a-closure-report.md) | Báo cáo đóng Phase M4a: Filename resolution contract, Toast UX feedback, safe cleanup, state invariants. |
| **15** | [`docs/reports/phase-d2-global-quick-capture-modal-closure-report.md`](docs/reports/phase-d2-global-quick-capture-modal-closure-report.md) | Baseline Phase D2 (Global Quick-Capture Modal `⌘N`). |
| **16** | [`docs/specs/phase-f8-3-notebooklm-runtime-status-parent-wiring.md`](docs/specs/phase-f8-3-notebooklm-runtime-status-parent-wiring.md) | Đặc tả Phase F8.3: Nối `runtimeStatus` trung thực từ container cha xuống `NotebookLMStudioModal`, single source of truth helper `resolveDefaultRuntimeStatus`. |
| **17** | [`docs/specs/phase-f8-4-notebooklm-verified-status-source-of-truth.md`](docs/specs/phase-f8-4-notebooklm-verified-status-source-of-truth.md) | Đặc tả kiến trúc Phase F8.4: Khảo sát nguồn chân lý `verified` status, trade-offs, ranh giới an toàn, quyết định dừng ở `configured`. |
| **18** | [`docs/specs/notebooklm-direct-mcp-integration-spec.md`](docs/specs/notebooklm-direct-mcp-integration-spec.md) | Đặc tả kỹ thuật Canonical: Tích hợp trực tiếp NotebookLM MCP 2 chiều, fail-closed gating, ephemeral lifecycle, citation provenance, DTO contract. |

---

## 🎯 3. Các Ứng Viên Nâng Cấp Tiếp Theo (Next Upgrade Candidates)

| Ứng Viên | Tên Giai Đoạn & Trọng Tâm | Giá Trị Cho Người Dùng Cá Nhân | Mức Độ Phức Tạp | Trạng Thái / Ưu Tiên |
| :--- | :--- | :--- | :--- | :---: |
| **Completed** | **Phase 1 — Academic Reading & Notation Engine (ADR-105)**<br>- LaTeX/KaTeX math rendering, Pandoc footnote popup, Chemistry notation, Vietnamese transliteration/Sanskrit diacritics, EPUB chapter reading position persistence. | Nâng tầm hiển thị tài liệu học thuật chuyên sâu. | Trung bình | 🟢 **COMPLETE & VERIFIED (`73151eb`)** |
| **Completed** | **Phase 2 — Reference & Citation Hub (ADR-106)**<br>- Universal parser (BibTeX/RIS/Zotero JSON), DOI quick resolver, Multi-style citation generator (APA 7th, IEEE, Chicago, Harvard, MLA 9th), batch export. | Tự động hóa trích dẫn và quản lý tài liệu tham khảo chuẩn quốc tế. | Trung bình | 🟢 **COMPLETE & VERIFIED (`8fca756`)** |
| **Completed** | **Phase 3 — FSRS v5 Spaced Repetition Engine (ADR-107)**<br>- Thuật toán FSRS v5 hiện đại, đường cong quên lũy thừa DSR, Review Studio controls, Desired Retention Slider, Zero-Migration SM-2 bridge. | Tối ưu hóa trí nhớ dài hạn và chu kỳ ôn tập thẻ nhớ. | Cao | 🟢 **COMPLETE & VERIFIED (`c962b9a`)** |
| **Completed** | **Phase 4 — High-Fidelity PDF Text Layer & Page-Scoped Highlights (ADR-108)**<br>- Interactive PDF text layer DOM, Persistent 4-color highlights, Click-to-Jump page sync, Deep-link excerpt sang Flashcard/Note. | Tương tác trực tiếp trên tài liệu PDF học thuật. | Cao | 🟢 **COMPLETE & VERIFIED (`d9241fe`)** |
| **Completed** | **Phase 5 — Local Knowledge Copilot, Vector Search & Grounded RAG (ADR-109)**<br>- 128-D local semantic embedding, Cosine Similarity, Hybrid RRF (k=60), Grounded RAG retrieval studio với trích dẫn nguồn `[^SRC-N]`. | Trợ lý nghiên cứu AI thông minh dựa trên toàn bộ kho tri thức cục bộ. | Cao | 🟢 **COMPLETE & VERIFIED (`dd0b49e`)** |
| **Completed** | **Phase 6 — Guarded Auto-Backup Engine, Retention Rotation & System Reliability (ADR-110)**<br>- Zero-Data Overwrite Guard, SHA-256 Fingerprint Deduplication, N-Snapshot Ring Buffer, Hermetic Scheduling, Modular AutoBackupControlPanel, Pre-Restore Safety Snapshot Rollback. | Bảo vệ dữ liệu nghiên cứu tuyệt đối chống mất mát hoặc đè nhầm. | Cao | 🟢 **COMPLETE & VERIFIED (`47d3a95`)** |
| **Completed** | **Phase 7 — Smart Highlight-to-Flashcard & Cloze Synthesis Engine (ADR-111)**<br>- Cloze-auto, definition-split, qa-note strategies, balanced-brace LaTeX/mhchem preservation, Deep-Link Provenance Footer, Deduplication Guard, ExcerptFlashcardSynthesisModal Studio, ReaderSidebar 1-Click Integration. | Chuyển đổi tức thời các đoạn trích đọc thành thẻ nhớ FSRS v5 chất lượng cao. | Cao | 🟢 **COMPLETE & VERIFIED (`96b6988`)** |
| **Completed** | **Phase 8 — Literature Review Synthesis Matrix (ADR-112)**<br>- Ma trận so sánh chéo đa tài liệu, trích xuất luận điểm & dữ liệu thực nghiệm từ ResearchExcerpt, xuất bảng Markdown/LaTeX/CSV. | Tự động hóa xây dựng bảng tổng quan tài liệu luận văn học thuật. | Cao | 🟢 **COMPLETE & VERIFIED (`78f8cb2`)** |
| **Completed** | **Phase 9 — Academic Manuscript & Citekey Compiler (ADR-113)**<br>- Autocomplete `@citekey` từ BibTeX hub, Pandoc-style in-text citation compiler, tự động xuất danh mục tham khảo APA/IEEE. | Biên tập và xuất bản bài báo khoa học chuẩn mực. | Cao | 🟢 **COMPLETE & VERIFIED (`9e2d272`)** |
| **Completed** | **Phase 10 — Graph Centrality & Semantic Bridge Recommender (ADR-114)**<br>- Iterative PageRank Centrality, Weighted Degree, Orphan Detector (completely-isolated vs unlinked-island), 128-D Vector Semantic Bridges, GraphInsightsPanel. | Khám phá các mối liên kết tri thức ẩn giữa các cụm nghiên cứu. | Cao | 🟢 **COMPLETE & VERIFIED (`b0e7d2f`)** |
| **Candidate** | **Phase 11 — Obsidian & E-Ink Scholarly Round-Trip Bridge (ADR-115)**<br>- Đồng bộ hai chiều Obsidian Vault & thiết bị E-Ink (Boox/Supernote) qua Markdown chuẩn học thuật. | Kết nối trải nghiệm ghi chú đa thiết bị không đứt gãy mạch đọc. | Trung bình | 🟡 **TIẾP THEO (Horizon 2)** |
| **Candidate** | **Phase 12 — Global Academic Command Palette (⌘K) & Workflow Router (ADR-116)**<br>- Trung tâm điều khiển tối cao bàn phím, điều hướng tức thời giữa đọc sách, ôn tập FSRS, ma trận tổng quan và biên soạn bản thảo. | Thao tác siêu tốc không rời tay khỏi bàn phím. | Trung bình | ⚪ Sắp tới |

---

## 🧠 Smart Highlight-to-Flashcard & Cloze Synthesis Engine — Phase 7 Closure (2026-10-26)

- **Trạng thái:** 🟢 Complete & Verified (100% GREEN)
- **Commits:**
  - `96b6988`: `feat(flashcards): add smart highlight-to-flashcard synthesis engine and horizon 2 master plan`
  - Pending Phase 7B commit: `feat(flashcards): wire excerpt flashcard synthesis studio modal and 1-click reader sidebar integration`
- **Tests & Quality Gate:**
  - 14/14 Phase 7 tests PASS (`highlight-to-flashcard-engine.test.ts` 9/9, `highlight-to-flashcard-ui.test.tsx` 5/5).
  - 58/58 Reader Sidebar & FSRS regression tests PASS across 11 suites (100% GREEN).
  - TypeScript typecheck: 0 errors (`npx tsc --noEmit` hoàn tất thành công).
  - Tuân thủ nghiêm ngặt Zero-Default Universal Baseline (`ADR-076`) và Hermetic Test Guard (`ADR-077`).
- **Mục tiêu phase & 4 Bất Biến Kiến Trúc Hoàn Thành:**
  1. ✅ **Multi-Strategy Excerpt Synthesis (`'cloze-auto'`, `'definition-split'`, `'qa-note'`, `'auto'`)**:
     - Bóc tách tự động thuật ngữ in đậm, công thức toán/hóa học, định nghĩa dạng `Term: Definition` hoặc `Term là ...`.
     - Bọc cloze deletion `{{c1::...}}` bằng balanced brace scanner bảo toàn tuyệt đối các ngoặc nhọn TeX lồng nhau ($\frac{a}{b}$, $\ce{Fe^{2+}}$).
  2. ✅ **Deep-Link Provenance Footer**:
     - Mọi thẻ tạo ra đều có chân trang xuất xứ học thuật dạng `> 📖 Nguồn: [Title] • Trang X` (PDF), `• Vị trí EPUB` (EPUB), `• Mục: [Heading]` (Markdown) và lưu `sourceExcerptId` trong metadata.
  3. ✅ **Batch Deduplication Guard & Color Filtering**:
     - Lọc các trích đoạn theo bảng màu highlight (Vàng, Hồng, Xanh dương, Xanh lá).
     - Khử trùng lặp tự động dựa trên `sourceExcerptId` và chuỗi nội dung chuẩn hóa, hiển thị huy hiệu báo cáo số lượng thẻ trùng lặp bị bỏ qua.
  4. ✅ **ExcerptFlashcardSynthesisModal Studio & ReaderSidebar 1-Click Trigger**:
     - Xây dựng giao diện phòng thu tổng hợp thẻ với bộ chọn chủ đề FSRS, bộ chọn chiến lược, chỉnh sửa trực tiếp mặt trước/sau, xem trước KaTeX qua `AcademicMarkdown`.
     - Tích hợp nút 1-click "Tổng hợp Flashcard" ngay trong Highlights panel của `ReaderSidebar` và `UnifiedResearchReader`.

---

---

## 🛡️ Guarded Auto-Backup Engine, Retention Rotation & System Reliability — Phase 6 Closure (2026-10-25)

- **Trạng thái:** 🟢 Complete & Verified (100% GREEN)
- **Commits:**
  - `47d3a95`: `feat(backup): add guarded auto-backup scheduler, zero-data overwrite guard, and retention rotation`
  - Pending Phase 6B commit: `feat(backup): wire modular guarded auto-backup control panel, pre-restore safety snapshot, and close 6-phase master plan`
- **Tests & Quality Gate:**
  - 14/14 Phase 6 tests PASS (`guarded-auto-backup-engine.test.ts` 9/9, `guarded-auto-backup-ui.test.tsx` 5/5).
  - 48/48 backup & data management tests PASS across 8 suites (100% GREEN).
  - 100% tests PASS xuyên suốt toàn bộ 6 Phase của Academic Research Workstation (`ADR-105` đến `ADR-110`).
  - TypeScript typecheck: 0 errors (`npx tsc --noEmit` hoàn tất thành công).
  - Tuân thủ nghiêm ngặt Zero-Default Universal Baseline (`ADR-076`) và Hermetic Test Guard (`ADR-077`).
- **Mục tiêu phase & 4 Bất Biến Kiến Trúc Hoàn Thành:**
  1. ✅ **Zero-Data Overwrite Guard**: Từ chối sao lưu hoặc ghi đè lịch sử khi candidate workspace có `0` thực thể (`status: 'skipped-empty'`), trừ khi cờ `forceEmpty: true` được chỉ định rõ ràng trong thao tác thủ công.
  2. ✅ **Deterministic Content Fingerprint & Deduplication**: Băm SHA-256 trên tập thực thể đã chuẩn hóa, bỏ qua timestamp `exportedAt` và metadata jitter, trả về `status: 'skipped-unchanged'` khi nội dung nghiên cứu không đổi.
  3. ✅ **Atomic Verify-Before-Rotate ($N$-Snapshots Ring Buffer)**: Xác thực tính toàn vẹn trước khi ghi vào `localStorage` key `knowledge_os_auto_backup_snapshots_v1`; chỉ xoay vòng/cắt tỉa bản ghi cũ sau khi bản ghi mới vượt qua kiểm tra cấu trúc.
  4. ✅ **Hermetic Test Guard Compliance (ADR-077)**: Tính toán hạn đến hạn (`isAutoBackupDue`) hoàn toàn dựa trên phép trừ timestamp tất định, không rò rỉ timer `setInterval` chạy ngầm.
  5. ✅ **Modular AutoBackupControlPanel & Pre-Restore Safety Rollback**: Tạo component module độc lập `AutoBackupControlPanel.tsx` không làm phình to `ExportImportModal.tsx`, hỗ trợ cấu hình chu kỳ/số bản lưu, tạo snapshot thủ công, và tự động tạo snapshot an toàn `pre-restore` trước mỗi thao tác khôi phục.

## 🎨 Reader Highlights & Annotation Polish — Phase R3b Closure (2026-10-14)

- **Trạng thái:** 🟢 Complete & Verified Locally (Sẵn sàng commit local, CHƯA PUSH REMOTE)
- **Tests & Quality Gate:** 16/16 Targeted tests PASS (3 suites), 24/24 Reader regression tests PASS (5 suites), Tổng cộng 40/40 tests Reader subsystem PASS (100% GREEN), TypeScript typecheck 0 errors (`npx tsc --noEmit` hoàn tất thành công).
- **Mục tiêu phase:** Cung cấp trải nghiệm highlight đa màu sắc và ghi chú inline trọn vẹn cho tài liệu nghiên cứu trong UnifiedResearchReader, tận dụng 100% schema có sẵn mà không làm thay đổi database/Prisma schema và không ảnh hưởng đến Mind Map subsystem.
- **Tập tin đã thay đổi:**
  - `src/context/DataContext.tsx`: Thêm hợp đồng `updateExcerpt` immutable, cập nhật `updatedAt`, đồng bộ `safeSetLocalStorageItem`, đồng bộ embedded inbox reference.
  - `src/components/reader/UnifiedSelectionToolbar.tsx`: Thêm color palette 4 màu (`#fef08a`, `#bbf7d0`, `#bae6fd`, `#fbcfe8`), popover swatch, trigger `aria-label="Chọn màu đánh dấu"`, phím `Escape` đóng popover.
  - `src/components/reader/UnifiedResearchReader.tsx`: Nối payload color vào `addExcerpt` và truyền callback `onUpdateExcerpt={updateExcerpt}` xuống `ReaderSidebar`.
  - `src/components/reader/ReaderSidebar.tsx`: Render viền card theo `excerpt.highlightColor`, hiển thị khối `excerpt.userNote`, thêm inline note editor với nút thêm/sửa, phím `Escape` hủy draft, submit chuỗi rỗng để xóa note.
- **Tập tin kiểm thử đã tạo:**
  - `tests/unit/data-context-excerpt-update.test.tsx` (4 tests PASS)
  - `tests/unit/selection-toolbar-color-palette.test.tsx` (6 tests PASS)
  - `tests/unit/reader-sidebar-annotations.test.tsx` (6 tests PASS)
- **Tài liệu kiến trúc đã tạo:**
  - `docs/adr/ADR-101-phase-r3b-reader-highlights-and-annotation-polish.md`
- **Hành vi đã được kiểm chứng (Behaviors Delivered):**
  1. ✅ **DataContext `updateExcerpt`**: Cập nhật trích đoạn nguyên tử, không làm đổi ID, tự động cập nhật `updatedAt`, fail-safe khi ID không tồn tại.
  2. ✅ **1-Click Default Highlight**: Nút Highlight chính luôn dùng màu vàng mặc định (`#fef08a`) nhanh chóng và xác định (deterministic).
  3. ✅ **4-Color Popover Palette**: Bấm nút bảng màu mở 4 swatch (Vàng, Xanh lá, Xanh dương, Hồng); chọn màu lập tức tạo highlight với màu đó và đóng bảng màu.
  4. ✅ **Dynamic Sidebar Highlighting**: Từng trích đoạn trong tab Highlights hiển thị đường viền bên trái có màu sắc tương ứng với `excerpt.highlightColor`.
  5. ✅ **Note Rendering & Inline Editor**: Trích đoạn hiển thị ghi chú `userNote`; nút "Thêm ghi chú" / "Sửa ghi chú" mở inline editor với `<textarea>` tự động focus; nhấn `Escape` hủy nháp; lưu ghi chú rỗng tự động xóa note về `undefined`.
- **Non-Goals giữ nguyên:**
  - Không triển khai Quick Filter (lọc theo màu sắc hoặc tìm kiếm trích đoạn trong Sidebar) để giữ blast radius tối thiểu.
  - Không lưu Last-used Color vào `localStorage` nhằm tránh làm thay đổi hành vi mặc định của nút Highlight chính giữa các phiên đọc.
  - Không can thiệp cơ sở dữ liệu (Zero DB Migration).
  - Không can thiệp Mind Map subsystem (`src/components/mindmap/*`).
  - Không render tô màu trực tiếp lên DOM text layer của Markdown/PDF.
- **Follow-up Candidates:**
  - Phase R3c: Đã hoàn tất trong commit `5bd554e` (xem chi tiết mục R3c Closure bên dưới).
  - Phase R3d: Persistent color highlight rendering trên rendered Markdown / PDF text layer nếu cần thiết.

---

## 🔎 Reader Highlights Filtering & Quick Search — Phase R3c Closure (2026-10-15)

- **Trạng thái:** Complete, Pushed & CI Verified (`5bd554e`)
- **Tests & Quality Gate:**
  - 7/7 targeted tests PASS cho `reader-sidebar-highlights-filter.test.tsx`
  - 16/16 related Reader regression tests PASS (`reader-sidebar-annotations.test.tsx`, `selection-toolbar-color-palette.test.tsx`, `data-context-excerpt-update.test.tsx`)
  - full suite `503/503` test files PASS
  - `4305 passed`, `3 skipped`, `0 failed`
  - typecheck 0 errors (`npm run typecheck`)
  - build PASS (`npm run build`)
  - GitHub Actions CI SUCCESS trên commit `5bd554e` (Run ID `38677532285`)
- **Mục tiêu phase:** Bổ sung tính năng tìm kiếm nhanh và lọc trích đoạn theo màu sắc ngay trong ReaderSidebar highlights panel, giúp nâng cao hiệu suất tra cứu trên tài liệu nghiên cứu dài mà không làm thay đổi DataContext contract hay schema lưu trữ.
- **Tập tin đã thay đổi:**
  - `src/components/reader/ReaderSidebar.tsx`: Tích hợp shared palette constants `HIGHLIGHT_COLOR_PALETTE`, search input với Escape clear, thanh chip màu kèm số đếm, combined filtering (AND) và empty filtered state kèm nút đặt lại bộ lọc.
  - `tests/unit/reader-sidebar-highlights-filter.test.tsx`: Bộ kiểm thử đơn vị bao phủ toàn diện 7 kịch bản lọc và tìm kiếm.
- **Hành vi đã được kiểm chứng (Behaviors Delivered):**
  1. ✅ **Quick search theo `selectedText` và `userNote`**: Tìm kiếm từ khóa đồng thời trên cả nội dung trích dẫn và ghi chú người dùng.
  2. ✅ **Tìm kiếm không phân biệt dấu tiếng Việt / hoa thường**: Hàm `normalizeSearchText` chuẩn hóa Unicode NFD giúp tìm kiếm tự nhiên, nhập không dấu vẫn khớp chính xác văn bản có dấu.
  3. ✅ **Color filter chips với counts cho 4 màu + “Tất cả”**: Hiển thị badge số lượng đoạn trích theo từng màu sắc, toggle chọn/bỏ chọn màu linh hoạt theo chuẩn ARIA.
  4. ✅ **Combined filtering (AND)**: Kết hợp đồng thời điều kiện màu sắc và từ khóa tìm kiếm.
  5. ✅ **Empty filtered state + reset action**: Khi không tìm thấy kết quả phù hợp, hiển thị thông báo rõ ràng kèm nút "Đặt lại bộ lọc" để xóa toàn bộ điều kiện lọc.
  6. ✅ **Escape clears search nhưng không đóng sidebar**: Phím `Escape` trên search input xóa từ khóa và gọi `e.stopPropagation()` để bảo vệ trải nghiệm người dùng, không làm đóng sidebar cha.
- **Non-Goals giữ nguyên:**
  - Không lưu filter/search vào localStorage (giữ trạng thái phiên nhẹ nhàng, không lưu vết bộ lọc thừa).
  - Không có “ghi nhớ tùy chọn màu sắc cá nhân hóa”.
  - Không đổi DataContext contract, backend, Prisma hoặc DB schema.
  - Không can thiệp Mind Map subsystem.
  - Không render highlight trực tiếp lên DOM text layer.
- **Follow-up Candidates:**
  - Phase R3d-A: Đã hoàn tất và push an toàn tại commit `bc4b60c` (xem chi tiết mục R3d-A Closure bên dưới).
  - Phase R3d-B: Persistent EPUB Highlight Layer (Đã hoàn tất tại commit `0b888df`; nhánh PDF hoãn lại sang future milestone).

---

## 🖍️ Persistent Markdown Highlight Layer — Phase R3d-A Closure (2026-10-17)

- **Trạng thái:** Complete, Pushed & Synced (origin/main at `bc4b60c`, divergence 0 0)
- **Commits:**
  - `fc5f559`: `fix(test): align reader selection storage version`
  - `bc4b60c`: `feat(reader): implement persistent markdown highlights`
- **Tests & Quality Gate:**
  - 17/17 targeted tests PASS across 3 suites (`markdown-highlight-anchor.test.ts` 8/8, `markdown-reader-persistent-highlights.test.tsx` 6/6, `reader-selection-action-flow.test.tsx` 3/3)
  - 25/25 related Reader regression tests PASS across 5 suites (100% GREEN)
  - Build PASS (`npm run build` sinh bundle sạch, Exit Code 0)
  - git diff --check PASS (0 whitespace error, 0 trailing space warning)
  - Typecheck toàn repo: Blocked bởi 7 lỗi TypeScript pre-existing unrelated trong NotebookLM & Taxonomy
  - Full suite run: Chưa đạt do giới hạn môi trường Node.js 20.20.2 vs undici@8.10.0 (yêu cầu Node >=22.19.0)
- **Mục tiêu phase:** Cung cấp tính năng persistent highlight hiển thị trực quan trực tiếp trên văn bản Markdown đã render trong `UnifiedResearchReader` dựa trên `excerpt.highlightColor` và thuật toán neo văn bản an toàn (`markdownHighlightAnchor.ts`), tự động đồng bộ khi bôi đen / thêm / sửa / xóa highlight mà không làm thay đổi DataContext contract hay Prisma/DB schema.
- **Tập tin đã thay đổi (Production & Test):**
  - `src/lib/markdownHighlightAnchor.ts`: Thư viện tiện ích độc lập tìm kiếm text nodes, định vị character offset ranges, wrap `<mark>` tags mang màu palette, và unwrap an toàn.
  - `src/components/reader/adapters/MarkdownReaderAdapter.tsx`: Tích hợp persistent highlight rendering layer qua `useEffect` lắng nghe danh sách `excerpts`, tự động unwrap và vẽ lại khi DOM hoặc excerpts thay đổi.
  - `src/components/reader/UnifiedResearchReader.tsx`: Truyền danh sách `scopedExcerpts` xuống `MarkdownReaderAdapter`.
  - `tests/unit/markdown-highlight-anchor.test.ts`: Bộ kiểm thử đơn vị độc lập 8/8 tests bao phủ thuật toán neo và bọc DOM range.
  - `tests/unit/markdown-reader-persistent-highlights.test.tsx`: Bộ kiểm thử tích hợp 6/6 tests bao phủ rendering, dynamic update, màu sắc và unwrap lifecycle.
  - `tests/unit/reader-selection-action-flow.test.tsx`: Căn chỉnh storage version canonical constants (`CURRENT_STORAGE_VERSION = 4`), khắc phục test drift.
- **Hành vi đã được kiểm chứng (Behaviors Delivered):**
  1. ✅ **DOM Range Text Anchoring**: Hàm `findTextRangeInTextNodes` tìm kiếm và định vị chính xác khoảng văn bản xuyên qua các text nodes mà không làm hỏng cấu trúc HTML/Markdown đã render.
  2. ✅ **Persistent Highlight Rendering**: Ánh xạ từng `excerpt` thành thẻ `<mark class="research-highlight-persistent">` mang màu `excerpt.highlightColor` chuẩn xác.
  3. ✅ **Dynamic Lifecycle Synchronization**: Khi thêm mới trích đoạn, thay đổi màu sắc hoặc xóa trích đoạn trong `ReaderSidebar`, adapter tự động unwrap highlight cũ và render lại tập highlight mới nhất.
  4. ✅ **Idempotent & Safe Cleanup**: Khi component unmount hoặc tài liệu chuyển đổi, hàm `unwrapAllHighlights` khôi phục DOM sạch sẽ, không để lại thẻ rác hay rò rỉ bộ nhớ.
  5. ✅ **Selection Toolbar Isolation**: Persistent highlight layer không can thiệp hay cản trở cử chỉ bôi đen và thanh công cụ thao tác chọn văn bản hiện hữu.
- **Non-Goals giữ nguyên:**
  - Không triển khai PDF hoặc EPUB trong phase R3d-A (dành riêng cho Phase R3d-B).
  - Không sửa DataContext, Prisma schema, backend hay database.
  - Không can thiệp Mind Map subsystem.
- **Known Baseline Limitations:**
  - **Partial overlapping highlights**: Trường hợp 2 trích đoạn giao nhau một phần (partial overlap) trên cùng một TextNode chưa được bọc hoàn toàn; đã có try-catch fail-safe chống DOMException (non-goal trong Phase R3d-A).
  - **Phạm vi Markdown-only**: Định dạng PDF và EPUB chưa thuộc R3d-A (dành riêng cho Phase R3d-B).
  - **Zero backend/DB mutation**: Tuyệt đối không thay đổi backend routes, Prisma schema, database hay DataContext contract.
  - **Pre-existing Typecheck Blockers**: 7 lỗi TypeScript pre-existing unrelated trong `NotebookLMStudioModal.tsx`, `notebooklm-studio-direct-execution-alignment.test.tsx`, `phase15a-root-domain-expansion.test.tsx`, `phase15b-starter-topics-enrichment.test.tsx`.
  - **Environment Constraint**: Clean full test suite run bị giới hạn bởi xung đột môi trường Node 20.20.2 và `undici@8.10.0` (yêu cầu Node >=22.19.0).
  - **Targeted Test Coverage**: 17/17 targeted tests R3d-A và 25/25 reader regression tests đã pass 100% trên dependency tree chuẩn.
- **Follow-up Candidates:**
  - Phase R3d-B: Persistent EPUB Highlight Layer (Đã hoàn tất tại commit `0b888df`).
  - Future PDF Milestone: Custom PDF Text-Layer & Persistent Highlights (Deferred / Research).
  - Phase M8: Multi-Edge Selection & Cross-Link Batch Operations (Đã hoàn tất tại các commit `001b9bb`, `17aa603`, `674fcc7`).

---

## 📖 Persistent EPUB Highlight Layer — Phase R3d-B Closure (2026-10-20)

- **Trạng thái:** 🟢 Complete & Verified (Commit implementation `0b888df`)
- **Phạm vi kiến trúc:**
  - **EPUB Highlight Layer:** Hoàn tất đầy đủ và xác minh 100% trên W3C EPUB CFI và `rendition.annotations` API (`marks-pane`).
  - **PDF Persistent Highlights:** Chủ động hoãn lại (Deferred / Future Milestone) do native `<embed>` viewer không sở hữu DOM text-layer; cần nâng cấp sang custom PDF text-layer viewer (`pdf.js`) trong giai đoạn sau.
- **Tests & Quality Gate:**
  - 27/27 EPUB tests PASS across 3 test suites (`epub-reader-persistent-highlights.test.tsx` 8/8, `epub-reader-highlight-wiring.test.tsx` 5/5, `epub-reader-adapter.test.tsx` 14/14).
  - 100% GREEN trong Reader EPUB test suites.
  - TypeScript typecheck: PASS (`tsc --noEmit` 0 errors).
  - git diff --check: PASS (0 issues).
- **Mục tiêu phase:** Khôi phục và cung cấp lớp phủ highlight bền vững trực quan (`marks-pane` SVG overlay) cho tài liệu định dạng EPUB bên trong `UnifiedResearchReader` dựa trên W3C EPUB CFI persistent anchor và `rendition.annotations` API của `epubjs`, hỗ trợ đồng bộ vòng đời (lifecycle sync), đổi màu (recolor), xóa (remove), unmount cleanup, và cơ chế fail-closed an toàn đối với stale CFI hoặc legacy excerpts.
- **Tập tin đã thay đổi (Implementation Commit `0b888df`):**
  - `src/components/reader/adapters/EpubReaderAdapter.tsx`: Quản lý annotation sync manager qua `rendition.annotations`, diffing danh sách CFI, xử lý recolor/remove, fail-closed try-catch với stale CFI, và dọn dẹp annotation khi unmount.
  - `src/components/reader/UnifiedResearchReader.tsx`: Nối dây (prop wiring) truyền danh sách `documentHighlights`, `activeExcerptId` và callback `handleSelectExcerpt` xuống `EpubReaderAdapter`.
  - `tests/unit/epub-reader-persistent-highlights.test.tsx`: Bộ kiểm thử 8/8 tests bao phủ rendering, recolor diffing, deletion cleanup, unmount cleanup và fail-closed on invalid/stale CFI.
  - `tests/unit/epub-reader-highlight-wiring.test.tsx`: Bộ kiểm thử 5/5 tests bao phủ wiring từ `UnifiedResearchReader` xuống adapter.
- **Tài liệu kiến trúc & đặc tả:**
  - `docs/adr/ADR-104-phase-r3db-persistent-epub-highlight-layer.md`
  - `docs/gherkin/phase-r3db-persistent-epub-highlights.feature`
- **Hành vi cốt lõi đã được kiểm chứng (Core Behaviors Delivered):**
  1. ✅ **W3C EPUB CFI Persistent Anchoring:** Neo vị trí highlight chính xác dựa trên `positionSelector.cfi` độc lập với cỡ chữ, font hay reflowable pagination.
  2. ✅ **Non-Destructive SVG Overlay:** Sử dụng `rendition.annotations.highlight()` phối hợp cùng `marks-pane` tạo lớp phủ SVG overlay không làm thay đổi cấu trúc DOM XHTML của sách.
  3. ✅ **Two-Way Interaction & Selection Callback:** Nhấp vào highlight trên EPUB kích hoạt callback `onSelectExcerpt` đưa trích đoạn vào trạng thái active trong `ReaderSidebar`.
  4. ✅ **Annotation Sync & Diffing Lifecycle:** Khi excerpts thay đổi, tự động thêm highlight mới, cập nhật màu sắc (`recolor`) nếu `highlightColor` thay đổi, và xóa highlight (`rendition.annotations.remove`) khi trích đoạn bị xóa.
  5. ✅ **Fail-Closed on Stale/Invalid CFI:** CFI hỏng hoặc không tìm thấy Range được bắt lỗi an toàn (catch), ghi warning nội bộ, không làm crash rendition.
  6. ✅ **Legacy Excerpt Graceful Degradation:** Excerpt cũ không có CFI vẫn hiển thị đầy đủ trong `ReaderSidebar` mà không gây lỗi adapter.
  7. ✅ **Clean Unmount & Memory Guard:** Hủy bỏ toàn bộ annotations và event listeners khi component unmount hoặc thay đổi tài liệu.
- **Phạm vi hoãn lại (Deferred Scope):**
  - **PDF Persistent Highlights:** Native `<embed>` viewer hiện tại không có text-layer DOM để chèn marks. Yêu cầu chuyển đổi sang custom `pdf.js` canvas/text-layer viewer và được hoãn lại thành `Future PDF Milestone (Deferred / Research)`.
- **Non-Goals giữ nguyên:**
  - Zero DB / Prisma schema mutations.
  - Zero DataContext contract changes.
  - Không can thiệp Mind Map subsystem.

---

## 🔗 Backlink Occurrence Navigation & Note Context Precision — Phase 21B Closure (2026-10-20)

- **Trạng thái:** 🟢 Complete & Verified (Commit implementation `9134759`, Hardening/Integration `fc6e0d7`)
- **Tests & Quality Gate:**
  - 22/22 targeted tests PASS (`note-reader-archive-deeplink.test.tsx` 10/10, `reader-sidebar-citation-jump.test.tsx` 8/8, `reader-loop-hardening.test.tsx` 4/4).
  - 21/21 regression tests PASS across 4 suites (`reader-citation-backlinks-selector.test.ts` 8/8, `reader-sidebar-document-notes.test.tsx` 3/3, `reader-bidirectional-citation.test.tsx` 4/4, `global-citation-orchestration.test.tsx` 6/6).
  - Tổng cộng: 43/43 tests Reader subsystem liên quan PASS (100% GREEN).
  - TypeScript typecheck: PASS (`npm run typecheck` / `tsc --noEmit` 0 errors).
  - git diff --check: PASS (0 issues).
- **Mục tiêu phase:** Cung cấp tính năng điều hướng chính xác đến vị trí trích dẫn (occurrence navigation) bên trong `NoteReaderModal` khi nhấp vào một backlink note từ `ReaderSidebar`, tự động cuộn tới phần tử trích dẫn và gắn transient visual focus state, bảo toàn hoàn hảo vị trí đọc và tài liệu nguồn.
- **Hành vi cốt lõi đã được kiểm chứng (Core Behaviors Delivered):**
  1. ✅ **Target Citation Handoff:** Nhấp vào backlink note trong `ReaderSidebar` truyền gợi ý điều hướng `targetCitation` gồm `documentId` và `locator` ưu tiên thông qua `UnifiedResearchReader` vào `NoteReaderModal`.
  2. ✅ **Exact Locator Matching (Tier 1):** Khớp chính xác phần tử anchor trích dẫn theo cả `documentId` và `locator` (`a[data-archive-document-id="..."][data-archive-locator="..."]`).
  3. ✅ **First Document Occurrence Fallback (Tier 2):** Nếu không khớp locator hoặc không có locator, tự động fallback về phần tử trích dẫn đầu tiên của `documentId`.
  4. ✅ **Safe Degradation (Tier 3):** Nếu không có bất kỳ trích dẫn nào khớp, mở modal bình thường tại đỉnh mà không ném lỗi runtime.
  5. ✅ **Smooth Centered Scrolling:** Tự động cuộn mượt đưa phần tử trích dẫn vào giữa khung nhìn (`scrollIntoView({ behavior: 'smooth', block: 'center' })`).
  6. ✅ **Transient Visual Focus:** Gắn visual focus ring (`ring-2 ring-amber-500 bg-amber-500/20 rounded-sm transition-all duration-500`) và tự động giải phóng sau 2.5 giây kèm cleanup hook an toàn.
  7. ✅ **Reader Context Preservation:** Đóng `NoteReaderModal` (bằng phím `Escape` hoặc nút Đóng) bảo toàn 100% tài liệu đang đọc và vị trí cuộn trong `UnifiedResearchReader`.
- **Nguyên tắc kiến trúc bất biến (Architectural Invariants Preserved):**
  - Không ghi hoặc chỉnh sửa dữ liệu trong Obsidian Vault (100% read-only).
  - Không thay đổi Prisma schema, database hay REST API backend.
  - Không lưu trữ bền vững (zero persistence) vị trí occurrence vào DB hay LocalStorage (`targetCitation` là transient navigation hint).
  - Không bổ sung nút điều hướng next/prev occurrence stepper trong modal ở V1.
  - Không dùng heuristics dựa trên title hoặc path để khớp occurrence.
  - Không tùy tiện thêm lĩnh vực nghiên cứu (categories) hay chủ đề (topics) mặc định.
- **Ranh giới với Phase 22:**
  - Phase 22 (`ADR-081`) sở hữu các bằng chứng integration/hardening trong commit `fc6e0d7` (`tests/integration/reader-loop-hardening.test.tsx`, `escapeSelectorValue` phòng thủ, timer teardown isolation).
  - Phase 21B chính thức đóng tại đây. Phase 22 là phase tiếp theo kế thừa và hoàn thiện kiểm chứng toàn trình.

---

## 🛡️ Bidirectional Research Loop Verification & Reader Release Hardening — Phase 22 Closure (2026-10-20)

- **Trạng thái:** 🟢 Complete & Verified (Commit implementation `fc6e0d7`)
- **Tests & Quality Gate:**
  - 22/22 targeted tests PASS (`reader-loop-hardening.test.tsx` 4/4, `note-reader-archive-deeplink.test.tsx` 10/10, `reader-sidebar-citation-jump.test.tsx` 8/8).
  - 21/21 regression tests PASS across 4 suites (`reader-citation-backlinks-selector.test.ts` 8/8, `reader-sidebar-document-notes.test.tsx` 3/3, `reader-bidirectional-citation.test.tsx` 4/4, `global-citation-orchestration.test.tsx` 6/6).
  - Tổng cộng: 43/43 tests Reader subsystem liên quan PASS (100% GREEN).
  - TypeScript typecheck: PASS (`npm run typecheck` / `tsc --noEmit` 0 errors).
  - Production build: PASS (`npm run build` Vite production bundle + esbuild Node server bundle, Exit Code 0).
  - git diff --check: PASS (0 issues).
- **Mục tiêu phase:** Khép kín và xác minh toàn diện chu trình nghiên cứu hai chiều (End-to-End Bidirectional Research Loop) giữa Reader và Notes, đồng thời thực hiện làm vững chắc vòng đời (Lifecycle Hardening) cho `NoteReaderModal` và `UnifiedResearchReader` trước khi hoàn tất phát hành Reader Subsystem.
- **Hành vi cốt lõi đã được kiểm chứng (Core Behaviors Delivered):**
  1. ✅ **Dynamic Citation Addition & Reactive Backlinks (Luồng A):** Lưu trích đoạn kèm citation `archive://{docId}?loc={locator}` tự động cập nhật danh sách backlink trong tab Notes của `ReaderSidebar` theo thời gian thực mà không cần reload trang.
  2. ✅ **Full Bidirectional Round-Trip (Luồng B):** Click backlink note mở `NoteReaderModal` $\rightarrow$ cuộn mượt tới đúng vị trí occurrence $\rightarrow$ gắn visual focus ring (2.5s) $\rightarrow$ click citation link trong note đưa Reader chuyển vị trí đọc sang $P_1$ $\rightarrow$ đóng modal bảo toàn Reader tại $P_1$.
  3. ✅ **Timer Teardown & Rapid Close Resilience:** Quản lý timer highlight bằng `useEffect` cleanup hook, đảm bảo gỡ bỏ class và hủy timer ngay khi modal unmount nhanh (<100ms) hoặc đổi target note liên tiếp, ngăn chặn rò rỉ bộ nhớ và lỗi DOM unmounted access.
  4. ✅ **Special-Character Selector Escaping:** Bọc hàm `escapeSelectorValue` (`CSS.escape` với fallback regex) cho mọi giá trị `documentId` và `locator` chứa ký tự phức tạp (`%`, `&`, `#`, `.`, `:`, `=`), loại trừ hoàn toàn nguy cơ ném `DOMException`/`SyntaxError`.
  5. ✅ **Multi-Cycle Reading Position Isolation:** Quản lý vị trí đọc thông qua `globalReadingPositionStore` trong RAM, bảo toàn chính xác vị trí qua nhiều chu kỳ đóng/mở modal liên tục mà không bị race condition hay reset về 0.
  6. ✅ **Defensive `scrollIntoView`:** Sử dụng optional chaining `targetElement.scrollIntoView?.(...)` ngăn chặn crash trong môi trường test/headless thiếu implementation.
- **Nguyên tắc kiến trúc bất biến (Architectural Invariants Preserved):**
  - Không ghi hoặc chỉnh sửa dữ liệu trong Obsidian Vault (100% read-only).
  - Không thay đổi Prisma schema, database hay REST API backend.
  - Không lưu trữ bền vững (zero persistence) vị trí occurrence vào DB hay LocalStorage.
  - Không bổ sung nút điều hướng next/prev occurrence stepper trong modal ở V1.
  - Không dùng heuristics dựa trên title hoặc path để khớp occurrence.
  - Không tùy tiện thêm lĩnh vực nghiên cứu (categories) hay chủ đề (topics) mặc định (Zero-Default Universal Invariant).
- **Trạng thái Release Subsystem:**
  - Toàn bộ chuỗi tính năng Reader Subsystem (Phase 19, 20, 21A, 21B, 22) đã chính thức hoàn thành, vượt qua 100% Tier 1 Blocking Quality Gates, và sẵn sàng phát hành.

---

## 🤖 Mind Map AI Backend Proxy & Gemini 3.8 Flash Migration Closure (2026-10-14)

- **Trạng thái:** 🟢 Complete & Verified Locally (Local-only, CHƯA PUSH REMOTE)
- **Mục tiêu migration:** Di chuyển toàn bộ luồng gọi mở rộng Mind Map bằng AI từ client-side trực tiếp sang backend proxy bảo mật (`POST /api/gemini/mindmap-expand`), khắc phục triệt để lỗi deprecation model cũ `gemini-2.5-flash` (`404 NOT_FOUND`), chuyển sang model `gemini-3.8-flash`, xóa bỏ phụ thuộc `GEMINI_API_KEY` ở browser, và ngăn chặn silent mock fallback trên modal.
- **Phạm vi tập tin (10 files migration + 1 ADR):**
  - Production (7 files):
    - `src/server/services/geminiService.ts`: Thêm `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` và `getGeminiModel()`.
    - `src/lib/resilience.ts`: Mở rộng `CANDIDATE_MODELS` với `gemini-3.8-flash`.
    - `src/lib/validation.ts`: Thêm Zod schema `MindMapAiExpansionInputSchema` và enum `MindMapAiExpansionPresetEnum`.
    - `src/lib/mindmapAiService.ts`: Export `buildMindMapAiExpansionPrompt()`, chuyển default endpoint sang `/api/gemini/mindmap-expand`, bỏ frontend `GEMINI_API_KEY`.
    - `src/server/routes/geminiRoutes.ts`: Thêm endpoint `POST /gemini/mindmap-expand` với Zod validation, resilience engine, fallback bullet points parser.
    - `src/components/mindmap/MindMapView.tsx`: Khởi tạo `createGeminiMindMapAiClient()` và truyền qua prop `aiClient`.
    - `src/components/mindmap/MindMapAiExpansionModal.tsx`: Chặn silent mock fallback, hiển thị lỗi cấu hình rõ ràng nếu thiếu client.
  - Tests (3 files):
    - `tests/unit/gemini-routes.test.ts`: 14 tests PASS (400 validation, 503 missing key, 200 success, 500/503 retryable).
    - `tests/unit/mindmap-ai-service.test.ts`: 22 tests PASS (prompt building, proxy routing, error propagation).
    - `tests/unit/mindmap-ai-expansion-ui.test.tsx`: 10 tests PASS (UI integration modal, loading, error, cancel).
  - Architecture Decision Record:
    - `docs/adr/ADR-102-mindmap-ai-backend-proxy-and-gemini-3.8-flash-migration.md`.
- **Quality Gates Baseline:**
  - Targeted Test Suites: **59/59 PASS** (100% GREEN) trên 4 test suites liên quan (`gemini-routes.test.ts` 14/14, `mindmap-ai-service.test.ts` 22/22, `mindmap-ai-expansion-ui.test.tsx` 10/10, `phase-4-production-hardening.test.ts` 13/13).
  - TypeScript Typecheck: **0 errors** (`npm run typecheck` / `tsc --noEmit` hoàn tất thành công, Exit Code 0).
  - Git Diff Check: **0 trailing whitespace**, không có xung đột syntax.
  - Bảo mật: **0 occurrences** của `GEMINI_API_KEY` trong frontend source code; loại bỏ hoàn toàn `generativelanguage.googleapis.com` ở client.
- **Hành vi đã được kiểm chứng (Behaviors Delivered):**
  1. ✅ **Secure Backend Proxy Routing**: Client gửi request ngữ cảnh tới `/api/gemini/mindmap-expand`, server dùng `getGenAI()` với key an toàn trên server.
  2. ✅ **Gemini 3.8 Flash Support**: Sử dụng `getGeminiModel()` (mặc định `gemini-3.8-flash`) giải quyết triệt để lỗi 404 model cũ.
  3. ✅ **Structured Output & Fallback Parsing**: Hỗ trợ JSON response và fallback parser cho dạng bullet points nếu model trả text thô.
  4. ✅ **Resilience Integration**: Tích hợp retry có giới hạn (bounded retry) và fallback model khi gặp mã lỗi 429/503.
  5. ✅ **Explicit Modal Error State**: Modal không còn fallback ngầm sang mock data; nếu backend thiếu API key, thông báo 503 tiếng Việt hiển thị rõ ràng.
- **Non-Goals & Follow-up Items:**
  - Route `/api/gemini/cards` (Flashcard Generation) hiện vẫn giữ model hardcode `"gemini-3.6-flash"`. Do model này vẫn hoạt động bình thường, việc đồng bộ sang `getGeminiModel()` được ghi nhận là follow-up rủi ro thấp.

---

## 🔀 Multi-Edge Selection & Cross-Link Batch Operations — Milestone M8 Closure (2026-10-20)

- **Trạng thái:** 🟢 Complete & Verified (M8a: `001b9bb`, M8b: `17aa603`, M8c: `674fcc7`)
- **Tests & Quality Gate:**
  - 28/28 Targeted tests PASS:
    - `tests/unit/mindmap-crosslink-batch-selection.test.tsx`: 16/16 tests PASS (M8a: 7/7, M8b: 6/6, M8c: 3/3).
    - `tests/integration/mindmap-crosslink-quick-action-history.test.tsx`: 12/12 scenarios PASS (Scenario 8–12 bao phủ batch mutation, all-or-nothing rollback, strict no-op, atomic undo/redo).
  - 86/86 Related Mind Map regression tests PASS across 6 suites:
    - `mindmap-crosslink-canvas-inspect.test.tsx`: 21/21 PASS
    - `mindmap-crosslink-drag-connect.test.tsx`: 13/13 PASS
    - `mindmap-crosslinks-interaction.test.tsx`: 19/19 PASS
    - `mindmap-crosslinks-overlay.test.tsx`: 9/9 PASS
    - `mindmap-multi-selection.test.tsx`: 20/20 PASS
    - `mindmap-undo-redo.test.tsx`: 4/4 PASS
  - Tổng cộng: **114/114 tests PASS (100% GREEN)**.
  - TypeScript typecheck: PASS (`npm run typecheck` / `tsc --noEmit` 0 errors).
  - Production build: PASS (`npm run build` hoàn tất sạch sẽ, Exit Code 0).
  - Git diff check: PASS (`git diff --check` 0 whitespace issues).
- **Mục tiêu phase:** Cung cấp khả năng chọn nhiều liên kết chéo trên Canvas (`selectedCrossLinkIds: Set<string>`), thanh công cụ tác vụ hàng loạt chuyên biệt (`Floating Cross-Link Batch Action Bar`), hỗ trợ xóa hàng loạt (`Batch Delete`) và chuyển đổi loại quan hệ hàng loạt (`Batch Type Mutation`) với cơ chế bảo vệ chu trình / trùng lặp nghiêm ngặt (`All-or-Nothing Rule`), strict no-op, và tính toàn vẹn lịch sử hoàn tác nguyên tử (Atomic Undo/Redo) đúng 1 snapshot.
- **Tập tin đã thay đổi (Implementation Commits `001b9bb`, `17aa603`, `674fcc7`):**
  - `src/components/mindmap/MindMapTreeCanvas.tsx`: State `selectedCrossLinkIds: Set<string>`, keyboard listener xóa/thoát cạnh, floating batch action bar với vertical stacking guard (`bottom-6` vs `bottom-20`), dropdown đổi loại hàng loạt.
  - `src/components/mindmap/MindMapCrossLinksLayer.tsx`: Bổ sung prop `selectedEdgeIds`, nhận diện `isSelected`, hỗ trợ phím bổ trợ (`Shift/Cmd/Ctrl`) trên 16px hit-target, vô hiệu hóa hoàn toàn khi `isConnecting === true`.
  - `src/components/mindmap/MindMapView.tsx`: Nối handler `handleDeleteCrossLinkFromCanvas` nhận danh sách `string[]`, bổ sung `handleBatchUpdateCrossLinkTypeFromCanvas` với Strict No-Op, All-or-Nothing rollback guard, và commit nguyên tử duy nhất qua `applyMutation`.
- **Tài liệu kiến trúc & đặc tả:**
  - `docs/adr/ADR-M8-001-multi-edge-selection-and-crosslink-batch-operations.md` (Accepted)
  - `docs/specs/m8-multi-edge-selection-and-crosslink-batch-operations.md` (Completed)
- **Hành vi cốt lõi đã được kiểm chứng (Core Behaviors Delivered):**
  1. ✅ **Orthogonal State & Immutable Set:** Quản lý `selectedCrossLinkIds: Set<string>` tách biệt hoàn toàn với node selection; mọi cập nhật đều tạo instance `new Set()` mới, ngăn chặn side-effect đột biến ngầm.
  2. ✅ **Multi-Edge Selection Protocol:** Click thường chọn 1 cạnh (`size === 1`); `Shift + Click`, `⌘/Ctrl + Click` thêm/bớt cạnh (`size >= 2`); click khoảng trống canvas xóa sạch edge selection.
  3. ✅ **Seamless Popover vs. Batch Bar Transition:** `size === 1` hiển thị floating inspect popover đơn lẻ của M7; `size >= 2` tự động ẩn popover M7 và hiển thị Floating Cross-Link Batch Action Bar.
  4. ✅ **Vertical Stacking Guard:** Khi chỉ chọn cạnh (`selectedNodeIds.size < 2`), batch bar neo tại `bottom-6` (`data-stacked="false"`); khi đồng thời chọn $\ge 2$ nodes, batch bar tự động nâng lên `bottom-20` (`data-stacked="true"`), ngăn chặn đè chồng thanh node batch bar.
  5. ✅ **Batch UI Contract & Safe Actions:** Hiển thị `crosslink-batch-action-bar`, badge `crosslink-batch-selection-count` (`Đã chọn N liên kết`), nút `btn-crosslink-batch-delete`, nút `btn-crosslink-batch-deselect` (chỉ bỏ chọn cạnh, giữ nguyên node selection).
  6. ✅ **Keyboard Isolation & Shortcuts:** Phím `Delete`/`Backspace` xóa toàn bộ cạnh đang chọn; phím `Escape` clear cạnh nhưng bảo toàn 100% node selection.
  7. ✅ **M5b Gesture Safety:** Khi đang kéo thả tạo liên kết mới (`isConnecting === true`), toàn bộ hit-targets của cạnh chuyển sang `pointer-events: none`, triệt tiêu xung đột cử chỉ.
  8. ✅ **Batch Type Mutation Dropdown (`crosslink-batch-type-select`):** Cho phép chọn 4 loại `LinkType` chuẩn (`related`, `prerequisite`, `advanced`, `contradicts`) kèm placeholder vô hiệu hóa.
  9. ✅ **Strict No-Op Rule:** Nếu toàn bộ các cạnh được chọn đã có cùng type mục tiêu, thoát ngay lập tức: 0 mutation, 0 history snapshot, 0 error toast.
  10. ✅ **All-or-Nothing Transaction Guard:** Xác thực chu trình (`CYCLE_DETECTED`) và trùng lặp (`DUPLICATE_CROSS_LINK`) trên từng cạnh cập nhật; nếu có bất kỳ vi phạm nào, toàn bộ transaction bị hủy bỏ: 0 partial mutation, 0 snapshot lịch sử, hiển thị Toast cảnh báo, và bảo toàn nguyên vẹn selection đồ thị.
  11. ✅ **Atomic Undo/Redo Symmetry:** Cả Batch Delete và Batch Type Mutation hợp lệ đều gọi `applyMutation` tối đa 1 lần duy nhất, tạo đúng 1 entry trong Undo stack (`⌘Z` hoàn tác toàn bộ danh sách trong 1 bước duy nhất).
- **Non-Goals giữ nguyên:**
  - Zero database / Prisma schema changes.
  - Không gộp chung node selection và edge selection thành một state trừu tượng.
  - Không can thiệp Reader subsystem hay các tính năng AI khác.

---

## 🔗 Mind Map Direct On-Canvas Cross-Link Inspection & Quick Actions — Milestone M7 Closure (2026-10-12)

- **Status**: 🟡 Complete & Verified Locally (Commits `6f50935`, `9c85033`, `9920333`, LOCAL COMMIT COMPLETE — CHƯA PUSH REMOTE)
- **Tests**: 28/28 Targeted tests PASS (`mindmap-crosslink-canvas-inspect.test.tsx` 21/21, `mindmap-crosslink-quick-action-history.test.tsx` 7/7), 30/30 Cross-Link Regression Gate PASS across 4 suites, 120/120 Wide Regression Gate PASS
- **Typecheck**: 0 errors (`npx tsc --noEmit`)
- **Database & Architecture**: Không đổi schema database. Triển khai trọn vẹn bộ ba thao tác tương tác liên kết chéo trực tiếp trên Canvas:
  - **M7a — Inspection & Quick Delete**: Thêm 16px invisible hit-target bám sát đường cong Bézier, floating popover tại trung điểm, ưu tiên phím tắt `Delete`/`Backspace` xóa cạnh, `Escape` đóng popover bảo toàn node selection, M5b drag isolation và M6 focus safety.
  - **M7b — Inline `edgeType` Mutation**: Tích hợp native `<select>` với 4 loại quan hệ ngữ nghĩa (`related`, `prerequisite`, `advanced`, `contradicts`), mở rộng helper `validateCrossLinkMutation` với `options?: { excludeEdgeId?: string }`, xử lý same-type no-op, reject duplicate/cycle với Toast error, và ghi nhận 1 snapshot history nguyên tử.
  - **M7c — Inline Label Renaming**: Tích hợp `<input data-testid="crosslink-label-input">`, giao thức double-trigger commit (`Enter` + `Blur`), phím `Escape` revert draft nhãn mà không đóng popover, chuẩn hóa khoảng trắng thành `undefined`, strict same-value no-op, và tích hợp lịch sử hoàn tác nguyên tử đối xứng.

### Features Delivered & Verified Across Sub-Phases
1. ✅ **Invisible Hit-Target & Direct Canvas Selection (M7a)**: Người dùng có thể click trực tiếp vào đường cong liên kết chéo để chọn và mở inspect popover.
2. ✅ **On-Canvas Quick Delete & Drawer Handoff (M7a)**: Xóa nhanh liên kết qua nút xóa hoặc phím tắt `Delete`/`Backspace`; mở Drawer node nguồn qua nút handoff.
3. ✅ **Keyboard Precedence & Selection Safety (M7a)**: Phím `Escape` đóng popover mà không xóa multi-selection của các node; phím `Delete` ưu tiên xóa cạnh trước khi xóa node.
4. ✅ **Inline Relation Type Mutation (M7b)**: Thay đổi kiểu quan hệ trực tiếp trong popover bằng native `<select>`, đồng bộ 100% từ vựng với Node Drawer.
5. ✅ **Safe Mutation Validation with `excludeEdgeId` (M7b)**: Cho phép chuyển đổi type mà không bị báo lỗi trùng lặp giả mạo, chặn đứng trùng lặp thực tế hoặc tạo chu trình.
6. ✅ **Inline Label Editing & Clearing (M7c)**: Soạn thảo nhãn trực tiếp trên Canvas; nhập chuỗi rỗng hoặc khoảng trắng để xóa nhãn thành `undefined`.
7. ✅ **Double-Trigger Commit Protocol (M7c)**: Commit nhãn bằng cả phím `Enter` và sự kiện `Blur`, không bao giờ làm mất dữ liệu người dùng.
8. ✅ **Dedicated `Escape` Draft Revert Guard (M7c)**: Nhấn `Escape` trong input hoàn nguyên bản nháp về giá trị ban đầu và giữ popover mở.
9. ✅ **M6 Focus-Aware Shortcut Isolation**: Phím `Delete`/`Backspace` khi focus trong `<select>` hoặc `<input>` không bao giờ kích hoạt xóa cạnh hay xóa node.
10. ✅ **Atomic Undo/Redo Symmetry**: Mọi thay đổi hợp lệ (xóa, đổi type, đổi label) đều ghi nhận đúng 1 entry qua `applyMutation`, hỗ trợ hoàn tác (`⌘Z`) và làm lại (`⇧⌘Z`) hoàn hảo.
11. ✅ **Strict No-Op & Zero-History Invariant**: Reselect cùng type hoặc submit cùng nhãn không làm bẩn tài liệu và tạo đúng 0 history entry.

### Artifacts
- **Closure Reports**:
  - [`docs/reports/mindmap-phase-m7a-closure-report.md`](docs/reports/mindmap-phase-m7a-closure-report.md)
  - [`docs/reports/mindmap-phase-m7b-closure-report.md`](docs/reports/mindmap-phase-m7b-closure-report.md)
  - [`docs/reports/mindmap-phase-m7c-closure-report.md`](docs/reports/mindmap-phase-m7c-closure-report.md)
- **Primary Tests**:
  - [`tests/unit/mindmap-crosslink-canvas-inspect.test.tsx`](tests/unit/mindmap-crosslink-canvas-inspect.test.tsx) (21 unit tests)
  - [`tests/integration/mindmap-crosslink-quick-action-history.test.tsx`](tests/integration/mindmap-crosslink-quick-action-history.test.tsx) (7 integration scenarios)

---

## ⌨️ Mind Map Canvas Focus & Keyboard Shortcut Reconciliation — Phase M6 Closure (2026-10-12)

- **Status**: ✅ Complete, Verified & Pushed to Remote (Commit `caa1504`, PUSHED / IN-SYNC)
- **Tests**: 39/39 Targeted tests PASS (`mindmap-multi-selection.test.tsx` 20/20, `mindmap-keyboard-authoring.test.tsx` 12/12, `mindmap-keyboard-nav.test.tsx` 7/7), 120/120 Regression Gate PASS across 12 suites
- **Typecheck**: 0 errors (`npx tsc --noEmit`)
- **Database & Architecture**: Không đổi schema database. Giải quyết triệt để xung đột quyền sở hữu bàn phím giữa Canvas và Node Drawer:
  - Loại bỏ hoàn toàn blanket guard `if (isDrawerOpen) return;` trong `MindMapTreeCanvas.tsx`.
  - Mở rộng helper `shouldIgnoreCanvasShortcut(target)` trong `src/lib/mindmapHistory.ts` để nhận diện cả container `[data-testid='mindmap-node-drawer']`.
  - Thiết lập cơ chế **focus-aware keyboard isolation**: Canvas chỉ bỏ qua phím tắt khi người dùng đang thực sự focus vào form controls/inputs bên trong Drawer; nếu focus ở Canvas backdrop hoặc phím điều hướng hợp lệ, các phím tắt xóa (`Delete` / `Backspace`), điều hướng (`Arrow`), thêm node (`Tab`, `Enter`) tiếp tục hoạt động mượt mà.
  - Phục hồi 100% (20/20 PASS) bộ test đa lựa chọn và xóa hàng loạt `tests/unit/mindmap-multi-selection.test.tsx`.

### Features Delivered & Verified
1. ✅ **Focus-Aware Keyboard Ownership**: Phân tách rõ ràng giữa trạng thái hiển thị của Drawer và trạng thái active element thực tế của bàn phím.
2. ✅ **Multi-Selection Batch Deletion**: Khôi phục khả năng xóa node đơn lẻ hoặc hàng loạt bằng phím `Delete`/`Backspace` ngay cả khi Drawer đang mở chế độ xem chi tiết.
3. ✅ **Drawer Input Text Safety**: Bảo đảm 100% các phím gõ text, `Backspace`, `Delete` khi đang soạn thảo trong title input / notes textarea của Drawer không bị Canvas bắt trộm.
4. ✅ **Zero Regression Across Authoring & Navigation**: Toàn bộ thao tác tạo node con (`Tab`), tạo node anh em (`Enter`), điều hướng cây (`Arrow keys`) duy trì tính toàn vẹn 100%.

### Artifacts
- **Closure Report**: [`docs/reports/mindmap-phase-m6-closure-report.md`](docs/reports/mindmap-phase-m6-closure-report.md)
- **Primary Tests**: [`tests/unit/mindmap-multi-selection.test.tsx`](tests/unit/mindmap-multi-selection.test.tsx), [`tests/unit/mindmap-keyboard-authoring.test.tsx`](tests/unit/mindmap-keyboard-authoring.test.tsx), [`tests/unit/mindmap-keyboard-nav.test.tsx`](tests/unit/mindmap-keyboard-nav.test.tsx)

---

## 🔗 Mind Map Canvas Direct Drag-to-Connect — Phase M5b Closure (2026-10-12)

- **Status**: ✅ Complete, Verified & Pushed to Remote (Commit `ae66568`, PUSHED / IN-SYNC)
- **Tests**: 15/15 Targeted tests PASS (`mindmap-crosslink-drag-connect.test.tsx` 8/8, `mindmap-crosslink-drag-history.test.tsx` 7/7), 13/13 M5a regression tests PASS, 99/99 Wider Canvas Gate PASS
- **Typecheck**: 0 errors (`npx tsc --noEmit`)
- **Database & Architecture**: Không đổi schema database. Triển khai cơ chế kéo thả trực tiếp trên Canvas để nối liên kết chéo (cross-links) theo ADR-M5-003:
  - Cổng kết nối chuyên biệt (`data-testid="connector-handle-${node.id}"`) tại rìa phải node khi `isEditable === true`.
  - Quản lý vòng đời cử chỉ kéo thả bằng Pointer Events API (`setPointerCapture`, `onPointerMove`, `onPointerUp`, `onPointerCancel`).
  - Lớp SVG Client-Space Preview Overlay (`data-testid="mindmap-connect-preview-layer"`) render đường cong Bézier thời gian thực với màu sắc phân biệt hợp lệ (`data-valid="true"`) và không hợp lệ (`data-valid="false"`).
  - Live Hit-Testing bằng DOM `elementFromPoint` kết hợp kiểm tra ràng buộc `validateCrossLinkMutation` (chống self-link, duplicate link, cycle creation).
  - Tích hợp lịch sử hoàn tác nguyên tử: Undo (`⌘Z`) gỡ bỏ liên kết, Redo (`⇧⌘Z`) phục hồi liên kết chính xác.
  - Cách ly cử chỉ hoàn hảo: không kích hoạt pan canvas, không kích hoạt marquee selection, phím `Escape` hủy bỏ tức thì không làm bẩn tài liệu.

### Features Delivered & Verified
1. ✅ **Dedicated Connection Handle**: Cổng kết nối tròn xuất hiện bên phải node ở chế độ chỉnh sửa, tự động ẩn khi chỉ đọc.
2. ✅ **Pointer Capture Life-cycle**: Khóa con trỏ chuột an toàn, theo dõi cử chỉ kéo trên toàn màn hình.
3. ✅ **Live Bézier Curve Feedback**: Xem trước đường cong kết nối trực quan theo thời gian thực.
4. ✅ **Real-time Constraint Validation**: Phản hồi tức thì trạng thái chấp nhận hoặc từ chối kết nối dựa trên luật liên kết.
5. ✅ **Atomic Undo/Redo Integration**: Kết nối tạo liên kết chéo đồng bộ vào `workingDocumentCrossLinks` và lưu vào lịch sử chỉnh sửa tài liệu.
6. ✅ **Instant Escape Cancellation**: Nhấn `Escape` hủy phiên kéo lập tức, không lưu rác vào undo history.

### Artifacts
- **Planning Spec**: [`docs/specs/m5b-canvas-drag-to-connect.md`](docs/specs/m5b-canvas-drag-to-connect.md)
- **ADR**: [`docs/adr/ADR-M5-003-canvas-drag-to-connect-architecture.md`](docs/adr/ADR-M5-003-canvas-drag-to-connect-architecture.md)
- **Closure Report**: [`docs/reports/mindmap-phase-m5b-closure-report.md`](docs/reports/mindmap-phase-m5b-closure-report.md)
- **Primary Tests**: [`tests/unit/mindmap-crosslink-drag-connect.test.tsx`](tests/unit/mindmap-crosslink-drag-connect.test.tsx), [`tests/integration/mindmap-crosslink-drag-history.test.tsx`](tests/integration/mindmap-crosslink-drag-history.test.tsx)

---

## 🔍 Mind Map Viewport Zoom Polish — Phase M4b-A Closure (2026-10-11)

- **Status**: ✅ Complete & Verified Locally (Commit `9b80e0c`, LOCAL-ONLY / NOT PUSHED)
- **Tests**: 18/18 Targeted tests PASS, 67/67 Canvas/Viewport/Minimap/Keyboard Regression tests PASS, 7/7 Export Integration tests PASS
- **Typecheck**: 0 errors (`npx tsc --noEmit`)
- **Database & Architecture**: Không đổi schema database. Hướng A (Direction A: Local Component Polish): Giữ nguyên toàn bộ trạng thái `zoom` và `pan` cục bộ bên trong `MindMapTreeCanvas.tsx` (zero state lifting lên `MindMapView.tsx`). Trích xuất 3 pure arithmetic helpers: `clampZoom`, `formatZoomPercent`, `computeFitScale`. Xử lý hình học bất thường fail-closed an toàn về `zoom = 1.0, pan = { x: 0, y: 0 }`. Phòng vệ đa tầng pointer event isolation (`onPointerDown={(e) => e.stopPropagation()}`) trên container widget điều khiển zoom. Thao tác điều hướng viewport thuần túy read-only (không làm bẩn tài liệu, không ghi undo history, không kích hoạt tree mutations).

### Features Delivered & Verified
1. ✅ **Pure Viewport Arithmetic Helpers**: Export `clampZoom(zoom, min=0.5, max=2.0)`, `formatZoomPercent(zoom)`, và `computeFitScale(backdropW, backdropH, contentW, contentH, currentZoom, padding=64)` hoạt động độc lập với DOM và có kiểm thử số học biên 100%.
2. ✅ **Refactored Zoom In / Zoom Out**: Sử dụng `clampZoom` với bước nhảy 0.1, khử sai số số học dấu phẩy động bằng `+zoom.toFixed(2)`, quản lý chính xác trạng thái disabled tại biên [0.5, 2.0].
3. ✅ **Refactored Fit-to-Viewport**: Tích hợp `computeFitScale`, bảo đảm safety padding 64px và reset pan về `{ x: 0, y: 0 }`.
4. ✅ **Fail-Closed Zero-Size Geometry**: Khi backdrop hoặc nội dung có kích thước `<= 0` hoặc `NaN` (chưa mount DOM hoặc tab ẩn), tự động phục hồi an toàn về `scale = 1.0, pan = { x: 0, y: 0 }`.
5. ✅ **Pointer Event Isolation**: Container widget điều khiển zoom chặn triệt để sự kiện pointer down/click, loại bỏ 100% hiện tượng click nút zoom vô tình kích hoạt drag-pan trên canvas backdrop.
6. ✅ **Read-Only Invariants**: Đảm bảo các thao tác zoom/pan/fit/reset không làm bẩn tài liệu (`isDirty === false`), không đẩy mutation vào Undo/Redo stack và không gọi bất kỳ mutation callback nào của cây (`onMoveUp`, `onAddChild`, `onDeleteNodeDirectly`).

### Artifacts
- **Planning Spec**: [`docs/specs/mindmap-phase-m4b-viewport-zoom-polish-spec.md`](docs/specs/mindmap-phase-m4b-viewport-zoom-polish-spec.md)
- **ADR**: [`docs/adr/ADR-100-mindmap-phase-m4b-viewport-zoom-polish.md`](docs/adr/ADR-100-mindmap-phase-m4b-viewport-zoom-polish.md)
- **Closure Report**: [`docs/reports/mindmap-phase-m4b-closure-report.md`](docs/reports/mindmap-phase-m4b-closure-report.md)
- **Primary Tests**: [`tests/unit/mindmap-viewport-zoom.test.tsx`](tests/unit/mindmap-viewport-zoom.test.tsx)

---

## 🗺️ Mind Map Export UX Hardening — Phase M4a Closure (2026-10-11)

- **Status**: ✅ Complete & Verified Locally (Commit `fb8bc42`, LOCAL-ONLY / NOT PUSHED)
- **Tests**: 7/7 Targeted tests PASS, 66/66 Regression tests PASS
- **Typecheck**: 0 errors (`npx tsc --noEmit`)
**Database & Architecture**: Không đổi schema. Không đổi projection engine. Xử lý chuẩn hóa tên file tải về ưu tiên tiêu đề tài liệu (`activeDocumentSummary.title`) cho cả SVG và PNG. Bổ sung Toast feedback thông báo thành công và thất bại cho người dùng. Bảo toàn 100% tính chất read-only (không làm bẩn tài liệu, không ghi undo history).

### Features Delivered & Verified
1. ✅ **Filename Resolution Contract**: Ưu tiên `activeDocumentSummary.title` khi ở `saved-document` mode, fallback về `projection.rootTitle` và `"Topic"`. Áp dụng đồng bộ cho cả SVG và PNG.
2. ✅ **Success & Error Toast Feedback**: Tích hợp component `Toast` có sẵn, hiển thị thông báo tức thì khi xuất file SVG/PNG thành công hoặc khi xảy ra sự cố rasterize.
3. ✅ **Safe Memory & Loading Cleanup**: Khối `finally` đảm bảo luôn thu hồi `URL.revokeObjectURL(url)` và giải phóng nút bấm khỏi trạng thái `isExportingPng = true`.
4. ✅ **State Invariants Isolation**: Thao tác xuất file hoàn toàn là read-only, không làm thay đổi `isDirty`, không đẩy mutation vào Undo/Redo stack.

### Artifacts
- **Planning Spec**: [`docs/specs/mindmap-phase-m4a-export-ux-hardening-spec.md`](docs/specs/mindmap-phase-m4a-export-ux-hardening-spec.md)
- **ADR**: [`docs/adr/ADR-099-mindmap-phase-m4a-export-ux-hardening.md`](docs/adr/ADR-099-mindmap-phase-m4a-export-ux-hardening.md)
- **Closure Report**: [`docs/reports/mindmap-phase-m4a-closure-report.md`](docs/reports/mindmap-phase-m4a-closure-report.md)
- **Primary Tests**: [`tests/integration/mindmap-export-workflow.test.tsx`](tests/integration/mindmap-export-workflow.test.tsx)

---

## ⚡ Global Quick-Capture Modal — Phase D2 Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `d6d5503`, LOCAL-ONLY / NOT PUSHED)  
**Tests**: 12/12 Targeted tests PASS, 30/30 Regression tests PASS  
**Typecheck**: 0 errors (`npx tsc --noEmit`)  
**Database & Architecture**: Zero schema migration. Zero backend API changes. Toàn bộ thao tác dựa trên client-side DataContext và localStorage persistence hiện hữu. Tái sử dụng contract canonical `addExcerptToInbox(excerpt)` với `archivedDocumentId: "quick-capture"` và `status: "inbox"`. Không sửa `Navbar.tsx`.

### Features Delivered & Verified
1. ✅ **Global Quick-Capture Modal (`QuickCaptureModal.tsx`)**: Modal toàn cục gọn gàng, tự động focus `textarea`, hỗ trợ submit nhanh bằng `⌘+Enter` hoặc `Ctrl+Enter`, Escape đóng modal tức thì mà không cần popup confirm.
2. ✅ **Phím tắt toàn cục `⌘N` / `Ctrl+N`**: Bắt trong `useKeyboardShortcuts.ts`, gọi `preventDefault` để hạn chế mở cửa sổ mới trình duyệt, hoạt động omnipresent trên toàn shell.
3. ✅ **Command Palette Fallback**: Bổ sung action `act-quick-capture` ("Ghi Chú Nhanh (Quick Capture)") vào danh mục `Hành động nhanh` của Command Palette làm phương án thay thế đáng tin cậy 100% khi phím tắt bị trình duyệt chặn.
4. ✅ **Canonical Payload Contract**: Đóng gói văn bản nhập vào thành trích đoạn `ResearchExcerpt` chuẩn mực (`archivedDocumentId: "quick-capture"`, title: "Ghi chú chớp nhoáng", author: "Quick Capture", status: "inbox", highlightColor: "#f59e0b").
5. ✅ **Bảo toàn dữ liệu khi lỗi (Error Retention)**: Khi thao tác lưu gặp lỗi, modal không đóng và không xóa văn bản draft trong textarea, đảm bảo người dùng không mất ý tưởng.
6. ✅ **Shortcuts Tra Cứu**: Bổ sung `⌘N` / `Ctrl+N` vào nhóm "Thao Tác Nhanh & Tìm Kiếm" trong `ShortcutsModal.tsx`.

### Artifacts
- **Planning Spec**: [`docs/specs/phase-d2-global-quick-capture-modal-spec.md`](docs/specs/phase-d2-global-quick-capture-modal-spec.md)
- **ADR**: [`docs/adr/ADR-098-phase-d2-global-quick-capture-modal.md`](docs/adr/ADR-098-phase-d2-global-quick-capture-modal.md)
- **Closure Report**: [`docs/reports/phase-d2-global-quick-capture-modal-closure-report.md`](docs/reports/phase-d2-global-quick-capture-modal-closure-report.md)
- **Targeted Test Suite**: [`tests/unit/quick-capture-modal.test.tsx`](tests/unit/quick-capture-modal.test.tsx)

---

## Dashboard Daily Due Review Widget — Phase D1 Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `d951c73`, LOCAL-ONLY / NOT PUSHED)  
**Tests**: 7/7 Targeted tests PASS, 8/8 Regression tests PASS  
**Typecheck**: 0 errors (`npx tsc --noEmit`)  
**Database & Architecture**: Không đổi schema. Bổ sung `DailyDueReviewWidget` độc lập tại `DashboardHome`, kết nối trực tiếp `openFlashcardReview(null, "review")` để mở `FlashcardReviewStudio` cho toàn bộ thẻ đến hạn với 1-click. Cô lập lỗi an toàn (Fail-Safe Error Boundary), không gây gián đoạn các khối khác trên dashboard.

### Features Delivered & Verified
1. ✅ **Trạng thái có thẻ đến hạn (`dueToday > 0`)**: Hiển thị số lượng thẻ đến hạn, huy hiệu "Cần ôn hôm nay", ước tính `~5 phút`, và nút CTA "Ôn tập ngay 5 phút".
2. ✅ **1-Click Review Launch**: Nhấp CTA kích hoạt trực tiếp `openFlashcardReview(null, "review")` đưa thẳng người dùng vào studio ôn tập SM-2 toàn vault, và tự động trở lại Dashboard khi đóng.
3. ✅ **Trạng thái All-Caught-Up (`dueToday === 0`)**: Thông điệp thành tựu tích cực "Đã hoàn tất mục tiêu hôm nay" kèm icon `CheckCircle2` và tỷ lệ ghi nhớ (`retentionRate`), ẩn nút thúc giục quá hạn.
4. ✅ **Khả năng phục hồi khi lỗi (Error Resilience)**: Khi API `/api/flashcards/progress` gặp sự cố hoặc offline, widget hiển thị fallback nhẹ nhàng kèm nút "Thử lại", tuyệt đối không làm sập `DashboardHome`.
5. ✅ **Tách biệt kiến trúc**: Tồn tại độc lập khỏi `FlashcardAnalyticsWidget`, tập trung thuần túy vào vòng lặp thói quen ôn tập hàng ngày.

### Artifacts
- **Planning Spec**: [`docs/specs/phase-d1-dashboard-daily-due-review-widget-spec.md`](docs/specs/phase-d1-dashboard-daily-due-review-widget-spec.md)
- **ADR**: [`docs/adr/ADR-097-phase-d1-dashboard-daily-due-review-widget.md`](docs/adr/ADR-097-phase-d1-dashboard-daily-due-review-widget.md)
- **Closure Report**: [`docs/reports/phase-d1-dashboard-daily-due-review-widget-closure-report.md`](docs/reports/phase-d1-dashboard-daily-due-review-widget-closure-report.md)
- **Primary Tests**: [`tests/unit/dashboard-daily-due-widget.test.tsx`](tests/unit/dashboard-daily-due-widget.test.tsx)

---


## Mind Map Keyboard Authoring — Phase M3 Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `5bfe56a`, LOCAL-ONLY / NOT PUSHED)  
**Tests**: 11/11 Targeted tests PASS, 55/55 Regression tests PASS  
**Typecheck**: 0 errors (`npx tsc --noEmit`)  
**Database & Architecture**: Không đổi schema. Mở rộng mind map saved-document runtime theo hướng keyboard authoring tối thiểu, mode-gated, focus-driven; giữ nguyên projection parity, dirty-state, undo/redo và Save Version pipeline.

### Features Delivered & Verified
1. ✅ **Child creation bằng `Tab`**: tạo node con mới với title mặc định `"New node"`, append cuối danh sách `children`, sau đó tự động chuyển focus sang node mới.
2. ✅ **Sibling creation bằng `Enter`**: tạo sibling mới ngay sau node hiện tại; root node bị chặn tuyệt đối không có sibling.
3. ✅ **Safe delete bằng `Delete` / `Backspace`**: xoá toàn bộ subtree, không reparent; root node được bảo vệ không cho xoá.
4. ✅ **Focus fallback sau delete**: ưu tiên sibling trước, sau đó sibling sau, rồi parent, cuối cùng root fallback.
5. ✅ **Drawer & input isolation**: keyboard authoring bị chặn khi inline drawer đang mở hoặc khi focus đang nằm trong input / textarea / button / interactive controls.
6. ✅ **State integrity**: mutation keyboard tiếp tục tích hợp đúng với `workingDocumentTree`, dirty-state, undo/redo history và Save Version persistence.

### Artifacts
- **Planning Spec**: [`docs/specs/mindmap-phase-m3-planning-spec-v1.md`](docs/specs/mindmap-phase-m3-planning-spec-v1.md)
- **ADR**: [`docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md`](docs/adr/ADR-096-phase-m3-keyboard-authoring-for-saved-documents.md)
- **Closure Report**: [`docs/reports/mindmap-phase-m3-closure-report.md`](docs/reports/mindmap-phase-m3-closure-report.md)
- **Primary Tests**: [`tests/unit/mindmap-keyboard-authoring.test.tsx`](tests/unit/mindmap-keyboard-authoring.test.tsx)
- **Hardening Spec & Tests (2026-10-14)**: [`docs/gherkin/mindmap-phase-m3-keyboard-authoring-hardening.feature`](docs/gherkin/mindmap-phase-m3-keyboard-authoring-hardening.feature) & [`tests/unit/mindmap-keyboard-authoring-hardening.test.tsx`](tests/unit/mindmap-keyboard-authoring-hardening.test.tsx) (10/10 PASS)
- **Session Log**: [`docs/session-logs/2026-10-14-phase-m3-reopen-audit-hardening.md`](docs/session-logs/2026-10-14-phase-m3-reopen-audit-hardening.md)

---


## Reader Excerpt Promotion to Flashcard — Phase R3.A Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `680e8b8`, LOCAL-ONLY / NOT PUSHED)  
**Tests**: 8/8 Targeted tests PASS, 21/21 Reader/Inbox/Toolbar Regression tests PASS  
**Typecheck**: 0 errors (`npx tsc --noEmit`)  
**Database & Architecture**: Khép kín chu trình từ Reader sang Flashcard Spaced Repetition (SM-2) theo nguyên tắc Zero Schema Migration. Bổ sung affordance "Tạo thẻ nhớ" (`Brain` icon) trên từng item chưa xử lý trong tab Inbox của `ReaderSidebar`; guard chống double-click và ẩn CTA cho processed items; wire `FlashcardCitationProvenance` và cập nhật `processInboxItem(item.id)` sau khi tạo thẻ thành công trong `UnifiedResearchReader`; bảo toàn 100% dữ liệu staging khi có lỗi (Error-Retention Contract).

### Features Delivered & Verified
1. ✅ **Phase R3.A (Inbox Promotion Affordance)**: `src/components/reader/ReaderSidebar.tsx` — Render nút icon "Tạo thẻ nhớ từ trích đoạn" cho inbox items chưa xử lý (`!item.isProcessed && onPromoteToFlashcard`), ẩn CTA cho processed items.
2. ✅ **Phase R3.A (Runtime Provenance Handoff & Error-Retention)**: `src/components/reader/UnifiedResearchReader.tsx` — Quản lý `activePromotingInboxItem`, trích xuất `processInboxItem` từ DataContext, ánh xạ `FlashcardCitationProvenance`, cập nhật `isProcessed = true` chỉ khi tạo thẻ thành công, bảo toàn nguyên vẹn `isProcessed = false` khi đóng modal hoặc xảy ra lỗi.
3. ✅ **Phase R3.A (Specification & Acceptance Evidence)**:
   - ADR: `docs/adr/ADR-095-phase-r3a-reader-excerpt-promotion-to-flashcard.md`
   - Planning Spec: `docs/specs/phase-r3a-reader-excerpt-to-flashcard-spec.md`
   - Closure Report: `docs/reports/phase-r3a-reader-excerpt-to-flashcard-closure-report.md`
   - Test Suites: `tests/unit/reader-sidebar-inbox-promote.test.tsx` (3 scenarios) & `tests/integration/reader-excerpt-to-flashcard.test.tsx` (5 scenarios).

---

## Mind Map Saved Document Inline Node Drawer — Phase M2 Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `7d288fb`, NOT PUSHED)
**Tests**: 7/7 Node Drawer tests PASS (targeted), 7/7 Lifecycle Parity PASS (regression), 7/7 Markdown Import PASS (regression), 10/10 Persistence UI PASS (regression)
**Typecheck**: 0 errors (`npx tsc --noEmit`)
**Database & Architecture**: Scope M2 title-only inline node drawer cô lập hoàn toàn cho `saved-document` mode; giữ nguyên canvas selection (`selectedNodeIds`); cập nhật qua `renameNodeTitle` + `applyTreeMutation`; bảo toàn dirty state, history stack và save version pipeline; lookup an toàn metadata persisted (`nodeType`, `semanticBadge`, `sourceIdReference`) mà không làm ô nhiễm `MindMapTreeNode` hay thay đổi schema lưu trữ.

### Features Delivered & Verified
1. ✅ **Phase M2 (Title-Only Inline Drawer Component)**: `src/components/mindmap/MindMapNodeDrawer.tsx` — Render header, input title, apply button, close button, và các badges metadata read-only (`id`, `nodeType`, `semanticBadge`, `sourceIdReference`).
2. ✅ **Phase M2 (Runtime Wiring & Mode Isolation)**: `src/components/mindmap/MindMapView.tsx` — Quản lý `activeDrawerNodeId` độc lập với canvas selection; kích hoạt khi click node trong saved-document mode; vô hiệu hóa tuyệt đối trong live-topics mode; tích hợp `renameNodeTitle` + `applyTreeMutation`.
3. ✅ **Phase M2 (Specification & Acceptance Evidence)**:
   - ADR: `docs/adr/ADR-094-phase-m2-title-only-inline-node-drawer.md`
   - Planning Spec: `docs/specs/mindmap-phase-m2-planning-spec-v1.md`
   - Test Suite: `tests/unit/mindmap-node-drawer.test.tsx` (7 scenarios)
   - Closure Report: `docs/reports/mindmap-phase-m2-closure-report.md`

---

## Mind Map External Markdown Import to Saved Document — Phase M1 Closure (2026-10-11)

**Status**: ✅ Complete & Verified Locally (Commit `08e9799`, NOT PUSHED)
**Tests**: 7/7 Markdown Import to Document tests PASS (targeted)
**Typecheck**: 0 errors (`npx tsc --noEmit`)
**Database & Architecture**: File picker `.md` cục bộ trên preview modal; tách bạch 2 luồng CTA "Lưu thành tài liệu" (`createMindMapDocument`) vs "Nhập vào CSDL" (topological topic ingestion); tự động mở document vừa tạo trong MindMapView mà không yêu cầu category gating hay ghi đè topic graph sống.

### Features Delivered & Verified
1. ✅ **Phase M1 (Local File Picker & Import Split)**: `src/components/mindmap/MindMapImportPreviewModal.tsx` — Nạp nội dung file `.md` vào textarea sandbox; phân tách rõ nút lưu tài liệu độc lập và nút nhập topic database.
2. ✅ **Phase M1 (Immediate Document Opening)**: `src/components/mindmap/MindMapView.tsx` — Callback `onDocumentCreated` lập tức nạp và hiển thị tài liệu mới tạo trên canvas.
3. ✅ **Phase M1 (Specification & Tests)**: `tests/unit/mindmap-import-file-to-document.test.tsx` (7 scenarios) & `docs/specs/mindmap-phase-m1-closure-report.md`.

---

## Mind Map Document Lifecycle & Export Parity Hardening — Phase P7.C Closure (2026-10-10)

**Status**: ✅ Complete & Verified Locally (Commit `cfc74c4`, NOT PUSHED)
**Tests**: 7/7 Lifecycle Parity tests PASS (targeted), 21/21 Marquee Regression tests PASS (liên quan)
**Typecheck**: 0 errors (`npx tsc --noEmit`)
**Database & Architecture**: Active tree resolution (`workingDocumentTree || projection?.tree`) cho luồng save & export; loại bỏ ràng buộc cứng `disabled={!projection}` cho standalone documents; đồng bộ projection derivation với working document tree trên canvas trong các scenario được kiểm thử.

### Features Delivered & Verified
1. ✅ **Phase P7.C (Active Tree Resolution & Resilience)**: `src/components/mindmap/MindMapView.tsx` — Loại bỏ phụ thuộc cứng `disabled={!projection}` ở các nút Save/Export, đảm bảo standalone documents mở độc lập không bị khóa; guard lưu phiên bản sử dụng `activeTree` thay vì `projection?.tree` lỗi thời.
2. ✅ **Phase P7.C (Projection Derivation Parity)**: Cập nhật `projection` memo để tự động cập nhật khi `workingDocumentTree` thay đổi, cải thiện và duy trì parity giữa canvas và các bộ serializer SVG/PNG/Markdown trong các scenario được kiểm thử.
3. ✅ **Phase P7.C (Lifecycle Test Suite)**: `tests/unit/mindmap-document-lifecycle-parity.test.tsx` — 7 kịch bản kiểm thử cho save document, save version, export parity, failure dirty state preservation, và backward compatibility cho live topic baseline.

---

## Mind Map Keyboard Navigation & A11y Tree Traversal — Phase K2 Closure (2026-10-09)

**Status**: ✅ Complete & Verified Locally (Commit `09b84b9`, NOT PUSHED)
**Tests**: 9/9 Mind Map suites PASS (99 unit tests, 100%)
**Typecheck**: 0 errors
**Database & Architecture**: Pure ephemeral internal state on Canvas (`focusedNodeId`), layout-aware arrow navigation (`tree_horizontal` & `tree_vertical`), space collapse toggle, enter topic selection, home/escape bindings, boundary clamping, and form input event isolation.

### Features Delivered & Verified
1. ✅ **Phase K1 (Red Tests First)**: `tests/unit/mindmap-keyboard-nav.test.tsx` — Xây dựng 7 kịch bản kiểm thử toàn diện cho arrow keys ngang/dọc, action keys (`Space`, `Enter`, `Home`, `Escape`), boundary clamping và input isolation.
2. ✅ **Phase K2 (Green Implementation)**: `src/components/mindmap/MindMapTreeCanvas.tsx` — Bổ sung focus ring styling (`data-focused="true"`), layout-aware navigation, và bộ lắng nghe sự kiện trên canvas backdrop (`tabIndex={0}`).

---

## Mind Map In-Canvas Search & Node Highlight Filter — Phase S2 Closure (2026-10-09)

**Status**: ✅ Complete & Verified Locally (Commit `e2c7a6f`, NOT PUSHED)
**Tests**: 92/92 tests PASS (100%)
**Typecheck**: 0 errors
**Database & Architecture**: Ephemeral search query (`searchQuery`), case-insensitive title substring match, in-memory dynamic ancestor expansion override for matching nodes in collapsed branches, visual match counter, and Escape/Clear restoration.

### Features Delivered & Verified
1. ✅ **Phase S1 (Red Tests First)**: `tests/unit/mindmap-search-filter.test.tsx` — 8 scenarios kiểm thử chu trình search/highlight/dim và auto-expansion.
2. ✅ **Phase S2 (Green Implementation)**: `MindMapView.tsx` (toolbar search input + match counter + auto-expand override) & `MindMapTreeCanvas.tsx` (`matchingNodeIds` prop + `data-search-match` / `data-search-dim` styling).

---

## Mind Map Markdown Import Track — Phase I1, I2, I3 Closure (2026-10-09)

**Status**: ✅ Complete & Verified Locally (Commits `e915179` & `f779e3e`, NOT PUSHED)
**Tests**: 15/15 Mind Map suites PASS (178 tests, 100%)
**Typecheck**: 0 errors
**Database & Architecture**: Pure parser, RAM preview sandbox, & controlled ingestion with topological batch creation, deduplication strategies, and compensation rollback.

### Features Delivered & Verified

1. ✅ **Phase I1 (Pure Markdown Outline Parser & Validator)**: `src/lib/mindmapImportParser.ts` — Phân tích cú pháp outline sang `MindMapImportNode` AST, nhận diện bullets (`-`, `*`, `+`), badges ngữ nghĩa (`[tiên quyết]`, `[nâng cao]`, v.v.), links markdown, và chẩn đoán nhảy cóc thụt lề (`JUMP_INDENTATION`).
2. ✅ **Phase I2 (Preview Sandbox Modal & Adapter)**: `src/lib/mindmapImportPreviewAdapter.ts` & `MindMapImportPreviewModal.tsx` — Split-view modal xem trước trên RAM với Live Canvas, layout ngang/dọc, và cam kết Zero-Write / Zero-Navigation.
3. ✅ **Phase I3 (Controlled Ingestion & Confirmation Workflow)**: `src/lib/mindmapImportIngestion.ts` — Nhập có kiểm soát vào DataContext, bắt buộc chọn Category đích, 3 chiến lược dedupe (`skip-and-reuse`, `create-with-suffix`, `strict-abort`), hộp thoại xác nhận tường minh, và cơ chế Compensation Action Rollback khi xảy ra lỗi.

---

## Mind Map v2.0 Advanced Feature Suite & Track E Minimap Closure (2026-10-08)

**Status**: ✅ Complete & Verified Baseline (Track E Formally Closed)
**Tests**: 12/12 Mind Map suites PASS (153 tests, 100%)
**Typecheck**: 0 errors
**Database & Schema**: Zero schema migration, zero backend API mutation (Pure derived read-model & UI overlay)

### Features Delivered & Verified

1. ✅ **Track A (Semantic Filter Dropdown)**: Lọc quan hệ chéo (`prerequisite`, `related`, `advanced`, `contradicts`) per-topic trên canvas toolbar.
2. ✅ **Track B (Viewport Zoom & Pan)**: Bộ điều khiển Zoom In/Out [0.5x, 2.0x], Drag Pan mượt mà và Fit-to-Viewport tự động.
3. ✅ **Track C (Canvas Export SVG/PNG)**: Xuất bản vector SVG độc lập kèm CSS inline và rasterize PNG blob chất lượng cao.
4. ✅ **Track D (Multi-Parent DAG Cross Edges & Export Parity)**: Phân loại quan hệ đa phụ huynh (`isMultiParent`), styling Indigo riêng biệt và bảo toàn 100% SVG/PNG export parity (Phase D4).
5. ✅ **Track E (Minimap Overview Radar, Mobile Toggle & Dynamic ResizeObserver)**: Micro-radar vector (`bottom-4 left-4`), drag viewport indicator (Phase E1d), responsive mobile toggle button & panel nổi (Phase E2a), touch target hardening $\ge 44\times 44\text{px}$ (Phase E5), và reactive geometry measurement qua native ResizeObserver (Phase E6).
6. ✅ **Documentation-Only Closure (Phase E3/E4)**: Đối chiếu và đồng bộ trọn vẹn đặc tả kỹ thuật, Mini-ADR và test contract; chính thức đóng Track E.

---

## Phase 1 & Phase 2A — Workflow-First Shell & Embedded Research Workspace (2026-09-27)

**Status**: ✅ Completed & Verified on Test Suite & Runtime
**Tests**: 428/428 PASS (3.640 tests, 100%)
**Typecheck**: 0 errors

### Features Delivered & Verified

1. ✅ **Workflow-First Navigation Hubs (Phase 1)**: Chuyển đổi thanh điều hướng sang 4 Hubs tập trung: *Khảo Cứu* (`library`, `resources`), *Học Tập & Ôn Tập* (`dashboard`, `flashcards`, `progress`), *Vườn Tri Thức* (`topics`, `notes`, `graph`), và *Phân Tích & Công Cụ* (`search`, `ai_studio`).
2. ✅ **UnifiedResearchReader Embedded Mode (Phase 2A)**: Bổ sung prop `layoutMode="embedded" | "modal"`. Loại bỏ modal backdrop cưỡng bức khi nhúng trong không gian làm việc.
3. ✅ **DocsExplorerView Split-View Integration (Phase 2A)**: Nhúng trực tiếp trình đọc vào panel phải, cho phép vừa đọc vừa duyệt danh sách sách/tài liệu Vault mà không bị che khuất màn hình.
4. ✅ **Zero Regression & Full Verification**: Đảm bảo 100% backward compatibility với các deep-link hash, modal popup từ `TopicDetail`/`Navbar`, và toàn bộ hệ thống trích dẫn / highlight hiện hữu. Ban hành [Session Log 2026-09-27](docs/session-logs/2026-09-27-workflow-navigation-and-embedded-reader-phase1-phase2a.md).

---

## Obsidian Dynamic Vault Discovery & Markdown Image Context Architecture (2026-09-26)

**Status**: ✅ Completed & Verified on UI/Runtime
**Tests**: 100% PASS
**Typecheck**: 0 errors

### Features Delivered & Verified

1. ✅ **Dynamic Multi-Source Vault Discovery**: Tự động phát hiện toàn bộ 6/6 Obsidian Vaults thực tế trên máy kết hợp cấu hình `.env`, system registry `obsidian.json`, và sibling directory scan (thay vì giới hạn tĩnh 4 vaults).
2. ✅ **Markdown Image Context Resolution**: Tách bạch ngữ cảnh `sourceType: "docs"` (`/api/docs/raw`) và `sourceType: "vault"` (`/api/obsidian/vault/attachment`), fix preview thô trong `DocsExplorerView` sang `MarkdownReadabilityRenderer`.
3. ✅ **Vault Physical Assets Mirroring**: Đồng bộ đầy đủ bộ screenshots vào thư mục `assets/screenshots/` của Obsidian Vault, xác thực hiển thị hình ảnh thật sắc nét trong `UnifiedResearchReader` khi mở từ cả Docs lẫn Obsidian Vault.
4. ✅ **Architectural ADR & Runbook**: Ban hành [ADR-2026-09-25](docs/adr/ADR-2026-09-25-vault-discovery-and-markdown-image-context.md) và Session Log chi tiết [2026-09-26](docs/session-logs/2026-09-26-vault-discovery-and-markdown-images-verification.md).

---

## Phase F8.0 — Google NotebookLM Research Hub v2.1 & Unified Design System (2026-09-07)

**Status**: ✅ Completed  
**Tag**: `v0.15.0`  
**Tests**: 297/297 suites PASS (1,912 tests, 100%)  
**Typecheck**: 0 errors

### Features Delivered

1. ✅ **Multi-Version Source Packages**: 1-to-N source package versions (`v1`, `v2`) with 100% provenance retention (Decision 1 Option A).
2. ✅ **Dedicated Review Drawer (`ArtifactReviewDrawer`)**: 3-tab deep review layout for raw Markdown, citation markers (`[1]`, `[2]`), and transactional import audit logs (Decision 2 Option B).
3. ✅ **Independent Transactional Ingestion**: Decoupled Note import and Flashcard SRS generation with SHA-256 idempotency guard (`contentHash`).
4. ✅ **Antigravity 2.0 CLI Pipeline**: Headless CLI command builders (`agy -p`) and task prompts across 5 artifact types.
5. ✅ **Unified Design System & 100% Dark Mode**: Harmonized `stone` color palette across `NotebookLMStudioModal`, `ArtifactReviewDrawer`, and `AntigravityHandoffModal`.

### Technical Decisions & Architecture (ADR-070)

- Additive Prisma Schema: 7 new models (`ResearchSession`, `SourcePackage`, `TaskPrompt`, `GroundedArtifact`, `ArtifactCitation`, `ArtifactImport`, `ResearchTimelineEvent`).
- REST Endpoints: `/api/research-sessions` & `/api/artifacts` backed by Express and Prisma ORM.
- Zero Breaking Changes: Full backward compatibility with `localStorage` and existing mock suites.

---

## Phase Direct NotebookLM MCP Integration — Live Execution, Provenance & Safety Gating (2026-10-16)

**Status**: 🟢 Completed, 1-Shot Live-Verified & Citation-Provenance-Hardened (Unstaged Working Tree)<br>
**Target Canonical Spec**: [`docs/specs/notebooklm-direct-mcp-integration-spec.md`](docs/specs/notebooklm-direct-mcp-integration-spec.md)<br>
**Tests**: 56/56 Unit Tests PASS (100% GREEN) across 4 core suites (`notebooklm-mcp-client.test.ts`, `notebooklm-direct-execution-orchestrator.test.ts`, `research-session-routes-direct-execution.test.ts`, `server-research-provider-runtime-injection.test.ts`) + 72/72 PASS across all 7 extended suites<br>
**Typecheck**: 0 errors (`npx tsc --noEmit` hoàn tất thành công, Exit Code 0)<br>
**Syntax & Whitespace**: `git diff --check` CLEAN (0 issues)

### 1. Runtime Invariants & Architecture Path
- **Đường truyền bắt buộc:**
  ```text
  Dashboard UI (NotebookLMStudioModal Step 2 Prompt)
    → Backend route (/api/research-sessions/:id/execute-live)
    → ResearchOrchestrator.executeDirectResearch
    → NotebookLMEnterpriseProvider.query
    → NotebookLMMcpClient (JSON-RPC 2.0 over Stdio)
    → NotebookLM MCP Server (/Users/mr.chem/.local/bin/notebooklm-mcp)
    → Google NotebookLM
    → Backend Persistence (GroundedArtifact + ArtifactCitation + ResearchTimelineEvent)
    → Dashboard UI (Results Step)
  ```
- **Ranh giới Antigravity:** Antigravity chỉ là công cụ phát triển/chỉnh sửa trong môi trường dev; tuyệt đối không nằm trên runtime path và không đóng vai trò Control Bridge.

### 2. Fail-Closed Gating & Vòng Đời Tự Giải Phóng (Ephemeral Lifecycle)
- **Gating Mặc Định Đóng:** Cờ môi trường `NOTEBOOKLM_DIRECT_EXECUTION=true` là điều kiện tiên quyết. Nếu tắt hoặc thiếu, route trả về ngay HTTP 403 Forbidden:
  ```json
  {
    "error": "Tính năng khảo cứu trực tiếp qua NotebookLM MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION is off)",
    "code": "DIRECT_EXECUTION_DISABLED"
  }
  ```
- **Tự Động Dọn Dẹp (Ephemeral-by-default):** Mọi workspace khảo cứu trực tiếp mặc định có `ephemeralWorkspace: true`. Khối `finally` của `executeDirectResearch` cưỡng chế thực thi `deleteWorkspace` kèm `confirm: true`, đảm bảo giải phóng 100% tài nguyên cloud ngay cả khi truy vấn thất bại. Kết quả trả về `cleanupStatus: "CLEANED"`.

### 3. Exact HTTP Success Contract (Flatten DTO)
Phản hồi HTTP 200 trả về payload phẳng, không lồng đối tượng `artifact`, không có trường `success`:
```json
{
  "sessionId": "<session-id>",
  "artifactId": "<grounded-artifact-uuid>",
  "artifactType": "study_guide",
  "title": "STUDY_GUIDE: <topic>",
  "content": "<answer>",
  "citedSourceIds": ["<real-source-id>"],
  "citations": { "1": "<real-source-id>" },
  "references": [
    {
      "sourceId": "<real-source-id>",
      "citationNumber": 1,
      "citedText": "<quote>",
      "sourceTitle": "<source-title>"
    }
  ],
  "cleanupStatus": "CLEANED",
  "executionDurationMs": 30130
}
```

### 4. Citation Provenance & Anti-False-Positive Hardening
- **Fail-Fast Missing ID:** Khi `source_add` không trả về `source_id`/`id` hợp lệ, client ném ngay lỗi `MALFORMED_RESPONSE`, loại bỏ hoàn toàn cơ chế tự sinh ID ngụy tạo `nlm-src-${source.sourceId}`.
- **Không Fallback Ngầm:** Khi `notebook_query` không trích dẫn nguồn, `citedSourceIds` trả về `[]`, cấm tự động fallback về mảng `params.sourceIds`.
- **Lọc Sạch Synthetic IDs:** Mọi ID có tiền tố `nlm-src-*` bị loại bỏ dứt điểm cả ở cấp Client và cấp Orchestrator.
- **Ánh Xạ Real Caller Source ID:** `ResearchOrchestrator` duy trì `remoteToRealSourceMap` để ánh xạ chính xác `remoteSourceId` từ MCP sang `realSourceId` ban đầu của phiên nghiên cứu, đồng thời enrich `sourceTitle` vào danh sách `references`.
- **Lưu Trữ Bền Vững:** `GroundedArtifact.metadata` lưu giữ đồng thời `rawCitations`, `citations` (mapped), và `references`. Mỗi phần tử trong `references` được ghi vào bảng `ArtifactCitation` trong DB.
- **Giới Hạn Kỹ Thuật Đã Biết (Known Limitation):** Khi câu trả lời chứa citation marker `[1]` nhưng MCP không trả về source reference tương ứng, hệ thống tuân thủ nguyên tắc trung thực tuyệt đối: ghi nhận `citedSourceIds: []`, không tự suy diễn provenance.

### 5. Xác Minh Bằng Chứng Thực Tế (Evidence Reconciliation)
- **T0 Discovery:** FAILED (`docs/session-logs/evidence/t0-discovery.json` — SMK-03 `server_info` lỗi token).
- **T1 Live Smoke:** PASSED (`docs/session-logs/evidence/t1-live-smoke.json` — CRUD, Ingest, Query, Cleanup CLEANED hoàn tất trong 26.8s).
- **1-Shot Live Verification:** PASSED trên session `28d2014a-530a-4e73-bf91-6914d0f22eef` qua backend route thật (HTTP 200, 30.1s, cleanup CLEANED, đã tạo GroundedArtifact và ResearchTimelineEvent).
- **Phân Định:** Tuyệt đối không gộp thành "Tier 0/Tier 1 PASS".

---

## Phase F8.2, F8.3 & F8.4 — NotebookLM UI Runtime Status Bridge & Governance Reconciliation (2026-10-15)


**Status**: 🟢 Phase F8.2 & F8.3 Completed (Locally Committed) | Phase F8.4 Analysis Complete (Decision: Stop at Configured)<br>
**Commits (Local-Only, Chưa Push Remote)**:
- F8.2: `62e15fb` (`feat(notebooklm-ui): add runtime status bridge contract and header badge (phase f8.2)`)
- F8.3: `dcd3240` (`feat(notebooklm-ui): wire truthful configured runtime status to parent containers (phase f8.3)`)<br>
**Tests**: 48/48 NotebookLM UI Tests PASS (100% GREEN) across 7 suites<br>
**Typecheck**: 0 errors (`npm run lint` / `tsc --noEmit` hoàn tất thành công)

### 1. Phase F8.2 — Runtime Status Bridge Contract & Header Badge (Commit `62e15fb`)
- **Presentation-only Contract:** Bổ sung contract `NotebookLMRuntimeStatus = 'unknown' | 'configured' | 'verified' | 'blocked'` tại [`src/components/integrations/notebooklm/types.ts`](src/components/integrations/notebooklm/types.ts).
- **Header Status Badge:** Cập nhật [`src/components/integrations/notebooklm/NotebookLMHeader.tsx`](src/components/integrations/notebooklm/NotebookLMHeader.tsx) hiển thị badge tương ứng:
  - `unknown` $\rightarrow$ `"Chưa kiểm tra"` (mặc định an toàn)
  - `configured` $\rightarrow$ `"Đã cấu hình"` (xanh dương)
  - `verified` $\rightarrow$ `"Smoke đã xác minh"` (xanh ngọc emerald)
  - `blocked` $\rightarrow$ `"Audio Overview: Chưa khả dụng"` (vàng hổ phách)
- **Kiểm thử độc lập:** 6/6 tests PASS tại [`tests/unit/notebooklm-runtime-status-bridge.test.tsx`](tests/unit/notebooklm-runtime-status-bridge.test.tsx), xác nhận không phát sinh network side-effect và fallback an toàn về `unknown` khi không có prop từ container cha.

### 2. Phase F8.3 — Truthful Parent Wiring & Single Source of Truth (Commit `dcd3240`)
- **Single Source of Truth Helper:** Xây dựng module thuần túy [`src/components/integrations/notebooklm/runtimeBridgeConfig.ts`](src/components/integrations/notebooklm/runtimeBridgeConfig.ts) với hàm `resolveDefaultRuntimeStatus(options)` và hằng số `NOTEBOOKLM_DEFAULT_RUNTIME_STATUS`.
- **Harmonized Parent Wiring:** Nối `runtimeStatus={resolveDefaultRuntimeStatus({ isConfigured: true })}` đồng bộ trên cả 3 container cha:
  - [`src/App.tsx`](src/App.tsx) (Global Command Palette / Header trigger)
  - [`src/components/layout/Navbar.tsx`](src/components/layout/Navbar.tsx) (Navbar Quick Action button)
  - [`src/components/topics/TopicDetail.tsx`](src/components/topics/TopicDetail.tsx) (In-context Topic Toolbar trigger)
- **Truthfulness Guard:** Tuyệt đối không hardcode `verified`, không đọc file JSON artifact dev trong browser, không gọi live fetch khi modal mount.
- **Kiểm thử:** 5/5 tests PASS tại [`tests/unit/notebooklm-runtime-status-parent-wiring.test.tsx`](tests/unit/notebooklm-runtime-status-parent-wiring.test.tsx); toàn bộ 48/48 tests UI của NotebookLM Research Hub đạt 100% GREEN.

### 3. Phase F8.4 — Verified Status Source-of-Truth Discovery & Decision Gate
- **Tài liệu phân tích:** Đã ban hành đặc tả kiến trúc [`docs/specs/phase-f8-4-notebooklm-verified-status-source-of-truth.md`](docs/specs/phase-f8-4-notebooklm-verified-status-source-of-truth.md).
- **Phân tích ranh giới nguồn chân lý:**
  - Đã phân tích các nguồn có thể cung cấp `verified`: Server-Exposed Diagnostics Endpoint vs Build-time Static Manifest vs Dừng ở `configured` cho End-user UI.
  - Khẳng định các nguồn BỊ CẤM: Browser đọc `docs/session-logs/evidence/*`, browser tự động chạy live smoke runner, hoặc suy diễn từ feature flags tĩnh.
  - Chưa tạo diagnostics endpoint mới; chưa có thay đổi nào trong `src/server/**`.
  - Phân định ngữ nghĩa: `verified` hiện được xem là operator/technical diagnostic state, không phải end-user UI state.

### 4. Quyết Định Quản Trị Hiện Hành (Current Governance Decision)
- **End-User UI Status:** Cố định ở trạng thái `configured` (`"Đã cấu hình"`). Đây là trạng thái trung thực, đầy đủ và thân thiện nhất với người dùng cuối, phản ánh đúng việc toàn bộ bộ công cụ studio (đóng gói nguồn, template prompt, artifact locker) đã sẵn sàng.
- **Trạng thái `verified`:** Chưa expose cho end-user UI; không giả định browser có quyền biết smoke test result nếu chưa có contract chính thức.
- **Trạng thái `blocked`:** Tiếp tục duy trì contract `blocked` khi có ngữ cảnh yêu cầu phản ánh rào cản schema Audio Overview (ADR-103).
- **Quyết định:** Không mở thêm implementation phase cho `verified` ở thời điểm hiện tại; chỉ mở phase backend diagnostics nếu có yêu cầu sản phẩm rõ ràng.

### 5. Tình Trạng Git Local / Remote (Local/Remote State Reconciliation)
- **Local Commits:** F8.2 (`62e15fb`) và F8.3 (`dcd3240`) đã được commit local-only trên nhánh `main`.
- **Remote State:** Remote `origin/main` hiện đang ở commit `06eb74d` (`fix(notebooklm): enforce MCP initialize handshake`). Hai commit UI F8.2 và F8.3 chưa được push lên remote.
- **Working Tree:** Các thay đổi backend hotfix (`src/server/services/providers/notebooklmMcpClient.ts`, `tests/unit/notebooklm-mcp-client.test.ts`) và các runner scripts/evidence chưa stage và nằm ngoài phạm vi UI commits này.
- **Scope Exclusion:** Thư mục `docs/books/` được giữ nguyên vẹn ngoài phạm vi quản lý source code.

---

## Phase F7.1 — AI-Powered Insights (2026-09-07)

**Status**: ✅ Completed  
**Tag**: `v0.14.0`  
**Tests**: 63/63 PASS (100%)  
**Typecheck**: 0 errors

### Features Delivered

1. ✅ Retention Predictions (forgetting curve, confidence intervals, optimal review date)
2. ✅ Study Recommendations (multi-criteria scoring, explainability, time-budget filtering)
3. ✅ Pattern Detection (24×7 heatmap, peak hours, circadian rhythms)
4. ✅ Smart Notifications (browser notifications, rate limiting, snooze)

### Technical Decisions

- Zero schema migration (runtime predictions only)
- Pure TypeScript (no ML libraries)
- Exponential decay model: R(t) = exp(-t/S)
- Multi-criteria utility scoring: U = 0.4*Urgency + 0.35*WeakRetention + 0.15*Exam + 0.1*TimeFit
- SVG charts (no heavy chart dependencies)

### Files Changed

- `src/lib/retentionPredictionEngine.ts` (new)
- `src/lib/studyRecommendationEngine.ts` (new)
- `src/lib/studyPatternEngine.ts` (new)
- `src/lib/smartNotificationService.ts` (new)
- `src/components/research/RetentionPredictionChart.tsx` (new)
- `src/components/research/TopicRecommendations.tsx` (new)
- `src/components/research/StudyPatternsHeatmap.tsx` (new)
- `src/components/research/NotificationSettingsModal.tsx` (new)
- `src/components/research/TopicDashboard.tsx` (modified)
- `tests/` (9 new test files)

### Next Phase

- F8.0: Collaboration Features (shared topics, peer review, study groups)
- F9.0: Mobile App (React Native, offline-first, push notifications)

---

## Phase F7.0 — Research Dashboard (Multi-Domain) (2026-09-07)

**Status**: ✅ Completed  
**Tag**: `v0.13.0`  
**Tests**: 31/31 PASS (100%)  
**Typecheck**: 0 errors

### Features Delivered

1. ✅ Topic Dashboard (KPIs: notes, flashcards, resources, retention, streak, time)
2. ✅ Research Timeline (event stream, grouping, filters)
3. ✅ Full-Text Search (BM25 in-memory, accent normalization for Vietnamese + Pāli/IAST)
4. ✅ Export Report (Markdown + PDF, YAML frontmatter, live preview)

### Technical Decisions

- Zero schema migration (runtime aggregation only)
- In-memory BM25 with k1=1.2, b=0.75
- UTF-8 BOM cho Markdown export
- Browser print cho PDF (zero dependencies)

### Files Changed

- `src/lib/researchAggregationService.ts` (new)
- `src/lib/researchTimelineService.ts` (new)
- `src/lib/researchSearchEngine.ts` (new)
- `src/lib/researchReportGenerator.ts` (new)
- `src/components/research/TopicDashboard.tsx` (new)
- `src/components/research/ResearchTimeline.tsx` (new)
- `src/components/research/ResearchSearchModal.tsx` (new)
- `src/components/research/ExportReportModal.tsx` (new)
- `src/components/topics/TopicDetail.tsx` (modified)
- `tests/` (6 new test files)

### Next Phase

- F7.1: AI-Powered Insights (retention predictions, study recommendations)
- F8.0: Collaboration Features (shared topics, peer review, study groups)

---

## Phase F6.12 — SRS Algorithm Tuning (2026-09-07)

**Status**: ✅ Completed  
**Tag**: `v0.12.0`  
**Tests**: 193/193 PASS (100%)  
**Typecheck**: 0 errors

### Features Delivered

1. ✅ Retention Curve Visualization (Ebbinghaus + empirical data, SVG chart)
2. ✅ Adaptive Scheduling (stability estimation, difficulty inference, fast-recall bonuses)
3. ✅ Exam Countdown & Smart Queue (priority scoring, daily load suggestions)
4. ✅ A/B Testing Framework (SM-2 vs Adaptive, statistical significance with p-value)

### Technical Decisions

- Zero schema migration (runtime calculations only)
- Zero heavy chart dependencies (pure React SVG)
- FNV-1a deterministic card-level partition (50/50 split)
- Two-Proportion Z-Test for A/B significance

### Files Changed

- `src/lib/srsAlgorithmTuning.ts` (new)
- `src/components/flashcards/RetentionCurveChart.tsx` (new)
- `src/components/flashcards/ExamCountdownToolbar.tsx` (new)
- `src/components/flashcards/SrsVariantComparisonModal.tsx` (new)
- `src/components/flashcards/FlashcardReviewStudio.tsx` (modified)
- `src/components/flashcards/index.ts` (modified)
- `tests/` (5 new test files)

### Next Phase

- F6.13: Advanced Analytics Dashboard (retention trends, study patterns, predictions)
- F7.0: Research Dashboard (multi-domain aggregation, timeline, full-text search)

---

## Phase F6.11 — Review Mode Enhancements (2026-09-07)

**Status**: ✅ Completed  
**Tag**: `v0.11.0`  
**Tests**: 173/173 PASS (100%)  
**Typecheck**: 0 errors

### Features Delivered

1. ✅ Dashboard Header (due today, new cards, retention rate, streak days)
2. ✅ Priority Filter (due | new | low_retention với weighted scoring)
3. ✅ Quick Edit Modal (Ctrl+E / Cmd+E, in-place updates)
4. ✅ View History Modal (Ctrl+H / Cmd+H, SM-2 timeline)
5. ✅ Export CSV (session-based + full history, RFC 4180 + UTF-8 BOM)
6. ✅ Session Complete Celebration (confetti, stats, rating breakdown)

### Technical Decisions

- Zero schema migration (tận dụng schema hiện có)
- Weighted scoring cho low_retention (lapses, easeFactor, retentionRate)
- In-place updates không reset session progress
- CSV export với UTF-8 BOM cho Excel tiếng Việt

### Files Changed

- `src/lib/flashcardReviewSessionUtils.ts` (new)
- `src/components/flashcards/ReviewDashboardHeader.tsx` (new)
- `src/components/flashcards/FlashcardReviewHistoryModal.tsx` (new)
- `src/components/flashcards/FlashcardExportModal.tsx` (new)
- `src/components/flashcards/FlashcardReviewStudio.tsx` (modified)
- `src/components/modals/FlashcardFormModal.tsx` (modified)
- `src/server/services/flashcardService.ts` (modified)
- `src/server/controllers/flashcardController.ts` (modified)
- `src/server/routes/flashcardRoutes.ts` (modified)
- `src/services/dataRepository.ts` (modified)
- `tests/` (6 new integration test files)

### Next Phase

- F6.12: SRS Algorithm Tuning (advanced analytics, adaptive scheduling)
- F7.0: Research Dashboard (multi-domain aggregation)

---

- **Tiến độ Subsystem Flashcard & Spaced Repetition (F6.0 $\rightarrow$ F6.11):**
  - **Phase F6.11 — Review Mode Enhancements (Hoàn thành — Tag `v0.11.0`):**
    - **Mục tiêu:** Nâng cấp phòng ôn tập `FlashcardReviewStudio`: KPI Header 4 thẻ, bộ lọc ưu tiên `priority`, Quick Edit in-place `Ctrl+E`, xem lịch sử `Ctrl+H`, xuất CSV phiên & lịch sử, Celebration Screen kèm phân bổ điểm & confetti.
    - **Tài liệu:** Spec [`docs/specs/phase-f6-11-review-mode-enhancements.md`](docs/specs/phase-f6-11-review-mode-enhancements.md) và Implementation Plan.
  - **Phase F6.10 — Note-to-Flashcard Integration (Hoàn thành — Tag `v0.10.0`):**
    - **Mục tiêu:** Tích hợp liền mạch quy trình chuyển đổi tri thức từ bài đọc ghi chú (Note Reader) thành Flashcard với thao tác bôi đen text, auto-detect cloze, batch import bullet list và chân trang hiển thị thẻ liên kết.
    - **Kiến trúc & Giải pháp (ADR-F6.10):**
      - US1: `TextSelectionPopover` fixed position, debounce 100ms, shortcut **Alt+F**, chuyển giao selection sang `FlashcardFormModal` với `defaultNoteId` và `defaultTopicId`.
      - US2: Parser thuần túy `detectClozeFromSelection` với regex Anki `{{c1::...}}`, tự động active tab Cloze và điền mẫu câu hỏi.
      - US3: Parser `parseNoteBulletListToCards` hỗ trợ separator (`::`, ` - `, `:`), cloze bullet list, giới hạn an toàn 50 thẻ/lần, tạo tuần tự kèm thanh tiến độ.
      - US4: Component `NoteCardListSection` ở cuối bài đọc, client cache 5 phút, cơ chế refresh tức thì khi thêm thẻ mới.
      - Event Bubbling Hardening: Bổ sung `stopPropagation()` và `onMouseDown.preventDefault()` trên Popover và Form Modal ngăn ngừa đóng nhầm `NoteReaderModal`.
    - **Kiểm thử & Chất lượng:**
      - 33/33 Unit & Integration tests PASS (100% GREEN).
      - 4/4 Playwright E2E scenarios PASS (`tests/e2e/f6.10-note-to-flashcard.spec.ts` trong 9.5s).
      - `npx tsc --noEmit` 0 errors; `npm run build` Vite + esbuild thành công.
    - **Tài liệu & Tự động hóa:**
      - Spec: [`docs/specs/phase-f6-10-note-to-flashcard-integration.md`](docs/specs/phase-f6-10-note-to-flashcard-integration.md)
      - ADR: [`docs/adr/f6.10-note-to-flashcard-integration.md`](docs/adr/f6.10-note-to-flashcard-integration.md)
      - User Guide: [`docs/user-guides/f6.10-note-to-flashcard.md`](docs/user-guides/f6.10-note-to-flashcard.md)
      - Release Notes: [`docs/releases/F6.10-release-notes.md`](docs/releases/F6.10-release-notes.md) & [`.github/RELEASE_NOTES_F6.10.md`](.github/RELEASE_NOTES_F6.10.md)
      - Script: [`scripts/release-f6.10.sh`](scripts/release-f6.10.sh) & [`scripts/create-github-release-f6.10.sh`](scripts/create-github-release-f6.10.sh)
  - **Phase F6.9 — Duplicate Card Detection & Intelligent Merging (Hoàn thành):**
    - Deterministic key matching, Levenshtein distance, Scope Guard, Device Activity Log, và Conflict Resolution Modal.
  - **Phase F6.5 — Card Browser & Card Lifecycle Management (Hoàn thành):**
    - Trình duyệt thẻ, lọc đa tiêu chí, tìm kiếm full-text, sắp xếp động, lịch sử ôn tập, Suspend, Restore, Archive.
- **Tiến độ Subsystem Obsidian Vault Bridge (P4.1 $\rightarrow$ P4.3D):**
  - **Kiến trúc nền tảng (ADR-064):** Kết nối an toàn giữa Obsidian Vault cục bộ và Knowledge OS theo nguyên lý Read-Only Vault Bridge. SSOT thuộc về Obsidian Vault; Knowledge OS chỉ lưu metadata Resource (`type: 'md'`), không sao chép raw Markdown vào PostgreSQL DB; bảo vệ 12-step path traversal guard, từ chối symlink, ẩn đường dẫn máy chủ qua placeholder `[VAULT_ROOT]`, và non-destructive unlink.
  - **Chi tiết 7 giai đoạn triển khai:**
    1. **Phase P4.1 — Read-Only Bridge & Topic Viewer (Commits `e36cdf7`, `549a1ce`):** Backend path sanitizer, parser YAML frontmatter/outline, API `GET /status` & `GET /file`, modal đọc `ObsidianDocumentViewerModal.tsx` và modal liên kết `ObsidianTopicResourceLinkModal.tsx`.
    2. **Phase P4.2A — Vault Tree Browser & Directory Listing (Commits `4b0083f`, `49003a0`):** API `GET /tree`, modal duyệt cây thư mục `ObsidianVaultBrowserModal.tsx` và nút "Browse Vault" trên `TopicDetail.tsx`.
    3. **Phase P4.2B — In-Memory Full-Text Search (Commits `79d6493`, `b19bc55`):** Chỉ mục quét đệ quy in-memory `buildObsidianVaultIndex`, API `GET /search`, hộp tìm kiếm debounced 300ms với snippet trích xuất.
    4. **Phase P4.2C — Wiki-Link Resolver & Navigation (Commits `2a6bd02`, `2f7e3b0`):** Phân giải cú pháp `[[Note Name]]`, `[[Note#Heading]]`, điều hướng in-place và lịch sử Back button trong viewer modal.
    5. **Phase P4.2D — Attachment & Media Embed Streaming (Commits `f6c0fa2`, `816adbc`):** API `GET /attachment` truyền phát chunked read stream đa phương tiện (ảnh, PDF, video, audio) kèm cache header immutable.
    6. **Phase P4.2E — Live File Watcher SSE Auto-Refresh (Commits `4e2febf`, `5b61539`):** Bộ lắng nghe sự kiện `chokidar` theo dõi file hiện mở với debounce 500ms, API `GET /watch` (SSE) và auto-refresh client badge trong 3 giây.
    7. **Phase P4.2F — Note Transclusion (Commits `c5aab04`, `b884f26`, `67ab1c5`):** Phân giải `![[Note]]` & `![[Note#Heading]]`, trích xuất section heading-to-heading, cơ chế chống vòng lặp đệ quy (`MAX_TRANSCLUSION_DEPTH = 3`), render khối nhúng `TransclusionBlock` tím phân biệt và pre-fetch tự động khi mở file.
  - **Tài liệu hóa & Gia cố hệ thống:**
    - Release notes chuẩn tắc: [`docs/releases/P4.1-P4.2F-release-notes.md`](docs/releases/P4.1-P4.2F-release-notes.md) (Commit `ff29684`).
    - Test contract & smoke test unconfigured vault: `tests/unit/server-endpoint-representative.test.ts` & `tests/unit/server-router-wiring.test.ts` (Commit `617383d`).
    - Sổ tay vận hành macOS Local Production: [`README.md`](README.md) & [`docs/runbooks/daily-operations-runbook.md`](docs/runbooks/daily-operations-runbook.md) (Commit `693bb8a`).
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
    - **Mục tiêu:** Mở rộng linh hoạt hệ thống phân loại tri thức, xóa bỏ hoàn toàn hardcode 2 lĩnh vực "Phật học" & "Huyền học" ở tầng 1, cho phép thêm lĩnh vực tùy biến động, đồng thời trang bị tính năng Ẩn/Khôi phục chủ đề (Soft Hide/Restore) bảo đảm an toàn dữ liệu mà không làm mất thông tin liên quan.
    - **Kiến trúc & Giải pháp triển khai:**
      - **Mô hình Phân Cấp Category:** Trục phân cấp đơn nhất dựa vào `Category.parentId` (`!parentId` = Root Category, `parentId === rootId` = Child Category). Trường `type` đóng vai trò legacy compatibility slug.
      - **Mô hình Topic Visibility:** Thêm trường `visibility: 'active' | 'hidden'` trên Topic. Tự động chuẩn hóa (`normalizeTopics`) về `'active'` đối với các topic cũ hoặc snapshots không có trường này.
      - **Bảo toàn dữ liệu triệt để:** Thao tác ẩn chủ đề (`hideTopic`) chỉ đổi cờ hiển thị; toàn bộ `notes`, `resources`, `links`, `studyProgress`, SM-2 repetitions và timestamps đều được bảo toàn nguyên vẹn 100%.
      - **Thành phần phát triển:**
        - Module di trú & truy vấn cây danh mục [`src/lib/taxonomyMigration.ts`](src/lib/taxonomyMigration.ts).
        - Giao diện Sidebar [`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx) render danh mục gốc động + nút "Thêm lĩnh vực" inline.
        - Topic Form [`src/components/modals/TopicFormModal.tsx`](src/components/modals/TopicFormModal.tsx) cho phép chọn danh mục phân cấp động theo nhóm lĩnh vực.
        - Cây chủ đề [`src/components/topics/TopicTree.tsx`](src/components/topics/TopicTree.tsx) tích hợp bộ lọc trạng thái hiển thị (Chủ đề hoạt động / Đã ẩn / Tất cả) và nút Ẩn/Khôi phục 1-click.
        - Bộ lọc tìm kiếm [`src/components/search/SearchFilters.tsx`](src/components/search/SearchFilters.tsx) hỗ trợ chọn lĩnh vực gốc động và danh mục tương ứng.
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
      - Module lõi thuần túy [`src/lib/antigravityPipeline.ts`](src/lib/antigravityPipeline.ts): sinh mã Job (`job-nlm-...`), đóng gói source/prompt, sinh đường dẫn `.agents/handoffs/`, hàm `createAntigravityHandoffJob`, `buildAntigravityCLICommand`, `serializeAntigravityJobManifest` và các helper CRUD tracker.
      - Tích hợp giao diện tại [`src/components/integrations/NotebookLMStudioModal.tsx`](src/components/integrations/NotebookLMStudioModal.tsx): Nút "Chuẩn bị Handoff Antigravity" (`data-testid="btn-prepare-antigravity-handoff"`), khung xem trước câu lệnh CLI `agy -p` kèm nút sao chép 1-click, bảng theo dõi Job Tracker với huy hiệu `queued` và nút xóa job.
      - Tệp Manifest JSON (`*-manifest.json`) đóng vai trò inter-process artifact trong `.agents/handoffs/`.
    - **Rào chắn & Nguyên tắc đã khóa (Guardrails):**
      - Không persist chuỗi `command` trong `AntigravityHandoffJob`; câu lệnh CLI được sinh động qua `buildAntigravityCLICommand`.
      - Phân định rạch ròi: UI tracker state (trong LocalStorage `phat_hoc_antigravity_handoff_jobs_v1`) $\neq$ Inter-process manifest JSON file.
      - Chuẩn hóa wording: Sử dụng **"Chuẩn bị Handoff Antigravity"** (không dùng "Gửi" vì chưa có runtime execution tự động).
    - **Phạm vi CHƯA làm (Non-goals in this increment):** Chưa auto-run `agy -p` trực tiếp từ app runtime, chưa có local API socket/bridge, chưa có browser automation, chưa có direct Google NotebookLM API integration.
    - **Kiểm thử:** 9/9 tests PASS (5/5 pure lib + 4/4 UI integration).
  - **Post-Phase 5 Micro-Increment: Citation Format Preference Hardening (Commit `e15aca2`):**
    - Module độc lập [`src/lib/citationPreferences.ts`](src/lib/citationPreferences.ts) tách biệt rõ ràng giữa logic sinh chuỗi trích dẫn và quản lý lưu trữ tùy chọn client-side (`knowledge_os_citation_format_pref`).
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
| **Phase 5** | **Evolution Planning & Operational Expansion (4 Workstreams 5A-5D):**<br>- 5D Scholar Search & Fast Fuzzy Filter<br>- 5A Advanced Knowledge Graph Explorer<br>- 5B Spaced Repetition (SM-2) Analytics<br>- 5C Headless Automated Snapshot CLI | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 30/30 tests trên 4 workstreams)* | **Hoàn tất 100% Phase 5 (đã xác minh)** |
| **Phase 6** | **File Library & 3-Tier Backup Architecture (Post-Phase 6a-6k):**<br>- 3 trụ cột sao lưu (Snapshot JSON + File Manifest + Physical Files)<br>- Quản lý thư viện chuẩn `Knowledge-Library/`<br>- Diễn tập khôi phục mô phỏng trong bộ nhớ (**Restore Drill** - In-Memory Dry Run)<br>- Đóng gói bằng chứng kiểm toán bất biến & Sổ tay vận hành `backup-restore-operator-runbook.vi.md` | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 45/45 tests từ 6a đến 6k)* | **Hoàn tất 100% Phase 6 (đã xác minh)** |
| **Phase 7** | **Rebrand & Focus Reader UX (Phase 7a-7d):**<br>- Rebrand Research & Focus Navigation<br>- Focus Reader Modal & Markdown Readability Renderer (làm sạch cú pháp thô, typography rộng thoáng)<br>- Phân giải target mở tài liệu thông minh | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 31/31 tests)* | **Hoàn tất 100% Phase 7 (đã xác minh)** |
| **Phase 8** | **Domain Hub Dashboard & Neutral Styling (Phase 8a-8c):**<br>- Bảng điều khiển Domain Hub đa lĩnh vực<br>- Bảng màu ngọc bích / trung tính (`getTopicPresentation`) cho các domain mới | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 18/18 tests)* | **Hoàn tất 100% Phase 8 (đã xác minh)** |
| **Phase P0–P4** | **Knowledge Bridge, Data Layer & Sync Resilience:**<br>- Dual-tier persistence (LocalStorage + PostgreSQL)<br>- Offline sync queue & telemetry foundations<br>- Multi-tab synchronization & storage quota guards | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 85/85 tests)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase P5** | **Command Palette Deep Actions & Relevance Ranking:**<br>- Điều hướng phím tắt toàn năng `⌘K`<br>- Xếp hạng độ liên quan theo ngữ cảnh và phân loại tác vụ | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 15/15 tests)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase P8** | **Scholar Citation Engine & Matrix Export:**<br>- Sinh trích dẫn APA 7th, BibTeX, Chicago, MLA, Harvard, CSL-JSON<br>- Trích dẫn quan hệ ma trận đồ thị tri thức & xuất hàng loạt | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 42/42 tests)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase P9–P12** | **Unified Terminology, TCM Registry & In-App Docs Explorer:**<br>- Từ điển thuật ngữ hợp nhất đa ngữ (Phạn, Pali, Hán, Việt)<br>- Kho thuật ngữ Đông Y (TCM Registry)<br>- Thanh công cụ lọc đa chiều (Multi-Facet Filtering Toolbar)<br>- In-App Docs Explorer & Markdown Architecture Viewer (`GET /api/docs`) | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 65/65 tests)* | **Hoàn tất 100% (đã xác minh)** |
| **Phase 13** | **Learning-First Overview Reframe:**<br>- Tái cấu trúc Dashboard thành giao diện học tập trọng tâm<br>- Thẻ học tập hàng ngày & điều hướng nhanh theo tiến độ | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 12/12 tests)* | **Hoàn tất 100% (Commit `73504d2`)* |
| **Phase 14** | **Focus Domain Priority & Weekly Cadence Bar (Phase 14a-14c):**<br>- Ghim lĩnh vực trọng tâm (`focusDomainId`) trên Dashboard<br>- Thanh nhịp học tuần `WeeklyCadenceBar` (7 ngày ISO, 4 cấp bậc nhịp học) | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 27/27 tests)* | **Hoàn tất 100% (Commit `4f9f234`)* |
| **Phase 15** | **Root Domain Expansion & Starter Topics Enrichment:**<br>- Khởi tạo lĩnh vực Đông Y (`cat-root-dong-y`) và Ngôn Ngữ (`cat-root-ngon-ngu`)<br>- Làm giàu chủ đề mẫu chất lượng cao kèm metadata SM-2 | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 8/8 tests)* | **Hoàn tất 100% (Commit `6671e42`)* |
| **Phase 16** | **Taxonomy Cleanup, Safe Category Merge & Rehydration Persistence:**<br>- Gộp an toàn các danh mục kinh tế cũ vào `cat-root-kinh-te-tai-chinh`<br>- UI Confirmation Gate ngăn xóa nhầm và tự động gộp an toàn<br>- Gia cố Rehydration chống hồi sinh danh mục và làm sạch khi reset | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 27/27 tests)* | **Hoàn tất 100% (Commit `6d7e34c`)* |
| **Phase 17** | **Focus Learning Session, Smart Study CTA & Guided Next-Action UX:**<br>- Phase 17A: Thanh phiên học `ActiveLearningSessionBar` + Modal đúc kết `SessionWrapupModal` + `resumeStudyTimer`<br>- Phase 17B: Tinh giản Topic toolbar (4 actions) + Smart Study CTA (5 states, cross-topic guard) + `NextActionStrip` | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 37/37 tests)* | **Hoàn tất 100% (Commits `330fcaf`, `fd0f376`)* |
| **Phase P4.1–P4.2F** | **Obsidian Vault Bridge Subsystem:**<br>- P4.1: Read-Only Bridge & Topic Viewer<br>- P4.2A: Vault Tree Browser & Directory Listing<br>- P4.2B: In-Memory Full-Text Search<br>- P4.2C: Wiki-Link Resolver & Navigation<br>- P4.2D: Attachment & Media Embed Streaming<br>- P4.2E: Live File Watcher (SSE Auto-Refresh)<br>- P4.2F: Note Transclusion (`![[Note]]` & `![[Note#Heading]]`)<br>- Release Notes Canonicalization & Test Hardening | 🟢 **COMPLETED & VERIFIED**<br>*(Pass 176/176 tests trên 25 targeted test suites, 218/218 repo suites)* | **Hoàn tất 100% (Commits `e36cdf7` $\rightarrow$ `67ab1c5`, `ff29684`, `617383d`, `693bb8a`)* |

---

## 📌 3. Trạng Thái Chi Tiết Các Workstream Phase 5 (Phase 5 Workstream Status)

| Workstream | Tên Hạng Mục | Trạng Thái Kỹ Thuật | Bằng Chứng Xác Minh / Commit |
| :--- | :--- | :--- | :--- |
| **5D** | **Scholar Search & Fast Fuzzy Metadata Filter** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5d-scholar-search.feature` (`d844530`)<br>• Core lib: `src/lib/scholarSearch.ts` + 8/8 tests (`8e09740`)<br>• UI: `useCommandPalette.ts` + `AdvancedSearch.tsx` (`5ee5d89`) |
| **5A** | **Advanced Knowledge Graph & Multi-Hop Traversal Explorer** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5a-knowledge-graph.feature` (`613deed`)<br>• Core lib: `src/lib/knowledgeGraph.ts` + 6/6 tests (`613deed`)<br>• UI: `src/components/graph/KnowledgeGraph.tsx` + 4/4 tests (`4ee9f5c`) |
| **5B** | **Spaced Repetition (SM-2) Study Session Analytics** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5b-study-analytics.feature` (`c325e33`)<br>• Core lib: `src/lib/studyAnalytics.ts` + 6/6 tests (`c325e33`)<br>• UI: `src/components/progress/StudyProgressView.tsx` + 4/4 tests (`d912818`) |
| **5C** | **Automated Snapshot Maintenance & Headless Backup Script** | 🟢 **COMPLETED & VERIFIED** | • Đặc tả: `docs/gherkin/phase-5c-headless-backup.feature`<br>• Core lib: `src/lib/snapshotManager.ts` + 10/10 tests (`snapshot-maintenance.test.ts`)<br>• CLI Script: `scripts/backup-snapshot.ts` + NPM scripts (`693abd6`, `916b002`) |

---

## 🛡️ 4. Hiện Trạng Kiểm Thử & Hệ Thống (System Health Baseline)

- **Regression Test Suite:** ✅ **218 / 218 test files PASS — 1,394 / 1,394 tests PASS (0 failures, 100% test pass rate)**.
- **Obsidian Vault Bridge Suites (Phase P4.1–P4.2F):** ✅ **25 / 25 test files PASS — 176 / 176 targeted tests PASS (100% test pass rate)**.
- **Phase 17 Suites (Focus Learning Session & Next-Action UX):** ✅ `phase17-learning-session-flow.test.tsx` (19/19 PASS) · `phase17b-topic-detail-toolbar.test.tsx` (18/18 PASS).
- **Phase 16 Suites (Taxonomy Cleanup, Safe Merge & Rehydration Persistence):** ✅ `taxonomy-migration.test.ts` (6/6 PASS) · `taxonomy-merge-safety.test.tsx` (21/21 PASS) · `dynamic-taxonomy-lib.test.ts` (7/7 PASS).
- **Phase 14C Suites (Weekly Cadence Bar & Habit Tracking):** ✅ `weekly-cadence-selector.test.ts` (8/8 PASS) · `weekly-cadence-bar.test.tsx` (7/7 PASS) · `phase14b-focus-domain-ui.test.tsx` (4/4 PASS).
- **Phase 15 Suites (Root Domain Expansion & Starter Topics):** ✅ `phase15a-root-domain-expansion.test.tsx` (4/4 PASS) · `phase15b-starter-topics-enrichment.test.tsx` (4/4 PASS).
- **Phase 7 Suites (Rebrand & Note Reader UX):** ✅ `note-readability-ux.test.tsx` (8/8 PASS) · `phase7a-rebrand-and-note-reader.test.tsx` (8/8 PASS) · `phase7c-content-readability-presentation.test.tsx` (7/7 PASS).
- **P12 Suites (Multilingual Terminology, TCM Registry & Docs Explorer):** ✅ `terminology-unified-dictionary.test.ts` (7/7 PASS) · `terminology-lexicon-dictionary.test.ts` (12/12 PASS) · `docs-routing.test.ts` (3/3 PASS).
- **P8 Scholar Citation Suites:** ✅ `scholar-citation-matrix-export.test.ts` (5/5 PASS) · `scholar-citation-matrix-normalizer.test.ts` (5/5 PASS) · `scholar-citation-csl.test.ts` (3/3 PASS).
- **TypeScript Type-Check:** ✅ `npm run lint` (`tsc --noEmit`) đạt **0 errors, 0 warnings**.
- **Production Build:** ✅ `npm run build` tạo bundle Vite + esbuild sạch sẽ trong `dist/`.
- **Git Diff & Whitespace Check:** ✅ `git diff --check` đạt **0 issues**.
- **Database & Dual-Tier Persistence:** ✅ Hoạt động ổn định trên cả PostgreSQL/Prisma và LocalStorage offline fallback.

---

## 📝 5. Ghi Chú Kỹ Thuật Triển Khai (Implementation Notes)

1. **Obsidian Vault Bridge Subsystem (Phase P4.1–P4.2F — ADR-064):**
   - **Triết lý kiến trúc (Read-Only Vault Bridge):** Single Source of Truth (SSOT) thuộc về thư mục Vault Obsidian cục bộ của người dùng trên đĩa cứng; Knowledge OS chỉ lưu trữ metadata Resource (`type: 'md'`), không sao chép hay nhân bản nội dung Markdown thô vào PostgreSQL DB.
   - **Phòng thủ Path Traversal 12 bước:** Module `src/lib/obsidianVaultPath.ts` kiểm soát chặt chẽ mọi truy cập đường dẫn, từ chối symlink ngoài vault (`fs.realpath`), chặn null bytes, dot-dot sequences, và che giấu đường dẫn máy chủ vật lý bằng placeholder `[VAULT_ROOT]`.
   - **Hệ thống API Backend (Express Router):**
     - `GET /api/obsidian/status`: Trả về trạng thái cấu hình Vault (`configured`, `accessible`, `noteCount`, `totalSizeBytes`).
     - `GET /api/obsidian/file`: Đọc nội dung Markdown, bóc tách YAML frontmatter, sinh tiêu đề và dàn ý (outline).
     - `GET /api/obsidian/tree`: Quét đệ quy cây thư mục vault với bộ lọc loại trừ (`.git`, `.obsidian`, `node_modules`).
     - `GET /api/obsidian/search`: Tìm kiếm toàn văn in-memory tốc độ cao, trích xuất đoạn ngữ cảnh (snippet).
     - `GET /api/obsidian/attachment`: Truyền phát chunked read stream đa phương tiện (hình ảnh, PDF, audio, video) với header MIME và cache immutable.
     - `GET /api/obsidian/watch`: Server-Sent Events (SSE) theo dõi tệp đang mở bằng `chokidar` (debounce 500ms), tự động thông báo làm mới client badge.
   - **Bộ phân giải Wiki-Link & Note Transclusion (Client & Core Lib):**
     - `src/lib/obsidianLinkResolver.ts`: Phân giải cú pháp `[[Note Name]]` và `[[Note#Heading]]`, điều hướng in-place và quản lý ngăn xếp lịch sử xem.
     - `src/lib/obsidianTransclusion.ts`: Phân giải cú pháp `![[Note]]` và `![[Note#Heading]]`, trích xuất đoạn heading-to-heading, ngăn ngừa đệ quy vô hạn (`MAX_TRANSCLUSION_DEPTH = 3`), render khối nhúng tím `TransclusionBlock`, và tự động pre-fetch nội dung nhúng.
   - **Giao diện người dùng & Modal chuyên dụng:** `ObsidianDocumentViewerModal.tsx`, `ObsidianVaultBrowserModal.tsx`, `ObsidianTopicResourceLinkModal.tsx`.
   - **Kiểm thử & Gia cố hợp đồng:** 25 test suites / 176 tests targeted pass, hợp đồng unconfigured vault 503 (`server-endpoint-representative.test.ts`), và smoke tests bảo mật router (`server-router-wiring.test.ts`).
2. **Focus Learning Session & Next-Action UX (Phase 17):**
   - **Phase 17A (Commit `330fcaf`):** Triển khai thanh phiên học nổi `ActiveLearningSessionBar.tsx` (hiển thị timer chạy/tạm dừng, nút tạm dừng/tiếp tục/hoàn tất không che khuất màn hình), modal đúc kết phiên `SessionWrapupModal.tsx` (tùy chọn lưu ghi chú đúc kết + cập nhật slider tiến độ trực tiếp), và bổ sung `resumeStudyTimer` trong `StudyTimerContext` để tiếp tục phiên học mà không reset bộ đếm giây.
   - **Phase 17B (Commit `fd0f376`):** Tinh giản thanh công cụ `TopicDetail.tsx` từ 7 nút dàn trải xuống 4 hành động chính (`StudyCTA`, `Ôn tập SM-2`, `ResearchToolsDropdown`, `Chỉnh sửa`); triển khai Smart Study CTA với 5 trạng thái ngữ cảnh kèm **Hard Guard** chống chuyển chủ đề ngầm làm mất session đang chạy; kết nối `onResumeStudy` với `resumeStudyTimer()`; và nhúng dòng gợi ý ngữ cảnh `NextActionStrip.tsx` ngay dưới thanh trượt tiến độ.
   - **Kiểm thử:** 37/37 tests PASS trong `phase17-learning-session-flow.test.tsx` (19/19) và `phase17b-topic-detail-toolbar.test.tsx` (18/18).
3. **Taxonomy Cleanup, Safe Merge & Rehydration Persistence (Phase 16):**
   - **Pure Migration Helper:** Module [`src/lib/taxonomyMigration.ts`](src/lib/taxonomyMigration.ts) cung cấp `mergeCategoryData` gộp an toàn các danh mục kinh tế cũ (`cat-root-kinh-te`, `cat-root-kinh-te-hoc`) sang danh mục chuẩn `cat-root-kinh-te-tai-chinh`, tái gán `categoryId` cho topic và `parentId` cho subcategory mà không làm mất ghi chú, tài liệu hay tiến độ SM-2.
   - **DataContext Action & Persistence Sequencing:** `mergeCategories` trong `DataContext.tsx` ghi nhận cập nhật in-memory, gọi `syncHydrate` trước để bảo đảm toàn vẹn dữ liệu, sau đó mới gọi `deleteCategory` trên kho lưu trữ.
   - **UI Safe Guard & Delete Confirm:** `TopicTree.tsx` nhận diện các danh mục kinh tế cũ qua `isEconomyMergeSource` và chuyển hướng thao tác xóa thành xác nhận gộp danh mục an toàn.
   - **Persistence Rehydration Hardening:** Khóa chặt hợp đồng `resetToDefaultData()` làm sạch toàn bộ legacy economy IDs và kiểm chứng 100% không bị hồi sinh category sau khi reload hay remount.
4. **Weekly Learning Cadence Bar & Habit Formation (Phase 14C):**
   - **Pure Selector:** [`src/lib/learningStateSelectors.ts`](src/lib/learningStateSelectors.ts) cung cấp `getWeeklyLearningCadence` tính toán 7 ngày trong tuần ISO (T2 $\rightarrow$ CN) theo múi giờ địa phương, phân loại 4 cấp bậc nhịp học (`starting`, `building`, `consistent`, `strong`) và loại trừ các chủ đề ẩn.
   - **Component Trực Quan:** [`src/components/dashboard/WeeklyCadenceBar.tsx`](src/components/dashboard/WeeklyCadenceBar.tsx) hiển thị 7 ô ngày mini, chỉ báo hôm nay (`isToday`), ngày đã học (`isActive`) và huy hiệu tổng kết số ngày/chủ đề ngay dưới Hero của Overview.
5. **Root Domain Expansion & Starter Topics (Phase 15):**
   - Khởi tạo 2 danh mục gốc Đông Y (`cat-root-dong-y`) và Ngôn Ngữ (`cat-root-ngon-ngu`) cùng các chủ đề mẫu.
   - Cung cấp đặc tả kỹ thuật [`docs/specs/phase-15-root-domain-expansion.md`](docs/specs/phase-15-root-domain-expansion.md) và kịch bản Gherkin [`docs/gherkin/phase-15-root-domain-expansion.feature`](docs/gherkin/phase-15-root-domain-expansion.feature).
6. **Antigravity Result Ingestion & Tracker Completion Polish (Post-Phase 5 Micro-Increment):**
   - **Hàm Hoàn Tất Khớp Nối Phân Cấp:** Hàm thuần túy `completeMatchingHandoffJob` tại [`src/lib/antigravityPipeline.ts`](src/lib/antigravityPipeline.ts) ưu tiên khớp chính xác theo `jobId` và `topicId` trước; nếu không có `jobId`, fallback khớp theo `(topicId + artifactType)` với pending job gần nhất (`queued` hoặc `processing`).
   - **Tích Hợp Nạp Artifact An Toàn:** [`NotebookLMStudioModal.tsx`](src/components/integrations/NotebookLMStudioModal.tsx) tự động gọi `completeMatchingHandoffJob` khi lưu thành công Artifact mới (qua upload tệp Markdown hoặc form thủ công) và cập nhật giao diện tracker.
   - **Minh Bạch Ngữ Nghĩa Trạng Thái:** Huy hiệu `success` (emerald) được giải thích rõ là *"Đã nạp kết quả vào app"*, hoàn toàn không tuyên bố tự động hóa nền hai chiều qua cloud hay auto-dispatch `agy -p`.
7. **Data Management Modal & Confirmation Gate UI (Phase 2C.4 & 2C.4b - ADR-009):**
   - **Repository Injection & Health Polling:** [`src/components/modals/ExportImportModal.tsx`](src/components/modals/ExportImportModal.tsx) nhận `repository?: IDataRepository` linh hoạt, tự động thăm dò sức khỏe cơ sở dữ liệu `getDbHealth()` và hiển thị Health Badge trực quan.
   - **Tách Biệt Capability vs Connectivity Error:** Phân định rõ ràng `isOfflineCapability` (khi gặp lỗi `UNSUPPORTED_OFFLINE_OPERATION` từ kho lưu trữ LocalStorage) vs `connectionError` (khi gặp lỗi mạng/server 500 ném trạng thái `unhealthy` đỏ *"PostgreSQL Mất Kết Nối"*), xóa bỏ hoàn toàn sự nhập nhằng trong trải nghiệm người dùng.
8. **NotebookLM Direct MCP Timeout Separation & Error Contract Hardening (Fix 1 & Fix 2 — Commit `486c617`):**
   - **Tách Timeout Đa Tầng:** Phân tách rõ ràng timeout điều khiển control-plane (30.000ms cho handshake `initialize`, readiness `server_info`, và CRUD `notebook_create`, `source_add`, `notebook_delete`, `notebook_get`) vs timeout suy luận LLM inference (`notebook_query` mặc định 90.000ms, hỗ trợ per-call override).
   - **Bảo Vệ Tính Toàn Vẹn Tool Arguments:** `timeoutMs` truyền qua transport options, tuyệt đối không leak vào tool arguments của `notebook_query`.
   - **Helper Chuẩn Hóa An Toàn `resolveTimeoutMs`:** Khử triệt để nguy cơ nuốt fallback sai khi gặp các giá trị không hợp lệ (`0`, số âm, `NaN`).
   - **Khớp Nối Mã Lỗi Tuyến Trực Tiếp:** Tuyến `POST /api/research-sessions/:sessionId/execute-live` trả HTTP 503 với `code: "PROVIDER_TIMEOUT"` cho frontend khi gặp ProviderException tương ứng.
   - **Biên bản chi tiết:** [`docs/session-logs/2026-10-16-notebooklm-timeout-separation-and-error-mapping.md`](docs/session-logs/2026-10-16-notebooklm-timeout-separation-and-error-mapping.md).
9. **Tính Toàn Vẹn Hệ Thống:**
   - [`src/components/search/SearchFilters.tsx`](src/components/search/SearchFilters.tsx) giữ nguyên 100% component contract.
   - **Zero Binary Ingestion:** Tài liệu tham khảo chỉ được xử lý qua metadata an toàn (`filePath`, `url`, `title`, `type`), không nạp binary vào bộ nhớ.
   - Không có thay đổi nào đối với Prisma Schema, REST API backend hay thêm dependency mới.

---

## 🛑 6. Blockers & Trạng Thái Sẵn Sàng (Production Readiness)

1. **Blockers kỹ thuật:** **0 blocker**.
2. **Trạng thái hệ thống:** **Phase 1–17 & Phase P4.1–P4.2F GREEN, 100% VERIFIED & PRODUCTION-READY (218 test files, 1394 tests passing)**.

---

## 📋 7. Bảng Theo Dõi Quyết Định Trì Hoãn & Backlog Tinh Gọn (Intentionally Deferred Backlog)

Các hạng mục dưới đây đã được nghiên cứu, cân nhắc kỹ lưỡng và **chủ động trì hoãn hoặc quyết định không triển khai (Intentionally Deferred / Rejected by Design)** để bảo đảm tính ổn định, bảo mật và triết lý kiến trúc tinh gọn của Knowledge OS:

| Mã Hạng Mục | Nội Dung Cân Nhắc | Quyết Định & Lý Do Trì Hoãn / Không Triển Khai | Kiến Trúc Thay Thế Hiện Hữu |
| :--- | :--- | :--- | :--- |
| **DEF-01** | **Auto-Sanitize Taxonomy on App Load:**<br>Tự động chạy ngầm migration gộp danh mục cũ mỗi khi nạp ứng dụng. | 🛑 **TRÌ HOÃN (Deferred):**<br>Tránh tạo tác dụng phụ ngầm (side-effects) trên luồng hydration, bảo đảm dữ liệu nạp vào luôn tất định và thụ động. | Sử dụng **UI Safe Guard** (`isEconomyMergeSource` + Dialog xác nhận gộp an toàn) và hàm `mergeCategories` do người dùng kích hoạt tường minh. |
| **DEF-02** | **Rigid Root Domain Count Enforcement:**<br>Ràng buộc cố định số lượng root categories (ví dụ: bắt buộc đúng 4 root domains). | 🛑 **BÁC BỎ THEO THIẾT KẾ (Rejected by Design):**<br>Vi phạm kiến trúc phân loại động (Dynamic Taxonomy - ADR-016), làm mất khả năng thêm/bớt lĩnh vực tùy biến của học giả. | Hợp đồng phân loại động hoàn toàn: chấp nhận số lượng root domains linh hoạt tùy biến. |
| **DEF-03** | **Direct CLI Auto-Dispatch (`agy -p`) from Browser Runtime:**<br>Tự động kích hoạt terminal/CLI từ client-side web browser. | 🛑 **TRÌ HOÃN (Deferred):**<br>Tránh rủi ro bảo mật sandbox trình duyệt, ngăn chặn tấn công command injection hoặc tiến trình mồ côi ngoài tầm kiểm soát. | **Giao thức Manifest Bàn Giao Trung Gian (ADR-015):** Đóng gói JSON manifest + sinh lệnh CLI xem trước kèm nút chép 1-click. |
| **DEF-04** | **Direct Cloud Sync / Headless Scraping for Google NotebookLM:**<br>Tự động đồng bộ hai chiều trực tiếp với NotebookLM qua cloud scraper. | 🛑 **TRÌ HOÃN (Deferred):**<br>Tránh phụ thuộc vào API không chính thức dễ gãy vỡ, bảo vệ quyền riêng tư và quyền tự chủ dữ liệu cục bộ của học giả. | **Quy trình Điều phối Trung gian (ADR-012 Phase 2b):** Đóng gói Source Pack chuẩn mực và nạp kết quả qua Artifacts Locker. |
| **DEF-05** | **Direct Raw Binary Ingestion (PDF / Media BLOB Storage):**<br>Lưu trực tiếp tệp nhị phân PDF, Audio, Video vào database PostgreSQL hoặc LocalStorage. | 🛑 **BÁC BỎ THEO THIẾT KẾ (Rejected by Design):**<br>Làm phình to cơ sở dữ liệu, phá vỡ hiệu năng snapshot JSON và rủi ro OOM (Out Of Memory) trình duyệt. | **Filesystem-First + Metadata Catalog (ADR-011, ADR-017):** Tệp vật lý nằm trên đĩa cục bộ, ứng dụng chỉ lưu trữ metadata (<2KB) và kiểm toán đường dẫn. |


