import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceViewerModal } from '../../src/components/modals/ResourceViewerModal';
import { Resource } from '../../src/types';

describe('Post-Phase 6c: ResourceViewerModal - Local Path Display & 1-Click Copy UX', () => {
  it('displays normalized local filePath and provides 1-click copy button', () => {
    const resource: Resource = {
      id: 'res-1',
      topicId: 'topic-1',
      title: 'Khao Cứu Câu Xá Luận PDF',
      type: 'pdf',
      filePath: '/Users/researcher/Knowledge-Library/PDF/kosa.pdf',
      createdAt: '2026-08-01T00:00:00Z',
    };

    render(<ResourceViewerModal resource={resource} onClose={vi.fn()} />);

    // Verify local path is rendered
    expect(screen.getByText(/\/Users\/researcher\/Knowledge-Library\/PDF\/kosa\.pdf/i)).toBeInTheDocument();

    // Verify copy button exists
    const copyBtns = screen.getAllByRole('button', { name: /Sao chép đường dẫn|Copy/i });
    expect(copyBtns.length).toBeGreaterThan(0);
    fireEvent.click(copyBtns[0]);

    expect(screen.getByText(/Đã sao chép đường dẫn!|Đã sao chép/i)).toBeInTheDocument();
  });
});
