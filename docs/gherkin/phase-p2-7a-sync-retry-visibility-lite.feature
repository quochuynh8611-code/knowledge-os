# language: en
Feature: Phase P2.7a — Sync Retry Visibility Lite
  As a knowledge researcher
  I want to see how many times a failed mutation has been retried in the sync popover
  So that I have clear visibility into persistent retry failures without risking data corruption

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Display retry count on failed mutation
  # ─────────────────────────────────────────────────────────────
  Scenario: Failed mutation displays its retry count
    Given a failed mutation with retryCount 3 is in the sync queue
    When the user opens the sync queue popover
    Then the mutation item displays "3 lần" or "Đã thử 3 lần"
    And the item displays the specific lastError message

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Zero retry count on newly queued pending item
  # ─────────────────────────────────────────────────────────────
  Scenario: Pending mutation does not show error retry badge
    Given a pending mutation with retryCount 0 is in the sync queue
    When the user opens the sync queue popover
    Then the mutation item displays "Chờ đồng bộ" without retry failure tags
