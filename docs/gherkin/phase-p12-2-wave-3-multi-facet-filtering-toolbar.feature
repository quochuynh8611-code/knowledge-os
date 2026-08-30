Feature: P12.2 Wave 3 Multi-Facet Filtering Toolbar

  As a researcher exploring the multilingual knowledge OS
  I want a multi-facet filtering toolbar in the Multilingual Lexicon
  So that I can smoothly filter terms across orthogonal domains, source structures, and TCM subcategories

  Background:
    Given the Unified Terminology Dictionary contains 241 canonical entries across 3 orthogonal domains and 3 source types

  Scenario: 1. Toolbar renders universal Domain and Source Type facet groups
    Given the Multilingual Lexicon view is loaded
    When the filtering toolbar is rendered
    Then it must display the "Miền Tri Thức" facet group with options "Tất Cả", "Phật Học", "Huyền Học", and "Đông Y Học"
    And it must display the "Nguồn Cấu Trúc" facet group with options "Tất Cả Nguồn", "Từ Điển", "Ma Trận", and "Kho Đông Y"

  Scenario: 2. Facet chips display dynamically computed runtime counts
    Given the Multilingual Lexicon is loaded without search query
    When inspecting facet count badges
    Then the "Tất Cả" domain chip must display "(241)"
    And the "Phật Học" domain chip must display "(154)"
    And the "Huyền Học" domain chip must display "(73)"
    And the "Đông Y Học" domain chip must display "(14)"
    And the "Từ Điển" source chip must display "(19)"
    And the "Ma Trận" source chip must display "(208)"
    And the "Kho Đông Y" source chip must display "(14)"

  Scenario: 3. Filtering by Domain isolates domain-specific entries
    Given the user is on the Multilingual Lexicon view
    When clicking the "Đông Y Học" domain facet chip
    Then the list must display exactly 14 Traditional Chinese Medicine entries
    And all displayed items must have domain "y-hoc-co-truyen"

  Scenario: 4. Filtering by Source Type isolates source-specific entries
    Given the user is on the Multilingual Lexicon view
    When clicking the "Từ Điển" source facet chip
    Then the list must display exactly 19 standalone Lexicon entries with "sourceType = lexicon"
    And no System Node or TCM entries must be displayed

  Scenario: 5. Conditional TCM subcategory facet group appears only for TCM context
    Given the user is on the Multilingual Lexicon view
    When the active domain is "phat-hoc" or "huyen-hoc"
    Then the TCM subcategory facet group must be hidden
    When the active domain is changed to "y-hoc-co-truyen" or source is "tcm_registry"
    Then the TCM subcategory facet group must appear with "Kinh Huyệt (5)", "Tạng Tượng (5)", and "Dược Tính (4)"

  Scenario: 6. Filtering by TCM subcategory isolates specific Eastern medicine entities
    Given the user is in the TCM domain context
    When clicking the "Kinh Huyệt" subcategory chip
    Then the list must display exactly 5 Acupoint entries (Hợp Cốc, Túc Tam Lý, Bách Hội, Nội Quan, Tam Âm Giao)
    And every displayed item must have category "kinh-huyet" and a valid WHO meridian code

  Scenario: 7. Search query combines with Domain facet via AND intersection
    Given the user enters the search query "Tâm Tạng"
    When selecting the "Đông Y Học" domain facet
    Then the list must display "Tâm Tạng" (Heart Organ)
    When switching the search query to "Citta" and domain facet to "Phật Học"
    Then the top result in the list must be "Citta" (lex-pali-citta)

  Scenario: 8. Search query combines with Source Type facet via AND intersection
    Given the user enters the search query "Càn"
    When selecting the "Từ Điển" source facet
    Then the list must display the standalone lexical definition of Qian
    When selecting the "Ma Trận" source facet
    Then the list must display the Hexagram system nodes for Qian

  Scenario: 9. Reset button restores default unfiltered state
    Given active filters are applied (e.g. search query "Nhân Sâm" and domain "Đông Y Học")
    When clicking the "Đặt lại bộ lọc" button
    Then the search input must be cleared
    And all facet groups must reset to "Tất Cả"
    And the list must display the full catalog of 241 entries

  Scenario: 10. Facet toolbar satisfies accessibility standards
    Given the multi-facet filtering toolbar
    When inspected for accessibility attributes
    Then each facet group must have role="group" and an aria-label
    And each active facet button must have aria-pressed="true"
    And each inactive facet button must have aria-pressed="false"
    And all interactive buttons must be navigable via Tab keyboard focus
