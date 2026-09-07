# Đặc Tả Kỹ Thuật (Specs): Phase F7.0 — Research Dashboard (Multi-Domain)

**Mã Phase**: F7.0  
**Tên Phase**: Research Dashboard (Multi-Domain Knowledge Aggregator)  
**Mục tiêu**: Hợp nhất và trực quan hóa toàn bộ tri thức đa miền (Ghi chú, Thẻ ghi nhớ, Tài liệu tham khảo, Tiến độ học tập) theo từng chủ đề; cung cấp dòng thời gian nghiên cứu, công cụ tìm kiếm toàn văn BM25 và xuất báo cáo tổng quan.  
**Trạng thái**: Draft / Approved for Planning  
**Ngày tạo**: 2026-09-07  

---

## 🎯 USER STORIES & BDD SCENARIOS (GHERKIN FORMAT)

---

### US1: Topic Dashboard & Knowledge Aggregation

**As a** researcher / learner  
**I want** to see an aggregated dashboard for each topic  
**So that** I have a holistic view of all learning assets, retention metrics, and recent activities.

#### Scenario 1.1: View comprehensive topic dashboard metrics
```gherkin
Given I am navigating the Topic Detail page for "Thiền Tứ Niệm Xứ"
When I view the "Research Dashboard" section
Then I should see the aggregate counts:
  | Metric             | Type    |
  | Notes Count        | number  |
  | Flashcards Count   | number  |
  | Resources Count    | number  |
And I should see the learning performance stats:
  | Metric             | Format  |
  | Total Reviews      | integer |
  | Retention Rate     | %       |
  | Streak Days        | integer |
  | Time Spent         | minutes |
And I should see an interactive Retention Trend chart (SVG)
And I should see a list of the 10 most recent activities
```

#### Scenario 1.2: Filter retention and activity by date range
```gherkin
Given I am on the Topic Dashboard
When I select a date range filter:
  | Range    |
  | 7 days   |
  | 30 days  |
  | 90 days  |
  | All time |
Then the retention trend SVG chart and activity list should update to reflect only that timeframe
And the aggregate metrics should recalculate dynamically
```

#### Scenario 1.3: Topic with no reviews or assets yet
```gherkin
Given I am on a newly created topic without notes or reviews
When I view the Research Dashboard
Then empty states should be displayed gracefully without crashing
And default educational placeholders should guide me to create notes or flashcards
```

---

### US2: Cross-Domain Research Timeline

**As a** researcher  
**I want** to browse a chronological research timeline across all learning events  
**So that** I can trace back my study journey, note-taking dates, and spaced repetition milestones.

#### Scenario 2.1: View chronological timeline grouped by date buckets
```gherkin
Given I am on the Research Timeline view
When the timeline renders
Then events should be chronologically grouped into buckets:
  | Bucket     | Definition                    |
  | Hôm nay    | Today (local midnight to now) |
  | Hôm qua    | Yesterday                     |
  | Tuần này   | Past 7 days                   |
  | Tháng này  | Past 30 days                  |
  | Cũ hơn     | Earlier                       |
And each event should display:
  - Event type badge (`NOTE_CREATED`, `FLASHCARD_CREATED`, `REVIEW_COMPLETED`, `RESOURCE_ADDED`)
  - Title and summary preview
  - Exact localized timestamp
  - Domain icon and topic association
```

#### Scenario 2.2: Filter timeline events
```gherkin
Given I am viewing the Research Timeline
When I apply filter criteria:
  | Filter Type | Value Options                                |
  | Topic       | Specific topic ID or "All Topics"            |
  | Event Type  | Notes, Flashcards, Reviews, Resources        |
  | Date Range  | From date - To date                          |
Then only events matching all active filters should be displayed
And the count of matched events should be indicated in the header
```

#### Scenario 2.3: Click event to inspect details
```gherkin
Given I am viewing an event item on the timeline
When I click on the event card
Then a preview modal or drawer should open displaying:
  - Full content snippet (note markdown, flashcard front/back, review stats)
  - Navigation action to open the original note/flashcard studio
```

---

### US3: Cross-Domain Full-Text Search (BM25 Engine)

**As a** researcher  
**I want** to execute full-text search across notes, flashcards, and resources  
**So that** I can instantly retrieve matching knowledge across multiple domains with relevance scoring.

#### Scenario 3.1: Execute search query across multiple entities
```gherkin
Given I am in the Research Search interface
When I enter the search query "tứ niệm xứ quán thân"
Then the search engine should query across:
  - Note titles and markdown body
  - Flashcard front, back, and cloze tags
  - Resource titles, notes, and file metadata
And results should be returned ranked by BM25 relevance score
And matched keywords should be wrapped in `<mark>` tags for visual highlight
And each result item should display an entity badge (`note`, `flashcard`, `resource`)
```

#### Scenario 3.2: Multi-lingual normalization (Vietnamese & Pāli/Sanskrit IAST)
```gherkin
Given I enter a search term with or without accents (e.g. "satipatthana" or "satipaṭṭhāna", "tam niem" or "tâm niệm")
When the search executes
Then the normalizer should map IAST and Vietnamese diacritics to matching canonical forms
And recall relevant results regardless of accent variations
```

#### Scenario 3.3: Filter search results
```gherkin
Given I am viewing search results
When I filter by entity type "flashcard"
Then only flashcard results should remain visible
And the relevance ranking should be preserved
```

---

### US4: Export Research Report

**As a** researcher  
**I want** to export a comprehensive research report for a topic in Markdown format  
**So that** I can share findings, archive notes, or import into external note vaults.

#### Scenario 4.1: Configure and preview research report
```gherkin
Given I am on the Topic Dashboard
When I click the "Xuất Báo Cáo Nghiên Cứu" button
Then an export modal should open displaying:
  - Section checkboxes (Tổng quan, Ghi chú, Flashcards, Tài liệu, Timeline)
  - Format selector (Markdown `.md`)
  - Live markdown preview
```

#### Scenario 4.2: Generate and download report
```gherkin
Given I have selected sections for export
When I click "Tải Báo Cáo"
Then a file named `research-report-{topic-slug}-{date}.md` should be downloaded
And the downloaded file should contain:
  - Header: Topic Title, Domain, Date, Knowledge OS attribution
  - Overview: Key metrics table (notes count, flashcards count, retention rate, stability)
  - Notes Section: List of notes with frontmatter metadata and content snippets
  - Flashcards Section: List of cards with front/back and mastery status
  - Resources Section: Attached files and external references
  - Timeline Section: Chronological research milestone summary
  - UTF-8 BOM encoding for clean text rendering
```

---

## 🛡️ CRITICAL NON-FUNCTIONAL REQUIREMENTS

1. **Zero Schema Migrations**: All aggregations, BM25 indexing, and timeline streams are runtime-derived from existing models (`Topic`, `Note`, `Resource`, `Flashcard`, `FlashcardReview`).
2. **Zero Heavy Chart Dependencies**: Timeline and retention trend charts are rendered with lightweight React SVG.
3. **High Performance Search**: In-memory BM25 token index executes in `< 25ms` for up to 5,000 entities.
4. **Accessible Design**: Full keyboard navigation, ARIA attributes, and dark mode support conforming to existing design system.
