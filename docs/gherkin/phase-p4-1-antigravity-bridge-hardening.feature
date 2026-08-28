# language: en
Feature: Phase P4.1 — Antigravity & NotebookLM Bridge Hardening
  As a knowledge researcher or Antigravity autonomous agent
  I want the handoff pipeline and job tracker to be bounded, safe, and schema-validated
  So that inter-process AI research workflows execute deterministically without storage bloat

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Rolling buffer limits job tracker to 50 items
  # ─────────────────────────────────────────────────────────────
  Scenario: Job tracker automatically caps stored handoff jobs to 50 latest entries
    Given the job tracker already contains 50 handoff jobs
    When a new handoff job is created and saved
    Then the total stored jobs count remains 50
    And the oldest job is evicted while the newest job is prepended

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Manifest JSON schema validation
  # ─────────────────────────────────────────────────────────────
  Scenario: Validating an Antigravity job manifest artifact
    Given an inter-process manifest JSON string
    When the manifest validator evaluates the structure
    Then it verifies version, jobId, topic metadata, and required file paths
    And returns a valid typed manifest object or descriptive validation errors

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Safe storage fallback when localStorage is blocked
  # ─────────────────────────────────────────────────────────────
  Scenario: Job tracker operates safely in restricted storage environments
    Given localStorage operations encounter quota restrictions
    When handoff jobs are saved or updated
    Then the operation handles errors gracefully without throwing uncaught exceptions
