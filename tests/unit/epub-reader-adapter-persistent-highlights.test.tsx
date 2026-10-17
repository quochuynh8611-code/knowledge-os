import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { EpubReaderAdapter } from '../../src/components/reader/adapters/EpubReaderAdapter';
import { ResearchExcerpt } from '../../src/types';

// Mock sanitizeEpubArchive to return buffer immediately
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

let capturedProps: any = null;
let lastCapturedRendition: any = null;

// Mock react-reader
vi.mock('react-reader', () => {
  return {
    ReactReader: vi.fn((props: any) => {
      capturedProps = props;
      const getRenditionRef = React.useRef(props.getRendition);
      getRenditionRef.current = props.getRendition;
      const initializedRef = React.useRef(false);

      React.useEffect(() => {
        if (!initializedRef.current && getRenditionRef.current) {
          initializedRef.current = true;
          const listeners: Record<string, Function[]> = {};

          const mockAnnotations = {
            highlight: vi.fn((cfiRange: string, data: any, cb?: Function, className?: string, styles?: any) => {
              return { cfiRange, data, cb, className, styles };
            }),
            remove: vi.fn((cfiRange: string, type?: string) => {}),
          };

          const mockRendition = {
            display: vi.fn(async () => {}),
            themes: { fontSize: vi.fn() },
            spread: vi.fn(),
            on: vi.fn((event: string, cb: Function) => {
              listeners[event] = listeners[event] || [];
              listeners[event].push(cb);
            }),
            off: vi.fn((event: string, cb: Function) => {
              if (listeners[event]) {
                listeners[event] = listeners[event].filter((f) => f !== cb);
              }
            }),
            emit: (event: string, ...args: any[]) => {
              (listeners[event] || []).forEach((cb) => cb(...args));
            },
            getRange: vi.fn((cfi: string) => {
              if (cfi.includes('invalid') || cfi.includes('stale')) {
                throw new Error('Invalid CFI range');
              }
              return {
                toString: () => 'Đoạn văn bản trích dẫn EPUB',
                getBoundingClientRect: () => ({ top: 100, bottom: 120, left: 50, right: 250, width: 200, height: 20 }),
              };
            }),
            annotations: mockAnnotations,
            book: {
              loaded: {
                navigation: Promise.resolve({ toc: [] }),
              },
            },
          };

          lastCapturedRendition = mockRendition;
          getRenditionRef.current(mockRendition);
        }
      }, []);

      return (
        <div data-testid="react-reader-mock" data-location={props.location}>
          <span>Mock EPUB Container</span>
        </div>
      );
    }),
  };
});

function makeFakeEpubFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/epub+zip' : null),
    },
    arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
  });
}

describe('Phase R3d-B: EPUB Reader Adapter Persistent Highlights (Green Stage)', () => {
  const validExcerpt1: ResearchExcerpt = {
    id: 'exc-epub-1',
    archivedDocumentId: 'doc-epub-001',
    selectedText: 'Kiến trúc phần mềm sạch và độc lập khuôn khổ',
    positionSelector: {
      cfi: 'epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)',
    },
    highlightColor: '#fef08a',
    status: 'active',
    createdAt: '2026-10-17T08:00:00.000Z',
    updatedAt: '2026-10-17T08:00:00.000Z',
  };

  const validExcerpt2: ResearchExcerpt = {
    id: 'exc-epub-2',
    archivedDocumentId: 'doc-epub-001',
    selectedText: 'Nguyên lý đảo ngược phụ thuộc (DIP)',
    positionSelector: {
      cfi: 'epubcfi(/6/6[chap02]!/4/2/20,/1:0,/1:35)',
    },
    highlightColor: '#bbf7d0',
    status: 'active',
    createdAt: '2026-10-17T08:05:00.000Z',
    updatedAt: '2026-10-17T08:05:00.000Z',
  };

  const legacyExcerptWithoutCfi: ResearchExcerpt = {
    id: 'exc-legacy-3',
    archivedDocumentId: 'doc-epub-001',
    selectedText: 'Đoạn trích legacy không có CFI',
    positionSelector: {
      headingId: 'chuong-1',
    },
    highlightColor: '#bae6fd',
    status: 'active',
    createdAt: '2026-10-17T08:10:00.000Z',
    updatedAt: '2026-10-17T08:10:00.000Z',
  };

  const staleExcerptWithInvalidCfi: ResearchExcerpt = {
    id: 'exc-stale-4',
    archivedDocumentId: 'doc-epub-001',
    selectedText: 'Đoạn trích có CFI bị lỗi hoặc stale',
    positionSelector: {
      cfi: 'epubcfi(/6/99[missing]!/invalid)',
    },
    highlightColor: '#fbcfe8',
    status: 'active',
    createdAt: '2026-10-17T08:15:00.000Z',
    updatedAt: '2026-10-17T08:15:00.000Z',
  };

  beforeEach(() => {
    capturedProps = null;
    lastCapturedRendition = null;
    vi.stubGlobal('fetch', makeFakeEpubFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. registers rendition.annotations.highlight for valid excerpts with cfi', async () => {
    render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt1, validExcerpt2]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // In RED stage, this expectation will fail because EpubReaderAdapter does not yet call rendition.annotations.highlight
    expect(lastCapturedRendition.annotations.highlight).toHaveBeenCalledWith(
      validExcerpt1.positionSelector.cfi,
      expect.objectContaining({ excerptId: validExcerpt1.id }),
      expect.any(Function),
      expect.any(String),
      expect.objectContaining({ fill: '#fef08a' })
    );

    expect(lastCapturedRendition.annotations.highlight).toHaveBeenCalledWith(
      validExcerpt2.positionSelector.cfi,
      expect.objectContaining({ excerptId: validExcerpt2.id }),
      expect.any(Function),
      expect.any(String),
      expect.objectContaining({ fill: '#bbf7d0' })
    );
  });

  it('2. ignores legacy excerpts without cfi and does not call annotations.highlight for them', async () => {
    render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[legacyExcerptWithoutCfi]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    expect(lastCapturedRendition.annotations.highlight).not.toHaveBeenCalled();
  });

  it('3. triggers onSelectExcerpt when highlight click callback is invoked', async () => {
    const onSelectExcerpt = vi.fn();

    render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt1]}
        onSelectExcerpt={onSelectExcerpt}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // Find the callback passed into highlight
    const highlightCalls = lastCapturedRendition.annotations.highlight.mock.calls;
    expect(highlightCalls.length).toBeGreaterThan(0);
    const clickCb = highlightCalls[0][2];
    expect(typeof clickCb).toBe('function');

    // Simulate clicking the highlight mark
    act(() => {
      clickCb({ stopPropagation: vi.fn() });
    });

    expect(onSelectExcerpt).toHaveBeenCalledWith(validExcerpt1);
  });

  it('4. removes highlight when excerpt is deleted from props', async () => {
    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt1, validExcerpt2]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // Rerender with validExcerpt1 removed
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt2]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition.annotations.remove).toHaveBeenCalledWith(
        validExcerpt1.positionSelector.cfi,
        'highlight'
      );
    });
  });

  it('5. recolors highlight when excerpt highlightColor changes', async () => {
    const recoloredExcerpt: ResearchExcerpt = {
      ...validExcerpt1,
      highlightColor: '#fbcfe8', // Changed to pink
    };

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt1]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // Rerender with new color
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[recoloredExcerpt]}
      />
    );

    await waitFor(() => {
      // Must remove old and apply new color, or update styles
      expect(lastCapturedRendition.annotations.remove).toHaveBeenCalledWith(
        validExcerpt1.positionSelector.cfi,
        'highlight'
      );
      expect(lastCapturedRendition.annotations.highlight).toHaveBeenCalledWith(
        recoloredExcerpt.positionSelector.cfi,
        expect.any(Object),
        expect.any(Function),
        expect.any(String),
        expect.objectContaining({ fill: '#fbcfe8' })
      );
    });
  });

  it('6. fails closed safely when cfi is invalid without throwing unhandled exception', async () => {
    // When annotations.highlight throws an error
    render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[staleExcerptWithInvalidCfi]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // The component must not crash
    expect(screen.getByTestId('react-reader-mock')).toBeDefined();
  });

  it('7. cleans up registered annotations on unmount', async () => {
    const { unmount } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-001"
        excerpts={[validExcerpt1]}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    unmount();

    // Verify cleanup
    expect(lastCapturedRendition.annotations.remove).toHaveBeenCalledWith(
      validExcerpt1.positionSelector.cfi,
      'highlight'
    );
  });
});
