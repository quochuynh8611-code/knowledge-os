Feature: Commercial Reset UI Pruning
  As a product owner
  I want to remove personal analysis tools from the UI
  So that the app presents a clean, commercial-ready interface

  Scenario: Sidebar navigation cleanup
    Given the app is running
    When the user opens the Sidebar
    Then the "Công cụ phân tích khác" section should NOT contain:
      | Tab ID | Display Name |
      | abhidharma_matrix | Ma trận phân tích |
      | divination_matrix | Mô hình hệ thống |
      | lexicon | Từ điển thuật ngữ |
      | docs | Tài liệu kiến trúc |
    And the "Thư Viện Sách" tab should be present (renamed from "docs")

  Scenario: App routing cleanup
    Given the user navigates to removed tabs
    When activeTab is "abhidharma_matrix"
    Then the app should fallback to "dashboard" or show 404
    And activeTab "divination_matrix" should not render any component
    And activeTab "lexicon" should not render any component
    And activeTab "library" should render DocsExplorerView with EPUB-only mode

  Scenario: Command palette cleanup
    Given the user opens Command Palette
    When the user types "ma trận"
    Then no navigation commands for matrix should appear
    And typing "hệ thống" should not show divination commands
    And typing "từ điển" should not show lexicon commands

  Scenario: Code artifacts removal
    Given the reset is complete
    Then the following files should NOT exist:
      - src/components/matrix/AbhidharmaMatrix.tsx
      - src/components/matrix/DivinationMatrix.tsx
      - src/components/lexicon/MultilingualLexicon.tsx
      - src/data/scholarSuite/matrixRegistry.ts
      - src/data/scholarSuite/systemRegistry.ts
      - src/data/scholarSuite/lexiconRegistry.ts
      - src/data/scholarSuite/tcmRegistry.ts
      - src/lib/terminology/lexiconDictionary.ts
      - src/lib/terminology/tcmDictionary.ts
      - src/lib/terminology/unifiedDictionary.ts
    And the following files should exist:
      - src/components/docs/DocsExplorerView.tsx (EPUB-only mode)
      - src/components/docs/FileViewer.tsx (with EPUB Reader)
      - src/server/routes/docsRoutes.ts
      - src/lib/docsSanitizer.ts

  Scenario: Test suite cleanup
    Given the code is pruned
    When running vitest run
    Then 17 dead tests (matrix/lexicon) should be removed
    And navigation tests should pass with updated tab list
    And command palette tests should pass without matrix/lexicon commands
    And all remaining tests should PASS

  Scenario: Commercial zero-default baseline and domain neutralization
    Given ứng dụng khởi tạo dữ liệu mặc định
    When người dùng mở màn hình nghiên cứu
    Then không còn domain hoặc chủ đề mặc định chuyên biệt trong tab "Lĩnh vực nghiên cứu"
    And không còn header "Nghiên cứu Phật học & Huyền học" ở khung phần mềm
    And placeholder ô tìm kiếm không chứa "Vi Diệu Pháp", "Tâm Vương", "Cửu Cung", "Quẻ Càn", "Bát Nhã", "Tứ Niệm Xứ"
    And placeholder ô nhập chủ đề và tài liệu không chứa các thuật ngữ tôn giáo hoặc huyền học cổ truyền
    And người dùng mới có thể tự tạo lĩnh vực nghiên cứu đầu tiên của mình

  Scenario: Build verification
    Given all code changes are complete
    When running npm run lint
    Then there should be no linting errors
    And npm run typecheck should pass
    And npm run build should succeed
