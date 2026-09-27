import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { EpubReaderAdapter } from '../../src/components/reader/adapters/EpubReaderAdapter';

// ──────────────────────────────────────────────────────────────────────────────
// Module mocks
// ──────────────────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

// Capture the getRendition callback so tests can trigger it manually
let capturedGetRendition: ((rendition: any) => void) | null = null;

vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => {
    // Capture the getRendition prop for manual invocation in tests
    capturedGetRendition = props.getRendition ?? null;
    return (
      <div data-testid="react-reader-mock">ReactReader Mock</div>
    );
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Mock rendition factory
// ──────────────────────────────────────────────────────────────────────────────

function makeMockRendition() {
  const spreadFn = vi.fn();
  const onFn = vi.fn();
  const offFn = vi.fn();
  const mockRendition = {
    spread: spreadFn,
    on: onFn,
    off: offFn,
    themes: { fontSize: vi.fn() },
    display: vi.fn().mockResolvedValue(undefined),
    book: null,
    hooks: null,
  };
  return { mockRendition, spreadFn, onFn, offFn };
}

// Helper: build a fake 4-byte ArrayBuffer (zip magic bytes) as fileUrl payload
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

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────

describe('EpubReaderAdapter — pageMode Reactive Update', () => {
  beforeEach(() => {
    capturedGetRendition = null;
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test A ──────────────────────────────────────────────────────────────────
  // Scenario: Initial spread applied at rendition mount (baseline)
  // Given: EpubReaderAdapter mounted with pageMode = "single"
  // When: getRendition callback fires (book loaded)
  // Then: rendition.spread("none") is called
  it('A. Initial pageMode="single" applies rendition.spread("none") on mount', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();
    global.fetch = makeFakeEpubFetch() as any;

    render(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abc123"
        documentId="doc-epub-single"
        pageMode="single"
      />
    );

    // Wait for processedUrl to be set (sanitization complete) — ReactReader renders
    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    // Fire the getRendition callback (simulate epubjs providing the rendition)
    act(() => {
      capturedGetRendition!(mockRendition);
    });

    expect(spreadFn).toHaveBeenCalledWith('none');
  });

  // ── Test B ──────────────────────────────────────────────────────────────────
  // Scenario: Initial spread applied at rendition mount with double mode
  // Given: EpubReaderAdapter mounted with pageMode = "double" (default)
  // When: getRendition callback fires
  // Then: rendition.spread("auto") is called
  it('B. Initial pageMode="double" applies rendition.spread("auto") on mount', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();
    global.fetch = makeFakeEpubFetch() as any;

    render(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abc456"
        documentId="doc-epub-double"
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    expect(spreadFn).toHaveBeenCalledWith('auto');
  });

  // ── Test C ──────────────────────────────────────────────────────────────────
  // Scenario: pageMode toggle AFTER mount should update spread reactively
  // Given: EpubReaderAdapter is mounted with pageMode = "double"
  // And: getRendition has already fired (renditionRef populated)
  // When: pageMode prop changes to "single"
  // Then: rendition.spread("none") must be called again
  //
  // NOTE: This test will FAIL before the useEffect([pageMode]) fix is applied.
  it('C. [FAILING] pageMode changes "double"→"single" calls rendition.spread("none") reactively', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();
    global.fetch = makeFakeEpubFetch() as any;

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abc789"
        documentId="doc-epub-toggle"
        pageMode="double"
      />
    );

    // Wait for ReactReader to mount with captured getRendition
    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    // Simulate book loaded → rendition available
    act(() => {
      capturedGetRendition!(mockRendition);
    });

    // Verify initial spread was set to 'auto'
    expect(spreadFn).toHaveBeenLastCalledWith('auto');
    const initialCallCount = spreadFn.mock.calls.length;

    // Now toggle pageMode to 'single'
    rerender(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abc789"
        documentId="doc-epub-toggle"
        pageMode="single"
      />
    );

    // After toggle: rendition.spread must be called with 'none'
    // This will FAIL before the reactive useEffect is added.
    await waitFor(() => {
      expect(spreadFn.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
    expect(spreadFn).toHaveBeenLastCalledWith('none');
  });

  // ── Test D ──────────────────────────────────────────────────────────────────
  // Scenario: pageMode toggle "single"→"double" calls spread("auto") reactively
  it('D. [FAILING] pageMode changes "single"→"double" calls rendition.spread("auto") reactively', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();
    global.fetch = makeFakeEpubFetch() as any;

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abcdef"
        documentId="doc-epub-toggle-2"
        pageMode="single"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    expect(spreadFn).toHaveBeenLastCalledWith('none');
    const initialCallCount = spreadFn.mock.calls.length;

    // Toggle to 'double'
    rerender(
      <EpubReaderAdapter
        fileUrl="/api/archive/file/abcdef"
        documentId="doc-epub-toggle-2"
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(spreadFn.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
    expect(spreadFn).toHaveBeenLastCalledWith('auto');
  });
});
