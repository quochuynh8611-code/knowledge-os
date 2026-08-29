Feature: Phase P8.1 — Relational Citation & Matrix Export Engine

  As a scholar and researcher
  I want to generate standardized academic citations (BibTeX, CSL JSON, APA 7, Chicago, MLA 9, Harvard) for cross-axial matrix relations
  So that I can rigorously cite relational associations, conditionings, and cross-domain syntheses in academic publications.

  Background:
    Given the Scholar Citation Engine baseline from Phase P8.0 is active
    And LaTeX escaping and Unicode preservation rules are in effect

  Scenario: Scenario 1 — Canonical relation is citation-capable
    Given a MatrixRelation "rel-c01-cet01" with valid sources from "Abhidhammattha-saṅgaha"
    And rowNodeId is "sys-citta-01" (Tâm Tham 1)
    And colNodeId is "sys-cetasika-01" (Tâm sở Xúc)
    And relationType is "associates"
    When normalize MatrixRelation into ScholarCitationViewModel
    Then the citation view model is generated deterministically
    And "isBlocked" is false
    And the title preserves both row node and column node identities
    And the relation type "associates" is explicitly represented

  Scenario: Scenario 2 — Relation citation key is deterministic
    Given a MatrixRelation "rel-p01-c01" with source "Paṭṭhāna (Bộ Vị Trí)"
    When normalize the relation multiple times
    Then the generated citation key is identical across all runs
    And the key matches the pattern "phat_hoc_rel_sys_patthana_01_sys_citta_01_conditions_*"

  Scenario: Scenario 3 — Directed relation avoids collision
    Given a directed relation A -> B from "sys-citta-01" to "sys-cetasika-01"
    And a reverse directed relation B -> A from "sys-cetasika-01" to "sys-citta-01"
    When generate citation keys for both relations
    Then the two citation keys are distinct and non-colliding

  Scenario: Scenario 4 — Provenance-only relation is blocked
    Given a MatrixRelation with empty sources array
    And only a provenanceNote "Ghi chú phác thảo chưa có văn bản nguồn"
    When normalize the relation
    Then the sufficiency is "internal_note_only"
    And "isBlocked" is true
    And all citation formatters return null
    And no author or publisher is fabricated

  Scenario: Scenario 5 — Interpretive note is not canonical source
    Given a MatrixRelation having canonicalEvidence "Tâm sở Xúc là 1 trong 7 biến hành..."
    And interpretiveNote "Không thể có tâm tham ái khởi lên mà không có sự xúc chạm..."
    When normalize the relation
    Then canonicalEvidence and interpretiveNote are isolated into distinct metadata fields
    And interpretiveNote is never promoted to primary source title or author

  Scenario: Scenario 6 — Evidence level is preserved
    Given a MatrixRelation with evidenceLevel "scholarly_conjecture"
    When generate CSL JSON or BibTeX citation
    Then the output explicitly annotates the conjecture evidence level
    And the relation is not presented as an undisputed canonical fact

  Scenario: Scenario 7 — BibTeX escaping for complex relational metadata
    Given a MatrixRelation with Unicode Pāli "Hetupaccaya-niddesa § 1" and special chars "&", "%", "_"
    When format BibTeX entry
    Then special LaTeX characters are escaped safely
    And Unicode Pāli diacritics and Hán tự are preserved with 100% fidelity

  Scenario: Scenario 8 — Zero regressions on existing P8.0 atomic citations
    Given existing LexiconEntry "lex-citta" and SystemNode "sys-iching-01"
    When execute the full citation pipeline
    Then all P8.0 outputs remain strictly unchanged
