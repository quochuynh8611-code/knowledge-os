# language: en
Feature: Phase P2.1 — Client-Side URL Hash Routing & Deep-Linking
  As a knowledge researcher
  I want URL hash to reflect my current navigation tab, selected topic, and search filters
  So that I can bookmark pages, reload without losing context, and navigate using browser history

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Initial Load from URL Hash
  # ─────────────────────────────────────────────────────────────
  Scenario Outline: Loading application with specific URL hash initializes navigation state
    Given the browser opens with URL hash "<hash>"
    When the NavigationProvider initializes
    Then the activeTab is "<expectedTab>"
    And the selectedTopicId is "<expectedTopicId>"

    Examples:
      | hash                               | expectedTab | expectedTopicId            |
      | #/                                 | dashboard   | null                       |
      | #/topics                           | topics      | null                       |
      | #/topics/topic-abhidharma-tong-quan| topics      | topic-abhidharma-tong-quan |
      | #/graph                            | graph       | null                       |
      | #/ai_studio                        | ai_studio   | null                       |
      | #/progress                         | progress    | null                       |
      | #/search                           | search      | null                       |

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: State Changes Update URL Hash
  # ─────────────────────────────────────────────────────────────
  Scenario: Changing active tab or opening topic updates the browser location hash
    Given the user is on the dashboard tab with hash "#/"
    When the user navigates to the "notes" tab
    Then the browser location hash becomes "#/notes"
    When the user opens topic detail for "topic-citta"
    Then the browser location hash becomes "#/topics/topic-citta"
    And the activeTab is "topics"
    And the selectedTopicId is "topic-citta"

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Browser Back/Forward History Navigation
  # ─────────────────────────────────────────────────────────────
  Scenario: Triggering hashchange event updates navigation state
    Given the current location hash is "#/graph"
    When the user clicks browser Back button triggering hashchange to "#/topics/topic-citta"
    Then the activeTab updates to "topics"
    And the selectedTopicId updates to "topic-citta"

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Query Parameters Synchronization
  # ─────────────────────────────────────────────────────────────
  Scenario: Search query and category filters are synchronized with query params
    When the user sets searchQuery to "duyen khoi" on the search tab
    Then the location hash becomes "#/search?q=duyen+khoi"
    When the user opens URL with hash "#/topics?cat=cat-tam-tang&tag=kinh-tang"
    Then the selectedCategoryFilter is "cat-tam-tang"
    And the selectedTagFilter is "kinh-tang"
