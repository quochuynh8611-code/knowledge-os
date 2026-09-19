Feature: Open Markdown and PDF files from Obsidian Vault & Safe Clipboard Copying

  Background:
    Given the application is running and Obsidian Vault is configured

  Scenario: Open Markdown file from Obsidian Vault
    Given the Vault browser modal displays a Markdown file "HUONG_DAN_SU_DUNG.md"
    When the user clicks on the Markdown file
    Then the application resolves the file source URL to "/api/obsidian/vault/file?path=HUONG_DAN_SU_DUNG.md"
    And opens the Unified Research Reader in Markdown mode
    And renders the Markdown content in the viewport

  Scenario: Open PDF file from Obsidian Vault
    Given the Vault browser modal displays a PDF file "document.pdf"
    When the user clicks on the PDF file
    Then the application resolves the file source URL to "/api/obsidian/vault/attachment?path=document.pdf"
    And opens the Unified Research Reader in PDF mode
    And renders the PDF embed element with the attachment URL

  Scenario: Open EPUB file from Obsidian Vault preserves EPUB reading flow
    Given the Vault browser modal displays an EPUB file "book.epub"
    When the user clicks on the EPUB file
    Then the application resolves the file source URL to "/api/obsidian/vault/attachment?path=book.epub"
    And opens the reader in EPUB mode with the attachment URL

  Scenario: Copy selected text from Unified Selection Toolbar successfully
    Given the user selects non-empty text "đoạn văn bản cần sao chép" in the reader
    And the Unified Selection Toolbar is displayed
    When the user clicks the "Sao chép" action button
    Then navigator.clipboard.writeText is invoked with exactly "đoạn văn bản cần sao chép"
    And the toolbar shows visible success feedback "Đã chép"
    And the action callback is notified

  Scenario: Copy selected text with Clipboard API fallback
    Given navigator.clipboard is unavailable or rejects the write operation
    When the user clicks the "Sao chép" action button
    Then the application uses the offscreen textarea fallback
    And preserves the selection without application crash

  Scenario: Copy citation snapshot from Unified Research Reader
    Given the user chooses "Trích dẫn" in the Unified Research Reader toolbar
    When the citation text is generated
    Then copyTextToClipboard writes the formatted citation to clipboard
    And a visible toast notification "Đã sao chép trích dẫn học thuật" is displayed

  Scenario: Copy file path in PDF Reader Adapter fallback
    Given a local PDF path is displayed in the PDF Reader Adapter fallback
    When the user clicks "Sao chép đường dẫn"
    Then copyTextToClipboard writes the local file path to clipboard
    And the button shows "Đã sao chép đường dẫn"

  Scenario: Copy entire note content from Note Reader Modal
    Given the Note Reader Modal is open with note content
    When the user clicks "Sao chép nội dung"
    Then the full plain text of the note is copied to the clipboard
    And the button displays "Đã sao chép!"
