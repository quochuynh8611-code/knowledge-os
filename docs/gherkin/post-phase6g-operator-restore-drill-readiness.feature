Feature: Operator Restore Drill Readiness
  As a knowledge base operator or researcher
  I want a standardized and verified restore drill readiness process
  So that I can practice data restoration scenarios safely, collect reproducible evidence, and protect live state

  Scenario: Operator assesses preconditions before starting drill
    Given the operator initiates a restore drill session
    When the operator checks system preconditions
    Then the database health status is evaluated
    And an initial backup snapshot exists as a safety recovery point

  Scenario: Operator validates candidate snapshot integrity against Gate 1
    Given a candidate snapshot is loaded into the drill session
    When preflight validation is performed
    Then the schema structure and SHA-256 checksum are verified
    And if the checksum matches, the candidate proceeds to drill simulation
    And if the checksum fails, Gate 1 blocks the drill with an explicit error

  Scenario: Operator executes in-memory restore drill without mutating live state
    Given a valid candidate snapshot and an active application state
    When the operator runs the restore drill in either merge or replace mode
    Then simulated entity deltas are computed in RAM
    And a visual dry-run indicator is displayed
    And the live application state remains 100% unchanged

  Scenario: Safety Gate 3 blocks destructive live replacement without explicit confirmation phrase
    Given a valid candidate snapshot is loaded in replace mode
    When the operator attempts to trigger live restore without typing "XÁC NHẬN THAY THẾ"
    Then the submission action remains disabled
    And no destructive changes are applied to the server or database

  Scenario: Operator collects reproducible evidence artifacts and signs off
    Given the restore drill finishes with simulated results
    When the operator records the drill evidence
    Then the snapshot checksum, entity deltas, and dry-run flag are documented
    And the operator completes the sign-off checklist in the runbook
