# Implementation Roadmap: NotebookLM Workspace UX Redesign (Phase F8.1)

## 1. Roadmap Overview & Commit Strategy

Dự án được phân rã thành các gói công việc nhỏ (Atomic Work Packages), mỗi task đi kèm test tương ứng, đánh giá rủi ro và phương án rollback độc lập.

| Task ID | Giai đoạn / Mô tả công việc | File dự kiến thay đổi | Test tương ứng | Mức độ rủi ro | Rollback Plan |
|---|---|---|---|---|---|
| **TASK-1** | Định nghĩa types, interfaces, và utils thuần túy cho 3-step workflow | `src/components/integrations/notebooklm/types.ts`<br>`src/components/integrations/notebooklm/utils.ts` | `tests/unit/notebooklm-workspace-utils.test.ts` | Thấp (0% blast radius) | Xóa các file mới |
| **TASK-2** | Viết failing tests cho 3-step workflow, Stepper, Header, Advanced accordion | `tests/unit/notebooklm-workspace-stepper.test.tsx`<br>`tests/unit/notebooklm-workspace-redesign.test.tsx` | Vitest Unit Tests | Thấp (Test files) | Xóa test files mới |
| **TASK-3** | Xây dựng Header tinh gọn & Stepper Component | `src/components/integrations/notebooklm/NotebookLMHeader.tsx`<br>`src/components/integrations/notebooklm/NotebookLMStepper.tsx` | `tests/unit/notebooklm-workspace-stepper.test.tsx` | Thấp | Khôi phục file |
| **TASK-4** | Xây dựng Bước 1: Nguồn (Source Step) & Source Viewer Modal | `src/components/integrations/notebooklm/NotebookLMSourceStep.tsx`<br>`src/components/integrations/notebooklm/SourcePreviewModal.tsx` | `tests/unit/notebooklm-workspace-redesign.test.tsx` | Thấp | Khôi phục file |
| **TASK-5** | Xây dựng Bước 2: Task Prompt & Handoff Step | `src/components/integrations/notebooklm/NotebookLMPromptStep.tsx` | `tests/unit/notebooklm-workspace-redesign.test.tsx` | Thấp | Khôi phục file |
| **TASK-6** | Xây dựng Bước 3: Results Locker & Upload/Add Form | `src/components/integrations/notebooklm/NotebookLMResultsStep.tsx` | `tests/unit/notebooklm-workspace-redesign.test.tsx` | Thấp | Khôi phục file |
| **TASK-7** | Xây dựng Advanced Technical Details Accordion (CLI, Jobs, History) | `src/components/integrations/notebooklm/AdvancedTechnicalDetails.tsx` | `tests/unit/notebooklm-workspace-redesign.test.tsx` | Thấp | Khôi phục file |
| **TASK-8** | Tái cấu trúc `NotebookLMStudioModal.tsx` thành Orchestrator chính | `src/components/integrations/NotebookLMStudioModal.tsx` | Toàn bộ 5 test suites của NotebookLM & Integration suite | Trung bình | `git checkout src/components/integrations/NotebookLMStudioModal.tsx` |
| **TASK-9** | Chạy toàn bộ Verification Suite (Typecheck, Lint, 304 test files, Build) | Toàn bộ repo | `npm run lint`, `npm test`, `npm run build` | Thấp | Fix bất kỳ regression nào |

---

## 2. Chi tiết từng Task

### Task 1: Contract & Types Setup
- **Mục tiêu**: Chuẩn hóa state shape cho quy trình 3 bước:
  - `activeStep`: `'source' | 'prompt' | 'results'`
  - Step status: `'pending' | 'current' | 'completed' | 'error'`
  - Status label mappers cho người dùng tiếng Việt:
    - `queued` $\rightarrow$ "Đang chờ xử lý"
    - `processing` $\rightarrow$ "Đang xử lý"
    - `success` $\rightarrow$ "Hoàn tất"
    - `failed` $\rightarrow$ "Thất bại"
    - `received` $\rightarrow$ "Mới tiếp nhận"
    - `validated` $\rightarrow$ "Đã thẩm định"
    - `imported` $\rightarrow$ "Đã nhập xong"
    - `archived` $\rightarrow$ "Đã lưu trữ"

### Task 2: Failing Tests First
- Kiểm tra rendering của Header tinh gọn (1 title "NotebookLM", 1 Close button).
- Kiểm tra Stepper chuyển đổi giữa các bước 1, 2, 3 mượt mà.
- Kiểm tra các data-testid và semantic queries kế thừa từ test suite cũ:
  - `btn-prepare-antigravity-handoff`
  - `btn-copy-handoff-cli`
  - `handoff-cli-command-preview`
  - `handoff-jobs-tracker-list`
  - `artifact-locker-context-bar`
  - `artifact-locker-count-badge`
  - `artifact-locker-session-badge`
  - `artifact-locker-empty-state`
  - `artifact-locker-quick-switch`
  - `btn-open-review-drawer-*`
- Kiểm tra Focus Trap và Escape key dismiss.

### Task 3 - 7: Sub-component Construction
- Xây dựng từng module con với CSS Tailwind theo chuẩn `stone` design system của Knowledge OS.
- Giữ nguyên toàn bộ logic xử lý Blob download, clipboard copy, fetch REST API và LocalStorage syncing.

### Task 8: Main Modal Orchestration Refactor
- Thu gọn `NotebookLMStudioModal.tsx` từ 1,093 dòng xuống còn ~150-200 dòng orchestration sạch sẽ.
- Sử dụng hook `useFocusTrap` có sẵn trong repository để đảm bảo 100% tuân thủ WAI-ARIA dialog.

### Task 9: Final Quality Gate
- Chạy `npm run lint` (`tsc --noEmit`).
- Chạy `npm test` (đảm bảo $\ge 304$ files pass, 100% xanh).
- Chạy `npm run build` để kiểm chứng bundle sản phẩm.
