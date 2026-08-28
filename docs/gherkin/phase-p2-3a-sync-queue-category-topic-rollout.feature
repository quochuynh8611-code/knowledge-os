# language: en
Feature: Phase P2.3a — Offline Sync Queue for Categories and Topics
  As a knowledge researcher
  I want my offline creations and deletions of categories and topics to be queued persistently
  So that when network connectivity is restored, taxonomy structure is automatically synced to the server

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Category and Topic Offline Mutation Enqueueing
  # ─────────────────────────────────────────────────────────────
  Scenario: Saving categories and topics while offline queues mutations
    Given the network is offline
    When the user creates category "cat-abhidharma"
    And the user creates topic "topic-paramattha" under category "cat-abhidharma"
    Then the category save mutation is enqueued with status "pending"
    And the topic save mutation is enqueued with status "pending"
    And local storage contains optimistic updates for both entities

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Deleting Category and Topic while Offline
  # ─────────────────────────────────────────────────────────────
  Scenario: Deleting category or topic while offline enqueues delete mutations
    Given the network is offline
    When the user deletes topic "topic-old-draft"
    And the user deletes category "cat-deprecated"
    Then topic delete mutation is enqueued
    And category delete mutation is enqueued

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: FIFO Replay of Category and Topic Mutations
  # ─────────────────────────────────────────────────────────────
  Scenario: Reconnection replays category and topic mutations in order
    Given the sync queue contains pending mutations for category and topic
    When the network reconnects and triggers flushQueue
    Then the sync queue sends POST /api/categories followed by POST /api/topics
    And all successful category and topic mutations are cleared from the queue
