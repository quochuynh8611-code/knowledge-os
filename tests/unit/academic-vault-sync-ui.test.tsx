/**
 * Academic Vault Sync UI Integration Tests (Phase 11B — ADR-115)
 *
 * Tests the scholarly upgrades to ObsidianBridgeModal:
 * 1. Scholarly Dataview Topic Note Copy & Feedback
 * 2. High-Contrast E-Ink Study Pack Compilation & Download
 * 3. Scholarly Vault Virtual File Map Telemetry Summary
 * 4. Round-Trip Obsidian Markdown Import & Live Parsing Preview
 * 5. Round-Trip Ingestion Commit to Workspace
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ObsidianBridgeModal } from '../../src/components/integrations/ObsidianBridgeModal';
import * as academicVaultSync from '../../src/lib/academicVaultSync';
import { Topic, Note, Resource, Category, ResearchExcerpt } from '../../src/types';
import { Flashcard } from '../../src/types/flashcard';

const mockTopics: Topic[] = [
  {
    id: 'topic-quantum',
    title: 'Vật Lý Lượng Tử & Rối Lượng Tử',
    slug: 'vat-ly-luong-tu-roi-luong-tu',
    type: 'khoa-hoc-tu-nhien',
    categoryId: 'cat-physics',
    categoryName: 'Vật Lý',
    description: 'Nghiên cứu hiện tượng vướng víu lượng tử.',
    content: 'Hiện tượng rối lượng tử vi phạm bất đẳng thức Bell: $E(a,b) = -\\vec{a} \\cdot \\vec{b}$.',
    tags: ['Physics', 'Quantum'],
    studyProgress: {
      topicId: 'topic-quantum',
      status: 'in_progress',
      progress: 75,
      interval: 7,
      easeFactor: 2.6,
      repetitions: 4,
      totalNotes: 2,
      timeSpent: 120,
    },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
    links: [],
  },
];

const mockNotes: Note[] = [
  {
    id: 'note-epr',
    topicId: 'topic-quantum',
    topicTitle: 'Vật Lý Lượng Tử & Rối Lượng Tử',
    title: 'Nghịch lý EPR & Bất đẳng thức Bell',
    content: 'Nghịch lý EPR và định lý Bell chứng minh cơ học lượng tử là bất định xứ.',
    type: 'insight',
    isPrivate: false,
    tags: ['EPR', 'Bell-Inequality'],
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-epr-1935',
    topicId: 'topic-quantum',
    topicTitle: 'Vật Lý Lượng Tử & Rối Lượng Tử',
    title: 'Can Quantum-Mechanical Description of Physical Reality be Considered Complete?',
    type: 'pdf',
    author: 'Albert Einstein',
    year: '1935',
    doi: '10.1103/PhysRev.47.777',
    filePath: 'EPR1935.pdf',
    createdAt: '2026-09-01T10:00:00Z',
  },
];

const mockCategories: Category[] = [
  {
    id: 'cat-physics',
    name: 'Vật Lý',
    slug: 'vat-ly',
    type: 'khoa-hoc-tu-nhien',
    description: 'Vật lý lý thuyết',
  },
];

const mockExcerpts: ResearchExcerpt[] = [
  {
    id: 'exc-1',
    archivedDocumentId: 'res-epr-1935',
    topicId: 'topic-quantum',
    selectedText: 'No reasonable definition of reality could be expected to permit this.',
    positionSelector: { pageNumber: 3 },
    highlightColor: '#fef08a',
    status: 'active',
    userNote: 'Einstein phản đối tác động ma quái từ xa.',
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-01T11:00:00Z',
  },
];

const mockFlashcards: Flashcard[] = [
  {
    id: 'fc-1',
    topicId: 'topic-quantum',
    type: 'basic',
    front: 'Bất đẳng thức Bell phát biểu điều gì?',
    back: 'Không có lý thuyết biến ẩn định xứ nào tái tạo được toàn bộ kết quả của cơ học lượng tử.',
    schedule: {
      id: 'sched-1',
      flashcardId: 'fc-1',
      stability: 14.5,
      difficulty: 4.8,
      dueAt: '2026-10-01T00:00:00Z',
      interval: 14,
      easeFactor: 2.5,
      repetitions: 5,
      lapses: 0,
      state: 'review',
      lastReviewedAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    },
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-02T11:00:00Z',
  },
];

const mockAddNote = vi.fn().mockReturnValue('new-note-id-123');
const mockAddExcerpt = vi.fn().mockImplementation((e) => Promise.resolve(e));
const mockAddKnowledgeLink = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    categories: mockCategories,
    researchExcerpts: mockExcerpts,
    flashcards: mockFlashcards,
    addNote: mockAddNote,
    addExcerpt: mockAddExcerpt,
    addKnowledgeLink: mockAddKnowledgeLink,
  }),
}));

describe('Phase 11B UI Integration: ObsidianBridgeModal Scholarly & E-Ink Upgrades (ADR-115)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: Scholarly Dataview Note Copy & Preview
  // ---------------------------------------------------------------------------
  it('1. Copies enriched Scholarly Dataview Markdown to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const copyScholarlyBtn = screen.getByTestId('btn-copy-scholarly-dataview-note');
    expect(copyScholarlyBtn).toBeInTheDocument();

    fireEvent.click(copyScholarlyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];

    // Verify Dataview Frontmatter and Scholarly Callouts
    expect(copiedText).toContain('citekeys:');
    expect(copiedText).toContain('@einstein1935');
    expect(copiedText).toContain('highlight_count: 1');
    expect(copiedText).toContain('fsrs_avg_stability: 14.5');
    expect(copiedText).toContain('> [!quote] Trích đoạn');
    expect(copiedText).toContain('> No reasonable definition of reality could be expected to permit this.');

    await waitFor(() => {
      expect(screen.getByTestId('scholarly-copy-feedback')).toBeInTheDocument();
      expect(screen.getByTestId('scholarly-copy-feedback')).toHaveTextContent(/Đã sao chép Scholarly Dataview Note/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: E-Ink Study Pack Download & Preview
  // ---------------------------------------------------------------------------
  it('2. Compiles E-Ink Study Pack Markdown, initiates download and displays preview', async () => {
    const mockObjectUrl = 'blob:http://localhost:3000/mock-eink-pack';
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
    window.URL.revokeObjectURL = vi.fn();

    const compileSpy = vi.spyOn(academicVaultSync, 'compileEInkStudyPackMarkdown');

    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const downloadEInkBtn = screen.getByTestId('btn-download-eink-study-pack');
    expect(downloadEInkBtn).toBeInTheDocument();

    fireEvent.click(downloadEInkBtn);

    expect(compileSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();

    // Verify preview box appears
    await waitFor(() => {
      const previewBox = screen.getByTestId('eink-pack-preview-box');
      expect(previewBox).toBeInTheDocument();
      expect(previewBox).toHaveTextContent(/E-INK STUDY PACK/i);
      expect(previewBox).toHaveTextContent(/MỤC LỤC/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Virtual Vault File Map Telemetry
  // ---------------------------------------------------------------------------
  it('3. Displays virtual vault file counts (Topics, Literature Notes, E-Ink Packs)', () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const summary = screen.getByTestId('scholarly-vault-file-summary');
    expect(summary).toBeInTheDocument();

    // Should indicate 1 Topic, 1 Literature Note (@einstein1935), and E-Ink Study Pack
    expect(summary).toHaveTextContent(/1/); // Topic count
    expect(summary).toHaveTextContent(/Literature/i);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: Round-Trip Markdown Import & Live Parsing Preview
  // ---------------------------------------------------------------------------
  it('4. Previews parsed metadata live when Obsidian Markdown is entered into the round-trip input', async () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const importSection = screen.getByTestId('roundtrip-import-section');
    expect(importSection).toBeInTheDocument();

    const input = screen.getByTestId('roundtrip-markdown-input');
    const testMarkdown = `---
title: "Nguyên Lý Bất Định Heisenberg"
tags:
  - Quantum
  - Physics
citekey: "@heisenberg1927"
doi: "10.1007/BF01397280"
---
# Nguyên Lý Bất Định Heisenberg

Hệ thức bất định: $\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}$.
Liên kết với [[Vật Lý Lượng Tử & Rối Lượng Tử]].

> [!quote] Trích dẫn then chốt
> Càng xác định vị trí chính xác bao nhiêu, xung lượng càng bất định bấy nhiêu.
`;

    fireEvent.change(input, { target: { value: testMarkdown } });

    await waitFor(() => {
      const preview = screen.getByTestId('roundtrip-parsed-preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveTextContent('Nguyên Lý Bất Định Heisenberg');
      expect(preview).toHaveTextContent(/2/); // 2 tags
      expect(preview).toHaveTextContent(/1/); // 1 wiki link
      expect(preview).toHaveTextContent(/1/); // 1 excerpt
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Round-Trip Ingestion Commit to Workspace
  // ---------------------------------------------------------------------------
  it('5. Clicking confirm import commits parsed note to workspace via addNote and shows success', async () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const input = screen.getByTestId('roundtrip-markdown-input');
    const testMarkdown = `---
title: "Hạt Trong Giếng Thế Sâu Vô Hạn"
tags:
  - Quantum
  - WaveFunction
---
Hàm sóng lượng tử $E_n = \\frac{n^2 \\pi^2 \\hbar^2}{2mL^2}$.
`;

    fireEvent.change(input, { target: { value: testMarkdown } });

    const importBtn = screen.getByTestId('btn-confirm-roundtrip-import');
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);

    expect(mockAddNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hạt Trong Giếng Thế Sâu Vô Hạn',
        tags: ['Quantum', 'WaveFunction'],
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId('roundtrip-import-success')).toBeInTheDocument();
      expect(screen.getByTestId('roundtrip-import-success')).toHaveTextContent(/Đã nhập thành công/i);
    });
  });
});
