# language: en
Feature: Phase P1.4 — Multi-Topic Note Relational Synchronization & Note SourcePath Persistence
  As a knowledge researcher and system developer
  I want note creation and updates to atomically persist both sourcePath and multi-topic relations in NoteTopicLink
  So that notes linked to multiple topics are discoverable in both SQL joins and client state without data drift

  Background:
    Given the PostgreSQL database with schema containing models "Note", "Topic", and "NoteTopicLink"
    And the HTTP API endpoint "/api/notes" is operational

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Note Creation with topicIds and sourcePath
  # ─────────────────────────────────────────────────────────────
  Scenario: Creating a multi-topic note populates NoteTopicLink and preserves sourcePath
    When a client sends POST request to "/api/notes" with payload:
      """
      {
        "title": "Tâm Sở Biến Hành Trong Nhất Thiết Pháp",
        "content": "Nội dung phân tích 7 tâm sở biến hành",
        "topicId": "topic-abhidharma",
        "topicIds": ["topic-abhidharma", "topic-citta", "topic-cetana"],
        "sourcePath": "/Vault/Notes/tam-so-bien-hanh.md",
        "type": "insight"
      }
      """
    Then the response status is 201
    And the created Note record has topicId "topic-abhidharma"
    And the created Note record has sourcePath "/Vault/Notes/tam-so-bien-hanh.md"
    And the NoteTopicLink table contains 3 relational records for this note linking to all 3 topics

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Note Update Prunes Obsolete NoteTopicLink Records
  # ─────────────────────────────────────────────────────────────
  Scenario: Updating a note's topicIds updates relations and prunes removed links
    Given an existing Note "N-100" linked to ["topic-A", "topic-B"]
    When a client sends PUT request to "/api/notes/N-100" with payload:
      """
      {
        "topicIds": ["topic-A", "topic-C"]
      }
      """
    Then the response status is 200
    And the Note record "N-100" has primary topicId "topic-A"
    And the NoteTopicLink link between "N-100" and "topic-B" is removed
    And a new NoteTopicLink link between "N-100" and "topic-C" is created
    And the NoteTopicLink link between "N-100" and "topic-A" is preserved

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Single-Topic Note Backward Compatibility
  # ─────────────────────────────────────────────────────────────
  Scenario: Creating a single-topic note without topicIds creates primary link
    When a client sends POST request to "/api/notes" with payload:
      """
      {
        "title": "Tứ Niệm Xứ Căn Bản",
        "content": "Quán thân, thọ, tâm, pháp",
        "topicId": "topic-satipatthana",
        "type": "study"
      }
      """
    Then the response status is 201
    And the Note record has topicId "topic-satipatthana"
    And the NoteTopicLink table contains 1 relational record linking this note to "topic-satipatthana"

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Hydration Sync Persists Multi-Topic Links and sourcePath
  # ─────────────────────────────────────────────────────────────
  Scenario: Batch hydration sync persists sourcePath and establishes NoteTopicLink records
    When a client sends POST request to "/api/sync/hydrate" with notes containing sourcePath and topicIds
    Then all notes in database have their sourcePath preserved
    And all NoteTopicLink records are established atomically
