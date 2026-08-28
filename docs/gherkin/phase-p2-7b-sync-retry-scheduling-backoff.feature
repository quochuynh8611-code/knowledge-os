# language: en
Feature: Phase P2.7b — Sync Retry Scheduling and Backoff Metadata
  As a knowledge researcher
  I want failed mutations to use exponential backoff delays during automatic retries
  While still being able to manually trigger an immediate retry at any time

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Calculate Exponential Backoff Delay
  # ─────────────────────────────────────────────────────────────
  Scenario: Mark mutation as failed calculates exponential backoff and nextRetryAt
    Given a pending mutation in the sync queue
    When the mutation fails replay for the 1st time
    Then its backoffDelayMs is calculated as 1000ms
    And its nextRetryAt is set to 1 second in the future
    When the mutation fails replay for the 2nd time
    Then its backoffDelayMs is calculated as 2000ms
    And its nextRetryAt is set to 2 seconds in the future
    When the mutation fails replay for the 7th time
    Then its backoffDelayMs is capped at 60000ms (1 minute)

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Automatic replay respects backoff delay
  # ─────────────────────────────────────────────────────────────
  Scenario: Automatic flush skips mutations whose nextRetryAt is in the future
    Given a failed mutation with nextRetryAt set 30 seconds in the future
    When an automatic background flush is executed without bypassBackoff
    Then the mutation is skipped and not sent to the server

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Manual flush overrides backoff delay
  # ─────────────────────────────────────────────────────────────
  Scenario: Manual "Đồng bộ ngay" overrides nextRetryAt and attempts immediate replay
    Given a failed mutation with nextRetryAt set in the future
    When the user manually clicks "Đồng bộ ngay" (bypassBackoff = true)
    Then the mutation is immediately replayed against the server
