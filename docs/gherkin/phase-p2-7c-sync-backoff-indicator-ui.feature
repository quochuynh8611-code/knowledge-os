# language: en
Feature: Phase P2.7c — Sync Backoff Indicator UI
  As a knowledge researcher
  I want to see the remaining cooldown time or ready state for failed mutations in the popover
  So that I understand when automatic retry will occur

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Display cooldown countdown for mutation in backoff
  # ─────────────────────────────────────────────────────────────
  Scenario: Failed mutation in backoff displays countdown
    Given a failed mutation with nextRetryAt 10 seconds in the future
    When the user opens the sync queue popover
    Then the mutation displays "Thử lại sau 10s" or "Thử lại sau 10 giây"

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Display ready state when cooldown has elapsed
  # ─────────────────────────────────────────────────────────────
  Scenario: Failed mutation past nextRetryAt displays ready state
    Given a failed mutation with nextRetryAt in the past
    When the user opens the sync queue popover
    Then the mutation displays "Sẵn sàng thử lại"

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Pending mutation does not show backoff cooldown
  # ─────────────────────────────────────────────────────────────
  Scenario: Pending mutation does not show backoff indicators
    Given a pending mutation in the sync queue
    When the user opens the sync queue popover
    Then the mutation displays "Chờ đồng bộ" without cooldown text
