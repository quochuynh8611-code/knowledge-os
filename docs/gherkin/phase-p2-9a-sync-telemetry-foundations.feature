# language: en
Feature: Phase P2.9a — Sync Queue Telemetry and Failure Observability Foundations
  As a system engineer and knowledge researcher
  I want sync operations to be recorded in a local rolling event log
  So that I can inspect sync history, failure patterns, and success rates without leaking data

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Record telemetry event on mutation lifecycle
  # ─────────────────────────────────────────────────────────────
  Scenario: Mutation lifecycle operations emit telemetry events
    Given a clean sync telemetry log
    When a topic save mutation is enqueued
    Then a "MUTATION_ENQUEUED" event is appended to the telemetry log
    When the mutation is successfully replayed
    Then a "REPLAY_SUCCESS" event is appended to the telemetry log

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Enforce 50-event rolling buffer limit
  # ─────────────────────────────────────────────────────────────
  Scenario: Rolling buffer evicts oldest events when exceeding 50 items
    Given the telemetry log already contains 50 events
    When a new telemetry event is appended
    Then the telemetry log contains exactly 50 events
    And the oldest event is evicted from the log

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Calculate aggregate telemetry statistics
  # ─────────────────────────────────────────────────────────────
  Scenario: Compute success rates and breakdown by entity type
    Given the telemetry log contains 8 successes and 2 failures for topics, and 5 successes for notes
    When aggregate statistics are calculated
    Then total successes is 13 and total failures is 2
    And the topic success rate is 80%
    And the overall success rate is 86.67%
