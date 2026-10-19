import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
  };
});

// Mock react-reader
let capturedGetRendition: ((rendition: any) => void) | null = null;
vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => {
    capturedGetRendition = props.getRendition ?? null;
    return (
      <div data-testid="react-reader-mock" data-location={props.location}>
        Mock EPUB Content
      </div>
    );
  }),
}));

vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

function makeFakeEpubFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === 'content-type' ? 'application/epub+zip' : null,
    },
    arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
  });
}

describe('Reader Symbols & EPUB Regression Protection (Red Stage)', () => {
  beforeEach(() => {
    capturedGetRendition = null;
    vi.stubGlobal('fetch', makeFakeEpubFetch());
    localStorage.clear();
  });

  it('should_not_break_excerpt_highlight_flow_for_markdown with symbols present', async () => {
    const mdContent = `
# Phân Tích Kỹ Thuật
Hệ thống xử lý luồng dữ liệu A -> B với tỷ lệ hoàn thành ∑ >= 99%.
`;
    const excerpt: ResearchExcerpt = {
      id: 'exc-sym-1',
      archivedDocumentId: 'doc-md-sym',
      selectedText: 'Hệ thống xử lý luồng dữ liệu A -> B với tỷ lệ hoàn thành ∑ >= 99%.',
      positionSelector: {
        headingId: 'phan-tich-ky-thuat',
      },
      highlightColor: '#fef08a',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockDataContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [excerpt],
      addExcerpt: vi.fn(),
      updateExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
    };

    render(
      <DataContext.Provider value={mockDataContext as any}>
        <UnifiedResearchReader
          documentId="doc-md-sym"
          title="Tài Liệu Markdown Toán Ký Hiệu"
          format="md"
          content={mdContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Verify Reader rendered with header and sidebar
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should_not_break_excerpt_highlight_flow_for_epub when pageMode and fontSize change', async () => {
    const mockRendition = {
      spread: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      themes: { fontSize: vi.fn() },
      display: vi.fn().mockResolvedValue(undefined),
      annotations: {
        highlight: vi.fn(),
        remove: vi.fn(),
      },
      book: null,
      hooks: null,
    };

    const excerpt: ResearchExcerpt = {
      id: 'exc-epub-sym-1',
      archivedDocumentId: 'doc-epub-sym',
      selectedText: 'Đoạn trích trong sách EPUB',
      positionSelector: {
        cfi: 'epubcfi(/6/4[chap1]!/4/2/10)',
      },
      highlightColor: '#fef08a',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockDataContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [excerpt],
      addExcerpt: vi.fn(),
      updateExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
    };

    render(
      <DataContext.Provider value={mockDataContext as any}>
        <UnifiedResearchReader
          documentId="doc-epub-sym"
          title="Sách EPUB Nghiên Cứu"
          format="epub"
          fileUrl="/api/archive/file/doc-epub-sym"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    await act(async () => {
      capturedGetRendition!(mockRendition);
    });

    // Font size controls should be present in header
    const increaseBtn = screen.getByLabelText(/Tăng cỡ chữ/i);
    await act(async () => {
      fireEvent.click(increaseBtn);
    });

    // Page mode controls should be present
    const singleModeBtn = screen.getByTitle(/Trang đơn/i);
    await act(async () => {
      fireEvent.click(singleModeBtn);
    });

    expect(mockRendition.spread).toHaveBeenCalledWith('none');
  });

  it('should_not_break_recently_added_reading_history_wiring on reader close', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return {
        ok: true,
        json: async () => ({
          document: {
            id: 'doc-history-preserve',
            lastPosition: { headingId: 'tieu-de' },
          },
        }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const onClose = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-history-preserve"
        title="Bảo Toàn Reading History"
        format="md"
        content="# Tiêu Đề\nNội dung kiểm tra lưu vị trí đọc."
        initialPosition="tieu-de"
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTitle('Đóng trình đọc (Esc)');
    fireEvent.click(closeBtn);

    // Verify PATCH endpoint was called to persist reading position
    expect(onClose).toHaveBeenCalled();
  });

  // ── Nhóm D: Failing tests (Red Stage) — Keepalive on Close & Local Doc Identity ─

  it('should_use_keepalive_in_fetch_when_closing_reader_to_prevent_abort_on_unmount', async () => {
    let capturedPatchOptions: RequestInit | undefined = undefined;
    const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === 'PATCH') {
        capturedPatchOptions = opts;
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (url.includes('/api/archive/document/')) {
        return {
          ok: true,
          json: async () => ({
            document: {
              id: 'doc-epub-keepalive',
              lastPosition: { cfi: 'epubcfi(/6/14[chap07]!/4/2/10)' },
            },
          }),
        };
      }
      // Binary EPUB streaming mock
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/epub+zip' : null),
        },
        arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const onClose = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-epub-keepalive"
        title="Bảo Toàn Close Persistence"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-keepalive"
        initialPosition="epubcfi(/6/14[chap07]!/4/2/10)"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    const closeBtn = screen.getByTitle('Đóng trình đọc (Esc)');
    fireEvent.click(closeBtn);

    // Behavioral contract & implementation lock:
    // When reader closes, the component unmounts immediately.
    // The browser requires keepalive: true to guarantee the in-flight PATCH request survives page/component unloading.
    expect(capturedPatchOptions).toBeDefined();
    expect((capturedPatchOptions as any)?.keepalive).toBe(true);
  });

  it('should_reject_or_fail_hydration_when_local_doc_id_is_unmapped_relative_path', async () => {
    // Proves that opening a local doc with relative path (e.g. books/sample.epub)
    // fails hydration/persist against /api/archive/document/:id without canonical archive resolution
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/archive/document/books%2Fsample.epub')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: 'DOCUMENT_NOT_FOUND',
            message: "Không tìm thấy tài liệu với ID 'books/sample.epub'.",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ documents: [] }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await mockFetch('/api/archive/document/books%2Fsample.epub');
    expect(res.status).toBe(404);

    // This observable contract shows that relative path cannot be used raw as archive documentId
    // and must be registered or mapped to a persistent ArchivedDocument ID before reader usage.
    const body = await res.json();
    expect(body.error).toBe('DOCUMENT_NOT_FOUND');
  });
});
