# language: en
Feature: Phase P2.3b — Offline Sync Queue for Resources
  As a knowledge researcher
  I want my offline creations and deletions of study resources to be queued persistently
  So that when network connectivity is restored, citations, URLs, and file references are synced to the server

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Resource Offline Mutation Enqueueing
  # ─────────────────────────────────────────────────────────────
  Scenario: Saving and deleting resources while offline queues mutations
    Given the network is offline
    When the user adds a resource "res-abhidharma-guide" for topic "topic-citta-1"
    Then the resource save mutation is enqueued with status "pending"
    When the user deletes a resource "res-old-draft"
    Then the resource delete mutation is enqueued with status "pending"
    And local storage contains optimistic updates for both operations

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Resource FIFO Replay on Reconnection
  # ─────────────────────────────────────────────────────────────
  Scenario: Reconnection replays resource save and delete mutations in order
    Given the sync queue contains pending mutations for resource save and delete
    When the network reconnects and triggers flushQueue
    Then the sync queue sends POST /api/resources followed by DELETE /api/resources/:id
    And all successful resource mutations are cleared from the queue
