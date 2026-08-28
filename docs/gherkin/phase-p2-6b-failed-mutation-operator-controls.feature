# language: en
Feature: Phase P2.6b — Failed Mutation Operator Controls and Poison-Pill Mitigation
  As a knowledge researcher
  I want to selectively discard failed mutations with confirmation
  So that a permanently failing mutation does not block the sync of valid pending items behind it

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Only failed mutations display discard action
  # ─────────────────────────────────────────────────────────────
  Scenario: Pending mutations do not display discard action while failed mutations do
    Given the sync queue contains a pending mutation and a failed mutation
    When the user opens the sync queue popover
    Then the pending mutation does not have a discard button
    And the failed mutation displays a discard button

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Discard confirmation and cancellation
  # ─────────────────────────────────────────────────────────────
  Scenario: User initiates discard but cancels
    Given the sync queue popover is open with a failed mutation
    When the user clicks the discard button on the failed mutation
    Then the confirmation controls "Xác nhận bỏ qua" and "Hủy" are displayed
    When the user clicks "Hủy"
    Then the mutation remains in the sync queue

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Confirm discard removes failed mutation and preserves order
  # ─────────────────────────────────────────────────────────────
  Scenario: User confirms discard of a failed mutation
    Given the sync queue contains item A (pending), item B (failed), and item C (pending)
    When the user confirms discard of item B
    Then item B is removed from the sync queue
    And the queue maintains exact relative FIFO order: item A followed by item C
