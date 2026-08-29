Feature: Phase P8.4 — Citation Reliability Hardening & Export Naming Unification

  As a researcher and developer
  I want robust timer lifecycle management in the citation modal and deterministic, filesystem-safe export filenames
  So that the app operates without memory leaks or race conditions and produces clean files on all operating systems.

  Background:
    Given Scholar Citation Subsystem from Phase P8.3 is active

  Scenario: Scenario 1 — Rapid consecutive copy clicks cleanly reset feedback timer
    Given the ScholarCitationModal is open
    When the user clicks "Sao chép trích dẫn" twice in rapid succession within 500ms
    Then the active timer is reset to the full 2000ms duration
    And no overlapping timer overrides the newer feedback prematurely

  Scenario: Scenario 2 — Timers are cleanly canceled when modal unmounts
    Given the ScholarCitationModal is open and a copy timer is active
    When the modal component unmounts
    Then the feedback timer is cleared immediately
    And no React state update warning occurs

  Scenario: Scenario 3 — Single item citation download uses deterministic safe filename
    Given a citation key with Pali diacritics "kusala_citta_01"
    When generating a single BibTeX export filename
    Then the filename is "kusala_citta_01.bib"
    And special filesystem characters are sanitized

  Scenario: Scenario 4 — Batch export filename cleanly strips diacritics and special characters
    Given an Abhidharma Citta with Pali name "Kāmāvacara Kusala Citta"
    When generating a batch CSL JSON export filename
    Then the filename is "matrix_relations_kamavacara_kusala_citta.json"
    And contains only alphanumeric characters and underscores
