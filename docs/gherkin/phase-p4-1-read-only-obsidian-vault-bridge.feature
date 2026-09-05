# Feature: Read-Only Obsidian Vault Bridge (Phase P4.1)
# BDD Acceptance Scenarios & Security Safeguards

Feature: Read-Only Obsidian Vault Bridge
  As a researcher using Knowledge OS
  I want to preview local Markdown notes from my Obsidian Vault inside Knowledge OS
  So that I can study my external notes alongside topic progress without editing or duplicating files into PostgreSQL

  Background:
    Given Knowledge OS server is running locally
    And an approved Obsidian Vault root is configured at a temporary test directory
    And Knowledge OS connects to the local PostgreSQL database without schema changes

  # -----------------------------------------------------------------------------
  # Rule 1: Filesystem Security & Path Traversal / Symlink Rejection
  # -----------------------------------------------------------------------------

  Scenario: Reject relative path containing directory traversal sequence
    When a client requests "GET /api/obsidian/vault/file?path=../../etc/passwd"
    Then the server returns HTTP status 403 Forbidden
    And the error code is "PATH_TRAVERSAL_DETECTED"
    And the response body does not reveal the server root or absolute system path

  Scenario: Reject path attempting to access sensitive or hidden directories
    When a client requests "GET /api/obsidian/vault/file?path=.obsidian/workspace.json"
    Then the server returns HTTP status 403 Forbidden
    And the error code is "ACCESS_DENIED_SENSITIVE_DIR"
    And the file content is not read from disk

  Scenario: Reject external symbolic link pointing outside the approved Vault root
    Given an external symbolic link named "Phat-Hoc/external-link.md" inside the Vault points to an external file
    When a client requests "GET /api/obsidian/vault/file?path=Phat-Hoc/external-link.md"
    Then the server detects that the path is a symbolic link via lstat before resolving realpath
    And the server returns HTTP status 403 Forbidden
    And the error code is "SYMLINK_NOT_ALLOWED"
    And the target file content is never read from disk

  Scenario: Reject internal symbolic link pointing inside the Vault
    Given an internal symbolic link named "Phat-Hoc/alias-internal.md" points to a valid file "Phat-Hoc/Target.md" inside the Vault
    When a client requests "GET /api/obsidian/vault/file?path=Phat-Hoc/alias-internal.md"
    Then the server rejects the symbolic link immediately
    And the server returns HTTP status 403 Forbidden
    And the error code is "SYMLINK_NOT_ALLOWED"

  Scenario: Accept regular Markdown file that is not a symbolic link
    Given a regular Markdown file "Phat-Hoc/Regular.md" exists in the Vault
    When a client requests "GET /api/obsidian/vault/file?path=Phat-Hoc/Regular.md"
    Then the server verifies via lstat that it is not a symbolic link and is a regular file
    And the server returns HTTP status 200 OK
    And the response relativePath is "Phat-Hoc/Regular.md"

  Scenario: Reject path with prefix boundary collision
    Given a sibling folder exists adjacent to the Vault root
    When a client crafts a path attempting to resolve into the sibling directory
    Then the path containment check detects a boundary escape
    And the server returns HTTP status 403 Forbidden

  Scenario: Reject file with forbidden extension
    When a client requests "GET /api/obsidian/vault/file?path=Attachments/diagram.pdf"
    Then the server returns HTTP status 403 Forbidden
    And the error code is "FORBIDDEN_EXTENSION"

  # -----------------------------------------------------------------------------
  # Rule 2: Operational Bounds & Memory Safety
  # -----------------------------------------------------------------------------

  Scenario: File exceeding MAX_MARKDOWN_BYTES is rejected without reading into memory
    Given a valid Markdown file "Phat-Hoc/Huge-Corpus.md" exists in the Vault
    And its file size is 3,145,728 bytes which exceeds the 2,097,152 bytes limit
    When a client requests "GET /api/obsidian/vault/file?path=Phat-Hoc/Huge-Corpus.md"
    Then the server inspects the lstat file size before reading the file body
    And the server returns HTTP status 413 Payload Too Large
    And the error code is "FILE_TOO_LARGE"
    And the response includes "maxAllowedBytes" of 2097152 and the actual "sizeBytes"
    And the file content string is not loaded into Node.js heap memory

  Scenario: Vault status check does not perform recursive deep scanning
    When a client requests "GET /api/obsidian/vault/status"
    Then the server verifies Vault directory existence and read permissions
    And the server returns HTTP status 200 OK
    And the response time is within 50 milliseconds
    And no recursive filesystem walk is initiated

  # -----------------------------------------------------------------------------
  # Rule 3: Read-Only Preview, Frontmatter & Outline Extraction
  # -----------------------------------------------------------------------------

  Scenario: Successfully read and parse a valid Markdown note with frontmatter and outline
    Given a valid file "Phat-Hoc/Bat-Chanh-Dao.md" exists inside the Vault
    And the file has YAML frontmatter with "title: Bát Chánh Đạo" and "tags: [phat-hoc, dao-de]"
    And the file body contains headings "# Bát Chánh Đạo Toàn Thư" and "## 1. Chánh Kiến"
    When a client requests "GET /api/obsidian/vault/file?path=Phat-Hoc/Bat-Chanh-Dao.md"
    Then the server returns HTTP status 200 OK
    And the response JSON contains:
      | field        | value                       |
      | relativePath | Phat-Hoc/Bat-Chanh-Dao.md   |
      | fileName     | Bat-Chanh-Dao.md            |
    And the response "frontmatter.title" equals "Bát Chánh Đạo"
    And the response "outline" contains an entry with level 1 and text "Bát Chánh Đạo Toàn Thư"
    And the response "outline" contains an entry with level 2 and text "1. Chánh Kiến"
    And the response content contains the uncorrupted Markdown body

  Scenario: Manual refresh retrieves current disk content without modifying file metadata
    Given a linked Obsidian document "Phat-Hoc/Bat-Chanh-Dao.md"
    When the user clicks "Làm mới từ Vault" in the Knowledge OS UI
    Then a GET request is sent to the server for that relative path
    And the UI updates with the latest file content from disk
    And the file modified time (mtime) on the filesystem remains completely unchanged

  # -----------------------------------------------------------------------------
  # Rule 4: Data Mapping, Persistence & Unlink Invariants
  # -----------------------------------------------------------------------------

  Scenario: Linking an Obsidian document reuses the Resource model without database migration
    Given a Topic exists with ID "topic-vi-dieu-phap"
    When the user links the Obsidian note "Phat-Hoc/Vi-Dieu-Phap.md" to the topic
    Then a preflight validation request "GET /api/obsidian/vault/file?path=Phat-Hoc%2FVi-Dieu-Phap.md" succeeds with 200 OK
    And a record is saved in the "Resource" table with:
      | field    | value                     |
      | topicId  | topic-vi-dieu-phap        |
      | type     | md                        |
      | filePath | Phat-Hoc/Vi-Dieu-Phap.md  |
    And no modifications are made to "prisma/schema.prisma"
    And the full Markdown body is not stored in the database

  Scenario: Preflight validation fails when file is not found or violates security rules
    Given a Topic exists with ID "topic-vi-dieu-phap"
    When the user enters invalid relative path "NonExistent/Missing.md"
    Then the preflight validation returns 404 Not Found
    And no Resource record is created in the database
    And the UI displays a clear inline error message without showing server absolute paths

  Scenario: Unlinking a document removes reference metadata but preserves the physical file
    Given an Obsidian document "Phat-Hoc/Vi-Dieu-Phap.md" is linked as a Resource
    When the user clicks "Hủy liên kết" in Knowledge OS
    And confirms the unlink dialog
    Then the Resource record is deleted from PostgreSQL
    And the physical file "Phat-Hoc/Vi-Dieu-Phap.md" remains intact in the Obsidian Vault
    And no Obsidian Vault write or delete API is invoked

  # -----------------------------------------------------------------------------
  # Rule 5: Error Resilience & Moved/Deleted File Handling
  # -----------------------------------------------------------------------------

  Scenario: File deleted or moved in Obsidian returns FILE_NOT_FOUND without deleting metadata
    Given an Obsidian document "Phat-Hoc/Old-Note.md" was linked as a Resource
    And the file was subsequently deleted or moved by the user in the Obsidian app
    When the user views the topic linked to this note in Knowledge OS
    And the server requests "GET /api/obsidian/vault/file?path=Phat-Hoc/Old-Note.md"
    Then the server returns HTTP status 404 Not Found
    And the error code is "FILE_NOT_FOUND"
    And Knowledge OS does not delete the Resource record automatically
    And the UI renders a warning banner explaining that the file was moved or deleted
    And the UI provides options to "Mở Obsidian" or "Hủy liên kết"

  Scenario: Error response masks absolute paths
    When a file reading error occurs for path "Phat-Hoc/Non-Existent.md"
    Then the response message must not include the system root or user home directory
    And the response JSON only refers to the relative path "Phat-Hoc/Non-Existent.md"

  # -----------------------------------------------------------------------------
  # Rule 6: Markdown Rendering Security
  # -----------------------------------------------------------------------------

  Scenario: Raw HTML script tags and dangerous attributes are neutralized
    Given an Obsidian file contains "<script>alert('xss')</script>" and "<img src=x onerror=alert(1)>"
    When the document is previewed in the Knowledge OS reader
    Then no script element is executed or mounted in the DOM
    And the onerror handler is stripped or neutralized
    And the safe text is rendered without security compromise

  # -----------------------------------------------------------------------------
  # Rule 7: Scope Boundary Invariants (P4.1 vs P4.2)
  # -----------------------------------------------------------------------------

  Scenario: Direct Note linking is out-of-scope for P4.1
    When a user attempts to link an Obsidian file directly to a Knowledge OS Note
    Then the system indicates that direct Note linking is scheduled for Phase P4.2
    And the user is guided to link the Obsidian file at the Topic level in P4.1
