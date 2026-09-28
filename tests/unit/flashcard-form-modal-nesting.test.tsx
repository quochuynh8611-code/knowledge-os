import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardFormModal } from '../../src/components/modals/FlashcardFormModal';

describe('flashcard-form-modal-nesting', () => {
  it('should isolate Escape key so it only closes child modal and stops event propagation', () => {
    const handleClose = vi.fn();
    const parentKeyDownListener = vi.fn();

    window.addEventListener('keydown', parentKeyDownListener);

    render(
      <div data-testid="reader-parent-container">
        <FlashcardFormModal
          isOpen={true}
          onClose={handleClose}
          initialFront="Đoạn văn bản"
          defaultTopicId="topic-1"
        />
      </div>
    );

    const modalDialog = screen.getByRole('dialog', { name: /Tạo Flashcard Mới/i });
    expect(modalDialog).toBeInTheDocument();

    // Fire Escape key inside modal
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);

    window.removeEventListener('keydown', parentKeyDownListener);
  });

  it('should isolate backdrop clicks and have z-index 60 layering', () => {
    const handleClose = vi.fn();

    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={handleClose}
        initialFront="Đoạn văn bản"
        defaultTopicId="topic-1"
      />
    );

    const modalWrapper = screen.getByTestId('flashcard-form-modal');
    expect(modalWrapper).toHaveClass('z-[60]');

    // Click backdrop
    fireEvent.click(modalWrapper);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should restore focus to specified restoreFocusRef upon closing', () => {
    const handleClose = vi.fn();
    const restoreElement = document.createElement('div');
    restoreElement.setAttribute('data-testid', 'reader-viewport-container');
    restoreElement.tabIndex = -1;
    document.body.appendChild(restoreElement);

    const restoreRef = { current: restoreElement };

    const { unmount } = render(
      <FlashcardFormModal
        isOpen={true}
        onClose={handleClose}
        restoreFocusRef={restoreRef}
        defaultTopicId="topic-1"
      />
    );

    unmount();

    expect(document.activeElement).toBe(restoreElement);
    document.body.removeChild(restoreElement);
  });
});
