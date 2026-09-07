# language: en
@flashcard @spaced_repetition @phase_f1a
Feature: Native Flashcard & Spaced-Repetition Subsystem Architecture Specifications
  As a scholar using Knowledge OS
  I want a native flashcard and spaced repetition system
  So that I can actively recall concepts linked to Topics, Notes, and Resources, and maintain long-term memory retention.

  Background:
    Given a Topic "Thủ Dương Minh Đại Trường Kinh" exists
    And a Note "Đặc tính Huyệt Hợp Cốc" exists linked to the Topic
    And a Resource "Sách Châm Cứu Giáp Ất Kinh" exists linked to the Topic

  # ---------------------------------------------------------------------------
  # 1. Flashcard Creation & Content Linking (Topic / Note / Resource)
  # ---------------------------------------------------------------------------
  Scenario: Creating a Basic Flashcard with Separated Schedule State
    When the user creates a new flashcard with the following properties:
      | field        | value                                                                 |
      | type         | basic                                                                 |
      | topicId      | topic-dai-truong-kinh                                                 |
      | noteId       | note-hop-coc                                                          |
      | front        | Huyệt Hợp Cốc thuộc đường kinh nào?                                  |
      | back         | Thuộc Thủ Dương Minh Đại Trường Kinh.                                 |
    Then the flashcard content is saved
    And an associated FlashcardSchedule is initialized with:
      | field       | value |
      | state       | new   |
      | interval    | 0     |
      | easeFactor  | 2.5   |
      | repetitions | 0     |
      | lapses      | 0     |
    And the flashcard references both the Topic and Note

  Scenario: Creating a Basic Flashcard linked to a Resource
    When the user creates a new flashcard linked to Topic "topic-dai-truong-kinh" and Resource "resource-giap-at-kinh"
    Then the flashcard references both the Topic and Resource

  Scenario: Creating a Cloze Deletion Flashcard
    When the user creates a cloze deletion flashcard with content:
      """
      Huyệt {{c1::Hợp Cốc}} là nguyên huyệt của kinh {{c2::Đại Trường}}.
      """
    Then the system parses 2 distinct cloze items:
      | index | answer      |
      | c1    | Hợp Cốc     |
      | c2    | Đại Trường  |
    And the flashcard is linked to the parent Topic

  # ---------------------------------------------------------------------------
  # 2. Spaced Repetition Scheduling Engine (State Transitions & Ratings)
  # ---------------------------------------------------------------------------
  Scenario Outline: Evaluating card state transitions on review
    Given a card in "new" state with repetitions 0 and interval 0
    When the user reviews the card and selects rating "<rating_name>" with value <rating_value>
    Then the schedule state becomes "<expected_state>"
    And the new interval is <expected_interval> days
    And the new ease factor is <expected_ease>

    Examples:
      | rating_name | rating_value | expected_state | expected_interval | expected_ease |
      | Again       | 1            | relearning     | 1                 | 2.30          |
      | Hard        | 2            | review         | 1                 | 2.35          |
      | Good        | 3            | review         | 1                 | 2.50          |
      | Easy        | 4            | review         | 4                 | 2.65          |

  Scenario Outline: Scheduling progression for review cards
    Given a card in "review" state with interval 6 days, ease factor 2.5, and repetitions 2
    When the user reviews the card and selects rating "<rating_name>" with value <rating_value>
    Then the new schedule interval is calculated deterministically as <expected_interval> days
    And the schedule ease factor is updated to <expected_ease>

    Examples:
      | rating_name | rating_value | expected_interval | expected_ease |
      | Again       | 1            | 1                 | 2.30          |
      | Hard        | 2            | 7                 | 2.35          |
      | Good        | 3            | 15                | 2.50          |
      | Easy        | 4            | 20                | 2.65          |

  # ---------------------------------------------------------------------------
  # 3. Option A Database-Level Idempotency & Duplicate Response Semantics
  # ---------------------------------------------------------------------------
  Scenario: Submitting a new FlashcardReview creates records and updates schedule
    Given a card with initial schedule state
    When client submits a review with clientEventId "evt-uuid-001" and rating 3
    Then a FlashcardReview record is inserted with clientEventId "evt-uuid-001"
    And the associated FlashcardSchedule is updated with new interval and ease factor
    And server returns HTTP 200 with duplicate flag false and clientEventId "evt-uuid-001"

  Scenario: Replaying a FlashcardReview with identical clientEventId returns fast duplicate response
    Given a card that has already processed FlashcardReview with clientEventId "evt-uuid-001"
    When client re-sends POST review with clientEventId "evt-uuid-001" due to network retry
    Then server detects existing FlashcardReview with clientEventId "evt-uuid-001"
    And server returns HTTP 200 with duplicate flag true, clientEventId "evt-uuid-001", and existing review data
    And the card's FlashcardSchedule is preserved without double-advancing

  Scenario: Delayed retry of older review after subsequent reviews is safely rejected
    Given a card has processed review with clientEventId "evt-uuid-A"
    And the card subsequently processed review with clientEventId "evt-uuid-B" and advanced its schedule
    When a delayed retry of "evt-uuid-A" arrives at the server
    Then the server detects existing review with clientEventId "evt-uuid-A"
    And server returns HTTP 200 with duplicate flag true
    And the card's schedule remains at state B without rollback or corruption

  # ---------------------------------------------------------------------------
  # 4. Due Queue & In-Memory Dashboard Derivations
  # ---------------------------------------------------------------------------
  Scenario: Filtering Due Cards for Today's Review Session
    Given flashcards exist with schedule due dates in the past, today, and future
    When the system queries due cards for today
    Then only cards with schedule due dates on or before today are returned
    And future cards are excluded
