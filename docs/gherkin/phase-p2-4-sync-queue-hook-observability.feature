# language: en
Feature: Phase P2.4 — Sync Queue Observability and useSyncQueue Hook
  As a knowledge researcher using Knowledge OS
  I want to observe the real-time status of pending and failed offline mutations
  So that I have visibility into sync progress and can manually trigger a retry when online

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Reactive Subscription on SyncQueueService
  # ─────────────────────────────────────────────────────────────
  Scenario: SyncQueueService notifies subscribers on mutation enqueue and dequeue
    Given a subscriber is registered on the SyncQueueService
    When a new mutation is enqueued
    Then the subscriber is notified of the queue change
    When the mutation is dequeued
    Then the subscriber is notified again

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: useSyncQueue Hook Real-Time Reactivity
  # ─────────────────────────────────────────────────────────────
  Scenario: useSyncQueue hook reflects pending count, failed count, and online status
    Given the useSyncQueue hook is mounted in a React component
    When mutations are enqueued while offline
    Then the hook returns updated pendingCount and isOnline false
    When the network comes online and flush is triggered
    Then the hook sets isFlushing true during replay and reflects pendingCount 0 upon completion
