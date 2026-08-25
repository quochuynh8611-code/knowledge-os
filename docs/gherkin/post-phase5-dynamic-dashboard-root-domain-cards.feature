Feature: Dynamic dashboard domain cards for root categories

  Scenario: Existing Buddhist root category appears as dashboard card
    Given root category "Phật học" exists
    And it has descendant topics
    When Dashboard Home is rendered
    Then a dashboard card for "Phật học" is shown
    And the topic count matches all descendant topics

  Scenario: Existing Huyền học root category appears as dashboard card
    Given root category "Huyền học" exists
    And it has descendant topics
    When Dashboard Home is rendered
    Then a dashboard card for "Huyền học" is shown
    And the topic count matches all descendant topics

  Scenario: New root category appears as dashboard card
    Given user created a root category "Kinh tế"
    And the category exists in categories with parentId null
    When Dashboard Home is rendered
    Then a dashboard card for "Kinh tế" is shown
    And the topic count is calculated from its descendant topics

  Scenario: Clicking a dynamic root card filters topic view
    Given a root domain card "Phật học" is displayed
    When the user clicks the root card
    Then active tab changes to "topics"
    And selectedCategoryFilter is set to that root category ID

  Scenario: System card remains visible
    Given Dashboard Home is rendered
    Then the "Đang học" system card remains visible
    And it is not treated as a taxonomy domain card
