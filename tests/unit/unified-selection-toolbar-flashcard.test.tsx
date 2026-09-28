import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedSelectionToolbar } from '../../src/components/reader/UnifiedSelectionToolbar';

describe('unified-selection-toolbar-flashcard', () => {
  it('should render the flashcard creation action button with Brain icon and correct tooltip', () => {
    const handleAction = vi.fn();
    const handleClose = vi.fn();

    render(
      <UnifiedSelectionToolbar
        isOpen={true}
        position={{ top: 100, left: 200 }}
        selectedText="Đoạn văn bản nghiên cứu quan trọng"
        onAction={handleAction}
        onClose={handleClose}
      />
    );

    const flashcardButton = screen.getByRole('button', { name: /Tạo thẻ nhớ/i });
    expect(flashcardButton).toBeInTheDocument();
    expect(flashcardButton).toHaveAttribute('title', 'Tạo thẻ nhớ từ đoạn trích');
  });

  it('should trigger onAction with create_flashcard and selected text payload when clicked', () => {
    const handleAction = vi.fn();
    const handleClose = vi.fn();

    render(
      <UnifiedSelectionToolbar
        isOpen={true}
        position={{ top: 100, left: 200 }}
        selectedText="Khái niệm Spaced Repetition"
        onAction={handleAction}
        onClose={handleClose}
      />
    );

    const flashcardButton = screen.getByRole('button', { name: /Tạo thẻ nhớ/i });
    fireEvent.click(flashcardButton);

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(handleAction).toHaveBeenCalledWith('create_flashcard', {
      text: 'Khái niệm Spaced Repetition',
    });
  });
});
