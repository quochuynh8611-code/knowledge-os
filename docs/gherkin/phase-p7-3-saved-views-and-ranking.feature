Feature: Phase P7.3 — Saved Views & Lightweight Retrieval Ranking

  As a scholar exploring deep Buddhist philosophy and metaphysical structures
  I want to create, pin, and replay saved views in AdvancedSearch and discover them in the Command Palette
  And I want intelligent, additive search relevance ranking
  So that I can effortlessly switch between curated research lenses and find target topics rapidly

  Background:
    Given the Knowledge OS dashboard is loaded
    And the scholar search repository contains indexed topics, notes, and resources

  # P7.3a: Ranking Core & Storage Layer
  Scenario: Additive multi-token title coverage ranking
    Given an index with topic "Hiểu Sâu Về Tâm Vương Và Tâm Sở"
    When the user searches for "Tâm Sở Tâm Vương"
    Then the multi-token title coverage bonus (+15) is applied
    And the topic score is higher than a single-field substring match

  Scenario: Word-boundary description match bonus
    Given an index with a topic containing "thực hành thiền định sâu" in description
    When the user searches for "thiền định"
    Then the word-boundary match bonus (+10) is awarded
    And ranking invariants maintain exact title above description matches

  Scenario: Saved Views storage validation and pinning
    When a saved view is created with query "" and domain filter "phat-hoc"
    Then the view is stored successfully in "phat_hoc_saved_views_v1"
    When the view is pinned
    Then it is deterministically sorted to the top of the saved views list

  # P7.3b: AdvancedSearch UI Integration
  Scenario: Creating a new Saved View via inline panel
    Given the user is on the "search" tab
    And has entered query "Bát Nhã" with status filter "in_progress"
    When the user clicks "Lưu góc nhìn"
    And enters name "Chuyên Đề Bát Nhã" and checks "Ghim lên đầu"
    And clicks "Xác nhận lưu"
    Then a new saved view chip "Chuyên Đề Bát Nhã" appears in "Góc nhìn đã lưu:"
    And the view is saved in local storage with pinned set to true

  Scenario: 1-click replaying a Saved View
    Given a saved view "Khảo sát Tâm Vương" exists with query "Tâm Vương" and domain "phat-hoc"
    When the user clicks the "Khảo sát Tâm Vương" chip
    Then the search query input is set to "Tâm Vương"
    And the domain filter is set to "phat-hoc"
    And filtered search results are updated immediately

  Scenario: Pin and Delete chip actions isolate click events
    Given a saved view "Góc nhìn Duyên Hệ" exists
    When the user clicks the pin icon on the chip
    Then the pin state is toggled
    And the search query is not replayed
    When the user clicks the delete icon on the chip
    Then the view is removed from the list and storage
    And the search query is not replayed

  # P7.3b: Command Palette Convergence
  Scenario: Discovering and executing a Saved View from Command Palette
    Given a saved view "Khảo sát Kỳ Môn" is passed to useCommandPalette via options
    When the user opens the Command Palette
    And types "Ky Mon"
    Then a command item "[Góc nhìn] Khảo sát Kỳ Môn" is displayed under category "Điều hướng"
    When the user selects the command item
    Then the application navigates to tab "search"
    And the onApplySavedView callback is executed
