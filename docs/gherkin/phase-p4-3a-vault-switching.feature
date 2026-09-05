# Feature: Safe Obsidian Vault Switching (Phase P4.3A)
# BDD Acceptance Scenarios & Security Safeguards

Feature: Safe Obsidian Vault Switching
  As a researcher using Knowledge OS
  I want to switch the active Obsidian Vault using an explicit managed profile identifier
  So that I can access separate knowledge collections without risking directory traversal or corrupting active runtime services

  Background:
    Given Knowledge OS server is running in local single-user mode
    And an explicit managed Vault profile registry contains:
      | vaultId         | label               |
      | primary-vault   | Primary Research    |
      | secondary-vault | Secondary Research  |
      | damaged-vault   | Inaccessible Target |
    And the initial active vaultId is "primary-vault"

  # -----------------------------------------------------------------------------
  # Rule 1: Identification & Path Isolation
  # -----------------------------------------------------------------------------

  Scenario: Keep raw filesystem paths out of all responses
    When a client requests "GET /api/obsidian/vaults"
    Then the server returns HTTP status 200 OK
    And the response field "activeVaultId" is "primary-vault"
    And each item in the "vaults" list contains only "vaultId", "label", and "isCurrent"
    And raw filesystem paths are absent from all response fields

  Scenario: Reject an unknown vaultId without changing the active Vault
    When a client sends a switch request with payload:
      """
      {
        "vaultId": "unknown-target"
      }
      """
    Then the server returns HTTP status 404 Not Found
    And the active Vault remains "primary-vault"

  Scenario: Reject an inaccessible configured root without changing the active Vault
    When a client sends a switch request with payload:
      """
      {
        "vaultId": "damaged-vault"
      }
      """
    Then the server detects that the configured root is inaccessible
    And the server returns HTTP status 500 Internal Server Error
    And the active Vault remains "primary-vault"

  # -----------------------------------------------------------------------------
  # Rule 2: Validated Profile Switching & Lock Serialization
  # -----------------------------------------------------------------------------

  Scenario: Switch to a validated managed Vault profile
    When a client sends a switch request with payload:
      """
      {
        "vaultId": "secondary-vault"
      }
      """
    Then the server returns HTTP status 200 OK
    And the response field "success" is true
    And the response field "activeVaultId" is "secondary-vault"
    And subsequent requests to "GET /api/obsidian/vault/status" report activeVaultId "secondary-vault"

  Scenario: Serialize concurrent switch requests
    When two switch requests for different vaultId values arrive simultaneously
    Then the server processes them under a serialized switch lock
    And the second request receives HTTP status 409 Conflict or waits for the lock to release
    And server state remains consistent without race conditions

  # -----------------------------------------------------------------------------
  # Rule 3: Candidate Preparation & Failure Rollback
  # -----------------------------------------------------------------------------

  Scenario: Keep the current Vault active when candidate preparation fails
    Given a managed profile whose candidate index preparation encounters a read fault
    When a client sends a switch request for that profile
    Then candidate preparation fails before active reference assignment
    And candidate temporary resources are disposed
    And the server retains the currently active Vault, watcher, and index unchanged
    And the server returns HTTP status 500 Internal Server Error

  # -----------------------------------------------------------------------------
  # Rule 4: Stale State Prevention & Read-Only Safety
  # -----------------------------------------------------------------------------

  Scenario: Prevent stale Viewer reads after a successful switch
    Given the Document Viewer is displaying a file from "primary-vault"
    When the active vaultId is switched to "secondary-vault"
    Then the Document Viewer is closed or marked stale
    And the Document Viewer does not fetch the previous relative path from the newly active Vault
    And file tree and search result caches are reset

  Scenario: Preserve the read-only boundary
    When any vault switch request is processed
    Then no files or directories are created, modified, or deleted within either Vault
    And both Vault directories remain strictly read-only
