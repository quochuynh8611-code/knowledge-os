Feature: Phase 7C — Note & Topic Content Readability Presentation Upgrade
  As a research workspace user
  I want clean, natural, and beautiful text rendering in both focus reading and compact preview modes
  So that I am never distracted by raw markdown control characters (#, **, >, ---) while maintaining rich interactive links and original source data integrity.

  Background:
    Given the application has loaded with topics and notes containing markdown syntax

  # ---------------------------------------------------------------------------
  # Scenarios for Focus Read Mode (NoteReaderModal & TopicDetail overview)
  # ---------------------------------------------------------------------------
  Scenario: Focus reader renders bold, italic and headings without exposing raw markers
    Given a note with content:
      """
      # Tổng Quan Vi Diệu Pháp
      Nghiên cứu về **Tâm** và *Tâm Sở*.
      > Lời dạy của các bậc tiền bối.
      ---
      Nội dung kết luận.
      """
    When the user opens the note in NoteReaderModal
    Then the heading is rendered as an H1 visual element without leading "#"
    And the text "Tâm" is rendered with bold formatting without "**"
    And the blockquote is rendered in a quote container without leading ">"
    And the horizontal rule is rendered as a clean divider element instead of "---"

  Scenario: Focus reader renders wiki links as interactive buttons with clean text
    Given a note with content "Tham chiếu đến [[Abhidharma - Vi Diệu Pháp Toàn Tập]] trong phân tích."
    When the user opens the note in NoteReaderModal
    Then the wiki link is rendered as an interactive button showing "Abhidharma - Vi Diệu Pháp Toàn Tập"
    And the brackets "[[" and "]]" are not visible in the text

  # ---------------------------------------------------------------------------
  # Scenarios for Compact / Card Preview Mode (NotesManager, TopicDetail cards, Search)
  # ---------------------------------------------------------------------------
  Scenario: Compact preview in note cards sanitizes markdown syntax into flowing plain text
    Given a note with content:
      """
      ### Điểm Nhấn
      > Trích đoạn quan trọng về **Ngũ Uẩn** và [[Kinh Dịch]].
      ---
      - Mục 1
      - Mục 2
      """
    When the note card is displayed in NotesManager
    Then the card preview does not contain "###", ">", "**", "---", "[[" or "]]"
    And the card preview shows clean flowing text "Điểm Nhấn Trích đoạn quan trọng về Ngũ Uẩn và Kinh Dịch. Mục 1 Mục 2"

  Scenario: Search result snippet displays sanitized readable plain text
    Given a note with content "# Định Nghĩa **Khái Niệm**"
    When the note is matched in AdvancedSearch
    Then the preview text does not display "#" or "**"

  # ---------------------------------------------------------------------------
  # Scenarios for Data & Edit Mode Immutability
  # ---------------------------------------------------------------------------
  Scenario: Raw markdown data is preserved in DB and edit modal
    Given a note with raw markdown content "# Tiêu đề gốc **đậm**"
    When the user opens the note in NoteFormModal for editing
    Then the edit textarea displays the exact raw markdown "# Tiêu đề gốc **đậm**"
    And the underlying note object in DataContext remains unchanged
