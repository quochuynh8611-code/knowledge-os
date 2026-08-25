Feature: Restore Drill Evidence Serialization and Audit Validation
  As an auditor or system operator
  I want to serialize restore drill evidence records to formatted JSON and validate them reliably
  So that evidence files can be safely exported, archived, and audited without path traversal risks or data corruption

  Scenario: Serialize evidence record to formatted deterministic JSON
    Given a valid RestoreDrillEvidenceRecord
    When the operator serializes the record to JSON with default options
    Then the output is a valid formatted JSON string with 2-space indentation
    And all essential fields including evidenceId, timestamp, and simulatedImpact are preserved

  Scenario: Format safe export filename with path traversal protection
    Given an evidence record with evidenceId "../../../etc/passwd-unsafe-id" and timestamp "2026-08-25T10:00:00.000Z"
    When the filename generator is executed
    Then the resulting filename does not contain ".." or "/"
    And the filename follows the convention "knowledge-os-restore-drill-evidence-YYYY-MM-DD-*.json"

  Scenario: Successfully validate valid evidence JSON string
    Given a valid serialized evidence JSON string
    When the audit validator parses the string
    Then validation succeeds with valid true
    And the returned evidence object matches all properties of the original record
    And modifying the returned evidence object does not affect any external reference

  Scenario: Safely reject malformed or schema-invalid JSON strings
    Given a corrupted JSON string or a payload missing required fields
    When the audit validator evaluates the input
    Then validation safely returns valid false with an explicit error message
    And no uncaught exceptions are thrown and no live restore operations are triggered
