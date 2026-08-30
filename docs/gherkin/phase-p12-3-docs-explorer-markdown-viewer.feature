Feature: P12.3 In-App Docs Explorer and Markdown Viewer

  As a researcher and developer using the Dashboard
  I want an in-app Docs Explorer to read ADRs, Specs, and Gherkin features directly
  So that I can verify architectural decisions and technical contracts in real-time without leaving the application

  Background:
    Given the backend server exposes secure documentation endpoints at "/api/docs"
    And the "docs/" directory contains ADRs, Specs, Gherkin features, and Developer Guides

  Scenario: 1. Fetching all available documents via API
    When a GET request is sent to "/api/docs"
    Then the response status code must be 200
    And the response must contain a total count of documents
    And the list must include categorized entries for "adr", "specs", and "gherkin"
    And each item must include "id", "title", "relativePath", and "lastModified"

  Scenario: 2. Reading specific document markdown content
    Given a valid document path "adr/ADR-061-multi-facet-filtering-toolbar.md"
    When a GET request is sent to "/api/docs/content?path=adr/ADR-061-multi-facet-filtering-toolbar.md"
    Then the response status code must be 200
    And the response body must contain the full markdown content
    And the title must be "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon"
    And the status must be "ACCEPTED"

  Scenario: 3. Path traversal attack prevention
    Given a malicious path "../../../etc/passwd" or "..%2F..%2F.env"
    When a GET request is sent to "/api/docs/content?path=../../../etc/passwd"
    Then the response status code must be 400 or 403
    And no system files outside the "docs/" directory must be leaked

  Scenario: 4. Requesting non-existent document returns 404
    Given a non-existent document path "adr/ADR-999-imaginary-feature.md"
    When a GET request is sent to "/api/docs/content?path=adr/ADR-999-imaginary-feature.md"
    Then the response status code must be 404
    And an informative error message must be returned

  Scenario: 5. Navigating to Docs Explorer in Dashboard UI
    Given the user is on the Dashboard
    When clicking the "Tài liệu kiến trúc" item in the Sidebar
    Then the active view must switch to the Docs Explorer split-pane layout
    And the left pane must display the document categories and search bar
    And the right pane must render the active markdown document

  Scenario: 6. Filtering documents by category tab
    Given the user is on the Docs Explorer view
    When clicking the "ADRs" category tab
    Then the document list must only show Architecture Decision Records
    When clicking the "Specs" category tab
    Then the document list must only show Technical Specifications

  Scenario: 7. Searching documents by keyword
    Given the user is on the Docs Explorer view
    When typing "ADR-061" into the document search bar
    Then the list must display "ADR-061: Multi-Facet Filtering Toolbar"
    When clicking on the search result
    Then the right pane must immediately render the markdown content for ADR-061

  Scenario: 8. Real-time document refresh button
    Given the user is reading a document
    When clicking the "Làm mới (↻)" button in the Docs Explorer header
    Then the UI must re-fetch the document from the server and display updated content
