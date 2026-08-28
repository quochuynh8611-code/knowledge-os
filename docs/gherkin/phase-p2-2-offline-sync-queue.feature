# language: en
Feature: Phase P2.2 — Offline-First Mutation Synchronization Queue
  As a knowledge researcher
  I want my offline changes (topics, notes, resources, categories) to be queued persistently
  So that when my device reconnects to the network, all changes are automatically replayed and synced to the backend database

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Offline Mutation Enqueueing
  # ─────────────────────────────────────────────────────────────
  Scenario: Saving an entity while offline enqueues mutation into persistent queue
    Given the network connection is offline
    When the user creates or updates a note with id "note-offline-1"
    Then the note is saved immediately to local storage
    And a mutation is appended to the persistent sync queue with status "pending"
    And the sync queue count becomes 1

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Mutation Coalescing (Last-Write-Wins)
  # ─────────────────────────────────────────────────────────────
  Scenario: Successive updates to the same entity coalesce into a single pending mutation
    Given a pending save mutation exists for topic "topic-citta"
    When the user updates topic "topic-citta" again while offline
    Then the sync queue coalesces the mutation preserving the latest payload
    And the sync queue count remains 1

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Automatic Flush on Network Reconnection
  # ─────────────────────────────────────────────────────────────
  Scenario: Reconnecting online automatically flushes queued mutations in order
    Given the sync queue contains 2 pending mutations:
      | entityType | entityId | action |
      | topic      | topic-1  | save   |
      | note       | note-1   | save   |
    When the network connection is restored triggering "online" event
    Then the sync queue replays each mutation to the REST API in FIFO order
    And all successful mutations are removed from the sync queue
    And the sync queue becomes empty
