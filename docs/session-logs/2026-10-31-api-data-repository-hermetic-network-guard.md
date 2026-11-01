# Session Log — ApiDataRepository Hermetic Network Guard Hardening (PR #17, #18, #19)

## 1. Thông Tin Phiên Làm Việc (Session Metadata)

- **Dự án:** Knowledge OS — Bàn Điều Khiển Nghiên Cứu Đa Lĩnh Vực (Academic Research Operating System)
- **Thư mục làm việc:** `/Users/mr.chem/Documents/Lap-trinh/Dashboard-update`
- **Thời gian thực hiện đợt công việc:** 2026-10-31
- **Thời gian tổng hợp tài liệu:** 2026-11-01
- **Người thực hiện:** Staff Software Engineer / Technical Architect
- **Trạng thái tổng thể:** ✅ **HOÀN TẤT VÀ MERGED CẢ 3 PULL REQUESTS (#17, #18, #19) VÀO ORIGIN/MAIN.**
  - Baseline tích hợp cuối: Commit `b26206873b37785dd8fb2567c7b4c118f05a4867`.
  - Deployment status: Chưa tạo release tag mới, không thực hiện deploy production trong đợt này.

---

## 2. Bối Cảnh & Mục Tiêu Kỹ Thuật

Theo quy tắc cốt lõi bất biến số 2 trong `AGENTS.md` và `ADR-077` (Hermetic Test Network Guard), toàn bộ unit và integration tests tuyệt đối không được gọi live HTTP mutation ra server phát triển (`localhost:3000`). Chốt chặn `process.env.VITEST` trong `src/services/dataRepository.ts` (`ApiDataRepository.getUrl`) trả về `null` khi fetch không được mock tường minh (bằng `vi.fn()` có thuộc tính `_isMockFunction` hoặc `mock`).

Tuy nhiên, trong quá trình rà soát audit, nhiều phương thức trong `ApiDataRepository` đã sử dụng cú pháp nối chuỗi fallback URL:
```typescript
const url = this.getUrl(...) || `${this.apiBaseUrl}...`;
```
Cú pháp này đã vô tình bypass qua chốt chặn hermetic guard: khi `this.getUrl(...)` trả về `null` để chặn mạng, toán tử `||` lại tái tạo lại URL đầy đủ từ `this.apiBaseUrl`, khiến request vẫn phát sinh ra ngoài.

Đợt công việc đã chia nhỏ thành 3 giai đoạn (PR #17, #18, #19) để loại bỏ bypass này trên đúng 8 methods thuộc phạm vi. Việc chuyển quyền xử lý sang `this.localFallback` được phân định rõ: các phương thức flashcard chuyển sang xử lý local, còn các phương thức Disaster Recovery chuyển sang local counterpart để ném lỗi `UNSUPPORTED_OFFLINE_OPERATION`.

---

## 3. Chi Tiết Các Đợt Hardening Đã Xác Minh

### 3.1. Đợt 1 — Flashcard CRUD & Due Queries (PR #17)
- **Nhánh:** `test/api-repository-network-guard`
- **Pull Request:** [PR #17 — `fix(data): honor network guard in flashcard repository methods`](https://github.com/quochuynh8611-code/knowledge-os/pull/17)
- **Squash Commit trên main:** `2857c46f624230e7c643976de573bd0eb0b9be1c` (2026-10-31T09:55:39Z).
- **Phạm vi phương thức sửa đổi runtime:** Đúng 3 methods trong `ApiDataRepository`:
  1. `updateFlashcard`: if (!url) return fallbackCard;
  2. `deleteFlashcard`: if (!url) return true;
  3. `getDueFlashcards`: if (!url) return this.localFallback.getDueFlashcards(filters);
  *(Lưu ý: `deleteCategory` và `createFlashcard` đã tuân thủ network guard từ trước và được dùng làm control tests).*
- **Bộ kiểm thử đi kèm:** `tests/unit/api-repository-network-guard.test.ts` (12 tests tại mốc commit PR #17).

### 3.2. Đợt 2 — Flashcard Study Review & Progress (PR #18)
- **Nhánh:** `test/flashcard-review-progress-network-guard`
- **Pull Request:** [PR #18 — `fix(data): honor network guard for flashcard review and progress`](https://github.com/quochuynh8611-code/knowledge-os/pull/18)
- **Squash Commit trên main:** `5efeaf9e12d83610e77b44854e12d29c704bd987` (2026-10-31T12:58:08Z).
- **Phạm vi phương thức sửa đổi runtime:** Đúng 2 methods trong `ApiDataRepository`:
  1. `recordReviewAtomic`: if (!url) return this.localFallback.recordReviewAtomic(input);
  2. `getFlashcardProgress`: if (!url) return this.localFallback.getFlashcardProgress(filters);
- **Bộ kiểm thử mở rộng:** Bổ sung các kịch bản kiểm thử cho `recordReviewAtomic` và `getFlashcardProgress` trong `tests/unit/api-repository-network-guard.test.ts` (suite nâng lên 20 tests hoàn chỉnh).

### 3.3. Đợt 3 — Disaster Recovery & Database Health Checks (PR #19)
- **Nhánh:** `test/dr-network-guard`
- **Pull Request:** [PR #19 — `fix(data): honor network guard for backup restore and health`](https://github.com/quochuynh8611-code/knowledge-os/pull/19)
- **Squash Commit trên main:** `b26206873b37785dd8fb2567c7b4c118f05a4867` (2026-10-31T15:07:14Z).
- **Commits trên PR branch:**
  1. `3f288dc0586d2debb311ecdd4424c7950428d4b7`: Runtime patch và bộ test ban đầu.
  2. `7570209f9aa8d045e4a05b6a122b768a5ba69553`: Chuẩn hóa assertion contracts (Error identity, `ZodError`, loại bỏ `as any`, full URL assertions, zero-arg calls, `localStorage.clear()` sau mỗi test).
- **Phạm vi phương thức sửa đổi runtime:** Đúng 3 methods trong `ApiDataRepository`:
  1. `exportBackupSnapshot`: if (!url) return this.localFallback.exportBackupSnapshot();
  2. `restoreBackupSnapshot`: if (!url) return this.localFallback.restoreBackupSnapshot(validatedReq); (vẫn parse `RestoreRequestSchema` trước guard).
  3. `getDbHealth`: if (!url) return this.localFallback.getDbHealth();
  *(Cả 3 methods đều delegate sang `LocalStorageDataRepository` tương ứng và ném lỗi `UNSUPPORTED_OFFLINE_OPERATION` mà không chạm tới network).*
- **Bộ kiểm thử độc lập:** `tests/unit/api-repository-dr-network-guard.test.ts` (20 tests).

---

## 4. Bằng Chứng Kiểm Thử & Xác Minh (Verification Evidence)

### 4.1. Local Verification (Môi Trường Cục Bộ)
- **Tiến trình RED/GREEN trước khi commit PR #19:**
  - *RED phase:* Trước khi áp dụng patch runtime, 3 test blocked-mode (A1, A2, A3) thất bại với lỗi `AssertionError: expected [ { url: '...', method: '...' } ] to have a length of +0 but got 1` do lọt request vào recording blocker.
  - *GREEN phase:* Sau khi sửa 3 dòng `if (!url) return this.localFallback.<method>();`, toàn bộ 20 tests PASS 100%.
- **Targeted & Regression Suites tại local:**
  - `tests/unit/api-repository-dr-network-guard.test.ts`: `20/20 passed` (19ms).
  - `tests/unit/hermetic-guard.test.ts`: `3/3 passed` (4ms).
  - `tests/unit/phase2c-repository-methods.test.ts`: `8/8 passed` (12ms).
  - `tests/unit/api-repository-network-guard.test.ts`: `20/20 passed` (18ms).
  - `npx tsc --noEmit`: 0 lỗi (`Pass`).
  - `git diff --check`: 0 cảnh báo.
  - Runtime diff so với expected HEAD: Rỗng giữa commit `7570209f9aa8d045e4a05b6a122b768a5ba69553` và parent `3f288dc0586d2debb311ecdd4424c7950428d4b7`.
- **Ranh giới an toàn tuyệt đối:**
  - Toàn bộ kiểm thử Disaster Recovery đều sử dụng `installUnmockedRecordingBlocker` hoặc explicit mock (`vi.fn()`).
  - **Không thực hiện bất kỳ live restore, live database mutation hay network call nào ra hệ thống cơ sở dữ liệu thật.**

### 4.2. GitHub Actions CI Verification & Sự Cố Intermittent Test

- **CI Run ID:** `41210693938` trên PR #19 (HEAD `7570209f9aa8d045e4a05b6a122b768a5ba69553`):
  - **Attempt 1 (Job `124564845405` — FAILURE):**
    - `Typecheck`: PASS.
    - `tests/unit/api-repository-dr-network-guard.test.ts`: PASS 20/20 (`44ms`).
    - *Lỗi phát sinh:* 1 test ngoài phạm vi thay đổi trực tiếp của PR trong `tests/integration/flashcard-quick-edit.test.tsx` bị fail tại dòng 170:
      ```text
      TestingLibraryElementError: Unable to find an element with the text: Chỉnh Sửa Flashcard.
      ```
      (Triệu chứng: `waitFor` timeout 1.000ms chờ modal mở sau sự kiện bàn phím `Ctrl+E`).
    - Test Files: `1 failed | 610 passed (611)`.
    - Tests: `1 failed | 5166 passed (5167)`.
  - **Kiểm tra local đơn lẻ sau sự cố CI:**
    - Lần chạy đầu tiên tại local trên branch PR ghi nhận cùng failure: `1 failed | 2 passed (3 tests)` (thời lượng 2.63s).
    - Lần chạy lại ngay sau đó trên local: `3 passed (3 tests)` (thời lượng 1.46s).
  - **Thí nghiệm đối chứng 10 tiến trình độc lập (5 base `5efeaf9` / 5 PR `7570209`):**
    - Cả hai worktree tạm `/tmp/wt-exp/base` và `/tmp/wt-exp/pr` có mã nguồn Git tách biệt nhưng dùng chung cây thư mục `node_modules` thông qua symlink (không cách ly dependency hoàn toàn).
    - Kết quả: 5/5 lần trên base và 5/5 lần trên PR đều **PASS 100%** (3/3 tests passed, không tái hiện lại lỗi `Ctrl+E`).
    - *Kết luận:* Thí nghiệm local chưa tái hiện lại lỗi; root cause của sự cố chập chờn này chưa được xác định (unresolved).
  - **Attempt 2 (Job `124569272537` — SUCCESS):**
    - Thực hiện rerun duy nhất 1 lần failed job trên cùng HEAD `7570209f9aa8d045e4a05b6a122b768a5ba69553` (synthetic merge SHA `6359b2d54dd35909f9647acd17690ad1f269dc33`).
    - `Typecheck`: PASS (21s).
    - `tests/unit/api-repository-dr-network-guard.test.ts`: `✓ 20 passed (27ms)`.
    - `tests/integration/flashcard-quick-edit.test.tsx`: `✓ 3 passed (268ms)`.
    - `Build`: PASS (24s).
    - Tổng cộng: **611/611 test files passed, 5.167/5.167 tests passed** (Thời lượng 6m30s).
    - GitHub PR Checks: `All checks were successful`.

---

## 5. Backlog Tồn Đọng Trong Phạm Vi Đợt Công Việc (Scope Backlog)

*(Lưu ý: Đây là danh mục theo dõi kỹ thuật riêng của đợt hardening này, không phải toàn bộ roadmap của dự án).*

1. **Archive & Reading Position Network Guard:**
   - 2 methods trong `src/services/dataRepository.ts` (`getArchivedDocuments`, `updateArchivedDocumentPosition`) vẫn dùng `|| \`${this.apiBaseUrl}...\``. Chưa xử lý trong đợt này.
2. **Research Excerpts & Inbox Network Guard:**
   - 8 methods trong `src/services/dataRepository.ts` (`getResearchExcerpts`, `createResearchExcerpt`, `updateResearchExcerpt`, `deleteResearchExcerpt`, `getResearchInboxItems`, `createResearchInboxItem`, `processResearchInboxItem`, `deleteResearchInboxItem`) vẫn dùng `|| \`${this.apiBaseUrl}...\``. Chưa xử lý trong đợt này.
3. **Local Review Idempotency Guard:**
   - Đã được hoãn (deferred) trong đợt PR #18 để ưu tiên bảo vệ transport guard, chưa đánh giá tác động tới offline review storage và đồng bộ queue.
4. **Quick Edit Intermittent Failure — Root Cause Unresolved:**
   - Sự cố chập chờn của test `Ctrl+E` trong `tests/integration/flashcard-quick-edit.test.tsx` (Run ID `41210693938`) chưa xác định được nguyên nhân gốc rễ. Cần tiếp tục theo dõi trong các đợt phát triển tiếp theo.
