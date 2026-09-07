import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtifactReviewDrawer } from '../../src/components/integrations/ArtifactReviewDrawer';
import { GroundedArtifactDTO } from '../../src/types/researchHub';

describe('ArtifactReviewDrawer (Decision 1 & 2 Verification)', () => {
  const mockArtifact: GroundedArtifactDTO = {
    id: 'artifact-123',
    sessionId: 'session-456',
    sourcePackageId: 'pkg-1',
    sourcePackageVersion: 1,
    topicId: 'topic-789',
    artifactType: 'study_guide',
    title: 'Nghiên Cứu Tứ Diệu Đế & Bát Chánh Đạo',
    rawContent: '# Tứ Diệu Đế\nKhổ đế, Tập đế, Diệt đế, Đạo đế [1].',
    contentHash: 'abcdef1234567890abcdef1234567890',
    idempotencyKey: 'idem-key-12345',
    status: 'received',
    citationCount: 1,
    createdAt: '2026-09-07T12:00:00.000Z',
    updatedAt: '2026-09-07T12:00:00.000Z',
    citations: [
      {
        id: 'cit-1',
        artifactId: 'artifact-123',
        markerIndex: 1,
        sourceTitle: 'Kinh Tương Ưng Bộ (Samyutta Nikaya)',
        quote: 'Này các Tỳ-kheo, đây là Thánh đế về Khổ...',
        createdAt: '2026-09-07T12:00:00.000Z',
      },
    ],
    imports: [
      {
        id: 'imp-1',
        artifactId: 'artifact-123',
        targetType: 'note',
        targetNoteId: 'note-001',
        status: 'success',
        itemCount: 1,
        createdAt: '2026-09-07T12:05:00.000Z',
        updatedAt: '2026-09-07T12:05:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Decision 1 (Option A) Source Package Version badge', () => {
    render(
      <ArtifactReviewDrawer
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const versionBadge = screen.getByTestId('artifact-source-version-badge');
    expect(versionBadge).toBeInTheDocument();
    expect(versionBadge.textContent).toBe('Source package v1');

    const title = screen.getByRole('heading', { name: 'Nghiên Cứu Tứ Diệu Đế & Bát Chánh Đạo' });
    expect(title).toBeInTheDocument();
  });

  it('renders Decision 2 (Option B) Review Drawer tabs and actions', () => {
    render(
      <ArtifactReviewDrawer
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Verify Action buttons
    expect(screen.getByTestId('btn-validate-artifact')).toBeInTheDocument();
    expect(screen.getByTestId('btn-open-import-note')).toBeInTheDocument();
    expect(screen.getByTestId('btn-open-import-flashcards')).toBeInTheDocument();
    expect(screen.getByTestId('btn-archive-artifact')).toBeInTheDocument();

    // Verify Content tab is default
    expect(screen.getByText(/Khổ đế, Tập đế, Diệt đế, Đạo đế/i)).toBeInTheDocument();

    // Switch to Citations tab
    const citationTab = screen.getByRole('button', { name: /Trích dẫn nguồn/i });
    fireEvent.click(citationTab);
    expect(screen.getByText('Kinh Tương Ưng Bộ (Samyutta Nikaya)')).toBeInTheDocument();
    expect(screen.getByText(/Này các Tỳ-kheo, đây là Thánh đế về Khổ/i)).toBeInTheDocument();

    // Switch to Imports tab
    const importsTab = screen.getByRole('button', { name: /Lịch sử chuyển nạp/i });
    fireEvent.click(importsTab);
    expect(screen.getByText(/Ghi chú ID: note-001/i)).toBeInTheDocument();
  });

  it('handles validation action when "Thẩm định" is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockArtifact, status: 'validated' }),
    });
    globalThis.fetch = fetchMock;

    const onArtifactUpdated = vi.fn();

    render(
      <ArtifactReviewDrawer
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
        onArtifactUpdated={onArtifactUpdated}
      />
    );

    const validateBtn = screen.getByTestId('btn-validate-artifact');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/artifacts/artifact-123/review',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'validated' }),
        })
      );
    });

    expect(onArtifactUpdated).toHaveBeenCalled();
  });
});
