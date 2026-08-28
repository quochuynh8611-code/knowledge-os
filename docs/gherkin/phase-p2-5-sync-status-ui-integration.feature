# language: en
Feature: Phase P2.5 — Sync Queue Status Indicator in Navbar
  As a knowledge researcher
  I want to see the sync and network status badge in the top navigation bar
  So that I know when my mutations are synced and can trigger a retry if needed

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Sync Status Badge States
  # ─────────────────────────────────────────────────────────────
  Scenario: Badge shows synced, offline, flushing, or failed status accurately
    Given the SyncStatusBadge is rendered
    When the network is online and queue has 0 pending items
    Then the badge displays the synced indicator
    When the network goes offline with 2 pending mutations
    Then the badge displays the offline indicator with count 2
    When the user clicks retry while online
    Then the badge displays the flushing state with spinner animation

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Navbar Global Integration
  # ─────────────────────────────────────────────────────────────
  Scenario: Navbar contains the SyncStatusBadge across the application
    Given the Navbar component is mounted
    Then the SyncStatusBadge is visible next to system utility controls
