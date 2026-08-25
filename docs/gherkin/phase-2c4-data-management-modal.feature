Feature: Phase 2C.4 - Data Management Modal & Confirmation Gate UI
  As an academic researcher managing study data for Buddhism and Esotericism
  I want a robust data management interface with server-authoritative backup export, integrity verification, and confirmation gates
  So that I can safely perform disaster recovery without data corruption or accidental loss.

  Background:
    Given The Knowledge OS application is initialized with dual-tier persistence
    And A canonical dataset with 8 categories, 35 topics, 5 notes, 4 resources, and 12 tags exists

  Scenario: 1. Health badge displays correct server connection status and latency
    Given The database health endpoint reports status "healthy" with latency 14ms
    When The user views the database status in the data management interface
    Then A green health badge with "PostgreSQL Đang Kết Nối" and "14ms" is displayed
    And Polling is scheduled periodically every 30 seconds

  Scenario: 2. Export backup snapshot with server-authoritative checksum
    Given The repository is connected to the server PostgreSQL database
    When The user clicks "Tải Xuống Bản Sao Lưu Máy Chủ (.json)"
    Then A backup snapshot with Semver "2.0.0" and deterministic SHA-256 checksum is downloaded
    And The header counts match categories=8, topics=35, notes=5, resources=4, tags=12

  Scenario: 3. Reject invalid or corrupted snapshot file before submission
    Given The user uploads a snapshot file whose internal data was tampered with
    When The client-side parser validates the file
    Then The state machine transitions to "checksum_invalid"
    And A validation error "SHA-256 Checksum không khớp" is displayed
    And The restore submission button is disabled

  Scenario: 4. Confirmation Gate for destructive Replace Mode
    Given A valid snapshot file is loaded into the modal
    When The user selects the "replace" restore mode
    Then The confirmation input is displayed
    And The replace button remains disabled while confirmation text is empty, lowercase, or has trailing spaces
    When The user types the exact phrase "XÁC NHẬN THAY THẾ"
    Then The replace button is enabled for submission

  Scenario: 5. Restore success triggers automated state rehydration
    Given The user submits a valid restore request in "merge" mode
    When The server responds with HTTP 200 and restoredCounts
    Then The state machine transitions to "success_server" then "rehydrating"
    And "reloadAllData()" is executed to refresh in-memory state
    And The UI transitions to "completed" with a success banner without page reload

  Scenario: 6. Rehydration failure preserves previous in-memory state safely
    Given The server restore operation succeeds
    When The network disconnects during the subsequent "reloadAllData()" step
    Then The state machine transitions to "rehydrate_failed"
    And The previous in-memory topics and notes are preserved intact without data loss
    And An error alert explaining local reload failure is displayed

  Scenario: 7. Unsupported offline repository displays safe notice
    Given The application is running in pure LocalStorage offline fallback mode
    When The user attempts to access server disaster recovery actions
    Then A safe notification explaining that server disaster recovery requires an active connection is shown
    And No local storage keys are corrupted or overwritten
