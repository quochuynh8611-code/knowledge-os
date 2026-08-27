import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { ObsidianBridgeModal } from '../../src/components/integrations/ObsidianBridgeModal';
import { generateObsidianVaultZip } from '../../src/lib/obsidian';
import { Topic, Note, Resource, Category } from '../../src/types';
import JSZip from 'jszip';

describe('Phase Performance-Followup: Obsidian Vault Zip Export Integration & Dynamic Import Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock URL.createObjectURL and URL.revokeObjectURL in jsdom
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-url');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-blob-url');
    }

    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  const mockTopicPhatHoc: Topic = {
    id: 'topic-phat-hoc-1',
    title: 'Bát Chánh Đạo',
    slug: 'bat-chanh-dao',
    type: 'phat-hoc',
    categoryId: 'cat-phat-hoc',
    categoryName: 'Phật Học Căn Bản',
    description: 'Con đường tám nhánh dẫn đến giải thoát',
    content: 'Chánh Kiến, Chánh Tư Duy...',
    tags: ['BatChanhDao', 'GiaiThoat'],
    links: [],
    studyProgress: {
      topicId: 'topic-phat-hoc-1',
      status: 'in_progress',
      progress: 75,
      interval: 2,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 1,
      timeSpent: 30,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-phat-hoc-1',
      topicTitle: 'Bát Chánh Đạo',
      title: 'Tầm quan trọng của Chánh Kiến',
      content: 'Chánh Kiến là ngọn đèn soi sáng toàn bộ tiến trình tu tập.',
      type: 'insight',
      isPrivate: false,
      tags: ['ChanhKien'],
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-21T10:00:00Z',
    },
  ];

  const mockResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-phat-hoc-1',
      title: 'Kinh Đại Niệm Xứ',
      type: 'book',
      author: 'Đại Trưởng Lão',
      url: 'https://example.com/kinh-dai-niem-xu',
      createdAt: '2026-08-20T10:00:00Z',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-phat-hoc',
      name: 'Phật Học Căn Bản',
      slug: 'phat-hoc-can-ban',
      type: 'phat-hoc',
      parentId: null,
    },
  ];

  it('1. User clicking "Tải Xuống Trọn Bộ Obsidian Vault (.zip)" triggers dynamic import and displays success state', async () => {
    render(
      <DataProvider>
        <ObsidianBridgeModal
          isOpen={true}
          onClose={vi.fn()}
          topic={mockTopicPhatHoc}
        />
      </DataProvider>
    );

    const downloadBtn = screen.getByRole('button', { name: /Tải Xuống Trọn Bộ Obsidian Vault/i });
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(downloadBtn);

    // Wait for dynamic import to resolve, blob creation, and success banner display
    const successBanner = await screen.findByText(/Đã đóng gói thành công! Bạn có thể giải nén vào thư mục Vault trên máy./i);
    expect(successBanner).toBeInTheDocument();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('2. generateObsidianVaultZip via dynamic import returns valid Blob with intact Map of Content and folder hierarchy', async () => {
    const blob = await generateObsidianVaultZip(
      [mockTopicPhatHoc],
      mockNotes,
      mockResources,
      mockCategories,
      'Test-Dynamic-Vault'
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);

    // Verify zip archive contents using JSZip reader
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 2.1. Map of content file
    const mocFile = zip.file('00_Map_Of_Content.md');
    expect(mocFile).not.toBeNull();
    const mocText = await mocFile!.async('string');
    expect(mocText).toContain('BẢN ĐỒ TRI THỨC (MAP OF CONTENT - MOC)');
    expect(mocText).toContain('Test-Dynamic-Vault');
    expect(mocText).toContain('Bát Chánh Đạo');

    // 2.2. Phat-Hoc-Can-Ban topic folder (root slug is 'phat-hoc-can-ban' from mockCategories)
    const topicFile = zip.file('Phat-Hoc-Can-Ban/Bát Chánh Đạo.md');
    expect(topicFile).not.toBeNull();
    const topicText = await topicFile!.async('string');
    expect(topicText).toContain('title: "Bát Chánh Đạo"');
    expect(topicText).toContain('Chánh Kiến, Chánh Tư Duy...');

    // 2.3. Ghi-Chu note file
    const noteFile = zip.file('Ghi-Chu/Tầm quan trọng của Chánh Kiến.md');
    expect(noteFile).not.toBeNull();
    const noteText = await noteFile!.async('string');
    expect(noteText).toContain('Chánh Kiến là ngọn đèn soi sáng');
  });
});
