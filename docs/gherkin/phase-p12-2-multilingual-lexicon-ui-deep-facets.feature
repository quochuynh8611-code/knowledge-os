Feature: P12.2 Multilingual Lexicon UI Deep Facets (Wave 1: Presentation Badges & Multilingual Surface)

  As a Buddhist and Eastern philosophy researcher or scholar
  I want to view rich multilingual representations (Devanagari, Han-Viet, English gloss, Source type) on the Lexicon UI
  So that I can quickly verify canonical root terms, phonetic systems, and provenance across multiple classical languages

  Background:
    Given the Unified Terminology Dictionary contains both Lexicon entries and System nodes with P12.0 language profiles

  Scenario: 1. Lexicon card displays source type badge for standalone Lexicon entries
    Given the user navigates to the Multilingual Lexicon view
    When the entry "lex-pali-citta" is rendered
    Then the card should display a source type badge indicating "Từ Điển"
    And the card should preserve the domain category badge "Phật Học"

  Scenario: 2. Lexicon card displays source type badge for System Node entries
    Given the user navigates to the Multilingual Lexicon view
    When the system node entry "sys-iching-01" is rendered
    Then the card should display a source type badge indicating "Ma Trận" or "Nút Hệ Thống"
    And the card should preserve the domain category badge "Huyền Học"

  Scenario: 3. Lexicon card displays Hanzi alongside its Han-Viet reading
    Given the user inspects the card for "lex-pali-citta"
    When the Chinese language profile contains surface form "心" and Han-Viet "Tâm"
    Then the card header should render the Hanzi "心" paired with its Han-Viet phonetic "[Tâm]"

  Scenario: 4. Lexicon card displays Sanskrit/Pāli with original Devanagari script
    Given the user inspects the card for "lex-pali-citta"
    When the Sanskrit language profile contains Devanagari "चित्त"
    Then the multilingual grid should display the Sanskrit IAST alongside Devanagari "चित्त"

  Scenario: 5. Lexicon card displays academic English gloss as secondary metadata
    Given the user inspects the card for "lex-pali-citta"
    When the English language profile contains preferred gloss "Mind / Consciousness"
    Then the card should render the English gloss "Mind / Consciousness"
    And the English gloss must not replace or displace the primary Vietnamese title

  Scenario: 6. Lexicon card gracefully falls back to legacy rendering when multilingual fields are absent
    Given a custom terminology entry without Devanagari or English gloss
    When the card is rendered in the Multilingual Lexicon
    Then the card should safely render placeholder dashes or omit missing fields without throwing errors

  Scenario: 7. Total count and search filtering behavior remains fully functional
    Given the user searches for "चित्त" or "xīn"
    When matching entries are returned
    Then the summary count header should reflect the exact number of filtered results
    And the citation modal trigger button should continue to work seamlessly

  Scenario: 8. Concept ID is not rendered as noisy primary title
    Given any rendered terminology card
    When inspecting the primary card title and headings
    Then the technical concept ID (e.g. "concept:buddhism:citta") must not be used as the primary visible title
