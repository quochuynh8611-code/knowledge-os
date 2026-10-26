# Technical Specification: Phase 11 — Obsidian & E-Ink Scholarly Round-Trip Bridge

## 1. Overview & Architectural Goals
Phase 11 introduces a high-fidelity interoperability bridge between the Knowledge OS academic research workstation, Obsidian Markdown vaults (specifically enriched for Dataview queries), and distraction-free E-Ink reading devices (Onyx Boox, Kindle, Supernote).

Key capabilities implemented in Phase 11A (`src/lib/academicVaultSync.ts`):
1. **Dataview-Compatible Frontmatter**: Topics and literature notes exported with typed YAML frontmatter (`citekeys`, `doi`, `fsrs_avg_stability`, `fsrs_avg_difficulty`, `highlight_count`, `flashcard_count`).
2. **Standard Callout Blocks**: Excerpts rendered as `> [!quote]` and FSRS cards rendered as `> [!question]`.
3. **Lossless Markdown + YAML Parser**: Bi-directional parsing of externally modified Markdown files back into structured entities without corrupting KaTeX math formulas or Pandoc citations.
4. **E-Ink High-Contrast Study Pack Compiler**: Compiles comprehensive learning packages with table of contents, literature reviews, and active recall self-test sections separating masked question prompts from answer keys.
5. **Virtual File Map Generator**: Deterministic map generator for ZIP packaging and direct filesystem syncing.

---

## 2. Type Definitions & Interfaces

```typescript
export interface ScholarlyTopicExportInput {
  topic: Topic;
  notes?: Note[];
  resources?: Resource[];
  excerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
}

export interface ParsedWikiLink {
  targetTitle: string;
  displayText?: string;
  linkType: LinkType;
  strength: number;
  notes?: string;
}

export interface ParsedExcerptCallout {
  selectedText: string;
  locator?: string;
  userNote?: string;
}

export interface ParsedScholarlyMarkdownResult {
  title: string;
  slug?: string;
  domain?: string;
  category?: string;
  tags: string[];
  citekey?: string;
  doi?: string;
  author?: string;
  year?: string;
  stance?: ScholarlyStance;
  bodyContent: string;
  wikiLinks: ParsedWikiLink[];
  excerpts: ParsedExcerptCallout[];
  rawFrontmatter: Record<string, unknown>;
}

export interface EInkStudyPackInput {
  title?: string;
  author?: string;
  topics: Topic[];
  notes?: Note[];
  resources?: Resource[];
  excerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
  includeSelfTest?: boolean;
  includeLiteratureMatrix?: boolean;
}

export interface VaultVirtualFile {
  path: string;
  content: string;
  category: 'moc' | 'topic' | 'note' | 'literature' | 'eink-pack';
}
```

---

## 3. Function Contracts

### `formatScholarlyTopicMarkdown(input: ScholarlyTopicExportInput): string`
- Formats a topic into complete Markdown with YAML frontmatter.
- Computes FSRS telemetry averages (`fsrs_avg_stability`, `fsrs_avg_difficulty`) from associated cards.
- Gathers citekeys from associated resources.
- Appends excerpts as `> [!quote]` callouts and cards as `> [!question]` callouts.

### `formatScholarlyLiteratureNote(resource: Resource, options?: { excerpts?: ResearchExcerpt[]; notes?: Note[]; topicTitle?: string }): { fileName: string; citekey: string; content: string }`
- Generates a literature note file named `@citekey.md`.
- Formats frontmatter with `citekey`, `doi`, `author`, `year`, `stance`, `topic`.
- Lists all highlighted excerpts from that resource.

### `parseScholarlyMarkdownNote(markdown: string): ParsedScholarlyMarkdownResult`
- Safely splits YAML frontmatter from body content.
- Parses frontmatter keys into typed fields.
- Scans `[[Wiki Links]]` and typed knowledge links (`- **TYPE** (Trọng số S/5): [[Target]]`).
- Extracts `> [!quote]` callouts and strips them from clean `bodyContent`.

### `compileEInkStudyPackMarkdown(input: EInkStudyPackInput): string`
- Assembles an all-in-one distraction-free document for E-Ink e-readers.
- Masks cloze deletion answers in the self-test section (`[...]`), revealing them only in the separate answer key section at the end of the document.

### `buildScholarlyVaultFileMap(data: { topics: Topic[]; notes?: Note[]; resources?: Resource[]; categories?: Category[]; excerpts?: ResearchExcerpt[]; flashcards?: Flashcard[]; vaultName?: string }): VaultVirtualFile[]`
- Produces a complete deterministic in-memory file structure.

---

## 4. Quality Invariants
- Zero `any` in TypeScript types.
- Pure functions without IO side effects or global mutations.
- Hermetic test guard compliance: tests must run without external network requests.
- Zero-Default clean slate compliance: functions must handle empty inputs cleanly without returning NaN or erroring.
