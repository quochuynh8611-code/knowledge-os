/**
 * NotebookLM Runtime Status Bridge Unit Tests (Phase F8.2 - Test-First RED)
 *
 * Requirements:
 * 1. Minimal presentation-only prop contract: 'unknown' | 'configured' | 'verified' | 'blocked'
 * 2. Header displays 'Chưa kiểm tra' when status is 'unknown'
 * 3. Header displays 'Đã cấu hình' or 'MCP khả dụng' when status is 'configured'
 * 4. Header displays 'Smoke đã xác minh' when status is 'verified'
 * 5. Header displays 'Audio Overview: Chưa khả dụng' when status is 'blocked'
 * 6. Modal preserves all 3 steps: 'Nguồn', 'Prompt', 'Kết quả'
 * 7. Rendering does not initiate live operations or external network calls
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotebookLMHeader } from '../../src/components/integrations/notebooklm/NotebookLMHeader';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import { Topic, Note, Resource } from '../../src/types';

// Minimal presentation-only contract
export type NotebookLMRuntimeStatus = 'unknown' | 'configured' | 'verified' | 'blocked';

const mockTopics: Topic[] = [
  {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp Toàn Thư',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc',
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học',
    description: 'Khoa thuật số định vị thời không.',
    content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần.',
    tags: ['Kỳ Môn'],
    studyProgress: {
      topicId: 'topic-ky-mon',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
];

const mockNotes: Note[] = [
  {
    id: 'note-km-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'Sinh Môn và Khai Môn',
    content: 'Ứng dụng thực tiễn của Sinh Môn...',
    type: 'insight',
    isPrivate: false,
    tags: ['Sinh Môn'],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-local-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'KyMonBiKip.pdf',
    type: 'pdf',
    filePath: 'KyMonBiKip.pdf',
    createdAt: '2026-08-20T10:00:00Z',
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
  }),
}));

describe('NotebookLM Runtime Status Bridge (Phase F8.2 - Test-First RED)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Test 1: Header renders "Chưa kiểm tra" when status is "unknown"
  it('1. Header displays "Chưa kiểm tra" badge when status is "unknown"', () => {
    const HeaderComponent = NotebookLMHeader as React.FC<any>;
    render(
      <HeaderComponent
        onClose={vi.fn()}
        topicTitle="Kỳ Môn Độn Giáp"
        runtimeStatus="unknown"
      />
    );

    expect(screen.getByRole('heading', { name: /NotebookLM/i })).toBeInTheDocument();
    expect(screen.getByText('Chưa kiểm tra')).toBeInTheDocument();
  });

  // Test 2: Header renders "Đã cấu hình" or "MCP khả dụng" when status is "configured"
  it('2. Header displays "Đã cấu hình" or "MCP khả dụng" when status is "configured"', () => {
    const HeaderComponent = NotebookLMHeader as React.FC<any>;
    render(
      <HeaderComponent
        onClose={vi.fn()}
        topicTitle="Kỳ Môn Độn Giáp"
        runtimeStatus="configured"
      />
    );

    expect(screen.getByText(/Đã cấu hình|MCP khả dụng/i)).toBeInTheDocument();
  });

  // Test 3: Header renders "Smoke đã xác minh" when status is "verified"
  it('3. Header displays "Smoke đã xác minh" when status is "verified"', () => {
    const HeaderComponent = NotebookLMHeader as React.FC<any>;
    render(
      <HeaderComponent
        onClose={vi.fn()}
        topicTitle="Kỳ Môn Độn Giáp"
        runtimeStatus="verified"
      />
    );

    expect(screen.getByText('Smoke đã xác minh')).toBeInTheDocument();
  });

  // Test 4: Header renders "Audio Overview: Chưa khả dụng" when status is "blocked"
  it('4. Header displays "Audio Overview: Chưa khả dụng" when status is "blocked"', () => {
    const HeaderComponent = NotebookLMHeader as React.FC<any>;
    render(
      <HeaderComponent
        onClose={vi.fn()}
        topicTitle="Kỳ Môn Độn Giáp"
        runtimeStatus="blocked"
      />
    );

    expect(screen.getByText('Audio Overview: Chưa khả dụng')).toBeInTheDocument();
  });

  // Test 5: Modal preserves all 3 workflow steps with runtimeStatus passed
  it('5. Modal preserves all 3 workflow steps ("Nguồn", "Prompt", "Kết quả") when rendering with runtimeStatus', () => {
    const ModalComponent = NotebookLMStudioModal as React.FC<any>;
    render(
      <ModalComponent
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopics[0]}
        runtimeStatus="verified"
      />
    );

    // Semantic queries for the 3 steps
    expect(screen.getByRole('button', { name: /Bước 1: Nguồn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bước 2: Prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bước 3: Kết quả/i })).toBeInTheDocument();

    // Verify runtime status is passed to header
    expect(screen.getByText('Smoke đã xác minh')).toBeInTheDocument();
  });

  // Test 6: Pure presentation - no live cloud operations or unexpected external fetch
  it('6. Rendering does not initiate live Cloud operations or external endpoints', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const ModalComponent = NotebookLMStudioModal as React.FC<any>;

    render(
      <ModalComponent
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopics[0]}
        runtimeStatus="configured"
      />
    );

    // Any fetch calls should only be standard local session sync (/api/research-sessions), never cloud or external endpoints
    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toMatch(/googleapis\.com|notebooklm\.google\.com|cloud/i);
    }
  });
});
