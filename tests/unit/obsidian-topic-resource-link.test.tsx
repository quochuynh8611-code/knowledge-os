import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Resource } from '../../src/types';

// Mock components and contexts that will be implemented in Phase P4.1D
// At this red-test phase, we import the planned component to assert its contract
import { ObsidianTopicResourceLinkModal } from '../../src/components/modals/ObsidianTopicResourceLinkModal';

describe('Phase P4.1D: Obsidian Topic Resource Link Contract & Preflight Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects submission when preflight API returns 404 FILE_NOT_FOUND', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    // Mock fetch preflight returning 404
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'FILE_NOT_FOUND',
          message: 'Tệp tin không tồn tại hoặc đã bị di chuyển khỏi Obsidian Vault',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianTopicResourceLinkModal
        isOpen={true}
        onClose={mockOnClose}
        topicId="topic-vi-dieu-phap"
        vaultName="AI-Obsidian"
        onLinked={mockOnSuccess}
      />
    );

    const pathInput = screen.getByLabelText(/Đường dẫn tương đối trong Vault/i);
    fireEvent.change(pathInput, { target: { value: 'Missing/Note.md' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận liên kết|Liên kết/i });
    fireEvent.click(submitBtn);

    // Wait for preflight error to be displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Tệp tin không tồn tại hoặc đã bị di chuyển khỏi Obsidian Vault/i)
      ).toBeInTheDocument();
    });

    // Ensure onLinked was NOT called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('rejects submission when preflight API returns 403 SYMLINK_NOT_ALLOWED', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'SYMLINK_NOT_ALLOWED',
          message: 'Liên kết mềm (symbolic link) không được phép truy cập trong phiên bản này',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianTopicResourceLinkModal
        isOpen={true}
        onClose={mockOnClose}
        topicId="topic-vi-dieu-phap"
        vaultName="AI-Obsidian"
        onLinked={mockOnSuccess}
      />
    );

    const pathInput = screen.getByLabelText(/Đường dẫn tương đối trong Vault/i);
    fireEvent.change(pathInput, { target: { value: 'Symlinks/Link.md' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận liên kết|Liên kết/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Liên kết mềm \(symbolic link\) không được phép truy cập/i)
      ).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('successfully links resource with canonical type md, relative filePath, and no markdown body in metadata', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    // Mock successful preflight
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: {
            title: 'Khao Cứu Vi Diệu Pháp',
            tags: ['phat-hoc', 'abhidhamma'],
          },
          outline: [
            { level: 1, text: 'Tổng Quan', id: 'tong-quan' },
          ],
          content: '# Tổng Quan\n\nNội dung khảo cứu...',
          sizeBytes: 1024,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianTopicResourceLinkModal
        isOpen={true}
        onClose={mockOnClose}
        topicId="topic-vi-dieu-phap"
        vaultName="AI-Obsidian"
        onLinked={mockOnSuccess}
      />
    );

    const pathInput = screen.getByLabelText(/Đường dẫn tương đối trong Vault/i);
    fireEvent.change(pathInput, { target: { value: 'Phat-Hoc/Vi-Dieu-Phap.md' } });

    const submitBtn = screen.getByRole('button', { name: /Xác nhận liên kết|Liên kết/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    // Validate resource metadata shape
    const savedPayload: Partial<Resource> = mockOnSuccess.mock.calls[0][0];
    expect(savedPayload.topicId).toBe('topic-vi-dieu-phap');
    expect(savedPayload.type).toBe('md');
    expect(savedPayload.filePath).toBe('Phat-Hoc/Vi-Dieu-Phap.md');
    expect(savedPayload.title).toBe('Khao Cứu Vi Diệu Pháp');
    expect(savedPayload.url).toContain('obsidian://open?');
    expect(savedPayload.url).toContain('vault=AI-Obsidian');

    // Invariant: Raw markdown content MUST NEVER be stored in Resource payload
    expect((savedPayload as any).content).toBeUndefined();
  });
});
