# language: en
Feature: Phase P5.0 — Command Palette Deep Actions & Recent History
  As a knowledge researcher or system operator
  I want quick keyboard access to recently executed commands and injected deep actions via Command Palette
  So that I can navigate and initiate external studio workflows with maximum speed and zero friction

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Recent commands are displayed at the top when palette is opened with empty query
  # ─────────────────────────────────────────────────────────────
  Scenario: Display recent commands in empty search state
    Given the user has previously executed commands "nav-abhidharma" and "act-toggle-theme"
    When the user opens the Command Palette with an empty search query
    Then a "Gần đây" section appears at the top of the palette
    And the "Gần đây" section contains "Ma trận phân tích" and "Chuyển Đổi Giao Diện Sáng / Tối" in descending order of execution

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Executing a command records it to recent history capped at 5 items with deduplication
  # ─────────────────────────────────────────────────────────────
  Scenario: Executing commands records history up to 5 items with deduplication
    Given the user has executed 5 different commands
    When the user executes a 6th new command "act-open-notebooklm"
    Then the recent history holds exactly 5 items
    And "act-open-notebooklm" is at the first position
    And the oldest command is evicted from the history

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Graceful fallback when localStorage is blocked or fails
  # ─────────────────────────────────────────────────────────────
  Scenario: Command palette functions normally when storage is blocked
    Given the browser localStorage throws a SecurityError or QuotaExceededError
    When the user opens and interacts with the Command Palette
    Then the palette renders without throwing uncaught exceptions
    And executing commands works in-memory during the active session

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Empty query shows recent section; non-empty query switches to category results
  # ─────────────────────────────────────────────────────────────
  Scenario: Non-empty search query hides the recent section to avoid duplicate results
    Given the user has items in recent command history
    When the user types "notebook" in the search box
    Then the "Gần đây" section is not displayed
    And all matching items are grouped under their primary categories

  # ─────────────────────────────────────────────────────────────
  # Scenario 5: Merge and execute deep actions injected via customItems extension seam
  # ─────────────────────────────────────────────────────────────
  Scenario: Merging and executing customItems without assuming hook owns modal visibility
    Given a custom deep action item "act-open-notebooklm" is injected via customItems
    When the user searches for "notebook" and executes the item
    Then the action callback defined on the custom item is invoked
    And the Command Palette automatically closes

  # ─────────────────────────────────────────────────────────────
  # Scenario 6: Search matches across existing CommandPaletteItem metadata
  # ─────────────────────────────────────────────────────────────
  Scenario: Flexible search matching against title, description, category, and keywords
    Given a command palette item with title "Bát Chánh Đạo", description "Con đường 8 nhánh", and keywords ["bat-chanh-dao", "dao-de"]
    When the user searches for "bat-chanh-dao" or "dao-de" or "8 nhanh"
    Then the command item is included in the filtered results
