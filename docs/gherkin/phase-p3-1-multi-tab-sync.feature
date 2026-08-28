# language: en
Feature: Phase P3.1 — Multi-Tab Sync Queue Synchronization
  As a knowledge researcher working across multiple browser tabs
  I want the sync queue and telemetry state to stay synchronized in real time
  So that changes made in one tab are immediately visible in all other tabs

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Cross-tab queue mutation sync
  # ─────────────────────────────────────────────────────────────
  Scenario: Tab B updates queue reactively when Tab A enqueues a mutation
    Given Tab A and Tab B are open on the same application origin
    When Tab A enqueues a new mutation into the sync queue
    Then Tab B receives a storage event for the sync queue
    And Tab B updates its queue list and pending count without a page reload

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Cross-tab telemetry log sync
  # ─────────────────────────────────────────────────────────────
  Scenario: Tab B updates telemetry stats when Tab A records sync events
    Given Tab A records a telemetry event in storage
    When Tab B receives the storage event for telemetry
    Then Tab B recalculates its sync telemetry stats and health status reactively

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Pre-replay existence guard against concurrent flushes
  # ─────────────────────────────────────────────────────────────
  Scenario: Tab B skips mutations already synced and dequeued by Tab A
    Given a pending mutation exists in the queue
    And Tab A flushes and dequeues the mutation
    When Tab B executes a concurrent flushQueue
    Then Tab B detects the mutation is no longer in storage
    And Tab B skips redundant HTTP request replay
