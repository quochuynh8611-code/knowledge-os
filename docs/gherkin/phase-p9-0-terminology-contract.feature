Feature: Phase P9.0 — Universal Terminology Contract & Extensible Knowledge Domain Foundation

  As a software engineer and knowledge graph architect
  I want a universal, extensible Terminology contract and dictionary interface
  So that terms across ancient traditions and modern scientific disciplines can be represented uniformly without breaking Scholar Suite backward compatibility.

  Background:
    Given the Scholar Suite and Citation Engine baseline from Phase P8.4 is verified

  Scenario: Scenario 1 — Core knowledge domains and custom domains are valid
    When a TerminologyEntry is created with core domain "phat-hoc" or custom domain "y-hoc-co-truyen"
    Then the domain property satisfies KnowledgeDomain contract
    And type checks pass cleanly

  Scenario: Scenario 2 — TerminologySource supports both classical and modern scholarly references
    When a TerminologyEntry is provided with PTS citation, Taisho catalog, DOI, and URL
    Then all citation locator fields are properly preserved and accessible

  Scenario: Scenario 3 — TerminologyDictionary implements standard lookup and search
    Given an in-memory dictionary implementing TerminologyDictionary
    When looking up an entry by ID or searching by query string
    Then the dictionary returns matching TerminologyEntry objects accurately
