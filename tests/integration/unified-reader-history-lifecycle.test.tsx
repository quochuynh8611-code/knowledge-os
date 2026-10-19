import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
let mockLocationChanged: ((loc: string) => void) | null = null;
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => {
    mockLocationChanged = props.locationChanged;
    return (
      <div data-testid="react-reader-mock" data-location={props.location}>
        <span>EPUB Mock Viewport</span>
        <button
          data-testid="epub-next-page-btn"
          onClick={() => props.locationChanged && props.locationChanged("epubcfi(/6/12[ch03]!/4/2:10)")}
        >
          Next Page
        </button>
      </div>
    );
  }),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("Unified Reader History Lifecycle & EPUB Stability (Red Stage)", () => {
  const sampleMarkdown = `
# Chương Một: Khởi Đầu
Nội dung chương 1 tại đây.

## Mục 1.1: Cơ Sở Lý Thuyết
Lý thuyết nền tảng về hệ thống.

## Mục 1.2: Thực Nghiệm
Chi tiết các bước thực nghiệm.
`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationChanged = null;
    global.fetch = vi.fn().mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/file/") || urlStr.includes("/raw")) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      };
    }) as any;
    // Clear in-memory RAM store completely before each test
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }
  });

  // ─── Group B: Unified Reader Lifecycle ─────────────────────────────────────

  it("should_persist_markdown_heading_locator_on_close", async () => {
    const onClose = vi.fn();
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/") && opts?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-md-history-1"
        title="Nghiên cứu Markdown"
        format="md"
        content={sampleMarkdown}
        onClose={onClose}
      />
    );

    // Mở TOC và chọn Mục 1.2
    const tocBtn = screen.getByRole("button", { name: /Mục lục/i });
    fireEvent.click(tocBtn);
    const item12 = await screen.findByRole("button", { name: /Mục 1.2: Thực Nghiệm/i });
    fireEvent.click(item12);

    // Bấm đóng reader
    const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    // Phải gọi API PATCH persist vị trí đọc với headingId đã chọn
    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find((call) =>
        String(call[0]).includes("/api/archive/document/doc-md-history-1/position")
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1]?.body as string);
      expect(body.lastPosition?.headingId).toMatch(/muc-1-2-thuc-nghiem/);
    });
  });

  it("should_resume_markdown_from_persisted_lastPosition", async () => {
    // Giả lập document có lastPosition đã lưu trong Archive
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-md-resume")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            document: {
              id: "doc-md-resume",
              lastPosition: { headingId: "muc-11-co-so-ly-thuyet" },
            },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-md-resume"
        title="Tài Liệu Cần Resume"
        format="md"
        content={sampleMarkdown}
        onClose={vi.fn()}
      />
    );

    // Reader phải hydrate target heading từ lastPosition persisted
    await waitFor(() => {
      // Khi hydrate đúng heading, TOC active item hoặc DOM element tương ứng được kích hoạt
      expect(screen.getByRole("heading", { level: 2, name: /Mục 1.1: Cơ Sở Lý Thuyết/i })).toBeInTheDocument();
    });
  });

  it("should_persist_epub_cfi_on_close", async () => {
    const onClose = vi.fn();
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/") && opts?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as any;
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(50),
        headers: { get: () => "application/epub+zip" },
      } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-epub-persist"
        title="EPUB Persist Test"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-persist"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Giả lập người đọc chuyển trang
    const nextBtn = screen.getByTestId("epub-next-page-btn");
    fireEvent.click(nextBtn);

    // Đóng reader
    const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    // Phải gửi PATCH lưu CFI mới
    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find((call) =>
        String(call[0]).includes("/api/archive/document/doc-epub-persist/position")
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1]?.body as string);
      expect(body.lastPosition?.cfi).toBe("epubcfi(/6/12[ch03]!/4/2:10)");
    });
  });

  it("should_resume_epub_from_persisted_lastPosition", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-epub-resume")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            document: {
              id: "doc-epub-resume",
              lastPosition: { cfi: "epubcfi(/6/20[ch05]!/4/2:0)" },
            },
          }),
        } as any;
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(50),
        headers: { get: () => "application/epub+zip" },
      } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-epub-resume"
        title="EPUB Resume Test"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-resume"
        onClose={vi.fn()}
      />
    );

    // Mock viewport phải nhận initial location từ persisted CFI
    await waitFor(() => {
      const mockViewport = screen.getByTestId("react-reader-mock");
      expect(mockViewport.getAttribute("data-location")).toBe("epubcfi(/6/20[ch05]!/4/2:0)");
    });
  });

  it("should_prefer_initialPosition_over_persisted_history", async () => {
    // Có persisted CFI nhưng caller truyền initialPosition rõ ràng
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-override")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            document: {
              id: "doc-override",
              lastPosition: { cfi: "epubcfi(/6/old!/4/2:0)" },
            },
          }),
        } as any;
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(50),
        headers: { get: () => "application/epub+zip" },
      } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-override"
        title="Explicit Override Test"
        format="epub"
        fileUrl="/api/archive/file/doc-override"
        initialPosition="epubcfi(/6/target-citation!/4/2:0)"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      const mockViewport = screen.getByTestId("react-reader-mock");
      expect(mockViewport.getAttribute("data-location")).toBe("epubcfi(/6/target-citation!/4/2:0)");
    });
  });

  it("should_fallback_to_start_when_locator_invalid", async () => {
    // Khi locator rỗng hoặc hỏng
    render(
      <UnifiedResearchReader
        documentId="doc-invalid-loc"
        title="Fallback Start Test"
        format="md"
        content={sampleMarkdown}
        initialPosition="   "
        onClose={vi.fn()}
      />
    );

    // Vẫn hiển thị chương đầu tiên bình thường, không crash
    expect(screen.getByRole("heading", { level: 1, name: /Chương Một: Khởi Đầu/i })).toBeInTheDocument();
  });

  // ─── Group C: EPUB Stability Regression ────────────────────────────────────

  it("should_keep_navigation_alive_after_fontsize_and_pagemode_changes", async () => {
    render(
      <UnifiedResearchReader
        documentId="doc-epub-controls"
        title="Controls Test"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-controls"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Tăng font size
    const incFontBtn = screen.getByRole("button", { name: /Tăng cỡ chữ/i });
    fireEvent.click(incFontBtn);
    expect(screen.getByText("110%")).toBeInTheDocument();

    // Đổi sang trang đơn
    const singlePageBtn = screen.getByTitle("Trang đơn");
    fireEvent.click(singlePageBtn);

    // Chuyển trang tiếp theo vẫn hoạt động trơn tru
    const nextBtn = screen.getByTestId("epub-next-page-btn");
    expect(() => fireEvent.click(nextBtn)).not.toThrow();
  });

  it("should_not_lose_locator_after_reflow", async () => {
    const onPos = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-epub-reflow"
        title="Reflow Stability Test"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-reflow"
        onPositionChange={onPos}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Chuyển trang và ghi nhận locator
    fireEvent.click(screen.getByTestId("epub-next-page-btn"));
    expect(onPos).toHaveBeenCalledWith("epubcfi(/6/12[ch03]!/4/2:10)");

    // Đổi cỡ chữ (trigger reflow)
    fireEvent.click(screen.getByRole("button", { name: /Tăng cỡ chữ/i }));

    // Locator mới nhất vẫn được giữ nguyên
    const currentViewport = screen.getByTestId("react-reader-mock");
    expect(currentViewport.getAttribute("data-location")).toBe("epubcfi(/6/12[ch03]!/4/2:10)");
  });

  it("should_preserve_latest_valid_locator_after_multiple_updates", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/") && opts?.method === "PATCH") {
        return { ok: true, json: async () => ({ success: true }) } as any;
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(50), headers: { get: () => "application/epub+zip" } } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-multi-update"
        title="Multiple Update Test"
        format="epub"
        fileUrl="/api/archive/file/doc-multi-update"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Trigger multiple rapid location updates
    if (mockLocationChanged) {
      mockLocationChanged("epubcfi(/6/2!/4/1:0)");
      mockLocationChanged("epubcfi(/6/4!/4/2:0)");
      mockLocationChanged("epubcfi(/6/6!/4/3:0)");
    }

    // Đóng reader
    fireEvent.click(screen.getByTitle("Đóng trình đọc (Esc)"));

    // Patch cuối cùng phải là vị trí mới nhất
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.filter((c) =>
        String(c[0]).includes("/api/archive/document/doc-multi-update/position")
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const lastCall = calls[calls.length - 1];
      const body = JSON.parse(lastCall[1]?.body as string);
      expect(body.lastPosition?.cfi).toBe("epubcfi(/6/6!/4/3:0)");
    });
  });

  // ─── Group E: Failure Tolerance ────────────────────────────────────────────

  it("should_not_crash_reader_when_history_save_fails", async () => {
    const onClose = vi.fn();
    // API PATCH trả về lỗi 500
    vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/") && opts?.method === "PATCH") {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "INTERNAL_ERROR" }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-fail-save"
        title="Save Failure Tolerance Test"
        format="md"
        content={sampleMarkdown}
        onClose={onClose}
      />
    );

    // Chọn heading và đóng
    const tocBtn = screen.getByRole("button", { name: /Mục lục/i });
    fireEvent.click(tocBtn);
    const item11 = await screen.findByRole("button", { name: /Mục 1.1: Cơ Sở Lý Thuyết/i });
    fireEvent.click(item11);

    const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
    // Bấm đóng không được quăng exception làm sập ứng dụng
    expect(() => fireEvent.click(closeBtn)).not.toThrow();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("should_continue_reader_navigation_when_incremental_save_fails", async () => {
    // Network fail on save
    vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/") && opts?.method === "PATCH") {
        throw new Error("Network disconnection");
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(50), headers: { get: () => "application/epub+zip" } } as any;
    });

    render(
      <UnifiedResearchReader
        documentId="doc-nav-continue"
        title="Continue Nav Test"
        format="epub"
        fileUrl="/api/archive/file/doc-nav-continue"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
    });

    // Lật trang dù lỗi mạng vẫn chuyển trang bình thường
    const nextBtn = screen.getByTestId("epub-next-page-btn");
    expect(() => fireEvent.click(nextBtn)).not.toThrow();
  });
});
