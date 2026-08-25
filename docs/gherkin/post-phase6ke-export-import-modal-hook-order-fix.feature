Feature: Phase 6k.e — Rules of Hooks Consistency in ExportImportModal
  As an application user
  I want the Export / Backup modal to open smoothly without hook-order crashes
  So that I can safely backup and manage knowledge data without application disruption

  Background:
    Given the ExportImportModal component has 23 React hooks
    And all hooks must execute unconditionally in identical order on every render cycle

  # ---------------------------------------------------------------------------
  # 1. Hook count invariant across isOpen transition (false -> true -> false)
  # ---------------------------------------------------------------------------
  Scenario: Modal toggles between closed and open states without hook count mismatch
    Given the ExportImportModal is initially rendered with isOpen = false
    When the modal is re-rendered with isOpen = true
    Then React should not detect any hook order violation
    And no "Rendered more hooks than during the previous render" error should be thrown
    And the modal content should be displayed in the DOM
    When the modal is re-rendered with isOpen = false
    Then no error should be thrown
    And the modal content should be unmounted or hidden

  # ---------------------------------------------------------------------------
  # 2. Navbar Export button click flow
  # ---------------------------------------------------------------------------
  Scenario: Clicking the Export / Backup button in Navbar renders ExportImportModal safely
    Given the Navbar is mounted with all sibling modals closed
    When the user clicks the "Sao lưu / Xuất dữ liệu" button
    Then the ExportImportModal should transition to open
    And the AppErrorBoundary should remain inactive
    And the modal title "Quản Lý & Sao Lưu Dữ Liệu" should be visible
