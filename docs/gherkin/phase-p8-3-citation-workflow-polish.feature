Feature: Phase P8.3 — Citation Workflow Polish & Export Feedback

  As a researcher
  I want clear feedback after copying or downloading citations, explicit separation of canonical evidence from modern commentary, and transparent batch export reporting
  So that I can conduct rigorous scholarship with zero ambiguity about sources and seamless keyboard accessibility.

  Background:
    Given Scholar Citation Subsystem from Phase P8.2 is active

  Scenario: Scenario 1 — Keyboard Escape closes citation modal
    Given the ScholarCitationModal is open
    When the user presses the "Escape" key
    Then the modal closes immediately
    And focus is returned cleanly

  Scenario: Scenario 2 — Accessible live region announces copy feedback
    Given the ScholarCitationModal is open with a valid citation
    When the user clicks "Sao chép trích dẫn"
    Then the live region "role=status" announces "Đã sao chép trích dẫn vào clipboard"
    And the button visually displays "Đã sao chép"

  Scenario: Scenario 3 — Copy failure feedback on clipboard error
    Given the ScholarCitationModal is open
    And the clipboard API rejects the write operation
    When the user clicks "Sao chép trích dẫn"
    Then the modal displays a clear copy failure alert
    And does not falsely claim success

  Scenario: Scenario 4 — Clear visual distinction between canonical evidence and interpretive note
    Given the modal is opened for MatrixRelation "rel-c01-cet01"
    When the modal body renders
    Then the canonical evidence is displayed in a dedicated textual source card
    And the interpretive note is labeled as modern analytical commentary
    And the evidenceLevel "canonical" is prominently tagged

  Scenario: Scenario 5 — Batch export reporting accurately tracks exported vs skipped items
    Given a list of 3 MatrixRelations with 2 canonical relations and 1 stub relation without sources
    When calculating batch export statistics
    Then total is 3
    And exportedCount is 2
    And skippedCount is 1
