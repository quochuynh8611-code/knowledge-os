import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ObsidianDocumentViewerModal } from "../../src/components/modals/ObsidianDocumentViewerModal";
import type { Resource } from "../../src/types";

describe("Phase P4.2E: ObsidianDocumentViewerModal SSE Auto-Refresh Client", () => {
  let mockEventSourceInstances: any[] = [];
  const originalEventSource = global.EventSource;

  const mockResource: Resource = {
    id: "res-watch-1",
    topicId: "topic-1",
    title: "Ghi Chú Đang Soạn Thảo",
    type: "md",
    filePath: "Study/Live-Editing.md",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSourceInstances = [];

    // Mock EventSource in global test environment
    class MockEventSource {
      url: string;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;
      close = vi.fn();

      constructor(url: string) {
        this.url = url;
        mockEventSourceInstances.push(this);
      }
    }

    global.EventSource = MockEventSource as any;
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
    vi.restoreAllMocks();
  });

  it("connects to SSE watch endpoint when modal opens and disconnects on close", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        relativePath: "Study/Live-Editing.md",
        fileName: "Live-Editing.md",
        frontmatter: { title: "Ghi Chú Đang Soạn Thảo" },
        outline: [],
        content: "Nội dung ban đầu",
        sizeBytes: 100,
        lastModified: "2026-09-05T12:00:00Z",
      }),
    } as Response);

    const { unmount } = render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Nội dung ban đầu")).toBeInTheDocument();
    });

    // Check SSE connected
    expect(mockEventSourceInstances.length).toBe(1);
    expect(mockEventSourceInstances[0].url).toBe(
      "/api/obsidian/vault/watch?path=Study%2FLive-Editing.md"
    );

    // Unmount modal
    unmount();

    // Check SSE closed
    expect(mockEventSourceInstances[0].close).toHaveBeenCalled();
  });

  it("auto-refreshes note content when receiving file-changed event from SSE", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Live-Editing.md",
          fileName: "Live-Editing.md",
          frontmatter: { title: "Ghi Chú Đang Soạn Thảo" },
          outline: [],
          content: "Nội dung phiên bản 1",
          sizeBytes: 100,
          lastModified: "2026-09-05T12:00:00Z",
        }),
      } as Response)
      // Auto-refreshed fetch after disk change
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Live-Editing.md",
          fileName: "Live-Editing.md",
          frontmatter: { title: "Ghi Chú Đang Soạn Thảo" },
          outline: [],
          content: "Nội dung phiên bản 2 tự động cập nhật từ đĩa",
          sizeBytes: 250,
          lastModified: "2026-09-05T12:01:00Z",
        }),
      } as Response);

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Nội dung phiên bản 1")).toBeInTheDocument();
    });

    const es = mockEventSourceInstances[0];
    expect(es).toBeDefined();

    // Simulate disk change event from backend SSE
    act(() => {
      if (es.onmessage) {
        es.onmessage({
          data: JSON.stringify({
            type: "file-changed",
            filePath: "Study/Live-Editing.md",
            mtime: "2026-09-05T12:01:00Z",
          }),
        } as MessageEvent);
      }
    });

    // Content should update automatically
    await waitFor(() => {
      expect(
        screen.getByText("Nội dung phiên bản 2 tự động cập nhật từ đĩa")
      ).toBeInTheDocument();
    });

    // Auto-refreshed indicator should appear
    expect(
      screen.getByText(/Đã tự động cập nhật từ đĩa/i)
    ).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
