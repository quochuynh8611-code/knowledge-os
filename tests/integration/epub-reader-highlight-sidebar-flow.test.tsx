import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

// Mock sanitizeEpubArchive
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

let lastCapturedRendition: any = null;

// Mock react-reader
vi.mock('react-reader', () => {
  return {
    ReactReader: vi.fn((props: any) => {
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
            getRange: vi.fn((cfi: string) => ({
              toString: () => 'Nội dung trích dẫn',
              getBoundingClientRect: () => ({ top: 100, bottom: 120, left: 50, right: 250, width: 200, height: 20 }),
            })),
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
          <span>Mock EPUB Content View</span>
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

describe('Integration: Phase R3d-B EPUB Persistent Highlights to ReaderSidebar Flow', () => {
  const epubExcerpt1: ResearchExcerpt = {
    id: 'exc-flow-1',
    archivedDocumentId: 'doc-epub-flow',
    selectedText: 'Kiến trúc Bounded Context trong Domain-Driven Design',
    positionSelector: {
      cfi: 'epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:40)',
    },
    highlightColor: '#fef08a',
    status: 'active',
    createdAt: '2026-10-17T09:00:00.000Z',
    updatedAt: '2026-10-17T09:00:00.000Z',
  };

  const epubExcerpt2: ResearchExcerpt = {
    id: 'exc-flow-2',
    archivedDocumentId: 'doc-epub-flow',
    selectedText: 'Nguyên lý thiết kế Entity và Value Object',
    positionSelector: {
      cfi: 'epubcfi(/6/6[chap02]!/4/2/20,/1:0,/1:35)',
    },
    highlightColor: '#bbf7d0',
    status: 'active',
    createdAt: '2026-10-17T09:05:00.000Z',
    updatedAt: '2026-10-17T09:05:00.000Z',
  };

  const legacyExcerptWithoutCfi: ResearchExcerpt = {
    id: 'exc-flow-legacy',
    archivedDocumentId: 'doc-epub-flow',
    selectedText: 'Trích dẫn legacy không có trường cfi',
    positionSelector: {
      headingId: 'chuong-3',
    },
    highlightColor: '#bae6fd',
    status: 'active',
    createdAt: '2026-10-17T09:10:00.000Z',
    updatedAt: '2026-10-17T09:10:00.000Z',
  };

  let mockDataContextValue: any;

  beforeEach(() => {
    lastCapturedRendition = null;
    vi.stubGlobal('fetch', makeFakeEpubFetch());
    mockDataContextValue = {
      researchExcerpts: [epubExcerpt1, epubExcerpt2, legacyExcerptWithoutCfi],
      addExcerpt: vi.fn(),
      updateExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
      notes: [],
      topics: [],
      resources: [],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. wires excerpts into EpubReaderAdapter and highlights valid CFIs on document open', async () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <UnifiedResearchReader
          documentId="doc-epub-flow"
          title="Domain Driven Design"
          format="epub"
          fileUrl="https://example.com/books/ddd.epub"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // Valid CFIs must be registered to annotations
    expect(lastCapturedRendition.annotations.highlight).toHaveBeenCalledWith(
      epubExcerpt1.positionSelector.cfi,
      expect.objectContaining({ excerptId: epubExcerpt1.id }),
      expect.any(Function),
      expect.any(String),
      expect.objectContaining({ fill: '#fef08a' })
    );

    expect(lastCapturedRendition.annotations.highlight).toHaveBeenCalledWith(
      epubExcerpt2.positionSelector.cfi,
      expect.objectContaining({ excerptId: epubExcerpt2.id }),
      expect.any(Function),
      expect.any(String),
      expect.objectContaining({ fill: '#bbf7d0' })
    );

    // Legacy excerpt without CFI must not be called
    expect(lastCapturedRendition.annotations.highlight).not.toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    // Open sidebar & switch to highlights tab
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    // But legacy excerpt must still appear in ReaderSidebar
    expect(screen.getByText(/Trích dẫn legacy không có trường cfi/)).toBeDefined();
  });

  it('2. clicking an EPUB highlight activates the corresponding excerpt and triggers navigation to locator', async () => {
    const onPositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <UnifiedResearchReader
          documentId="doc-epub-flow"
          title="Domain Driven Design"
          format="epub"
          fileUrl="https://example.com/books/ddd.epub"
          onClose={vi.fn()}
          onPositionChange={onPositionChange}
        />
      </DataContext.Provider>
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    const highlightCalls = lastCapturedRendition.annotations.highlight.mock.calls;
    const callForExcerpt1 = highlightCalls.find((c: any) => c[0] === epubExcerpt1.positionSelector.cfi);
    expect(callForExcerpt1).toBeDefined();

    const clickCb = callForExcerpt1[2];
    expect(typeof clickCb).toBe('function');

    // Simulate clicking the highlight mark in EPUB viewer
    act(() => {
      clickCb({ stopPropagation: vi.fn() });
    });

    // UnifiedResearchReader calls onPositionChange with the excerpt's CFI locator
    await waitFor(() => {
      expect(onPositionChange).toHaveBeenCalledWith(epubExcerpt1.positionSelector.cfi);
    });
  });
});
