Feature: Export / Backup Modal White-Screen Root-Cause Isolation and Render Resilience

  Scenario: Navbar triggers Export modal without crash when localStorage is restricted
    Given the browser environment restricts localStorage access with a SecurityError
    When the user views the Navbar and clicks the Export / Backup download button
    Then the Navbar must remain mounted and visible
    And the ExportImportModal must render its header and tabs without white-screen crash
    And sibling modals (NoteFormModal, ResourceFormModal) must not throw uncaught exceptions

  Scenario: NoteFormModal and ResourceFormModal top-level storage access resilience
    Given localStorage.getItem throws SecurityError
    When NoteFormModal or ResourceFormModal is rendered
    Then it must safely fallback to empty canonical library root without throwing

  Scenario: ExportImportModal handles computation errors gracefully
    Given auditFileReferences or calculateBackupReadiness encounters invalid or throwing data
    When ExportImportModal is rendered
    Then it must render gracefully with fallback summary metrics and not crash the React fiber tree
