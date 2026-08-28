# language: en
Feature: Phase P2.8 — Background Auto-Sync and Network Reconnect Trigger
  As a knowledge researcher
  I want my pending and eligible failed mutations to automatically sync when my network reconnects or cooldown expires
  So that I don't have to manually click the sync button every time

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Auto-sync triggers on network reconnect
  # ─────────────────────────────────────────────────────────────
  Scenario: Coming back online triggers automatic queue flush
    Given there are pending mutations in the sync queue
    And the browser was offline
    When the browser fires the "online" event
    Then the system automatically triggers a debounced queue flush
    And the pending mutations are synced with the server

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Auto-sync on cooldown expiration
  # ─────────────────────────────────────────────────────────────
  Scenario: Cooldown expiration triggers automatic retry
    Given a failed mutation with nextRetryAt set 2 seconds in the future
    And the browser is online
    When 2 seconds elapse and the cooldown expires
    Then the system automatically attempts to replay the mutation

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Prevent duplicate flushes when already flushing
  # ─────────────────────────────────────────────────────────────
  Scenario: Background trigger does not start concurrent flush if already flushing
    Given a flush is currently in progress (isFlushing is true)
    When an "online" event or cooldown timer fires
    Then no concurrent second flush request is initiated
