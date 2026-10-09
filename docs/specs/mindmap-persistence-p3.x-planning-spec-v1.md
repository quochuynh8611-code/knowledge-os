# Phase P3.x Planning Spec — AI Node Expansion Hardening

Status: Draft for human approval only  
Phase: P3.x  
Track: Mind Map Persistence / AI Hardening  
Depends on: `docs/specs/mindmap-phase-p3-closure-report.md`  
Implementation mode: Test-first, approval-gated  
Non-goal: This document does **not** authorize implementation.

## 1. Purpose

Phase P3.x extends the completed AI Node Expansion workflow from P3 into a hardened, production-safer operator path. The phase keeps the existing preview-first review model, but replaces the mock-only assumption with a live provider-ready adapter, adds runtime validation for provider responses, and introduces a keyboard shortcut for faster entry into the AI expansion flow.

The hardening goal is not to expand feature scope. Instead, it reduces operational risk around malformed provider output, preserves existing review and working-copy boundaries, and improves editor ergonomics without widening the persistence blast radius.

## 2. Current baseline

P3 already introduced a bounded AI expansion workflow inside `saved-document` mode. The existing implementation includes a mockable `MindMapAiClient`, JSON-first normalization, Markdown fallback parsing, duplicate soft-warning with default unselect, flat-only child insertion, preview-first candidate review, and safe cancellation through `AbortController`.

The current baseline is intentionally local-first and working-copy-only. Suggested nodes can be reviewed, selected, deselected, and renamed before insertion, and accepted candidates are inserted only into `workingDocumentTree` with `isDirty = true`. No persisted snapshot is changed unless the user explicitly saves a new version.

## 3. Problem statement

P3 proved the AI-assisted node expansion interaction, but it still leaves three production-hardening gaps:

- The main provider path is still effectively mock-oriented, which prevents a controlled transition to live generation.
- The current normalization layer is resilient, but it still assumes raw provider output is safe enough to parse without an explicit runtime contract gate.
- The canvas/editor flow lacks a direct keyboard shortcut for the AI expansion entry point, which slows repeated usage during structured document curation.

Without P3.x, the product remains functionally correct but operationally soft at the provider boundary.

## 4. Scope

### 4.1 In scope

P3.x planning covers the following capabilities:

- Add a live Gemini-backed `MindMapAiClient` adapter while preserving the existing mockable abstraction.
- Add runtime validation for raw provider output before candidate normalization is accepted as safe.
- Add keyboard shortcut `Shift + A` to open AI expansion for the currently focused/selected node in editable `saved-document` mode.
- Preserve cancellation behavior for in-flight provider requests.
- Preserve preview-first review before insertion.
- Preserve flat-only insertion into the working copy.
- Add or update tests for provider validation, keyboard shortcut gating, and live-request cancellation behavior.

### 4.2 Out of scope

The following items are explicitly excluded from P3.x base scope:

- Full mind map generation from freeform text or documents.
- Multi-level hierarchical insertion of nested AI-generated trees.
- Automatic persistence to saved versions.
- Direct mutation of persisted snapshots.
- Changes to Prisma schema, server persistence contracts, or `DataContext`.
- Replacing the candidate review modal with auto-apply generation.
- Prompt-tuned product expansion beyond the existing preset model.
- Cross-document AI orchestration, batch expansion of multiple nodes, or server-side job queues.

## 5. Design principles

### 5.1 Preserve the abstraction boundary

`MindMapAiClient` remains the stable boundary. P3.x may add a concrete live provider adapter, but UI code must continue to depend on the abstraction rather than on Gemini-specific APIs directly.

### 5.2 Validate before normalize

Provider output must pass a runtime contract check before it is trusted as structured AI content. This reduces prompt fragility and shifts correctness from “best-effort parse” toward explicit contract enforcement.

### 5.3 Working-copy isolation remains inviolable

Even with a live provider, accepted candidates must still be inserted only into `workingDocumentTree`. P3.x does not authorize direct persistence, overwrite of existing nodes, or background save flows.

### 5.4 Keyboard acceleration must remain context-safe

`Shift + A` is valid only when all of the following are true:

- the operator is in `saved-document` mode,
- editing is allowed,
- a node is currently focused or selected,
- no conflicting modal state blocks the action.

### 5.5 Narrow blast radius

Expected high-risk files are limited to the AI service boundary, modal orchestration, and canvas keyboard wiring. Protected boundaries such as `DataContext`, `mindmapProjection`, `schema.prisma`, `src/server/*`, `package.json`, and `vite.config.ts` remain unchanged unless an explicit follow-up approval widens scope.

## 6. Proposed architecture

### 6.1 Provider adapter layering

Keep the following separation:

- `MindMapAiClient` — stable interface boundary.
- `createMockMindMapAiClient(...)` — preserved test/mocked path.
- `createGeminiMindMapAiClient(...)` — new live adapter path.
- `normalizeAiResponse(...)` — normalization and duplicate policy.
- `validateAiProviderPayload(...)` or equivalent runtime guard — explicit validation stage before structured acceptance.

The live adapter may still return raw text if the provider cannot guarantee a typed response, but the application must validate the content shape before treating it as a successful structured candidate list.

### 6.2 Runtime validation contract

P3.x should introduce a narrow runtime validation layer for the provider response contract. At minimum, validation should protect against:

- missing `candidates`,
- non-array `candidates`,
- candidate entries without a usable `title`,
- invalid `nodeType`,
- structurally malformed response bodies,
- empty-but-successful provider outputs.

If validation fails, the service must return a safe error result or fallback parse result without mutating any document state.

### 6.3 Keyboard shortcut flow

`Shift + A` opens the AI expansion modal for the current target node only when editor context is valid. The shortcut must be inert when:

- the app is not in editable `saved-document` mode,
- no node is focused or selected,
- another blocking interaction is already active,
- focus is inside a text input or textarea where shortcut capture would be unsafe.

### 6.4 Cancellation and safe-state behavior

Live provider requests must continue to honor `AbortSignal`. If the operator presses `Escape` or activates Cancel while a request is in flight:

- the request is aborted,
- the modal remains in a safe recoverable state,
- no candidate insertion occurs,
- no persisted snapshot is touched.

## 7. Data and contract changes

### 7.1 Expected type-level changes

P3.x may introduce small additive contract extensions only if required for validation or provider metadata. Any such additions must remain backward-compatible with the current `AiExpansionServiceResult` consumer logic.

### 7.2 Forbidden data model changes

P3.x must not introduce:

- Prisma schema changes,
- new backend persistence tables,
- changes to topic/note/resource source-of-truth contracts,
- server-enforced document save behavior.

## 8. Testing strategy

### 8.1 Test-first requirement

Implementation must begin with failing tests that prove the new hardening requirements are not yet guaranteed.

### 8.2 Required test areas

At minimum, P3.x must add or update tests for:

- valid Gemini/provider response passes runtime validation,
- malformed provider response fails safely,
- empty provider payload returns safe error behavior,
- `Shift + A` opens modal for a valid focused node,
- `Shift + A` does nothing outside editable `saved-document` mode,
- `Shift + A` does nothing when no valid target node exists,
- cancellation aborts in-flight live request and preserves safe-state,
- existing P3 duplicate/default-unselect policy still holds,
- existing flat-only insertion policy still holds.

### 8.3 Regression gate

All existing P3 tests must remain green. P3.x is a hardening phase, so it must not regress:

- preview-first review,
- duplicate warning behavior,
- working-copy-only mutation,
- no direct snapshot persistence,
- abort-safe cancellation.

## 9. Gherkin acceptance scenarios

```gherkin
Feature: Mind Map Phase P3.x Hardening

  Scenario: Open AI expansion from keyboard shortcut
    Given the user is editing a saved Mind Map document
    And a node is currently focused or selected
    When the user presses Shift + A
    Then the AI expansion modal opens for that node

  Scenario: Ignore keyboard shortcut outside valid editing context
    Given the user is not in editable saved-document mode
    When the user presses Shift + A
    Then the AI expansion modal does not open

  Scenario: Accept valid live provider payload
    Given the AI provider returns a valid candidate payload
    When the user requests AI expansion
    Then the response passes runtime validation
    And the candidates appear in the review modal
    And no nodes are inserted until the user confirms

  Scenario: Reject malformed live provider payload safely
    Given the AI provider returns malformed or schema-invalid content
    When the user requests AI expansion
    Then the response is rejected safely
    And the document tree remains unchanged
    And the user sees a recoverable error state

  Scenario: Cancel live request safely
    Given a live AI request is in flight
    When the user presses Escape or Cancel
    Then the active request is aborted
    And the modal remains in a safe stopped state
    And no persisted snapshot is changed
```
