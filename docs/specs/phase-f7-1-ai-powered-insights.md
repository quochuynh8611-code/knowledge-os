# Đặc Tả Kỹ Thuật (Specs): Phase F7.1 — AI-Powered Insights

**Mã Phase**: F7.1  
**Tên Phase**: AI-Powered Insights & Predictive Analytics  
**Mục tiêu**: Cung cấp các phân tích thông minh dựa trên dữ liệu học tập thực tế: Dự đoán xác suất ghi nhớ (Retention Predictions), Gợi ý chủ đề học tập tối ưu (Study Recommendations), Phát hiện khung giờ vàng học tập (Study Pattern Detection), và Hệ thống nhắc nhở thông minh (Smart Notifications).  
**Trạng thái**: Approved for Planning  
**Ngày tạo**: 2026-09-07  
**Phiên bản đích**: `v0.14.0`  

---

## 🎯 USER STORIES & BDD SCENARIOS (GHERKIN FORMAT)

---

### US1: Retention Predictions & Forgetting Curve Forecasting

**As a** learner  
**I want** to know the predicted probability of recalling a card at future intervals (1d, 3d, 7d, 14d, 30d)  
**So that** I can review cards at the most critical juncture right before forgetting sets in.

#### Scenario 1.1: Calculate retention probability at key time horizons
```gherkin
Given a flashcard with historical review intervals and memory stability S
When I calculate retention predictions
Then the system should compute recall probability R(t) = e^(-t/S) for:
  | Horizon | Days |
  | 1 day   | 1    |
  | 3 days  | 3    |
  | 7 days  | 7    |
  | 14 days | 14   |
  | 30 days | 30   |
And each prediction should include confidence intervals (80% and 95%) based on review consistency
And the optimal next review date should be identified when R(t) reaches the target retention threshold (default 80%)
```

#### Scenario 1.2: Render card-level and topic-level forgetting curve
```gherkin
Given I am inspecting a card or viewing the retention insight panel
When the Retention Prediction visualizer renders
Then I should see an interactive SVG forgetting curve showing:
  - Projected recall decay line from 100% downward over 30 days
  - Shaded 80% and 95% confidence bands
  - Highlighted target threshold line at 80% retention
  - Optimal review point indicator marker
```

#### Scenario 1.3: Graceful fallback for new cards with fewer than 2 reviews
```gherkin
Given a flashcard that is newly created or has only 1 review
When retention prediction is requested
Then the system should apply the default baseline stability (S = 2.5 days)
And indicate an "Estimating (Initial)" badge with wider confidence intervals
```

---

### US2: Intelligent Study Recommendations

**As a** learner with limited time  
**I want** intelligent, prioritized topic recommendations with clear rationale  
**So that** I can spend my study time where it creates the highest learning impact.

#### Scenario 2.1: Multi-criteria topic ranking
```gherkin
Given a set of active topics with flashcards and review histories
When the recommendation engine ranks topics
Then each topic should receive a composite utility score based on:
  | Criterion       | Weight | Formula / Signal                                              |
  | Urgency         | 40%    | Ratio of due/overdue cards relative to total topic cards      |
  | Weak Retention  | 35%    | Lapses and topics with empirical retention < 80%              |
  | Importance/Exam | 25%    | Approaching exam target dates or high-priority tags           |
And the top-scoring topic should be tagged with a "Next Best Topic" badge
```

#### Scenario 2.2: Time-budget filtering (15 min, 30 min, 1 hr)
```gherkin
Given I have a specific time available for study
When I select a time budget:
  | Time Budget | Target Card Batch Size (avg 30s/card) |
  | 15 minutes  | ~30 cards                            |
  | 30 minutes  | ~60 cards                            |
  | 60 minutes  | ~120 cards                           |
Then recommendations should prioritize topics whose due queue best fits the selected session duration
And indicate the estimated completion time
```

#### Scenario 2.3: Anti-fatigue topic diversity
```gherkin
Given topic A was completed in the immediately preceding session
When the recommendation engine generates the next recommendations
Then a recency dampening penalty (0.8x) should be applied to topic A
So that the learner is guided to rotate topics rather than burning out on a single subject
```

#### Scenario 2.4: Human-readable explanations
```gherkin
Given a recommended topic in the recommendations list
When I view the recommendation card
Then it should display a clear textual explanation:
  - Example: "14 cards due today • Retention is 68% (needs reinforcement) • Fits a 15-minute session"
```

---

### US3: Study Pattern Detection & Peak Hours Heatmap

**As a** learner  
**I want** to discover what time of day and days of the week I learn best  
**So that** I can schedule my critical study sessions during my cognitive peak hours.

#### Scenario 3.1: 24h x 7d retention and volume matrix
```gherkin
Given a user's historical flashcard reviews with timestamps
When pattern detection analyzes the review records
Then it should aggregate data into a 24-hour (0..23) by 7-day (Mon..Sun) matrix:
  | Metric          | Description                                    |
  | Review Count    | Total cards reviewed in that hour-day slot     |
  | Retention Rate  | Percentage of correct ratings (rating >= 3)    |
And render an interactive SVG Heatmap with color intensity mapping to retention rate
```

#### Scenario 3.2: Best study time badge and statistical significance
```gherkin
Given sufficient review data (at least 5 reviews per analyzed time window)
When pattern analysis compares hourly performance against the overall baseline retention
Then the hour window with the highest statistically meaningful retention rate should be identified
And display a "Best Study Time" badge (e.g., "Peak Focus: 09:00 - 10:00 (+14% retention vs average)")
```

#### Scenario 3.3: Empty/low data state
```gherkin
Given a user with fewer than 10 total reviews
When the Study Patterns section is viewed
Then the heatmap should render placeholder grid cells with informative guidance:
  - "Complete at least 10 reviews across different hours to unlock your personalized cognitive peak pattern"
```

---

### US4: Smart Notifications & Forgetting Alerts

**As a** learner  
**I want** timely browser notifications before cards fade from memory  
**So that** I don't break my learning streak or forget critical concepts.

#### Scenario 4.1: Browser Notification Permission lifecycle
```gherkin
Given the learner is configuring smart notifications
When they toggle "Enable Smart Notifications"
Then the system should request permission via `Notification.requestPermission()`
And if granted, save the preference in local settings
And if denied or unsupported, smoothly fall back to in-app alert badges without crashing
```

#### Scenario 4.2: Trigger alert when retention falls below threshold
```gherkin
Given scheduled notifications are active
When cards are predicted to cross below the retention threshold (80%) within the next 24 hours
Then a notification should be generated:
  - Title: "Knowledge OS: Cần ôn tập thẻ sắp quên"
  - Body: "[Topic Name] có [N] thẻ sắp quên trong 24 giờ tới. Ôn ngay để duy trì 80%+ ghi nhớ!"
```

#### Scenario 4.3: Snooze options
```gherkin
Given an active notification or in-app reminder
When the user clicks "Snooze"
Then they can choose a snooze duration:
  | Snooze Duration | Action                                     |
  | 1 hour          | Suppress notifications for this card/topic for 1h  |
  | 1 day           | Delay reminder until tomorrow              |
  | 3 days          | Postpone review alert for 3 days           |
```

---

## 🔒 NON-FUNCTIONAL REQUIREMENTS

1. **Zero Database Schema Migrations**: All prediction models, recommendation calculations, and pattern aggregations execute client-side at runtime using existing entities (`Flashcard`, `FlashcardReview`, `Topic`).
2. **Zero Heavy ML Bloat**: No heavy external neural network/Python dependencies; pure TypeScript implementations of exponential decay forecasting, normal-distribution confidence intervals, and matrix aggregations.
3. **Sub-100ms Response Time**: Prediction and recommendation functions must complete in under 50ms for 5,000 cards.
4. **Privacy & Offline First**: All cognitive analytics and notification scheduling run locally in the browser; zero study telemetry sent to external tracking servers.
