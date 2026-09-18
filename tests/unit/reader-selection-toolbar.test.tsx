import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  UnifiedSelectionToolbar,
  SelectionToolbarAction,
} from '../../src/components/reader/UnifiedSelectionToolbar';

describe('Phase 18A Wave 3: UnifiedSelectionToolbar', () => {
  const defaultProps = {
    isOpen: true,
    position: { top: 200, left: 300 },
    selectedText: 'Đây là đoạn văn bản được bôi đen trong tài liệu nghiên cứu.',
    onAction: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false or position is null', () => {
    const { rerender } = render(
      <UnifiedSelectionToolbar {...defaultProps} isOpen={false} />
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

    rerender(<UnifiedSelectionToolbar {...defaultProps} position={null} />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders nothing when selectedText is empty or whitespace only', () => {
    render(
      <UnifiedSelectionToolbar {...defaultProps} selectedText="   " />
    );
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders exactly 5 distinct research actions when active', () => {
    render(<UnifiedSelectionToolbar {...defaultProps} />);

    const toolbar = screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    expect(toolbar).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Highlight/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sao chép/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trích dẫn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi vào ghi chú/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm vào Inbox/i })).toBeInTheDocument();
  });

  it('handles copy action strictly on client-side without calling persistence', async () => {
    const onAction = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);

    const copyBtn = screen.getByRole('button', { name: /Sao chép/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(defaultProps.selectedText);
      expect(onAction).toHaveBeenCalledWith('copy', {
        text: defaultProps.selectedText,
      });
    });
  });

  it('triggers onAction with appropriate action type for other buttons', () => {
    const onAction = vi.fn();
    render(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Highlight/i }));
    expect(onAction).toHaveBeenCalledWith('highlight', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: /Trích dẫn/i }));
    expect(onAction).toHaveBeenCalledWith('citation', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: /Gửi vào ghi chú/i }));
    expect(onAction).toHaveBeenCalledWith('send_to_note', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: /Thêm vào Inbox/i }));
    expect(onAction).toHaveBeenCalledWith('add_to_inbox', expect.any(Object));
  });

  it('dismisses when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<UnifiedSelectionToolbar {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
