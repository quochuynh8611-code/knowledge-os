/**
 * Academic Command Palette UI & Hook Integration Test Suite (Phase 12B — ADR-116)
 *
 * Tests:
 * 1. Quick prefix pills and active mode badge in CommandPalette component.
 * 2. Item badge rendering for scholarly items.
 * 3. Hook integration with @citekey and doi: queries.
 * 4. Hook integration with ? semantic RRF queries.
 * 5. Scholarly workflow studio routing execution (>).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { CommandPalette, CommandPaletteProps } from '../../src/components/search/CommandPalette';
import { useCommandPalette } from '../../src/hooks/useCommandPalette';
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
    content: 'Củng cố trí nhớ dài hạn và đường cong quên...',
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
    doi: '10.1038/nature14539',
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
    selectedText: 'The dominant sequence transduction models are based on complex recurrent neural networks.',
    positionSelector: { pageNumber: 1 },
    highlightColor: '#fef08a',
    status: 'active',
    userNote: 'Mô hình tự chú ý thay thế hoàn toàn RNN/CNN.',
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-01T11:00:00Z',
  },
];

describe('Phase 12B UI Integration: CommandPalette & useCommandPalette Upgrades (ADR-116)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Scholarly Prefix Mode Badge & Quick Prefix Pills
  // ---------------------------------------------------------------------------
  it('1. Renders quick scholarly prefix pills and active mode indicator badge', () => {
    const handleQueryChange = vi.fn();

    const { rerender } = render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        query=""
        onQueryChange={handleQueryChange}
        items={[]}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecuteItem={vi.fn()}
      />
    );

    // Verify all 4 quick prefix pills exist
    const citekeyPill = screen.getByTestId('palette-prefix-pill-citekey');
    const doiPill = screen.getByTestId('palette-prefix-pill-doi');
    const semanticPill = screen.getByTestId('palette-prefix-pill-semantic');
    const commandPill = screen.getByTestId('palette-prefix-pill-command');

    expect(citekeyPill).toBeInTheDocument();
    expect(doiPill).toBeInTheDocument();
    expect(semanticPill).toBeInTheDocument();
    expect(commandPill).toBeInTheDocument();

    // Clicking citekey pill triggers onQueryChange('@')
    fireEvent.click(citekeyPill);
    expect(handleQueryChange).toHaveBeenCalledWith('@');

    // Rerender with query="@vaswani" -> mode badge appears
    rerender(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        query="@vaswani"
        onQueryChange={handleQueryChange}
        items={[]}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecuteItem={vi.fn()}
      />
    );

    const modeBadge = screen.getByTestId('palette-mode-badge');
    expect(modeBadge).toBeInTheDocument();
    expect(modeBadge).toHaveTextContent(/citekey/i);
  });

  // ---------------------------------------------------------------------------
  // 2. Result Item Badge Rendering
  // ---------------------------------------------------------------------------
  it('2. Renders item badge when item.badge is defined', () => {
    const items = [
      {
        id: 'citekey-vaswani2017',
        title: 'Attention Is All You Need',
        description: 'Vaswani (2017)',
        category: 'Hành động nhanh' as const,
        badge: '@vaswani2017',
        action: vi.fn(),
      },
      {
        id: 'act-literature-matrix',
        title: 'Mở Ma Trận Tổng Quan Tài Liệu',
        category: 'Hành động nhanh' as const,
        badge: 'Phase 8',
        action: vi.fn(),
      },
    ];

    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        query="Attention"
        onQueryChange={vi.fn()}
        items={items}
        selectedIndex={0}
        onSelectIndex={vi.fn()}
        onExecuteItem={vi.fn()}
      />
    );

    const badge1 = screen.getByTestId('palette-item-badge-citekey-vaswani2017');
    expect(badge1).toBeInTheDocument();
    expect(badge1).toHaveTextContent('@vaswani2017');

    const badge2 = screen.getByTestId('palette-item-badge-act-literature-matrix');
    expect(badge2).toBeInTheDocument();
    expect(badge2).toHaveTextContent('Phase 8');
  });

  // ---------------------------------------------------------------------------
  // 3. Hook Integration with @citekey and doi: Queries
  // ---------------------------------------------------------------------------
  it('3. Hook useCommandPalette handles @citekey and doi: queries when provided academicData', () => {
    const onSelectResource = vi.fn();
    const onLookupDoi = vi.fn();

    const { result } = renderHook(() =>
      useCommandPalette({
        academicData: {
          resources: sampleResources,
          topics: sampleTopics,
          notes: sampleNotes,
        },
        scholarlyCallbacks: {
          onSelectResource,
          onLookupDoi,
        },
      })
    );

    // Test @citekey search
    act(() => {
      result.current.setQuery('@vaswani');
    });

    const citekeyItems = result.current.filteredItems;
    expect(citekeyItems.length).toBeGreaterThan(0);
    const vaswaniItem = citekeyItems.find((it) => it.id === 'citekey-vaswani2017');
    expect(vaswaniItem).toBeDefined();
    expect(vaswaniItem?.badge).toBe('@vaswani2017');

    // Execute item
    act(() => {
      result.current.executeItem(vaswaniItem!);
    });
    expect(onSelectResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-vaswani-2017' })
    );

    // Test DOI search
    act(() => {
      result.current.setQuery('10.1038/nature14539');
    });

    const doiItems = result.current.filteredItems;
    expect(doiItems.length).toBeGreaterThan(0);
    const doiAction = doiItems.find((it) => it.id.includes('act-doi-lookup'));
    expect(doiAction).toBeDefined();
    expect(doiAction?.badge).toBe('DOI');

    act(() => {
      result.current.executeItem(doiAction!);
    });
    expect(onLookupDoi).toHaveBeenCalledWith('10.1038/nature14539');
  });

  // ---------------------------------------------------------------------------
  // 4. Hook Integration with ? Semantic RRF Search
  // ---------------------------------------------------------------------------
  it('4. Hook useCommandPalette invokes semantic search when query starts with ?', () => {
    const { result } = renderHook(() =>
      useCommandPalette({
        academicData: {
          topics: sampleTopics,
          notes: sampleNotes,
          resources: sampleResources,
          flashcards: sampleFlashcards,
          excerpts: sampleExcerpts,
        },
      })
    );

    act(() => {
      result.current.setQuery('? củng cố trí nhớ dài hạn');
    });

    const semanticItems = result.current.filteredItems;
    expect(semanticItems.length).toBeGreaterThan(0);
    expect(semanticItems.some((it) => it.badge && /RRF|Semantic|FSRS/i.test(it.badge))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Scholarly Workflow Actions Execution (>)
  // ---------------------------------------------------------------------------
  it('5. Hook useCommandPalette filters workflow actions with > and triggers callbacks on execute', () => {
    const onOpenLiteratureMatrix = vi.fn();
    const onOpenManuscriptStudio = vi.fn();

    const { result } = renderHook(() =>
      useCommandPalette({
        scholarlyCallbacks: {
          onOpenLiteratureMatrix,
          onOpenManuscriptStudio,
        },
      })
    );

    act(() => {
      result.current.setQuery('> ma trận');
    });

    const matrixItems = result.current.filteredItems;
    expect(matrixItems.length).toBeGreaterThan(0);
    const matrixItem = matrixItems.find((it) => it.id === 'act-literature-matrix');
    expect(matrixItem).toBeDefined();

    act(() => {
      result.current.executeItem(matrixItem!);
    });
    expect(onOpenLiteratureMatrix).toHaveBeenCalledTimes(1);

    // Manuscript studio test
    act(() => {
      result.current.setQuery('> bản thảo');
    });

    const manuscriptItems = result.current.filteredItems;
    expect(manuscriptItems.length).toBeGreaterThan(0);
    const manuscriptItem = manuscriptItems.find((it) => it.id === 'act-manuscript-studio');
    expect(manuscriptItem).toBeDefined();

    act(() => {
      result.current.executeItem(manuscriptItem!);
    });
    expect(onOpenManuscriptStudio).toHaveBeenCalledTimes(1);
  });
});
