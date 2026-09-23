Feature: Citation backlinks in Reader Sidebar

  Scenario: Show notes that cite the active document
    Given the reader is open on document "doc-A"
    And note "N1" contains citation "archive://doc-A?loc=heading:intro"
    And note "N2" contains citation "archive://doc-A?loc=heading:chapter-1"
    When the Reader Sidebar renders backlinks
    Then it shows backlink entries for "N1" and "N2"
    And it shows a backlink count of 2

  Scenario: Exclude notes that cite another document
    Given the reader is open on document "doc-A"
    And note "N1" contains citation "archive://doc-B?loc=heading:intro"
    When the Reader Sidebar renders backlinks
    Then "N1" is not shown as a backlink for "doc-A"

  Scenario: Group multiple citations from one note
    Given the reader is open on document "doc-A"
    And note "N1" contains three citations to "archive://doc-A"
    When the Reader Sidebar renders backlinks
    Then it shows one entry for "N1"
    And the entry reports three references

  Scenario: Ignore malformed citations
    Given the reader is open on document "doc-A"
    And note "N1" contains malformed citation "archive:/broken"
    When the Reader Sidebar renders backlinks
    Then "N1" is not counted as a valid backlink
    And the application does not crash

  Scenario: Reject unsafe schemes
    Given the reader is open on document "doc-A"
    And note "N1" contains "javascript:alert(1)"
    When the Reader Sidebar renders backlinks
    Then the unsafe link is ignored
    And no script is executed
    And the application does not write to Obsidian Vault

  Scenario: Refresh backlinks after document switch
    Given the reader is open on document "doc-A"
    And note "N1" cites "archive://doc-A"
    And note "N2" cites "archive://doc-B"
    When the active document changes from "doc-A" to "doc-B"
    Then "N1" is removed from the backlink list
    And "N2" appears in the backlink list

  Scenario: Open note context from backlink
    Given the reader is open on document "doc-A"
    And note "N1" appears as a backlink
    When the user clicks the backlink entry for "N1"
    Then the note context for "N1" opens
    And the active reader document remains "doc-A"
    And the current reader position is preserved

  Scenario: Show empty state when no backlink exists
    Given the reader is open on document "doc-A"
    And no note contains a valid citation to "doc-A"
    When the Reader Sidebar renders backlinks
    Then it shows an explanatory empty state
    And it does not show unrelated notes

  Scenario: Preserve Vault read-only boundary
    Given the reader is open on document "doc-A"
    When backlinks are computed or opened
    Then no write operation is sent to the Obsidian Vault
