# Specification: Phase 25 UX Polish & Product Experience

## Feature: Artifact synchronization status

  As a researcher using NotebookLM Studio
  I want to see the exact synchronization state of each research artifact
  So that I know whether my artifacts are safely saved on the server or pending local sync

  Scenario: Artifact sync succeeds
    Given a pending NotebookLM artifact in local locker
    When synchronization completes successfully
    Then the artifact status badge shows "Synced"
    And the UI shows the last synchronized time
    And the retry button is hidden

  Scenario: Artifact sync fails
    Given a pending NotebookLM artifact in local locker
    When synchronization to backend fails due to network or server error
    Then the artifact status badge shows "Failed"
    And the UI shows an error hint
    And the UI presents a safe "Thử lại đồng bộ" retry button

  Scenario: Artifact sync is in progress
    Given a pending NotebookLM artifact in local locker
    When the user clicks "Thử lại đồng bộ"
    Then the artifact status badge shows "Retrying"
    And the retry button is disabled with a loading indicator

  Scenario: Duplicate artifact is recognized
    Given an artifact with an existing idempotency key on the backend
    When synchronization is retried or submitted
    Then no duplicate artifact is created in database
    And the backend returns isDuplicate=true
    And the UI status badge displays "Already synchronized"
    And a subtle notification informs the user that the existing artifact was preserved

---

## Feature: Flashcard creation feedback

  As a learner generating flashcards from MindMap or research notes
  I want unambiguous feedback when creating a card
  So that I never wonder if my card was saved or accidentally duplicated

  Scenario: New flashcard is created
    Given a valid flashcard payload with a unique idempotency key
    When the user submits the form or generates a card from a MindMap node
    Then the UI transitions to "Creating" state
    And when the server responds with 201 Created
    Then the UI displays "Flashcard created" ("Đã tạo thẻ ôn tập thành công!")
    And the flashcard appears in the review queue and card list

  Scenario: Duplicate flashcard submission is recognized
    Given a flashcard with the same idempotency key already exists on the backend
    When the user submits the form again or double-clicks the node action
    Then no duplicate flashcard is created in database
    And the backend/service recovers the existing flashcard via idempotency key
    Then the UI displays "Flashcard already exists" ("Thẻ này đã tồn tại, không tạo trùng")
    And the drawer or modal reflects the existing flashcard details

  Scenario: Flashcard creation fails
    Given a flashcard payload that causes a network or validation failure
    When the user submits the card
    Then the UI transitions to "Failed"
    And the UI displays an actionable error message
    And the user input is preserved in the form without data loss

---

## Feature: MindMap empty state & onboarding

  As a student opening the MindMap view
  I want an intuitive, actionable empty state with minimal onboarding
  So that I know how to create my first mindmap immediately without reading lengthy tutorials

  Scenario: No mindmap exists
    Given the user opens MindMap view with zero topics or no mindmap document
    Then the UI shows a clear, welcoming empty state illustration
    And the UI displays one primary call-to-action button "Tạo sơ đồ đầu tiên"
    And the UI displays a secondary action "Nhập Outline Markdown / NotebookLM"
    And the UI offers 3 concise onboarding quick-tips (Thêm nút con: Tab; Thêm nhánh ngang: Enter; Đổi tên: F2)

  Scenario: MindMap document exists but has only root node
    Given a mindmap with only the root topic node
    Then the canvas displays a contextual helper badge below the root: "Bấm Tab để thêm nút con đầu tiên"
    And when the user presses Tab or clicks "+", the helper dismisses

---

## Feature: MindMap keyboard shortcut overlay

  As a power user navigating MindMap
  I want to view the list of implemented keyboard shortcuts on demand
  So that I can learn and use fast navigation without leaving the canvas

  Scenario: User opens shortcut overlay
    Given the user is on the MindMap canvas
    When the user presses "?" or clicks the "Phím tắt" button on the toolbar
    Then an accessible modal or overlay opens displaying only implemented shortcuts:
      | Action | Shortcut |
      | Thêm nút con | Tab / Insert |
      | Thêm nút ngang hàng | Enter |
      | Đổi tên nút | F2 |
      | Xóa nút đã chọn | Delete / Backspace |
      | Thu gọn / Mở rộng | Space |
      | Xem nhanh nội dung | Shift + Space |
      | Mở rộng AI | Shift + A |
      | Điều hướng | Phím mũi tên (↑ ↓ ← →) |
      | Chọn tất cả nút | Cmd + A / Ctrl + A |
      | Hoàn tác / Làm lại | Cmd+Z / Cmd+Shift+Z |
      | Trở về nút gốc | Home |
      | Hủy chọn / Đóng | Escape |
    And the overlay does not display any unimplemented or invented shortcuts

  Scenario: User closes shortcut overlay
    Given the shortcut overlay is open
    When the user presses Escape or clicks the close button
    Then the overlay closes
    And keyboard focus returns cleanly to the MindMap canvas

---

## Feature: Backup restore safety

  As an administrator or researcher managing backups
  I want clear warnings and verification before performing destructive data restores
  So that I never accidentally overwrite production or research data

  Scenario: User attempts a destructive replace restore
    Given the user uploads a valid backup snapshot in Export/Import modal
    When the user selects the "Thay Thế Toàn Bộ (Replace)" mode
    Then the UI displays an explicit destructive warning with ShieldAlert icon
    And the UI runs an in-memory restore drill showing the exact entity diff
    And the "Thực Hiện Thay Thế Dữ Liệu" button is disabled until the user enters "XÁC NHẬN THAY THẾ"
    And an automated Pre-Restore safety snapshot is taken before executing

  Scenario: User attempts to restore an auto-backup snapshot
    Given the user is viewing the Auto-Backup snapshot history list
    When the user clicks the "Khôi phục" button for a specific snapshot
    Then the UI prompts with a confirmation dialog: "Khôi phục bản sao lưu này sẽ thay thế dữ liệu không gian làm việc hiện tại. Bạn có chắc chắn muốn tiếp tục?"
    And only upon explicit user confirmation does the restore proceed
    And the UI displays the snapshot timestamp, entity count, and fingerprint

