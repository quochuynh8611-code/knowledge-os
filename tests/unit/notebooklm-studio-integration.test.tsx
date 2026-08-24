/**
 * NotebookLM Studio Modal UI Integration Test Suite (Phase 2b)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature (Scenario 7)
 * Target: src/components/integrations/NotebookLMStudioModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import * as notebooklmLib from '../../src/lib/notebooklm';

const mockTopics = [
  {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp Toàn Thư',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc' as const,
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học',
    description: 'Khoa thuật số định vị thời không.',
    content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần.',
    tags: ['Kỳ Môn'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
  {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc' as const,
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm.',
    content: 'Tâm là thực tại nhận biết cảnh.',
    tags: ['Abhidharma'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
];

const mockNotes = [
  {
    id: 'note-km-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'Sinh Môn và Khai Môn',
    content: 'Ứng dụng thực tiễn của Sinh Môn trong trạch cát...',
    type: 'insight' as const,
    tags: ['Sinh Môn'],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources = [
  {
    id: 'res-local-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'KyMonBiKip.pdf',
    type: 'pdf' as const,
    filePath: 'KyMonBiKip.pdf',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
  }),
}));

describe('ADR-012 Phase 2b: NotebookLM Studio Modal Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Rendering state
  // ---------------------------------------------------------------------------
  it('1. Does not render when isOpen is false', () => {
    const { container } = render(<NotebookLMStudioModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Renders header, topic selector, external link, source preview, and artifacts locker when isOpen is true', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText(/Google NotebookLM Research Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Chủ đề đang đóng gói nguồn:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở Google NotebookLM/i })).toHaveAttribute(
      'href',
      'https://notebooklm.google.com/'
    );
    expect(screen.getByRole('button', { name: /Sao chép nguồn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải File Nguồn/i })).toBeInTheDocument();
    expect(screen.getByText(/Kho Kết Quả Từ NotebookLM/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Copy Source Document action
  // ---------------------------------------------------------------------------
  it('3. Clicking "Sao chép nguồn" copies 5-part source doc to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const copyButton = screen.getByRole('button', { name: /Sao chép nguồn/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];

    expect(copiedText).toContain('TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)');
    expect(copiedText).toContain('CHỦ ĐỀ: KỲ MÔN ĐỘN GIÁP TOÀN THƯ');
    expect(copiedText).toContain('[PHẦN 1: TÓM TẮT ĐỊNH VỊ KHÁI NIỆM]');
    expect(copiedText).toContain('[PHẦN 2: NỘI DUNG LUẬN THUYẾT & NGUYÊN BẢN KINH ĐIỂN]');
    expect(copiedText).toContain('Sinh Môn và Khai Môn');

    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Download Source File action
  // ---------------------------------------------------------------------------
  it('4. Clicking "Tải File Nguồn (.md)" generates Markdown blob download', () => {
    const mockObjectUrl = 'blob:http://localhost:3000/mock-md-uuid';
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
    window.URL.revokeObjectURL = vi.fn();

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const downloadButton = screen.getByRole('button', { name: /Tải File Nguồn/i });
    fireEvent.click(downloadButton);

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Artifact Locker Form & CRUD
  // ---------------------------------------------------------------------------
  it('5. Submitting new artifact saves it to locker and displays it in list', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Open add artifact form
    const toggleButton = screen.getByRole('button', { name: /Thêm Kết Quả/i });
    fireEvent.click(toggleButton);

    // Fill form
    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Bản Đúc Kết Kỳ Môn Audio Overview' } });

    const contentInput = screen.getByPlaceholderText(/Dán nội dung tóm lược từ NotebookLM/i);
    fireEvent.change(contentInput, { target: { value: 'Hai người dẫn thảo luận sâu về Kỳ Môn Độn Giáp...' } });

    const saveButton = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Bản Đúc Kết Kỳ Môn Audio Overview')).toBeInTheDocument();
      expect(screen.getByText(/Hai người dẫn thảo luận sâu về Kỳ Môn Độn Giáp/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Topic switching updates preview and filters artifacts
  // ---------------------------------------------------------------------------
  it('6. Changing selected topic switches source document and filters artifacts', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const topicSelect = screen.getByRole('combobox');
    fireEvent.change(topicSelect, { target: { value: 'topic-vi-dieu-phap' } });

    expect(screen.getByText(/CHỦ ĐỀ: VI DIỆU PHÁP TOÀN TẬP/i)).toBeInTheDocument();
  });
});
