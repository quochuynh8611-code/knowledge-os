# ADR-087: Phase 6.13 Release Closure Spec Review & Baseline Verification

## Status
PROPOSED (Phase 6.13 Spec Review)

## Context
Across Phases 5.1 through 6.12, Knowledge OS successfully completed the hardening of the Research Provider Architecture (Option A: independent personal NotebookLM Web UI usage, with enterprise backend provider integration strictly maintained in fail-closed, mock, and simulation mode).

The implementation was staged and committed across four deterministic commits:
- **Commit 1 (`53b785c`):** `docs(research): add provider architecture ADRs and runbooks`
- **Commit 2 (`75d8e32`):** `feat(research): add fail-closed provider contracts and pure gates`
- **Commit 3 (`f7f00fb`):** `test(research): add provider safety tests and fixtures`
- **Commit 4 (`293be87`):** `feat(research): add read-only diagnostics and runtime wiring`

Phase 6.13 establishes the formal architectural specification for release closure, audits current verified baselines, categorizes test suite results, and evaluates release decision options.

## Current Verified Baseline
- **Git HEAD:** `293be87eda7b9241d3f1db55cbb01ecd45e7357b` (`293be87`)
- **Working Tree:** Clean (0 modified, 0 staged, 0 untracked).
- **TypeScript Typecheck (`npm run typecheck`):** PASS (0 errors).
- **Research Provider & Runtime Wiring Suites:** 64/64 suites PASS (1,206/1,206 tests PASS).
- **Full Repository Suite (`npx vitest run`):** 406/409 suites PASS, 3,524/3,531 tests PASS (3 skipped, 4 failed).

## Test Failure Analysis & Classification
The 4 failing tests reside entirely within 3 legacy UI/Reader frontend test files that are completely isolated from the backend research provider domain:
1. `tests/integration/note-to-reader-deeplink-wiring.test.tsx` (2 failures): UI JSDOM locator matching inside NoteReaderModal. *Classification:* Unrelated pre-existing failure / test isolation issue.
2. `tests/unit/markdown-reader-fileurl-fetching.test.tsx` (1 failure): Async TOC generation expectation timing in mock fetch. *Classification:* Test isolation / mock timing issue.
3. `tests/unit/reader-selection-action-flow.test.tsx` (1 failure): DOM query `getByText` matched multiple elements (excerpt + backlink card) in JSDOM. *Classification:* Stale test expectation.

**Impact Assessment:** These 4 frontend failures do NOT indicate any backend research provider regression. However, for repository-wide release criteria ("100% green full test suite"), they constitute a known release gate blocker.

## Default-Deny Invariants & Safety Hard-Locks
Throughout Phase 6.13 and beyond:
1. `realExecutionAllowed === false` (literal constant).
2. `networkAllowed === false` (zero live HTTP/HTTPS/WebSocket calls).
3. `credentialsAllowed === false` (zero personal token/cookie access).
4. `controlledExecutionEnabled === false` (controlled toggle disabled).
5. `killSwitchActive === true` (kill switch active and fail-closed).
6. `productionAllowed === false` (production environment strictly blocked).
7. `providerRoutingEnabled === false` (default-deny routing).

## Architectural Boundaries & Non-Scope
- **Zero Real Provider Calls:** Calls to live NotebookLM Enterprise endpoints, Antigravity CLI, or Google Cloud APIs remain strictly prohibited.
- **Zero MCP Listener:** No open ports or live MCP transport listeners are started.
- **Zero Subprocesses:** No `child_process.spawn`/`exec`/`fork`.
- **Zero Schema Migrations:** No changes to Prisma schema or database migrations.
- **Phase 6.14 Prohibition:** Phase 6.14 or live execution activation is explicitly forbidden.

## Evaluation of Release Options

### Option A: Freeze Backend Scope & Defer UI/Reader Debt (Recommended)
- **Description:** Acknowledge backend research provider architecture (Phases 5.1–6.12) as 100% verified, stable, and closed. Maintain Option A (Web UI manual research). Defer frontend UI/Reader test refactoring to a dedicated frontend maintenance sprint.
- **Trade-offs:** Backend remains robust and fail-closed; clean release boundary. Full suite requires selective exclusion of legacy UI tests if gating CI.

### Option B: Fix UI/Reader Failures Before Repository-Wide Tagged Release
- **Description:** Open a targeted UI/Reader maintenance phase to resolve the 4 selector/timing issues in `note-to-reader-deeplink-wiring.test.tsx`, `markdown-reader-fileurl-fetching.test.tsx`, and `reader-selection-action-flow.test.tsx`.
- **Trade-offs:** Delays release closure slightly but achieves 409/409 (100%) passing test suites repository-wide.

### Option C: Revert Commit 4
- **Description:** Revert runtime wiring commit (`git revert 293be87`).
- **Trade-offs:** Unnecessary since Commit 4 has 100% passing tests (58/58) and zero regressions. Highly discouraged.

## Reversibility & Blast Radius
- **Blast Radius:** LOW (Spec review and documentation only).
- **Reversibility:** 100% reversible via git version control.

## Human Approval Gates
This ADR is **PROPOSED** and requires explicit human operator sign-off before any subsequent phase or release decision can be executed.

## Gherkin Acceptance Criteria

```gherkin
Feature: Phase 6.13 Release Closure Spec Review & Invariant Verification

  Scenario: Verified backend baseline maintains default-deny
    Given the current backend verification is green with 64 of 64 provider suites passing
    When Phase 6.13 spec review is evaluated
    Then realExecutionAllowed must remain literal false
    And controlledExecutionEnabled must remain literal false
    And killSwitchActive must remain true
    And no execution capability is enabled

  Scenario: Full suite audit accurately reports UI failures
    Given the repository full test suite has 4 legacy UI/Reader test failures
    When repository release readiness status is computed
    Then the status must not be classified as fully green
    And the four failures must be explicitly cataloged as legacy UI debt

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

  Scenario: Proposed ADR blocks automatic implementation
    Given ADR-087 status is PROPOSED
    When any implementation or real execution is attempted
    Then the action is strictly blocked pending explicit manual human approval
```

## Rollback Policy
If rollback is required:
- Documentation files can be updated or reverted cleanly.
- If Commit 4 rollback is ever requested: `git revert 293be87eda7b9241d3f1db55cbb01ecd45e7357b`.
