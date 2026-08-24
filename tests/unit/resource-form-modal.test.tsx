/**
 * ResourceFormModal UI Interaction & Source Mode Selection Test Suite
 *
 * ADR: ADR-011 (docs/adr/ADR-011-resource-local-file-reference.md)
 * Gherkin: docs/gherkin/resource-local-reference.feature
 * Component: src/components/modals/ResourceFormModal.tsx
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResourceFormModal } from "../../src/components/modals/ResourceFormModal";

const mockAddResource = vi.fn();
const mockUpdateResource = vi.fn();

const mockTopics = [
  {
    id: "topic-abhidharma-tong-quan",
    title: "Abhidharma - Vi Diệu Pháp",
    type: "phat-hoc" as const,
  },
  {
    id: "topic-ky-mon-don-giap",
    title: "Kỳ Môn Độn Giáp",
    type: "huyen-hoc" as const,
  },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    addResource: mockAddResource,
    updateResource: mockUpdateResource,
  }),
}));

describe("ADR-011: ResourceFormModal UI Interaction & Source Mode Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Form renders source mode switcher (Web URL vs Local File)
  // ---------------------------------------------------------------------------
  it("1. Form renders source mode switcher between Web URL and Local File", () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    // Should offer a way to select between Web URL and Local File
    const localModeButton = screen.getByRole("button", {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    const webModeButton = screen.getByRole("button", {
      name: /đường dẫn web|web url|online/i,
    });

    expect(localModeButton).toBeInTheDocument();
    expect(webModeButton).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Selecting Local File mode displays filePath input field
  // ---------------------------------------------------------------------------
  it("2. Selecting Local File mode displays filePath input field", () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole("button", {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const pathInput = screen.getByPlaceholderText(
      /đường dẫn tệp|\/Users\/|\.pdf|filePath/i,
    );
    expect(pathInput).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 3: Local File mode does NOT auto-fill https:// into url
  // ---------------------------------------------------------------------------
  it("3. Local File mode does not auto-fill https:// into url field", () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole("button", {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    // In local mode, URL input is either absent or empty, never 'https://'
    const urlInput = screen.queryByPlaceholderText(/https:\/\//i);
    if (urlInput) {
      expect((urlInput as HTMLInputElement).value).not.toBe("https://");
    }
  });

  // ---------------------------------------------------------------------------
  // Test 4: Submitting local resource sends filePath and does NOT send default url
  // ---------------------------------------------------------------------------
  it("4. Submitting local resource sends filePath and does NOT send default url", () => {
    const handleClose = vi.fn();
    render(<ResourceFormModal isOpen={true} onClose={handleClose} />);

    // Switch to local file mode
    const localModeButton = screen.getByRole("button", {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    // Fill title
    const titleInput = screen.getByPlaceholderText(
      /VD: Thắng Pháp Tập Yếu Luận/i,
    );
    fireEvent.change(titleInput, {
      target: { value: "Kinh Điển Scan PDF Local" },
    });

    // Fill filePath
    const pathInput = screen.getByPlaceholderText(
      /đường dẫn tệp|\/Users\/|\.pdf|filePath/i,
    );
    fireEvent.change(pathInput, {
      target: { value: "/Users/mr.chem/Documents/PhatHoc/KinhDien.pdf" },
    });

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /thêm tài liệu|lưu tài liệu/i,
    });
    fireEvent.click(submitButton);

    expect(mockAddResource).toHaveBeenCalledTimes(1);
    const submittedPayload = mockAddResource.mock.calls[0][0];

    expect(submittedPayload.title).toBe("Kinh Điển Scan PDF Local");
    expect(submittedPayload.filePath).toBe(
      "/Users/mr.chem/Documents/PhatHoc/KinhDien.pdf",
    );
    expect(submittedPayload.url).toBeUndefined();
    expect(handleClose).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 5: Selecting Web mode renders URL input field
  // ---------------------------------------------------------------------------
  it("5. Selecting Web mode renders URL input field", () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const webModeButton = screen.getByRole("button", {
      name: /đường dẫn web|web url|online/i,
    });
    fireEvent.click(webModeButton);

    const urlInput = screen.getByPlaceholderText(/https:\/\//i);
    expect(urlInput).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Switching between modes isolates source fields on submit
  // ---------------------------------------------------------------------------
  it("6. Switching between modes isolates source fields on submit", () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    // Initially in web mode, enter URL
    const urlInput = screen.getByPlaceholderText(/https:\/\//i);
    fireEvent.change(urlInput, {
      target: { value: "https://ctext.org/book-of-changes" },
    });

    // Switch to local mode
    const localModeButton = screen.getByRole("button", {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    // Fill title & filePath
    const titleInput = screen.getByPlaceholderText(
      /VD: Thắng Pháp Tập Yếu Luận/i,
    );
    fireEvent.change(titleInput, {
      target: { value: "Kinh Dịch Bản Dịch PDF" },
    });

    const pathInput = screen.getByPlaceholderText(
      /đường dẫn tệp|\/Users\/|\.pdf|filePath/i,
    );
    fireEvent.change(pathInput, {
      target: { value: "/Books/KinhDich.pdf" },
    });

    // Submit
    const submitButton = screen.getByRole("button", {
      name: /thêm tài liệu|lưu tài liệu/i,
    });
    fireEvent.click(submitButton);

    expect(mockAddResource).toHaveBeenCalledTimes(1);
    const submittedPayload = mockAddResource.mock.calls[0][0];

    expect(submittedPayload.filePath).toBe("/Books/KinhDich.pdf");
    expect(submittedPayload.url).toBeUndefined();
  });
});
