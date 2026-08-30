Feature: Phase P12.0 — Multilingual Term Identity & Language-aware Knowledge Foundation

  As a scholar, linguist, and knowledge engineer
  I want a multi-tier concept identity and language profile architecture
  So that terms across Classical Chinese, Academic English, Sanskrit/Pāli, and Traditional Chinese Medicine (TCM)
  can be rigorously represented, searched with deterministic ranking, and cited with pristine provenance.

  Background:
    Given the Universal Terminology Contract and Unified Dictionary baseline from Phase P11.0 is active
    And existing TerminologyEntry.aliases compatibility projection is preserved

  Scenario: Scenario 1 — Concept identity and source entry identity are strictly separated
    Given a lexical root entry "lex-pali-citta" and a system model node "sys-citta-01"
    When both entries are mapped into the unified terminology dictionary
    Then each entry retains its distinct physical "id" ("lex-pali-citta" and "sys-citta-01")
    And both entries reference the shared semantic concept ID "concept:buddhism:citta"
    And each entry preserves its distinct "sourceType" ("lexicon" vs "system_node")

  Scenario: Scenario 2 — A single concept supports multi-script and multi-language surface forms
    Given the semantic concept "concept:buddhism:citta"
    When inspecting its registered LanguageProfiles
    Then it provides surface form "Tâm" for language "vi" and script "Latn"
    And it provides surface form "Mind / Consciousness" for language "en" and script "Latn"
    And it provides Traditional Chinese "心" for language "zh-Hant" and script "Hani"
    And it provides Simplified Chinese "心" for language "zh-Hans" and script "Hani"
    And it provides Sanskrit IAST "citta" and Devanagari "चित्त" for language "sa" and script "Deva"
    And it provides Pāli IAST "citta" for language "pi" and script "Latn"

  Scenario: Scenario 3 — Transliterations are strictly bound to standardized romanization systems
    Given a Chinese language profile for "太淵" (Thái Uyên)
    When examining its transliteration record
    Then "tài yuān" is explicitly identified as romanization system "pinyin"
    And "Thái Uyên" is explicitly identified as phonetic system "han-viet"
    And plain ASCII string "taiyuan" is automatically derived for fast indexing

  Scenario: Scenario 4 — Preferred display form is deterministic based on language and script context
    Given the concept "concept:buddhism:citta" with multi-language profiles
    When requesting display for Vietnamese academic context
    Then the preferred label is "Citta (Tâm)"
    When requesting display for Classical Chinese research context
    Then the preferred label is "心 (xīn / Tâm)"
    When requesting display for Indology Sanskrit research context
    Then the preferred label is "citta / चित्त"

  Scenario: Scenario 5 — Exact surface form search yields highest priority over fuzzy aliases
    Given a dictionary containing term "心" (Citta / Tâm) and related commentary mentioning "tâm lý"
    When executing a language-aware query with exact character "心"
    Then the entry with exact surface form "心" receives top relevance score (100)
    And it ranks strictly higher than entries matching "心" only inside descriptions or notes

  Scenario: Scenario 6 — Pinyin search matches the exact concept deterministically
    Given a dictionary containing Chinese terms with Pinyin transliterations
    When executing a search query with toned Pinyin "xīn" or toneless Pinyin "xin"
    Then the concept "concept:buddhism:citta" is returned in top results
    And ranking is deterministic regardless of accent normalization

  Scenario: Scenario 7 — Sanskrit and Pāli IAST search matches exact diacritical terms
    Given a dictionary containing Pāli terms with IAST diacritics
    When executing a search query with IAST string "prajñā" or ASCII fallback "prajna"
    Then the concept for "Tuệ (Paññā / Prajñā)" is returned with high relevance
    And IAST diacritic matching is prioritized over loose phonetic matches

  Scenario: Scenario 8 — English gloss search returns matching concept with lower weight than canonical form
    Given the concept "concept:buddhism:citta" with preferred gloss "Consciousness"
    When executing a search query for "consciousness"
    Then the concept is returned in search results
    And its relevance score is lower than a query matching the canonical IAST term "citta" directly

  Scenario: Scenario 9 — Query matching both lexical root and system concept preserves distinct identities
    Given both "lex-iching-qian" and "sys-iching-01" are registered in the unified dictionary
    When executing a search query for "Thuần Càn" or "乾"
    Then search results return both entries without collapsing them into a single record
    And "lex-iching-qian" is identified as lexical etymology
    And "sys-iching-01" is identified as Hexagram System Node (Q01)

  Scenario: Scenario 10 — Traditional Chinese Medicine (TCM) fields apply strictly to TCM domain entries
    Given a TCM acupuncture point entry "sys-tcm-lu09" (Thái Uyên) and a Buddhist entry "lex-pali-citta"
    When inspecting the domain-specific metadata
    Then "sys-tcm-lu09" contains TCM category "kinh-huyet" and meridian code "LU-9"
    And "lex-pali-citta" does not contain any TCM-specific fields or attributes

  Scenario: Scenario 11 — Scholar citation retains source entry ID and specific canonical edition
    Given an entry "sys-tcm-lu09" citing "Châm Cứu Giáp Ất Kinh" and "lex-pali-citta" citing "PTS Dhammasaṅgaṇī"
    When generating citation metadata for either entry
    Then the citation preserves the exact "sourceEntryId" and canonical locator reference
    And the citation note contains multilingual surface forms and transliterations

  Scenario: Scenario 12 — Flattened alias projection maintains backward compatibility with legacy consumers
    Given an entry with comprehensive LanguageProfiles (sa, zh-Hant, vi, en)
    When deriving the legacy "aliases" record
    Then "aliases.pali", "aliases.sanskrit", "aliases.hanTu", "aliases.pinyin", "aliases.vietnamese", and "aliases.english" are populated
    And legacy selectors and UI components continue functioning without modification
