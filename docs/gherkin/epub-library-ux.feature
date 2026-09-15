Feature: EPUB Library commercial UX

  Scenario: Empty EPUB library
    Given the EPUB library contains no EPUB file
    When the user opens "Thư Viện Sách"
    Then the page shows "Thư viện chưa có sách EPUB"
    And the page shows an action to add an EPUB
    And the page does not show ADR or architecture-document text
    And the page does not show a generic document count

  Scenario: EPUB source is explicit
    Given the library is connected to an Obsidian Vault
    When the user opens "Thư Viện Sách"
    Then the source is labeled "Obsidian Vault"
    And the displayed path is sanitized
    And the user can refresh the EPUB list

  Scenario: Add EPUB from supported source
    Given the supported EPUB source is available
    When the user chooses an EPUB file
    Then the file appears in the EPUB library
    And non-EPUB files do not appear

  Scenario: Open EPUB
    Given the EPUB library contains a valid EPUB
    When the user selects the book
    Then the existing EPUB reader opens
    And reading position persistence remains available

  Scenario: Unsupported upload path
    Given direct server upload is not implemented
    When the user tries to add a book
    Then the UI explains the supported source
    And the UI does not pretend that an upload succeeded

  Scenario: Legacy Docs UI is removed
    Given the user opens the library tab
    Then the page does not show "Trung Tâm Tra Cứu Tài Liệu Kiến Trúc"
    And the page does not show "ADR"
    And the page does not show "Kịch bản Gherkin"
    And the page does not show "Đặc tả kỹ thuật"
    And the page does not show "286 Tài liệu trên đĩa"
