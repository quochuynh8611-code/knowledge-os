import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { EpubReaderAdapter, EpubReaderSelectionDetails } from '../../src/components/reader/adapters/EpubReaderAdapter';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataProvider, DataContext } from '../../src/context/DataContext';
import { copyTextToClipboard } from '../../src/lib/clipboard';

// Mock clipboard
vi.mock('../../src/lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}));

// Mock sanitizeEpubArchive to return buffer immediately
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

// Mock ReactReader to capture getRendition
let lastCapturedRendition: any = null;
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
              return {
                toString: () => 'Đoạn văn bản trích dẫn trực tiếp từ sách EPUB.',
                getBoundingClientRect: () => ({
                  top: 100,
                  bottom: 120,
                  left: 50,
                  right: 250,
                  width: 200,
                  height: 20,
                }),
              };
            }),
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

describe('Phase 18A: EPUB Direct In-Document Text Selection & Toolbar Actions (Red Stage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastCapturedRendition = null;
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(100),
      };
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. EpubReaderAdapter registers rendition.on("selected", ...) and forwards selection details to onTextSelection', async () => {
    const onTextSelection = vi.fn();
    render(
      <EpubReaderAdapter
        fileUrl="/api/docs/raw?path=books/sample.epub"
        documentId="doc-epub-101"
        onTextSelection={onTextSelection}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    expect(lastCapturedRendition.on).toHaveBeenCalledWith('selected', expect.any(Function));

    // Simulate EPUB text selection in rendition
    const mockContents = {
      document: {
        defaultView: {
          frameElement: {
            getBoundingClientRect: () => ({ top: 60, left: 10, width: 800, height: 600 }),
          },
        },
      },
    };

    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:45)', mockContents);
    });

    expect(onTextSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Đoạn văn bản trích dẫn trực tiếp từ sách EPUB.',
        position: {
          top: 160, // 60 (iframe top) + 100 (range top)
          left: 160, // 10 (iframe left) + 50 (range left) + 100 (half width)
        },
        cfi: 'epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:45)',
      })
    );
  });

  it('2. EpubReaderAdapter cleans up rendition.off("selected", ...) on unmount to prevent stale callbacks', async () => {
    const onTextSelection = vi.fn();
    const { unmount } = render(
      <EpubReaderAdapter
        fileUrl="/api/docs/raw?path=books/sample.epub"
        documentId="doc-epub-101"
        onTextSelection={onTextSelection}
      />
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    unmount();

    expect(lastCapturedRendition.off).toHaveBeenCalledWith('selected', expect.any(Function));
  });

  it('3. UnifiedResearchReader with EPUB mounts UnifiedSelectionToolbar and persists Highlight excerpt with CFI', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-epub-buddhism"
          title="Đại Niệm Xứ Thiền Sư U Silananda"
          format="epub"
          fileUrl="/api/docs/raw?path=books/Dai_Niem_Xu_Thien_Su_U_Silananda.epub"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // 1. Simulate EPUB selection
    const mockContents = {
      document: {
        defaultView: {
          frameElement: {
            getBoundingClientRect: () => ({ top: 50, left: 20 }),
          },
        },
      },
    };

    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/2[chap1]!/4/2/1:0)', mockContents);
    });

    // 2. Selection toolbar must mount with action buttons
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
    });

    const highlightBtn = screen.getByRole('button', { name: 'Highlight' });
    expect(highlightBtn).toBeInTheDocument();

    // 3. Click Highlight
    await act(async () => {
      fireEvent.click(highlightBtn);
    });

    // 4. Open sidebar and verify highlight appears immediately with document identity
    await act(async () => {
      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-tab-highlights')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));
    });

    await waitFor(() => {
      const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
      expect(
        within(highlightsPanel).getByText(/Đoạn văn bản trích dẫn trực tiếp từ sách EPUB/i)
      ).toBeInTheDocument();
    });
  });

  it('4. UnifiedResearchReader with EPUB handles Add to Inbox and Copy actions accurately', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-epub-buddhism"
          title="Đại Niệm Xứ Thiền Sư U Silananda"
          format="epub"
          fileUrl="/api/docs/raw?path=books/Dai_Niem_Xu_Thien_Su_U_Silananda.epub"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    // 1. Selection in EPUB
    const mockContents = {
      document: {
        defaultView: {
          frameElement: {
            getBoundingClientRect: () => ({ top: 50, left: 20 }),
          },
        },
      },
    };

    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/2[chap1]!/4/2/1:0)', mockContents);
    });

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
    });

    // 2. Click Copy
    const copyBtn = screen.getByRole('button', { name: 'Sao chép' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith('Đoạn văn bản trích dẫn trực tiếp từ sách EPUB.');
      expect(screen.getByText('Đã sao chép đoạn trích vào clipboard')).toBeInTheDocument();
    });

    // 3. Emit new selection and click "Vào Inbox"
    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/2[chap1]!/4/2/1:0)', mockContents);
    });

    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
    });

    const inboxBtn = screen.getByRole('button', { name: /inbox/i });
    await act(async () => {
      fireEvent.click(inboxBtn);
    });

    // 4. Verify in sidebar Inbox tab
    await act(async () => {
      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-tab-inbox')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('sidebar-tab-inbox'));
    });

    await waitFor(() => {
      const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
      expect(
        within(inboxPanel).getByText(/Đoạn văn bản trích dẫn trực tiếp từ sách EPUB/i)
      ).toBeInTheDocument();
    });
  });

  it('5. UnifiedResearchReader with EPUB dismisses selection on iframe click and binds Send to Note modal', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-epub-buddhism"
          title="Đại Niệm Xứ Thiền Sư U Silananda"
          format="epub"
          fileUrl="/api/docs/raw?path=books/Dai_Niem_Xu_Thien_Su_U_Silananda.epub"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    await waitFor(() => {
      expect(lastCapturedRendition).not.toBeNull();
    });

    const mockContents = {
      document: {
        defaultView: {
          frameElement: {
            getBoundingClientRect: () => ({ top: 50, left: 20 }),
          },
        },
      },
    };

    // 1. Emit selection -> toolbar opens
    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/2[chap1]!/4/2/1:0)', mockContents);
    });
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
    });

    // 2. Click outside inside EPUB iframe -> toolbar dismisses
    await act(async () => {
      lastCapturedRendition.emit('click');
    });
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).not.toBeInTheDocument();
    });

    // 3. Emit selection again and click "Vào ghi chú"
    await act(async () => {
      lastCapturedRendition.emit('selected', 'epubcfi(/6/2[chap1]!/4/2/1:0)', mockContents);
    });
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
    });

    const sendToNoteBtn = screen.getByRole('button', { name: /ghi chú/i });
    await act(async () => {
      fireEvent.click(sendToNoteBtn);
    });

    // Modal to pick target note must appear
    await waitFor(() => {
      expect(screen.getByText(/Chọn ghi chú đích/i)).toBeInTheDocument();
    });
  });
});
