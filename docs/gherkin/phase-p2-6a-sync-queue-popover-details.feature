# language: en
Feature: Phase P2.6a — Sync Queue Read-Only Details Popover
  As a knowledge researcher
  I want to click the SyncStatusBadge to view detailed mutation items and error messages
  So that I understand what is currently queued and what failed without risking accidental data loss

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Open and view queue details popover
  # ─────────────────────────────────────────────────────────────
  Scenario: User clicks SyncStatusBadge and views mutation details
    Given the SyncStatusBadge has 1 pending mutation and 1 failed mutation
    When the user clicks the badge
    Then the queue details popover opens displaying both mutations in FIFO order
    And each item shows entityType, action, status, and timestamp
    And the failed mutation displays its specific error message

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Trigger manual sync from popover
  # ─────────────────────────────────────────────────────────────
  Scenario: User triggers manual sync from the popover
    Given the queue details popover is open while online
    When the user clicks the "Đồng bộ ngay" button
    Then the queue flush is triggered

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Close popover on Escape or Click Outside
  # ─────────────────────────────────────────────────────────────
  Scenario: User closes popover via Escape key
    Given the queue details popover is open
    When the user presses the Escape key
    Then the popover closes
