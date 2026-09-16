# Phase D Roadmap: Study Suite & Knowledge Visualizations
**Target**: Modernize Study Suite, Analytics, Knowledge Graph & AI Research Studio into the "Professional Research Workbench" archetype.

---

## 1. Scope of Files to Refactor

1. **`src/components/flashcards/FlashcardReviewStudio.tsx`**
   - *Archetype*: Studio
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `KbdShortcutBadge`.
   - *Key Sections*: Control strip (topic info, review queue progress, timer status), Main Review Canvas (Question & Answer stage, rating buttons, cloze cards), Shortcut cheat-sheet, Edit/Handoff side action drawer.
   - *Invariants*: `shortcutScope.pushScope("flashcard_review")`, keyboard shortcuts (`1`-`4`, `Space`, `Ctrl/Cmd+E`, `Ctrl/Cmd+H`), rating buttons `data-testid="rating-btn-*"`, session progression, SM-2 calculations.

2. **`src/components/flashcards/CardBrowser.tsx`**
   - *Archetype*: Explorer / Manager
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `EmptyState`, `SearchInput`.
   - *Key Sections*: Filter bar (search, state, difficulty, topic filter), Bulk Action Bar (`data-testid="bulk-action-bar"`), Card List/Grid items, Card Inspector/Detail preview.
   - *Invariants*: `data-testid="bulk-action-bar"`, select-all / batch operations, search/sort/filter state semantics, edit modal triggers.

3. **`src/components/flashcards/StudyLauncher.tsx`**
   - *Archetype*: Launcher / Wizard Surface
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `SectionHeader`.
   - *Key Sections*: Study preset selection (Due Cards, Cram All, Weakest, Custom), Queue shaping metrics preview, Scope filters (topics, tags, limit sliders).
   - *Invariants*: Preset configuration payload, launch handlers, topic filter triggers.

4. **`src/components/flashcards/FlashcardAnalyticsDashboard.tsx`**
   - *Archetype*: Analytics
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `SectionHeader`, `EmptyState`.
   - *Key Sections*: Retention rate KPI cards, Due Forecast Chart (`data-testid="forecast-workload-chart"`), Difficulty Breakdown, Weakest Cards Table.
   - *Invariants*: `data-testid="forecast-workload-chart"`, retention rate calculation formulas, time-range selectors (`7d`, `30d`, `all`).

5. **`src/components/flashcards/DuplicateDetectionDashboard.tsx`**
   - *Archetype*: Analytics / Audit
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `SectionHeader`, `EmptyState`.
   - *Key Sections*: Detection threshold slider, Duplicate clusters list (`data-testid="duplicate-group-*"`), Merge / Dismiss / Keep-Both action bars.
   - *Invariants*: `data-testid="duplicate-group-*"`, similarity scoring algorithm, merge & dismiss state transitions.

6. **`src/components/progress/StudyProgressView.tsx`**
   - *Archetype*: Analytics
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `SectionHeader`, `EmptyState`.
   - *Key Sections*: KPI Metric Grid (Retention, Streaks, Total Reviews, Active Time), Study Heatmap Calendar, Retention Curve / Mastered Breakdown Charts.
   - *Invariants*: Date calculations, streak logic, chart data feeds, filter selectors.

7. **`src/components/graph/KnowledgeGraph.tsx`**
   - *Archetype*: Visualization Workspace
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `EmptyState`.
   - *Key Sections*: Top Canvas Control Header (Zoom, Pan, Reset, Layout toggle, Hop filter), Main Canvas Stage with crisp HUD overlays, Side Node Inspector Drawer (connected nodes, topic link, direct jump).
   - *Invariants*: Canvas rendering loop, D3/force-directed physics, node clicking/hovering, multi-hop traversal logic (`1-hop`, `2-hop`, `3-hop`), test IDs and selection hooks.

8. **`src/components/ai/AIResearchStudio.tsx`**
   - *Archetype*: Studio / Copilot Workbench
   - *Workbench primitives*: `PageHeader`, `SurfaceCard`, `StatusPill`, `ToolbarButton`, `EmptyState`, `SectionHeader`.
   - *Key Sections*: Top Header & Handoff Action, Scope & Depth Configuration Strip (Source Scope, Depth pills, Output Format, Quick query chips, Topic History), Main Canvas (Prose Result, Citations & Evidence Panel, Uncertainties & Gaps, AI Outline), Bottom Query Console.
   - *Invariants*: All text labels & test assertions in `tests/unit/ai-research-copilot-ui.test.tsx` ("Chủ đề khảo cứu đang chọn:", "Độ sâu khảo cứu (Depth):", "Phạm vi nguồn nội bộ (Source Scope):", "Tài liệu Chuyên đề (Canonical)", "Ghi chú học tập (Notes)", "Tài liệu tham khảo (Resources)", "Thẻ ghi nhớ có sẵn (Flashcards)", "Obsidian Vault", "Câu trả lời (Answer)", "Bản tóm lược (Research Brief)", "Tạo Q&A Draft (Flashcards)"), Obsidian integration modal triggers, Handoff payload generation.

---

## 2. Invariants & Guardrails
- **Keyboard Scopes**: Preserve `shortcutScope.pushScope("flashcard_review")` and keys `1-4`, `Space`, `Ctrl/Cmd+E`, `Ctrl/Cmd+H` in `FlashcardReviewStudio`.
- **Test Selectors**: Preserve all `data-testid` values across all modules.
- **Chart Palette**: Standardize on workbench palette (neutral stone/slate gridlines, amber/indigo/emerald series, dark tooltip surfaces `#1c1917`).
- **No SaaS Noise**: Avoid shiny saturated gradients, glossy backdrop cards, and oversized icons.

---

## 3. Verification Commands
1. `npm run typecheck`
2. `npx vitest run tests/unit/flashcard-scheduler-transitions.test.ts tests/unit/flashcard-cloze-parsing.test.ts tests/unit/study-session-logic.test.ts tests/unit/study-analytics-ui-integration.test.tsx tests/unit/knowledge-graph-lib.test.ts tests/unit/duplicate-detection-dashboard.test.tsx tests/unit/ai-research-copilot-ui.test.tsx tests/integration/flashcard-review-studio.test.tsx tests/integration/topic-card-browser.test.tsx`
