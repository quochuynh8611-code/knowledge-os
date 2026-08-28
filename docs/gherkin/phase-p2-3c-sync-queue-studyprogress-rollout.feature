# language: en
Feature: Phase P2.3c — Offline Sync Queue for Study Progress Review-Event Bridge
  As a knowledge researcher
  I want my offline spaced repetition study reviews to be queued as normalized review events
  So that when network connectivity is restored, review events are replayed with SM2ReviewInputSchema and recorded with triggerReason "offline_replayed"

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Study Progress Review-Event Enqueueing
  # ─────────────────────────────────────────────────────────────
  Scenario: Saving study progress review while offline queues normalized review event
    Given the network is offline
    When the user completes a study session for topic "topic-citta-1"
    Then the studyProgress mutation is enqueued with status "pending"
    And the enqueued payload is normalized to contain topicId, quality, and triggerReason "offline_replayed"
    And local storage contains optimistic state updates for the topic progress

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Study Progress Replay on Reconnection
  # ─────────────────────────────────────────────────────────────
  Scenario: Reconnection replays study progress mutation as SM2 review event
    Given the sync queue contains a pending mutation for study progress
    When the network reconnects and triggers flushQueue
    Then the sync queue sends POST /api/study-progress with SM2ReviewInputSchema format
    And the server records a knowledge progress snapshot with triggerReason "offline_replayed"
    And the study progress mutation is cleared from the queue
