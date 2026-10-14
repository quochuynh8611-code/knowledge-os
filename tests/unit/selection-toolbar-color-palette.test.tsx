import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  UnifiedSelectionToolbar,
  HIGHLIGHT_COLOR_PALETTE,
} from '../../src/components/reader/UnifiedSelectionToolbar';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';

describe('Phase R3b Stage 2: Selection Toolbar Color Palette (Test-First)', () => {
  const defaultProps = {
    isOpen: true,
    position: { top: 200, left: 300 },
    selectedText: 'Tâm là sự nhận biết đối tượng.',
    onAction: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Default Highlight action button emits yellow color (#fef08a)', () => {
    const onAction = vi.fn();
    render(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);

    const highlightBtn = screen.getByRole('button', { name: /^Highlight$/i });
    fireEvent.click(highlightBtn);

    expect(onAction).toHaveBeenCalledWith('highlight', {
      text: defaultProps.selectedText,
      color: '#fef08a',
    });
  });

  it('2. Renders palette toggle button and opens 4 color options', () => {
    render(<UnifiedSelectionToolbar {...defaultProps} />);

    const paletteToggle = screen.getByTestId('highlight-palette-toggle');
    expect(paletteToggle).toBeInTheDocument();
    expect(screen.queryByTestId('highlight-color-palette')).not.toBeInTheDocument();

    fireEvent.click(paletteToggle);

    const palette = screen.getByTestId('highlight-color-palette');
    expect(palette).toBeInTheDocument();

    expect(screen.getByTestId('highlight-color-yellow')).toBeInTheDocument();
    expect(screen.getByTestId('highlight-color-green')).toBeInTheDocument();
    expect(screen.getByTestId('highlight-color-blue')).toBeInTheDocument();
    expect(screen.getByTestId('highlight-color-pink')).toBeInTheDocument();
  });

  it('3. Selecting Green color (#bbf7d0) from palette calls onAction with green color payload', () => {
    const onAction = vi.fn();
    render(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByTestId('highlight-palette-toggle'));
    const greenBtn = screen.getByTestId('highlight-color-green');
    fireEvent.click(greenBtn);

    expect(onAction).toHaveBeenCalledWith('highlight', {
      text: defaultProps.selectedText,
      color: '#bbf7d0',
    });
    expect(screen.queryByTestId('highlight-color-palette')).not.toBeInTheDocument();
  });

  it('4. Selecting Blue (#bae6fd) and Pink (#fbcfe8) emit their respective hex values', () => {
    const onAction = vi.fn();
    const { rerender } = render(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);

    // Test Blue
    fireEvent.click(screen.getByTestId('highlight-palette-toggle'));
    fireEvent.click(screen.getByTestId('highlight-color-blue'));
    expect(onAction).toHaveBeenCalledWith('highlight', {
      text: defaultProps.selectedText,
      color: '#bae6fd',
    });

    // Test Pink
    rerender(<UnifiedSelectionToolbar {...defaultProps} onAction={onAction} />);
    fireEvent.click(screen.getByTestId('highlight-palette-toggle'));
    fireEvent.click(screen.getByTestId('highlight-color-pink'));
    expect(onAction).toHaveBeenCalledWith('highlight', {
      text: defaultProps.selectedText,
      color: '#fbcfe8',
    });
  });

  it('5. UnifiedResearchReader saves excerpt with selected palette color', async () => {
    const addExcerptMock = vi.fn().mockResolvedValue({});
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [],
      researchInboxItems: [],
      addExcerpt: addExcerptMock,
      deleteExcerpt: vi.fn(),
      addExcerptToInbox: vi.fn(),
      deleteInboxItem: vi.fn(),
      unprocessedInboxCount: 0,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-test-1"
          title="Tài Liệu Thí Nghiệm"
          format="pdf"
          fileUrl="/api/archive/file/test.pdf"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Kích hoạt text selection qua manual quote
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Nội dung cần trích dẫn đặc biệt.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Mở palette và chọn màu xanh lá
    const paletteToggle = await screen.findByTestId('highlight-palette-toggle');
    fireEvent.click(paletteToggle);

    const greenBtn = screen.getByTestId('highlight-color-green');
    await act(async () => {
      fireEvent.click(greenBtn);
    });

    expect(addExcerptMock).toHaveBeenCalledTimes(1);
    const savedExcerpt = addExcerptMock.mock.calls[0][0];
    expect(savedExcerpt.highlightColor).toBe('#bbf7d0');
    expect(savedExcerpt.selectedText).toBe('Nội dung cần trích dẫn đặc biệt.');
  });

  it('6. UnifiedResearchReader default Highlight action saves excerpt with default yellow (#fef08a)', async () => {
    const addExcerptMock = vi.fn().mockResolvedValue({});
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [],
      researchInboxItems: [],
      addExcerpt: addExcerptMock,
      deleteExcerpt: vi.fn(),
      addExcerptToInbox: vi.fn(),
      deleteInboxItem: vi.fn(),
      unprocessedInboxCount: 0,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-test-2"
          title="Tài Liệu Mặc Định"
          format="pdf"
          fileUrl="/api/archive/file/test-default.pdf"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Đoạn trích dùng màu mặc định.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Bấm trực tiếp nút Highlight mà không mở bảng màu
    await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    const defaultHighlightBtn = screen.getByRole('button', { name: /^Highlight$/i });
    await act(async () => {
      fireEvent.click(defaultHighlightBtn);
    });

    expect(addExcerptMock).toHaveBeenCalledTimes(1);
    const savedExcerpt = addExcerptMock.mock.calls[0][0];
    expect(savedExcerpt.highlightColor).toBe('#fef08a');
    expect(savedExcerpt.selectedText).toBe('Đoạn trích dùng màu mặc định.');
  });
});
