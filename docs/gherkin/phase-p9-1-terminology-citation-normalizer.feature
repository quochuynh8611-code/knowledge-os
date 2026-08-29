Feature: Phase P9.1 — Terminology Citation Normalizer & Bridge

  As a scholarly research engineer
  I want to normalize any domain-agnostic TerminologyEntry into a ScholarCitationViewModel
  So that terms from diverse knowledge traditions can be cited seamlessly without compromising existing Scholar Suite features.

  Background:
    Given the Universal Terminology contract is defined in src/types/terminology.ts

  Scenario: Scenario 1 — Normalizing canonical TerminologyEntry with classical catalog citation
    Given a TerminologyEntry in domain "phat-hoc" with PTS reference "Dhs 1-9"
    When normalized with normalizeTerminologyEntry
    Then the resulting ScholarCitationViewModel has sufficiency "canonical_complete"
    And the citationKey is deterministic and prefixed with "phat_hoc"
    And the cslType defaults to "entry-dictionary"

  Scenario: Scenario 2 — Normalizing custom domain TerminologyEntry
    Given a TerminologyEntry in custom domain "y-hoc-co-truyen"
    When normalized with normalizeTerminologyEntry
    Then the resulting ScholarCitationViewModel preserves domain "y-hoc-co-truyen"
    And the citationKey includes "y_hoc_co_truyen" as domain prefix

  Scenario: Scenario 3 — Normalizing stub TerminologyEntry without sources
    Given a TerminologyEntry with no sources and a provenanceNote
    When normalized with normalizeTerminologyEntry
    Then the sufficiency is "internal_note_only"
    And the citationKey is an empty string
    And the provenanceNote is preserved
