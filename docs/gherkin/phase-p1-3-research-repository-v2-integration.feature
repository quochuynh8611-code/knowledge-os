# language: en
Feature: Phase P1.3 — ResearchRepositoryV2 Adapter Integration in DataContext
  As a knowledge researcher
  I want multi-topic notes and storage operations to flow transparently through ResearchRepositoryV2
  So that multi-topic relations are backward compatible and all repository contracts are fulfilled

  Background:
    Given the DataContext is initialized with ResearchRepositoryV2 wrapping the base repository
    And the application maintains dual-tier persistence (API with LocalStorage fallback)

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Multi-Topic Note Addition Normalizes Primary FK
  # ─────────────────────────────────────────────────────────────
  Scenario: Adding a note with multiple topicIds sets primary topicId to topicIds[0]
    When a user adds a note with title "Tâm Sở Biến Hành" and topicIds ["topic-abhidharma", "topic-citta"]
    Then the created note in DataContext state has topicId "topic-abhidharma"
    And the note is saved to repository with topicId "topic-abhidharma" and topicIds ["topic-abhidharma", "topic-citta"]

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Single-Topic Note Preserves Original topicId
  # ─────────────────────────────────────────────────────────────
  Scenario: Adding a traditional single-topic note preserves topicId unmodified
    When a user adds a note with title "Tứ Niệm Xứ Căn Bản" and topicId "topic-satipatthana" without topicIds
    Then the note is saved to repository with topicId "topic-satipatthana"
    And backward compatibility is preserved

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Updating Multi-Topic Note Synchronizes Primary FK
  # ─────────────────────────────────────────────────────────────
  Scenario: Updating a note to new topicIds updates primary topicId to the new first topic
    Given an existing note "N-1" with topicId "topic-A"
    When the note is updated with topicIds ["topic-B", "topic-C"]
    Then the updated note has topicId "topic-B" in both state and repository

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Storage Reset Delegates Through Entire Chain
  # ─────────────────────────────────────────────────────────────
  Scenario: Resetting all data delegates through ResearchRepositoryV2 to the underlying storage
    When resetToDefaultData is triggered on DataContext
    Then resetAllData is executed on the base repository without errors
    And all storage keys are cleared cleanly
