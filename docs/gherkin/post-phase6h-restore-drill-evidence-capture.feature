Feature: Restore Drill Evidence Capture
  As a knowledge base operator or auditor
  I want a standardized evidence record generated from restore drill readiness reports
  So that I have immutable, reproducible proof of dry-run simulations, safety gates compliance, and operator sign-offs

  Scenario: Generate valid evidence record from successful readiness report
    Given a valid operator drill readiness report in replace mode
    When the operator captures the restore drill evidence record
    Then the evidence record contains a non-empty evidenceId
    And the snapshotChecksum matches the candidate snapshot
    And the snapshotFormat is "snapshot_v2"
    And the simulatedMode is "replace"
    And the simulatedImpact preserves all entity deltas
    And the gateSummary indicates Gate 1 passed, Gate 2 passed, and Gate 3 is required

  Scenario: Preserve immutability of input readiness report and live state
    Given an existing operator drill readiness report and live application state
    When the evidence capture helper is executed
    Then the input readiness report remains deeply unmodified
    And the live application state remains 100% frozen and unmodified

  Scenario: Handle invalid readiness reports safely without triggering live restore
    Given an operator drill readiness report where Gate 1 validation failed
    When the evidence capture helper is executed
    Then the validationStatus is "invalid"
    And the dryRunStatus is "simulated_failed"
    And overallDrillReady is false
    And no live database or storage mutations are triggered

  Scenario: Operator assigns custom sign-off status and audit notes
    Given a valid operator drill readiness report
    When the evidence is captured with sign-off status "signed_off" and operator notes "Đã kiểm chứng dry-run thành công"
    Then the operatorSignOffStatus is "signed_off"
    And the operatorNotes contains "Đã kiểm chứng dry-run thành công"
    And the timestamp is a valid ISO 8601 string
