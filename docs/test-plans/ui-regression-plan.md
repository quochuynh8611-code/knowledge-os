# UI Regression & Multi-Workspace Test Plan (v2)

- **Target**: Comprehensive UI & Shell Modernization Verification
- **Suites**: Vitest Unit & Integration + Manual Workbench QA Checklist

---

## 1. Gherkin Scenarios for Multi-Workspace Shell & Interactions

### Scenario 1: Shell Navigation & 3-Tier Sidebar Hierarchy
```gherkin
Feature: App Shell Navigation
  As a researcher
  I want a clear, 3-tier sidebar navigation
  So that I can switch workspaces rapidly without state corruption

  Scenario: Switching between Learning, Knowledge, and Tools workspaces
    Given the user is on the "Tổng quan" (Dashboard) tab
    When the user clicks on "Chủ đề học" in the sidebar
    Then the active tab switches to "topics"
    And the main stage renders the TopicTree view
    When the user clicks on "Ghi chú" in the sidebar
    Then the active tab switches to "notes"
    And the main stage renders the NotesManager view
    When the user clicks on "AI Hỗ trợ" in the sidebar
    Then the active tab switches to "ai_studio"
    And the main stage renders the AIResearchStudio view
```

### Scenario 2: Global Keyboard Shortcuts & Command Palette
```gherkin
Feature: Keyboard Flow & Command Palette
  As a power user
  I want global keyboard shortcuts to work across all workspaces
  So that I can navigate hands-free without using the mouse

  Scenario: Triggering Command Palette with Cmd+K / Ctrl+K
    Given the user is viewing any tab in the application
    When the user presses "Cmd+K" or "Ctrl+K"
    Then the Command Palette modal opens with search input auto-focused
    When the user types "Thẻ nhớ" and presses Enter
    Then the Command Palette closes
    And the application navigates to the "flashcards" workspace

  Scenario: Opening Shortcuts Help with '?'
    Given the user is viewing any tab and not typing in an input field
    When the user presses "?"
    Then the ShortcutsModal opens displaying the shortcut cheat sheet
    When the user presses "Escape"
    Then the ShortcutsModal closes cleanly
```

### Scenario 3: Theme Toggle & Semantic Token Consistency
```gherkin
Feature: Dark / Light Theme Switching
  As a researcher working in low light
  I want dark mode to maintain high readability and low eye strain

  Scenario: Toggling theme from Top Command Bar
    Given the application is currently in "light" mode
    When the user clicks the ThemeToggle button in the Top Command Bar
    Then the <html> element gains the "dark" class and data-theme="dark" attribute
    And background colors transition to deep stone/slate shades
    And typography retains crisp contrast without neon glare
```

### Scenario 4: Study Timer Continuity & Floating Session Bar
```gherkin
Feature: Active Study Session Bar Continuity
  As a learner
  I want my active study timer to remain persistent across tab switches
  So that I can read notes or browse topics while clocking study time

  Scenario: Starting study timer and navigating across tabs
    Given the user starts a study timer for a topic "Triết học Phật giáo"
    Then the ActiveLearningSessionBar appears fixed at the bottom center
    When the user navigates from "topics" to "notes" and then to "resources"
    Then the ActiveLearningSessionBar remains mounted and counting
    When the user clicks "Tạm dừng" on the floating bar
    Then the timer pauses and changes status label to "Đang tạm dừng"
    When the user clicks "Hoàn tất"
    Then the SessionWrapupModal opens with topic context pre-filled
```

### Scenario 5: Modal Focus Trap & Safe Escape Handling
```gherkin
Feature: Modal Dialog Focus & Dismissal
  As a user interacting with dialogs
  I want standard focus management and Escape key closing

  Scenario: Opening and closing modals safely
    Given the user clicks "Tạo Mới" -> "Thêm Chủ Đề Mới"
    Then the TopicFormModal opens
    And focus is trapped within the modal
    When the user presses "Escape"
    Then the modal closes and focus returns to the triggering element
```

---

## 2. Multi-Workspace Regression Checklist

| Workspace Tab | Critical Behaviors to Verify | Selectors / State to Preserve |
| :--- | :--- | :--- |
| **Shell & Layout** | Top Command Bar `⌘K` search, Sidebar 3-tier items, Study Habit widget, Focus Domain filter | `onOpenCommandPalette`, `setActiveTab`, `selectedCategoryFilter` |
| **Dashboard** | Hero stats, Weekly cadence, Learning state cards, Resume queue items | `TodayLearningHero`, `WeeklyCadenceBar`, `ResumeStudyQueue` |
| **Topics** | TopicTree expandable categories, delete category safe-merge, TopicDetail reader tabs & sub-views | `TopicTree`, `TopicDetail`, `data-testid="delete-category-*"` |
| **Notes** | Notes list filtering, type pills, focus reader modal, search by tags | `NotesManager`, `NoteReaderModal`, `typeFilter` |
| **Resources** | Resource types (PDF, EPUB, Video, Book), citation modal, EPUB file viewer | `ResourcesManager`, `FileViewer`, `CitationModal` |
| **Docs Explorer** | Category tabs, document list, markdown preview, font size controls | `DocsExplorerView`, `mode="epub-only"` |
| **Search** | Advanced multi-field query, facet filters, topic jump | `AdvancedSearch`, `SearchFilters` |
| **AI Studio** | Scope selector, prompt generator, Antigravity handoff, session history | `AIResearchStudio`, `AntigravityHandoffModal` |
| **Graph** | Node canvas, semantic edge filters, physics layout toggle | `KnowledgeGraph`, physics canvas |
| **Progress** | Study time hours, retention curves, Recharts responsive containers | `StudyProgressView`, Recharts |
| **Flashcards** | SM-2 review studio, card browser, launcher, analytics, duplicate detection | `FlashcardReviewStudio`, `CardBrowser`, `StudyLauncher` |
