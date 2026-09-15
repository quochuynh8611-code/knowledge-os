Feature: Server-canonical startup hydration

  Background:
    Given the backend database has been reset to commercial baseline
    And the canonical category is "cat-root-dong-y" with name "Đông Y"
    And the canonical topic is "topic-dong-y-co-ban" with name "Lý Luận Cơ Bản Đông Y"

  Scenario: Legacy cache cannot recreate deleted categories
    Given local persistence contains a category that does not exist on the server
    When the application starts
    Then no sync request may create that category on the server
    And the rendered category state is reconciled to the server response

  Scenario: Valid user-created category remains supported
    Given the user creates a new category through the supported create-category API
    When the server accepts the request
    Then the category is persisted on the server
    And it appears after a fresh browser reload

  Scenario: Storage-version mismatch is invalidated safely
    Given persisted storage has an older version
    When the application starts with a newer storage version
    Then only the identified legacy app-state keys are removed
    And unrelated browser storage remains untouched

  Scenario: Server hydration precedes client mutation sync
    Given the browser has legacy cached categories
    When startup hydration is in progress
    Then the client must not send a mutating sync request before canonical server data is loaded

  Scenario: Reconciliation is idempotent
    Given the server contains only valid canonical categories
    When the application reloads twice
    Then no deleted category is recreated
    And the category list remains unchanged
