# Knowledge OS

Multi-domain knowledge management system with SRS flashcards, research dashboard, AI insights, and collaboration features.

> **Version**: `v0.14.0`  
> **Status**: Production-Ready (macOS Local-First / Web)  
> **Quality**: 100% Tests Passing • 0 TypeScript Errors

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test -- --run

# Type check
npx tsc --noEmit
```

The application will be accessible at **http://localhost:3000** (or your designated Vite port).

---

## 🌟 Key Capabilities & Modules

### 1. 🧠 Intelligent Spaced Repetition (SRS Flashcards)
- **Multi-Modal Card Creation (F6.10)**: Fast selection popover, Cloze deletion parser (`{{c1::answer}}`), batch creation from notes, and duplicate prevention.
- **Enhanced Review Studio (F6.11)**: Ergonomic keyboard navigation (`Space`, `1..4`, `Ctrl+E` quick edit, `Ctrl+H` history), real-time session progress, priority filters (`due`, `new`, `low_retention`), and celebration summary with RFC 4180 CSV export.
- **Adaptive Algorithm Tuning & A/B Testing (F6.12)**: Ebbinghaus forgetting curve modeling ($R(t) = e^{-t/S}$), empirical retention tracking, response latency difficulty adjustment, Exam Countdown compressor, and deterministic 50/50 card A/B testing with Z-test p-value significance.

### 2. 📊 Cross-Domain Research Dashboard (F7.0)
- **Topic KPI Aggregator**: Holistic metrics (Notes, Flashcards, Resources, Retention Rate, Streak Days, Study Time).
- **Interactive Retention Trend Chart**: Responsive SVG visualization with 80% target benchmark and 7d/30d/90d/all-time filters.
- **Unified Research Timeline**: Cross-domain chronological event stream grouped into relative time buckets (`Hôm nay`, `Hôm qua`, `Tuần này`, `Tháng này`, `Cũ hơn`).
- **In-Memory BM25 Search**: Sub-millisecond full-text search with Vietnamese diacritic & Pāli/Sanskrit IAST accent normalization (`normalizeScholarText`).
- **Academic Export Engine**: Self-contained Markdown report with YAML frontmatter, UTF-8 BOM, and native Print-to-PDF support.

### 3. 📉 AI-Powered Insights & Predictive Analytics (F7.1)
- **Retention Probability Forecast**: Forecasts recall probability at 1d, 3d, 7d, 14d, and 30d with statistical 80% ($Z = 1.282$) and 95% ($Z = 1.960$) confidence intervals.
- **Optimal Review Pinpointing**: Accurately computes the exact date when memory retention drops below 80%.
- **Multi-Criteria Study Recommendations**: Ranks topics based on Urgency (40%), Weak Retention (35%), Exam Importance (15%), and Time-Budget Fit (10%) with explainable rationales and time filters (15m, 30m, 60m).
- **24×7 Circadian Heatmap**: Visualizes study volume and retention quality across weekdays and hours with "Peak Focus Hour" detection.
- **Smart Notifications & Rate Limiting**: Browser Web Notification API integration with anti-spam limits (max 3/24h, min 2h gap) and 1h/1d/3d snooze options.

---

## 🧭 Canonical Knowledge Domains

Knowledge OS is architected to organize and cross-reference structured research across four foundational traditions:

1. **☸️ Phật Học (Buddhism & Philosophy)**: Tipiṭaka (Sutta, Vinaya, Abhidhamma), Theravāda Abhidhamma (Citta, Cetasika, Rūpa, Nibbāna), Samatha & Vipassanā meditation, Madhyamaka & Yogācāra philosophy.
2. **☯️ Huyền Học Phương Đông (Eastern Metaphysics)**: Tam Thức (Kỳ Môn Độn Giáp, Thái Ất, Lục Nhâm), Kinh Dịch 64 Quẻ, Phong Thủy (Loan Đầu, Lý Khí), Tử Vi Đẩu Số & Bát Tự.
3. **🌿 Đông Y Học (Traditional Eastern Medicine)**: Âm Dương, Ngũ Hành, Tạng Tượng, Bát Cương Biện Chứng, Kinh Lạc và Dược học cổ truyền.
4. **📖 Ngôn Ngữ Học Cổ Điển (Classical Linguistics)**: Ngữ pháp Pāli, Sanskrit, Hán-Việt cổ, và Từ điển đối chiếu thuật ngữ liên ngôn ngữ (Multilingual Lexicon).

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS | High-performance, accessible UI |
| **Icons & Charts** | Lucide Icons, Pure React SVG | Zero heavy charting bundle bloat |
| **State & Storage** | Local-First, LocalStorage, SQLite/PostgreSQL | Ultra-fast client runtime, zero schema migration |
| **Search Engine** | Pure TS In-Memory Okapi BM25 | Relevance ranking with multilingual normalizers |
| **Testing** | Vitest, React Testing Library, Playwright | Comprehensive unit, integration, and E2E coverage |
| **API / Backend** | Express, Node.js, Prisma ORM | Secure bridges for local vaults and file attachments |

---

## 📁 Repository Structure

```
knowledge-os/
├── .github/                     # Official Phase Release Notes (v0.10.0 - v0.14.0)
├── docs/
│   ├── PROJECT_STATUS.md        # Comprehensive project status & phase roadmap
│   ├── adr/                     # Architectural Decision Records (ADR)
│   ├── specs/                   # BDD Gherkin functional specifications
│   ├── implementation-plans/    # Detailed phase execution plans
│   └── runbooks/                # Operations & backup runbooks
├── src/
│   ├── components/
│   │   ├── flashcards/          # Flashcard review studio, cards, hotkeys
│   │   ├── research/            # Topic dashboard, timeline, search, insights, heatmap
│   │   ├── modals/              # Creation, edit, and configuration dialogs
│   │   └── ui/                  # Accessible, theme-aware primitive components
│   ├── lib/
│   │   ├── retentionPredictionEngine.ts  # Exponential decay & CI models
│   │   ├── studyRecommendationEngine.ts  # Multi-criteria utility scoring
│   │   ├── studyPatternEngine.ts         # 24x7 matrix & peak hour analysis
│   │   ├── smartNotificationService.ts   # Rate limiting & Web Notifications API
│   │   ├── researchSearchEngine.ts       # BM25 full-text search
│   │   └── srsAlgorithmTuning.ts         # SM-2 & Adaptive scheduling algorithms
│   ├── types/                   # Strongly-typed TypeScript interfaces
│   └── server/                  # Local Express endpoints & Obsidian bridge
└── tests/
    ├── unit/                    # Fast isolated mathematical & component tests
    └── integration/             # Multi-component workflow verification tests
```

---

## 📜 Release History

- [v0.14.0 — Phase F7.1: AI-Powered Insights & Predictive Analytics](.github/RELEASE_NOTES_F7.1.md)
- [v0.13.0 — Phase F7.0: Research Dashboard (Multi-Domain Knowledge Hub)](.github/RELEASE_NOTES_F7.0.md)
- [v0.12.0 — Phase F6.12: SRS Algorithm Tuning & A/B Testing](.github/RELEASE_NOTES_F6.12.md)
- [v0.11.0 — Phase F6.11: Review Mode Enhancements](.github/RELEASE_NOTES_F6.11.md)
- [v0.10.0 — Phase F6.10: Note-to-Flashcard Integration](.github/RELEASE_NOTES_F6.10.md)

---

## 🗺️ Roadmap Ahead

- **Phase F8.0**: Collaboration Features (Shared topics, peer reviews, study group exchange).
- **Phase F9.0**: Mobile Companion App (React Native, offline-first sync, push notifications).

---

## 📄 License

MIT License. Designed and maintained for researchers, scholars, and lifelong learners.
