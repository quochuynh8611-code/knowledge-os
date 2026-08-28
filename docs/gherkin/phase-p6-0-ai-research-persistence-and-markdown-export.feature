Feature: Phase P6.0 — AI Research Studio Persistence & Markdown Export

  As a researcher using Antigravity AI Scholar Studio
  I want my successful research sessions to be persisted safely, restored per topic, viewable in a lightweight history, and exportable to clean Markdown
  So that I never lose deep academic synthesis results, avoid cross-topic confusion, and can export notes seamlessly

  Background:
    Given the Knowledge OS web application is running
    And the safe local storage interface is active

  Scenario: 1. Successful research session is persisted in a rolling buffer
    When an AI research query finishes successfully with a non-empty result
    Then a new AIResearchSession is recorded with topicId, prompt, mode, result, and timestamp
    And the total number of stored sessions across all topics does not exceed 20
    And newest sessions appear first

  Scenario: 2. Corrupted storage data or unavailable storage degrades gracefully
    Given localStorage contains corrupted or malformed JSON under the session key
    When reading stored research sessions
    Then it returns an empty list without throwing uncaught exceptions
    When saving a session under QuotaExceededError or blocked storage
    Then it handles the error gracefully without crashing the application

  Scenario: 3. Deterministic topic-specific session restoration
    Given there are stored research sessions for Topic A and Topic B
    When the user selects Topic A in AI Research Studio
    Then the latest session for Topic A is restored into prompt, mode, and research result
    And no session data from Topic B is leaked into Topic A

  Scenario: 4. Missing session reset behavior
    Given Topic C has no stored research sessions
    When the user selects Topic C
    Then the prompt and research result are reset to empty
    And error message and copy/note statuses are cleared
    And the mode resets to default concept_analysis

  Scenario: 5. Dirty draft guard on topic switch and execution lock
    Given the user is currently typing a new prompt draft for Topic A
    When the user switches the active topic to Topic B
    Then the dirty unsubmitted draft for Topic A is cleared
    And Topic B's own latest session is loaded
    When research query execution is in progress (isLoading is true)
    Then topic selector and history switcher are disabled to prevent race conditions

  Scenario: 6. Lightweight history navigation for active topic
    Given Topic A has multiple stored research sessions
    When viewing the history list for Topic A
    Then only sessions matching Topic A's topicId are shown in reverse chronological order
    When the user clicks an older history session
    Then the studio displays that specific session's prompt, mode, and result

  Scenario: 7. Markdown export with sanitized filename
    Given a research session is currently displayed in the studio
    When the user triggers "Xuất Markdown"
    Then a markdown file named "AI-Research-[topic-slug]-[timestamp].md" is generated for download
    And the filename contains no invalid filesystem characters
    And the markdown body contains metadata (topic, mode, timestamp), the prompt, and the synthesis result
