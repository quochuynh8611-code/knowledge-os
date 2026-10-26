/**
 * Academic Command Palette Engine Unit Test Suite (Phase 12A — ADR-116)
 *
 * Tests the Prefix-Aware Scholarly Query Intent Parser,
 * Studio Workflow Action Registry, and Omnibox Multi-Entity Search Engine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseAcademicCommandQuery,
  buildScholarlyWorkflowActions,
  searchAcademicCommandPalette,
  AcademicPaletteResultItem,
  ScholarlyWorkflowCallbacks,
} from '../../src/lib/academicCommandPaletteEngine';
import type { Topic, Note, Resource, ResearchExcerpt } from '../../src/types';
import type { Flashcard } from '../../src/types/flashcard';

const sampleTopics: Topic[] = [
  {
    id: 'topic-quantum',
    title: 'Cơ Học Lượng Tử & Rối Lượng Tử',
    slug: 'co-hoc-luong-tu',
    type: 'khoa-hoc-tu-nhien',
    categoryId: 'cat-physics',
    categoryName: 'Vật Lý',
    description: 'Nghiên cứu nguyên lý bất định Heisenberg và định lý Bell.',
    content: 'Nội dung cơ học lượng tử...',
    links: [],
    studyProgress: {
      topicId: 'topic-quantum',
      status: 'in_progress',
      progress: 75,
      interval: 4,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 1,
      timeSpent: 45,
    },
    tags: ['Physics', 'Quantum'],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'topic-memory',
    title: 'Kỹ Thuật Ghi Nhớ & Spaced Repetition',
    slug: 'ky-thuat-ghi-nho',
    type: 'khoa-hoc-xa-hoi',
    categoryId: 'cat-psychology',
    categoryName: 'Tâm Lý Học',
    description: 'Ứng dụng đường cong quên Ebbinghaus và thuật toán FSRS v5.',
    content: 'Nội dung kỹ thuật ghi nhớ...',
    links: [],
    studyProgress: {
      topicId: 'topic-memory',
      status: 'in_progress',
      progress: 60,
      interval: 3,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    tags: ['Memory', 'FSRS', 'ActiveRecall'],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },
];

const sampleNotes: Note[] = [
  {
    id: 'note-bell',
    topicId: 'topic-quantum',
    topicTitle: 'Cơ Học Lượng Tử & Rối Lượng Tử',
    title: 'Bất Đẳng Thức Bell và Thực Tại Định Xứ',
    content: 'Thí nghiệm Aspect 1982 xác nhận vi phạm bất đẳng thức Bell.',
    type: 'insight',
    isPrivate: false,
    tags: ['Bell', 'Quantum'],
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-02T11:00:00Z',
  },
];

const sampleResources: Resource[] = [
  {
    id: 'res-vaswani-2017',
    topicId: 'topic-quantum',
    topicTitle: 'Cơ Học Lượng Tử & Rối Lượng Tử',
    title: 'Attention Is All You Need',
    author: 'Ashish Vaswani',
    year: '2017',
    doi: '10.48550/arXiv.1706.03762',
    type: 'pdf',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'res-nature-deep',
    topicId: 'topic-memory',
    topicTitle: 'Kỹ Thuật Ghi Nhớ & Spaced Repetition',
    title: 'Human-level control through deep reinforcement learning',
    author: 'Volodymyr Mnih',
    year: '2015',
    doi: '10.1038/nature14236',
    type: 'pdf',
    createdAt: '2026-09-01T10:00:00Z',
  },
];

const sampleFlashcards: Flashcard[] = [
  {
    id: 'fc-ebbinghaus',
    topicId: 'topic-memory',
    type: 'basic',
    front: 'Đường cong quên Ebbinghaus mô tả điều gì?',
    back: 'Sự suy giảm khả năng lưu giữ ký ức theo thời gian nếu không được củng cố.',
    schedule: {
      id: 'sched-ebbinghaus',
      flashcardId: 'fc-ebbinghaus',
      stability: 18.2,
      difficulty: 3.5,
      dueAt: '2026-10-01T00:00:00Z',
      interval: 18,
      easeFactor: 2.5,
      repetitions: 6,
      lapses: 0,
      state: 'review',
      lastReviewedAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    },
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-02T11:00:00Z',
  },
];

const sampleExcerpts: ResearchExcerpt[] = [
  {
    id: 'exc-aspect',
    archivedDocumentId: 'res-vaswani-2017',
    topicId: 'topic-quantum',
    selectedText: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
    positionSelector: { pageNumber: 1 },
    highlightColor: '#fef08a',
    status: 'active',
    userNote: 'Mô hình tự chú ý thay thế hoàn toàn RNN/CNN.',
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-01T11:00:00Z',
  },
];

describe('Phase 12A Engine: Academic Command Palette & Workflow Router (ADR-116)', () => {
  let callbacks: ScholarlyWorkflowCallbacks;

  beforeEach(() => {
    callbacks = {
      onNavigateTab: vi.fn(),
      onOpenTopic: vi.fn(),
      onOpenNote: vi.fn(),
      onSelectResource: vi.fn(),
      onCopyCitekey: vi.fn(),
      onLookupDoi: vi.fn(),
      onOpenLiteratureMatrix: vi.fn(),
      onOpenManuscriptStudio: vi.fn(),
      onOpenObsidianBridge: vi.fn(),
      onTriggerQuickBackup: vi.fn(),
      onOpenFlashcardReview: vi.fn(),
    };
  });

  // ---------------------------------------------------------------------------
  // 1. Prefix Query Intent Detection
  // ---------------------------------------------------------------------------
  it('1. Accurately classifies prefix query intents: @citekey, doi, >command, ?semantic, general', () => {
    // Citekey mode
    const p1 = parseAcademicCommandQuery('@vaswani2017');
    expect(p1.mode).toBe('citekey');
    expect(p1.cleanQuery).toBe('vaswani2017');

    // DOI mode via prefix
    const p2 = parseAcademicCommandQuery('doi:10.1038/nature14539');
    expect(p2.mode).toBe('doi');
    expect(p2.extractedDoi).toBe('10.1038/nature14539');

    // DOI mode via embedded DOI pattern
    const p3 = parseAcademicCommandQuery('10.1038/nature14539');
    expect(p3.mode).toBe('doi');
    expect(p3.extractedDoi).toBe('10.1038/nature14539');

    // Command mode via >
    const p4 = parseAcademicCommandQuery('> manuscript');
    expect(p4.mode).toBe('command');
    expect(p4.cleanQuery).toBe('manuscript');

    // Semantic mode via ?
    const p5 = parseAcademicCommandQuery('? đường cong quên');
    expect(p5.mode).toBe('semantic');
    expect(p5.cleanQuery).toBe('đường cong quên');

    // General mode
    const p6 = parseAcademicCommandQuery('cơ học lượng tử');
    expect(p6.mode).toBe('general');
    expect(p6.cleanQuery).toBe('cơ học lượng tử');
  });

  // ---------------------------------------------------------------------------
  // 2. Citekey Mode (@key) Lookup
  // ---------------------------------------------------------------------------
  it('2. Surfaces matching citekeys in @ mode, displaying @citekey badge and executing action', () => {
    const results = searchAcademicCommandPalette(
      '@vaswani',
      {
        resources: sampleResources,
        topics: sampleTopics,
        notes: sampleNotes,
      },
      callbacks
    );

    expect(results.length).toBeGreaterThan(0);
    const item = results[0];
    expect(item.badge).toBe('@vaswani2017');
    expect(item.citekey).toBe('vaswani2017');
    expect(item.title).toContain('Attention Is All You Need');

    // Execute item action
    item.action();
    expect(callbacks.onSelectResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-vaswani-2017' })
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Direct DOI Detection & Quick Action Synthesis
  // ---------------------------------------------------------------------------
  it('3. Surfaces a high-priority action to lookup or open DOI when DOI string is entered', () => {
    const results = searchAcademicCommandPalette(
      '10.1038/nature14539',
      {
        resources: sampleResources,
      },
      callbacks
    );

    expect(results.length).toBeGreaterThan(0);
    const doiAction = results.find((r) => r.id === 'act-doi-lookup-10.1038/nature14539');
    expect(doiAction).toBeDefined();
    expect(doiAction?.title).toContain('10.1038/nature14539');
    expect(doiAction?.badge).toBe('DOI');

    doiAction?.action();
    expect(callbacks.onLookupDoi).toHaveBeenCalledWith('10.1038/nature14539');
  });

  // ---------------------------------------------------------------------------
  // 4. Command Prefix (>) Filtering
  // ---------------------------------------------------------------------------
  it('4. Filters exclusively for studio workflow commands when query starts with >', () => {
    const results = searchAcademicCommandPalette(
      '> ma trận',
      {
        resources: sampleResources,
        topics: sampleTopics,
        notes: sampleNotes,
      },
      callbacks
    );

    expect(results.length).toBeGreaterThan(0);
    // Every result must be an action/command, not a raw note/topic
    results.forEach((r) => {
      expect(r.entityType).toBe('command');
    });

    const matrixCommand = results.find((r) => r.id === 'act-literature-matrix');
    expect(matrixCommand).toBeDefined();
    matrixCommand?.action();
    expect(callbacks.onOpenLiteratureMatrix).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 5. Semantic / Hybrid RRF Mode (?) Retrieval
  // ---------------------------------------------------------------------------
  it('5. Uses Hybrid Knowledge Search in semantic mode (?) to retrieve related concepts', () => {
    const results = searchAcademicCommandPalette(
      '? củng cố trí nhớ dài hạn',
      {
        topics: sampleTopics,
        notes: sampleNotes,
        resources: sampleResources,
        flashcards: sampleFlashcards,
        excerpts: sampleExcerpts,
      },
      callbacks
    );

    expect(results.length).toBeGreaterThan(0);
    // Expect top result to be memory or Ebbinghaus related
    const memoryItem = results.find(
      (r) => r.title.includes('Kỹ Thuật Ghi Nhớ') || r.title.includes('Ebbinghaus')
    );
    expect(memoryItem).toBeDefined();
    expect(memoryItem?.badge).toMatch(/RRF|Semantic|FSRS/i);
  });

  // ---------------------------------------------------------------------------
  // 6. General Omnibox Multi-Entity Search
  // ---------------------------------------------------------------------------
  it('6. Searches across workflow actions, topics, notes, resources, and excerpts in general mode', () => {
    const results = searchAcademicCommandPalette(
      'Bell',
      {
        topics: sampleTopics,
        notes: sampleNotes,
        resources: sampleResources,
        flashcards: sampleFlashcards,
        excerpts: sampleExcerpts,
      },
      callbacks
    );

    expect(results.length).toBeGreaterThan(0);
    const hasNoteOrTopic = results.some(
      (r) => r.title.includes('Bell') || (r.description && r.description.includes('Bell'))
    );
    expect(hasNoteOrTopic).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 7. One-Click Guarded Snapshot Trigger
  // ---------------------------------------------------------------------------
  it('7. Invokes onTriggerQuickBackup when act-guarded-backup-snapshot is executed', () => {
    const actions = buildScholarlyWorkflowActions(callbacks);
    const backupAction = actions.find((a) => a.id === 'act-guarded-backup-snapshot');

    expect(backupAction).toBeDefined();
    backupAction?.action();
    expect(callbacks.onTriggerQuickBackup).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 8. Empty & Whitespace Query Safety
  // ---------------------------------------------------------------------------
  it('8. Returns default workflow and navigation commands safely without error on empty query', () => {
    const emptyResults = searchAcademicCommandPalette(
      '',
      {
        topics: sampleTopics,
        resources: sampleResources,
      },
      callbacks
    );

    expect(emptyResults.length).toBeGreaterThan(0);
    expect(emptyResults.some((r) => r.id === 'act-literature-matrix')).toBe(true);
    expect(emptyResults.some((r) => r.id === 'act-manuscript-studio')).toBe(true);

    const whitespaceResults = searchAcademicCommandPalette('   ', {}, callbacks);
    expect(whitespaceResults.length).toBeGreaterThan(0);
  });
});
