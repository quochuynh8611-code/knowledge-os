Feature: Dataset Canonicalization - 35 Topics SSOT Integrity

  Background:
    Given src/data/initialData.ts là Single Source of Truth của toàn bộ hệ thống

  Scenario: 1. Exact seed cardinalities (8 categories, 35 topics, 5 notes, 4 resources, 12 tags)
    When Đọc các mảng export từ initialData.ts
    Then Mảng INITIAL_TOPICS có chính xác 35 phần tử
    And Mảng INITIAL_CATEGORIES có chính xác 8 phần tử
    And Mảng INITIAL_NOTES có chính xác 5 phần tử
    And Mảng INITIAL_RESOURCES có chính xác 4 phần tử
    And Mảng INITIAL_TAGS có chính xác 12 phần tử

  Scenario: 2. Unique topic IDs and unique topic slugs
    When Quét toàn bộ 35 phần tử trong INITIAL_TOPICS
    Then Mọi topic.id là duy nhất trong toàn bộ mảng
    And Mọi topic.slug là duy nhất trong toàn bộ mảng

  Scenario: 3. Valid category IDs and matching topic/category types
    When Duyệt từng Topic trong INITIAL_TOPICS
    Then topic.categoryId phải tồn tại trong tập 8 ID của INITIAL_CATEGORIES
    And topic.type ("phat-hoc" hoặc "huyen-hoc") phải khớp chính xác với category.type tương ứng

  Scenario: 4. Valid knowledge links, correct source IDs, no self-links and no duplicates
    When Duyệt qua từng KnowledgeLink trong thuộc tính links của mọi Topic
    Then link.targetId phải trỏ tới một Topic ID hợp lệ trong INITIAL_TOPICS
    And link.sourceId phải khớp chính xác với topic.id của Topic chứa nó
    And Không tồn tại self-link (link.sourceId khác link.targetId)
    And Không có duplicate targetId trong cùng một topic

  Scenario: 5. Canonical topic tags only
    When Quét mảng tags của tất cả các Topic
    Then Mọi tag name phải thuộc tập 12 tags chuẩn mực trong INITIAL_TAGS

  Scenario: 6. StudyProgress canonical defaults for every topic
    When Kiểm tra studyProgress của từng Topic trong INITIAL_TOPICS
    Then studyProgress.topicId phải khớp chính xác với topic.id
    And studyProgress.status là "not_started"
    And studyProgress.progress là 0
    And studyProgress.interval là 0
    And studyProgress.easeFactor là 2.5
    And studyProgress.repetitions là 0
    And studyProgress.totalNotes là 0
    And studyProgress.timeSpent là 0

  Scenario: 7. Notes and resources topic foreign-key integrity and legacy preservation
    When Kiểm tra trường topicId của tất cả phần tử trong INITIAL_NOTES và INITIAL_RESOURCES
    Then Mọi topicId đều phải trỏ tới một Topic ID tồn tại trong INITIAL_TOPICS
    And 5 Notes legacy và 4 Resources legacy giữ nguyên topicId ban đầu

  Scenario: 8. TopicSchema.safeParse() succeeds for every topic
    When Thực thi TopicSchema.safeParse() trên từng phần tử trong INITIAL_TOPICS
    Then Kết quả trả về success = true cho toàn bộ 35 topics
