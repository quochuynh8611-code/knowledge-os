Feature: Phase M3 keyboard authoring hardening

  As a knowledge worker using mind maps
  I want robust, isolated keyboard authoring shortcuts
  So that I can quickly shape my thoughts without unintended mutations, focus loss, or conflicts

  Scenario: One Enter produces exactly one sibling mutation
    Given saved-document mode and a focused non-root node
    When the user presses Enter once
    Then exactly one sibling is created
    And exactly one history snapshot is added
    And focus moves to the new sibling

  Scenario: One Tab produces exactly one child mutation
    Given saved-document mode and a focused node
    When the user presses Tab once
    Then exactly one child is created
    And focus moves to the new child

  Scenario: Modified shortcuts do not mutate
    Given a focused node in saved-document mode
    When the user presses Meta+Enter, Ctrl+Enter, Alt+Enter, or Alt+Tab
    Then the tree remains unchanged
    And history remains unchanged

  Scenario: Contenteditable target is isolated
    Given focus is inside a contenteditable element
    When the user presses Tab, Enter, Delete, or Backspace
    Then no tree mutation occurs

  Scenario: Drawer target is isolated
    Given the inline drawer is open
    When the user presses Tab, Enter, Delete, or Backspace
    Then no canvas authoring mutation occurs

  Scenario: Delete fallback prefers preceding sibling
    Given a focused node with a preceding sibling
    When the user presses Delete
    Then the focused subtree is deleted
    And focus moves to the preceding sibling

  Scenario: Delete fallback uses succeeding sibling
    Given a focused node without a preceding sibling but with a succeeding sibling
    When the user presses Backspace
    Then the focused subtree is deleted
    And focus moves to the succeeding sibling

  Scenario: Delete fallback reaches parent
    Given a focused node without siblings
    When the user presses Delete
    Then the focused subtree is deleted
    And focus moves to the parent

  Scenario: Live-topic remains immutable
    Given live-topic mode
    When the user presses Tab, Enter, Delete, or Backspace
    Then the projected tree remains unchanged
    And no dirty-state or history mutation occurs

  Scenario: Save Version preserves keyboard mutations
    Given a saved document changed by Tab, Enter, and Delete
    When the user saves a new version
    Then the persisted tree matches the working tree exactly
