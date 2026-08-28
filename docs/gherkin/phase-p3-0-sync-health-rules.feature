# language: en
Feature: Sync health rules and alerting read model
  As a knowledge researcher and system operator
  I want the sync queue to evaluate its overall health status automatically
  So that I can immediately identify network degradation or critical queue blockers

  Scenario: Unknown when no sync activity exists
    Given the sync queue is empty
    And telemetry contains 0 events
    When sync health is evaluated
    Then the health level should be "unknown"

  Scenario: Healthy when queue is clean after recovery
    Given the sync queue has no failed mutations
    And telemetry contains historical replay failures
    And the system currently has no active sync blockage
    When sync health is evaluated
    Then the health level should be "healthy"
    And the summary should indicate normal sync operation

  Scenario: Degraded when some active failures remain
    Given the sync queue contains 2 failed mutations waiting for retry
    When sync health is evaluated
    Then the health level should be "degraded"

  Scenario: Critical when a poison-pill mutation is detected
    Given the sync queue contains a mutation with retry count 5
    When sync health is evaluated
    Then the health level should be "critical"
    And the reasons should mention repeated retry exhaustion

  Scenario: Percentage thresholds require enough replay samples
    Given telemetry contains fewer than 3 replay attempts
    And one replay attempt has failed
    When sync health is evaluated
    Then percentage-based degradation rules should not apply
