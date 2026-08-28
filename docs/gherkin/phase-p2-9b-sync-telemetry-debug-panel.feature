# language: en
Feature: Phase P2.9b — Sync Telemetry Read Model and Debug Panel
  As a knowledge researcher and system operator
  I want to view sync queue telemetry statistics and recent event logs in the status popover
  So that I can monitor offline sync reliability and troubleshoot sync errors easily

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Switch between Queue tab and Telemetry tab
  # ─────────────────────────────────────────────────────────────
  Scenario: Operator switches to the Telemetry & Statistics tab
    Given the sync status badge popover is open
    When the operator clicks on the "Nhật ký & Thống kê" tab
    Then the telemetry metrics cards and recent event log are displayed
    When the operator clicks back on the "Hàng đợi" tab
    Then the active mutation queue items are displayed

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Display aggregate telemetry statistics
  # ─────────────────────────────────────────────────────────────
  Scenario: Display aggregate metrics summary
    Given the telemetry service contains 10 success events, 2 failure events, and 1 discard event
    When the operator opens the Telemetry tab
    Then the success rate is shown as "83.33%"
    And the success count is shown as "10"
    And the failure count is shown as "2"
    And the discarded count is shown as "1"

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Display recent event stream with error details
  # ─────────────────────────────────────────────────────────────
  Scenario: Display recent events stream in reverse chronological order
    Given a failed mutation event with error "Network timeout" exists in the log
    When the operator views the recent events list in the Telemetry tab
    Then the event is listed with a "Thất bại" badge
    And the error details "Network timeout" are displayed
