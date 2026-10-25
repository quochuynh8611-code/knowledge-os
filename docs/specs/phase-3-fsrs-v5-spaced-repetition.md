# Specification: Phase 3 — FSRS v5 Spaced Repetition Engine & Adaptive Desired Retention

## Overview
Đặc tả kỹ thuật theo chuẩn hành vi (BDD Gherkin) cho bộ máy lặp lại ngắt quãng thế hệ mới FSRS v5 (Free Spaced Repetition Scheduler), áp dụng mô hình toán học DSR (Difficulty, Stability, Retrievability) và cầu nối Zero-Migration với dữ liệu SM-2 hiện có.

---

## Feature: Power-Law Forgetting Curve & Interval Calculation
  As an academic researcher or student
  I want memory retrievability modeled accurately with power-law decay
  So that review intervals match my target desired retention rate

  Scenario: Power-law retrievability at review day t = 0 and t = S
    Given a memory stability S = 10.0 days
    When computing retrievability at elapsed days t = 0
    Then retrievability R should be exactly 1.0 (100%)
    When computing retrievability at elapsed days t = S (10.0 days)
    Then retrievability R should be exactly 0.90 (90%)

  Scenario: Monotonic decrease of retrievability over elapsed time
    Given a memory stability S = 20.0 days
    When computing retrievability at days t1 = 5, t2 = 10, t3 = 20, t4 = 40
    Then R(5) > R(10) > R(20) > R(40)
    And all values should fall within (0.0, 1.0]

  Scenario: Review interval scaling with Desired Retention threshold
    Given a memory stability S = 14.0 days
    When computing next review interval with desired retention 0.80, 0.90, and 0.95
    Then interval for retention 0.80 should be strictly greater than interval for 0.90
    And interval for retention 0.90 should be strictly greater than interval for 0.95
    And interval for retention 0.90 should equal round(S) = 14 days

---

## Feature: FSRS State Transitions across Ratings 1 to 4
  As an active flashcard learner
  I want difficulty and stability updated logically according to rating
  So that harder cards are reviewed sooner and easier cards are spaced further

  Scenario: Initial rating on a new flashcard
    Given a new flashcard with no review history
    When rated with rating 1 (Again)
    Then next stability S should equal w0 (~0.40 days)
    And next interval should be 1 day
    And next difficulty D should be higher than rating 3 (Good)

  Scenario: Ordering invariant across all 4 ratings on established card
    Given an established review card with stability S = 10.0 days and difficulty D = 5.0
    When evaluated for all 4 ratings: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    Then interval(Again) <= interval(Hard) <= interval(Good) < interval(Easy)
    And nextStability(Again) < nextStability(Hard) < nextStability(Good) < nextStability(Easy)
    And nextDifficulty(Again) >= nextDifficulty(Hard) >= nextDifficulty(Good) >= nextDifficulty(Easy)
    And all difficulty values must be clamped within [1.0, 10.0]

---

## Feature: Zero-Migration SM-2 ↔ FSRS State Bridge
  As a system maintaining database compatibility
  I want seamless bidirectional conversion between SM-2 fields and FSRS parameters
  So that no Prisma schema migration or data loss occurs

  Scenario: Inferring FSRS Difficulty and Stability from legacy SM-2 schedule
    Given a legacy SM-2 card with easeFactor = 1.30 and lapses = 4
    When migrating state to FSRS
    Then inferred difficulty D should be close to maximum difficulty (e.g., >= 8.5)
    Given another legacy SM-2 card with easeFactor = 3.20 and lapses = 0
    When migrating state to FSRS
    Then inferred difficulty D should be significantly lower (e.g., <= 3.5)

  Scenario: Synchronizing FSRS calculation back to SM-2 database fields
    Given an FSRS calculation resulting in difficulty D = 1.0 (easiest)
    When synchronizing to SM-2 easeFactor
    Then easeFactor should be close to upper bound 3.50
    Given an FSRS calculation resulting in difficulty D = 10.0 (hardest)
    When synchronizing to SM-2 easeFactor
    Then easeFactor should be close to lower bound 1.30

---

## Feature: Rating Interval Preview
  As a student reviewing cards in the study studio
  I want to see the exact interval days on each rating button
  So that I can make an informed choice based on my memory confidence

  Scenario: Computing preview intervals for all 4 buttons
    Given a card schedule with stability S = 12.0 and difficulty D = 4.5
    When calling previewCardRatingIntervals
    Then the result contains entries for ratings 1, 2, 3, and 4
    And each entry contains intervalDays >= 1 and nextStability > 0
    And intervalDays(1) <= intervalDays(2) <= intervalDays(3) <= intervalDays(4)
