import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { EpubReaderAdapter } from '../../src/components/reader/adapters/EpubReaderAdapter';

// Module mocks
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

let capturedProps: any = null;

vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => {
    capturedProps = props;
    return (
      <div data-testid="react-reader-mock" data-location={props.location}>
        ReactReader Mock
      </div>
    );
  }),
}));

function makeMockRendition() {
  const displayFn = vi.fn().mockResolvedValue(undefined);
  const mockRendition = {
    spread: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    themes: { fontSize: vi.fn() },
    display: displayFn,
    book: null,
    hooks: null,
  };
  return { mockRendition, displayFn };
}

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

describe('Phase R3: EpubReaderAdapter In-Session Reactive Relocation (Unit)', () => {
  beforeEach(() => {
    capturedProps = null;
    vi.stubGlobal('fetch', makeFakeEpubFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. updates location and invokes rendition.display when initialLocation prop changes dynamically', async () => {
    const { mockRendition, displayFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-1"
        initialLocation="epubcfi(/6/2[chap1]!/4/2/4)"
      />
    );

    await waitFor(() => {
      expect(capturedProps).not.toBeNull();
    });

    // Simulate rendition mount
    act(() => {
      capturedProps.getRendition(mockRendition);
    });

    // Initial location check
    expect(capturedProps.location).toBe('epubcfi(/6/2[chap1]!/4/2/4)');

    // Dynamically update initialLocation prop (as happens during note jump-back)
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-1"
        initialLocation="epubcfi(/6/8[chap3]!/4/2/30)"
      />
    );

    await waitFor(() => {
      // Must sync the new location to ReactReader and display it on rendition
      expect(capturedProps.location).toBe('epubcfi(/6/8[chap3]!/4/2/30)');
      expect(displayFn).toHaveBeenCalledWith('epubcfi(/6/8[chap3]!/4/2/30)');
    });
  });

  it('2. handles numeric or 0 initialLocation fallback gracefully', async () => {
    const { mockRendition, displayFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-1"
        initialLocation="epubcfi(/6/2[chap1]!/4/2/4)"
      />
    );

    await waitFor(() => {
      expect(capturedProps).not.toBeNull();
    });

    act(() => {
      capturedProps.getRendition(mockRendition);
    });

    // Relocate to 0 (start of book)
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-1"
        initialLocation={0}
      />
    );

    await waitFor(() => {
      expect(capturedProps.location).toBe(0);
      expect(displayFn).toHaveBeenCalledWith(0);
    });
  });
});
