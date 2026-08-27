# language: en
Feature: Phase P1.2 — Repository Tag Dual-Write Sync
  As a knowledge researcher and system developer
  I want topic tag updates to atomically synchronize both denormalized string arrays and relational TopicTag join tables
  So that knowledge graphs, tag aggregations, and search filters remain 100% consistent without data drift

  Background:
    Given the PostgreSQL database with schema containing models "Topic", "Tag", and "TopicTag"
    And the HTTP API endpoint "/api/topics" is operational

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Topic Creation with Tags Dual-Writes to Tag & TopicTag
  # ─────────────────────────────────────────────────────────────
  Scenario: Creating a topic with tags automatically populates TopicTag records
    When a client sends POST request to "/api/topics" with payload:
      """
      {
        "title": "Bát Chánh Đạo Toàn Thư",
        "categoryId": "cat-phat-hoc",
        "tags": ["Phật Học Nguyên Thủy", "Đạo Đế"]
      }
      """
    Then the response status is 201
    And the created Topic record has tags array ["Phật Học Nguyên Thủy", "Đạo Đế"]
    And the Tag table contains records for "Phật Học Nguyên Thủy" and "Đạo Đế"
    And the TopicTag join table contains 2 relational records linking this topic with both tags
    And each Tag record has count >= 1

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Topic Update Synchronizes Tags and Prunes Obsolete Links
  # ─────────────────────────────────────────────────────────────
  Scenario: Updating a topic removes obsolete TopicTag links and creates new ones
    Given an existing Topic "T-100" with tags ["Phật Học Nguyên Thủy", "Đạo Đế"]
    When a client sends PUT request to "/api/topics/T-100" with payload:
      """
      {
        "tags": ["Phật Học Nguyên Thủy", "Tứ Diệu Đế"]
      }
      """
    Then the response status is 200
    And the Topic record "T-100" has tags array ["Phật Học Nguyên Thủy", "Tứ Diệu Đế"]
    And the TopicTag link between "T-100" and "Đạo Đế" is removed
    And a new TopicTag link between "T-100" and "Tứ Diệu Đế" is created
    And the TopicTag link between "T-100" and "Phật Học Nguyên Thủy" is preserved

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Tag Sanitization and Deduplication
  # ─────────────────────────────────────────────────────────────
  Scenario: Tag inputs with leading/trailing whitespaces and duplicates are sanitized before sync
    When a client sends POST request to "/api/topics" with payload:
      """
      {
        "title": "Đại Niệm Xứ Giảng Giải",
        "categoryId": "cat-phat-hoc",
        "tags": ["  Thiền Định  ", "Thiền Định", "", "   ", "Tứ Niệm Xứ"]
      }
      """
    Then the Topic record stores sanitized tags array ["Thiền Định", "Tứ Niệm Xứ"]
    And exactly 2 TopicTag join records are created for "Thiền Định" and "Tứ Niệm Xứ"

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Atomic Transaction Rollback on Failure
  # ─────────────────────────────────────────────────────────────
  Scenario: Failure during tag sync rolls back topic creation completely
    Given a simulated database failure occurs during Tag record creation
    When a client sends POST request to "/api/topics" with valid payload
    Then the response status is 500
    And no Topic record is created in the database
    And no orphaned TopicTag records exist in the database

  # ─────────────────────────────────────────────────────────────
  # Scenario 5: Hydration Sync Upserts TopicTag Relations
  # ─────────────────────────────────────────────────────────────
  Scenario: Batch hydration sync establishes TopicTag relations atomically
    When a client sends POST request to "/api/sync/hydrate" with 5 topics having tags
    Then all 5 topics have their TopicTag relations populated in the database
    And the sync session completes with success status
