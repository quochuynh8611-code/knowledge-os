import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResourceFormModal } from "../../src/components/modals/ResourceFormModal";

const mockAddResource = vi.fn();
const mockUpdateResource = vi.fn();

const mockTopics = [
  {
    id: "topic-1",
    title: "Triết Học Tánh Không",
    type: "phat-hoc" as const,
  },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    addResource: mockAddResource,
    updateResource: mockUpdateResource,
  }),
}));

describe("ResourceFormModal Local Binary Upload Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Uploads binary file to /api/archive/upload and sets openTarget to archive://{id} on success", async () => {
    const handleClose = vi.fn();
    const fakeDocId = "doc-pdf-999";
    const fakeStorageRelPath = "pdf/ab/123456.pdf";

    // Mock global fetch for /api/archive/upload
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        document: {
          id: fakeDocId,
          fileName: "triet_hoc_tanh_khong.pdf",
          storageRelPath: fakeStorageRelPath,
        },
      }),
    } as Response);

    render(<ResourceFormModal isOpen={true} onClose={handleClose} defaultTopicId="topic-1" />);

    // Switch to local mode
    const localModeBtn = screen.getByRole("button", { name: /tệp trên máy|file cục bộ/i });
    fireEvent.click(localModeBtn);

    // Pick a local PDF file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const sampleFile = new File(["dummy pdf content"], "triet_hoc_tanh_khong.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, {
      target: { files: [sampleFile] },
    });

    // Enter/ensure title
    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    fireEvent.change(titleInput, { target: { value: "Triết Học Về Tánh Không PDF" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /thêm tài liệu/i });
    fireEvent.click(submitBtn);

    // Verify upload request was sent
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [uploadUrl, uploadOptions] = fetchSpy.mock.calls[0];
    expect(String(uploadUrl)).toContain("/api/archive/upload");
    expect(String(uploadUrl)).toContain("originalName=triet_hoc_tanh_khong.pdf");
    expect(String(uploadUrl)).toContain("fileFormat=pdf");
    expect(uploadOptions?.method).toBe("POST");

    // Verify addResource called with openTarget = archive://{fakeDocId}
    await waitFor(() => {
      expect(mockAddResource).toHaveBeenCalledTimes(1);
    });

    const payload = mockAddResource.mock.calls[0][0];
    expect(payload.title).toBe("Triết Học Về Tánh Không PDF");
    expect(payload.openTarget).toBe(`archive://${fakeDocId}`);
    expect(payload.filePath).toBe(fakeStorageRelPath);
    expect(handleClose).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("2. If upload fails, displays error message and does NOT call addResource", async () => {
    const handleClose = vi.fn();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "FILE_TOO_LARGE",
        message: "Dung lượng tệp vượt quá giới hạn 50MB.",
      }),
    } as Response);

    render(<ResourceFormModal isOpen={true} onClose={handleClose} defaultTopicId="topic-1" />);

    const localModeBtn = screen.getByRole("button", { name: /tệp trên máy|file cục bộ/i });
    fireEvent.click(localModeBtn);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const sampleFile = new File(["huge data"], "large_file.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [sampleFile] } });

    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    fireEvent.change(titleInput, { target: { value: "Large Book" } });

    const submitBtn = screen.getByRole("button", { name: /thêm tài liệu/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Dung lượng tệp vượt quá giới hạn 50MB|Lỗi tải lên/i)).toBeInTheDocument();
    });

    expect(mockAddResource).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("3. If user manually types a path without picking a file (e.g. Vault path), saves without uploading", async () => {
    const handleClose = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<ResourceFormModal isOpen={true} onClose={handleClose} defaultTopicId="topic-1" />);

    const localModeBtn = screen.getByRole("button", { name: /tệp trên máy|file cục bộ/i });
    fireEvent.click(localModeBtn);

    const pathInput = screen.getByPlaceholderText(/đường dẫn tệp|\/Users\/|\.pdf|filePath/i);
    fireEvent.change(pathInput, { target: { value: "vault:phat-hoc:02_PDF_Source/guide.pdf" } });

    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    fireEvent.change(titleInput, { target: { value: "Vault Guide" } });

    const submitBtn = screen.getByRole("button", { name: /thêm tài liệu/i });
    fireEvent.click(submitBtn);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][0].filePath).toBe("vault:phat-hoc:02_PDF_Source/guide.pdf");
    expect(handleClose).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
