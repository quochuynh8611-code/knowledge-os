# language: en
Feature: Phase P3.2 — Storage Quota Guard and Proactive Payload Trimming
  As a knowledge researcher operating offline
  I want the sync queue to handle storage quota exhaustion gracefully
  So that my critical pending edits are never silently lost

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Error message length sanitization
  # ─────────────────────────────────────────────────────────────
  Scenario: Long server error messages are truncated to 500 characters
    Given a network error message contains 2000 characters
    When the mutation is marked failed with this error
    Then the recorded lastError is capped at 500 characters
    And does not bloat localStorage

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Telemetry log trimming on quota pressure
  # ─────────────────────────────────────────────────────────────
  Scenario: Telemetry log is trimmed when queue saving exceeds quota
    Given localStorage quota is nearly exhausted by telemetry events
    When a new mutation is enqueued and saving fails
    Then the telemetry log is trimmed down to reclaim space
    And the queue save is retried successfully

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Exhausted poison-pill eviction while protecting pending items
  # ─────────────────────────────────────────────────────────────
  Scenario: Poison-pill mutations with retryCount >= 10 are pruned during recovery
    Given the queue contains exhausted failed mutations with retryCount 10
    And the queue contains critical pending mutations
    When storage recovery trimming is executed
    Then the exhausted failed mutations are pruned
    And all pending mutations are strictly preserved
