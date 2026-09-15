# Knowledge OS

Local-first, multi-domain learning and knowledge management system with spaced repetition flashcards, customizable topic taxonomy, research notes, AI research integration, and EPUB reading library.

> **Status**: Production-Ready (macOS Local-First / Web & Persistent DB)  
> **Quality**: 100% Tests Passing • 0 TypeScript Errors

---

> _Screenshots will be added after the commercial UI baseline is finalized._

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run database migration / schema push
npx prisma db push

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

### 1. 🧭 Dynamic Root Categories & Topic Tree
- **User-Defined Taxonomy**: Create, edit, and organize research categories dynamically based on your specialized fields.
- **Hierarchical Topic Tree**: Nest sub-topics, track study status (`not_started`, `in_progress`, `completed`), and manage topic-level metadata.
- **Next Action Recommendation**: Actionable learning strip guiding daily study sessions for prioritized topics.

### 2. 📝 Structured Markdown Notes & Knowledge Linking
- **Bi-directional Knowledge Linking**: Cross-reference topics, concepts, and external references.
- **Tagging & Filtering**: Multi-tag taxonomy with instant full-text filtering.
- **Local Reference Resolution**: Direct link preview and Obsidian vault file opening support.

### 3. 🧠 Intelligent Spaced Repetition (SRS Flashcards)
- **Multi-Modal Card Creation**: Standard and cloze-deletion cards created directly or extracted from study notes.
- **SM-2 Spaced Repetition**: Adaptive review scheduling based on recall quality, response interval, and ease factor.
- **Ergonomic Review Studio**: Keyboard shortcuts (`Space`, `1..4`), session progress tracking, and retention metrics.

### 4. 📚 Thư Viện Sách (EPUB Reader)
- **Local-First Book Reading**: Dedicated library interface for structured ebook reading.
- **Multiple Book Sources**:
  - `docs/books`: Place standard `.epub` files into the local directory and click **Làm mới danh sách** to load books.
  - **Obsidian Vault**: Directly select and read EPUB files discovered within your connected local Obsidian vault.
- **In-Memory Sanitization**: Robust runtime XML/XHTML sanitizer handling unescaped entities and bare ampersands safely in-memory without mutating source files.
- **Persistent Reading State**: Automatic CFI position bookmarking per book, font size preferences, and responsive reading layout.
- *Note*: Books are read directly from local files; direct server-side file upload is not implemented.

### 5. 🔬 AI Research Studio & Google NotebookLM Integration
- **Source Packaging**: Assemble markdown notes and research sources into versioned study packages.
- **Task Prompt Generation**: Automated study prompts formatted for NotebookLM and AI research assistants.
- **Artifact Review Drawer**: Inspect and audit research artifacts before incorporating them into your topic notes.

### 6. 📊 Progress Dashboard & In-Memory Search
- **KPI Metrics**: Topic completion, active retention rates, study time, and streak tracking.
- **In-Memory BM25 Search**: Sub-millisecond full-text search with Vietnamese diacritic and accent normalization.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS | High-performance, accessible UI with 100% Dark Mode |
| **State & Storage** | Local-First, LocalStorage, PostgreSQL / Prisma ORM | Relational durability, server-canonical startup reconciliation |
| **EPUB Engine** | React Reader, EPUB.js, JSZip | In-memory XHTML sanitization & local file reading |
| **Search Engine** | Pure TS In-Memory Okapi BM25 | Relevance ranking with multilingual normalizers |
| **Testing** | Vitest, React Testing Library, Playwright | Comprehensive unit, integration, and E2E coverage |
| **API / Backend** | Express, Node.js, Prisma Client | REST endpoints for Categories, Topics, Notes, Flashcards, Sync |

---

## 📁 Repository Structure

```
knowledge-os/
├── docs/
│   ├── PROJECT_STATUS.md        # Comprehensive project status & phase roadmap
│   ├── adr/                     # Architectural Decision Records (ADR-001+)
│   ├── specs/                   # BDD Gherkin functional specifications
│   ├── releases/                # Version and commercial baseline release notes
│   └── runbooks/                # Operations, maintenance & backup runbooks
├── prisma/
│   └── schema.prisma            # PostgreSQL schema
├── scripts/
│   └── maintenance/             # Guarded backup, dry-run, and reset utilities
├── src/
│   ├── components/
│   │   ├── dashboard/           # Overview KPI cards & learning hero
│   │   ├── docs/                # EPUB Book Library & reader components
│   │   ├── flashcards/          # Flashcard review studio & cards
│   │   ├── layout/              # Sidebar navigation & header
│   │   └── topics/              # Topic tree, detail, and next action strip
│   ├── context/                 # DataContext with canonical startup hydration
│   ├── lib/
│   │   ├── epubXhtmlSanitizer.ts # In-memory XML entity & character sanitizer
│   │   ├── storage.ts           # Schema versioning & storage resilience
│   │   └── validation.ts        # Zod runtime data validation schemas
│   └── server/
│       └── routes/              # Express API & sync routes
└── tests/
    ├── unit/                    # Unit & component test suites
    ├── integration/             # Integration workflows
    └── e2e/                     # End-to-end browser specifications
```

---

## 🛡️ Commercial Baseline Maintenance & Reset

> [!CAUTION]
> Database reset scripts permanently remove data. They are designed strictly for maintainers and local operators preparing a clean commercial baseline.

To perform a clean commercial reset:

1. **Create a fresh local backup**:
   ```bash
   npx tsx --env-file=.env scripts/maintenance/commercial-reset-backup.ts
   ```
2. **Run a non-destructive dry-run audit**:
   ```bash
   npx tsx --env-file=.env scripts/maintenance/commercial-reset-db.ts --dry-run
   ```
3. **Execute with explicit confirmation (Maintainer only)**:
   ```bash
   npx tsx --env-file=.env scripts/maintenance/commercial-reset-db.ts --execute --confirm="XOA TOAN BO DATA CA NHAN"
   ```
4. **Verify post-reset invariants**:
   ```bash
   npx tsx --env-file=.env scripts/maintenance/commercial-reset-audit.ts
   ```

---

## 🔧 Troubleshooting

### 1. EPUB Book XML Parsing Errors
- **Symptom**: `xmlParseEntityRef: no name` or entity parsing errors when opening certain EPUB files.
- **Resolution**: Knowledge OS includes an automatic in-memory XHTML sanitizer that safely converts named entities, bare ampersands (`&`), and unescaped characters before parsing. The original file on disk is never modified. If an EPUB has damaged ZIP compression, the reader will display a clear error message.

### 2. Stale Client State / Category Synchronization
- **Symptom**: Previously removed categories appearing after reloading or browser session restoration.
- **Resolution**: The system uses server-canonical startup reconciliation and storage version invalidation. Unknown categories in local storage that do not exist on the server are automatically reconciled without requiring a destructive `localStorage.clear()`.

---

## 📄 License

MIT License. Designed and maintained for researchers, scholars, and lifelong learners.
