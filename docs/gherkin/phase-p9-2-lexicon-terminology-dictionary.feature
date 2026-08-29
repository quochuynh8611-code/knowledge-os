Feature: Phase P9.2 — Read-Only Terminology Dictionary Adapter for Lexicon Registry

  As a knowledge integration engineer
  I want to access the existing Scholar Suite Lexicon Registry through a standardized TerminologyDictionary interface
  So that external modules can query classical and modern terms without coupling directly to Scholar Suite internal types.

  Background:
    Given the Lexicon Registry is loaded in memory

  Scenario: Scenario 1 — Transforming LexiconEntry to TerminologyEntry preserves multilingual aliases
    Given a LexiconEntry "lex-pali-citta" with Pali, Sanskrit, HanTu, Pinyin, Vietnamese, and English terms
    When mapped with mapLexiconEntryToTerminology
    Then the TerminologyEntry contains all 6 language terms in the aliases dictionary
    And the domain is "phat-hoc"
    And the sources are mapped losslessly

  Scenario: Scenario 2 — Direct entry retrieval by ID via TerminologyDictionary
    Given a LexiconDictionary initialized with the Lexicon Registry
    When querying getEntry("lex-pali-citta")
    Then the dictionary returns the mapped TerminologyEntry
    And querying a non-existent ID returns undefined

  Scenario: Scenario 3 — Deterministic searching across terms and definitions
    Given a LexiconDictionary initialized with the Lexicon Registry
    When searching for "Thanh Tịnh Đạo" or "consciousness"
    Then the dictionary returns matching entries accurately
    And does not mutate the source registry
