Feature: P12.1 Traditional Chinese Medicine (TCM) Registry Integration

  As an Eastern medicine researcher and scholar
  I want to access a structured Traditional Chinese Medicine (TCM) registry within the Unified Terminology Dictionary
  So that I can study Acupoints, Zang-Fu theory, and Materia Medica with accurate multilingual and clinical attributes

  Background:
    Given the Universal Terminology Contract supports the domain "y-hoc-co-truyen" and sourceType "tcm_registry"

  Scenario: 1. Unified Terminology Dictionary composes TCM entries without losing Lexicon and System nodes
    Given the Unified Terminology Dictionary is initialized
    When retrieving all available terminology entries
    Then the dictionary must include standalone Lexicon entries with "sourceType = lexicon"
    And the dictionary must include System Node entries with "sourceType = system_node"
    And the dictionary must include TCM entries with "sourceType = tcm_registry"

  Scenario: 2. TCM entry establishes dedicated identity and domain metadata
    Given the TCM entry "tcm-point-hegu" exists in the registry
    When inspected as a TerminologyEntry
    Then the entry id must be "tcm-point-hegu"
    And the domain must be "y-hoc-co-truyen"
    And the conceptId must be "concept:tcm:point:hegu"
    And the sourceType must be "tcm_registry"

  Scenario: 3. Acupoint entry enforces mandatory WHO meridian code, location, and indications
    Given an Acupoint entry with category "kinh-huyet"
    When validated against TCM integrity rules
    Then it must possess a valid WHO meridian code such as "LI4"
    And it must provide anatomical location description
    And it must list one or more clinical indications

  Scenario: 4. Materia Medica entry enforces Four Natures, Five Flavors, and Channel Tropism
    Given a Herbal entry with category "duoc-tinh" (e.g. "tcm-herb-renshen")
    When validated against TCM integrity rules
    Then it must declare its nature (Four Qi: Hàn, Nhiệt, Ôn, Lương, Bình)
    And it must declare one or more flavors (Five Flavors: Tân, Toan, Cam, Khổ, Hàm)
    And it must declare channel tropism (Quy kinh: Tỳ, Phế, Tâm...)
    And it must declare its primary therapeutic action

  Scenario: 5. Zang-Fu entry enforces Five Elements, Yin-Yang polarity, and governing physiological aspect
    Given a Zang-Fu theory entry with category "tang-tuong" (e.g. "tcm-zangfu-xin")
    When validated against TCM integrity rules
    Then it must declare its Five Element association (Kim, Mộc, Thủy, Hỏa, Thổ)
    And it must declare its Yin-Yang polarity ("Âm (Tạng)" or "Dương (Phủ)")
    And it must specify its governing physiological aspect (e.g. "Chủ huyết mạch, tàng thần")

  Scenario: 6. TCM entry provides rich multilingual surface forms
    Given the TCM entry "tcm-point-hegu"
    When inspected for multilingual language profiles
    Then the Vietnamese surface form must be "Hợp Cốc"
    And the Traditional Chinese surface form must be "合谷"
    And the Pinyin transliteration must be "Hégǔ"
    And the Han-Viet transliteration must be "Hợp Cốc"
    And the English academic gloss must be "Joining Valleys"

  Scenario: 7. Search engine retrieves TCM entries by various script and phonetic queries
    Given the user searches the Unified Terminology Dictionary
    When querying with Vietnamese unaccented "hop coc"
    Or querying with Hanzi "合谷"
    Or querying with Pinyin "hegu"
    Or querying with WHO code "LI4"
    Or querying with English "Ginseng"
    Then the search results must return the corresponding TCM entries with top ranking

  Scenario: 8. UI card renders appropriate source badge for TCM entries
    Given a TCM entry is rendered in the Multilingual Lexicon UI
    When the card is displayed
    Then it should render the category badge "Đông Y" or "Y Học Cổ Truyền"
    And it should render the source type badge "Đông Y"

  Scenario: 9. Non-TCM entries remain unpolluted by TCM domain extension
    Given a non-TCM entry such as "lex-pali-citta"
    When inspected in the Unified Terminology Dictionary
    Then its tcmExtension attribute must be undefined
    And its domain must remain "phat-hoc"

  Scenario: 10. TCM provenance and citation preserves distinct classical canon locators
    Given the TCM entry "tcm-zangfu-xin"
    When generating academic citations
    Then the primary source must reference classical medical canons (e.g. "Hoàng Đế Nội Kinh - Tố Vấn")
    And the citation key must reflect the TCM domain namespace

  Scenario: 11. Legacy terminology behavior is strictly preserved
    Given all existing Lexicon and System Node tests
    When executed against the updated Unified Terminology Dictionary
    Then all legacy tests must pass with zero regression
