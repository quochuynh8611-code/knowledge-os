/**
 * Obsidian Bridge Modal UI Integration Test Suite (Phase 2a)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature (Scenario 6)
 * Target: src/components/integrations/ObsidianBridgeModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ObsidianBridgeModal } from '../../src/components/integrations/ObsidianBridgeModal';
import * as obsidianLib from '../../src/lib/obsidian';

const mockTopics = [
  {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc' as const,
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm và 52 Tâm sở.',
    content: 'Tâm là thực tại nhận biết đối tượng.',
    tags: ['Abhidharma'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
  {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc' as const,
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học',
    description: 'Thuật số định vị thời không.',
    content: 'Tam kỳ lục nghi cửu tinh.',
    tags: ['Kỳ Môn'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
];

const mockNotes = [
  {
    id: 'note-1',
    topicId: 'topic-vi-dieu-phap',
    topicTitle: 'Vi Diệu Pháp Toàn Tập',
    title: 'Tâm Sở Tịnh Hảo',
    content: '25 tâm sở tịnh hảo...',
    type: 'insight' as const,
    tags: ['Tâm Sở'],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources = [
  {
    id: 'res-1',
    topicId: 'topic-vi-dieu-phap',
    topicTitle: 'Vi Diệu Pháp Toàn Tập',
    title: 'Thắng Pháp Tập Yếu',
    type: 'pdf' as const,
    filePath: 'ThangPhap.pdf',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  },
];

const mockCategories = [
  {
    id: 'cat-abhidharma',
    name: 'Vi Diệu Pháp',
    type: 'phat-hoc' as const,
    description: 'Luận tạng Phật giáo',
    icon: 'Book',
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    categories: mockCategories,
  }),
}));

describe('ADR-012 Phase 2a: Obsidian Bridge Modal Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Rendering state
  // ---------------------------------------------------------------------------
  it('1. Does not render when isOpen is false', () => {
    const { container } = render(<ObsidianBridgeModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Renders title, vault name input, current topic card, and actions when isOpen is true', () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText(/Obsidian Real-Time Vault Bridge/i)).toBeInTheDocument();
    expect(screen.getByText(/Tên Obsidian Vault của bạn:/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Khao-Cuu-Phat-Hoc-Huyen-Hoc')).toBeInTheDocument();
    expect(screen.getByText(/Chủ đề hiện tại: Vi Diệu Pháp Toàn Tập/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tạo \/ Mở Ngay trong Obsidian App/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sao chép Note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải Xuống Trọn Bộ Obsidian Vault/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Vault Name interaction & persistence
  // ---------------------------------------------------------------------------
  it('3. Modifying vault name updates state and localStorage', () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const vaultInput = screen.getByDisplayValue('Khao-Cuu-Phat-Hoc-Huyen-Hoc');
    fireEvent.change(vaultInput, { target: { value: 'My-Personal-Brain' } });

    expect(vaultInput).toHaveValue('My-Personal-Brain');
    expect(localStorage.getItem(obsidianLib.DEFAULT_OBSIDIAN_VAULT_KEY)).toBe('My-Personal-Brain');
  });

  // ---------------------------------------------------------------------------
  // 3. Copy Markdown action
  // ---------------------------------------------------------------------------
  it('4. Clicking "Sao chép Note" writes formatted Markdown to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const copyButton = screen.getByRole('button', { name: /Sao chép Note/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('title: "Vi Diệu Pháp Toàn Tập"');
    expect(copiedText).toContain('# Vi Diệu Pháp Toàn Tập');

    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép Markdown!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Download Vault ZIP action
  // ---------------------------------------------------------------------------
  it('5. Clicking "Tải Xuống Trọn Bộ Obsidian Vault" generates ZIP blob and shows success banner', async () => {
    const zipSpy = vi.spyOn(obsidianLib, 'generateObsidianVaultZip');

    // Mock URL.createObjectURL & revokeObjectURL
    const mockObjectUrl = 'blob:http://localhost:3000/mock-zip-uuid';
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
    window.URL.revokeObjectURL = vi.fn();

    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const downloadButton = screen.getByRole('button', { name: /Tải Xuống Trọn Bộ Obsidian Vault/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(zipSpy).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(screen.getByText(/Đã đóng gói thành công! Bạn có thể giải nén/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Navbar default fallback & Special Character Path Sanitization
  // ---------------------------------------------------------------------------
  it('6. When opened without topic prop, defaults to first topic in topics list', () => {
    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Chủ đề hiện tại: Vi Diệu Pháp Toàn Tập/i)).toBeInTheDocument();
  });

  it('7. When topic title contains special characters, openInObsidian link uses sanitized path matching ZIP structure', () => {
    const topicWithSlash = {
      ...mockTopics[1],
      title: 'Kỳ Môn Độn Giáp / Bát Môn Trận',
    };

    render(<ObsidianBridgeModal isOpen={true} onClose={vi.fn()} topic={topicWithSlash} />);

    const openLink = screen.getByRole('link', { name: /Tạo \/ Mở Ngay trong Obsidian App/i });
    const href = openLink.getAttribute('href') || '';

    // The open link must encode the sanitized path 'Huyen-Hoc/Kỳ Môn Độn Giáp - Bát Môn Trận.md' or 'Huyen-Hoc/Kỳ Môn Độn Giáp - Bát Môn Trận' without unescaped slashes inside filename
    expect(decodeURIComponent(href)).toContain('file=Huyen-Hoc/Kỳ Môn Độn Giáp - Bát Môn Trận');
  });
});
