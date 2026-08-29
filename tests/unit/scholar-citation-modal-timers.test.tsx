import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScholarCitationModal } from '../../src/components/modals/ScholarCitationModal';
import { canonicalLexiconFixture } from '../fixtures/scholar-citation-fixtures';

describe('Phase P8.4: ScholarCitationModal Timer Reliability & Cleanup', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Resets feedback timer cleanly on rapid consecutive copy clicks', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Sao chép trích dẫn/i });

    // First click
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(screen.getByRole('button', { name: /Đã sao chép/i })).toBeInTheDocument();

    // Advance 1000ms (halfway through the 2000ms timer)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: /Đã sao chép/i })).toBeInTheDocument();

    // Second click (should reset timer to fresh 2000ms)
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(screen.getByRole('button', { name: /Đã sao chép/i })).toBeInTheDocument();

    // Advance 1500ms (total 2500ms from first click, but only 1500ms from second click)
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // Should STILL be "Đã sao chép" because second click reset the timer
    expect(screen.getByRole('button', { name: /Đã sao chép/i })).toBeInTheDocument();

    // Advance remaining 600ms (total > 2000ms from second click)
    act(() => {
      vi.advanceTimersByTime(600);
    });
    // Now it should return to "Sao chép trích dẫn"
    expect(screen.queryByRole('button', { name: /Đã sao chép/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sao chép trích dẫn/i })).toBeInTheDocument();
  });

  it('2. Clears timers on unmount without throwing errors or warnings', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const { unmount } = render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Sao chép trích dẫn/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // Unmount while timer is pending
    unmount();

    // Advance timers and ensure no errors
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    }).not.toThrow();
  });
});
