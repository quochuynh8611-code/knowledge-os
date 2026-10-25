# Đặc Tả Kỹ Thuật (BDD Spec): Phase 2 — Multi-Style Reference & Citation Hub, Universal Parsers & DOI Resolver

## Feature: Academic Reference Formatting & Multi-Style Generator
  Là một nhà nghiên cứu học thuật sử dụng Knowledge OS,
  Tôi muốn xuất trích dẫn tài liệu theo nhiều chuẩn quốc tế (APA 7, MLA 9, Chicago 17, IEEE, Harvard, BibTeX, RIS, Markdown),
  Để có thể dán trực tiếp vào bài báo, luận văn hoặc hệ thống quản lý thư mục mà không cần định dạng lại thủ công.

  ### Scenario: Format article citation across 8 international academic styles
    Given a resource of type "article" with:
      | title     | Deep Learning for Knowledge Graphs: A Survey |
      | author    | Le, Minh and Nguyen, Anh                     |
      | journal   | Journal of Artificial Intelligence Research  |
      | year      | 2024                                         |
      | volume    | 45                                           |
      | issue     | 2                                            |
      | pages     | 101-125                                      |
      | doi       | 10.1016/j.jair.2024.01.005                   |
    When the citation generator processes the resource
    Then the APA citation should match "Le, Minh, & Nguyen, Anh. (2024). Deep Learning for Knowledge Graphs: A Survey. Journal of Artificial Intelligence Research, 45(2), 101-125. https://doi.org/10.1016/j.jair.2024.01.005"
    And the MLA citation should match "Le, Minh, and Anh Nguyen. \"Deep Learning for Knowledge Graphs: A Survey.\" Journal of Artificial Intelligence Research, vol. 45, no. 2, 2024, pp. 101-125. https://doi.org/10.1016/j.jair.2024.01.005."
    And the Chicago citation should match "Le, Minh, and Nguyen, Anh. 2024. \"Deep Learning for Knowledge Graphs: A Survey.\" Journal of Artificial Intelligence Research 45 (2): 101-125. https://doi.org/10.1016/j.jair.2024.01.005."
    And the IEEE citation should match "[1] M. Le and A. Nguyen, \"Deep Learning for Knowledge Graphs: A Survey,\" Journal of Artificial Intelligence Research, vol. 45, no. 2, pp. 101-125, 2024, doi: 10.1016/j.jair.2024.01.005."
    And the Harvard citation should match "Le, Minh and Nguyen, Anh (2024) 'Deep Learning for Knowledge Graphs: A Survey', Journal of Artificial Intelligence Research, 45(2), pp. 101-125. Available at: https://doi.org/10.1016/j.jair.2024.01.005."
    And the BibTeX citation should have entry type "@article" and contain "doi = {10.1016/j.jair.2024.01.005}"
    And the RIS citation should have "TY  - JOUR" and "DO  - 10.1016/j.jair.2024.01.005"
    And the Markdown footnote should match "[^1]: Le, Minh and Nguyen, Anh (2024). *Deep Learning for Knowledge Graphs: A Survey*. [Bài viết]."

---

## Feature: Universal Reference File Parsers (BibTeX, RIS, Zotero CSL-JSON)
  Là một người dùng chuyển đổi dữ liệu từ Zotero, Google Scholar hoặc Mendeley,
  Tôi muốn nhập hàng loạt tài liệu từ các tập tin .bib, .ris hoặc .json,
  Để nhanh chóng thiết lập thư viện tham khảo cho chủ đề nghiên cứu.

  ### Scenario: Parse multi-entry BibTeX file
    Given a BibTeX content containing an @article entry and an @book entry
    When the universal reference parser processes the BibTeX content
    Then it should extract 2 resources
    And the first resource should have title "Attention Is All You Need" and author "Vaswani, Ashish"
    And the second resource should have title "Deep Learning" and publisher "MIT Press"

  ### Scenario: Parse RIS file from academic journal
    Given a RIS file content containing "TY  - JOUR", "TI  - ", "AU  - ", "JO  - ", "SP  - 10", "EP  - 25", "DO  - 10.1234/test.2023"
    When the universal reference parser processes the RIS content
    Then it should extract the resource with pages "10-25" and doi "10.1234/test.2023"

  ### Scenario: Parse Zotero CSL-JSON file
    Given a CSL-JSON array with items containing "container-title", "author" objects, and "issued.date-parts"
    When the universal reference parser processes the CSL-JSON content
    Then it should extract resources with normalized title, author, year and journal

  ### Scenario: Deduplicate imported resources against existing library
    Given a library with an existing resource having DOI "10.1016/j.cell.2023.01.001"
    When importing a batch containing a resource with the same DOI
    Then the deduplication function should mark that resource as a duplicate
    And only unique resources should be marked for addition

---

## Feature: CrossRef DOI Metadata Resolver
  Là một nhà nghiên cứu,
  Tôi muốn nhập một chuỗi DOI (ví dụ: "10.1038/s41586-020-2649-2") và nhấn nút tìm kiếm,
  Để hệ thống tự động điền tiêu đề, tác giả, năm, tạp chí, số trang và URL của bài báo.

  ### Scenario: Successfully resolve valid DOI via CrossRef API
    Given a valid DOI string "https://doi.org/10.1038/s41586-020-2649-2"
    When the resolver normalizes the DOI
    Then it should extract "10.1038/s41586-020-2649-2"
    When the resolver queries the mocked CrossRef endpoint
    Then it should return status "success" with populated academic fields

  ### Scenario: Handle non-existent DOI (404 Not Found)
    Given an unknown DOI string "10.99999/non-existent-doi-404"
    When the resolver queries the mocked CrossRef endpoint returning 404
    Then it should return status "not_found" with an informative message
    And the application should not throw an unhandled error

---

## Feature: Zero DB Migration Academic Metadata Persistence
  Là một nhà phát triển hệ thống,
  Tôi muốn lưu các trường metadata học thuật mở rộng mà không làm gãy Prisma DB,
  Để dữ liệu học thuật được bảo toàn qua mọi tầng lưu trữ.

  ### Scenario: Round-trip academic metadata embedding
    Given a resource with academic fields: doi="10.1145/123", journal="ACM Computing Surveys", year="2023"
    And user notes "Đây là bài báo tổng quan rất hay."
    When embedAcademicMetadataInNotes is called
    Then it should return notes containing a hidden structured block
    When extractAcademicMetadataFromResource is called on a resource with those notes
    Then all academic fields should be accurately restored
