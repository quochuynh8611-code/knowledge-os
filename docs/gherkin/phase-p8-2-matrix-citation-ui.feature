Feature: Phase P8.2 — Matrix Citation UI & Batch Export Surfaces

  As a researcher exploring the Abhidharma and Divination matrices
  I want to view associated matrix relations and trigger scholarly citations for both nodes and relations directly from the UI
  So that I can study and cite multi-axial dependencies without leaving my research context.

  Background:
    Given the Scholar Citation Engine and Matrix Adapter from Phase P8.1 are active
    And ScholarCitationModal is available

  Scenario: Scenario 1 — Node citation action in AbhidharmaMatrix
    Given the user is viewing AbhidharmaMatrix
    And "Tâm Tham 1" is selected
    When the user clicks the "Trích Dẫn Tâm" button
    Then the ScholarCitationModal opens with the Citta SystemNode
    And 6 citation formats are available

  Scenario: Scenario 2 — Relational citation action in AbhidharmaMatrix
    Given the user is viewing AbhidharmaMatrix
    And "Tâm Tham 1" is selected
    And the associated relation "Tâm Tham 1 -> Tâm sở Xúc" is displayed
    When the user clicks the "Trích dẫn" button on the relation card
    Then the ScholarCitationModal opens with the MatrixRelation
    And the title reflects the directional association

  Scenario: Scenario 3 — Node and cross-domain relation citation in DivinationMatrix
    Given the user is viewing DivinationMatrix in I Ching tab
    And "Quẻ Thuần Càn" is selected
    When the user clicks the "Trích Dẫn Quẻ" button
    Then the ScholarCitationModal opens with the I Ching SystemNode
    And when the user clicks the "Trích dẫn đối chiếu" button on the synthesis relation card
    Then the ScholarCitationModal opens with the cross-domain MatrixRelation

  Scenario: Scenario 4 — Blocked relation displays anti-hallucination warning
    Given a MatrixRelation without valid sources is rendered
    When the user triggers citation for this blocked relation
    Then the modal displays the internal-note-only warning banner
    And all citation copy and export actions are disabled

  Scenario: Scenario 5 — Batch export of visible matrix relations
    Given multiple valid MatrixRelations for the active Citta node
    When the user clicks "Xuất .bib" or "Xuất .json"
    Then a composite file containing all valid relations is generated
    And any blocked relations are safely omitted from the export

  Scenario: Scenario 6 — Keyboard accessibility and modal dismissal
    Given a citation trigger button in the matrix detail card
    When the user focuses the button and presses Enter
    Then the modal opens properly
    And when the user presses Escape
    Then the modal closes and focus returns cleanly
