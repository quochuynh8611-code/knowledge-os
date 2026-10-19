import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { EpubReaderAdapter } from '../../src/components/reader/adapters/EpubReaderAdapter';

// Module mocks
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

let capturedGetRendition: ((rendition: any) => void) | null = null;
let capturedProps: any = null;

vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => {
    capturedGetRendition = props.getRendition ?? null;
    capturedProps = props;
    return (
      <div data-testid="react-reader-mock" data-location={props.location}>
        ReactReader Mock
      </div>
    );
  }),
}));

function makeMockRendition() {
  const spreadFn = vi.fn();
  const onFn = vi.fn();
  const offFn = vi.fn();
  const fontSizeFn = vi.fn();
  const displayFn = vi.fn().mockResolvedValue(undefined);
  const nextFn = vi.fn().mockResolvedValue(undefined);
  const prevFn = vi.fn().mockResolvedValue(undefined);

  const mockRendition = {
    spread: spreadFn,
    on: onFn,
    off: offFn,
    themes: {
      fontSize: fontSizeFn,
    },
    display: displayFn,
    next: nextFn,
    prev: prevFn,
    location: {
      start: {
        cfi: 'epubcfi(/6/4[chap1]!/4/2/10)',
      },
    },
    book: null,
    hooks: null,
  };
  return { mockRendition, spreadFn, fontSizeFn, displayFn, nextFn, prevFn };
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

describe('EPUB Reader FontSize & PageMode Sync (Red Stage)', () => {
  beforeEach(() => {
    capturedGetRendition = null;
    capturedProps = null;
    vi.stubGlobal('fetch', makeFakeEpubFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Nhóm C: EPUB font size and page mode ─────────────────────────────────────

  it('should_apply_fontsize_changes_to_active_rendition reactively when prop updates', async () => {
    const { mockRendition, fontSizeFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-fontsize"
        fontSize={100}
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    expect(fontSizeFn).toHaveBeenCalledWith('100%');
    const initialCallCount = fontSizeFn.mock.calls.length;

    // Dynamically increase font size to 120%
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-fontsize"
        fontSize={120}
      />
    );

    // Must reactively invoke rendition.themes.fontSize with '120%'
    await waitFor(() => {
      expect(fontSizeFn.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
    expect(fontSizeFn).toHaveBeenLastCalledWith('120%');
  });

  it('should_switch_from_double_to_single_page_reliably and keep active rendition in sync', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pagemode"
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

    // Switch to single page
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pagemode"
        pageMode="single"
      />
    );

    await waitFor(() => {
      expect(spreadFn).toHaveBeenLastCalledWith('none');
    });
  });

  it('should_switch_from_single_to_double_page_reliably', async () => {
    const { mockRendition, spreadFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pagemode-2"
        pageMode="single"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    expect(spreadFn).toHaveBeenCalledWith('none');

    // Switch to double page
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pagemode-2"
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(spreadFn).toHaveBeenLastCalledWith('auto');
    });
  });

  it('should_keep_navigation_alive_after_repeated_display_setting_changes', async () => {
    const { mockRendition, fontSizeFn, spreadFn, nextFn, prevFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-nav-alive"
        fontSize={100}
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    // Multiple rapid setting changes
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-nav-alive"
        fontSize={110}
        pageMode="single"
      />
    );

    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-nav-alive"
        fontSize={130}
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(fontSizeFn).toHaveBeenLastCalledWith('130%');
      expect(spreadFn).toHaveBeenLastCalledWith('auto');
    });

    // Navigation methods on rendition remain intact and callable
    expect(typeof mockRendition.next).toBe('function');
    expect(typeof mockRendition.prev).toBe('function');
    expect(typeof mockRendition.display).toBe('function');
  });

  // ── Nhóm D: EPUB relocation stability ────────────────────────────────────────

  it('should_preserve_latest_location_after_fontsize_reflow', async () => {
    const { mockRendition, displayFn } = makeMockRendition();
    const onLocationChanged = vi.fn();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-reflow"
        initialLocation="epubcfi(/6/4[chap1]!/4/2/10)"
        onLocationChanged={onLocationChanged}
        fontSize={100}
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    // Simulate location update while reading
    act(() => {
      capturedProps.locationChanged('epubcfi(/6/6[chap2]!/4/2/50)');
    });

    expect(capturedProps.location).toBe('epubcfi(/6/6[chap2]!/4/2/50)');

    // Trigger font size change
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-reflow"
        initialLocation="epubcfi(/6/4[chap1]!/4/2/10)"
        onLocationChanged={onLocationChanged}
        fontSize={120}
      />
    );

    // After font size reflow, current location must not revert back to initialLocation
    expect(capturedProps.location).toBe('epubcfi(/6/6[chap2]!/4/2/50)');
  });

  it('should_preserve_latest_location_after_pagemode_change', async () => {
    const { mockRendition } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pm-preserve"
        initialLocation="epubcfi(/6/4[chap1]!/4/2/10)"
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    // Advance reading position
    act(() => {
      capturedProps.locationChanged('epubcfi(/6/10[chap5]!/4/2/99)');
    });

    // Change pageMode to single
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-pm-preserve"
        initialLocation="epubcfi(/6/4[chap1]!/4/2/10)"
        pageMode="single"
      />
    );

    expect(capturedProps.location).toBe('epubcfi(/6/10[chap5]!/4/2/99)');
  });

  it('should_not_get_stuck_on_stale_display_state when initialLocation matches current location', async () => {
    const { mockRendition, displayFn } = makeMockRendition();

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-stale-guard"
        initialLocation="epubcfi(/6/2[chap1]!/4/2/1)"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition);
    });

    const displayCallCount = displayFn.mock.calls.length;

    // Rerender with identical initialLocation (should not trigger redundant display loop)
    rerender(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-stale-guard"
        initialLocation="epubcfi(/6/2[chap1]!/4/2/1)"
      />
    );

    expect(displayFn.mock.calls.length).toBe(displayCallCount);
  });

  // ── Nhóm D: Failing tests (Red Stage) — Race condition & Zero-fallback ───────

  it('should_not_reset_location_to_zero_when_display_fails_during_spread_toggle', async () => {
    let shouldFailNextDisplay = false;
    const spreadFn = vi.fn();
    const originalDisplayFn = vi.fn().mockImplementation(async (target?: string | number) => {
      if (shouldFailNextDisplay && target !== 0) {
        throw new Error('DOMException: layout reflow pending');
      }
      return undefined;
    });

    const mockRendition = {
      spread: spreadFn,
      on: vi.fn(),
      off: vi.fn(),
      themes: { fontSize: vi.fn() },
      display: originalDisplayFn,
      location: { start: { cfi: 'epubcfi(/6/14[chap07]!/4/2/10)' } },
      book: null,
      hooks: null,
    };

    const { rerender } = render(
      <EpubReaderAdapter
        fileUrl="https://example.com/test.epub"
        documentId="doc-epub-race-zero"
        initialLocation="epubcfi(/6/14[chap07]!/4/2/10)"
        pageMode="double"
      />
    );

    await waitFor(() => {
      expect(capturedGetRendition).not.toBeNull();
    });

    act(() => {
      capturedGetRendition!(mockRendition as any);
    });

    // Simulate user having read to chapter 7
    act(() => {
      capturedProps.locationChanged('epubcfi(/6/14[chap07]!/4/2/10)');
    });

    // When toggling pageMode, simulate temporary layout failure in rendition.display
    shouldFailNextDisplay = true;

    // Wrap rerender in act to flush state updates
    await act(async () => {
      rerender(
        <EpubReaderAdapter
          fileUrl="https://example.com/test.epub"
          documentId="doc-epub-race-zero"
          initialLocation="epubcfi(/6/14[chap07]!/4/2/10)"
          pageMode="single"
        />
      );
    });

    // Current bug: when rendition.display fails on the new spread layout,
    // the wrapper catch block in handleRendition calls:
    //   setLocation(0);
    //   return await originalDisplay(0);
    // Thus originalDisplayFn was called with 0, resetting user progress to beginning!
    // The behavioral requirement is: NEVER reset or fallback to location 0 on temporary layout/spread errors.
    expect(originalDisplayFn).not.toHaveBeenCalledWith(0);
    expect(capturedProps.location).not.toBe(0);
  });
});
