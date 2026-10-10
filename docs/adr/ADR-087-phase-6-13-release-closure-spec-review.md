# ADR-087: Phase 6.13 Release Closure Spec Review & Baseline Verification

## Status
Accepted (Phase 6.13 Release Closure)

## ADR Numbering Note
Repo hiện đang tồn tại hai file cùng mang tiền tố `ADR-087`:
1. `docs/adr/ADR-087-live-execution-eligibility-gate.md` (thuộc Phase 6.8 — Live Execution Eligibility Spec & Controlled Go/No-Go Gate, Status: Accepted).
2. `docs/adr/ADR-087-phase-6-13-release-closure-spec-review.md` (tài liệu hiện tại, thuộc Phase 6.13 — Release Closure Spec Review & Baseline Verification).

Va chạm số hiệu (numbering collision) này được ghi nhận tường minh và bảo lưu nguyên trạng tên file nhằm đảm bảo tính toàn vẹn của các liên kết và tham chiếu lịch sử, không tự ý đánh lại số hiệu khi chưa có quy ước chuẩn hóa toàn cục.

## Context
Xuyên suốt các Phase 5.1 đến 6.12, Knowledge OS đã hoàn tất quá trình củng cố và đóng băng kiến trúc Research Provider (Option A: sử dụng độc lập NotebookLM Web UI cho nghiên cứu cá nhân; phân hệ backend provider nội bộ được duy trì tuyệt đối ở chế độ fail-closed, mock, và simulation).

Quá trình triển khai được chia tách thành 4 commit xác định:
- **Commit 1 (`53b785c`):** `docs(research): add provider architecture ADRs and runbooks`
- **Commit 2 (`75d8e32`):** `feat(research): add fail-closed provider contracts and pure gates`
- **Commit 3 (`f7f00fb`):** `test(research): add provider safety tests and fixtures`
- **Commit 4 (`293be87`):** `feat(research): add read-only diagnostics and runtime wiring`

Phase 6.13 thiết lập đặc tả kiến trúc chính thức cho việc đóng release (Release Closure), đối chiếu các baseline kiểm thử qua hai mốc xác minh (Dual-Baseline) và chính thức phê chuẩn quyết định kiến trúc Option A.

---

## 1. Initial Decision Baseline (Recorded 2026-09-25 at Commit `293be87`)
- **Git HEAD:** `293be87eda7b9241d3f1db55cbb01ecd45e7357b` (`293be87`), nhánh `main` (ahead `origin/main` by 4 commits).
- **Working Tree:** Clean (`0 modified, 0 staged, 0 untracked`).
- **TypeScript Typecheck (`npm run typecheck`):** PASS (0 errors).
- **Research Provider & Runtime Wiring Suites:** 64/64 suites PASS (1,206/1,206 tests PASS).
- **Full Repository Suite (`npx vitest run`):** 406/409 suites PASS, 3,524/3,531 tests PASS (3 skipped, 4 failed).

### Initial Test Failure Analysis & Classification (2026-09-25)
Bốn bài test thất bại tại mốc này nằm hoàn toàn trong 3 file frontend UI/Reader kế thừa, tách biệt hoàn toàn khỏi phân hệ backend provider:
1. `tests/integration/note-to-reader-deeplink-wiring.test.tsx` (2 failures): Lỗi selector JSDOM bên trong NoteReaderModal. *Phân loại:* Unrelated pre-existing failure / test isolation issue.
2. `tests/unit/markdown-reader-fileurl-fetching.test.tsx` (1 failure): Lỗi timing mock khi sinh TOC bất đồng bộ. *Phân loại:* Test isolation / mock timing issue.
3. `tests/unit/reader-selection-action-flow.test.tsx` (1 failure): Query `getByText` khớp nhiều phần tử DOM trong JSDOM. *Phân loại:* Stale test expectation.

**Đánh giá tác động ban đầu:** 4 lỗi frontend này không phản ánh bất kỳ hồi quy nào của backend provider, nhưng tạo thành rào cản khiến full test suite chưa đạt 100% green tại ngày 25/09/2026.

---

## 2. Evaluation of Release Options (Original 2026-09-25 Decision)

### Option A: Freeze Backend Scope & Defer UI/Reader Debt (ACCEPTED / RECOMMENDED)
- **Mô tả:** Chính thức công nhận kiến trúc backend Research Provider (Phases 5.1–6.12) đã hoàn tất 100%, ổn định và đóng băng fail-closed. Duy trì mô hình Option A (nghiên cứu thủ công qua Web UI). Chấp nhận coi 4 lỗi UI/Reader là nợ kỹ thuật frontend tồn đọng và hoãn sang các sprint sau.
- **Đánh giá:** Quyết định tối ưu giúp cô lập rủi ro, bảo vệ backend fail-closed mà không bị nghẽn bởi nợ UI frontend.

### Option B: Fix UI/Reader Failures Before Repository-Wide Tagged Release
- **Mô tả:** Mở sprint bảo trì UI/Reader để sửa 4 lỗi selector/timing trên trước khi gắn tag release toàn repo.
- **Đánh giá:** Bị hoãn lại tại ngày 25/09 để ưu tiên đóng băng an toàn cho backend provider.

### Option C: Revert Commit 4
- **Mô tả:** Hoàn tác commit runtime wiring (`git revert 293be87`).
- **Đánh giá:** Bác bỏ. Commit 4 đạt 100% tests pass và cung cấp các endpoint diagnostics ở chế độ read-only an toàn.

---

## 3. Closure Verification at HEAD (Verified 2026-10-10 at Commit `33cc801`)
Tại thời điểm hoàn tất tài liệu đóng release chính thức (2026-10-10):
- **Git HEAD:** `33cc8013c24dc1d27da9ebed6ca152bb645fcc09` (`33cc801`), nhánh `main` (ahead `origin/main` by 41 commits).
- **Working Tree:** Clean (trước khi cập nhật tài liệu).
- **TypeScript Typecheck (`npm run typecheck` / `tsc --noEmit`):** PASS (0 errors).
- **Research Provider & Runtime Wiring Suites:** 64/64 suites PASS (1,206/1,206 tests PASS, 100%).
- **Full Repository Test Suite (`npx vitest run`):** 476/476 test files passed (4,059 passed | 3 skipped | 0 failed; thời gian chạy: 133.01s).

### Retrospective Resolution of Legacy UI Debt
Cả 3 file test UI/Reader từng thất bại tại ngày 25/09 đã được kiểm tra trực tiếp tại HEAD và xác nhận **PASS 100% (9/9 tests pass)**:
1. `tests/integration/note-to-reader-deeplink-wiring.test.tsx` (2/2 tests pass).
2. `tests/unit/markdown-reader-fileurl-fetching.test.tsx` (4/4 tests pass).
3. `tests/unit/reader-selection-action-flow.test.tsx` (3/3 tests pass).

Nợ kỹ thuật UI/Reader cũ đã được thanh toán hoàn toàn qua các commit Reader và Library tiếp theo (như `d72c1f5`, `5cb6764`, `0902ec5`). Do đó, tại mốc đóng tài liệu ngày 10/10/2026, toàn bộ kho lưu trữ đã đạt trạng thái 100% Green.

---

## 4. Default-Deny Invariants & Safety Hard-Locks
Các bất biến bảo mật sau đây được duy trì vĩnh viễn và không bị nới lỏng:
1. `realExecutionAllowed === false` (literal constant).
2. `networkAllowed === false` (zero live HTTP/HTTPS/WebSocket calls).
3. `credentialsAllowed === false` (zero personal token/cookie access).
4. `controlledExecutionEnabled === false` (controlled toggle disabled).
5. `killSwitchActive === true` (kill switch active and fail-closed).
6. `productionAllowed === false` (production environment strictly blocked).
7. `providerRoutingEnabled === false` (default-deny routing).

---

## 5. Architectural Boundaries & Non-Scope
- **Zero Real Provider Calls:** Nghiêm cấm mọi lệnh gọi tới endpoint NotebookLM Enterprise live, Antigravity CLI thực tế, hoặc Google Cloud APIs.
- **Zero MCP Listener:** Không mở port hoặc khởi chạy live MCP transport listener.
- **Zero Subprocesses:** Không sử dụng `child_process.spawn`/`exec`/`fork`.
- **Zero Schema Migrations:** Không thay đổi Prisma schema hoặc tạo database migration.
- **Phase 6.14 Prohibition:** Phase 6.14 hoặc bất kỳ hành vi kích hoạt thực thi live nào tiếp tục bị cấm tuyệt đối và nằm ngoài phạm vi.

---

## 6. Reversibility & Blast Radius
- **Blast Radius:** ZERO đối với mã nguồn ứng dụng (chỉ cập nhật tài liệu closure).
- **Reversibility:** 100% hoàn tác an toàn qua git.

---

## 7. Gherkin Acceptance Criteria

```gherkin
Feature: Phase 6.13 Release Closure Spec Review & Dual-Baseline Verification

  Scenario: Verified backend baseline maintains default-deny
    Given the current backend verification is green with 64 of 64 provider suites passing
    When Phase 6.13 spec review is evaluated
    Then realExecutionAllowed must remain literal false
    And controlledExecutionEnabled must remain literal false
    And killSwitchActive must remain true
    And no execution capability is enabled

  Scenario: Historical initial baseline accurately records initial UI test debt
    Given the historical repository baseline at commit 293be87 on 2026-09-25
    When test results are tabulated
    Then 406 of 409 test suites passed
    And 4 legacy UI/Reader test failures were cataloged as non-backend debt

  Scenario: Current closure verification confirms 100% green repository baseline
    Given the repository full test suite is executed at HEAD 33cc801 on 2026-10-10
    When test results are tabulated across 476 test files
    Then 476 of 476 test suites must pass
    And 0 test failures are present
    And all legacy UI/Reader test files pass

  Scenario: Read-only provider route query remains fail-closed
    Given provider routing is disabled by default
    When GET /api/research/providers is queried
    Then routingEnabled must return false
    And providers list must return empty
    And zero live providers are invoked

  Scenario: Diagnostics query with missing credentials
    Given live credentials are unavailable
    When provider diagnostics are requested
    Then the response must remain fail-closed with status 200 or 503
    And no credential or secret detail is leaked

  Scenario: Accepted ADR freezes backend and blocks Phase 6.14 live execution
    Given ADR-087 status is ACCEPTED under Option A
    When any implementation of Phase 6.14 or live execution is attempted
    Then the action is strictly blocked as out-of-scope and forbidden
```

---

## 8. Rollback Policy
Nếu cần hoàn tác tài liệu:
- Sử dụng git checkout hoặc revert để khôi phục trạng thái tài liệu trước phiên cập nhật.
