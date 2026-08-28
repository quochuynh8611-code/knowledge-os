# language: en
Feature: Phase P5.2 — Command Palette Result Ranking, Deduplication and Relevance
  As a knowledge researcher or power user
  I want search results in the Command Palette to be ranked accurately based on match relevance and recent usage
  And I want injected custom items to cleanly override duplicate base items without visual glitches
  So that I can find and execute my intended commands with minimal keystrokes

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Exact title match ranks higher than description/keyword matches
  # ─────────────────────────────────────────────────────────────
  Scenario: Exact title match is ranked ahead of partial and description matches
    Given the Command Palette contains:
      | id          | title                 | description                     | category   |
      | nav-graph   | Đồ thị tri thức       | Xem tổng quan toàn bộ mạng lưới | Điều hướng |
      | nav-dash    | Tổng quan             | Bảng điều khiển trung tâm       | Điều hướng |
    When the user searches for "tong quan"
    Then "Tổng quan" appears as the first result with higher rank than "Đồ thị tri thức"

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Title prefix match ranks higher than substring and keyword matches
  # ─────────────────────────────────────────────────────────────
  Scenario: Title prefix match ranks higher than substring match
    Given the Command Palette contains:
      | id          | title                 | description                     | category   |
      | item-mid    | Bản Đồ Tổng Quan      | Sơ đồ chi tiết                  | Chủ đề     |
      | item-pre    | Tổng Quan Nghiên Cứu  | Giới thiệu không gian           | Điều hướng |
    When the user searches for "tong quan"
    Then "Tổng Quan Nghiên Cứu" appears before "Bản Đồ Tổng Quan"

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Recency boost elevates recently executed items among same-tier matches
  # ─────────────────────────────────────────────────────────────
  Scenario: Recency boost gives priority to recently used commands
    Given the user recently executed command "act-add-note"
    And two commands "act-add-note" and "act-add-topic" have matching title prefixes for "them"
    When the user searches for "them"
    Then "Thêm Ghi Chú Mới" appears ahead of "Thêm Chủ Đề Mới" due to recency boost

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Deduplication overrides base item when custom item with same ID is injected
  # ─────────────────────────────────────────────────────────────
  Scenario: Injected custom item overrides base item with matching ID
    Given a base item exists with id "act-toggle-theme" and title "Chuyển Đổi Giao Diện Sáng / Tối"
    When a custom item is injected with id "act-toggle-theme" and title "Custom Dark Mode Switcher"
    Then the Command Palette contains only 1 item with id "act-toggle-theme"
    And the item title is "Custom Dark Mode Switcher"

  # ─────────────────────────────────────────────────────────────
  # Scenario 5: Deterministic tie-break chain preserves category and stable insertion order
  # ─────────────────────────────────────────────────────────────
  Scenario: Equal score items follow category order then original insertion order
    Given multiple items have the exact same match score
    When the search results are rendered
    Then items in "Hành động nhanh" appear before items in "Điều hướng"
    And items within the same category preserve their original relative order
