Feature: Restore evidence pack and operator runbook
  As a knowledge base operator or researcher
  I want standardized restore fixtures and a comprehensive runbook
  So that I can verify backups, practice restore drills safely, and operate without risking production data

  Scenario: Valid snapshot fixture passes restore validation
    Given a valid snapshot fixture exists
    When the fixture is validated
    Then it passes validation
    And its entity counts are reported

  Scenario: Legacy snapshot fixture remains compatible
    Given a legacy snapshot fixture exists
    When the fixture is validated
    Then compatible legacy fields remain loadable
    And no runtime crash occurs

  Scenario: Malformed snapshot fixture is rejected safely
    Given a malformed snapshot fixture exists
    When restore validation runs
    Then validation fails with a specific error
    And live state is unchanged

  Scenario: Manifest fixture exposes audit statuses
    Given a manifest fixture contains verified, unverified, missing and outside-library entries
    When backup readiness is calculated
    Then each status remains distinct
    And corrective actions are reported

  Scenario: Operator runbook distinguishes three backup layers
    Given the operator reads the runbook
    When the backup procedure is followed
    Then App Snapshot JSON, File Manifest JSON and Physical File Set are explained separately

  Scenario: Restore drill evidence is reproducible
    Given the operator uses the documented fixture
    When the restore drill is executed
    Then the same preview counts are produced
    And no live data is mutated
