import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FileViewer,
  getEpubStorageKey,
  getEpubFontSizeStorageKey,
  getEpubPageModeStorageKey,
} from "../../src/components/docs/FileViewer";

// Track all calls to ReactReader mock
const reactReaderCalls: any[] = [];

// Mock react-reader
vi.mock("react-reader", () => {
  return {
    ReactReader: vi.fn((props: any) => {
      reactReaderCalls.push(props);

      if (props.url === "corrupted-file.epub" || props.url === "invalid-url") {
        throw new Error("Corrupted EPUB archive");
      }

      // Simulate getRendition callback with mock rendition & book
      if (props.getRendition) {
        const mockRendition = {
          themes: {
            fontSize: vi.fn(),
          },
          spread: vi.fn(),
          hooks: {
            content: {
              register: vi.fn((fn: any) => fn({ addStylesheetRules: vi.fn() })),
            },
          },
          on: vi.fn(),
          display: vi.fn(async (target?: string | number) => {
            if (target === "invalid-corrupted-cfi") {
              throw new Error("No Section Found");
            }
            return Promise.resolve();
          }),
          book: {
            loaded: {
              navigation: new Promise((resolve) => setTimeout(resolve, 5000)),
            },
          },
        };
        props.getRendition(mockRendition);

        // Simulate initial display invocation on mount if location is provided
        if (props.location) {
          mockRendition.display(props.location).catch(() => {});
        }
      }

      return (
        <div data-testid="react-reader-mock" data-location={props.location} data-url={typeof props.url === "string" ? props.url : "arraybuffer"}>
          <span>ReactReader Mock Content</span>
          <button
            data-testid="next-page-btn"
            onClick={() => props.locationChanged && props.locationChanged("epubcfi(/6/4[chapter2]!/4/2/1:0)")}
          >
            Next Page
          </button>
        </div>
      );
    }),
  };
});

describe("FileViewer Component (EPUB Reader)", () => {
  const defaultProps = {
    fileUrl: "/api/docs/raw?path=Dai_Niem_Xu_Thien_Su_U_Silananda.epub",
    fileName: "Dai_Niem_Xu_Thien_Su_U_Silananda.epub",
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    reactReaderCalls.length = 0;
    window.localStorage.clear();

    // Mock global fetch to return an ArrayBuffer by default
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("corrupted") || url.includes("network-error")) {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        };
      }
      const dummyBuffer = new ArrayBuffer(100);
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => dummyBuffer,
      };
    }) as any;
  });

  it("displays loading spinner and 'Đang chuẩn bị nội dung tài liệu...' while sanitizing before ReactReader mounts", async () => {
    let resolveFetch: any;
    global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    render(<FileViewer {...defaultProps} />);

    // Initially while fetch/sanitization is in progress
    expect(screen.getByText(/Đang chuẩn bị nội dung tài liệu/i)).toBeInTheDocument();
    expect(screen.queryByTestId("react-reader-mock")).not.toBeInTheDocument();

    // Now resolve fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(50),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });
  });

  it("mounts ReactReader with ArrayBuffer and does NOT pass epubInitOptions.openAs='epub'", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Check that all mounts/renders of ReactReader used ArrayBuffer and did not set openAs: "epub"
    expect(reactReaderCalls.length).toBeGreaterThan(0);
    for (const callProps of reactReaderCalls) {
      expect(callProps.url instanceof ArrayBuffer || callProps.url instanceof Uint8Array).toBe(true);
      expect(callProps.epubInitOptions?.openAs).not.toBe("epub");
    }
  });

  it("does not mount ReactReader initially with fileUrl string then update to ArrayBuffer", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // The FIRST call to ReactReader MUST NOT be a string URL
    expect(reactReaderCalls[0].url).not.toBe(defaultProps.fileUrl);
    expect(typeof reactReaderCalls[0].url).not.toBe("string");
  });

  it("displays 'Không đọc được file EPUB này' when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await act(async () => {
      render(
        <FileViewer
          fileUrl="/api/docs/raw?path=missing.epub"
          fileName="missing.epub"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Không đọc được file EPUB này")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("react-reader-mock")).not.toBeInTheDocument();
  });

  it("renders modal overlay with fileName and close button", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Dai_Niem_Xu_Thien_Su_U_Silananda.epub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /đóng/i })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<FileViewer {...defaultProps} onClose={onClose} />);
    });

    const closeBtn = screen.getByRole("button", { name: /đóng/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when ESC key is pressed", async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<FileViewer {...defaultProps} onClose={onClose} />);
    });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores reading location from localStorage on initial render using unified storageKey", async () => {
    const savedCfi = "epubcfi(/6/2[chapter1]!/4/2/1:0)";
    const storageKey = getEpubStorageKey(defaultProps.fileName);
    window.localStorage.setItem(storageKey, savedCfi);

    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    await waitFor(() => {
      const readerEl = screen.getByTestId("react-reader-mock");
      expect(readerEl).toHaveAttribute("data-location", savedCfi);
    });
  });

  it("saves new CFI location to localStorage when locationChanged triggers", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId("next-page-btn");
    fireEvent.click(nextBtn);

    const expectedCfi = "epubcfi(/6/4[chapter2]!/4/2/1:0)";
    const storageKey = getEpubStorageKey(defaultProps.fileName);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      expectedCfi
    );
  });

  it("unifies storageKey consistently regardless of spaces and casing", () => {
    const key1 = getEpubStorageKey("Đại Niệm Xứ - Thiền Sư U Silananda");
    const key2 = getEpubStorageKey("Đại   Niệm   Xứ - Thiền Sư U Silananda");
    expect(key1).toBe(key2);
    expect(key1).toContain("epub-location:");
  });

  it("performs self-healing fallback when CFI is corrupted and display rejects", async () => {
    const storageKey = getEpubStorageKey(defaultProps.fileName);
    window.localStorage.setItem(storageKey, "invalid-corrupted-cfi");
    const removeItemSpy = vi.spyOn(window.localStorage, "removeItem");

    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith(storageKey);
    });
  });

  it("revokes Blob URL on unmount if fileUrl is a blob URL", async () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const blobUrl = "blob:http://localhost:3000/1234-5678";

    let unmountFn: any;
    await act(async () => {
      const { unmount } = render(
        <FileViewer fileUrl={blobUrl} fileName="blob-sample.epub" onClose={vi.fn()} />
      );
      unmountFn = unmount;
    });

    unmountFn();
    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
    revokeSpy.mockRestore();
  });

  // Font Size Control Tests
  it("renders font size toolbar controls with default 100%", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    expect(screen.getByLabelText(/giảm cỡ chữ/i)).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByLabelText(/tăng cỡ chữ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/đặt lại cỡ chữ/i)).toBeInTheDocument();
  });

  it("increases and decreases font size and persists to localStorage", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    const increaseBtn = screen.getByLabelText(/tăng cỡ chữ/i);
    fireEvent.click(increaseBtn);

    expect(screen.getByText("110%")).toBeInTheDocument();
    const fontKey = getEpubFontSizeStorageKey(defaultProps.fileName);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(fontKey, "110");

    const decreaseBtn = screen.getByLabelText(/giảm cỡ chữ/i);
    fireEvent.click(decreaseBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();

    const resetBtn = screen.getByLabelText(/đặt lại cỡ chữ/i);
    fireEvent.click(increaseBtn);
    fireEvent.click(increaseBtn);
    expect(screen.getByText("120%")).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("restores saved font size from localStorage on mount", async () => {
    const fontKey = getEpubFontSizeStorageKey(defaultProps.fileName);
    window.localStorage.setItem(fontKey, "130");

    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });
    expect(screen.getByText("130%")).toBeInTheDocument();
  });

  // Page Mode (Single / Double page) Tests
  it("renders page mode toggle with double page as default and allows switching to single page", async () => {
    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });

    const doublePageBtn = screen.getByRole("button", { name: /trang đôi/i });
    const singlePageBtn = screen.getByRole("button", { name: /trang đơn/i });

    expect(doublePageBtn).toBeInTheDocument();
    expect(singlePageBtn).toBeInTheDocument();

    fireEvent.click(singlePageBtn);

    const pageModeKey = getEpubPageModeStorageKey(defaultProps.fileName);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(pageModeKey, "single");
  });

  it("restores saved page mode from localStorage on mount", async () => {
    const pageModeKey = getEpubPageModeStorageKey(defaultProps.fileName);
    window.localStorage.setItem(pageModeKey, "single");

    await act(async () => {
      render(<FileViewer {...defaultProps} />);
    });
    const singlePageBtn = screen.getByRole("button", { name: /trang đơn/i });
    expect(singlePageBtn.className).toContain("bg-amber-100");
  });
});
