# Kế Hoạch Đóng Gói Bản Phát Hành (Release Packaging Plan)

**Mục tiêu**: Chia toàn bộ các thay đổi hiện tại thành 5 commit logic, rõ ràng, độc lập theo chuẩn Conventional Commits, dễ dàng review và rollback nếu cần.  
**Nguyên tắc thực thi**:
- Không sửa thêm source code.
- Không dùng `git add .` mù quáng.
- Không commit nếu chưa hiển thị staged diff / stat và được người dùng xác nhận.
- Không amend, không squash.

---

## 1. Chi Tiết 5 Nhóm Commit Logic

### Nhóm 1: UI Shell Foundation & Design System Tokens
- **Commit Message Đề Xuất**: `feat(ui-shell): add design tokens v2, app shell and shared workbench primitives`
- **Danh Sách Tệp**:
  - `src/index.css`
  - `src/components/workbench/` *(toàn bộ 8 tệp: PageHeader, SectionHeader, SurfaceCard, StatusPill, ToolbarButton, SegmentedControl, EmptyState, index.ts)*
  - `src/components/layout/Navbar.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/Breadcrumbs.tsx`
  - `src/components/dashboard/ActiveLearningSessionBar.tsx`

---

### Nhóm 2: Workspace Modernization (Explorer, Study Suite & Visualizations)
- **Commit Message Đề Xuất**: `feat(workspaces): modernize topics, notes, resources, docs, search, flashcards, graph, progress and ai studio`
- **Danh Sách Tệp**:
  - `src/components/topics/TopicTree.tsx`
  - `src/components/topics/TopicDetail.tsx`
  - `src/components/notes/NotesManager.tsx`
  - `src/components/resources/ResourcesManager.tsx`
  - `src/components/docs/DocsExplorerView.tsx`
  - `src/components/search/AdvancedSearch.tsx`
  - `src/components/search/SearchFilters.tsx`
  - `src/components/flashcards/FlashcardReviewStudio.tsx`
  - `src/components/flashcards/CardBrowser.tsx`
  - `src/components/flashcards/StudyLauncher.tsx`
  - `src/components/flashcards/FlashcardAnalyticsDashboard.tsx`
  - `src/components/flashcards/DuplicateDetectionDashboard.tsx`
  - `src/components/progress/StudyProgressView.tsx`
  - `src/components/graph/KnowledgeGraph.tsx`
  - `src/components/ai/AIResearchStudio.tsx`

---

### Nhóm 3: Core Application & Modal Hardening
- **Commit Message Đề Xuất**: `refactor(core): harden modal dialogs, dark mode containers and context state resilience`
- **Danh Sách Tệp**:
  - `src/App.tsx`
  - `src/context/DataContext.tsx`
  - `src/components/modals/BatchCitationModal.tsx`
  - `src/components/modals/CitationModal.tsx`
  - `src/components/modals/ExportImportModal.tsx`
  - `src/components/modals/NoteFormModal.tsx`
  - `src/components/modals/ObsidianTopicResourceLinkModal.tsx`
  - `src/components/modals/ObsidianVaultBrowserModal.tsx`
  - `src/components/modals/ResourceFormModal.tsx`
  - `src/components/modals/ResourceViewerModal.tsx`
  - `src/components/modals/ScholarCitationModal.tsx`
  - `src/components/modals/SpacedReviewModal.tsx`
  - `src/components/modals/StudyTimerModal.tsx`
  - `src/components/modals/TopicFormModal.tsx`
  - `src/components/modals/VaultSelector.tsx`

---

### Nhóm 4: Dashboard Home Remediation
- **Commit Message Đề Xuất**: `fix(dashboard): align dashboard home with overview archetype standards and remove legacy visuals`
- **Danh Sách Tệp (Đúng 6 tệp remediation)**:
  - `src/components/dashboard/DashboardHome.tsx`
  - `src/components/dashboard/TodayLearningHero.tsx`
  - `src/components/dashboard/WeeklyCadenceBar.tsx`
  - `src/components/dashboard/LearningStateCard.tsx`
  - `src/components/dashboard/ResumeStudyQueue.tsx`
  - `src/components/flashcards/FlashcardAnalyticsWidget.tsx`

---

### Nhóm 5: Documentation & Release Artifacts
- **Commit Message Đề Xuất**: `docs(release): add rc-1 specifications, roadmaps, guides and hygiene audit reports`
- **Danh Sách Tệp**:
  - `docs/user-guide.md`
  - `docs/CAM_NANG_SOP_KNOWLEDGE_OS.md`
  - `docs/HUONG_DAN_SU_DUNG_CHI_TIET.md`
  - `docs/HUONG_DAN_SU_DUNG_NGUOI_MOI_HOC_VA_NGHIEN_CUU.md`
  - `docs/ui-upgrade-spec.md`
  - `docs/adr/ADR-ui-shell-v2.md`
  - `docs/phase-b-roadmap.md`
  - `docs/phase-c-roadmap.md`
  - `docs/phase-d-roadmap.md`
  - `docs/phase-d-acceptance.md`
  - `docs/final-polish-report.md`
  - `docs/release-review-rc1.md`
  - `docs/dashboard-home-gap-analysis.md`
  - `docs/dashboard-home-remediation-roadmap.md`
  - `docs/dashboard-home-remediation-report.md`
  - `docs/release-hygiene-report.md`
  - `docs/release-packaging-plan.md`
  - `docs/test-plans/`
  - `docs/audits/`

---

## 2. Quy Trình Thực Hiện Cho Từng Nhóm
1. `git add <danh_sách_file_thuộc_nhóm>`
2. `git diff --cached --check` (xác nhận không có whitespace / syntax glitch)
3. `git diff --cached --stat` (trình bày danh sách file staged cho bạn review)
4. Dừng lại chờ bạn xác nhận (Submit / Đồng ý)
5. `git commit -m "<conventional_commit_message>"`
6. Xuất commit hash và danh sách file đã commit, sau đó chuyển sang nhóm tiếp theo.
