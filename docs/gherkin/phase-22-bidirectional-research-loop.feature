Feature: Phase 22 - Bidirectional Research Loop Verification & Reader Hardening

  As a researcher reading and taking notes in Knowledge OS
  I want a robust, end-to-end bidirectional loop between Reader and Notes
  So that citations are reliably discovered, navigated with precision, and resilient against rapid UI interactions

  Background:
    Given the Knowledge OS reader subsystem is initialized
    And the current reading position store is clean

  Scenario: 1. Citation creation from reader selection and dynamic backlink discovery
    Given the user is reading document "doc-triet-hoc" titled "Triết Học Khái Luận"
    When the user selects text "Nhận thức luận là cơ sở của tri thức." in heading "chuong-2"
    And the user uses the selection toolbar to save the excerpt into note "Ghi chú Nghiên cứu Mới"
    Then the note is saved with a canonical citation "archive://doc-triet-hoc?loc=chuong-2"
    When the user opens the Reader Sidebar and views the Notes tab
    Then the Backlinks section dynamically displays "Ghi chú Nghiên cứu Mới"
    And shows a reference badge indicating 1 citation

  Scenario: 2. Full round-trip research loop with occurrence focus, jump back, and position preservation
    Given the user is reading document "doc-triet-hoc" at initial position "chuong-1"
    And note "Ghi chú Bản thể luận" cites "archive://doc-triet-hoc?loc=chuong-2"
    When the user opens the Reader Sidebar Notes tab
    And clicks the backlink card for "Ghi chú Bản thể luận"
    Then the NoteReaderModal opens without closing or unmounting the main reader
    And the modal scrolls smoothly to the citation occurrence matching "loc=chuong-2"
    And a transient visual highlight pulse is applied to the citation link
    When the user clicks the citation link inside the NoteReaderModal
    Then the main reader jumps directly to position "chuong-2"
    When the user closes the NoteReaderModal
    Then the main reader remains active at position "chuong-2"
    And no reading session reload or state loss occurs

  Scenario: 3. Rapid modal close and reopen handles timers and unmount cleanly
    Given the NoteReaderModal is opened from a citation backlink with an active highlight timer
    When the user rapidly closes the modal and opens another backlink note within 100 milliseconds
    Then no unmounted DOM access errors or unhandled exceptions are thrown
    And any pending highlight removal timers from the previous modal are cleanly cancelled
    And the new modal correctly initializes its own occurrence focus

  Scenario: 4. Resilient handling of locators containing complex special characters and URI encoding
    Given a note contains a citation with special-character locator "archive://doc-triet-hoc?loc=sec-2.1%23sub%26test%3D1"
    When the user opens the note from the backlink explorer with target locator "sec-2.1#sub&test=1"
    Then the DOM query executes safely with escaped selector syntax
    And smoothly scrolls to the matching citation element without throwing DOM syntax errors
