# language: en
Feature: Phase P1.5 — Append-Only Knowledge Progress Snapshot Persistence & Audit Trail
  As a knowledge researcher and system auditor
  I want each study progress update or SM-2 review session to automatically record an append-only snapshot
  So that historical progress milestones and retention analytics can be retrieved and analyzed deterministically

  Background:
    Given the PostgreSQL database with models "StudyProgress", "KnowledgeProgressSnapshot", and "Topic"
    And the HTTP API endpoint "/api/study-progress" is operational

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Study Progress Update Creates Append-Only Snapshot
  # ─────────────────────────────────────────────────────────────
  Scenario: Updating study progress atomically inserts an immutable snapshot record
    When a client sends POST request to "/api/study-progress" with payload:
      """
      {
        "topicId": "topic-abhidharma-tong-quan",
        "quality": 4,
        "triggerReason": "review_completed"
      }
      """
    Then the response status is 200
    And the StudyProgress table is updated for "topic-abhidharma-tong-quan"
    And a new record is created in KnowledgeProgressSnapshot table with:
      | topicId        | topic-abhidharma-tong-quan |
      | triggerReason  | review_completed           |
    And the progressData column contains a valid JSON snapshot of the study progress

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Querying Topic Progress Snapshot History
  # ─────────────────────────────────────────────────────────────
  Scenario: Querying topic progress snapshot history returns items in descending chronological order
    Given an existing topic "topic-abhidharma-tong-quan" with 3 historical progress snapshots
    When a client sends GET request to "/api/study-progress/topic-abhidharma-tong-quan/snapshots"
    Then the response status is 200
    And the response body contains a list of 3 snapshot items
    And the items are ordered with the most recent capturedAt timestamp first

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Transaction Rollback on Snapshot Failure
  # ─────────────────────────────────────────────────────────────
  Scenario: Transaction rolls back both study progress and snapshot if either fails
    Given a database state where KnowledgeProgressSnapshot table fails to insert
    When a client sends POST request to "/api/study-progress"
    Then the response status is 500
    And no changes are committed to the StudyProgress table
