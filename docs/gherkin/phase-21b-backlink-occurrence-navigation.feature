Feature: Backlink occurrence navigation and precision focus in Note Reader Modal

  Scenario: Focus specific citation occurrence matching locator
    Given the user is reading document "doc-triet-hoc" at locator "chuong-2"
    And note "N1" contains two citations to "doc-triet-hoc":
      | linkText    | citationUri                                      |
      | "Chương 1"  | "archive://doc-triet-hoc?loc=chuong-1"          |
      | "Chương 2"  | "archive://doc-triet-hoc?loc=chuong-2"          |
    When the user clicks the backlink entry for "N1"
    Then the Note Reader Modal opens for note "N1"
    And the view scrolls to the citation element with locator "chuong-2"
    And the citation element receives a transient visual focus state

  Scenario: Fallback to first document occurrence when locator does not match
    Given the user is reading document "doc-triet-hoc" at locator "chuong-99"
    And note "N1" contains citations to "doc-triet-hoc":
      | linkText    | citationUri                                      |
      | "Chương 1"  | "archive://doc-triet-hoc?loc=chuong-1"          |
      | "Chương 2"  | "archive://doc-triet-hoc?loc=chuong-2"          |
    When the user clicks the backlink entry for "N1"
    Then the Note Reader Modal opens for note "N1"
    And the view scrolls to the first citation element matching "doc-triet-hoc"
    And the first citation element receives a transient visual focus state

  Scenario: Safe fallback when note contains no matching citation occurrences
    Given the user opens Note Reader Modal for note "N2" with target document "doc-tam-ly"
    And note "N2" contains no citations to "doc-tam-ly"
    When the modal renders
    Then the modal opens normally at the default scroll position
    And no error or unhandled exception is thrown

  Scenario: Preserve source reader context and position upon modal close
    Given the user opened note "N1" from a backlink in document "doc-triet-hoc" at position "chuong-2"
    When the user closes the Note Reader Modal
    Then the Unified Research Reader remains active on "doc-triet-hoc"
    And the reading position remains at "chuong-2"

  Scenario: Zero Vault write and zero note mutation
    Given the user navigates from a backlink to a note occurrence
    When occurrence resolution, scrolling, and transient highlighting execute
    Then no mutating HTTP request is sent to the Obsidian Vault
    And the note content in storage remains unchanged
