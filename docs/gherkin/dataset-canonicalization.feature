# Feature: Dataset Canonicalization — 35 Topics SSOT Integrity
# ADR: ADR-010 | Baseline: commit 405a5a1 (Phase 2B complete)
# SSOT: src/data/initialData.ts
# Tests: tests/unit/dataset-canonicalization.test.ts

Feature: Dataset Canonicalization - 35 Topics SSOT Integrity
  # Đảm bảo src/data/initialData.ts luôn là Single Source of Truth
  # cho toàn bộ hệ thống: seeding, backup, restore, fallback LocalStorage.

  Background:
    Given src/data/initialData.ts là Single Source of Truth của toàn bộ hệ thống
    And INITIAL_CATEGORIES gồm đúng 8 category với IDs chuẩn:
      | cat-tam-tang | cat-abhidharma | cat-thien-dinh | cat-triet-hoc-phat-giao |
      | cat-tam-thuc | cat-dich-hoc   | cat-phong-thuy | cat-tu-vi-tu-tru        |
    And tập 12 canonical tags đã được đăng ký trong INITIAL_TAGS

  # -------------------------------------------------------------------
  Scenario: 1. INITIAL_TOPICS exports exact 35 canonical topics
    When Đọc mảng INITIAL_TOPICS từ initialData.ts
    Then Mảng INITIAL_TOPICS có chính xác 35 phần tử
    And Mảng INITIAL_CATEGORIES có chính xác 8 phần tử
    And Mảng INITIAL_NOTES có chính xác 5 phần tử
    And Mảng INITIAL_RESOURCES có chính xác 4 phần tử
    And Mảng INITIAL_TAGS có chính xác 12 phần tử

  # -------------------------------------------------------------------
  Scenario: 2. All 35 topics have unique ID and slug
    When Quét toàn bộ 35 phần tử trong INITIAL_TOPICS
    Then Mọi topic.id là duy nhất — không có hai topic nào cùng ID
    And Mọi topic.slug là duy nhất — không có hai topic nào cùng slug
    And Tổng số ID duy nhất phải bằng đúng 35

  # -------------------------------------------------------------------
  Scenario: 3. All topics reference valid category IDs
    When Duyệt từng Topic trong INITIAL_TOPICS để kiểm tra categoryId
    Then topic.categoryId phải tồn tại trong tập 8 ID của INITIAL_CATEGORIES
    And Không topic nào được trỏ tới categoryId không tồn tại trong SSOT

  # -------------------------------------------------------------------
  Scenario: 4. All KnowledgeLink target IDs resolve to existing topics
    When Duyệt qua từng KnowledgeLink trong thuộc tính links của mọi Topic
    Then link.targetId phải trỏ tới một Topic ID hợp lệ trong INITIAL_TOPICS
    And link.sourceId phải khớp chính xác với topic.id của Topic chứa link đó

  # -------------------------------------------------------------------
  Scenario: 5. All topics have valid initialized studyProgress
    When Kiểm tra studyProgress của từng Topic trong INITIAL_TOPICS
    Then studyProgress.topicId phải khớp chính xác với topic.id
    And studyProgress.status là "not_started"
    And studyProgress.progress là 0
    And studyProgress.interval là 0
    And studyProgress.easeFactor là 2.5
    And studyProgress.repetitions là 0
    And studyProgress.totalNotes là 0
    And studyProgress.timeSpent là 0

  # -------------------------------------------------------------------
  Scenario: 6. Existing notes and resources maintain valid foreign keys
    When Kiểm tra trường topicId của tất cả phần tử trong INITIAL_NOTES
    Then Mọi note.topicId đều phải trỏ tới một Topic ID tồn tại trong INITIAL_TOPICS
    When Kiểm tra trường topicId của tất cả phần tử trong INITIAL_RESOURCES
    Then Mọi resource.topicId đều phải trỏ tới một Topic ID tồn tại trong INITIAL_TOPICS
    And 5 Notes legacy và 4 Resources legacy giữ nguyên topicId ban đầu không đổi

  # -------------------------------------------------------------------
  Scenario: 7. All topic tags belong to INITIAL_TAGS
    When Quét mảng tags của tất cả 35 Topics
    Then Mọi tag name phải thuộc tập 12 tên tags chuẩn mực trong INITIAL_TAGS
    And Không topic nào được sử dụng tag ngoài danh sách 12 canonical tags

  # -------------------------------------------------------------------
  Scenario: 8. Topic type matches category type
    When Duyệt từng Topic và tra cứu category tương ứng qua categoryId
    Then topic.type phải bằng chính xác category.type của category tương ứng
    And Topic thuộc Phật Học phải có type "phat-hoc"
    And Topic thuộc Huyền Học phải có type "huyen-hoc"

  # -------------------------------------------------------------------
  Scenario: 9. No topic has self-link or duplicate link target
    When Duyệt qua từng KnowledgeLink trong links của mọi Topic
    Then Không tồn tại self-link: link.targetId phải khác link.sourceId
    And Không có duplicate targetId trong cùng một topic.links
    And Mọi link phải là quan hệ giữa hai topic phân biệt

  # -------------------------------------------------------------------
  Scenario: 10. TopicSchema.safeParse() succeeds for every topic
    # Đảm bảo dữ liệu runtime khớp với Zod schema định nghĩa trong validation.ts
    When Thực thi TopicSchema.safeParse() trên từng phần tử trong INITIAL_TOPICS
    Then Kết quả trả về success = true cho toàn bộ 35 topics
    And Không có topic nào bị lỗi schema validation

