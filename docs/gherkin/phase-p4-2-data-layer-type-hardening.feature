# language: en
Feature: Phase P4.2 — Data Layer and Type Hardening
  As a software engineer maintaining the Knowledge OS codebase
  I want clean and compatible TypeScript type definitions across data models and test mocks
  So that the project achieves zero static analysis diagnostics without runtime regressions

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: TypeScript type check passes with zero errors
  # ─────────────────────────────────────────────────────────────
  Scenario: Static analysis with tsc --noEmit passes completely
    Given all type definitions in src/types/index.ts are aligned with validation schemas
    When the TypeScript compiler runs type checking across the workspace
    Then zero diagnostic errors are reported
    And the lint command exits with status code 0

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Data repository handles topics with flexible links and study progress
  # ─────────────────────────────────────────────────────────────
  Scenario: Data repository persists validated topics and links seamlessly
    Given a topic with optional links and study progress metadata
    When syncHydrate or saveTopic processes the topic entity
    Then the operation succeeds without type casting workarounds or runtime errors
